-- F3: schedule. Weekly routine per batch, dated classes, cancel,
-- reschedule and extra classes.
-- Run once in Supabase Dashboard > SQL Editor, after the F2 migration.
-- Every new table has Row Level Security turned on in this same file.
--
-- Time zone: all classes are in Bangladesh time (Asia/Dhaka, UTC+6, no
-- daylight saving). Routine times are local clock times; dated classes are
-- stored as timestamptz.

-- =====================================================================
-- 1. Tables
-- =====================================================================

-- The normal weekly routine of a batch, for example Saturday 16:00 to 17:30.
-- weekday uses the Postgres and JavaScript numbering: 0 = Sunday ... 6 = Saturday.
create table public.weekly_slots (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.batches (id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  constraint weekly_slots_time_order check (end_time > start_time),
  constraint weekly_slots_batch_day_time_key unique (batch_id, weekday, start_time)
);

-- One actual dated class.
--   scheduled   : a normal class from the routine
--   rescheduled : a routine class moved to another time (original_starts_at keeps the old time)
--   extra       : a class added by hand, outside the routine
--   cancelled   : called off (the row stays so students see it)
-- Classes made from the routine keep slot_id and slot_date, so generating
-- again never creates a second copy, even after a cancel or a move.
create table public.class_sessions (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null references public.batches (id) on delete cascade,
  slot_id             uuid references public.weekly_slots (id) on delete set null,
  slot_date           date,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  status              text not null default 'scheduled'
                      check (status in ('scheduled', 'cancelled', 'rescheduled', 'extra')),
  original_starts_at  timestamptz,
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint class_sessions_time_order check (ends_at > starts_at),
  constraint class_sessions_slot_date_check check (slot_id is null or slot_date is not null),
  constraint class_sessions_slot_date_key unique (slot_id, slot_date)
);

create index class_sessions_batch_starts_idx on public.class_sessions (batch_id, starts_at);
create index class_sessions_starts_idx on public.class_sessions (starts_at);

alter table public.weekly_slots enable row level security;
alter table public.class_sessions enable row level security;

-- =====================================================================
-- 2. Triggers
-- =====================================================================

-- Tidy the note, stamp updated_at, and handle moves:
-- moving a class remembers its first time and marks it rescheduled;
-- moving it back to that first time makes it a normal class again.
create or replace function public.class_sessions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.note := nullif(trim(new.note), '');

  if tg_op = 'UPDATE' then
    new.updated_at := now();

    if new.starts_at is distinct from old.starts_at then
      new.original_starts_at := coalesce(old.original_starts_at, old.starts_at);
      if new.status = 'scheduled' then
        new.status := 'rescheduled';
      end if;
    end if;

    if new.original_starts_at is not null and new.starts_at = new.original_starts_at then
      new.original_starts_at := null;
      if new.status = 'rescheduled' then
        new.status := 'scheduled';
      end if;
    end if;
  end if;

  -- A class made by hand is always an extra class unless cancelled.
  if new.slot_id is null and new.status in ('scheduled', 'rescheduled') and tg_op = 'INSERT' then
    new.status := 'extra';
  end if;

  return new;
end;
$$;

create trigger class_sessions_before_write
  before insert or update on public.class_sessions
  for each row execute function public.class_sessions_before_write();

-- Removing a routine slot also removes its future classes that were never
-- touched. Past classes, and any you cancelled or moved, stay.
create or replace function public.weekly_slots_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.class_sessions c
  where c.slot_id = old.id
    and c.status = 'scheduled'
    and c.starts_at > now();
  return old;
end;
$$;

create trigger weekly_slots_before_delete
  before delete on public.weekly_slots
  for each row execute function public.weekly_slots_before_delete();

-- =====================================================================
-- 3. Generate classes from the routine
-- =====================================================================

-- Creates the dated classes for the next p_weeks weeks (starting today,
-- Bangladesh time) for every active batch, or only p_batch_id.
-- Skips times already past, and any date that already has its class
-- (even if cancelled or moved). Returns how many classes were added.
create or replace function public.generate_sessions(p_weeks integer default 4, p_batch_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Dhaka')::date;
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only the admin can generate classes';
  end if;
  if p_weeks is null or p_weeks < 1 or p_weeks > 12 then
    raise exception 'Weeks must be between 1 and 12';
  end if;

  insert into public.class_sessions (batch_id, slot_id, slot_date, starts_at, ends_at, status)
  select
    s.batch_id,
    s.id,
    d.day,
    (d.day + s.start_time) at time zone 'Asia/Dhaka',
    (d.day + s.end_time) at time zone 'Asia/Dhaka',
    'scheduled'
  from public.weekly_slots s
  join public.batches b on b.id = s.batch_id and b.active
  cross join lateral (
    select v_today + g.i as day
    from generate_series(0, p_weeks * 7 - 1) as g(i)
  ) d
  where extract(dow from d.day) = s.weekday
    and (p_batch_id is null or s.batch_id = p_batch_id)
    and (d.day + s.start_time) at time zone 'Asia/Dhaka' > now()
    -- Same batch already has a class that started (or first started) at this time,
    -- for example from a slot that was removed and added again.
    and not exists (
      select 1 from public.class_sessions c
      where c.batch_id = s.batch_id
        and coalesce(c.original_starts_at, c.starts_at) = (d.day + s.start_time) at time zone 'Asia/Dhaka'
    )
  on conflict (slot_id, slot_date) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.generate_sessions(integer, uuid) from public, anon;
grant execute on function public.generate_sessions(integer, uuid) to authenticated;

-- =====================================================================
-- 4. Row Level Security policies
-- =====================================================================

-- weekly_slots: admin manages; students and guardians read the routine of
-- batches they can see (active batch, active enrollment).
create policy "weekly_slots: read enrolled or admin"
  on public.weekly_slots for select to authenticated
  using ((select public.is_admin()) or batch_id in (select public.my_batch_ids()));

create policy "weekly_slots: admin insert"
  on public.weekly_slots for insert to authenticated
  with check ((select public.is_admin()));

create policy "weekly_slots: admin update"
  on public.weekly_slots for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "weekly_slots: admin delete"
  on public.weekly_slots for delete to authenticated
  using ((select public.is_admin()));

-- class_sessions: same rule.
create policy "class_sessions: read enrolled or admin"
  on public.class_sessions for select to authenticated
  using ((select public.is_admin()) or batch_id in (select public.my_batch_ids()));

create policy "class_sessions: admin insert"
  on public.class_sessions for insert to authenticated
  with check ((select public.is_admin()));

create policy "class_sessions: admin update"
  on public.class_sessions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "class_sessions: admin delete"
  on public.class_sessions for delete to authenticated
  using ((select public.is_admin()));

-- Trigger functions are not callable from the browser.
revoke execute on function public.class_sessions_before_write() from public, anon, authenticated;
revoke execute on function public.weekly_slots_before_delete() from public, anon, authenticated;
