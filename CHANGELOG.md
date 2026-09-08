# Changelog

Semua perubahan penting pada project **Teaching Farm CPI-UB** akan dicatat di dalam file ini.

## [4.4.0] - 2026-09-08

### Ditambahkan (Added)
- **Pemisahan Stok Telur**: Memisahkan perhitungan **Stok Kandang** (kumulatif produksi) dan **Stok Gudang** (produksi dikurangi penjualan/waste/audit).
- **RPC Stok Kandang**: Menambahkan fungsi SQL `get_stok_kandang_tf_ub` untuk menghitung stok kandang secara independen.
- Menampilkan Stok Kandang dan Stok Gudang secara terpisah di menu Penjualan Telur.

## [4.3.6] - 2026-08-23

### Ditambahkan (Added)
- **Export Excel**: Menambahkan kolom baru **"Harga DO"** pada fitur *Export Excel* di halaman Riwayat Penjualan (semua transaksi) dan Detail Riwayat per Pelanggan.

### Diperbaiki (Fixed)
- **PWA Update & Cache**: Menambahkan konfigurasi *header* `Cache-Control: no-cache, no-store, must-revalidate` khusus untuk file `index.html` di dalam `vercel.json`. Hal ini memperbaiki bug kritis di mana pembaruan versi (PWA Update) sering tersangkut (stuck) pada versi lama karena *Edge Cache* bawaan Vercel.

---

## [4.3.5] - 2026-07-16

### Diubah (Changed)
- Update logika audit stok telur (Reset Point).
- Penyesuaian antarmuka pengguna untuk fitur kas.

*(Catatan: Log versi sebelumnya dapat dilihat dari riwayat Git commit).*
