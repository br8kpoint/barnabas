import Image from "next/image";
import { SignInPanel } from "@/components/SignInPanel";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image
          src="/banner.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-parchment/75" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="rounded-lg bg-parchment/85 p-8 backdrop-blur-sm shadow-sm">
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
