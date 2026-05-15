-- =====================================================================
-- 0002 — fix RLS recursion on group_members
--
-- The original group_members.SELECT policy queried group_members itself,
-- which caused Postgres to recursively re-check RLS on the inner query.
-- Same problem affected progress.SELECT via its groupmate clause.
--
-- Fix: replace the inline EXISTS clauses with SECURITY DEFINER helper
-- functions. These run as the function owner (postgres), bypassing RLS
-- on the lookup, but still use auth.uid() to scope the answer to the
-- current user. Safe because the functions only return booleans, never
-- expose row contents.
-- =====================================================================

-- 1. Helper: is auth.uid() a member of the given group?
create or replace function public.user_is_in_group(_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = auth.uid()
  );
$$;

-- 2. Helper: does auth.uid() share at least one group with _other_user?
create or replace function public.users_share_group(_other_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members me
    join public.group_members them on them.group_id = me.group_id
    where me.user_id = auth.uid() and them.user_id = _other_user
  );
$$;

-- 3. Replace the recursive policies.
drop policy if exists "members read roster" on public.group_members;
create policy "members read roster"
  on public.group_members for select
  using (user_is_in_group(group_id));

drop policy if exists "group visible to members" on public.groups;
create policy "group visible to members"
  on public.groups for select
  using (user_is_in_group(id));

drop policy if exists "progress self-read" on public.progress;
create policy "progress self-read"
  on public.progress for select
  using (
    auth.uid() = user_id
    or users_share_group(user_id)
  );
