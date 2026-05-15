import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { computeCatchup, streak, PLAN_LENGTH } from "@/lib/schedule";
import { getReadings } from "@/lib/readings";
import { detectMilestones } from "@/lib/milestones";
import { CatchupBanner } from "@/components/CatchupBanner";
import { TodayCard } from "@/components/TodayCard";
import { MilestonesList } from "@/components/MilestonesList";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, progressRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("display_name, timezone, start_date, grace_days_used, grace_days_budget")
      .eq("user_id", user.id)
      .single(),
    supabase.from("progress").select("day").eq("user_id", user.id),
  ]);

  if (profileRes.error || !profileRes.data) {
    throw new Error("Profile missing — sign out and back in.");
  }
  const profile = profileRes.data;
  const completedDays = (progressRes.data ?? []).map((r) => r.day as number);

  const state = computeCatchup({
    startDate: profile.start_date,
    timezone: profile.timezone,
    graceDaysUsed: profile.grace_days_used,
    completedDays,
  });

  // Show the next un-completed day plus a small window for context.
  const window = Array.from(
    new Set([
      state.nextDay,
      Math.min(PLAN_LENGTH, state.nextDay + 1),
      Math.min(PLAN_LENGTH, state.nextDay + 2),
    ]),
  );
  const readings = await getReadings(window);
  const currentStreak = streak(completedDays);

  // Milestones need the full plan to detect book completions.
  const allReadingsRes = await supabase.from("readings").select("day, passage");
  const allReadings = allReadingsRes.data ?? [];
  const milestones = detectMilestones({ completedDays, readings: allReadings });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-wider text-ink/50">Hello,</p>
        <h1 className="text-3xl font-semibold">{profile.display_name ?? "friend"}</h1>
        <p className="mt-1 text-ink/70">
          Day {state.lastCompletedDay} of {PLAN_LENGTH} completed · streak {currentStreak}
        </p>
      </header>

      <CatchupBanner
        state={state}
        graceAvailable={profile.grace_days_budget - profile.grace_days_used}
      />

      {state.finished ? (
        <p className="rounded-md bg-ontrack/10 p-6 text-ontrack">
          You finished the whole Bible in one year. 🎉
        </p>
      ) : (
        <div className="space-y-6">
          {readings.map((r) => (
            <TodayCard key={r.day} reading={r} isNext={r.day === state.nextDay} />
          ))}
        </div>
      )}

      <MilestonesList milestones={milestones} />
    </div>
  );
}
