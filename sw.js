const CACHE_NAME = 'teachingfarm-v4.3.5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  // Core JS
  '/supabase.js',
  '/auth.js',
  '/app.js',
  '/utils.js',
  // Page modules
  '/home.js',
  '/penjualan.js',
  '/gudang-pakan.js',
  '/gudang-nonpakan.js',
  '/biaya.js',
  '/laporan.js',
  '/riwayat.js',
  '/settings-page.js',
  '/master.js',
  '/kemitraan.js',
  '/grafik.js',
  '/kas.js',
  '/backup.js',
  '/standar-performa.js',
  '/pwa-update.js',
  '/input_harian.js',
  '/bw-module.js',
  // Features
  '/offline-db.js',
  '/offline-manager.js',
  '/mobile-gestures.js',
  '/mobile-forms.js',
  '/pull-to-refresh.js',
  '/realtime-manager.js',
  '/install-prompt.js',
  // Icons
  '/icon/favicon.ico',
  '/icon/icon.svg',
  '/icon/icon-96.png',
  '/icon/icon-192.png',
  '/icon/icon-512.png',
  '/icon/logo-app.png'
];

// Install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Activate — hapus SEMUA cache lama
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Handle SKIP_WAITING dari halaman
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // index.html → NETWORK FIRST (selalu fresh)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Supabase API → Network only
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"error":"offline"}', {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // JS/CSS lokal → Network first (agar update selalu terdeteksi)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // CDN → Network first, cache fallback
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Asset statis (icon, manifest) → Cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
