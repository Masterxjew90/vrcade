const CACHE_NAME = 'vrcade-v1';
const ASSETS_TO_CACHE = [
  './',
  './Untitled-1.html',
  './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('Cache addAll error:', err);
        // Continue even if some assets fail to cache
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external API calls for now
  if (event.request.url.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request for reuse
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then(response => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        // Cache the new request
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(err => {
        console.log('Fetch failed:', err);
        // Return offline page or cached response
        return caches.match(event.request);
      });
    })
  );
});
