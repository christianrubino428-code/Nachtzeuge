// NACHTZEUGE Service Worker
// Cache-Strategie: Network-First für HTML/JS, Cache-First für Icons
// Version bei jedem Update erhöhen!

const CACHE_VERSION = 'nachtzeuge-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: Cache aller Core-Assets
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: alte Caches löschen
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_VERSION)
            .map(key => {
              console.log('[SW] Lösche alten Cache:', key);
              return caches.delete(key);
            })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First für App, Cache-Fallback bei Offline
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Nur GET-Requests cachen
  if (event.request.method !== 'GET') return;
  
  // Externe APIs NICHT cachen (Anthropic, Pollinations, Puter.js)
  if (url.hostname.includes('anthropic.com') || 
      url.hostname.includes('elevenlabs.io') ||
      url.hostname.includes('pexels.com') ||
      url.hostname.includes('pollinations.ai') ||
      url.hostname.includes('puter.com') ||
      url.hostname.includes('puter.site') ||
      url.hostname.includes('unpkg.com')) {
    return; // Browser handhabt es normal
  }
  
  // Für eigene Domain: Network-First mit Cache-Fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Erfolgreich geladen → cachen
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline → aus Cache laden
        return caches.match(event.request)
          .then(cached => cached || caches.match('/index.html'));
      })
  );
});

// Update-Nachricht von der App empfangen
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
