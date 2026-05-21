🔴 CRITICAL — Keamanan
1. Password disimpan plaintext

auth.js menyimpan dan membandingkan password tanpa hashing
Default credentials (admin/admin123, shakadigital/abrisam2554) ada di repo
2. RLS (Row Level Security) terbuka total

Semua tabel pakai USING (true) WITH CHECK (true) — artinya siapapun yang punya anon key bisa baca/hapus/edit SEMUA data termasuk tabel users
3. Supabase anon key hardcoded di supabase.js

Dikombinasi dengan RLS terbuka, siapapun bisa langsung akses API dan manipulasi data
4. Auth hanya client-side

Session di sessionStorage, role check (can()) hanya di browser — bisa di-bypass
🟠 HIGH — Arsitektur
5. app.js = 5.500+ baris

Satu file raksasa campur UI, logic, data fetching — sulit maintain
6. Tidak ada build system

Tidak ada bundler, minification, atau tree-shaking
CDN libraries (Chart.js, xlsx, jsPDF) di-load semua walau tidak dipakai
7. Tidak ada type safety / testing / linting

Tidak ada TypeScript, unit test, atau CI/CD
🟡 MEDIUM — Performance & Offline
8. Tidak ada pagination

Query fetch semua data (select=*) tanpa limit — makin lambat seiring data bertambah
9. Komputasi di client-side

Stok, saldo kas, laporan dihitung di browser dari raw data — berat kalau data ribuan record
10. Service Worker tidak cache file utama

app.js, auth.js, styles.css tidak ada di STATIC_ASSETS — first offline load bisa gagal
11. Offline support tidak lengkap

Hanya 3 tipe data (input_harian, penjualan, kas) yang bisa offline — sisanya gagal diam-diam
Tidak ada conflict resolution kalau 2 user edit data yang sama offline
🟡 MEDIUM — Database
12. Tidak ada foreign key

kandang direferensi pakai nama (TEXT) bukan ID — rename kandang = data historis rusak
kiriman_pakan.nama_pakan hanya text, bukan FK ke daftar_pakan
13. Tidak ada server-side validation

Validasi hanya di JavaScript — API Supabase terima apa saja
Prioritas Perbaikan
Urutan	Aksi	Effort
1	Fix RLS policies + hash password (atau migrasi ke Supabase Auth)	1-2 hari
2	Hapus credentials dari repo, rotate anon key	1 jam
3	Tambah pagination & server-side aggregation	2-3 hari
4	Pecah app.js jadi modul + tambah build system (Vite)	1 minggu
5	Lengkapi offline support & SW cache	2-3 hari