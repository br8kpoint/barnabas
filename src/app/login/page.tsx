import { SignInPanel } from "@/components/SignInPanel";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold">Sign in to Barnabas</h1>
      <p className="mt-2 text-ink/70">Pick whichever account is easiest for you.</p>
      <div className="mt-8">
        <SignInPanel />
      </div>
    </main>
  );
}
