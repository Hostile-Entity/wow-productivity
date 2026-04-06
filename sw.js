const CACHE_NAME = 'wow-productivity-v17';

const scopeUrl = new URL(self.registration.scope);
const BASE_PATH = scopeUrl.pathname;

const ASSETS = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key === CACHE_NAME) return null;
          return caches.delete(key);
        }),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;

  if (message.type === 'GET_VERSION') {
    const replyPort = event.ports?.[0];
    if (replyPort) {
      const match = CACHE_NAME.match(/-v(\d+)/i);
      replyPort.postMessage({
        cacheName: CACHE_NAME,
        version: match ? Number(match[1]) : null,
      });
    }
    return;
  }

  if (message.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return resp;
      });
    }),
  );
});
