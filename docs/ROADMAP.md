# TF-UB 4.0 — Roadmap & Rekomendasi

## Status Saat Ini

Aplikasi PWA manajemen peternakan ayam petelur dengan fitur:
- Input harian (deplesi, pakan, air, produksi, kesehatan, harga pasar)
- Penjualan telur (pelanggan dari master, multi-grade)
- Gudang pakan & non-pakan (konversi satuan, sumber inti/sendiri)
- Biaya operasional (kas masuk/keluar)
- Monitoring Body Weight (sampling, sebaran, histogram)
- Sistem kemitraan (bagi hasil 30:70, pengambilan inti, rekap periode)
- Laporan (rekap produksi, laba rugi, grafik, kemitraan)
- 7 level role (superadmin → viewer)
- Offline-first + Supabase sync
- Dark mode, glassmorphism, PWA installable

---

## Prioritas Tinggi

### 1. Modularisasi app.js
**Masalah:** app.js sudah 5000+ baris, sulit di-maintain.

**Solusi:** Pisahkan menjadi modul terpisah:
- `gudang.js` — semua fungsi gudang pakan & non-pakan
- `laporan.js` — render laporan, grafik, export
- `kemitraan.js` — pengambilan inti, rekap kemitraan, bagi hasil
- `penjualan.js` — form jual, stok telur, riwayat
- `biaya.js` — kas operasional, saldo
- `settings.js` — kandang, user, master data

### 2. Hapus Dual Database Mode
**Masalah:** Ada `db_local.js` (IndexedDB) dan `supabase.js` yang bisa konflik.

**Solusi:**
- Pilih satu: Supabase sebagai primary
- Gunakan IndexedDB hanya sebagai offline cache (bukan database utama)
- Hapus `DB_MODE` toggle, selalu gunakan Supabase dengan offline fallback

### 3. Stabilkan Koneksi & Error Handling
**Masalah:** Beberapa fungsi error jika `SB` tidak defined atau network gagal.

**Solusi:**
- Wrapper function untuk semua Supabase calls dengan try/catch + offline queue
- Toast notification yang jelas saat offline vs online
- Auto-retry queue saat kembali online

---

## Prioritas Sedang

### 4. Keamanan Password
**Masalah:** Password tersimpan plain text di database.

**Solusi:**
- Buat Supabase Edge Function untuk login (hash + verify)
- Atau minimal hash di client-side sebelum simpan (SHA-256)
- Jangan tampilkan password di response API

### 5. Server-side Validation
**Masalah:** Semua validasi di client — bisa di-bypass via REST API langsung.

**Solusi:**
- Buat Supabase Edge Functions untuk operasi kritis:
  - Login/auth
  - Simpan penjualan (validasi stok)
  - Hapus data (validasi role)
- Atau gunakan Postgres functions + RLS yang lebih ketat

### 6. Export & Cetak Laporan
**Masalah:** Export PDF/Excel belum optimal untuk semua laporan.

**Solusi:**
- Rekap kemitraan → export PDF yang bisa dicetak
- Laporan BW → export PDF dengan grafik
- Daily Summary → share via WhatsApp (image capture sudah ada)

---

## Prioritas Rendah

### 7. Migrasi ke Supabase Auth
**Manfaat:**
- JWT-based authentication
- RLS per user (bukan "allow all")
- Refresh token, session management
- Password hashing otomatis

**Effort:** Besar — perlu refactor auth.js dan semua fungsi login/session.

### 8. Automated Testing
**Solusi:**
- Unit test untuk fungsi kalkulasi (bagi hasil, stok, BW stats)
- Integration test untuk flow utama (input → simpan → laporan)
- Bisa pakai Playwright untuk E2E test

### 9. Performance Optimization
- Lazy load halaman yang jarang diakses
- Virtual scrolling untuk tabel besar (riwayat 1000+ rows)
- Image optimization (logo-app.png → WebP + resize)
- Code splitting jika migrasi ke build tool

### 10. Multi-Farm Support
- Saat ini 1 instance = 1 farm
- Ke depan bisa support multi-farm dengan tenant isolation
- Setiap farm punya tabel sendiri (sudah ada pattern `_tf_ub`)

---

## Struktur File Saat Ini

```
TF-UB.apk/
├── index.html          # UI utama (semua halaman)
├── styles.css          # Styling (glassmorphism, dark mode)
├── app.js              # Logic utama (5000+ baris) ⚠️
├── auth.js             # Login, session, role management
├── input_harian.js     # Form input harian
├── bw-module.js        # Monitoring Body Weight
├── supabase.js         # Database layer (Supabase REST)
├── db_local.js         # Database layer (IndexedDB) — legacy
├── offline-db.js       # Offline database helper
├── offline-manager.js  # Sync manager
├── realtime-manager.js # Polling untuk real-time updates
├── install-prompt.js   # PWA install prompt
├── mobile-gestures.js  # Swipe navigation
├── mobile-forms.js     # Mobile form enhancements
├── pull-to-refresh.js  # Pull to refresh
├── sw.js               # Service Worker
├── manifest.json       # PWA manifest
├── vercel.json         # Vercel config
├── icon/               # Icons & logo
├── .kiro/              # Kiro config (steering, MCP)
└── database-tf-ub.sql  # SQL schema
```

## Struktur File Ideal (Setelah Refactor)

```
TF-UB.apk/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── core/
│   │   ├── app.js          # Boot, navigation, home
│   │   ├── auth.js         # Login, session, roles
│   │   └── supabase.js     # Database layer
│   ├── modules/
│   │   ├── input-harian.js
│   │   ├── penjualan.js
│   │   ├── gudang.js
│   │   ├── biaya.js
│   │   ├── laporan.js
│   │   ├── kemitraan.js
│   │   ├── bw-module.js
│   │   └── settings.js
│   └── utils/
│       ├── offline-manager.js
│       ├── realtime-manager.js
│       ├── mobile-gestures.js
│       └── install-prompt.js
├── sw.js
├── manifest.json
├── icon/
└── docs/
    ├── ROADMAP.md
    └── HAK-AKSES.md
```

---

## Timeline Saran

| Fase | Durasi | Fokus |
|------|--------|-------|
| 1 | Sekarang | Deploy, stabilkan, gunakan di lapangan |
| 2 | 2-4 minggu | Fix bug dari penggunaan real, modularisasi |
| 3 | 1-2 bulan | Keamanan (hash password, edge functions) |
| 4 | 3-6 bulan | Migrasi Supabase Auth, multi-farm |
