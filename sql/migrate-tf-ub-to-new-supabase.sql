-- ============================================================
-- MIGRATION SCRIPT: Tabel *_tf_ub ke Supabase Baru
-- Generated: 2026-05-18
-- CATATAN: Jalankan script ini di SQL Editor Supabase project baru
-- ============================================================

-- ============================================================
-- PART 1: CREATE TABLES (DDL)
-- ============================================================

-- 1. users_tf_ub
CREATE TABLE IF NOT EXISTS users_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['superadmin','admin','manajer','supervisor','operator','staff','viewer'])),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. kandang_tf_ub
CREATE TABLE IF NOT EXISTS kandang_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text UNIQUE NOT NULL,
  kapasitas integer,
  chickin date,
  umur_masuk integer,
  populasi integer,
  harga_pullet numeric DEFAULT 0,
  sistem text DEFAULT 'mandiri' CHECK (sistem = ANY (ARRAY['mandiri','kemitraan'])),
  nama_inti text,
  harga_kontrak numeric DEFAULT 0,
  persen_mitra numeric DEFAULT 30,
  persen_inti numeric DEFAULT 70,
  status text DEFAULT 'Aktif' CHECK (status = ANY (ARRAY['Aktif','Selesai'])),
  keterangan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. input_harian_tf_ub
CREATE TABLE IF NOT EXISTS input_harian_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  kandang text NOT NULL,
  user_input text,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. penjualan_tf_ub
CREATE TABLE IF NOT EXISTS penjualan_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  user_input text,
  rows jsonb,
  grand_total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. daftar_pakan_tf_ub
CREATE TABLE IF NOT EXISTS daftar_pakan_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text,
  nama text NOT NULL,
  jenis text,
  satuan text DEFAULT 'kg',
  harga_satuan numeric DEFAULT 0,
  stok_minimal numeric DEFAULT 0,
  supplier_id uuid,
  active boolean DEFAULT true,
  keterangan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. kiriman_pakan_tf_ub
CREATE TABLE IF NOT EXISTS kiriman_pakan_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  nama_pakan text NOT NULL,
  jumlah numeric NOT NULL,
  satuan text DEFAULT 'kg',
  supplier text,
  harga_per_kg numeric DEFAULT 0,
  harga_total numeric DEFAULT 0,
  status_bayar text DEFAULT 'belum' CHECK (status_bayar = ANY (ARRAY['belum','sebagian','lunas'])),
  sisa_tagihan numeric DEFAULT 0,
  keterangan text,
  kandang text,
  user_input text,
  created_at timestamptz DEFAULT now(),
  sumber text DEFAULT 'inti' CHECK (sumber = ANY (ARRAY['inti','sendiri']))
);

-- 7. kas_operasional_tf_ub
CREATE TABLE IF NOT EXISTS kas_operasional_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  jenis text NOT NULL CHECK (jenis = ANY (ARRAY['masuk','keluar'])),
  kategori text NOT NULL,
  jumlah numeric NOT NULL,
  keterangan text,
  kandang text,
  user_input text,
  created_at timestamptz DEFAULT now()
);

-- 8. pembayaran_tf_ub
CREATE TABLE IF NOT EXISTS pembayaran_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  jenis text NOT NULL CHECK (jenis = ANY (ARRAY['pakan','pullet'])),
  supplier text NOT NULL,
  referensi_id uuid,
  jumlah_tagihan numeric DEFAULT 0,
  jumlah_bayar numeric NOT NULL,
  sisa_tagihan numeric DEFAULT 0,
  metode text NOT NULL CHECK (metode = ANY (ARRAY['tunai','transfer','cek','giro'])),
  no_referensi text,
  keterangan text,
  kandang text,
  user_input text,
  created_at timestamptz DEFAULT now()
);

-- 9. master_supplier_tf_ub
CREATE TABLE IF NOT EXISTS master_supplier_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  kategori text NOT NULL CHECK (kategori = ANY (ARRAY['pakan','vitamin','obat','vaksin','umum'])),
  telepon text,
  alamat text,
  keterangan text,
  active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. master_vitamin_tf_ub
CREATE TABLE IF NOT EXISTS master_vitamin_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  supplier_id uuid,
  satuan text DEFAULT 'botol',
  harga_satuan numeric DEFAULT 0,
  keterangan text,
  active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  isi_per_satuan numeric DEFAULT 1,
  base_unit text DEFAULT 'ml'
);

-- 11. master_obat_tf_ub
CREATE TABLE IF NOT EXISTS master_obat_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  supplier_id uuid,
  kategori text DEFAULT 'obat',
  satuan text DEFAULT 'botol',
  harga_satuan numeric DEFAULT 0,
  keterangan text,
  active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  isi_per_satuan numeric DEFAULT 1,
  base_unit text DEFAULT 'ml'
);

