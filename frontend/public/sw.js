/*
 * Minimal offline support for the emergency voice assistant.
 *
 * Only two things are cached: language model archives (cache-first, so the
 * assistant works in airplane mode) and the app shell needed to reload the
 * page offline. Anything else is left to the network.
 */

const MODEL_CACHE = "crewsignal-voice-v1";
const SHELL_CACHE = "crewsignal-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (/^\/models\/.+\.tar\.gz$/.test(url.pathname)) {
    event.respondWith(cacheFirst(MODEL_CACHE, request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    request.mode === "navigate"
  ) {
    event.respondWith(networkFirst(SHELL_CACHE, request));
  }
});

/*
 * The page asks for a model to be cached and only shows "Voice ready offline"
 * after this replies with ok: true, so readiness is never claimed early.
 */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_MODEL" || typeof data.url !== "string") {
    return;
  }
  const port = event.ports && event.ports[0];
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(MODEL_CACHE);
        const existing = await cache.match(data.url);
        if (!existing) {
          const response = await fetch(data.url);
          if (!response.ok) throw new Error("Model fetch failed");
          await cache.put(data.url, response.clone());
        }
        const confirmed = await cache.match(data.url);
        port && port.postMessage({ ok: Boolean(confirmed) });
      } catch (error) {
        port && port.postMessage({ ok: false });
      }
    })(),
  );
});
