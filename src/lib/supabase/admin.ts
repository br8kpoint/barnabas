import { createClient } from "@supabase/supabase-js";

// Service-role client. NEVER import from client components.
// Bypasses RLS — only use inside cron endpoints and seed scripts.
export function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
