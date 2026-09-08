# Blueprint Upgrade Aplikasi Teaching Farm (v5.0)

Dokumen ini berisi saran strategis dan cetak biru (*blueprint*) untuk membangun ulang struktur database dan aplikasi agar **tahan banting (scalable)** dalam menangani ratusan ribu baris data selama bertahun-tahun ke depan.

## 1. Normalisasi Skema Database (Pemisahan Tabel)
Tinggalkan kebiasaan menyimpan detail transaksi di dalam format JSON Array (`rows`). Menggantinya dengan skema tabel relasional murni akan membuat proses perhitungan (agregasi) dilakukan secepat kilat oleh server *database*, tanpa membebani perangkat (*browser*) pengguna.

### A. Tabel `transaksi` (Header)
Fungsinya sebagai "kepala nota" yang mencatat *kapan* dan *siapa* yang melakukan aktivitas.
- `id` (UUID, Primary Key)
- `tanggal_transaksi` (Date)
- `tipe` (Enum: *'PENJUALAN', 'WASTE', 'AUDIT'* )
- `id_pelanggan` (Foreign Key / Null jika tipenya Waste/Audit)
- `created_by` (Siapa yang menginput)
- `created_at` (Waktu simpan aktual)

### B. Tabel `detail_transaksi` (Isi Nota)
Tabel ini terhubung ke tabel `transaksi`. Jika satu nota berisi 3 jenis grade telur (Normal, Crem, Bentes), maka tabel ini diisi 3 baris.
- `id` (UUID, Primary Key)
- `id_transaksi` (Foreign Key ke tabel `transaksi`)
- `grade_telur` ('Normal', 'Crem', dll)
- `jumlah_butir` (Integer)
- `berat_kg` (Decimal)
- `harga_jual_kg` (Decimal)
- `subtotal` (Decimal)
- `keterangan` (Text)

> **💡 Keuntungan Besar:** Jika manajemen meminta laporan khusus (misal: persentase telur bentes yang di-waste selama setahun), Anda tinggal menjalankan satu baris Query SQL yang sangat ringan dan hasilnya instan keluar dalam hitungan milidetik.

## 2. Pindahkan Beban Pemrosesan ke Server (*Server-Side Processing*)
Saat ini, aplikasi menarik **semua data** ke browser pengguna (Javascript), lalu browser dipaksa sibuk menjumlahkan per bulan dan per tanggal untuk membuat tabel Akordeon. Ini akan memakan RAM HP pengguna dan membuat aplikasi lambat (lag) di masa depan.

- **Gunakan *View* atau *RPC* di Supabase:** Buat fungsi agregasi (seperti `vw_rekap_bulanan` atau `get_rekap_bulanan`) di dalam Supabase (PostgreSQL).
- Saat halaman Riwayat dibuka, browser hanya meminta data matang: *"Beri saya total penjualan bulan September"*. Database memprosesnya di server dan hanya mengirimkan 1 baris jawaban saja ke browser.

## 3. Terapkan Paginasi (*Pagination*)
Hindari pemanggilan data tanpa batas (`limit = 9999`). 
- Tarik data seperlunya (misal: `limit = 50`).
- Saat pengguna melakukan *scroll* sampai akhir tabel, tarik 50 data selanjutnya (*Infinite Scroll*), atau gunakan tombol *"Halaman Selanjutnya"*.
- Serahkan fitur *filter* tanggal sepenuhnya kepada kueri Supabase (misal: pencarian `>= tanggal_awal` dan `<= tanggal_akhir`), jangan me-load semua lalu difilter menggunakan Javascript.

## 4. Pecah File Kode (*Modularization*)
File `penjualan.js` saat ini sangat besar (hampir 2.000 baris) karena mencampur urusan logika, tampilan (UI), dan interaksi *database*. Jika dibiarkan, ini berpotensi menjadi *Spaghetti Code*.

Pecah menjadi beberapa file kecil berdasarkan tugasnya, contohnya:
- `api.js` 👉 Khusus untuk jalur komunikasi (fetch/insert/delete) ke Supabase.
- `ui_components.js` 👉 Khusus fungsi perenderan tabel dan HTML UI.
- `transaksi-jual.js` 👉 Khusus logika input form penjualan harian.
- `riwayat.js` 👉 Khusus logika filter dan tabel Riwayat Jual / Waste.
- `waste.js` 👉 Khusus logika input Waste.

**Keuntungan:** Jika ke depan ada *error* pada fitur Waste, Anda hanya perlu membuka `waste.js` tanpa khawatir kode `transaksi-jual.js` tidak sengaja terganggu.

## 5. Lapisan Keamanan (Row Level Security / RLS)
Karena aplikasi ini berbasis murni *Frontend* (langsung menembak ke Database tanpa melalui Backend perantara), siapapun yang mengerti IT dan menggunakan Inspect Element (F12) dapat melihat URL dan Key Supabase.
- **Wajib aktifkan RLS di Supabase:** Buat *policy* mutlak di level Supabase, misalnya *"Hanya user dengan role Superadmin yang berhak menjalankan operasi DELETE"*. 
- Dengan demikian, sekeras apapun *hacker* iseng membajak permintaan dari browser, *database server* akan otomatis memblokir instruksi ilegal tersebut.

---

**Saran Pelaksanaan:**
Perombakan ini (Upgrade ke v5.0) tidak perlu dilakukan secara mendadak. Biarkan versi saat ini berjalan sambil Anda mengamati *flow* bisnis pengguna secara nyata di lapangan selama 1-2 bulan ke depan. Setelah *flow*-nya terbukti solid, barulah proses migrasi struktur database ini dikerjakan.
