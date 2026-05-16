"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions";

export function OnboardingDialog({ today }: { today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState(today);
  const [wantsReminders, setWantsReminders] = useState(true);
  const [reminderHour, setReminderHour] = useState(7);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await completeOnboarding({
        start_date: startDate,
        reminder_hour: wantsReminders ? reminderHour : null,
        reminder_email_optin: wantsReminders,
      });
      router.refresh();
    });
  }

  function skip() {
    startTransition(async () => {
      await completeOnboarding({});
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-parchment p-6 shadow-xl">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome to Barnabas</h2>
        <p className="mt-2 text-ink/70">
          Two quick settings and you&rsquo;re reading.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium">Start date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2"
            />
            <p className="mt-1 text-xs text-ink/60">
              When does Day 1 land? Today is the default; pick a past date if
              you&rsquo;ve been reading already.
            </p>
          </div>

          <div>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={wantsReminders}
                onChange={(e) => setWantsReminders(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm font-medium">
                Email me a daily nudge if I haven&rsquo;t finished
                today&rsquo;s reading
              </span>
            </label>

            {wantsReminders && (
              <div className="ml-6 mt-3">
                <label className="block text-sm">At what time?</label>
                <select
                  value={reminderHour}
                  onChange={(e) => setReminderHour(Number(e.target.value))}
                  className="mt-1 rounded-md border border-ink/15 bg-white px-3 py-2"
                >
                  <option value={6}>6 AM</option>
                  <option value={7}>7 AM</option>
                  <option value={8}>8 AM</option>
                  <option value={9}>9 AM</option>
                  <option value={10}>10 AM</option>
                  <option value={12}>Noon</option>
                  <option value={17}>5 PM</option>
                  <option value={18}>6 PM</option>
                  <option value={19}>7 PM</option>
                  <option value={20}>8 PM</option>
                  <option value={21}>9 PM</option>
                </select>
                <p className="mt-1 text-xs text-ink/60">
                  Browser push notifications can be enabled later in Settings.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={skip}
              disabled={pending}
              className="text-sm text-ink/60 hover:text-ink disabled:opacity-50"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-5 py-2 text-parchment disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save & continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
