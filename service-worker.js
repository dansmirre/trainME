const CACHE_NAME = "training-log-app-v4";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=4",
  "./app.js?v=4",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).pathname.endsWith("/api.php")) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
