const CACHE = "cipher-hubs-v1";
const FILES = ["./", "./index.html", "./style.css", "./app.js", "./hubs-data.js", "./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
