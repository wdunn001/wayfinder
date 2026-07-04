/* Wayfinder service worker — offline-capable PWA.
 *
 * Strategy (deliberately deploy-safe):
 *  - App shell + vendor (js/css/html/fonts/icons): NETWORK-FIRST with cache
 *    fallback — online users always get the freshly deployed code (keeps the
 *    Cache-Control: no-cache deploy semantics), offline users get last-good.
 *  - Basemap/vector tiles (/tiles/, /martin/): network-first + cache fallback
 *    in a separate cache — previously viewed areas keep working offline.
 *  - Live data (/traffic*, /geocode/, /nominatim/, /route/): NETWORK-ONLY —
 *    stale traffic/routing is worse than none; the app already degrades.
 */
const SHELL_CACHE = "wf-shell-v21";
const TILE_CACHE = "wf-tiles-v1";
const SHELL_PRECACHE = [
  "/", "/index.html", "/app.js", "/geofence.js", "/style.css",
  "/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png",
  "/vendor/maplibre-gl.js", "/vendor/maplibre-gl.css",
  "/vendor/terra-draw.bundle.js", "/vendor/terradraw-control.css",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_PRECACHE))
      .catch(() => { /* partial precache is fine; runtime caching fills gaps */ })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const LIVE_ONLY = /^\/(traffic|traffic-flow|geocode|nominatim|route|tts|stt|llm)(\/|$)/;
const TILEISH = /^\/(tiles|martin|terrarium)\//;

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: false });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (LIVE_ONLY.test(url.pathname)) return;               // live data: straight to network
  if (TILEISH.test(url.pathname)) {
    e.respondWith(networkFirst(e.request, TILE_CACHE));   // offline map memory
    return;
  }
  e.respondWith(networkFirst(e.request, SHELL_CACHE));    // app shell
});
