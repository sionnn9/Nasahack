/*
 * Robust offline Service Worker for deep-space missions.
 * Caches application shell, navigation, models, and UI assets so the entire
 * system operates 100% offline without any external network access.
 */

const MODEL_CACHE = "crewsignal-voice-v2";
const SHELL_CACHE = "crewsignal-shell-v2";

const PRECACHE_SHELL = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-light-32x32.png",
  "/icon-dark-32x32.png",
  "/apple-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_SHELL).catch(() => {
        // Pre-cache individual items gracefully
        return Promise.all(
          PRECACHE_SHELL.map((url) =>
            fetch(url)
              .then((res) => (res.ok ? cache.put(url, res) : null))
              .catch(() => null),
          ),
        );
      }))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== MODEL_CACHE && key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return cached || Response.error();
  }
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

    // For navigation requests, fallback to cached root shell
    if (request.mode === "navigate") {
      const rootFallback = (await cache.match("/")) || (await cache.match("/index.html"));
      if (rootFallback) return rootFallback;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Ignore cross-origin requests (nothing leaves the ship)
  if (url.origin !== self.location.origin) return;

  // Language & Vosk voice models (Cache-First)
  if (/^\/models\/.+/.test(url.pathname)) {
    event.respondWith(cacheFirst(MODEL_CACHE, request));
    return;
  }

  // App Shell, Next.js static bundles, Navigation, and Static Assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname === "/manifest.json" ||
    request.mode === "navigate"
  ) {
    event.respondWith(networkFirst(SHELL_CACHE, request));
  }
});

/*
 * Caching IPC message handler for preloading speech models
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
