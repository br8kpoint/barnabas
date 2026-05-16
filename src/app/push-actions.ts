"use server";

import { requireUser } from "@/lib/auth-helpers";
import { getAdminSupabase } from "@/lib/supabase/admin";

type SubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(
  sub: SubscriptionJSON,
  userAgent: string,
) {
  const user = await requireUser();
  const supabase = getAdminSupabase();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error("Invalid subscription payload");
  }
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      user_id: user.id,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string) {
  const user = await requireUser();
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function sendTestPush() {
  const user = await requireUser();
  const supabase = getAdminSupabase();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);
  if (!subs?.length) throw new Error("No push devices registered");

  const { sendPushToSubscriptions } = await import("@/lib/push");
  await sendPushToSubscriptions(
    subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
    {
      title: "Barnabas test push",
      body: "If you see this, push notifications are working.",
      url: "/dashboard",
      tag: "barnabas-test",
    },
  );
}
