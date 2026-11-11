// sw.js — Lexoula service worker
// Server-rendered setup: το index.html έρχεται από τον server,
// άρα θέλουμε network-first για HTML & λεξικό, cache-first για assets.
//
// ⚠️ Σε κάθε deploy αύξησε το CACHE_VERSION (v4, v5, …)
// ή άφησε το GitHub Action να το κάνει αυτόματα.

const CACHE_VERSION = 'lexoula-v3';
const CACHE = CACHE_VERSION;

// Μόνο στατικά assets. ΟΧΙ index.html (server-rendered), ΟΧΙ API.
const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ─────────────────────────────────────────────────────────────
// INSTALL — precache στατικών + ενεργοποίηση αμέσως
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // Αν κάποιο asset λείπει, μη σκάσεις ολόκληρο το install
      Promise.all(
        PRECACHE.map(url =>
          cache.add(url).catch(err => console.warn('precache miss:', url, err))
        )
      )
    )
  );
});

// ─────────────────────────────────────────────────────────────
// ACTIVATE — καθάρισε παλιά caches, πάρε έλεγχο όλων των tabs
// ─────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE).map(k => {
            console.log('🗑️  delete old cache:', k);
            return caches.delete(k);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────
// FETCH — στρατηγική ανά τύπο request
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Μόνο GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Μόνο same-origin. CDN (jsDelivr), GA, άλλα origins → network όπως είναι.
  if (url.origin !== self.location.origin) return;

  // ── 1) API endpoints → ΠΟΤΕ cache ──
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/lexoula/')
  ) {
    return; // default network behavior
  }

  // ── 2) valid-words.txt → network-first (θέλουμε φρέσκο λεξικό) ──
  if (url.pathname.endsWith('valid-words.txt')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ── 3) HTML / navigation → network-first με offline fallback ──
  if (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request)) // offline fallback
    );
    return;
  }

  // ── 4) Λοιπά assets (icons, manifest, css, js) → cache-first + revalidate ──
  event.respondWith(
    caches.match(request).then(cached => {
      const networkPromise = fetch(request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkPromise;
    })
  );
});

// ─────────────────────────────────────────────────────────────
// MESSAGE — επιτρέπει στο frontend να ζητήσει skipWaiting
// (χρήσιμο αν θες manual update flow: postMessage({type:'SKIP_WAITING'}))
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
