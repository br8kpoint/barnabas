// Milestones derived from a user's completed days and the static reading plan.

import { booksInPassage } from "./readings";

export type Milestone = {
  kind: "streak" | "book" | "halfway" | "complete";
  label: string;
  day: number; // the day on which the milestone was hit
};

const STREAK_TARGETS = [7, 30, 100, 200, 365];

export function detectMilestones(args: {
  completedDays: number[];
  readings: Array<{ day: number; passage: string }>;
}): Milestone[] {
  const completed = new Set(args.completedDays);
  const sortedCompleted = [...args.completedDays].sort((a, b) => a - b);

  const out: Milestone[] = [];

  // Streak milestones — current streak length ending at last completed day.
  if (sortedCompleted.length) {
    let run = 1;
    for (let i = sortedCompleted.length - 1; i > 0; i--) {
      if (sortedCompleted[i] - sortedCompleted[i - 1] === 1) run++;
      else break;
    }
    for (const target of STREAK_TARGETS) {
      if (run >= target) {
        out.push({
          kind: "streak",
          label: `${target}-day streak`,
          day: sortedCompleted.at(-1)!,
        });
      }
    }
  }

  // Book completions: find the last day each book appears, then check that
  // every day touching that book is complete.
  const lastDayPerBook = new Map<string, number>();
  const allDaysPerBook = new Map<string, number[]>();
  for (const r of args.readings) {
    for (const book of booksInPassage(r.passage)) {
      lastDayPerBook.set(book, Math.max(lastDayPerBook.get(book) ?? 0, r.day));
      const arr = allDaysPerBook.get(book) ?? [];
      arr.push(r.day);
      allDaysPerBook.set(book, arr);
    }
  }
  for (const [book, days] of allDaysPerBook) {
    if (days.every((d) => completed.has(d))) {
      out.push({
        kind: "book",
        label: `Finished ${book}`,
        day: lastDayPerBook.get(book)!,
      });
    }
  }

  // Halfway / complete.
  if (completed.has(182)) {
    out.push({ kind: "halfway", label: "Halfway through!", day: 182 });
  }
  if (completed.has(365)) {
    out.push({ kind: "complete", label: "Whole Bible in one year", day: 365 });
  }

  // Most-recent first.
  return out.sort((a, b) => b.day - a.day);
}
