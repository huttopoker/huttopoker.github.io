// Hutto Showdown — service worker
//
// Scope is deliberately narrow: this app tracks real money, so it must never serve
// stale game/payment data. This worker ONLY caches the static app shell (this page,
// icons, manifest) for offline load and installability. Every request that isn't a
// same-origin navigation/asset — most importantly every Supabase API call — is left
// completely untouched and goes straight to the network, uncached.

const CACHE_NAME = 'showdown-shell-v1';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only ever handle same-origin GET requests for the app shell itself.
  // Anything else (Supabase, fonts, analytics, POST/PATCH/DELETE, etc.) is
  // left alone entirely — no respondWith() means the browser handles it normally.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const isShellRequest = SHELL_ASSETS.includes(url.pathname) || url.pathname === '/';
  if (!isShellRequest) return;

  // Network-first: always prefer the freshest deployed app shell, fall back to the
  // last cached copy only when offline, so updates are picked up on the next load
  // instead of being stuck on a stale cached version.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
