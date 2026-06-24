-- ═══════════════════════════════════════════════════
-- TEACHING FARM UB - AUDIT STOK (STOCK OPNAME)
-- ═══════════════════════════════════════════════════

-- 1. Buat Tabel audit_stok_tf_ub
CREATE TABLE IF NOT EXISTS audit_stok_tf_ub (
    id UUID PRIMARY KEY,
    tanggal DATE NOT NULL,
    jenis_item TEXT NOT NULL,       -- 'Pakan', 'Telur', 'Non-Pakan'
    kategori_item TEXT NOT NULL,    -- 'Normal', 'Layer Starter', dll
    stok_sistem NUMERIC DEFAULT 0,
    stok_aktual NUMERIC DEFAULT 0,
    selisih NUMERIC DEFAULT 0,      -- Aktual - Sistem (Bisa minus jika hilang)
    satuan TEXT,                    -- 'kg', 'butir', 'liter', dll
    keterangan TEXT,
    user_input TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_audit_tf_ub_tanggal ON audit_stok_tf_ub(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tf_ub_jenis ON audit_stok_tf_ub(jenis_item);

-- Row Level Security
ALTER TABLE audit_stok_tf_ub ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_audit_stok_tf_ub" ON audit_stok_tf_ub FOR ALL USING (true) WITH CHECK (true);

-- 2. Update Fungsi get_stok_telur_tf_ub
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
        "Bentes kering": {"butir": 0, "kilo": 0},
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
        IF rec.prod_data ? 'cream' THEN
            b := COALESCE((rec.prod_data->'cream'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'cream'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Crem,butir}', (COALESCE((prod->'Crem'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Crem,kilo}', (COALESCE((prod->'Crem'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Bentes kering
        IF rec.prod_data ? 'bentes_kering' THEN
            b := COALESCE((rec.prod_data->'bentes_kering'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'bentes_kering'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Bentes kering,butir}', (COALESCE((prod->'Bentes kering'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Bentes kering,kilo}', (COALESCE((prod->'Bentes kering'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;
        IF rec.prod_data ? 'retak' THEN
            b := COALESCE((rec.prod_data->'retak'->>'butir')::int, 0);
            k := COALESCE((rec.prod_data->'retak'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Bentes kering,butir}', (COALESCE((prod->'Bentes kering'->>'butir')::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Bentes kering,kilo}', (COALESCE((prod->'Bentes kering'->>'kilo')::numeric, 0) + k)::text::jsonb);
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

    -- Tambah/Kurangi Selisih Audit (dari audit_stok_tf_ub)
    FOR rec IN 
        SELECT kategori_item, satuan, SUM(selisih) as total_selisih
        FROM audit_stok_tf_ub
        WHERE jenis_item = 'Telur' AND tanggal <= p_sampai
        GROUP BY kategori_item, satuan
    LOOP
        g := rec.kategori_item;
        IF prod ? g THEN
            IF rec.satuan = 'butir' THEN
                prod := jsonb_set(prod, ARRAY[g, 'butir'], GREATEST(0, COALESCE((prod->g->>'butir')::int, 0) + rec.total_selisih::int)::text::jsonb);
            ELSIF rec.satuan = 'kg' THEN
                prod := jsonb_set(prod, ARRAY[g, 'kilo'], GREATEST(0, COALESCE((prod->g->>'kilo')::numeric, 0) + rec.total_selisih)::text::jsonb);
            END IF;
        END IF;
    END LOOP;

    RETURN prod;
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
            SELECT COALESCE(value->>'kode', value->>'nama'), (value->>'jumlah')::numeric FROM jsonb_array_elements(rec.pakan_data)
        LOOP
            IF stok ? n THEN
                stok := jsonb_set(stok, ARRAY[n], GREATEST(0, (stok->>n)::numeric - j)::text::jsonb);
            END IF;
        END LOOP;
    END LOOP;

    -- Tambah/Kurangi Selisih Audit (dari audit_stok_tf_ub)
    FOR rec IN 
        SELECT kategori_item, SUM(selisih) as total_selisih
        FROM audit_stok_tf_ub
        WHERE jenis_item = 'Pakan'
        GROUP BY kategori_item
    LOOP
        n := rec.kategori_item;
        IF stok ? n THEN
            stok := jsonb_set(stok, ARRAY[n], GREATEST(0, (stok->>n)::numeric + rec.total_selisih)::text::jsonb);
        END IF;
    END LOOP;

    RETURN stok;
END;
$$;
