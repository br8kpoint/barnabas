"use client";

import { useEffect, useState, useTransition } from "react";
import {
  savePushSubscription,
  deletePushSubscription,
  sendTestPush,
} from "@/app/push-actions";

// Convert the VAPID public key (base64url) into the Uint8Array
// applicationServerKey expects.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status =
  | "checking"
  | "unsupported"
  | "permission-denied"
  | "needs-install" // iOS, not yet standalone PWA
  | "subscribed"
  | "not-subscribed";

export function PushSetup() {
  const [status, setStatus] = useState<Status>("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Detect iOS-installed-as-PWA. iOS only supports web push when installed.
  const isIos = /iPad|iPhone|iPod/.test(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
  );
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setStatus("unsupported");
        return;
      }
      if (isIos && !isStandalone) {
        setStatus("needs-install");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setEndpoint(existing.endpoint);
          setStatus("subscribed");
        } else if (Notification.permission === "denied") {
          setStatus("permission-denied");
        } else {
          setStatus("not-subscribed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("not-subscribed");
      }
    })();
  }, [isIos, isStandalone]);

  async function subscribe() {
    setError(null);
    setMessage(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("permission-denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("VAPID public key is not configured");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await savePushSubscription(json, navigator.userAgent);
      setEndpoint(json.endpoint);
      setStatus("subscribed");
      setMessage("App push notifications enabled on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function unsubscribe() {
    setError(null);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const ep = sub.endpoint;
        await sub.unsubscribe();
        await deletePushSubscription(ep);
      }
      setEndpoint(null);
      setStatus("not-subscribed");
      setMessage("App push notifications disabled on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function test() {
    setError(null);
    setMessage(null);
    start(async () => {
      try {
        await sendTestPush();
        setMessage("Test push sent. Look for a notification.");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5">
      <h2 className="font-semibold">App push notifications</h2>
      <p className="mt-1 text-sm text-ink/60">
        Get the daily nudge as an app notification instead of (or in addition to) email.
        Each device you sign in on can be enabled separately.
      </p>

      <div className="mt-4">
        {status === "checking" && <p className="text-sm text-ink/50">Checking…</p>}

        {status === "unsupported" && (
          <p className="text-sm text-behind">
            This browser doesn&rsquo;t support app push notifications.
          </p>
        )}

        {status === "needs-install" && (
          <div className="space-y-2 text-sm">
            <p className="text-ink/80">
              On iOS, app push notifications require Barnabas to be added to your Home Screen first.
            </p>
            <ol className="ml-4 list-decimal space-y-1 text-ink/70">
              <li>Tap the Share button in Safari</li>
              <li>Choose &ldquo;Add to Home Screen&rdquo;</li>
              <li>Open Barnabas from the Home Screen icon</li>
              <li>Come back to Settings and tap Enable push</li>
            </ol>
          </div>
        )}

        {status === "permission-denied" && (
          <p className="text-sm text-behind">
            App notifications are blocked. Re-enable them in your site settings,
            then refresh this page.
          </p>
        )}

        {status === "not-subscribed" && (
          <button
            onClick={subscribe}
            className="rounded-md bg-accent px-4 py-2 text-parchment"
          >
            Enable app push on this device
          </button>
        )}

        {status === "subscribed" && (
          <div className="space-y-3">
            <p className="text-sm text-ontrack">App push is enabled on this device.</p>
            {endpoint && (
              <p className="break-all text-xs text-ink/40">{endpoint.slice(0, 80)}…</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={test}
                disabled={pending}
                className="rounded-md border border-accent px-3 py-1.5 text-sm text-accent disabled:opacity-40"
              >
                {pending ? "Sending…" : "Send test push"}
              </button>
              <button
                onClick={unsubscribe}
                className="rounded-md border border-ink/15 px-3 py-1.5 text-sm text-ink/70 hover:border-behind hover:text-behind"
              >
                Disable on this device
              </button>
            </div>
          </div>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-ontrack">{message}</p>}
      {error && <p className="mt-3 text-sm text-behind">{error}</p>}
    </section>
  );
}
