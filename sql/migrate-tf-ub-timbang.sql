-- ============================================================
-- DATA: timbang_tf_ub (576 rows)
-- Jalankan SETELAH migrate-tf-ub-to-new-supabase.sql
-- ============================================================

-- Karena 576 rows terlalu banyak untuk manual copy,
-- gunakan salah satu cara berikut:

-- CARA 1: Export/Import via Supabase Dashboard
-- 1. Buka project LAMA > Table Editor > timbang_tf_ub
-- 2. Klik Export > CSV
-- 3. Buka project BARU > Table Editor > timbang_tf_ub
-- 4. Klik Import > pilih CSV tadi

-- CARA 2: Generate INSERT via SQL Editor project LAMA
-- Jalankan di SQL Editor project LAMA:
/*
SELECT 'INSERT INTO timbang_tf_ub (id, session_id, nomor, berat, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(session_id) || ', ' ||
  nomor || ', ' ||
  berat || ', ' ||
  quote_literal(created_at) || ');'
FROM timbang_tf_ub
ORDER BY session_id, nomor;
*/
-- Lalu copy output dan jalankan di project BARU

-- CARA 3: Gunakan pg_dump (paling cepat untuk data besar)
-- pg_dump --host=db.rzzqbxusiipltswdfnbq.supabase.co --port=5432 --username=postgres --table=timbang_tf_ub --data-only --inserts -d postgres > timbang_data.sql
-- psql --host=db.<NEW_REF>.supabase.co --port=5432 --username=postgres -d postgres < timbang_data.sql
