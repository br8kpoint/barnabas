"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Provider = "google" | "github" | "azure";

const providers: { id: Provider; label: string; scopes?: string }[] = [
  { id: "google", label: "Continue with Google" },
  { id: "azure",  label: "Continue with Microsoft", scopes: "email" },
  { id: "github", label: "Continue with GitHub" },
];

export function SignInPanel() {
  const supabase = getBrowserSupabase();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    (process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")) +
    "/auth/callback";

  async function signInWithOAuth(provider: Provider, scopes?: string) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, scopes },
    });
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStep("code");
      setStatus("idle");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("verifying");
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      // Session is now set in cookies; navigate to the dashboard.
      router.replace("/dashboard");
      router.refresh();
    }
  }

  function resetToEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setStatus("idle");
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <button
          key={p.id}
          onClick={() => signInWithOAuth(p.id, p.scopes)}
          className="w-full rounded-md border border-ink/15 bg-white px-4 py-2.5 text-left hover:border-accent"
        >
          {p.label}
        </button>
      ))}

      <div className="my-6 flex items-center gap-3 text-sm text-ink/50">
        <div className="h-px flex-1 bg-ink/15" /> or <div className="h-px flex-1 bg-ink/15" />
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-ink/15 bg-white px-4 py-2.5"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-parchment disabled:opacity-50"
          >
            {status === "sending" ? "Sending code…" : "Email me a sign-in code"}
          </button>
          {status === "error" && error && (
            <p className="text-sm text-behind">{error}</p>
          )}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-sm text-ink/70">
            Check <strong>{email}</strong>. Open the message and either click
            the link or copy the 6-digit code below.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-md border border-ink/15 bg-white px-4 py-2.5 text-center text-2xl tracking-[0.5em] tabular-nums"
          />
          <button
            type="submit"
            disabled={status === "verifying" || code.length !== 6}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-parchment disabled:opacity-50"
          >
            {status === "verifying" ? "Verifying…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={resetToEmail}
            className="w-full text-sm text-ink/60 hover:text-ink"
          >
            Use a different email
          </button>
          {status === "error" && error && (
            <p className="text-sm text-behind">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
