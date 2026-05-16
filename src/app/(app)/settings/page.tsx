import { requireUser } from "@/lib/auth-helpers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = getAdminSupabase();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "display_name, timezone, start_date, reminder_hour, reminder_email_optin, grace_days_used, grace_days_budget, reminder_paused_until",
    )
    .eq("user_id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-ink/70">Tune your schedule and reminders.</p>
      <div className="mt-8">
        <SettingsForm initial={profile} email={user.email} />
      </div>
    </div>
  );
}
