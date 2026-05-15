import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GroupsForms } from "@/components/GroupsForms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GroupsPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS already filters: we can only see groups we belong to.
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, invite_code)")
    .eq("user_id", user.id);

  type GroupRow = { id: string; name: string; invite_code: string };
  // Supabase typing returns the embedded relation as object|array. Normalize.
  const groups: GroupRow[] =
    memberships?.flatMap((m): GroupRow[] => {
      const g = m.groups as GroupRow | GroupRow[] | null;
      if (!g) return [];
      return Array.isArray(g) ? g : [g];
    }) ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Groups</h1>
        <p className="mt-1 text-ink/70">
          Encourage one another — &ldquo;and so much the more, as ye see the day approaching.&rdquo;
        </p>
      </div>

      {groups.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm uppercase tracking-wider text-ink/50">Your groups</h2>
          <ul className="divide-y divide-ink/10">
            {groups.map((g) => (
              <li key={g.id} className="py-3">
                <Link href={`/groups/${g.id}`} className="font-medium hover:text-accent">
                  {g.name}
                </Link>
                <p className="text-sm text-ink/50">
                  Invite code: <code className="rounded bg-ink/5 px-1">{g.invite_code}</code>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-ink/60">You&rsquo;re not in any groups yet.</p>
      )}

      <GroupsForms />
    </div>
  );
}
