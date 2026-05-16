import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Barnabas",
  description: "Terms for using Barnabas.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 leading-relaxed">
      <p className="text-sm text-ink/60">
        <Link href="/" className="hover:underline">← Back to Barnabas</Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink/60">Last updated: May 15, 2026</p>

      <p className="mt-8">
        Barnabas is a free, non-commercial tool for following a daily Bible
        read / watch plan. By using it, you agree to the following terms. They
        are deliberately short.
      </p>

      <h2 className="mt-10 text-xl font-semibold">The app is provided as-is</h2>
      <p className="mt-3">
        Barnabas is a personal project, offered without charge and without
        warranty of any kind. We try to keep it running and accurate, but we
        cannot promise that the service will be uninterrupted, that the data
        will never be lost, or that the read / watch plan will always sync correctly
        with the source video series. If a perfectly reliable Bible read / watch
        tracker is important to you, please keep your own backup record.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Your account</h2>
      <p className="mt-3">
        You sign in with your existing Google, Microsoft, or GitHub account, or
        with a one-time code sent to your email. You are responsible for the
        security of the underlying account. We never see or store your
        password.
      </p>
      <p className="mt-3">
        You can delete your account at any time by emailing{" "}
        <a href="mailto:br8kpoint@gmail.com" className="underline">br8kpoint@gmail.com</a>.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Acceptable use</h2>
      <p className="mt-3">
        We ask that you use Barnabas in good faith. In particular:
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-6">
        <li>Do not attempt to gain access to other users&rsquo; accounts or data.</li>
        <li>Do not use the service to harass other group members.</li>
        <li>Do not abuse the email or push notification systems (e.g. through automated repeated sign-up attempts).</li>
        <li>Do not attempt to disrupt or overload the service.</li>
      </ul>
      <p className="mt-3">
        We may remove accounts that violate these terms, at our sole discretion.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Content</h2>
      <p className="mt-3">
        The daily plan references Bible passages and the companion YouTube
        videos that walk through them. The videos are produced by the YouTube
        channel AJaytheCEO and embedded from YouTube; we do not host that
        content. Use of those videos is subject to YouTube&rsquo;s terms.
      </p>
      <p className="mt-3">
        Any content you create inside Barnabas — group names, invite codes,
        display name — is yours; you grant us a limited license only to display
        it to other members of groups you join, in order to make the app
        function.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Third-party services</h2>
      <p className="mt-3">
        Barnabas relies on third-party providers (Supabase, Vercel, Resend,
        YouTube, and your chosen sign-in provider). Their availability and
        terms are outside our control. See our{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link> for
        the full list.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Limitation of liability</h2>
      <p className="mt-3">
        To the maximum extent permitted by law, Barnabas and its operator are
        not liable for any indirect, incidental, or consequential damages
        arising from your use of the service, including lost progress, missed
        days, or interruptions in service.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Changes to these terms</h2>
      <p className="mt-3">
        If we update these terms, we will change the &ldquo;last updated&rdquo;
        date at the top of this page. Material changes will be announced via
        the daily reminder email if you have it enabled. Continued use of
        Barnabas after a change means you accept the new terms.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Governing law</h2>
      <p className="mt-3">
        These terms are governed by the laws of the Province of Ontario,
        Canada, without regard to conflict-of-laws principles. Any disputes
        will be resolved in the courts of that province.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Contact</h2>
      <p className="mt-3">
        Questions about these terms? Email{" "}
        <a href="mailto:br8kpoint@gmail.com" className="underline">br8kpoint@gmail.com</a>.
      </p>

      <p className="mt-12 text-sm text-ink/60">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
      </p>
    </main>
  );
}
