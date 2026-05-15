"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Provider = "google" | "github" | "azure";

const providers: { id: Provider; label: string; scopes?: string }[] = [
  { id: "google", label: "Continue with Google" },
  { id: "github", label: "Continue with GitHub" },
  { id: "azure",  label: "Continue with Microsoft", scopes: "email" },
];

export function SignInPanel() {
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
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

  async function signInWithMagicLink(e: React.FormEvent) {
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
      setStatus("sent");
    }
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

      <form onSubmit={signInWithMagicLink} className="space-y-3">
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
          {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
        </button>
        {status === "sent" && (
          <p className="text-sm text-ontrack">
            Check your inbox — click the link to sign in.
          </p>
        )}
        {status === "error" && error && (
          <p className="text-sm text-behind">{error}</p>
        )}
      </form>
    </div>
  );
}
