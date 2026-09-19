-- F1: profiles, students, role linking by email, keep-alive.
-- Run once in Supabase Dashboard > SQL Editor (or with `supabase db push`).
-- Every table below has Row Level Security turned on in this same file.

-- =====================================================================
-- 1. Tables
-- =====================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'pending'
              check (role in ('admin', 'student', 'guardian', 'pending')),
  created_at  timestamptz not null default now()
);

create index profiles_email_lower_idx on public.profiles (lower(email));

create table public.students (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null check (length(trim(full_name)) > 0),
  class_level  text,
  email        text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone        text,
  profile_id   uuid unique references public.profiles (id) on delete set null,
  joined_on    date not null default current_date,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- One student record per email (case insensitive). Empty emails allowed.
create unique index students_email_lower_key on public.students (lower(email))
  where email is not null;

alter table public.profiles enable row level security;
alter table public.students enable row level security;

-- =====================================================================
-- 2. Helper functions used by RLS policies
--    security definer so they can read profiles/students without
--    recursing into the policies that call them.
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Student ids the current user may read.
-- F1: a student's own record. F2 adds guardians' linked children.
create or replace function public.my_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.students s
  where s.profile_id = (select auth.uid());
$$;

-- =====================================================================
-- 3. Role linking
-- =====================================================================

-- Recompute one profile's role from the records that point at it.
-- Admin is never changed automatically.
create or replace function public.refresh_profile_role(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_profile_id is null then
    return;
  end if;

  update public.profiles p
  set role = case
    when p.role = 'admin' then 'admin'
    when exists (select 1 from public.students s where s.profile_id = p.id) then 'student'
    else 'pending'
  end
  where p.id = p_profile_id;
end;
$$;

-- Link a confirmed account to any student record that has its email.
create or replace function public.link_profile_by_email(p_profile_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.students s
  set profile_id = p_profile_id
  where s.profile_id is null
    and s.email is not null
    and lower(s.email) = lower(p_email);

  -- Fill an empty display name from the student record.
  update public.profiles p
  set full_name = s.full_name
  from public.students s
  where p.id = p_profile_id
    and s.profile_id = p.id
    and (p.full_name is null or trim(p.full_name) = '');

  perform public.refresh_profile_role(p_profile_id);
end;
$$;

-- New auth user: always create a pending profile.
-- Linking happens only once the email is confirmed (Google sign-ins are
-- confirmed immediately; email sign-ups after they click the link).
-- This stops someone from claiming a student's email without owning it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );

  if new.email_confirmed_at is not null then
    perform public.link_profile_by_email(new.id, new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Email confirmed later, or email changed: sync and link.
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;

  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null or new.email is distinct from old.email) then
    perform public.link_profile_by_email(new.id, new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, email_confirmed_at on auth.users
  for each row execute function public.handle_user_updated();

-- Student added or its email edited by the admin: link to an existing
-- confirmed account with that email, if there is one.
create or replace function public.students_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.email := nullif(lower(trim(new.email)), '');

  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    new.profile_id := null;
  end if;

  if new.profile_id is null and new.email is not null then
    select p.id into new.profile_id
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(p.email) = new.email
      and u.email_confirmed_at is not null
      and not exists (select 1 from public.students s where s.profile_id = p.id and s.id <> new.id)
    limit 1;
  end if;

  return new;
end;
$$;

create trigger students_before_write
  before insert or update on public.students
  for each row execute function public.students_before_write();

create or replace function public.students_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_profile_role(new.profile_id);
  elsif tg_op = 'UPDATE' then
    if new.profile_id is distinct from old.profile_id then
      perform public.refresh_profile_role(old.profile_id);
      perform public.refresh_profile_role(new.profile_id);
    end if;
  else
    perform public.refresh_profile_role(old.profile_id);
  end if;

  -- Give a newly linked account a display name if it has none.
  if tg_op in ('INSERT', 'UPDATE') and new.profile_id is not null then
    update public.profiles
    set full_name = new.full_name
    where id = new.profile_id
      and (full_name is null or trim(full_name) = '');
  end if;
  return null;
end;
$$;

create trigger students_after_write
  after insert or update or delete on public.students
  for each row execute function public.students_after_write();

-- =====================================================================
-- 4. Guard: signed-in users cannot change their own role or email.
--    Only the admin (or the SQL editor, which has no signed-in user,
--    and the linking functions above) may change them.
-- =====================================================================

create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role
      or new.email is distinct from old.email
      or new.id is distinct from old.id)
     and coalesce((select auth.role()), '') in ('authenticated', 'anon')
     and not public.is_admin()
  then
    raise exception 'Only the admin can change role or email';
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- =====================================================================
-- 5. Row Level Security policies
-- =====================================================================

-- profiles: you see and edit your own row; the admin sees and edits all.
create policy "profiles: read own or admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: update own or admin"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- No insert policy: rows are created only by the signup trigger.
-- No delete policy: deleting the auth user removes the profile.

-- students: the admin manages everything; a student reads only their own row.
create policy "students: read own or admin"
  on public.students for select to authenticated
  using ((select public.is_admin()) or id in (select public.my_student_ids()));

create policy "students: admin insert"
  on public.students for insert to authenticated
  with check ((select public.is_admin()));

create policy "students: admin update"
  on public.students for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "students: admin delete"
  on public.students for delete to authenticated
  using ((select public.is_admin()));

-- Internal functions are not callable from the browser.
revoke execute on function public.refresh_profile_role(uuid) from public, anon, authenticated;
revoke execute on function public.link_profile_by_email(uuid, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_updated() from public, anon, authenticated;

-- =====================================================================
-- 6. Keep-alive: a tiny function the GitHub Action calls twice a week
--    so the free Supabase project is not paused for inactivity.
-- =====================================================================

create or replace function public.keepalive()
returns text
language sql
stable
set search_path = ''
as $$
  select 'ok'::text;
$$;

grant execute on function public.keepalive() to anon, authenticated;
