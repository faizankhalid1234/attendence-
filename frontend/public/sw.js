/* Attendance Mark service worker with offline fallback + asset caching. */
const CACHE_VERSION = "attendance-mark-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const runtime = await caches.match(request);
          if (runtime) return runtime;
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        }),
    );
    return;
  }

  if (request.destination === "script" || request.destination === "style" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const copy = response.clone();
            void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      }),
    );
  }
});
