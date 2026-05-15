"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroup, joinGroup } from "@/app/group-actions";

export function GroupsForms() {
  const [pending, start] = useTransition();
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form
        className="rounded-lg border border-ink/10 bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            try {
              const id = await createGroup(createName.trim());
              router.push(`/groups/${id}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create.");
            }
          });
        }}
      >
        <h2 className="font-semibold">Create a group</h2>
        <p className="mt-1 text-sm text-ink/60">
          You&rsquo;ll get an invite code to share.
        </p>
        <input
          required
          maxLength={80}
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder="Our media group"
          className="mt-3 w-full rounded-md border border-ink/15 px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="mt-3 rounded-md bg-accent px-4 py-2 text-parchment disabled:opacity-40"
        >
          Create
        </button>
      </form>

      <form
        className="rounded-lg border border-ink/10 bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            try {
              const id = await joinGroup(joinCode.trim());
              router.push(`/groups/${id}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not join.");
            }
          });
        }}
      >
        <h2 className="font-semibold">Join with a code</h2>
        <p className="mt-1 text-sm text-ink/60">Paste the invite code someone sent you.</p>
        <input
          required
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="ABCD-1234"
          className="mt-3 w-full rounded-md border border-ink/15 px-3 py-2 font-mono"
        />
        <button
          type="submit"
          disabled={pending}
          className="mt-3 rounded-md border border-ink/20 px-4 py-2 disabled:opacity-40"
        >
          Join
        </button>
      </form>

      {error && <p className="text-behind md:col-span-2">{error}</p>}
    </div>
  );
}
