// ============================================
// Evergreen Homeschool — Service Worker
// Caches app shell + static content for offline use
// ============================================

const CACHE_NAME = 'evergreen-v3';
const CONTENT_CACHE = 'evergreen-content-v3';

// App shell files to precache
const APP_SHELL = [
  '/',
  '/home',
  '/manifest.json',
];

// Content JSON files to precache (these are the core educational content)
const CONTENT_FILES = [
  '/_next/static', // Will be handled by pattern matching
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== CONTENT_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch strategy:
// - App shell (HTML pages): Network first, fall back to cache
// - Static assets (_next/static): Cache first (immutable, hashed filenames)
// - Content JSON: Cache first, background refresh
// - API calls (Supabase): Network only
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase API calls — always need fresh data
  if (url.hostname.includes('supabase')) return;

  // Static assets with hashed filenames: cache first (immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // JSON data files: stale-while-revalidate
  if (url.pathname.endsWith('.json') && !url.pathname.includes('manifest')) {
    event.respondWith(
      caches.open(CONTENT_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => {
            return cached; // Offline: return cached version
          });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // HTML pages: network first, fall back to cache
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/').then((fallback) => {
            return fallback || new Response('Offline — please reconnect to continue.', {
              status: 503,
              headers: { 'Content-Type': 'text/html' },
            });
          });
        });
      })
    );
    return;
  }

  // Everything else: network first, cache fallback
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
