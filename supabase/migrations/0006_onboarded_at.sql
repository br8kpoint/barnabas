-- Track whether a user has completed the first-run onboarding dialog.
-- NULL = pending (show the dialog); timestamptz = completed at that moment.

alter table public.user_profiles
  add column if not exists onboarded_at timestamptz;
