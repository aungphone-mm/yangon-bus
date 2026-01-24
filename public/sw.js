// Service Worker for Yangon Bus PWA
// Update this version number on each deployment to bust cache
const CACHE_VERSION = 'v2';
const CACHE_NAME = `yangon-bus-${CACHE_VERSION}`;

// Static data files - use cache-first (rarely change)
const STATIC_CACHE_URLS = [
  '/data/stop_lookup.json',
  '/data/planner_graph.json'
];

// Install event - cache static data files only
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing new version', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static data files');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up ALL old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating new version', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that a new version is active
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// Fetch event - different strategies for different content
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For static data files - use cache-first
  if (STATIC_CACHE_URLS.some(staticUrl => url.pathname.endsWith(staticUrl.replace('/', '')))) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // For everything else (HTML, JS, CSS) - use network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Got network response, return it (always fresh)
        return response;
      })
      .catch(() => {
        // Network failed, try cache as fallback for offline support
        return caches.match(event.request);
      })
  );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
