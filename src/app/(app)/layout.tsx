import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth-helpers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { TimezoneSync } from "@/components/TimezoneSync";

export const dynamic = "force-dynamic";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = getAdminSupabase();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="relative isolate min-h-screen">
      {profile?.timezone && <TimezoneSync currentTimezone={profile.timezone} />}
      {/* Banner backdrop: fixed full-viewport, whole painting visible (no crop).
          Content scrolls on top; the parchment overlay keeps text readable. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Image
          src="/banner.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-contain object-top"
        />
        <div className="absolute inset-0 bg-parchment/55" />
      </div>

      <header className="border-b border-ink/10 bg-parchment/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Barnabas
          </Link>
          <nav className="flex items-center gap-5 text-sm text-ink/70">
            <Link href="/dashboard" className="hover:text-ink">Today</Link>
            <Link href="/plan" className="hover:text-ink">Plan</Link>
            <Link href="/groups" className="hover:text-ink">Groups</Link>
            <Link href="/settings" className="hover:text-ink">Settings</Link>
            <form action="/auth/signout" method="post">
              <button className="text-ink/60 hover:text-behind" type="submit">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
