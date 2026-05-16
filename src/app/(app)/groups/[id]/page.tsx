import { requireUser } from "@/lib/auth-helpers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { computeCatchup, PLAN_LENGTH } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = getAdminSupabase();

  // Membership gate: only members of this group may see its roster and progress.
  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  const { data: group, error } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!group) notFound();

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, joined_at")
    .eq("group_id", id);
  const memberIds = (memberRows ?? []).map((m) => m.user_id as string);

  const { data: summaryRows } = memberIds.length
    ? await supabase
        .from("user_progress_summary")
        .select(
          "user_id, display_name, start_date, grace_days_used, last_completed_day, days_completed",
        )
        .in("user_id", memberIds)
    : { data: [] as Array<{
        user_id: string;
        display_name: string | null;
        start_date: string;
        grace_days_used: number;
        last_completed_day: number;
        days_completed: number;
      }> };

  // computeCatchup needs the user's tz, which the view withholds. UTC is a
  // close-enough proxy for the leaderboard view; we're not making auth
  // decisions, just showing where folks are.
  const enriched = (summaryRows ?? [])
    .map((r) => {
      const state = computeCatchup({
        startDate: r.start_date,
        timezone: "UTC",
        graceDaysUsed: r.grace_days_used,
        completedDays: r.last_completed_day ? [r.last_completed_day] : [],
      });
      return { ...r, state };
    })
    .sort((a, b) => b.state.behindBy - a.state.behindBy);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{group.name}</h1>
      <p className="mt-1 text-sm text-ink/60">
        Invite code: <code className="rounded bg-ink/5 px-1.5">{group.invite_code}</code>
      </p>

      <ul className="mt-8 divide-y divide-ink/10">
        {enriched.map((m) => {
          const name = m.display_name ?? "Anonymous";
          const day = m.last_completed_day;
          const pct = Math.round((day / PLAN_LENGTH) * 100);
          return (
            <li key={m.user_id} className="flex items-center gap-4 py-3">
              <div className="flex-1">
                <p className="font-medium">{name}</p>
                <p className="text-sm text-ink/60">
                  Day {day} of {PLAN_LENGTH}
                  {m.state.behindBy > 0 ? (
                    <span className="ml-2 text-behind">· behind by {m.state.behindBy}</span>
                  ) : (
                    <span className="ml-2 text-ontrack">· on track</span>
                  )}
                </p>
              </div>
              <div className="w-32">
                <div className="h-2 rounded-full bg-ink/10">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-right text-xs text-ink/50">{pct}%</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
