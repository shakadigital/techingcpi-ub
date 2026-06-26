-- ═══════════════════════════════════════════════════
-- TEACHING FARM UB - RPC FUNCTIONS (TABEL _tf_ub)
-- ═══════════════════════════════════════════════════
-- Jalankan script ini di Supabase SQL Editor
-- untuk membuat fungsi server-side yang mempercepat loading (menghindari client-side calculation).

-- 1. Fungsi get_stok_telur_tf_ub
DROP FUNCTION IF EXISTS get_stok_telur_tf_ub(DATE);
CREATE OR REPLACE FUNCTION get_stok_telur_tf_ub(p_sampai DATE)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    prod jsonb;
    rec record;
    j record;
    g text;
    b int;
    k numeric;
BEGIN
    -- Inisialisasi object
    prod := '{
        "Normal": {"butir": 0, "kilo": 0},
        "Crem": {"butir": 0, "kilo": 0},
        "Bentes": {"butir": 0, "kilo": 0},
        "Ceplokan": {"butir": 0, "kilo": 0}
    }'::jsonb;

    -- Tambah Produksi (dari input_harian_tf_ub)
    FOR rec IN 
        SELECT data->'produksi' AS prod_data 
        FROM input_harian_tf_ub 
        WHERE tanggal <= p_sampai AND data->'produksi' IS NOT NULL
    LOOP
        -- Normal
        IF rec.prod_data ? 'normal' THEN
            b := COALESCE((rec.prod_data->'normal'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'normal'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Normal,butir}', (COALESCE((prod->'Normal'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Normal,kilo}', (COALESCE((prod->'Normal'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Crem
        IF rec.prod_data ? 'crem' THEN
            b := COALESCE((rec.prod_data->'crem'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'crem'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Crem,butir}', (COALESCE((prod->'Crem'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Crem,kilo}', (COALESCE((prod->'Crem'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;
        -- Cream (legacy format)
        IF rec.prod_data ? 'cream' THEN
            b := COALESCE((rec.prod_data->'cream'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'cream'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Crem,butir}', (COALESCE((prod->'Crem'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Crem,kilo}', (COALESCE((prod->'Crem'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Bentes
        IF rec.prod_data ? 'bentes_kering' THEN
            b := COALESCE((rec.prod_data->'bentes_kering'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'bentes_kering'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Bentes,butir}', (COALESCE((prod->'Bentes'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Bentes,kilo}', (COALESCE((prod->'Bentes'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;
        -- Retak (legacy format)
        IF rec.prod_data ? 'retak' THEN
            b := COALESCE((rec.prod_data->'retak'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'retak'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Bentes,butir}', (COALESCE((prod->'Bentes'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Bentes,kilo}', (COALESCE((prod->'Bentes'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Ceplokan
        IF rec.prod_data ? 'ceplokan' THEN
            b := COALESCE((rec.prod_data->'ceplokan'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'ceplokan'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Ceplokan,butir}', (COALESCE((prod->'Ceplokan'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Ceplokan,kilo}', (COALESCE((prod->'Ceplokan'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;
    END LOOP;

    -- Kurangi Penjualan (dari penjualan_tf_ub)
    FOR rec IN 
        SELECT rows 
        FROM penjualan_tf_ub 
        WHERE tanggal <= p_sampai AND rows IS NOT NULL AND jsonb_typeof(rows) = 'array'
    LOOP
        FOR j IN SELECT * FROM jsonb_array_elements(rec.rows)
        LOOP
            g := j.value->>'grade';
            IF prod ? g THEN
                b := COALESCE((j.value->>'butir')::int, 0);
                k := COALESCE((j.value->>'kilo')::numeric, 0);
                
                prod := jsonb_set(prod, ARRAY[g, 'butir'], GREATEST(0, COALESCE((prod->g->>'butir')::int, 0) - b)::text::jsonb);
                prod := jsonb_set(prod, ARRAY[g, 'kilo'], GREATEST(0, COALESCE((prod->g->>'kilo')::numeric, 0) - k)::text::jsonb);
            END IF;
        END LOOP;
    END LOOP;

    RETURN prod;
END;
$$;

-- 2. Fungsi get_saldo_kas_tf_ub
DROP FUNCTION IF EXISTS get_saldo_kas_tf_ub(TEXT);
CREATE OR REPLACE FUNCTION get_saldo_kas_tf_ub(p_kandang TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_masuk numeric := 0;
    v_keluar numeric := 0;
BEGIN
    IF p_kandang IS NOT NULL AND p_kandang <> '' THEN
        SELECT COALESCE(SUM(jumlah), 0) INTO v_masuk FROM kas_operasional_tf_ub WHERE jenis = 'masuk' AND kandang = p_kandang;
        SELECT COALESCE(SUM(jumlah), 0) INTO v_keluar FROM kas_operasional_tf_ub WHERE jenis = 'keluar' AND kandang = p_kandang;
    ELSE
        SELECT COALESCE(SUM(jumlah), 0) INTO v_masuk FROM kas_operasional_tf_ub WHERE jenis = 'masuk';
        SELECT COALESCE(SUM(jumlah), 0) INTO v_keluar FROM kas_operasional_tf_ub WHERE jenis = 'keluar';
    END IF;

    RETURN jsonb_build_object(
        'masuk', v_masuk,
        'keluar', v_keluar,
        'saldo', v_masuk - v_keluar
    );
END;
$$;

-- 3. Fungsi get_stok_pakan_tf_ub
DROP FUNCTION IF EXISTS get_stok_pakan_tf_ub();
CREATE OR REPLACE FUNCTION get_stok_pakan_tf_ub()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    stok jsonb := '{}'::jsonb;
    rec record;
    n text;
    j numeric;
BEGIN
    -- Ambil total kiriman pakan per nama_pakan
    FOR rec IN 
        SELECT nama_pakan, SUM(jumlah) as total_masuk 
        FROM kiriman_pakan_tf_ub 
        GROUP BY nama_pakan
    LOOP
        stok := jsonb_set(stok, ARRAY[rec.nama_pakan], rec.total_masuk::text::jsonb, true);
    END LOOP;

    -- Kurangi pemakaian pakan dari input harian
    FOR rec IN 
        SELECT data->'pakan' AS pakan_data 
        FROM input_harian_tf_ub 
        WHERE data->'pakan' IS NOT NULL AND jsonb_typeof(data->'pakan') = 'array'
    LOOP
        FOR n, j IN 
            SELECT value->>'jenis', (value->>'jumlah')::numeric FROM jsonb_array_elements(rec.pakan_data)
        LOOP
            IF stok ? n THEN
                stok := jsonb_set(stok, ARRAY[n], GREATEST(0, (stok->>n)::numeric - j)::text::jsonb);
            END IF;
        END LOOP;
    END LOOP;

    RETURN stok;
END;
$$;
