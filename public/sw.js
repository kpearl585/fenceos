const CACHE = "fep-v2";
const OFFLINE_URL = "/offline";

const PRECACHE = [
  "/",
  "/dashboard",
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Skip non-same-origin and Supabase API calls
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Never cache authenticated dashboard pages — they are server-rendered with plan/auth checks
  const neverCache = url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/onboarding");

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Only cache static/public pages, never authenticated routes
        if (res.ok && e.request.mode === "navigate" && !neverCache) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});
