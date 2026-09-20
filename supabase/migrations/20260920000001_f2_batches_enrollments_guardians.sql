-- F2: batches, enrollments, guardian links.
-- Run once in Supabase Dashboard > SQL Editor, after the F1 migration.
-- Every new table has Row Level Security turned on in this same file.

-- =====================================================================
-- 1. Tables
-- =====================================================================

-- A class or group I teach.
create table public.batches (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  class_level  text,
  subject      text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create unique index batches_name_lower_key on public.batches (lower(trim(name)));

-- A student in a batch, with the fee for that batch.
-- Deleting a student removes their enrollments. A batch that still has
-- enrollments cannot be deleted (archive it instead).
create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students (id) on delete cascade,
  batch_id     uuid not null references public.batches (id) on delete restrict,
  monthly_fee  integer not null default 0 check (monthly_fee >= 0),
  start_month  date not null default date_trunc('month', current_date)::date
               check (extract(day from start_month) = 1),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (student_id, batch_id)
);

create index enrollments_batch_id_idx on public.enrollments (batch_id);

-- A guardian email for a student. The account with that email becomes a
-- guardian once its email is confirmed. One guardian can have many
-- children; one child can have many guardians.
create table public.guardian_links (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.students (id) on delete cascade,
  guardian_name        text,
  guardian_email       text not null check (guardian_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone                text,
  relation             text,
  guardian_profile_id  uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now()
);

create unique index guardian_links_student_email_key
  on public.guardian_links (student_id, lower(guardian_email));
create index guardian_links_email_lower_idx on public.guardian_links (lower(guardian_email));
create index guardian_links_profile_idx on public.guardian_links (guardian_profile_id);

alter table public.batches enable row level security;
alter table public.enrollments enable row level security;
alter table public.guardian_links enable row level security;

-- =====================================================================
-- 2. RLS helpers
-- =====================================================================

-- Student ids the current user may read:
-- a student's own record, plus every child linked to a guardian.
create or replace function public.my_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.students s
  where s.profile_id = (select auth.uid())
  union
  select g.student_id from public.guardian_links g
  where g.guardian_profile_id = (select auth.uid());
$$;

-- Batch ids the current user may read: active batches with an active
-- enrollment for one of my students. Pausing an enrollment or archiving a
-- batch hides it from students and guardians.
create or replace function public.my_batch_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct e.batch_id
  from public.enrollments e
  join public.batches b on b.id = e.batch_id
  where e.active
    and b.active
    and e.student_id in (select public.my_student_ids());
$$;

-- =====================================================================
-- 3. Role linking, extended for guardians
-- =====================================================================

-- Student wins over guardian if an account is both (it can still see its
-- children, because my_student_ids() covers both).
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
    when exists (select 1 from public.guardian_links g where g.guardian_profile_id = p.id) then 'guardian'
    else 'pending'
  end
  where p.id = p_profile_id;
end;
$$;

-- Link a confirmed account to student records and guardian links with its email.
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

  update public.guardian_links g
  set guardian_profile_id = p_profile_id
  where g.guardian_profile_id is null
    and lower(g.guardian_email) = lower(p_email);

  -- Fill an empty display name: student record first, then guardian name.
  update public.profiles p
  set full_name = coalesce(
    (select s.full_name from public.students s where s.profile_id = p.id limit 1),
    (select nullif(trim(g.guardian_name), '') from public.guardian_links g
      where g.guardian_profile_id = p.id and nullif(trim(g.guardian_name), '') is not null
      order by g.created_at limit 1)
  )
  where p.id = p_profile_id
    and (p.full_name is null or trim(p.full_name) = '');

  perform public.refresh_profile_role(p_profile_id);
end;
$$;

-- Guardian link added or edited by the admin: tidy the email and link it to
-- an existing confirmed account with that email, if there is one.
create or replace function public.guardian_links_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.guardian_email := lower(trim(new.guardian_email));
  new.guardian_name := nullif(trim(new.guardian_name), '');
  new.relation := nullif(trim(new.relation), '');
  new.phone := nullif(trim(new.phone), '');

  if tg_op = 'UPDATE' and new.guardian_email is distinct from old.guardian_email then
    new.guardian_profile_id := null;
  end if;

  if new.guardian_profile_id is null then
    select p.id into new.guardian_profile_id
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(p.email) = new.guardian_email
      and u.email_confirmed_at is not null
    limit 1;
  end if;

  return new;
end;
$$;

create trigger guardian_links_before_write
  before insert or update on public.guardian_links
  for each row execute function public.guardian_links_before_write();

create or replace function public.guardian_links_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_profile_role(new.guardian_profile_id);
  elsif tg_op = 'UPDATE' then
    if new.guardian_profile_id is distinct from old.guardian_profile_id then
      perform public.refresh_profile_role(old.guardian_profile_id);
      perform public.refresh_profile_role(new.guardian_profile_id);
    end if;
  else
    perform public.refresh_profile_role(old.guardian_profile_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.guardian_profile_id is not null and new.guardian_name is not null then
    update public.profiles
    set full_name = new.guardian_name
    where id = new.guardian_profile_id
      and (full_name is null or trim(full_name) = '');
  end if;
  return null;
end;
$$;

create trigger guardian_links_after_write
  after insert or update or delete on public.guardian_links
  for each row execute function public.guardian_links_after_write();

-- Deleting a student cascades to its guardian links. Row triggers on the
-- cascaded rows run too, so guardians with no children left go back to pending.

-- =====================================================================
-- 4. Row Level Security policies
-- =====================================================================

-- batches: admin manages; students and guardians read the batches they are in.
create policy "batches: read enrolled or admin"
  on public.batches for select to authenticated
  using ((select public.is_admin()) or id in (select public.my_batch_ids()));

create policy "batches: admin insert"
  on public.batches for insert to authenticated
  with check ((select public.is_admin()));

create policy "batches: admin update"
  on public.batches for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "batches: admin delete"
  on public.batches for delete to authenticated
  using ((select public.is_admin()));

-- enrollments: admin manages; students and guardians read their own.
create policy "enrollments: read own or admin"
  on public.enrollments for select to authenticated
  using ((select public.is_admin()) or student_id in (select public.my_student_ids()));

create policy "enrollments: admin insert"
  on public.enrollments for insert to authenticated
  with check ((select public.is_admin()));

create policy "enrollments: admin update"
  on public.enrollments for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "enrollments: admin delete"
  on public.enrollments for delete to authenticated
  using ((select public.is_admin()));

-- guardian_links: admin manages; a guardian reads only their own links.
create policy "guardian_links: read own or admin"
  on public.guardian_links for select to authenticated
  using ((select public.is_admin()) or guardian_profile_id = (select auth.uid()));

create policy "guardian_links: admin insert"
  on public.guardian_links for insert to authenticated
  with check ((select public.is_admin()));

create policy "guardian_links: admin update"
  on public.guardian_links for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "guardian_links: admin delete"
  on public.guardian_links for delete to authenticated
  using ((select public.is_admin()));

-- Internal functions are not callable from the browser.
revoke execute on function public.refresh_profile_role(uuid) from public, anon, authenticated;
revoke execute on function public.link_profile_by_email(uuid, text) from public, anon, authenticated;
