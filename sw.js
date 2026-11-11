// sw.js — Lexoula (server-rendered)
const CACHE_VERSION = 'lexoula-v3';
const CACHE = CACHE_VERSION;

// Μόνο στατικά — ΟΧΙ index.html (server-rendered), ΟΧΙ API
const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;  // CDN, GA κλπ → network

  // API → ποτέ cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/lexoula/')) {
    return;
  }

  // valid-words.txt → network-first (θέλουμε φρέσκο)
  if (url.pathname.endsWith('valid-words.txt')) {
    e.respondWith(
      fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // HTML / navigation → network-first
  if (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    e.respondWith(
      fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Assets → cache-first με background update
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
