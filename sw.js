const CACHE_NAME = 'wow-productivity-v15';
const META_CACHE_NAME = 'wp-meta-cache';
const UPDATE_APPROVAL_KEY = '__manual-update-approved__';

const scopeUrl = new URL(self.registration.scope);
const BASE_PATH = scopeUrl.pathname;

const ASSETS = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
];

const updateApprovalRequest = new Request(`${BASE_PATH}${UPDATE_APPROVAL_KEY}`);

async function approveNextUpdate() {
  const cache = await caches.open(META_CACHE_NAME);
  await cache.put(updateApprovalRequest, new Response('1'));
}

async function consumeUpdateApproval() {
  const cache = await caches.open(META_CACHE_NAME);
  const approved = await cache.match(updateApprovalRequest);
  if (!approved) return false;
  await cache.delete(updateApprovalRequest);
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const isUpdateInstall = !!self.registration.active;
      if (isUpdateInstall) {
        const approved = await consumeUpdateApproval();
        if (!approved) {
          throw new Error('Update install blocked until user applies update.');
        }
      }

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
          if (key === CACHE_NAME || key === META_CACHE_NAME) return null;
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

  if (message.type === 'APPROVE_NEXT_UPDATE') {
    event.waitUntil(
      (async () => {
        await approveNextUpdate();
        const replyPort = event.ports?.[0];
        if (replyPort) {
          replyPort.postMessage({ ok: true });
        }
      })(),
    );
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
