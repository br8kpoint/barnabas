// Barnabas service worker.
//
// Responsibilities:
//   1. Handle incoming web-push events and show a notification.
//   2. On notification click, focus an existing Barnabas tab or open one.
//   3. (Minimal install/activate lifecycle — we don't precache routes.)
//
// Payload shape (sent by src/lib/push.ts):
//   { title, body, url?, tag? }

self.addEventListener("install", (event) => {
  // Activate immediately on first install so subscribers don't have to refresh.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Barnabas", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Barnabas";
  const body = payload.body || "Today's reading is ready.";
  const tag = payload.tag || "barnabas";
  const url = payload.url || "/dashboard";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        // Same-origin match: focus and navigate.
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            await client.focus();
            client.navigate(url);
            return;
          }
        } catch {
          // ignore
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
