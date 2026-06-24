-- ═══════════════════════════════════════════════════
-- TEACHING FARM UB - FIFO BIAYA PAKAN RPC
-- ═══════════════════════════════════════════════════
-- Menghitung Harga Pokok Penjualan (HPP) pakan menggunakan metode FIFO
-- secara akurat sejak hari pertama beroperasi.

DROP FUNCTION IF EXISTS get_fifo_biaya_pakan_tf_ub(DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION get_fifo_biaya_pakan_tf_ub(p_dari DATE, p_sampai DATE, p_kandang TEXT DEFAULT NULL)
RETURNS TABLE (
    tanggal DATE,
    kandang TEXT,
    biaya_pakan NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec_input RECORD;
    rec_pakan RECORD;
    v_qty_needed NUMERIC;
    v_qty_taken NUMERIC;
    v_cost NUMERIC;
    v_total_cost NUMERIC;
    rec_stock RECORD;
    v_nama TEXT;
    v_fallback_price NUMERIC;
BEGIN
    -- 1. Siapkan tabel temporary untuk tumpukan stok (layering)
    DROP TABLE IF EXISTS temp_fifo_stock;
    CREATE TEMP TABLE temp_fifo_stock (
        id SERIAL PRIMARY KEY,
        nama_pakan TEXT,
        tanggal DATE,
        sisa_jumlah NUMERIC,
        harga_per_kg NUMERIC
    );

    -- Isi tabel temporary dengan seluruh riwayat kiriman pakan
    INSERT INTO temp_fifo_stock (nama_pakan, tanggal, sisa_jumlah, harga_per_kg)
    SELECT k.nama_pakan, k.tanggal, k.jumlah, k.harga_per_kg
    FROM kiriman_pakan_tf_ub k
    ORDER BY k.tanggal ASC, k.created_at ASC;

    -- 2. Looping semua riwayat pemakaian pakan secara berurutan dari awal
    FOR rec_input IN 
        SELECT i.tanggal, i.kandang, i.data->'pakan' AS pakan_arr 
        FROM input_harian_tf_ub i
        WHERE i.data->'pakan' IS NOT NULL AND jsonb_typeof(i.data->'pakan') = 'array'
        ORDER BY i.tanggal ASC, i.created_at ASC
    LOOP
        v_total_cost := 0;

        -- Iterasi untuk setiap jenis pakan yang dipakai pada hari tersebut
        FOR rec_pakan IN SELECT * FROM jsonb_array_elements(rec_input.pakan_arr)
        LOOP
            v_qty_needed := COALESCE((rec_pakan.value->>'jumlah')::numeric, 0);
            v_nama := COALESCE(rec_pakan.value->>'kode', rec_pakan.value->>'nama', '');
            
            -- Telusuri layer stok dari yang terlama (FIFO)
            FOR rec_stock IN 
                SELECT * FROM temp_fifo_stock t
                WHERE t.nama_pakan = v_nama AND t.sisa_jumlah > 0 
                ORDER BY t.tanggal ASC, t.id ASC
            LOOP
                IF v_qty_needed <= 0 THEN
                    EXIT;
                END IF;

                -- Jika stok layer ini cukup
                IF rec_stock.sisa_jumlah >= v_qty_needed THEN
                    v_qty_taken := v_qty_needed;
                ELSE
                    -- Jika stok layer ini kurang, ambil semua sisanya
                    v_qty_taken := rec_stock.sisa_jumlah;
                END IF;

                v_cost := v_qty_taken * rec_stock.harga_per_kg;
                v_total_cost := v_total_cost + v_cost;
                v_qty_needed := v_qty_needed - v_qty_taken;

                -- Update sisa stok di layer temporary
                UPDATE temp_fifo_stock t
                SET sisa_jumlah = t.sisa_jumlah - v_qty_taken 
                WHERE t.id = rec_stock.id;
            END LOOP;
            
            -- Jika masih ada kebutuhan (minus stock / telat input kiriman)
            -- Gunakan fallback harga terakhir yang tercatat
            IF v_qty_needed > 0 THEN
                SELECT k.harga_per_kg INTO v_fallback_price 
                FROM kiriman_pakan_tf_ub k
                WHERE k.nama_pakan = v_nama AND k.tanggal <= rec_input.tanggal
                ORDER BY k.tanggal DESC LIMIT 1;
                
                -- Jika tidak ada harga sebelum pemakaian, ambil harga perdana sesudahnya
                IF v_fallback_price IS NULL THEN
                    SELECT k.harga_per_kg INTO v_fallback_price 
                    FROM kiriman_pakan_tf_ub k
                    WHERE k.nama_pakan = v_nama 
                    ORDER BY k.tanggal ASC LIMIT 1;
                END IF;

                v_cost := v_qty_needed * COALESCE(v_fallback_price, 0);
                v_total_cost := v_total_cost + v_cost;
            END IF;
        END LOOP;

        -- 3. Kembalikan data HANYA jika berada dalam rentang tanggal yang diminta
        IF rec_input.tanggal >= p_dari AND rec_input.tanggal <= p_sampai THEN
            IF p_kandang IS NULL OR p_kandang = '' OR rec_input.kandang = p_kandang THEN
                tanggal := rec_input.tanggal;
                kandang := rec_input.kandang;
                biaya_pakan := v_total_cost;
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;

    -- Bersihkan temporary table
    DROP TABLE IF EXISTS temp_fifo_stock;
END;
$$;
