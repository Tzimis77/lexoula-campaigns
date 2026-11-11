// sw.js — Lexoula service worker
// Αύξησε το CACHE_VERSION σε κάθε deploy (ή αυτόματα μέσω GitHub Action)
const CACHE_VERSION = 'lexoula-v2';
const CACHE = CACHE_VERSION;

// Μόνο στατικά assets — ΟΧΙ index.html, ΟΧΙ API, ΟΧΙ CDN
const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ─── INSTALL ───
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

// ─── ACTIVATE: καθάρισε παλιά caches ───
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ───
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Μην αγγίζεις: API, CDN, GA, άλλα origins
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return; // default network behavior
  }

  // HTML / navigation → NETWORK-FIRST (παίρνει πάντα νέο index.html)
  if (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    e.respondWith(
      fetch(request)
        .then(res => {
          // Cache το νέο HTML ως fallback για offline
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request)) // offline fallback
    );
    return;
  }

  // Λοιπά assets (icons, manifest) → cache-first με background update
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
