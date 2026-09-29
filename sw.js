const CACHE_NAME = "kino33-v2";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icon.ico",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

// Installation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );

  // Neue Version sofort zur Aktivierung vorbereiten
  self.skipWaiting();
});

// Aktivierung – alte Caches löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );

  // Neuer Service Worker übernimmt sofort
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  // Nur GET-Requests bearbeiten
  if (event.request.method !== "GET") return;

  const request = event.request;

  // Navigation / index.html:
  // Online immer zuerst die aktuelle Version laden.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Nur erfolgreiche Antworten speichern
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put("./index.html", responseToCache);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          // Offline → gespeicherte index.html verwenden
          return caches.match("./index.html");
        })
    );

    return;
  }

  // Alle anderen Dateien: Cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Nur erfolgreiche Antworten der eigenen Domain speichern
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            request.url.startsWith(self.location.origin)
          ) {
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          // Keine Netzwerkverbindung und kein Cache-Eintrag
          return undefined;
        });
    })
  );
});
