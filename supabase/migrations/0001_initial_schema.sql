-- =====================================================================
-- Barnabas — initial schema
-- =====================================================================
-- Apply via Supabase SQL editor, or `supabase db push` if using the CLI.
-- All user-scoped tables are protected by RLS; readings is public-read.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- readings: the 365-day chronological plan (seeded once from PDF)
-- video_id / video_published_at fill in as AJay publishes them.
-- ---------------------------------------------------------------------
create table public.readings (
  day                  smallint primary key check (day between 1 and 365),
  passage              text     not null,
  video_id             text,                                       -- e.g. "QgOYp-8wNEo"
  video_title          text,
  video_published_at   timestamptz,
  video_first_seen_at  timestamptz,                                -- first time sync detected it
  updated_at           timestamptz not null default now()
);

create index readings_video_published_at_idx on public.readings (video_published_at);

-- ---------------------------------------------------------------------
-- user_profiles: per-user settings (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.user_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  timezone             text not null default 'America/Los_Angeles', -- IANA tz
  start_date           date not null default current_date,           -- Day 1 = this date
  reminder_hour        smallint check (reminder_hour between 0 and 23), -- null = no reminder
  reminder_email_optin boolean not null default true,
  grace_days_used      integer not null default 0 check (grace_days_used >= 0),
  grace_days_budget    integer not null default 10 check (grace_days_budget >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- progress: one row per user × completed day
-- ---------------------------------------------------------------------
create table public.progress (
  user_id      uuid    not null references auth.users(id) on delete cascade,
  day          smallint not null references public.readings(day),
  completed_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index progress_user_day_idx on public.progress (user_id, day);

-- ---------------------------------------------------------------------
-- groups + group_members: invite-code groups for shared visibility
-- ---------------------------------------------------------------------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 80),
  invite_code text not null unique check (length(invite_code) between 6 and 16),
  created_by  uuid not null references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id)   on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

-- ---------------------------------------------------------------------
-- reminder_log: idempotency for the email cron (one per user per day)
-- ---------------------------------------------------------------------
create table public.reminder_log (
  user_id   uuid    not null references auth.users(id) on delete cascade,
  day       smallint not null,        -- scheduled day at send time
  sent_at   timestamptz not null default now(),
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.readings        enable row level security;
alter table public.user_profiles   enable row level security;
alter table public.progress        enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.reminder_log    enable row level security;

-- ---------------------------------------------------------------------
-- Helper functions for group-membership checks.
-- Inline EXISTS clauses against group_members from policies on
-- group_members itself trigger Postgres' "infinite recursion detected
-- in policy" error. SECURITY DEFINER functions run as the owner
-- (postgres), bypassing RLS on the inner lookup. They use auth.uid()
-- internally so callers can't probe arbitrary users.
-- ---------------------------------------------------------------------
create or replace function public.user_is_in_group(_group_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = auth.uid()
  );
$$;

create or replace function public.users_share_group(_other_user uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.group_members me
    join public.group_members them on them.group_id = me.group_id
    where me.user_id = auth.uid() and them.user_id = _other_user
  );
$$;

-- readings: world-readable (no PII), service role writes via sync cron
create policy "readings are public-read"
  on public.readings for select
  using (true);

-- user_profiles: each user reads/updates their own
create policy "profile self-read"
  on public.user_profiles for select using (auth.uid() = user_id);
create policy "profile self-update"
  on public.user_profiles for update using (auth.uid() = user_id);
create policy "profile self-insert"
  on public.user_profiles for insert with check (auth.uid() = user_id);

-- progress: each user reads/writes their own + can read groupmates' progress
create policy "progress self-read"
  on public.progress for select
  using (
    auth.uid() = user_id
    or users_share_group(user_id)
  );
create policy "progress self-write"
  on public.progress for insert with check (auth.uid() = user_id);
create policy "progress self-delete"
  on public.progress for delete using (auth.uid() = user_id);

-- groups: visible to members; creator can create
create policy "group visible to members"
  on public.groups for select
  using (user_is_in_group(id));
create policy "group create"
  on public.groups for insert with check (auth.uid() = created_by);

-- group_members: members see roster; users may join (insert self)
create policy "members read roster"
  on public.group_members for select
  using (user_is_in_group(group_id));
create policy "self join"
  on public.group_members for insert with check (auth.uid() = user_id);
create policy "self leave"
  on public.group_members for delete using (auth.uid() = user_id);

-- reminder_log: only service role touches this (no policies = no client access)

-- =====================================================================
-- View: leaderboard-friendly per-user progress (used by group view)
--
-- IMPORTANT: security_invoker = on makes the view run with the querying
-- user's permissions, so RLS policies on user_profiles and progress
-- apply. Without it, views default to the creator's permissions and
-- silently bypass RLS — meaning any signed-in user could see everyone's
-- progress through this view.
-- =====================================================================
create or replace view public.user_progress_summary
  with (security_invoker = on) as
select
  up.user_id,
  up.display_name,
  up.start_date,
  up.grace_days_used,
  coalesce(max(p.day), 0)                                      as last_completed_day,
  count(p.day)                                                 as days_completed
from public.user_profiles up
left join public.progress p on p.user_id = up.user_id
group by up.user_id, up.display_name, up.start_date, up.grace_days_used;
