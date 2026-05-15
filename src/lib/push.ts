// Server-side web push.
//
// Uses the web-push library with VAPID identity. Each push to the
// browser is sent individually (browsers don't support batch fan-out
// from one HTTP call); we run them with bounded concurrency to keep
// the cron warm.
//
// Failure mode: if a subscription is 404/410 (gone), we delete it.

import webpush from "web-push";
import { getAdminSupabase } from "./supabase/admin";

let configured = false;
function configure() {
  if (configured) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "VAPID env vars missing: VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;   // path to navigate to on click
  tag?: string;   // collapses repeated notifications
};

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendPushToSubscriptions(
  subs: StoredSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; removedDead: number }> {
  if (!subs.length) return { sent: 0, removedDead: 0 };
  configure();

  const json = JSON.stringify(payload);
  const supabase = getAdminSupabase();

  let sent = 0;
  let removedDead = 0;
  const deadEndpoints: string[] = [];

  // Modest concurrency keeps us under push service rate limits.
  const CONCURRENCY = 8;
  for (let i = 0; i < subs.length; i += CONCURRENCY) {
    const batch = subs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
        ),
      ),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const sub = batch[j];
      if (r.status === "fulfilled") {
        sent++;
      } else {
        const err = r.reason as { statusCode?: number; message?: string };
        // 404 = endpoint not found, 410 = gone; either way the subscription is dead.
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadEndpoints.push(sub.endpoint);
        } else {
          console.error("push failed for", sub.endpoint, err);
        }
      }
    }
  }

  if (deadEndpoints.length) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", deadEndpoints);
    if (error) console.error("could not prune dead subs:", error);
    else removedDead = deadEndpoints.length;
  }

  // Best-effort touch of last_used_at for sent ones.
  if (sent > 0) {
    const alive = subs.filter((s) => !deadEndpoints.includes(s.endpoint));
    if (alive.length) {
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("endpoint", alive.map((s) => s.endpoint));
    }
  }

  return { sent, removedDead };
}

// Convenience: load all of a user's subscriptions and push to them.
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removedDead: number }> {
  const supabase = getAdminSupabase();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  return sendPushToSubscriptions((subs ?? []) as StoredSubscription[], payload);
}
