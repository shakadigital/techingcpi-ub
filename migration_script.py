import pandas as pd
import json

file_path = r'e:\TEACHING FARM\TF-UB.apk\Data penjualan telur.xlsx'
df = pd.read_excel(file_path)

sql_statements = []
sql_statements.append('-- =========================================')
sql_statements.append('-- IMPORT DATA HISTORIS DARI EXCEL')
sql_statements.append('-- =========================================\n')

sql_statements.append('BEGIN;')
sql_statements.append('DELETE FROM input_harian_tf_ub;')
sql_statements.append('DELETE FROM penjualan_tf_ub;')
sql_statements.append('DELETE FROM audit_stok_tf_ub;\n')

for index, row in df.iterrows():
    tgl = row['TGL']
    if pd.isna(tgl): continue
    tgl_str = str(tgl)[:10]

    # --- 1. INPUT HARIAN (PRODUKSI & HARGA PASAR) ---
    p_n_b = float(row['Prod. Normal (btr)']) if not pd.isna(row['Prod. Normal (btr)']) else 0
    p_n_k = float(row['Prod.  Normal (Kg)']) if not pd.isna(row['Prod.  Normal (Kg)']) else 0
    p_c_b = float(row['Prod. Crem (btr)']) if not pd.isna(row['Prod. Crem (btr)']) else 0
    p_c_k = float(row['Prod. Crem (kg)']) if not pd.isna(row['Prod. Crem (kg)']) else 0
    p_r_b = float(row['Prod. Rtk (btr)']) if not pd.isna(row['Prod. Rtk (btr)']) else 0
    p_r_k = float(row['Prod. Rtk (Kg)']) if not pd.isna(row['Prod. Rtk (Kg)']) else 0
    hp = float(row['Harga Pasar']) if not pd.isna(row['Harga Pasar']) else 0

    if p_n_b > 0 or p_c_b > 0 or p_r_b > 0 or hp > 0:
        tot_b = p_n_b + p_c_b + p_r_b
        tot_k = p_n_k + p_c_k + p_r_k
        data_json = {
            'tanggal': tgl_str,
            'kandang': 'TF 1',
            'user': 'Admin (Migrasi)',
            'produksi': {
                'normal': {'butir': p_n_b, 'kilo': p_n_k},
                'crem': {'butir': p_c_b, 'kilo': p_c_k},
                'retak': {'butir': p_r_b, 'kilo': p_r_k},
                'bentes': {'butir': 0, 'kilo': 0},
                'ceplokan': {'butir': 0, 'kilo': 0},
                'total': {'butir': tot_b, 'kilo': tot_k}
            },
            'harga_pasar': hp
        }
        json_str = json.dumps(data_json).replace("'", "''")
        sql = f"INSERT INTO input_harian_tf_ub (tanggal, kandang, user_input, data) VALUES ('{tgl_str}', 'TF 1', 'Admin (Migrasi)', '{json_str}');"
        sql_statements.append(sql)

    # --- 2. PENJUALAN ---
    j_n_b = float(row['Jual Normal (Butir)']) if not pd.isna(row['Jual Normal (Butir)']) else 0
    j_n_k = float(row['Jual Normal (Kilo)']) if not pd.isna(row['Jual Normal (Kilo)']) else 0
    j_n_h = float(row['Harga Normal per kilo']) if not pd.isna(row['Harga Normal per kilo']) else 0
    j_c_b = float(row['Jual Crem (Butir)']) if not pd.isna(row['Jual Crem (Butir)']) else 0
    j_c_k = float(row['Jual Crem (Kilo)']) if not pd.isna(row['Jual Crem (Kilo)']) else 0
    j_c_h = float(row['Harga Crem per kilo']) if not pd.isna(row['Harga Crem per kilo']) else 0
    j_r_b = float(row['Jual Retak (Butir)']) if not pd.isna(row['Jual Retak (Butir)']) else 0
    j_r_k = float(row['Jual Retak (Kilo)']) if not pd.isna(row['Jual Retak (Kilo)']) else 0
    j_r_h = float(row['Harga Retak per kilo']) if not pd.isna(row['Harga Retak per kilo']) else 0

    rows_penjualan = []
    grand_total = 0
    if j_n_b > 0 or j_n_k > 0:
        tot = j_n_k * j_n_h if j_n_k > 0 else j_n_b * (j_n_h/2000)
        grand_total += tot
        rows_penjualan.append({'grade': 'Normal', 'pelanggan': 'Umum', 'butir': j_n_b, 'kilo': j_n_k, 'harga': j_n_h, 'total': tot})
    if j_c_b > 0 or j_c_k > 0:
        tot = j_c_k * j_c_h if j_c_k > 0 else j_c_b * (j_c_h/2000)
        grand_total += tot
        rows_penjualan.append({'grade': 'Crem', 'pelanggan': 'Umum', 'butir': j_c_b, 'kilo': j_c_k, 'harga': j_c_h, 'total': tot})
    if j_r_b > 0 or j_r_k > 0:
        tot = j_r_k * j_r_h if j_r_k > 0 else j_r_b * (j_r_h/2000)
        grand_total += tot
        rows_penjualan.append({'grade': 'Retak', 'pelanggan': 'Umum', 'butir': j_r_b, 'kilo': j_r_k, 'harga': j_r_h, 'total': tot})
    
    if len(rows_penjualan) > 0:
        rows_str = json.dumps(rows_penjualan).replace("'", "''")
        sql = f"INSERT INTO penjualan_tf_ub (tanggal, user_input, rows, grand_total) VALUES ('{tgl_str}', 'Admin (Migrasi)', '{rows_str}', {grand_total});"
        sql_statements.append(sql)

    # --- 3. AUDIT STOK (DIBUANG & SUSUT) ---
    dibuang_b = float(row['Dibuang (Butir)']) if not pd.isna(row['Dibuang (Butir)']) else 0
    dibuang_k = float(row['Dibuang (Kilo)']) if not pd.isna(row['Dibuang (Kilo)']) else 0
    susut_b = float(row['Susut (btr)']) if not pd.isna(row['Susut (btr)']) else 0
    susut_k = float(row['Susut (kg)']) if not pd.isna(row['Susut (kg)']) else 0
    audit_b = float(row['Audit (Butir)']) if not pd.isna(row['Audit (Butir)']) else 0
    audit_k = float(row['Audit (Kilo)']) if not pd.isna(row['Audit (Kilo)']) else 0
    
    if dibuang_b > 0 or dibuang_k > 0:
        sql = f"INSERT INTO audit_stok_tf_ub (id, tanggal, jenis_item, kategori_item, satuan, stok_sistem, stok_aktual, selisih, keterangan, user_input) VALUES (gen_random_uuid(), '{tgl_str}', 'Telur', 'Retak', 'butir', 0, -{dibuang_b}, -{dibuang_b}, 'Dibuang/Rusak', 'Admin (Migrasi)');"
        sql_statements.append(sql)
        sql = f"INSERT INTO audit_stok_tf_ub (id, tanggal, jenis_item, kategori_item, satuan, stok_sistem, stok_aktual, selisih, keterangan, user_input) VALUES (gen_random_uuid(), '{tgl_str}', 'Telur', 'Retak', 'kg', 0, -{dibuang_k}, -{dibuang_k}, 'Dibuang/Rusak', 'Admin (Migrasi)');"
        sql_statements.append(sql)
    
    if susut_b > 0 or susut_k > 0:
        sql = f"INSERT INTO audit_stok_tf_ub (id, tanggal, jenis_item, kategori_item, satuan, stok_sistem, stok_aktual, selisih, keterangan, user_input) VALUES (gen_random_uuid(), '{tgl_str}', 'Telur', 'Normal', 'butir', 0, -{susut_b}, -{susut_b}, 'Susut/Pecah', 'Admin (Migrasi)');"
        sql_statements.append(sql)
        sql = f"INSERT INTO audit_stok_tf_ub (id, tanggal, jenis_item, kategori_item, satuan, stok_sistem, stok_aktual, selisih, keterangan, user_input) VALUES (gen_random_uuid(), '{tgl_str}', 'Telur', 'Normal', 'kg', 0, -{susut_k}, -{susut_k}, 'Susut/Pecah', 'Admin (Migrasi)');"
        sql_statements.append(sql)
        
    if audit_b != 0 or audit_k != 0:
        sql = f"INSERT INTO audit_stok_tf_ub (id, tanggal, jenis_item, kategori_item, satuan, stok_sistem, stok_aktual, selisih, keterangan, user_input) VALUES (gen_random_uuid(), '{tgl_str}', 'Telur', 'Normal', 'butir', 0, {audit_b}, {audit_b}, 'Audit Manual Excel', 'Admin (Migrasi)');"
        sql_statements.append(sql)
        sql = f"INSERT INTO audit_stok_tf_ub (id, tanggal, jenis_item, kategori_item, satuan, stok_sistem, stok_aktual, selisih, keterangan, user_input) VALUES (gen_random_uuid(), '{tgl_str}', 'Telur', 'Normal', 'kg', 0, {audit_k}, {audit_k}, 'Audit Manual Excel', 'Admin (Migrasi)');"
        sql_statements.append(sql)

sql_statements.append('COMMIT;')

with open(r'e:\TEACHING FARM\TF-UB.apk\import_historical_data.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))
    
print('SQL Script generated successfully.')
