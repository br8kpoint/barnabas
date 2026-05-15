"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  daysBetween,
  todayInTimezone,
  reconcileGraceAfterCompletion,
  PLAN_LENGTH,
} from "@/lib/schedule";

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Pure helper that runs after any completion: refund grace if the user
// is now ahead of the grace-adjusted schedule. Persists if grace changed.
async function refundGraceIfApplicable(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  userId: string,
) {
  const [{ data: profile }, { data: progressRows }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("timezone, start_date, grace_days_used")
      .eq("user_id", userId)
      .single(),
    supabase.from("progress").select("day").eq("user_id", userId),
  ]);
  if (!profile || profile.grace_days_used === 0) return;

  const completedDays = (progressRows ?? []).map((r) => r.day as number);
  if (!completedDays.length) return;
  const lastCompletedDay = Math.max(...completedDays);

  const today = todayInTimezone(profile.timezone);
  const scheduledDay = Math.min(
    PLAN_LENGTH,
    Math.max(0, daysBetween(profile.start_date, today)) + 1,
  );

  const newGraceUsed = reconcileGraceAfterCompletion({
    lastCompletedDay,
    scheduledDay,
    graceDaysUsed: profile.grace_days_used,
  });
  if (newGraceUsed !== profile.grace_days_used) {
    await supabase
      .from("user_profiles")
      .update({ grace_days_used: newGraceUsed })
      .eq("user_id", userId);
  }
}

export async function markDayComplete(day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 365) throw new Error("bad day");
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("progress")
    .upsert({ user_id: user.id, day, completed_at: new Date().toISOString() });
  if (error) throw error;
  await refundGraceIfApplicable(supabase, user.id);
}

export async function unmarkDay(day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 365) throw new Error("bad day");
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("progress")
    .delete()
    .eq("user_id", user.id)
    .eq("day", day);
  if (error) throw error;
}

export async function spendGraceDays(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("bad amount");
  const { supabase, user } = await requireUser();

  // Read current value, increment, write back. RLS guarantees user scope.
  const { data: profile, error: readErr } = await supabase
    .from("user_profiles")
    .select("grace_days_used, grace_days_budget")
    .eq("user_id", user.id)
    .single();
  if (readErr || !profile) throw readErr ?? new Error("no profile");

  const remaining = profile.grace_days_budget - profile.grace_days_used;
  if (amount > remaining) throw new Error("not enough grace days");

  const { error: writeErr } = await supabase
    .from("user_profiles")
    .update({ grace_days_used: profile.grace_days_used + amount })
    .eq("user_id", user.id);
  if (writeErr) throw writeErr;
}

// Pause notifications until a future date, spending grace days to cover the
// gap so the user isn't shown as "behind" during the break. Returns the
// number of grace days spent. Refund happens later via the normal
// catch-up path when the user reads.
export async function pauseUntil(date: string): Promise<{ graceSpent: number }> {
  // date is YYYY-MM-DD in the user's tz.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("timezone, grace_days_used, grace_days_budget")
    .eq("user_id", user.id)
    .single();
  if (!profile) throw new Error("no profile");

  const today = todayInTimezone(profile.timezone);
  const gap = daysBetween(today, date);
  if (gap <= 0) throw new Error("Pick a date in the future.");

  const remaining = profile.grace_days_budget - profile.grace_days_used;
  if (gap > remaining) {
    throw new Error(
      `That would need ${gap} grace days but you only have ${remaining}.`,
    );
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      grace_days_used: profile.grace_days_used + gap,
      reminder_paused_until: date,
    })
    .eq("user_id", user.id);
  if (error) throw error;
  return { graceSpent: gap };
}

// Cancel an active pause early. Does NOT refund grace days automatically —
// the user can refund them by catching up via the normal completion flow.
export async function cancelPause() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("user_profiles")
    .update({ reminder_paused_until: null })
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function updateProfile(input: {
  display_name?: string;
  timezone?: string;
  start_date?: string;
  reminder_hour?: number | null;
  reminder_email_optin?: boolean;
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("user_profiles")
    .update(input)
    .eq("user_id", user.id);
  if (error) throw error;
}

// Bulk-mark days 1..throughDay as complete for the current user. Used when
// someone has been watching the playlist on YouTube directly and wants to
// import their progress without clicking every day. Idempotent: re-running
// with the same value is a no-op for days already done.
export async function markCaughtUpThrough(throughDay: number): Promise<{ added: number }> {
  if (!Number.isInteger(throughDay) || throughDay < 1 || throughDay > 365) {
    throw new Error("Day must be between 1 and 365");
  }
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("progress")
    .select("day")
    .eq("user_id", user.id);
  const already = new Set((existing ?? []).map((r) => r.day as number));

  const rowsToInsert: Array<{ user_id: string; day: number; completed_at: string }> = [];
  const now = new Date().toISOString();
  for (let day = 1; day <= throughDay; day++) {
    if (!already.has(day)) {
      rowsToInsert.push({ user_id: user.id, day, completed_at: now });
    }
  }
  if (rowsToInsert.length === 0) return { added: 0 };

  const { error } = await supabase.from("progress").insert(rowsToInsert);
  if (error) throw error;
  await refundGraceIfApplicable(supabase, user.id);
  return { added: rowsToInsert.length };
}
