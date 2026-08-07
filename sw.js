// Minimal service worker with two jobs:
//
// 1) Make Android Chrome treat this site as an installable app (manifest.json + a
//    registered service worker with a fetch handler is a hard requirement for that).
//    It deliberately does NOT cache index.html or any Firestore/API calls — this app
//    already fights hard against stale-cache bugs after a redeploy (see the no-cache
//    meta tags at the top of index.html), and a caching service worker would silently
//    undo that by serving guests an old build straight from cache with no network
//    request at all. Every fetch just passes straight through to the network, so
//    "installed as an app" never means "served an old copy."
//
// 2) Receive real push notifications (Firebase Cloud Messaging) while this tab/app is
//    NOT open — that's the whole point of push vs. the in-app-only notification bell in
//    index.html (addNotification/onMessage there only fire while a tab is actually
//    running). This is intentionally the SAME service worker as (1), not a second
//    "firebase-messaging-sw.js" registration — two separate service workers both
//    claiming the root scope fight each other over which one actually controls the
//    page, so FCM's background handling is just merged in here instead.

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request));
});

// ---- Firebase Cloud Messaging (background push) ----
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Same config as index.html's firebaseConfig — a service worker has no access to the
// page's own JS scope, so this has to be duplicated here rather than shared.
firebase.initializeApp({
  apiKey: 'AIzaSyCwVBvQuTylTt8_3Ft650y8NHAoUj-Iw8o',
  authDomain: 'snapfilmer-ai-face-app.firebaseapp.com',
  projectId: 'snapfilmer-ai-face-app',
  storageBucket: 'snapfilmer-ai-face-app.firebasestorage.app',
  messagingSenderId: '148634541857',
  appId: '1:148634541857:web:4092d9ff8ab2aa6a262860',
});

try {
  const messaging = firebase.messaging();

  // Fires when a push arrives and no tab for this app is in the foreground — this is
  // the "phone is locked / app is closed" case that's the entire reason to build push
  // in the first place. Shows a real OS-level notification; tapping it (see the
  // notificationclick handler below) opens/focuses the right event.
  messaging.onBackgroundMessage(function (payload) {
    const n = (payload && payload.notification) || {};
    const data = (payload && payload.data) || {};
    self.registration.showNotification(n.title || 'SnapFilmer', {
      body: n.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: (payload.fcmOptions && payload.fcmOptions.link) || (data.eventId ? ('./?event=' + data.eventId) : './') },
    });
  });
} catch (err) {
  // Firebase Messaging isn't supported in this browser's service worker context (e.g.
  // some older/embedded webviews) — the rest of this file (installability + plain
  // fetch passthrough) still works fine without it.
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
