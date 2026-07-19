/*
 * Pathfinder service worker — built for road-trip conditions (spotty cell
 * signal, dead zones). Strategy:
 *   - App shell (HTML): network-first, fall back to cache when offline.
 *   - Hashed build assets (/assets/*): cache-first (immutable filenames).
 *   - Fonts (Fontshare): stale-while-revalidate.
 *   - Map tiles (CARTO): network-first with cache fallback, capped so
 *     recently viewed map areas still render offline.
 * All trip data ships inside the JS bundle, so the itinerary, stops, notes,
 * and checklists (localStorage) work fully offline.
 */

const VERSION = "v2";
const APP_CACHE = `pathfinder-app-${VERSION}`;
const TILE_CACHE = `pathfinder-tiles-${VERSION}`;
const RUNTIME_CACHE = `pathfinder-runtime-${VERSION}`;
const KNOWN_CACHES = [APP_CACHE, TILE_CACHE, RUNTIME_CACHE];
const MAX_TILES = 400;

// The scope URL is the app's base (works at "/" or a subpath like /repo/).
const SHELL_URL = self.registration.scope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.add(SHELL_URL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && (fresh.ok || fresh.type === "opaque")) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw new Error("offline and not cached");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && (fresh.ok || fresh.type === "opaque")) {
    cache.put(request, fresh.clone());
  }
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((fresh) => {
      if (fresh && (fresh.ok || fresh.type === "opaque")) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    })
    .catch(() => undefined);
  return cached ?? (await refresh) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // App navigation (the HTML shell).
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, APP_CACHE, SHELL_URL));
    return;
  }

  // Same-origin static files.
  if (url.origin === self.location.origin) {
    if (url.pathname.includes("/assets/")) {
      // Hashed, immutable build output.
      event.respondWith(cacheFirst(request, APP_CACHE));
    } else {
      // Icons, manifest, favicon — small and rarely changing.
      event.respondWith(staleWhileRevalidate(request, APP_CACHE));
    }
    return;
  }

  // Fonts.
  if (url.hostname.endsWith("fontshare.com")) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Map tiles — keep recently seen areas usable offline.
  if (url.hostname.endsWith("basemaps.cartocdn.com")) {
    event.respondWith(
      networkFirst(request, TILE_CACHE).finally(() => {
        trimCache(TILE_CACHE, MAX_TILES);
      }),
    );
    return;
  }

  // Everything else (weather APIs, external links): straight to network.
});
