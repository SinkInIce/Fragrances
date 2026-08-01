/* Scent Log service worker — offline shell + font caching.
   Bump CACHE when shell files change so old copies are cleared. */
const CACHE = 'scent-log-v4';
const FONTS = 'scent-log-fonts-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Google Fonts are immutable — serve from cache once seen. */
async function fontFirst(request) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

/* Navigations go to the network first so a redeploy is picked up,
   falling back to the cached shell when offline. */
async function navigateNetworkFirst(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put('./index.html', res.clone());
    return res;
  } catch (err) {
    const cached = await caches.match('./index.html');
    return cached || await caches.match('./');
  }
}

/* The synced log is live data — never serve a stale copy while online.
   Cached under a fixed key so the cache-buster query still matches offline. */
const DATA_KEY = './data/scent-log.json';
async function dataNetworkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(DATA_KEY, res.clone());
    }
    return res;
  } catch (err) {
    const hit = await caches.match(DATA_KEY);
    return hit || Response.error();
  }
}

async function assetCacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, res.clone());
  }
  return res;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(fontFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigateNetworkFirst(request));
    return;
  }
  if (url.pathname.endsWith('/data/scent-log.json')) {
    event.respondWith(dataNetworkFirst(request));
    return;
  }
  event.respondWith(assetCacheFirst(request));
});
