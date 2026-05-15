import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image
          src="/banner.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-contain object-top sm:object-cover sm:object-center"
        />
        <div className="absolute inset-0 bg-parchment/40 sm:bg-parchment/30" />
      </div>

      {/* Mobile: card at the bottom, below the painting at top.
          Desktop: card vertically centered, anchored to the right
          so the window/wall area is covered, not the figures. */}
      <div className="flex min-h-screen flex-col justify-end p-6 sm:items-end sm:justify-center sm:p-12 lg:pr-24">
        <div className="w-full max-w-md rounded-lg bg-parchment/85 p-8 shadow-sm backdrop-blur-sm">
          <h1 className="text-4xl font-semibold tracking-tight">Barnabas</h1>
          <p className="mt-2 text-lg text-ink/70">Bible Reading Encouragement System</p>

          <p className="mt-8 leading-relaxed">
            A companion for AJaytheCEO&rsquo;s <em>Read the Bible in One Year</em> plan.
            Keep your place, see where you are, and catch up when life gets in the way.
          </p>

          <p className="mt-4 leading-relaxed text-ink/80">
            Named for the apostle Barnabas — &ldquo;the son of encouragement&rdquo; (Acts 4:36).
          </p>

          <div className="mt-8">
            <Link
              href="/login"
              className="inline-block rounded-md bg-accent px-5 py-2.5 text-parchment hover:opacity-90"
            >
              Sign in to get started
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
