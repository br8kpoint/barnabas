import Image from "next/image";
import { SignInPanel } from "@/components/SignInPanel";

export default function LoginPage() {
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

      {/* Same layout shape as landing page so the visual identity is consistent. */}
      <div className="flex min-h-screen flex-col justify-end p-6 sm:items-end sm:justify-center sm:p-12 lg:pr-24">
        <div className="w-full max-w-md rounded-lg bg-parchment/85 p-8 shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-semibold">Sign in to Barnabas</h1>
          <p className="mt-2 text-ink/70">Pick whichever account is easiest for you.</p>
          <div className="mt-8">
            <SignInPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