-- 12. master_vaksin_tf_ub
CREATE TABLE IF NOT EXISTS master_vaksin_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  supplier_id uuid,
  satuan text DEFAULT 'dosis',
  harga_satuan numeric DEFAULT 0,
  keterangan text,
  active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  isi_per_satuan numeric DEFAULT 1,
  base_unit text DEFAULT 'dosis'
);

-- 13. master_pelanggan_tf_ub
CREATE TABLE IF NOT EXISTS master_pelanggan_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  telepon text,
  alamat text,
  tipe text DEFAULT 'retail' CHECK (tipe = ANY (ARRAY['retail','grosir','distributor'])),
  harga_khusus numeric DEFAULT 0,
  keterangan text,
  active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 14. kiriman_nonpakan_tf_ub
CREATE TABLE IF NOT EXISTS kiriman_nonpakan_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  kategori text NOT NULL CHECK (kategori = ANY (ARRAY['vitamin','obat','vaksin','desinfektan','lainnya'])),
  nama_item text NOT NULL,
  jumlah numeric NOT NULL,
  satuan text DEFAULT 'botol',
  supplier text,
  harga_satuan numeric DEFAULT 0,
  harga_total numeric DEFAULT 0,
  keterangan text,
  kandang text,
  user_input text,
  created_at timestamptz DEFAULT now(),
  sumber text DEFAULT 'inti' CHECK (sumber = ANY (ARRAY['inti','sendiri']))
);

-- 15. pemakaian_nonpakan_tf_ub
CREATE TABLE IF NOT EXISTS pemakaian_nonpakan_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  kategori text NOT NULL CHECK (kategori = ANY (ARRAY['vitamin','obat','vaksin','desinfektan','lainnya'])),
  nama_item text NOT NULL,
  jumlah numeric NOT NULL,
  satuan text DEFAULT 'botol',
  kandang text,
  keterangan text,
  user_input text,
  created_at timestamptz DEFAULT now()
);

-- 16. app_config_tf_ub
CREATE TABLE IF NOT EXISTS app_config_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 17. activity_log_tf_ub
CREATE TABLE IF NOT EXISTS activity_log_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal timestamptz DEFAULT now(),
  user_input text NOT NULL,
  aksi text NOT NULL,
  tabel text NOT NULL,
  record_id text,
  data_lama jsonb,
  data_baru jsonb,
  keterangan text
);

-- 18. pengambilan_inti_tf_ub
CREATE TABLE IF NOT EXISTS pengambilan_inti_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal_ambil date NOT NULL,
  tanggal_terakhir date NOT NULL,
  jumlah_hari integer NOT NULL,
  total_kg numeric NOT NULL,
  kandang text NOT NULL,
  nama_inti text,
  harga_kontrak numeric DEFAULT 0,
  persen_mitra numeric DEFAULT 30,
  persen_inti numeric DEFAULT 70,
  detail_harian jsonb,
  user_input text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 19. sessions_bw_tf_ub
CREATE TABLE IF NOT EXISTS sessions_bw_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kandang text NOT NULL,
  umur_mg integer NOT NULL,
  jumlah_sample integer DEFAULT 30,
  rata_rata numeric DEFAULT 0,
  uniformity numeric DEFAULT 0,
  cv numeric DEFAULT 0,
  standar_bw numeric DEFAULT 0,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- 20. timbang_tf_ub (FK ke sessions_bw_tf_ub)
