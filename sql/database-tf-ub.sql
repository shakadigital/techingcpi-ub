-- ═══════════════════════════════════════════════════
-- TEACHING FARM UB - DATABASE SETUP (TABEL _tf_ub)
-- ═══════════════════════════════════════════════════
-- Jalankan di Supabase SQL Editor
-- Tabel-tabel ini TIDAK mengganggu tabel lama
-- ═══════════════════════════════════════════════════

-- ══════════════════════════════════════════════════
-- 1. USERS
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin','admin','manajer','supervisor','operator','staff','viewer')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 2. KANDANG
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kandang_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT UNIQUE NOT NULL,
  kapasitas INTEGER,
  chickin DATE,
  umur_masuk INTEGER,
  populasi INTEGER,
  harga_pullet NUMERIC DEFAULT 0,
  sistem TEXT DEFAULT 'mandiri' CHECK (sistem IN ('mandiri','kemitraan')),
  nama_inti TEXT,
  harga_kontrak NUMERIC DEFAULT 0,
  persen_mitra NUMERIC DEFAULT 30,
  persen_inti NUMERIC DEFAULT 70,
  status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif','Selesai')),
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 3. INPUT HARIAN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS input_harian_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  kandang TEXT NOT NULL,
  user_input TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tanggal, kandang)
);

-- ══════════════════════════════════════════════════
-- 4. PENJUALAN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS penjualan_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  user_input TEXT,
  rows JSONB,
  grand_total NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 5. DAFTAR PAKAN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS daftar_pakan_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT,
  nama TEXT NOT NULL,
  jenis TEXT,
  satuan TEXT DEFAULT 'kg',
  harga_satuan NUMERIC DEFAULT 0,
  stok_minimal NUMERIC DEFAULT 0,
  supplier_id UUID,
  active BOOLEAN DEFAULT true,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 6. KIRIMAN PAKAN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kiriman_pakan_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  nama_pakan TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  satuan TEXT DEFAULT 'kg',
  supplier TEXT,
  harga_per_kg NUMERIC DEFAULT 0,
  harga_total NUMERIC DEFAULT 0,
  status_bayar TEXT DEFAULT 'belum' CHECK (status_bayar IN ('belum','sebagian','lunas')),
  sisa_tagihan NUMERIC DEFAULT 0,
  keterangan TEXT,
  kandang TEXT,
  user_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 7. KAS OPERASIONAL
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kas_operasional_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('masuk','keluar')),
  kategori TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  keterangan TEXT,
  kandang TEXT,
  user_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 8. PEMBAYARAN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pembayaran_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('pakan','pullet')),
  supplier TEXT NOT NULL,
  referensi_id UUID,
  jumlah_tagihan NUMERIC NOT NULL DEFAULT 0,
  jumlah_bayar NUMERIC NOT NULL,
  sisa_tagihan NUMERIC NOT NULL DEFAULT 0,
  metode TEXT NOT NULL CHECK (metode IN ('tunai','transfer','cek','giro')),
  no_referensi TEXT,
  keterangan TEXT,
  kandang TEXT,
  user_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 9. ACTIVITY LOG
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_log_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  user_input TEXT NOT NULL,
  aksi TEXT NOT NULL,
  tabel TEXT NOT NULL,
  record_id TEXT,
  data_lama JSONB,
  data_baru JSONB,
  keterangan TEXT
);

-- ══════════════════════════════════════════════════
-- 10. MASTER SUPPLIER
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_supplier_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('pakan','vitamin','obat','vaksin','umum')),
  telepon TEXT,
  alamat TEXT,
  keterangan TEXT,
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 11. MASTER VITAMIN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_vitamin_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  supplier_id UUID,
  satuan TEXT DEFAULT 'botol',
  harga_satuan NUMERIC DEFAULT 0,
  keterangan TEXT,
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 12. MASTER OBAT
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_obat_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  supplier_id UUID,
  kategori TEXT DEFAULT 'obat',
  satuan TEXT DEFAULT 'botol',
  harga_satuan NUMERIC DEFAULT 0,
  keterangan TEXT,
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 13. MASTER VAKSIN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_vaksin_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  supplier_id UUID,
  satuan TEXT DEFAULT 'dosis',
  harga_satuan NUMERIC DEFAULT 0,
  keterangan TEXT,
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 14. MASTER PELANGGAN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_pelanggan_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  telepon TEXT,
  alamat TEXT,
  tipe TEXT DEFAULT 'retail' CHECK (tipe IN ('retail','grosir','distributor')),
  harga_khusus NUMERIC DEFAULT 0,
  keterangan TEXT,
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 15. KIRIMAN NON-PAKAN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kiriman_nonpakan_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('vitamin','obat','vaksin','desinfektan','lainnya')),
  nama_item TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  satuan TEXT DEFAULT 'botol',
  supplier TEXT,
  harga_satuan NUMERIC DEFAULT 0,
  harga_total NUMERIC DEFAULT 0,
  keterangan TEXT,
  kandang TEXT,
  user_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 16. PEMAKAIAN NON-PAKAN
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pemakaian_nonpakan_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('vitamin','obat','vaksin','desinfektan','lainnya')),
  nama_item TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  satuan TEXT DEFAULT 'botol',
  kandang TEXT,
  keterangan TEXT,
  user_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 17. APP CONFIG
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS app_config_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- 18. PENGAMBILAN INTI (KEMITRAAN)
-- ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pengambilan_inti_tf_ub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal_ambil DATE NOT NULL,
  tanggal_terakhir DATE NOT NULL,
  jumlah_hari INTEGER NOT NULL,
  total_kg NUMERIC NOT NULL,
  kandang TEXT NOT NULL,
  nama_inti TEXT,
  harga_kontrak NUMERIC DEFAULT 0,
  persen_mitra NUMERIC DEFAULT 30,
  persen_inti NUMERIC DEFAULT 70,
  detail_harian JSONB,
  user_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ══════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_tf_ub_username ON users_tf_ub(username);
