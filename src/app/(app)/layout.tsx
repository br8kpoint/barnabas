import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-parchment/80 backdrop-blur">
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
