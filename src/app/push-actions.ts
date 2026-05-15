"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type SubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(
  sub: SubscriptionJSON,
  userAgent: string,
) {
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function sendTestPush() {
  // Fire-and-forget: send a test push to the calling user's subscriptions.
  // Implementation lives in src/lib/push.ts; we import lazily to keep the
  // bundle thin and avoid loading web-push in the client.
  const { supabase, user } = await requireUser();
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
