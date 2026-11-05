/**
 * Service Worker for Baccalaureate Study Hub
 * Optimized for offline-first PWA, fast fresh-code adoption, resilient navigations, and zero-leak storage.
 *
 * NOTE: The __BUILD_ID__ token below is replaced at build time with a unique identifier.
 */

const CACHE_NAME = 'mybac-offline-__BUILD_ID__';
const DYNAMIC_CACHE = 'mybac-dynamic-__BUILD_ID__';

const BASE = self.location.pathname.includes('/baccalaureate-study') ? '/baccalaureate-study' : '';

// Core app shell assets (eagerly precached on install).
// The lightweight 34KB campfire poster is included in STATIC_ASSETS so the flame visual is always instant & offline-ready.
const STATIC_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/icon.svg',
  BASE + '/app_icon.ico',
  BASE + '/original_icon_512.png',
  BASE + '/manifest.json',
  BASE + '/campfire-streak-poster.png'
];

/**
 * Tolerant installation: caches critical assets individually.
 * If any non-critical static asset fails to load, installation still completes cleanly.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const promises = STATIC_ASSETS.map((url) =>
        cache.add(url).catch((err) => {
          console.warn(`[SW] Precache skipped for ${url}:`, err);
        })
      );
      await Promise.all(promises);
    })
  );
  self.skipWaiting();
});

/**
 * Cache cleanup on activation: evict all older caches whose name does not match the active BUILD_ID.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log(`[SW] Purging outdated cache: ${key}`);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

/**
 * Check if the incoming request is an HTML / navigation request.
 */
function isDocumentRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

/**
 * Safely put a response into a cache.
 * Excludes 206 Partial Content (Cache.put throws TypeError on 206) and opaque error types.
 */
async function safeCachePut(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') {
    return;
  }
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (err) {
    console.warn(`[SW] Cache put failed for ${request.url || request}:`, err);
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept or cache HTTP Range requests (e.g. video / audio streams).
  // Cache.put cannot cache 206 Partial Content responses.
  if (event.request.headers.has('range')) {
    return;
  }

  // 1. App shell navigation: Network-first with a 3-second timeout before falling back to cached shell.
  // Handles redirects safely without returning response.redirected===true to navigation requests.
  if (isDocumentRequest(event.request)) {
    event.respondWith(
      (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const networkResponse = await fetch(event.request, {
            cache: 'no-store',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.ok) {
            // Rebuild clean response if redirected (e.g. Cloudflare Pages redirecting /index.html -> /)
            // Returning a response with .redirected===true to a navigation request can trigger network errors in some browsers.
            const responseBody = await networkResponse.blob();
            const cleanResponse = new Response(responseBody, {
              status: networkResponse.status,
              statusText: networkResponse.statusText,
              headers: networkResponse.headers,
            });

            await safeCachePut(CACHE_NAME, event.request, cleanResponse.clone());
            await safeCachePut(CACHE_NAME, BASE + '/', cleanResponse.clone());

            return cleanResponse;
          }
          throw new Error(`Navigation fetch non-ok status: ${networkResponse.status}`);
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          // Network failed or timed out: fall back to cached shell
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match(BASE + '/')) ||
            (await caches.match(BASE + '/index.html')) ||
            (await caches.match('/')) ||
            (await caches.match('/index.html'));

          if (cached) {
            return cached;
          }
          throw fetchErr;
        }
      })()
    );
    return;
  }

  // 2. JS / CSS hashed assets: Cache-first with background revalidation.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          // Revalidate in background without blocking
          fetch(event.request)
            .then((networkRes) => safeCachePut(DYNAMIC_CACHE, event.request, networkRes))
            .catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(event.request);
          await safeCachePut(DYNAMIC_CACHE, event.request, networkResponse);
          return networkResponse;
        } catch {
          return new Response('Offline - Asset unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        }
      })()
    );
    return;
  }

  // 3. Runtime assets (images, fonts, campfire media, etc.): Stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      const networkFetch = fetch(event.request)
        .then(async (networkRes) => {
          await safeCachePut(DYNAMIC_CACHE, event.request, networkRes);
          return networkRes;
        })
        .catch(() => null);

      if (cachedResponse) {
        return cachedResponse;
      }

      const res = await networkFetch;
      if (res) return res;

      // If a campfire media request fails while offline, fall back to the precached poster
      if (url.pathname.includes('campfire-streak')) {
        const poster =
          (await caches.match(BASE + '/campfire-streak-poster.png')) ||
          (await caches.match('/campfire-streak-poster.png'));
        if (poster) return poster;
      }

      return new Response('Offline - Resource unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
      });
    })()
  );
});

/**
 * Handle notification clicks: focus app window and deep-link to relevant tab + item
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetTab = data.tab || 'dashboard';
  const itemId = data.itemId;
  const targetUrl = data.url || `/?tab=${targetTab}${itemId ? `&id=${encodeURIComponent(itemId)}` : ''}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NAVIGATE_TO_NOTIFICATION',
            tab: targetTab,
            itemId: itemId,
          });
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Push event: display notification even when app is fully closed
 */
self.addEventListener('push', (event) => {
  let title = 'MyBac Tracker';
  let options = {
    body: 'Rappel pour votre session de préparation au Bac',
    icon: '/original_icon_512.png',
    badge: '/original_icon_512.png',
    data: { tab: 'dashboard' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Ouvrir / فتح' },
      { action: 'dismiss', title: 'Fermer / إغلاق' }
    ]
  };

  if (event.data) {
    try {
      const json = event.data.json();
      if (json.title) title = json.title;
      if (json.body) options.body = json.body;
      if (json.icon) options.icon = json.icon;
      if (json.badge) options.badge = json.badge;
      if (json.data) options.data = json.data;
      if (json.requireInteraction !== undefined) options.requireInteraction = json.requireInteraction;
      if (json.vibrate) options.vibrate = json.vibrate;
      if (json.actions) options.actions = json.actions;
    } catch (err) {
      console.error('Failed to parse push data:', err);
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});
