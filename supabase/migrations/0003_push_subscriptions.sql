-- =====================================================================
-- 0003 — push_subscriptions table
--
-- One row per device the user has enabled push on. Endpoint URL is
-- the natural primary key; users can have many devices.
-- =====================================================================

create table public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  p256dh      text not null,    -- client public key (base64url)
  auth        text not null,    -- client auth secret (base64url)
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push subs self-read"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push subs self-write"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push subs self-update"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "push subs self-delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Add a notification-channel preference to user_profiles.
alter table public.user_profiles
  add column if not exists reminder_push_optin boolean not null default true;