CREATE INDEX IF NOT EXISTS idx_kandang_tf_ub_nama ON kandang_tf_ub(nama);
CREATE INDEX IF NOT EXISTS idx_input_tf_ub_tanggal ON input_harian_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_input_tf_ub_kandang ON input_harian_tf_ub(kandang);
CREATE INDEX IF NOT EXISTS idx_penjualan_tf_ub_tanggal ON penjualan_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_pakan_tf_ub_nama ON daftar_pakan_tf_ub(nama);
CREATE INDEX IF NOT EXISTS idx_kiriman_tf_ub_tanggal ON kiriman_pakan_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_tf_ub_tanggal ON kas_operasional_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_tf_ub_kandang ON kas_operasional_tf_ub(kandang);
CREATE INDEX IF NOT EXISTS idx_bayar_tf_ub_tanggal ON pembayaran_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_log_tf_ub_tanggal ON activity_log_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_log_tf_ub_user ON activity_log_tf_ub(user_input);
CREATE INDEX IF NOT EXISTS idx_supplier_tf_ub_kode ON master_supplier_tf_ub(kode);
CREATE INDEX IF NOT EXISTS idx_supplier_tf_ub_nama ON master_supplier_tf_ub(nama);
CREATE INDEX IF NOT EXISTS idx_vitamin_tf_ub_kode ON master_vitamin_tf_ub(kode);
CREATE INDEX IF NOT EXISTS idx_obat_tf_ub_kode ON master_obat_tf_ub(kode);
CREATE INDEX IF NOT EXISTS idx_vaksin_tf_ub_kode ON master_vaksin_tf_ub(kode);
CREATE INDEX IF NOT EXISTS idx_pelanggan_tf_ub_kode ON master_pelanggan_tf_ub(kode);
CREATE INDEX IF NOT EXISTS idx_kiriman_np_tf_ub_tanggal ON kiriman_nonpakan_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kiriman_np_tf_ub_kategori ON kiriman_nonpakan_tf_ub(kategori);
CREATE INDEX IF NOT EXISTS idx_pakai_np_tf_ub_tanggal ON pemakaian_nonpakan_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_pengambilan_tf_ub_tanggal ON pengambilan_inti_tf_ub(tanggal_ambil DESC);
CREATE INDEX IF NOT EXISTS idx_pengambilan_tf_ub_kandang ON pengambilan_inti_tf_ub(kandang);

-- ══════════════════════════════════════════════════
-- RLS POLICIES (Allow all via anon key)
-- ══════════════════════════════════════════════════
ALTER TABLE users_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandang_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE input_harian_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE daftar_pakan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiriman_pakan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_operasional_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_supplier_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_vitamin_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_obat_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_vaksin_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_pelanggan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiriman_nonpakan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE pemakaian_nonpakan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengambilan_inti_tf_ub ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_users_tf_ub" ON users_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_kandang_tf_ub" ON kandang_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_input_harian_tf_ub" ON input_harian_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_penjualan_tf_ub" ON penjualan_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_daftar_pakan_tf_ub" ON daftar_pakan_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_kiriman_pakan_tf_ub" ON kiriman_pakan_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_kas_operasional_tf_ub" ON kas_operasional_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pembayaran_tf_ub" ON pembayaran_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_activity_log_tf_ub" ON activity_log_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_master_supplier_tf_ub" ON master_supplier_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_master_vitamin_tf_ub" ON master_vitamin_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_master_obat_tf_ub" ON master_obat_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_master_vaksin_tf_ub" ON master_vaksin_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_master_pelanggan_tf_ub" ON master_pelanggan_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_kiriman_nonpakan_tf_ub" ON kiriman_nonpakan_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pemakaian_nonpakan_tf_ub" ON pemakaian_nonpakan_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_app_config_tf_ub" ON app_config_tf_ub FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pengambilan_inti_tf_ub" ON pengambilan_inti_tf_ub FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- SEED DATA
-- ══════════════════════════════════════════════════
-- ⚠️ JANGAN hardcode credentials di repo!
-- Buat user pertama via dashboard Supabase atau script terpisah yang tidak di-commit.
-- Contoh: INSERT INTO users_tf_ub (username, password, role, active) VALUES ('admin', '<GANTI_PASSWORD>', 'admin', true);

-- ══════════════════════════════════════════════════
-- DONE
-- ══════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
SELECT '✅ Semua tabel _tf_ub berhasil dibuat!' AS status;
