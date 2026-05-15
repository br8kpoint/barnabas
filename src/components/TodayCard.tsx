"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Reading } from "@/lib/readings";
import { markDayComplete, unmarkDay } from "@/app/actions";
import { YouTubePlayer } from "./YouTubePlayer";

export function TodayCard({
  reading,
  isNext,
  completed = false,
}: {
  reading: Reading;
  isNext?: boolean;
  completed?: boolean;
}) {
  const [pending, start] = useTransition();
  const [autoCompleted, setAutoCompleted] = useState(false);
  const router = useRouter();
  const available = !!reading.video_id;
  const isComplete = completed || autoCompleted;

  function complete() {
    start(async () => {
      await markDayComplete(reading.day);
      router.refresh();
    });
  }

  function uncomplete() {
    start(async () => {
      await unmarkDay(reading.day);
      router.refresh();
    });
  }

  function handleEnded() {
    if (isComplete) return;
    // Optimistic UI flip so the user immediately sees the green state,
    // then persist; router.refresh will reconcile the rest of the page.
    setAutoCompleted(true);
    start(async () => {
      try {
        await markDayComplete(reading.day);
        router.refresh();
      } catch (err) {
        console.error("auto-complete failed", err);
        setAutoCompleted(false);
      }
    });
  }

  return (
    <section
      className={`rounded-lg border bg-white p-5 ${
        isNext ? "border-accent shadow-sm" : "border-ink/10"
      }`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/50">
            Day {reading.day}
            {isNext && " · next"}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{reading.passage}</h2>
        </div>
        {!available && (
          <span className="rounded-full bg-behind/10 px-2 py-0.5 text-xs text-behind">
            Video not yet published
          </span>
        )}
      </header>

      {available && reading.video_id && (
        <YouTubePlayer
          videoId={reading.video_id}
          title={reading.video_title ?? `Day ${reading.day}`}
          onEnded={handleEnded}
          className="mt-4 aspect-video w-full overflow-hidden rounded-md"
        />
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-3">
        {!isComplete ? (
          <>
            <button
              disabled={pending || !available}
              onClick={complete}
              className="rounded-md bg-accent px-4 py-2 text-sm text-parchment disabled:opacity-40"
            >
              Mark Day {reading.day} complete
            </button>
            {available && reading.video_id && (
              <a
                href={`https://www.youtube.com/watch?v=${reading.video_id}`}
                target="_blank"
                rel="noreferrer"
                title="Open on YouTube to like the video"
                className="rounded-md border border-ink/15 px-3 py-2 text-sm text-ink/70 hover:border-accent hover:text-accent"
              >
                Like on YouTube ↗
              </a>
            )}
            {available && (
              <span className="text-xs text-ink/50">
                or finish the video — we&rsquo;ll mark it automatically
              </span>
            )}
          </>
        ) : (
          <>
            <button
              disabled={pending}
              onClick={uncomplete}
              className="rounded-md border border-ink/15 px-4 py-2 text-sm text-ink/70 hover:border-behind hover:text-behind"
            >
              Completed · undo
            </button>
            {available && reading.video_id && (
              <a
                href={`https://www.youtube.com/watch?v=${reading.video_id}`}
                target="_blank"
                rel="noreferrer"
                title="Open on YouTube to like the video"
                className="rounded-md border border-ink/15 px-3 py-2 text-sm text-ink/70 hover:border-accent hover:text-accent"
              >
                Like on YouTube ↗
              </a>
            )}
          </>
        )}
      </footer>
    </section>
  );
}
