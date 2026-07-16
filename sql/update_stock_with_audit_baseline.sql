-- Update get_stok_telur_tf_ub untuk menggunakan nilai Audit Terakhir sebagai base stok (reset point)
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
    b numeric;
    k numeric;
    last_audit record;
    audit_dates jsonb;
BEGIN
    -- Inisialisasi object
    prod := '{
        "Normal": {"butir": 0, "kilo": 0},
        "Crem": {"butir": 0, "kilo": 0},
        "Bentes": {"butir": 0, "kilo": 0},
        "Ceplokan": {"butir": 0, "kilo": 0}
    }'::jsonb;
    
    audit_dates := '{
        "Normal": null,
        "Crem": null,
        "Bentes": null,
        "Ceplokan": null
    }'::jsonb;

    -- 1. Cari audit terakhir untuk tiap grade sebelum atau pada p_sampai
    FOR g IN SELECT unnest(ARRAY['Normal', 'Crem', 'Bentes', 'Ceplokan'])
    LOOP
        SELECT tanggal, stok_aktual INTO last_audit
        FROM audit_stok_tf_ub 
        WHERE jenis_item = 'Telur' AND kategori_item = g AND satuan = 'butir' AND tanggal <= p_sampai
        ORDER BY tanggal DESC LIMIT 1;
        
        IF FOUND THEN
            -- set butir (dijadikan baseline)
            prod := jsonb_set(prod, ARRAY[g, 'butir'], last_audit.stok_aktual::numeric::text::jsonb);
            audit_dates := jsonb_set(audit_dates, ARRAY[g], to_jsonb(last_audit.tanggal::text));
            
            -- set kilo (cari audit kilo di tanggal yang sama)
            SELECT stok_aktual INTO last_audit
            FROM audit_stok_tf_ub 
            WHERE jenis_item = 'Telur' AND kategori_item = g AND satuan = 'kg' AND tanggal = last_audit.tanggal
            LIMIT 1;
            
            IF FOUND THEN
                prod := jsonb_set(prod, ARRAY[g, 'kilo'], last_audit.stok_aktual::numeric::text::jsonb);
            END IF;
        END IF;
    END LOOP;

    -- 2. Tambah Produksi (hanya yang tanggal > tanggal audit terakhir masing-masing grade)
    FOR rec IN 
        SELECT tanggal, data->'produksi' AS prod_data 
        FROM input_harian_tf_ub 
        WHERE tanggal <= p_sampai AND data->'produksi' IS NOT NULL
    LOOP
        -- Normal
        IF rec.prod_data ? 'normal' AND (audit_dates->>'Normal' IS NULL OR rec.tanggal > (audit_dates->>'Normal')::date) THEN
            b := COALESCE((rec.prod_data->'normal'->>'butir')::numeric, 0);
            k := COALESCE((rec.prod_data->'normal'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Normal,butir}', (COALESCE((prod->'Normal'->>'butir')::numeric, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Normal,kilo}', (COALESCE((prod->'Normal'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Crem (juga mencakup cream)
        IF (rec.prod_data ? 'crem' OR rec.prod_data ? 'cream') AND (audit_dates->>'Crem' IS NULL OR rec.tanggal > (audit_dates->>'Crem')::date) THEN
            b := COALESCE((rec.prod_data->'crem'->>'butir')::numeric, 0) + COALESCE((rec.prod_data->'cream'->>'butir')::numeric, 0);
            k := COALESCE((rec.prod_data->'crem'->>'kilo')::numeric, 0) + COALESCE((rec.prod_data->'cream'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Crem,butir}', (COALESCE((prod->'Crem'->>'butir')::numeric, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Crem,kilo}', (COALESCE((prod->'Crem'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Bentes (juga mencakup retak)
        IF (rec.prod_data ? 'bentes_kering' OR rec.prod_data ? 'retak') AND (audit_dates->>'Bentes' IS NULL OR rec.tanggal > (audit_dates->>'Bentes')::date) THEN
            b := COALESCE((rec.prod_data->'bentes_kering'->>'butir')::numeric, 0) + COALESCE((rec.prod_data->'retak'->>'butir')::numeric, 0);
            k := COALESCE((rec.prod_data->'bentes_kering'->>'kilo')::numeric, 0) + COALESCE((rec.prod_data->'retak'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Bentes,butir}', (COALESCE((prod->'Bentes'->>'butir')::numeric, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Bentes,kilo}', (COALESCE((prod->'Bentes'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;

        -- Ceplokan
        IF rec.prod_data ? 'ceplokan' AND (audit_dates->>'Ceplokan' IS NULL OR rec.tanggal > (audit_dates->>'Ceplokan')::date) THEN
            b := COALESCE((rec.prod_data->'ceplokan'->>'butir')::numeric, 0);
            k := COALESCE((rec.prod_data->'ceplokan'->>'kilo')::numeric, 0);
            prod := jsonb_set(prod, '{Ceplokan,butir}', (COALESCE((prod->'Ceplokan'->>'butir')::numeric, 0) + b)::text::jsonb);
            prod := jsonb_set(prod, '{Ceplokan,kilo}', (COALESCE((prod->'Ceplokan'->>'kilo')::numeric, 0) + k)::text::jsonb);
        END IF;
    END LOOP;

    -- 3. Kurangi Penjualan (hanya yang tanggal > tanggal audit terakhir masing-masing grade)
    FOR rec IN 
        SELECT tanggal, rows 
        FROM penjualan_tf_ub 
        WHERE tanggal <= p_sampai AND rows IS NOT NULL AND jsonb_typeof(rows) = 'array'
    LOOP
        FOR j IN SELECT * FROM jsonb_array_elements(rec.rows)
        LOOP
            g := j.value->>'grade';
            IF g = 'Busuk' THEN g := 'Normal'; END IF;
            IF g = 'Waste' THEN g := 'Bentes'; END IF;
            IF g = 'Cream' THEN g := 'Crem'; END IF;
            IF g = 'Retak' THEN g := 'Bentes'; END IF;

            IF prod ? g THEN
                -- Hanya kurangi stok jika tanggal penjualan > tanggal audit
                -- (Penjualan di hari H audit dianggap sudah tergabung dalam stok aktual akhir hari)
                IF audit_dates->>g IS NULL OR rec.tanggal > (audit_dates->>g)::date THEN
                    b := COALESCE((j.value->>'butir')::numeric, 0);
                    k := COALESCE((j.value->>'kilo')::numeric, 0);
                    prod := jsonb_set(prod, ARRAY[g, 'butir'], (COALESCE(jsonb_extract_path_text(prod, g, 'butir')::numeric, 0) - b)::text::jsonb);
                    prod := jsonb_set(prod, ARRAY[g, 'kilo'], (COALESCE(jsonb_extract_path_text(prod, g, 'kilo')::numeric, 0) - k)::text::jsonb);
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN prod;
END;
$$;
