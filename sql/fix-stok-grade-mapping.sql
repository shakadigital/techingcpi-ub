-- ═══════════════════════════════════════════════════
-- FIX: PENYESUAIAN NAMA GRADE PADA PENGURANGAN PENJUALAN
-- ═══════════════════════════════════════════════════
-- Jalankan script ini di Supabase SQL Editor.

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
            
            -- Normalisasi penamaan grade dari riwayat penjualan ke format baku
            IF g = 'Cream' THEN
                g := 'Crem';
            ELSIF g = 'Retak' THEN
                g := 'Bentes kering';
            END IF;

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
