// MindMitra service worker — handles browser push notifications for SOS alerts.
//
// Registered from src/utils/registerServiceWorker.ts. Two responsibilities:
//   1. Listen for `push` events from a push server (real webpush integration).
//   2. Listen for `notificationclick` events so clicking a notification focuses
//      the already-open app or opens a new one.
//
// Per the issue's acceptance criteria — "Notification works in background" —
// this service worker must be the one that surfaces the visible OS-level
// notification when the page is hidden, not the foreground `Notification`
// API. We still allow direct `self.registration.showNotification(...)` from
// the page when the page IS in the foreground (handled in notification API).

self.addEventListener('install', (event) => {
  // Activate the new worker immediately on first install.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of any open clients right away.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { title: 'MindMitra', body: event.data.text() };
  }

  const title = payload.title || 'MindMitra SOS';
  const options = {
    body: payload.body || 'A new MindMitra alert was received.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    // `tag` collapses multiple identical alerts into a single UI element so
    // we don't spam the user when several subscribers' devices all fire.
    tag: payload.tag || 'mindmitra-sos-alert',
    requireInteraction: payload.requireInteraction ?? true,
    renotify: !!payload.renotify,
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data || {},
    actions: payload.actions || [
      { action: 'view', title: 'Open MindMitra' },
      { action: 'dismiss', title: "I'm safe — dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/sos';

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
