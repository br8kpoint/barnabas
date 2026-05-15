import type { Milestone } from "@/lib/milestones";

const ICON: Record<Milestone["kind"], string> = {
  streak: "✦",
  book: "📖",
  halfway: "⛰",
  complete: "🌅",
};

export function MilestonesList({ milestones }: { milestones: Milestone[] }) {
  if (!milestones.length) return null;
  // Show the most recent 5; dedupe by label so multiple streak tiers don't pile up.
  const seen = new Set<string>();
  const recent = milestones
    .filter((m) => (seen.has(m.label) ? false : (seen.add(m.label), true)))
    .slice(0, 5);

  return (
    <section className="rounded-lg bg-parchment/65 px-5 py-4 backdrop-blur-sm">
      <h2 className="mb-3 text-sm uppercase tracking-wider text-ink/50">Recent milestones</h2>
      <ul className="space-y-1.5 text-sm">
        {recent.map((m) => (
          <li key={m.label} className="flex items-baseline gap-3">
            <span className="text-base">{ICON[m.kind]}</span>
            <span className="flex-1">{m.label}</span>
            <span className="text-xs text-ink/50">Day {m.day}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
