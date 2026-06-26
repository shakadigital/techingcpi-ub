-- ═══════════════════════════════════════════════════
-- TEACHING FARM UB - FITUR USER PRESENCE (WHO'S ONLINE)
-- ═══════════════════════════════════════════════════
-- Jalankan script ini di Supabase SQL Editor.

-- Menambahkan kolom last_active pada tabel users_tf_ub
ALTER TABLE users_tf_ub ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;

-- (Opsional) Menambahkan index untuk mempercepat pencarian user online
CREATE INDEX IF NOT EXISTS idx_users_tf_ub_last_active ON users_tf_ub(last_active DESC);