CREATE TABLE IF NOT EXISTS timbang_tf_ub (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions_bw_tf_ub(id),
  nomor integer NOT NULL,
  berat integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 2: ENABLE RLS
-- ============================================================
ALTER TABLE users_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE kandang_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE input_harian_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE daftar_pakan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiriman_pakan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_operasional_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_supplier_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_vitamin_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_obat_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_vaksin_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_pelanggan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiriman_nonpakan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE pemakaian_nonpakan_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengambilan_inti_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_bw_tf_ub ENABLE ROW LEVEL SECURITY;
ALTER TABLE timbang_tf_ub ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: RLS POLICIES (Allow all for service_role, anon read)
-- ============================================================
-- Buat policy sederhana: allow all untuk authenticated & service_role
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'users_tf_ub','kandang_tf_ub','input_harian_tf_ub','penjualan_tf_ub',
    'daftar_pakan_tf_ub','kiriman_pakan_tf_ub','kas_operasional_tf_ub',
    'pembayaran_tf_ub','master_supplier_tf_ub','master_vitamin_tf_ub',
    'master_obat_tf_ub','master_vaksin_tf_ub','master_pelanggan_tf_ub',
    'kiriman_nonpakan_tf_ub','pemakaian_nonpakan_tf_ub','app_config_tf_ub',
    'activity_log_tf_ub','pengambilan_inti_tf_ub','sessions_bw_tf_ub','timbang_tf_ub'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;


-- ============================================================
-- PART 4: INSERT DATA
-- ============================================================

-- users_tf_ub (7 rows)
INSERT INTO users_tf_ub (id, username, password, role, active, created_at, updated_at) VALUES
('7b287aa2-b898-49dc-9624-f9345693a134', 'admin', 'admin123', 'admin', true, '2026-05-16T04:38:12.755025+00:00', '2026-05-16T04:38:12.755025+00:00'),
('9ceade26-a633-4bba-bc9d-42a47b629743', 'shakadigital', 'abrisam2554', 'superadmin', true, '2026-05-16T04:38:12.755025+00:00', '2026-05-16T04:38:12.755025+00:00'),
('e9a648bf-feb9-4b28-8f17-45cae0d457e5', 'Frita', 'teachingfarm2026', 'manajer', true, '2026-04-20T08:38:15.79608+00:00', '2026-04-20T08:38:15.79608+00:00'),
('2dac5668-2da6-4346-8457-368d7decaef8', 'Saiful', 'sa2345', 'supervisor', true, '2026-04-20T08:38:54.222407+00:00', '2026-04-20T08:38:54.222407+00:00'),
('edfae8b5-7861-40db-9653-3527fb64f561', 'Afin', 'af2345', 'operator', true, '2026-04-20T08:39:15.820226+00:00', '2026-04-20T08:39:15.820226+00:00'),
('2638a631-4abd-4dfb-91d2-19baaa83a60c', 'teachingub', 'ta2026', 'staff', true, '2026-04-20T08:40:03.959394+00:00', '2026-04-20T08:40:03.959394+00:00'),
('ea4c6330-8a44-4995-9629-945147a64632', 'Dian_Riki', '123456', 'viewer', true, '2026-05-02T00:56:25.053631+00:00', '2026-05-02T00:56:25.053631+00:00');

-- kandang_tf_ub (1 row)
INSERT INTO kandang_tf_ub (id, nama, kapasitas, chickin, umur_masuk, populasi, harga_pullet, sistem, nama_inti, harga_kontrak, persen_mitra, persen_inti, status, keterangan, created_at, updated_at) VALUES
('5cb47e81-f362-4400-81d0-054224fe13d0', 'TF 1', 5120, '2026-01-19', NULL, 5120, 82000, 'kemitraan', 'Muria Puji Sejahtera', 22000, 30, 70, 'Aktif', NULL, '2026-04-20T08:35:12.542896+00:00', '2026-04-20T08:35:12.542896+00:00');

-- master_supplier_tf_ub (8 rows)
INSERT INTO master_supplier_tf_ub (id, kode, nama, kategori, telepon, alamat, keterangan, active, created_by, created_at, updated_at) VALUES
('bf6c56af-2c11-43c9-bd8e-e5b05d951d62', 'SUP-001', 'PT Charoen Pokphand', 'umum', NULL, NULL, 'Supplier pakan utama', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00'),
('f271fcb7-8daa-422e-b4ec-92244207ce7b', 'SUP-002', 'PT SHS', 'umum', NULL, NULL, 'Supplier vaksin & obat', false, 'Frita', '2026-04-24T01:33:08.335726+00:00', '2026-04-24T03:16:28.62+00:00'),
('720cf053-cde9-4f12-a344-9ffd270a7d46', 'SUP-008', 'BMU', 'umum', NULL, NULL, NULL, false, 'Frita', '2026-04-24T01:51:55.73+00:00', '2026-04-24T03:16:33.318+00:00'),
('fecd6c54-f487-40c1-86d3-799422626548', 'SUP-009', 'PT SHS 1', 'umum', NULL, NULL, NULL, true, 'Frita', '2026-04-24T03:16:49.367+00:00', '2026-04-24T03:16:49.648162+00:00'),
('3db104ed-f34f-4fb8-94c9-b2036e7007fe', 'SUP-010', 'PT SHS 2', 'umum', NULL, NULL, NULL, true, 'Frita', '2026-04-24T03:17:00.089+00:00', '2026-04-24T03:17:00.304399+00:00'),
('21040f13-5837-4302-9d25-4523e56bceeb', 'SUP-011', 'Muria PS (Mbak Nur)', 'umum', '081331261496', 'Kebonagung, Malang', NULL, true, 'Frita', '2026-04-24T03:19:18.524+00:00', '2026-04-24T03:19:41.34+00:00'),
('dde41545-f7c0-476b-b9e0-ca8d143281ef', 'SUP-012', 'Muria PS (Mbak Zulfa)', 'umum', '087754125279', 'Bakalan, Bululawang-Malang', NULL, true, 'Frita', '2026-04-24T03:21:17.539+00:00', '2026-04-24T03:21:17.777022+00:00'),
('25a2dc52-1be1-4ca4-9f2a-737d4a657603', 'SUP-005', 'PT IMA', 'umum', '082140342234', 'Surabaya', 'Supplier lokal', true, 'Frita', '2026-04-24T01:33:08.335726+00:00', '2026-04-24T03:16:31.124+00:00');

-- daftar_pakan_tf_ub (2 rows)
INSERT INTO daftar_pakan_tf_ub (id, kode, nama, jenis, satuan, harga_satuan, stok_minimal, supplier_id, active, keterangan, created_at, updated_at) VALUES
('f09a1095-fa40-414a-a1c1-0d8e3151a256', 'PKN-F09A10', 'CP522', NULL, 'kg', NULL, 100, NULL, true, NULL, '2026-04-20T08:48:37.448846+00:00', '2026-04-20T08:48:37.448846+00:00'),
('2d6e7511-83f5-4b2c-887b-62594b2018bf', NULL, '324-AT', NULL, 'kg', NULL, 400, NULL, true, NULL, '2026-05-04T15:23:08.161876+00:00', '2026-05-04T15:23:08.161876+00:00');

-- master_vitamin_tf_ub (6 rows)
INSERT INTO master_vitamin_tf_ub (id, kode, nama, supplier_id, satuan, harga_satuan, keterangan, active, created_by, created_at, updated_at, isi_per_satuan, base_unit) VALUES
('953c5b76-7f3f-4a57-be4d-3dcf53fab030', 'VIT-004', 'Elektrolit Plus', NULL, 'sachet', 0, 'Elektrolit untuk ayam', false, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T03:28:28.984+00:00', 1, 'ml'),
('fcdf2314-015d-47e8-9e00-32c29fa52483', 'VIT-003', 'Vita Stress', NULL, 'sachet', 0, 'Vitamin anti stress', false, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T03:28:31.663+00:00', 1, 'ml'),
('46014aa0-6d28-42c0-81e2-bff5800ddf8a', 'VIT-002', 'Fortevit', NULL, 'botol', 0, 'Vitamin multivitamin layer', false, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T03:28:34.444+00:00', 1, 'ml'),
('afdd68bb-8e41-44d9-929b-affff2d14dc8', 'VIT-001', 'Vitachick', NULL, 'sachet', 0, 'Vitamin untuk DOC', false, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T03:28:36.886+00:00', 1, 'ml'),
('2595ec5b-6de8-4ff0-9dbe-783a24a8d15e', 'VIT-005', 'Nop-Stress', 'fecd6c54-f487-40c1-86d3-799422626548', 'sachet', 23000, 'Vitamin elektrolite', true, 'Frita', '2026-04-24T03:42:41.503+00:00', '2026-04-24T03:42:41.77342+00:00', 1, 'ml'),
('640258fe-1d36-487b-b072-5ff8d7dccb09', 'VIT-006', 'Biogreen', '3db104ed-f34f-4fb8-94c9-b2036e7007fe', 'botol', 210000, 'Vitamin + Herbal', true, 'Frita', '2026-04-24T03:43:28.38+00:00', '2026-04-24T03:43:28.685069+00:00', 1, 'ml');

-- master_obat_tf_ub (4 rows)
INSERT INTO master_obat_tf_ub (id, kode, nama, supplier_id, kategori, satuan, harga_satuan, keterangan, active, created_by, created_at, updated_at, isi_per_satuan, base_unit) VALUES
('e72394d4-f844-4ea0-a6e0-f9e620126514', 'OBT-001', 'Amoxilin', NULL, 'obat', 'botol', 0, 'Antibiotik broad spectrum', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00', 1, 'ml'),
('3bb24c1c-1214-4c6f-b5e9-ff8bbccaf8d9', 'OBT-002', 'Colistin', NULL, 'obat', 'sachet', 0, 'Antibiotik untuk CRD', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00', 1, 'ml'),
('97e659e7-0c5f-433d-b0e8-032e399da625', 'OBT-003', 'Enrofloxacin', NULL, 'obat', 'botol', 0, 'Antibiotik fluoroquinolon', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00', 1, 'ml'),
('ad78921c-6412-4774-81f6-441c1f18782c', 'OBT-004', 'Desinfektan Kandang', NULL, 'obat', 'liter', 0, 'Untuk sanitasi kandang', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00', 1, 'ml');

-- master_vaksin_tf_ub (4 rows)
INSERT INTO master_vaksin_tf_ub (id, kode, nama, supplier_id, satuan, harga_satuan, keterangan, active, created_by, created_at, updated_at, isi_per_satuan, base_unit) VALUES
('ae6f5ab2-68f5-42e0-85a6-81f9396027aa', 'VAK-002', 'IB H120', NULL, 'dosis', 0, 'Vaksin Infectious Bronchitis', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00', 1, 'dosis'),
('e7e7ddfd-8c05-4f8b-88a6-192813d931e4', 'VAK-003', 'AI H5N1', NULL, 'dosis', 0, 'Vaksin Avian Influenza', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00', 1, 'dosis'),
('b7879c1d-2944-4805-8b0e-fca18ba97e5a', 'VAK-004', 'Gumboro', NULL, 'dosis', 0, 'Vaksin Gumboro/IBD', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00', 1, 'dosis'),
('8a0dcf69-eb28-49de-8851-3308ed730c46', 'VAK-001', 'MA 5 Clone 30', '3db104ed-f34f-4fb8-94c9-b2036e7007fe', 'vial', 115000, 'Vaksin Newcastle Disease + IB (Live)', true, 'Frita', '2026-04-24T01:33:08.335726+00:00', '2026-04-24T03:46:03.646+00:00', 1, 'dosis');

-- master_pelanggan_tf_ub (3 rows)
INSERT INTO master_pelanggan_tf_ub (id, kode, nama, telepon, alamat, tipe, harga_khusus, keterangan, active, created_by, created_at, updated_at) VALUES
('3cdfc2d8-2d36-4f7f-b122-ef95b498e754', 'PLG-001', 'Pasar Tradisional', NULL, NULL, 'retail', 0, 'Pelanggan pasar umum', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00'),
('3f137427-946c-4c2a-b2c1-bb6ef245b617', 'PLG-002', 'Toko Sembako Maju', NULL, NULL, 'grosir', 0, 'Pelanggan grosir tetap', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00'),
('4a46bbff-ae19-497c-a0d9-d600e1571370', 'PLG-003', 'Distributor Jaya', NULL, NULL, 'distributor', 0, 'Distributor telur wilayah', true, NULL, '2026-04-24T01:33:08.335726+00:00', '2026-04-24T01:33:08.335726+00:00');

-- sessions_bw_tf_ub (3 rows) - HARUS sebelum timbang_tf_ub karena FK
INSERT INTO sessions_bw_tf_ub (id, kandang, umur_mg, jumlah_sample, rata_rata, uniformity, cv, standar_bw, created_by, created_at) VALUES
('1d5f21f0-4306-46e8-ace6-161e4a180c40', 'TF 1', 14, 192, 1366, 91.7, 6.3, 0, 'saiful', '2026-04-27T06:49:36.887+00:00'),
('3e7a01fd-383d-496d-b2d2-73e2d499f25a', 'TF 1', 15, 192, 1417, 90.6, 5.9, 0, 'saiful', '2026-05-02T06:42:53.697+00:00'),
('d4aa3b25-0b91-4ff9-93a4-b565184a5c13', 'TF 1', 16, 192, 1463, 89.1, 6.4, 0, 'saiful', '2026-05-10T06:48:57.121+00:00');


-- kiriman_pakan_tf_ub (6 rows)
INSERT INTO kiriman_pakan_tf_ub (id, tanggal, nama_pakan, jumlah, satuan, supplier, harga_per_kg, harga_total, status_bayar, sisa_tagihan, keterangan, kandang, user_input, created_at, sumber) VALUES
('b7c035d9-15e9-451a-be42-5b9bb91e6c67', '2026-04-16', 'CP522', 2500, 'kg', 'Muria Mbak Nur', 7450, 18625000, 'lunas', 18625000, 'PJ260400321', NULL, 'shakadigital', '2026-04-20T08:55:11.796868+00:00', 'inti'),
('859b26ed-570f-4c3a-9984-9683ae60f48a', '2026-04-23', 'CP522', 2500, 'kg', 'Muria Mbak Nur', 7450, 18625000, 'lunas', 18625000, 'PJ260400455', NULL, 'Saiful', '2026-04-23T01:19:35.071867+00:00', 'inti'),
('b0d7af77-9dee-4bc0-8152-90aa854ffc28', '2026-04-28', 'CP522', 2500, 'kg', 'Muria Mbak Nur', 7525, 18812500, 'lunas', 18812500, 'PJ260400564', NULL, 'Saiful', '2026-04-29T09:24:06.606863+00:00', 'inti'),
('0d83e3e0-343a-4889-abac-c9f01c30648a', '2026-05-01', 'CP522', 2500, 'kg', 'PT Pakan Jaya', 7525, 18812500, 'belum', 18812500, 'PJ260500006', NULL, 'Saiful', '2026-05-04T09:32:05.414295+00:00', 'inti'),
('92a31ab3-98fc-435c-925e-197883e1346f', '2026-05-04', '324-AT', 1000, 'kg', 'Muria Mbak Nur', 7000, 7000000, 'belum', 7000000, 'PJ260500022', NULL, 'Saiful', '2026-05-04T09:35:15.78086+00:00', 'inti'),
('4d79c33c-4f61-4241-8a3b-6266d1186727', '2026-05-08', '324-AT', 2000, 'kg', 'Muria PS (Mbak Nur)', 7000, 14000000, 'belum', 14000000, 'PJ260500148', NULL, 'Saiful', '2026-05-08T08:51:46.852036+00:00', 'inti');

-- kas_operasional_tf_ub (17 rows)
INSERT INTO kas_operasional_tf_ub (id, tanggal, jenis, kategori, jumlah, keterangan, kandang, user_input, created_at) VALUES
('dfe08c64-99e6-49b7-a685-f482b7f08313', '2026-04-22', 'masuk', 'Alokasi', 6000000, 'Test', 'TF 1', 'admin', '2026-04-22T01:26:49.959231+00:00'),
('93befa0b-01ef-4c2e-80c8-1fb8e64816ca', '2026-04-22', 'keluar', 'peralatan_farm', 109000, 'Karet tabung popa simizu', 'TF 1', 'shakadigital', '2026-04-22T18:12:07.492375+00:00'),
('51cc0c33-7483-4447-a9a7-58fd9f67eb00', '2026-04-24', 'keluar', 'peralatan_farm', 34000, 'Lakban hitam', 'TF 1', 'Saiful', '2026-04-25T01:31:47.148404+00:00'),
('74d027ea-1691-403c-b26f-802f08a6e1c8', '2026-04-26', 'keluar', 'mess_fasilitas', 18000, 'Gula', 'TF 1', 'Saiful', '2026-04-26T02:29:07.284962+00:00'),
('1948d8c2-00a6-406e-a1da-a10e656f339e', '2026-04-29', 'keluar', 'listrik_air', 34000, 'Lampu kandang', 'TF 1', 'Saiful', '2026-04-29T09:19:42.963892+00:00'),
('e6d685f0-bee9-4b36-884b-0099a6c262af', '2026-04-29', 'keluar', 'peralatan_farm', 34000, 'Lakban hitam 2 biji', 'TF 1', 'Saiful', '2026-04-29T09:19:43.570489+00:00'),
('074da10e-0d6d-4bfe-bff6-6dd9ce093a25', '2026-04-29', 'keluar', 'mess_fasilitas', 210000, 'Obat rumput round up 2 botol', 'TF 1', 'Saiful', '2026-04-29T09:19:44.196221+00:00'),
('558c9313-ce4f-4c50-92db-b40ff21b1735', '2026-04-29', 'keluar', 'lainnya', 160000, 'Foto copy+jilid buku recording 10 buku', NULL, 'Saiful', '2026-04-29T09:21:24.504766+00:00'),
('389d1b57-e42e-4a03-bd8f-b64d6360dcce', '2026-04-30', 'keluar', 'bbm_energi', 50000, 'Bensin tossa', 'TF 1', 'Saiful', '2026-04-30T09:16:00.409291+00:00'),
('2fd7a7b2-5e3c-4c79-b64f-4761e9a5a24c', '2026-05-02', 'keluar', 'mess_fasilitas', 116580, 'Kopi', 'TF 1', 'Saiful', '2026-05-02T23:48:46.993157+00:00'),
('9063e0f4-d17f-49ac-a182-e2f216fc9cdc', '2026-05-02', 'keluar', 'mess_fasilitas', 13740, 'Mama lemon', 'TF 1', 'Saiful', '2026-05-02T23:48:47.221353+00:00'),
('78ffcad3-c9e8-44ad-8515-0ebc3a7ea171', '2026-05-04', 'keluar', 'tenaga_harian', 200000, 'Honor bantu vaksin 2 orang', 'TF 1', 'Saiful', '2026-05-04T09:39:20.061039+00:00'),
('0877ec8d-d051-441b-8051-646549e32732', '2026-05-04', 'keluar', 'lainnya', 140000, 'Konsumsi', 'TF 1', 'Saiful', '2026-05-04T09:39:20.157696+00:00'),
('e2641407-20fb-434e-abce-3e962cb69445', '2026-05-04', 'keluar', 'lainnya', 120000, 'Rokok vaksinator dan tenaga banty', 'TF 1', 'Saiful', '2026-05-04T09:39:20.226292+00:00'),
('de9f045b-8224-424e-8a6c-932b7458f4d4', '2026-05-04', 'keluar', 'lainnya', 37500, 'Sarung tangan', 'TF 1', 'Saiful', '2026-05-04T09:40:46.923764+00:00'),
('b9b01b1a-d0ba-4913-85bf-23300c683039', '2026-05-16', 'keluar', 'peralatan_farm', 75000, 'Fom lembaran', NULL, 'Saiful', '2026-05-16T11:38:05.13179+00:00'),
('91e03d37-3ecc-43a1-b5c9-ae8de6ccb6d7', '2026-05-16', 'keluar', 'mess_fasilitas', 44000, 'Galon', NULL, 'Saiful', '2026-05-16T11:38:05.249389+00:00');

-- pembayaran_tf_ub (4 rows)
INSERT INTO pembayaran_tf_ub (id, tanggal, jenis, supplier, referensi_id, jumlah_tagihan, jumlah_bayar, sisa_tagihan, metode, no_referensi, keterangan, kandang, user_input, created_at) VALUES
('64f1ea3f-93c9-4820-83ee-92c314f85772', '2026-04-22', 'pakan', 'Muria PS', 'b7c035d9-15e9-451a-be42-5b9bb91e6c67', 18687500, 18687500, 0, 'transfer', '1234', 'test', NULL, 'Frita', '2026-04-22T18:32:11.156021+00:00'),
('f15fd41c-b4bc-4661-8135-ecbf18b1549d', '2026-05-04', 'pakan', 'Muria Mbak Nur', '859b26ed-570f-4c3a-9984-9683ae60f48a', 18625000, 18625000, 0, 'transfer', '1440023474361', 'IDR-UNIV BRAWIJAYA', NULL, 'shakadigital', '2026-05-04T15:42:40.409828+00:00'),
('699ad6c6-0456-4bcf-add5-4d6a9c9f9b36', '2026-05-04', 'pakan', 'Muria Mbak Nur', 'b0d7af77-9dee-4bc0-8152-90aa854ffc28', 18812500, 18812500, 0, 'transfer', '1440023474361', 'IDR-UNIV BRAWIJAYA', NULL, 'shakadigital', '2026-05-04T15:44:54.956236+00:00'),
('50759713-6502-4af0-aa9b-6fcacd865439', '2026-04-30', 'pullet', 'Muria PS (Mbak Nur)', NULL, 0, 419840000, 0, 'transfer', '448222286', 'IDR-UNIV BRAWIJAYA', NULL, 'shakadigital', '2026-05-11T08:05:07.308516+00:00');

-- kiriman_nonpakan_tf_ub (7 rows)
INSERT INTO kiriman_nonpakan_tf_ub (id, tanggal, kategori, nama_item, jumlah, satuan, supplier, harga_satuan, harga_total, keterangan, kandang, user_input, created_at, sumber) VALUES
('e5c226e1-e984-490e-9309-435049059e3e', '2026-03-30', 'obat', 'Sanivir Smoke 200gr', 4, 'botol', 'PT SHS 2', 888000, 3552000, '856206', 'TF 1', 'shakadigital', '2026-05-05T08:59:01.282567+00:00', 'inti'),
('45c6dbb9-bee5-44f5-bd7b-d1bc329813bd', '2026-03-30', 'obat', 'Sanivir Smoke 25gr', 2, 'botol', 'PT SHS 2', 155400, 310800, '856206', NULL, 'shakadigital', '2026-05-05T08:59:41.881702+00:00', 'inti'),
('8865a483-244c-4e68-9128-d6aa94f765ee', '2026-04-15', 'vitamin', 'Nop-Stress', 1, 'kg', 'PT SHS 2', 0, 0, '856206', NULL, 'shakadigital', '2026-05-05T09:01:08.054967+00:00', 'inti'),
('de9fde37-3b49-4900-93b6-e26666c9b6aa', '2026-04-15', 'obat', 'Eflock', 1, 'botol', 'PT SHS 2', 0, 0, '856276', NULL, 'shakadigital', '2026-05-05T09:02:18.895712+00:00', 'inti'),
('cdb57471-de0e-4b38-b606-832f89a0c53c', '2026-04-30', 'vaksin', 'Volvac AC Plus ND IB EDS 1000', 5, 'botol', 'PTIMA', 0, 0, '219480', 'TF 1', 'shakadigital', '2026-05-05T09:04:23.928277+00:00', 'inti'),
('931d085f-9e96-4d09-b5f3-30a69c27c292', '2026-05-05', 'lainnya', 'Contrax', 2, 'kg', 'PT IMA', 0, 0, '219575', 'TF 1', 'shakadigital', '2026-05-08T01:41:40.383292+00:00', 'inti'),
('71cbc8b1-8c86-4b08-a3ac-4be07764a0af', '2026-05-08', 'vitamin', 'Biogreen', 2, 'botol', 'PT SHS 2', 0, 0, NULL, 'TF 1', 'Saiful', '2026-05-08T08:53:28.552578+00:00', 'inti');

-- pemakaian_nonpakan_tf_ub (15 rows)
INSERT INTO pemakaian_nonpakan_tf_ub (id, tanggal, kategori, nama_item, jumlah, satuan, kandang, keterangan, user_input, created_at) VALUES
('7670dff4-9e8d-4308-81d8-73075ea4c6ac', '2026-04-27', 'vitamin', 'Nop-Stress', 1, 'sachet', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-04-27T09:27:07.463427+00:00'),
('8d52bdd7-b08c-43ff-af4b-bf6664967ec2', '2026-04-27', 'vaksin', 'IB H120', 10000, 'dosis', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-04-27T09:27:07.636271+00:00'),
('a96962db-dc12-4351-a10a-da5d6f3d9a72', '2026-04-28', 'vitamin', 'Nop-Stress', 1, 'sachet', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-04-28T09:01:01.345415+00:00'),
('497c7e91-2def-414d-96e6-bc0a0e2c0bc3', '2026-05-04', 'vitamin', 'Nop-Stress', 1, 'sachet', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-04T09:37:07.93273+00:00'),
('a4dce4d1-9459-4f4e-b5bb-c03fca11c30d', '2026-04-29', 'vitamin', 'Nop-Stress', 1, 'sachet', 'TF 1', 'Auto dari Input Harian', 'Saiful', '2026-05-05T02:05:19.863924+00:00'),
('25dc2e2f-f6c6-4250-98f1-b53e3ac2cbee', '2026-05-05', 'vitamin', 'Nop-Stress', 1, 'sachet', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-05T09:22:48.97654+00:00'),
('1491d368-6a5c-4266-ba05-c0155660c4bc', '2026-05-06', 'vitamin', 'Nop-Stress', 1, 'sachet', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-06T09:12:32.43709+00:00'),
('36a2c7a8-42ba-46ee-8305-af86451a9961', '2026-05-07', 'vitamin', 'Nop-Stress', 1, 'sachet', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-07T09:07:17.195439+00:00'),
('41857ddd-00fb-4234-a8e3-64fa2a1cc6c4', '2026-05-08', 'vitamin', 'Nop-Stress', 1, 'sachet', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-08T08:54:24.67228+00:00'),
('96b5950a-c096-4fb2-84f2-592bba371672', '2026-05-12', 'vitamin', 'Biogreen', 150, 'botol', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-12T09:22:05.799767+00:00'),
('e921eb17-f3d1-4b5c-8635-1233a7680de1', '2026-05-12', 'lainnya', 'Contrax', 1, 'tablet', 'TF 1', 'Tabur di gudang', 'shakadigital', '2026-05-12T09:22:32.333924+00:00'),
('00c85b5b-6908-4d2e-92fb-c43b65bf0602', '2026-05-13', 'vitamin', 'Biogreen', 150, 'botol', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-13T09:39:12.874261+00:00'),
('da2866ca-834b-45e1-828f-c8772e6aeb8e', '2026-05-14', 'vitamin', 'Biogreen', 150, 'botol', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-14T09:27:30.773918+00:00'),
('216c1243-bb68-4850-905b-3ca5fb9ad54b', '2026-05-15', 'vitamin', 'Biogreen', 1, 'botol', 'TF 1', 'Auto dari Input Harian', 'Afin', '2026-05-15T09:14:26.236568+00:00'),
('282dbcd2-43e1-455e-92d8-e33886893105', '2026-05-16', 'vitamin', 'Biogreen', 150, 'botol', 'TF 1', 'Auto dari Input Harian', 'Saiful', '2026-05-16T09:03:49.002237+00:00');

-- input_harian_tf_ub (30 rows) - Data terlalu besar untuk inline, gunakan COPY atau import terpisah
-- Untuk data input_harian dan timbang, jalankan file terpisah:
-- sql/migrate-tf-ub-input-harian.sql
-- sql/migrate-tf-ub-timbang.sql

-- ============================================================
-- SELESAI - Struktur + Data Master
-- ============================================================
-- CATATAN: 
-- 1. Data input_harian_tf_ub (30 rows dengan JSONB besar) ada di file terpisah
-- 2. Data timbang_tf_ub (576 rows) ada di file terpisah
-- 3. Setelah import, pastikan jalankan kedua file tersebut juga
-- ============================================================
