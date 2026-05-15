import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main>
      <div className="relative isolate overflow-hidden border-b border-ink/10">
        <Image
          src="/banner.jpg"
          alt="Barnabas encouraging a modern reader as they watch a daily Bible reading"
          width={2400}
          height={1350}
          priority
          className="w-full"
        />
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-4xl font-semibold tracking-tight">Barnabas</h1>
        <p className="mt-2 text-lg text-ink/70">Bible Reading Encouragement System</p>

        <p className="mt-10 leading-relaxed">
          A companion for AJaytheCEO&rsquo;s <em>Read the Bible in One Year</em> plan.
          Keep your place, see where you are, and catch up when life gets in the way.
        </p>

        <p className="mt-6 leading-relaxed text-ink/80">
          Named for the apostle Barnabas — &ldquo;the son of encouragement&rdquo; (Acts 4:36).
        </p>

        <div className="mt-10">
          <Link
            href="/login"
            className="inline-block rounded-md bg-accent px-5 py-2.5 text-parchment hover:opacity-90"
          >
            Sign in to get started
          </Link>
        </div>
      </div>
    </main>
  );
}
