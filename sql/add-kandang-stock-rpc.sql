-- Fungsi untuk mendapatkan total kumulatif produksi kandang (tanpa dipotong waste/penjualan/audit)
DROP FUNCTION IF EXISTS get_stok_kandang_tf_ub(DATE);
CREATE OR REPLACE FUNCTION get_stok_kandang_tf_ub(p_sampai DATE)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    prod jsonb;
    rec record;
    b numeric;
    k numeric;
BEGIN
    prod := '{
        "Normal": {"butir": 0, "kilo": 0},
        "Crem": {"butir": 0, "kilo": 0},
        "Bentes": {"butir": 0, "kilo": 0},
        "Ceplokan": {"butir": 0, "kilo": 0}
    }'::jsonb;

    FOR rec IN 
        SELECT data->'produksi' AS prod_data 
        FROM input_harian_tf_ub 
        WHERE tanggal <= p_sampai AND data->'produksi' IS NOT NULL
    LOOP
        -- Normal
        IF rec.prod_data ? 'normal' THEN
            b := COALESCE((rec.prod_data->'normal'->>'butir')::numeric, 0);
            k := COALESCE((rec.prod_data->'normal'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Normal,butir}', (COALESCE((prod->'Normal'->>'butir')::numeric, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Normal,kilo}', (COALESCE((prod->'Normal'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Crem (crem & cream)
        IF rec.prod_data ? 'crem' OR rec.prod_data ? 'cream' THEN
            b := COALESCE((rec.prod_data->'crem'->>'butir')::numeric, 0) + COALESCE((rec.prod_data->'cream'->>'butir')::numeric, 0);
            k := COALESCE((rec.prod_data->'crem'->>'kilo')::numeric, 0) + COALESCE((rec.prod_data->'cream'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Crem,butir}', (COALESCE((prod->'Crem'->>'butir')::numeric, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Crem,kilo}', (COALESCE((prod->'Crem'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Bentes (bentes_kering & retak)
        IF rec.prod_data ? 'bentes_kering' OR rec.prod_data ? 'retak' THEN
            b := COALESCE((rec.prod_data->'bentes_kering'->>'butir')::numeric, 0) + COALESCE((rec.prod_data->'retak'->>'butir')::numeric, 0);
            k := COALESCE((rec.prod_data->'bentes_kering'->>'kilo')::numeric, 0) + COALESCE((rec.prod_data->'retak'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Bentes,butir}', (COALESCE((prod->'Bentes'->>'butir')::numeric, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Bentes,kilo}', (COALESCE((prod->'Bentes'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Ceplokan
        IF rec.prod_data ? 'ceplokan' THEN
            b := COALESCE((rec.prod_data->'ceplokan'->>'butir')::numeric, 0);
            k := COALESCE((rec.prod_data->'ceplokan'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Ceplokan,butir}', (COALESCE((prod->'Ceplokan'->>'butir')::numeric, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Ceplokan,kilo}', (COALESCE((prod->'Ceplokan'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;
    END LOOP;

    RETURN prod;
END;
$$;
