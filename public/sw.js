const CACHE = '__CACHE_VERSION__';
// A share into the installed app (POST, files included) waits here for the
// page to read it; see src/adapters/sharedInbox.ts. Not versioned: it must
// survive an update between the share and the page load.
const SHARED_CACHE = 'md-share-shared';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const keep = new Set([CACHE, SHARED_CACHE]);
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
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

/** Android "Share → md-share" with files: keep the share, then open the app on it. */
const receiveShare = async (request) => {
  const form = await request.formData();
  const field = (name) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };
  const files = await Promise.all(
    form
      .getAll('file')
      .filter((f) => typeof f !== 'string')
      .map(async (f) => ({ name: f.name, type: f.type, text: await f.text() })),
  );
  const payload = { title: field('title'), text: field('text'), url: field('url'), files };
  const cache = await caches.open(SHARED_CACHE);
  await cache.put(
    './shared-payload',
    new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } }),
  );
  return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(receiveShare(req));
    return;
  }
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  const isHtml = req.mode === 'navigate' || req.destination === 'document';
  event.respondWith(isHtml ? networkFirst(req) : cacheFirst(req));
});
