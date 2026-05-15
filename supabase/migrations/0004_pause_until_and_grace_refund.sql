-- =====================================================================
-- 0004 — pause-until-date + grace-refund support
--
-- Grace days are now refundable: marking a day complete that puts you
-- ahead of the grace-adjusted schedule refunds 1 grace day (down to 0).
-- That logic lives in the server actions, not in the database.
--
-- This migration only adds the column the "Take a break" feature needs.
-- =====================================================================

alter table public.user_profiles
  add column if not exists reminder_paused_until date;
