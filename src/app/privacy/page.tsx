import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Barnabas",
  description: "How Barnabas handles your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 leading-relaxed">
      <p className="text-sm text-ink/60">
        <Link href="/" className="hover:underline">← Back to Barnabas</Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink/60">Last updated: May 15, 2026</p>

      <p className="mt-8">
        Barnabas is a personal, non-commercial project built to help people stay
        on track with a daily Bible read / watch plan. This page describes what
        information the app stores about you, why, and who else can see it.
      </p>

      <h2 className="mt-10 text-xl font-semibold">What we store</h2>
      <p className="mt-3">
        When you sign in, we store the minimum needed to make the app work:
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-6">
        <li>Your email address, from your sign-in provider or magic-link request.</li>
        <li>
          Your display name and (when available) profile picture URL, if you
          signed in with Google, Microsoft, or GitHub.
        </li>
        <li>
          Your read / watch progress — a list of which plan days you have marked
          complete.
        </li>
        <li>
          Your settings — timezone, plan start date, grace-day usage, preferred
          reminder hour, and email/push notification opt-in.
        </li>
        <li>
          Any groups you create or join, and the memberships of those groups
          (so members can see each other&rsquo;s plan-day progress, never email
          addresses or timezones).
        </li>
        <li>
          An app push subscription endpoint, if you enabled app push notifications
          from this device. You can revoke this at any time from your
          browser&rsquo;s notification settings.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">What we do not store</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-6">
        <li>Passwords. Sign-in is handled entirely by your OAuth provider or by a one-time email code.</li>
        <li>Payment information. The app is free and there is no payment.</li>
        <li>Notes, reflections, or journaling of any kind. The plan is a list of passages and companion videos; Barnabas does not capture writing.</li>
        <li>Analytics tied to your identity. We do not run ad trackers or behavior profiling.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Third parties that touch your data</h2>
      <p className="mt-3">
        Barnabas is built on services that, by necessity, see some of your data:
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-6">
        <li>
          <strong>Supabase</strong> — stores your account and read / watch progress;
          handles authentication. Located in the United States.
        </li>
        <li>
          <strong>Vercel</strong> — hosts the application. Vercel sees the
          request logs (IP, user-agent) for short retention.
        </li>
        <li>
          <strong>Resend</strong> — delivers transactional email (sign-in
          codes, daily reminders). Resend sees your email address.
        </li>
        <li>
          <strong>YouTube</strong> — videos are embedded directly from
          YouTube. When you press play, your browser contacts YouTube directly,
          which sets YouTube&rsquo;s own cookies. Barnabas does not pass your
          identity to YouTube.
        </li>
        <li>
          <strong>OAuth providers (Google, Microsoft, GitHub)</strong> — if you
          chose one to sign in, that provider authenticates you and tells
          Barnabas your email and display name. Barnabas does not request any
          additional data from these providers.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Who can see your data inside the app</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-6">
        <li>
          <strong>Only you</strong> can see your settings, your full progress
          history, and your email.
        </li>
        <li>
          <strong>Members of groups you join</strong> can see your display name
          and which plan days you have completed — nothing else.
        </li>
        <li>
          <strong>The app operator (the developer)</strong> has technical access
          to the database for maintenance. We do not browse your data and we do
          not share it with anyone outside the services listed above.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Email we send you</h2>
      <p className="mt-3">
        Barnabas only sends transactional email: sign-in codes, daily reminders
        (if you have them enabled), and notifications when a new daily video
        becomes available. There is no marketing email and no newsletter. You
        can turn reminders off at any time from <Link href="/settings" className="underline">Settings</Link>.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Cookies</h2>
      <p className="mt-3">
        We use a single first-party cookie to keep you signed in. We do not use
        cookies for analytics, advertising, or tracking. Embedded YouTube
        videos set their own cookies once you press play; refer to
        Google&rsquo;s privacy policy for those.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Your rights</h2>
      <p className="mt-3">
        You can:
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-6">
        <li>Request a copy of all data Barnabas holds about you.</li>
        <li>Request deletion of your account and all associated progress.</li>
        <li>Leave any group at any time from the group page.</li>
        <li>Revoke OAuth access from your provider&rsquo;s settings (Google, Microsoft, or GitHub).</li>
      </ul>
      <p className="mt-3">
        To request data export or account deletion, email{" "}
        <a href="mailto:br8kpoint@gmail.com" className="underline">br8kpoint@gmail.com</a>.
        We will respond within 30 days.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Changes to this policy</h2>
      <p className="mt-3">
        If we change how the app handles data, we will update this page and
        adjust the &ldquo;last updated&rdquo; date at the top. Material changes
        will be announced via the daily reminder email if you have it enabled.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Contact</h2>
      <p className="mt-3">
        Questions about this policy? Email{" "}
        <a href="mailto:br8kpoint@gmail.com" className="underline">br8kpoint@gmail.com</a>.
      </p>

      <p className="mt-12 text-sm text-ink/60">
        <Link href="/terms" className="hover:underline">Terms of Service</Link>
      </p>
    </main>
  );
}
