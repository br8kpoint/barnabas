"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Provider = "google" | "microsoft-entra-id" | "github";

const providers: { id: Provider; label: string }[] = [
  { id: "google", label: "Continue with Google" },
  { id: "microsoft-entra-id", label: "Continue with Microsoft" },
  { id: "github", label: "Continue with GitHub" },
];

export function SignInPanel() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not send code");
      }
      setStep("code");
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send code");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("verifying");
    setError(null);
    const result = await signIn("email-otp", {
      email,
      code: code.trim(),
      redirect: false,
    });
    if (result?.ok) {
      router.replace("/dashboard");
      router.refresh();
    } else {
      setStatus("error");
      setError("Invalid or expired code. Try again or request a new one.");
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
          onClick={() => signIn(p.id, { callbackUrl: "/dashboard" })}
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
            Check <strong>{email}</strong>. Enter the 6-digit code we sent.
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
