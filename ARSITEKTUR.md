# Arsitektur Sistem PWA & Deployment

Dokumen ini menjelaskan rancangan arsitektur dan strategi deployment aplikasi **Teaching Farm CPI-UB** (PWA).

## 1. Frontend & Progressive Web App (PWA)
Aplikasi dibangun sepenuhnya menggunakan Native HTML, CSS, dan JavaScript murni, dikombinasikan dengan teknologi PWA modern.
- **Service Worker (`sw.js`)**: Jantung dari PWA yang berfungsi sebagai *proxy* jaringan. 
- **Offline First**: Menggunakan IndexedDB untuk menyimpan data input harian ketika pengguna tidak memiliki koneksi internet, lalu menyinkronkannya ke server (`offline-manager.js` dan `offline-db.js`).

## 2. Strategi Caching
Agar aplikasi bisa merespons seketika saat dibuka sekaligus tetap mendapatkan update terbaru, sistem menggunakan kombinasi strategi:
- **Network First, Cache Fallback**: Diterapkan khusus untuk file `index.html` dan `*.js`. Aplikasi akan mencoba meminta file terbaru dari internet; jika gagal (offline), ia akan menyajikan versi lama dari cache.
- **Cache First**: Diterapkan untuk file gambar statis (logo, ikon) karena tidak pernah berubah.

## 3. Server Deployment (Vercel)
Aplikasi di-hosting pada platform Vercel. Untuk mendukung strategi PWA kita, konfigurasi `vercel.json` disesuaikan sedemikian rupa:
- **`index.html`**: Diatur dengan header `Cache-Control: no-cache, no-store, must-revalidate`. Ini merupakan langkah krusial agar **Edge Network Vercel** tidak mem-cache file utama. Dengan demikian, ketika Service Worker mengirimkan perintah `SKIP_WAITING` untuk memperbarui PWA, browser dipaksa mengambil versi yang benar-benar baru, mencegah masalah aplikasi yang *stuck* di versi lama.
- **`*.js`**: Di-set `public, max-age=0, must-revalidate` agar browser selalu memeriksa ke server apakah ada perubahan.

## 4. Mekanisme "Force Update" PWA
Ketika ada perilisan versi baru (`APP_VERSION` dinaikkan di `install-prompt.js`), sistem akan:
1. Memeriksa versi baru saat aplikasi dimuat.
2. Memunculkan notifikasi "Update Tersedia".
3. Jika tombol update ditekan, aplikasi memanggil `forceUpdatePWA()` yang akan membersihkan seluruh cache PWA lokal (`caches.delete`), meng-unregister Service Worker lama, dan me-reload halaman dari server Vercel (yang sudah dijamin memberikan file segar berkat pengaturan no-cache di `vercel.json`).

## 5. Backend (Supabase)
Backend menggunakan **Supabase** (PostgreSQL) untuk basis data utama. 
Panggilan API ke Supabase diatur sepenuhnya menjadi `Network Only` (tidak dicache oleh Service Worker) untuk memastikan keakuratan data real-time, seperti harga pasar, riwayat pelanggan, dan sisa stok ayam.
