-- Update get_stok_telur_tf_ub untuk memotong stok Normal jika ada Waste atau Busuk
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
            b := COALESCE((rec.prod_data->'normal'->>'butir')::numeric::int, 0);
            k := COALESCE((rec.prod_data->'normal'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Normal,butir}', (COALESCE((prod->'Normal'->>'butir')::numeric::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Normal,kilo}', (COALESCE((prod->'Normal'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Crem
        IF rec.prod_data ? 'crem' THEN
            b := COALESCE((rec.prod_data->'crem'->>'butir')::numeric::int, 0);
            k := COALESCE((rec.prod_data->'crem'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Crem,butir}', (COALESCE((prod->'Crem'->>'butir')::numeric::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Crem,kilo}', (COALESCE((prod->'Crem'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;
        IF rec.prod_data ? 'cream' THEN
            b := COALESCE((rec.prod_data->'cream'->>'butir')::numeric::int, 0);
            k := COALESCE((rec.prod_data->'cream'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Crem,butir}', (COALESCE((prod->'Crem'->>'butir')::numeric::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Crem,kilo}', (COALESCE((prod->'Crem'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Bentes
        IF rec.prod_data ? 'bentes_kering' THEN
            b := COALESCE((rec.prod_data->'bentes_kering'->>'butir')::numeric::int, 0);
            k := COALESCE((rec.prod_data->'bentes_kering'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Bentes,butir}', (COALESCE((prod->'Bentes'->>'butir')::numeric::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Bentes,kilo}', (COALESCE((prod->'Bentes'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;
        IF rec.prod_data ? 'retak' THEN
            b := COALESCE((rec.prod_data->'retak'->>'butir')::numeric::int, 0);
            k := COALESCE((rec.prod_data->'retak'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Bentes,butir}', (COALESCE((prod->'Bentes'->>'butir')::numeric::int, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Bentes,kilo}', (COALESCE((prod->'Bentes'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Ceplokan
        IF rec.prod_data ? 'ceplokan' THEN
            b := COALESCE((rec.prod_data->'ceplokan'->>'butir')::numeric::int, 0);
            k := COALESCE((rec.prod_data->'ceplokan'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Ceplokan,butir}', (COALESCE((prod->'Ceplokan'->>'butir')::numeric::int, 0) + b)::text::jsonb);
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
            -- Jika grade Waste atau Busuk, kita kurangi dari stok Normal
            IF g = 'Waste' OR g = 'Busuk' THEN
                g := 'Normal';
            END IF;
            -- Mapping legacy grades
            IF g = 'Cream' THEN
                g := 'Crem';
            END IF;
            IF g = 'Retak' THEN
                g := 'Bentes';
            END IF;

            IF prod ? g THEN
                b := COALESCE((j.value->>'butir')::numeric::int, 0);
                k := COALESCE((j.value->>'kilo')::numeric, 0);
                prod := jsonb_set(prod, ARRAY[g, 'butir'], (COALESCE(jsonb_extract_path_text(prod, g, 'butir')::numeric::int, 0) - b)::text::jsonb);
                prod := jsonb_set(prod, ARRAY[g, 'kilo'], (COALESCE(jsonb_extract_path_text(prod, g, 'kilo')::numeric, 0) - k)::text::jsonb);
            END IF;
        END LOOP;
    END LOOP;

    RETURN prod;
END;
$$;
