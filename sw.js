// Kill-switch: this app does not use a service worker. This file exists only so that
// any browser with a previously-installed worker fetches this on its next update check,
// immediately unregisters itself, and clears its caches instead of continuing to serve
// a stale cached copy of the app.
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) { return Promise.all(keys.map(function(k) { return caches.delete(k); })); })
      .then(function() { return self.registration.unregister(); })
      .then(function() { return self.clients.matchAll(); })
      .then(function(clients) { clients.forEach(function(c) { c.navigate(c.url); }); })
  );
});
