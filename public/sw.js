/* Word Atlas offline cache: app shell network-first, everything else cache-first. */
const VERSION = "atlas-v1";
const SHELL = `${VERSION}-shell`;
const MEDIA = `${VERSION}-media`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => /^atlas-v\d+-(shell|media)$/.test(k) && !k.startsWith(`${VERSION}-`)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Development-only private catalogs and media must never enter public caches.
  if (url.pathname.startsWith("/local/")) return;
  const isShell = req.mode === "navigate" || url.pathname.endsWith("/index.json");
  if (isShell) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) {
            try { await (await caches.open(SHELL)).put(req, res.clone()); } catch { /* browsing can continue without cache */ }
          }
          return res;
        } catch {
          const cache = await caches.open(SHELL);
          const hit = await cache.match(req) || await cache.match(new URL("./", self.registration.scope).href);
          if (hit) return hit;
          throw new Error("offline shell unavailable");
        }
      })(),
    );
    return;
  }
  event.respondWith(
    (async () => {
      const name = /\/atlas\/(img|thumb|audio)\//.test(url.pathname) ? MEDIA : SHELL;
      const cache = await caches.open(name);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === "basic") {
        try {
          await cache.put(req, res.clone());
          if (name === MEDIA) await trim(MEDIA, 1500);
        } catch { /* browsing can continue without cache */ }
      }
      return res;
    })(),
  );
});
