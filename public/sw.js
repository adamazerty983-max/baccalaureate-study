const BASE = '/baccalaureate-study';
const CACHE_NAME = 'mybac-offline-v4';

const STATIC_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/icon.svg',
  BASE + '/original_icon_512.png',
  BASE + '/manifest.json',
  BASE + '/campfire-streak.webm',
  BASE + '/campfire-streak.gif',
  BASE + '/campfire-streak-poster.png',
  BASE + '/campfire-streak-cold.webm',
  BASE + '/campfire-streak-cold.gif',
  BASE + '/campfire-streak-cold-poster.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {
      // Non-blocking: if any asset fails to cache, the SW still installs
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

/**
 * A navigation/document request whose content changes between builds.
 * The app shell (index.html) references hashed bundles, so serving a cached
 * copy pins the user to a stale build — the whole app would keep showing old
 * UI (and old bugs) until the cache happened to be refreshed.
 */
function isDocumentRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 1. App shell: network-first, so a freshly deployed build wins immediately.
  if (isDocumentRequest(event.request)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match(BASE + '/index.html'))
        )
    );
    return;
  }

  // 2. Everything else (hashed bundles, media, icons): stale-while-revalidate.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((res) => {
            if (res && res.status === 200 && res.type !== 'opaque') {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
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
  const targetUrl = data.url || `${BASE}/?tab=${targetTab}${itemId ? `&id=${encodeURIComponent(itemId)}` : ''}`;

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

self.addEventListener('push', (event) => {
  let title = 'MyBac Tracker';
  let options = {
    body: 'Rappel pour votre session de préparation au Bac',
    icon: BASE + '/original_icon_512.png',
    badge: BASE + '/original_icon_512.png',
    data: { tab: 'dashboard' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Ouvrir / فتح' }
    ]
  };

  if (event.data) {
    try {
      const json = event.data.json();
      if (json.title) title = json.title;
      if (json.body) options.body = json.body;
      if (json.data) options.data = json.data;
      if (json.requireInteraction !== undefined) options.requireInteraction = json.requireInteraction;
    } catch {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});
