"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CatchupState } from "@/lib/schedule";
import { spendGraceDays } from "@/app/actions";

export function CatchupBanner({
  state,
  graceAvailable,
}: {
  state: CatchupState;
  graceAvailable: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (state.finished) return null;

  if (state.onTrack) {
    return (
      <div className="rounded-md bg-ontrack/10 px-4 py-3 text-ontrack">
        <strong>On track.</strong> Today&rsquo;s reading is Day {state.scheduledDay}.
      </div>
    );
  }

  const canSpendAll = graceAvailable >= state.behindBy;

  return (
    <div className="rounded-md bg-behind/10 px-4 py-3">
      <p className="text-behind">
        <strong>Behind by {state.behindBy}.</strong> Calendar says Day {state.scheduledDay};
        last completed Day {state.lastCompletedDay}.
      </p>
      <p className="mt-1 text-sm text-ink/70">
        Grace days available: {graceAvailable} of total budget.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={!canSpendAll || pending}
          onClick={() =>
            start(async () => {
              await spendGraceDays(state.behindBy);
              router.refresh();
            })
          }
          className="rounded-md bg-accent px-3 py-1.5 text-sm text-parchment disabled:opacity-40"
        >
          Use {state.behindBy} grace day{state.behindBy === 1 ? "" : "s"}
        </button>
        <span className="text-sm text-ink/60 self-center">
          or read {state.behindBy} more to catch up
        </span>
      </div>
    </div>
  );
}
