import { requireUser } from "@/lib/auth-helpers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { computeCatchup, PLAN_LENGTH } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await requireUser();
  const supabase = getAdminSupabase();

  const [readingsRes, profileRes, progressRes] = await Promise.all([
    supabase
      .from("readings")
      .select("day, passage, video_id, video_published_at")
      .order("day", { ascending: true }),
    supabase
      .from("user_profiles")
      .select("timezone, start_date, grace_days_used")
      .eq("user_id", user.id)
      .single(),
    supabase.from("progress").select("day").eq("user_id", user.id),
  ]);

  const readings = readingsRes.data ?? [];
  const profile = profileRes.data!;
  const completed = new Set((progressRes.data ?? []).map((r) => r.day as number));

  const state = computeCatchup({
    startDate: profile.start_date,
    timezone: profile.timezone,
    graceDaysUsed: profile.grace_days_used,
    completedDays: [...completed],
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">The Plan</h1>
      <p className="mt-1 text-ink/70">
        {PLAN_LENGTH} days. {readings.filter((r) => r.video_id).length} videos published so far.
      </p>

      <ol className="mt-6 divide-y divide-ink/10">
        {readings.map((r) => {
          const isComplete = completed.has(r.day);
          const isNext = r.day === state.nextDay;
          const hasVideo = !!r.video_id;
          return (
            <li
              key={r.day}
              className={`flex items-center gap-4 py-2 ${isNext ? "bg-accent/5 -mx-2 px-2" : ""}`}
            >
              <span className="w-12 text-right tabular-nums text-ink/50">{r.day}</span>
              <span className="flex-1">
                {r.passage}
                {isNext && <span className="ml-2 text-xs text-accent">· next</span>}
              </span>
              {isComplete ? (
                <span className="text-xs text-ontrack">done</span>
              ) : hasVideo ? (
                <a
                  href={`https://www.youtube.com/watch?v=${r.video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  watch ↗
                </a>
              ) : (
                <span className="text-xs text-ink/40">not yet</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
