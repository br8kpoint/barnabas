// Scheduling and catch-up math.
//
// Concepts:
//   start_date          — the user's Day 1.
//   today (user tz)     — current calendar day in their timezone.
//   scheduled_day       — what day they should be on, ignoring grace days.
//                         = days_since(start_date) + 1
//   effective_day       — what the plan now expects, after applying grace days.
//                         = scheduled_day - grace_days_used
//   last_completed_day  — max day they've marked done (0 if none).
//   behind_by           — effective_day - last_completed_day - 1 (clamped >= 0).
//   next_day            — the next day to read.
//                         = last_completed_day + 1, capped at 365.

export const PLAN_LENGTH = 365;

export function todayInTimezone(tz: string, now = new Date()): string {
  // YYYY-MM-DD in the user's local timezone.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysBetween(startISO: string, endISO: string): number {
  // Whole days; both inputs are YYYY-MM-DD treated as midnight UTC for diffing.
  const start = Date.parse(startISO + "T00:00:00Z");
  const end = Date.parse(endISO + "T00:00:00Z");
  return Math.floor((end - start) / 86_400_000);
}

export type CatchupState = {
  scheduledDay: number;        // 1..365+, what the calendar says
  effectiveDay: number;        // after grace days
  lastCompletedDay: number;    // 0..365
  nextDay: number;             // 1..365
  behindBy: number;            // 0 if on track
  onTrack: boolean;
  finished: boolean;           // last completed == 365
};

export function computeCatchup(args: {
  startDate: string;     // YYYY-MM-DD
  timezone: string;
  graceDaysUsed: number;
  completedDays: number[];
  now?: Date;
}): CatchupState {
  const today = todayInTimezone(args.timezone, args.now);
  const daysIn = Math.max(0, daysBetween(args.startDate, today));
  const scheduledDay = Math.min(PLAN_LENGTH, daysIn + 1);
  const effectiveDay = Math.min(
    PLAN_LENGTH,
    Math.max(1, scheduledDay - args.graceDaysUsed),
  );

  const lastCompletedDay = args.completedDays.length
    ? Math.max(...args.completedDays)
    : 0;
  const nextDay = Math.min(PLAN_LENGTH, lastCompletedDay + 1);
  const behindBy = Math.max(0, effectiveDay - lastCompletedDay - 1);

  return {
    scheduledDay,
    effectiveDay,
    lastCompletedDay,
    nextDay,
    behindBy,
    onTrack: behindBy === 0,
    finished: lastCompletedDay >= PLAN_LENGTH,
  };
}

// How many grace days the user would need to "spend" to wipe out behindBy.
export function graceDaysNeededToCatchUp(state: CatchupState): number {
  return state.behindBy;
}

// Model B refund: when a user completes a day that puts them ahead of the
// grace-adjusted schedule, decrement grace_days_used by the surplus, down to
// zero. Caller passes the *new* lastCompletedDay (post-completion), the
// current scheduledDay, and current grace_days_used; returns the new
// grace_days_used. Pure function — no IO.
export function reconcileGraceAfterCompletion(args: {
  lastCompletedDay: number;
  scheduledDay: number;
  graceDaysUsed: number;
}): number {
  const effective = args.scheduledDay - args.graceDaysUsed;
  const surplus = Math.max(0, args.lastCompletedDay - effective);
  const refund = Math.min(surplus, args.graceDaysUsed);
  return Math.max(0, args.graceDaysUsed - refund);
}

// Current consecutive-day streak ending at lastCompletedDay (in plan-day units).
// Note: this counts plan-day continuity, not calendar continuity. A user who
// catches up on a Saturday by reading Day 142, 143, 144 still has a streak of 3+.
export function streak(completedDays: number[]): number {
  if (!completedDays.length) return 0;
  const sorted = [...completedDays].sort((a, b) => a - b);
  let run = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i] - sorted[i - 1] === 1) run++;
    else break;
  }
  return run;
}
