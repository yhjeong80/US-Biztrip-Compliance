const CACHE_NAME = 'pdf-app-cache-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './your.pdf',
  './pdfjs/viewer.html',
  './pdfjs/viewer.css',
  './pdfjs/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        try {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const respClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
          }
        } catch (e) {}
        return networkResponse;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
