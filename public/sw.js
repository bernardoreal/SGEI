// sw.js
const CACHE_NAME = 'sgei-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard/supervisor',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return from cache
        }
        return fetch(event.request).catch(() => {
          // Fallback mechanism
          return new Response('Offline mode: You are not connected to the network.');
        });
      }
    )
  );
});
