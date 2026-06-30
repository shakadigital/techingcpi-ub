-- ═══════════════════════════════════════════════════
-- PISAHKAN STOK RETAK DARI BENTES (OPTIMIZED)
-- ═══════════════════════════════════════════════════
-- Jalankan script ini di Supabase SQL Editor.

DROP FUNCTION IF EXISTS get_stok_telur_tf_ub(DATE);
CREATE OR REPLACE FUNCTION get_stok_telur_tf_ub(p_sampai DATE)
RETURNS jsonb
LANGUAGE sql
AS $$
WITH prod_agg AS (
    SELECT 
        SUM(COALESCE((data->'produksi'->'normal'->>'butir')::numeric, 0)) AS n_b,
        SUM(COALESCE((data->'produksi'->'normal'->>'kilo')::numeric, 0)) AS n_k,
        SUM(COALESCE((data->'produksi'->'crem'->>'butir')::numeric, 0) + COALESCE((data->'produksi'->'cream'->>'butir')::numeric, 0)) AS c_b,
        SUM(COALESCE((data->'produksi'->'crem'->>'kilo')::numeric, 0) + COALESCE((data->'produksi'->'cream'->>'kilo')::numeric, 0)) AS c_k,
        SUM(COALESCE((data->'produksi'->'retak'->>'butir')::numeric, 0)) AS r_b,
        SUM(COALESCE((data->'produksi'->'retak'->>'kilo')::numeric, 0)) AS r_k,
        SUM(COALESCE((data->'produksi'->'bentes_kering'->>'butir')::numeric, 0)) AS b_b,
        SUM(COALESCE((data->'produksi'->'bentes_kering'->>'kilo')::numeric, 0)) AS b_k,
        SUM(COALESCE((data->'produksi'->'ceplokan'->>'butir')::numeric, 0)) AS cp_b,
        SUM(COALESCE((data->'produksi'->'ceplokan'->>'kilo')::numeric, 0)) AS cp_k
    FROM input_harian_tf_ub 
    WHERE tanggal <= p_sampai AND data->'produksi' IS NOT NULL
),
jual_unpacked AS (
    SELECT 
        CASE 
            WHEN j.value->>'grade' = 'Cream' THEN 'Crem'
            -- Catatan: Retak dulunya digabung ke Bentes, jika diperlukan mapping historical data Retak -> Bentes, bisa ditambahkan, tapi saat ini disesuaikan dengan permintaan user bahwa Retak adalah stok independen.
            ELSE j.value->>'grade' 
        END AS grade,
        COALESCE((j.value->>'butir')::numeric, 0) AS b,
        COALESCE((j.value->>'kilo')::numeric, 0) AS k
    FROM penjualan_tf_ub p,
    jsonb_array_elements(p.rows) j
    WHERE p.tanggal <= p_sampai AND p.rows IS NOT NULL AND jsonb_typeof(p.rows) = 'array'
),
jual_agg AS (
    SELECT 
        SUM(CASE WHEN grade = 'Normal' THEN b ELSE 0 END) AS n_b,
        SUM(CASE WHEN grade = 'Normal' THEN k ELSE 0 END) AS n_k,
        SUM(CASE WHEN grade = 'Crem' THEN b ELSE 0 END) AS c_b,
        SUM(CASE WHEN grade = 'Crem' THEN k ELSE 0 END) AS c_k,
        SUM(CASE WHEN grade = 'Retak' THEN b ELSE 0 END) AS r_b,
        SUM(CASE WHEN grade = 'Retak' THEN k ELSE 0 END) AS r_k,
        SUM(CASE WHEN grade = 'Bentes' THEN b ELSE 0 END) AS b_b,
        SUM(CASE WHEN grade = 'Bentes' THEN k ELSE 0 END) AS b_k,
        SUM(CASE WHEN grade = 'Ceplokan' THEN b ELSE 0 END) AS cp_b,
        SUM(CASE WHEN grade = 'Ceplokan' THEN k ELSE 0 END) AS cp_k
    FROM jual_unpacked
),
audit_agg AS (
    SELECT 
        SUM(CASE WHEN kategori_item = 'Normal' AND satuan = 'butir' THEN selisih ELSE 0 END) AS n_b,
        SUM(CASE WHEN kategori_item = 'Normal' AND satuan = 'kg' THEN selisih ELSE 0 END) AS n_k,
        SUM(CASE WHEN kategori_item = 'Crem' AND satuan = 'butir' THEN selisih ELSE 0 END) AS c_b,
        SUM(CASE WHEN kategori_item = 'Crem' AND satuan = 'kg' THEN selisih ELSE 0 END) AS c_k,
        SUM(CASE WHEN kategori_item = 'Retak' AND satuan = 'butir' THEN selisih ELSE 0 END) AS r_b,
        SUM(CASE WHEN kategori_item = 'Retak' AND satuan = 'kg' THEN selisih ELSE 0 END) AS r_k,
        SUM(CASE WHEN kategori_item = 'Bentes' AND satuan = 'butir' THEN selisih ELSE 0 END) AS b_b,
        SUM(CASE WHEN kategori_item = 'Bentes' AND satuan = 'kg' THEN selisih ELSE 0 END) AS b_k,
        SUM(CASE WHEN kategori_item = 'Ceplokan' AND satuan = 'butir' THEN selisih ELSE 0 END) AS cp_b,
        SUM(CASE WHEN kategori_item = 'Ceplokan' AND satuan = 'kg' THEN selisih ELSE 0 END) AS cp_k
    FROM audit_stok_tf_ub
    WHERE jenis_item = 'Telur' AND tanggal <= p_sampai
)
SELECT jsonb_build_object(
    'Normal', jsonb_build_object(
        'butir', GREATEST(0, COALESCE((SELECT n_b FROM prod_agg), 0) - COALESCE((SELECT n_b FROM jual_agg), 0) + COALESCE((SELECT n_b FROM audit_agg), 0)),
        'kilo', GREATEST(0, COALESCE((SELECT n_k FROM prod_agg), 0) - COALESCE((SELECT n_k FROM jual_agg), 0) + COALESCE((SELECT n_k FROM audit_agg), 0))
    ),
    'Crem', jsonb_build_object(
        'butir', GREATEST(0, COALESCE((SELECT c_b FROM prod_agg), 0) - COALESCE((SELECT c_b FROM jual_agg), 0) + COALESCE((SELECT c_b FROM audit_agg), 0)),
        'kilo', GREATEST(0, COALESCE((SELECT c_k FROM prod_agg), 0) - COALESCE((SELECT c_k FROM jual_agg), 0) + COALESCE((SELECT c_k FROM audit_agg), 0))
    ),
    'Retak', jsonb_build_object(
        'butir', GREATEST(0, COALESCE((SELECT r_b FROM prod_agg), 0) - COALESCE((SELECT r_b FROM jual_agg), 0) + COALESCE((SELECT r_b FROM audit_agg), 0)),
        'kilo', GREATEST(0, COALESCE((SELECT r_k FROM prod_agg), 0) - COALESCE((SELECT r_k FROM jual_agg), 0) + COALESCE((SELECT r_k FROM audit_agg), 0))
    ),
    'Bentes', jsonb_build_object(
        'butir', GREATEST(0, COALESCE((SELECT b_b FROM prod_agg), 0) - COALESCE((SELECT b_b FROM jual_agg), 0) + COALESCE((SELECT b_b FROM audit_agg), 0)),
        'kilo', GREATEST(0, COALESCE((SELECT b_k FROM prod_agg), 0) - COALESCE((SELECT b_k FROM jual_agg), 0) + COALESCE((SELECT b_k FROM audit_agg), 0))
    ),
    'Ceplokan', jsonb_build_object(
        'butir', GREATEST(0, COALESCE((SELECT cp_b FROM prod_agg), 0) - COALESCE((SELECT cp_b FROM jual_agg), 0) + COALESCE((SELECT cp_b FROM audit_agg), 0)),
        'kilo', GREATEST(0, COALESCE((SELECT cp_k FROM prod_agg), 0) - COALESCE((SELECT cp_k FROM jual_agg), 0) + COALESCE((SELECT cp_k FROM audit_agg), 0))
    )
);
$$;
