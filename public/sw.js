const CACHE = 'md-share-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const copy = res.clone();
    const cache = await caches.open(CACHE);
    cache.put(request, copy);
  }
  return res;
};

const networkFirst = async (request) => {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const copy = res.clone();
      const cache = await caches.open(CACHE);
      cache.put(request, copy);
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match('./');
    if (shell) return shell;
    throw new Error('offline and no cached response');
  }
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isHtml = req.mode === 'navigate' || req.destination === 'document';
  event.respondWith(isHtml ? networkFirst(req) : cacheFirst(req));
});
