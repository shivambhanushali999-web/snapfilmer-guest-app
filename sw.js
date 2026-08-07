// Minimal service worker — its ONLY job is to make Android Chrome treat this site as
// an installable app (that's a hard requirement: manifest.json + a registered service
// worker with a fetch handler). It deliberately does NOT cache index.html or any
// Firestore/API calls — this app already fights hard against stale-cache bugs after a
// redeploy (see the no-cache meta tags at the top of index.html), and a caching service
// worker would silently undo that by serving guests an old build straight from cache
// with no network request at all. Every fetch just passes straight through to the
// network, so "installed as an app" never means "served an old copy."
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request));
});
