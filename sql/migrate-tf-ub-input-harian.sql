-- ============================================================
-- DATA: input_harian_tf_ub (30 rows)
-- Jalankan SETELAH migrate-tf-ub-to-new-supabase.sql
-- ============================================================

-- Karena data JSONB sangat besar, gunakan pendekatan ini:
-- Jalankan query berikut di SQL Editor Supabase LAMA untuk export,
-- lalu paste hasilnya di SQL Editor Supabase BARU:

-- CARA MUDAH: Copy-paste dari Supabase Dashboard lama
-- 1. Buka SQL Editor di project LAMA (rzzqbxusiipltswdfnbq)
-- 2. Jalankan query ini:
/*
SELECT 'INSERT INTO input_harian_tf_ub (id, tanggal, kandang, user_input, data, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(tanggal) || ', ' ||
  quote_literal(kandang) || ', ' ||
  quote_nullable(user_input) || ', ' ||
  quote_literal(data::text) || '::jsonb, ' ||
  quote_literal(created_at) || ', ' ||
  quote_literal(updated_at) || ');'
FROM input_harian_tf_ub
ORDER BY tanggal;
*/
-- 3. Copy semua output
-- 4. Paste dan jalankan di SQL Editor project BARU

-- ALTERNATIF: Gunakan Supabase Dashboard > Table Editor > Export CSV
-- lalu Import CSV di project baru
