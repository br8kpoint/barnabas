"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  markCaughtUpThrough,
  pauseUntil,
  cancelPause,
} from "@/app/actions";
import { PushSetup } from "./PushSetup";

type Profile = {
  display_name: string | null;
  timezone: string;
  start_date: string;
  reminder_hour: number | null;
  reminder_email_optin: boolean;
  grace_days_used: number;
  grace_days_budget: number;
  reminder_paused_until: string | null;
};

export function SettingsForm({ initial, email }: { initial: Profile; email: string }) {
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const remaining = form.grace_days_budget - form.grace_days_used;

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await updateProfile({
        display_name: form.display_name ?? "",
        timezone: form.timezone,
        start_date: form.start_date,
        reminder_hour: form.reminder_hour,
        reminder_email_optin: form.reminder_email_optin,
      });
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-12">
      <form onSubmit={save} className="space-y-6">
        <div>
          <label className="block text-sm text-ink/70">Email</label>
          <p className="mt-1">{email}</p>
        </div>

        <Field label="Display name">
          <input
            className={INPUT_CLS}
            value={form.display_name ?? ""}
            onChange={(e) => update("display_name", e.target.value)}
          />
        </Field>

        <Field label="Timezone (IANA, e.g. America/Los_Angeles)">
          <input
            className={INPUT_CLS}
            value={form.timezone}
            onChange={(e) => update("timezone", e.target.value)}
          />
        </Field>

        <Field label="Start date (Day 1)">
          <input
            type="date"
            className={INPUT_CLS}
            value={form.start_date}
            onChange={(e) => update("start_date", e.target.value)}
          />
        </Field>

        <Field label="Daily reminder hour (24h, leave blank to skip)">
          <input
            type="number"
            min={0}
            max={23}
            className={INPUT_CLS}
            value={form.reminder_hour ?? ""}
            onChange={(e) =>
              update(
                "reminder_hour",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.reminder_email_optin}
            onChange={(e) => update("reminder_email_optin", e.target.checked)}
          />
          <span>Email me a nudge if I haven&rsquo;t finished today&rsquo;s read / watch.</span>
        </label>

        <div className="rounded-md bg-ink/5 px-4 py-3 text-sm">
          Grace days: <strong>{remaining}</strong> of {form.grace_days_budget} remaining.
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-parchment disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="ml-3 text-sm text-ontrack">Saved.</span>}
      </form>

      <PushSetup />
      <TakeBreakForm
        graceAvailable={remaining}
        currentPausedUntil={form.reminder_paused_until}
      />
      <CatchUpForm />
    </div>
  );
}

function TakeBreakForm({
  graceAvailable,
  currentPausedUntil,
}: {
  graceAvailable: number;
  currentPausedUntil: string | null;
}) {
  const [date, setDate] = useState<string>("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  // Today + 1 as the minimum (must be a future date).
  const minDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  // Compute the grace cost for the picked date (date - today in days).
  const cost = date
    ? Math.max(
        0,
        Math.floor(
          (Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) /
            86_400_000,
        ),
      )
    : 0;

  function submitPause(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    start(async () => {
      try {
        const { graceSpent } = await pauseUntil(date);
        setResult(
          `Reminders paused until ${date}. Spent ${graceSpent} grace day${graceSpent === 1 ? "" : "s"}; catch up later to refund them.`,
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not pause.");
      }
    });
  }

  function submitCancel() {
    setResult(null);
    setError(null);
    start(async () => {
      try {
        await cancelPause();
        setResult("Pause cancelled. Reminders are back on.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not cancel.");
      }
    });
  }

  if (currentPausedUntil && currentPausedUntil > today) {
    return (
      <section className="rounded-lg border border-ink/10 bg-white p-5">
        <h2 className="font-semibold">Take a break</h2>
        <p className="mt-1 text-sm text-ink/60">
          Reminders are currently paused until <strong>{currentPausedUntil}</strong>.
          When you come back and start reading / watching, grace days will refund
          as you catch up.
        </p>
        <button
          type="button"
          onClick={submitCancel}
          disabled={pending}
          className="mt-3 rounded-md border border-ink/15 px-4 py-1.5 text-sm text-ink/70 hover:border-behind hover:text-behind disabled:opacity-40"
        >
          {pending ? "Cancelling…" : "I'm back early — cancel the pause"}
        </button>
        {result && <p className="mt-3 text-sm text-ontrack">{result}</p>}
        {error && <p className="mt-3 text-sm text-behind">{error}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5">
      <h2 className="font-semibold">Take a break</h2>
      <p className="mt-1 text-sm text-ink/60">
        Going on vacation or have a busy stretch? Pick a return date and
        we&rsquo;ll spend grace days to cover it. No nags during the break.
        Catch up later and the grace days refund.
      </p>
      <form onSubmit={submitPause} className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Resume on
          <input
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-ink/15 px-3 py-1.5"
            required
          />
        </label>
        <span className="text-sm text-ink/70">
          {date
            ? `Will spend ${cost} of your ${graceAvailable} grace days.`
            : `${graceAvailable} grace days available.`}
        </span>
        <button
          type="submit"
          disabled={pending || cost === 0 || cost > graceAvailable}
          className="rounded-md bg-accent px-4 py-1.5 text-sm text-parchment disabled:opacity-40"
        >
          {pending ? "Pausing…" : "Take the break"}
        </button>
      </form>
      {result && <p className="mt-3 text-sm text-ontrack">{result}</p>}
      {error && <p className="mt-3 text-sm text-behind">{error}</p>}
    </section>
  );
}

function CatchUpForm() {
  const [day, setDay] = useState<string>("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    const n = Number(day);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      setError("Enter a day between 1 and 365.");
      return;
    }
    start(async () => {
      try {
        const { added } = await markCaughtUpThrough(n);
        setResult(
          added === 0
            ? `Already caught up through Day ${n}.`
            : `Marked ${added} day${added === 1 ? "" : "s"} complete (through Day ${n}).`,
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5">
      <h2 className="font-semibold">Bulk catch-up</h2>
      <p className="mt-1 text-sm text-ink/60">
        If you&rsquo;ve been watching on YouTube directly, tell us the highest
        day you&rsquo;ve completed and we&rsquo;ll mark everything up to that day
        done. Safe to re-run — days already marked stay marked.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          I&rsquo;ve completed through Day
          <input
            type="number"
            min={1}
            max={365}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-24 rounded-md border border-ink/15 px-3 py-1.5"
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-accent px-4 py-1.5 text-accent disabled:opacity-40"
        >
          {pending ? "Marking…" : "Catch me up"}
        </button>
      </form>
      {result && <p className="mt-3 text-sm text-ontrack">{result}</p>}
      {error && <p className="mt-3 text-sm text-behind">{error}</p>}
    </section>
  );
}

const INPUT_CLS = "mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70">{label}</span>
      {children}
    </label>
  );
}
