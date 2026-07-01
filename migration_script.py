import pandas as pd
import json

file_path = r'e:\TEACHING FARM\TF-UB.apk\Data penjualan telur.xlsx'
df = pd.read_excel(file_path)

sql_statements = []
sql_statements.append('-- =========================================')
sql_statements.append('-- IMPORT DATA HISTORIS DARI EXCEL (PRODUKSI & PENJUALAN SAJA)')
sql_statements.append('-- =========================================\n')

sql_statements.append('BEGIN;')
sql_statements.append('DELETE FROM input_harian_tf_ub;')
sql_statements.append('DELETE FROM penjualan_tf_ub;')
sql_statements.append('-- DELETE FROM audit_stok_tf_ub; (Skip Audit & Buang sesuai instruksi)\n')

# Pre-process: format dates
df['TGL_STR'] = df['TGL'].apply(lambda x: str(x)[:10] if pd.notna(x) else None)
df = df.dropna(subset=['TGL_STR'])

# Group by date
grouped = df.groupby('TGL_STR')

for tgl_str, group in grouped:
    # --- 1. AGGREGATE PRODUKSI & HARGA PASAR ---
    p_n_b = group['Prod. Normal (btr)'].sum()
    p_n_k = group['Prod.  Normal (Kg)'].sum()
    p_c_b = group['Prod. Crem (btr)'].sum()
    p_c_k = group['Prod. Crem (kg)'].sum()
    p_r_b = group['Prod. Rtk (btr)'].sum()
    p_r_k = group['Prod. Rtk (Kg)'].sum()
    
    # Harga Pasar: ambil nilai max di hari tersebut (karena biasanya sama)
    hp = group['Harga Pasar'].max()
    if pd.isna(hp): hp = 0

    if p_n_b > 0 or p_c_b > 0 or p_r_b > 0 or hp > 0:
        tot_b = p_n_b + p_c_b + p_r_b
        tot_k = p_n_k + p_c_k + p_r_k
        data_json = {
            'tanggal': tgl_str,
            'kandang': 'TF 1',
            'user': 'Admin (Migrasi)',
            'produksi': {
                'normal': {'butir': float(p_n_b), 'kilo': float(p_n_k)},
                'crem': {'butir': float(p_c_b), 'kilo': float(p_c_k)},
                'retak': {'butir': float(p_r_b), 'kilo': float(p_r_k)},
                'bentes': {'butir': 0, 'kilo': 0},
                'ceplokan': {'butir': 0, 'kilo': 0},
                'total': {'butir': float(tot_b), 'kilo': float(tot_k)}
            },
            'harga_pasar': float(hp)
        }
        json_str = json.dumps(data_json).replace("'", "''")
        sql = f"INSERT INTO input_harian_tf_ub (tanggal, kandang, user_input, data) VALUES ('{tgl_str}', 'TF 1', 'Admin (Migrasi)', '{json_str}');"
        sql_statements.append(sql)

    # --- 2. AGGREGATE PENJUALAN ---
    rows_penjualan = []
    grand_total = 0
    
    for _, row in group.iterrows():
        j_n_b = float(row['Jual Normal (Butir)']) if not pd.isna(row['Jual Normal (Butir)']) else 0
        j_n_k = float(row['Jual Normal (Kilo)']) if not pd.isna(row['Jual Normal (Kilo)']) else 0
        j_n_h = float(row['Harga Normal per kilo']) if not pd.isna(row['Harga Normal per kilo']) else 0
        j_c_b = float(row['Jual Crem (Butir)']) if not pd.isna(row['Jual Crem (Butir)']) else 0
        j_c_k = float(row['Jual Crem (Kilo)']) if not pd.isna(row['Jual Crem (Kilo)']) else 0
        j_c_h = float(row['Harga Crem per kilo']) if not pd.isna(row['Harga Crem per kilo']) else 0
        j_r_b = float(row['Jual Retak (Butir)']) if not pd.isna(row['Jual Retak (Butir)']) else 0
        j_r_k = float(row['Jual Retak (Kilo)']) if not pd.isna(row['Jual Retak (Kilo)']) else 0
        j_r_h = float(row['Harga Retak per kilo']) if not pd.isna(row['Harga Retak per kilo']) else 0

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

sql_statements.append('COMMIT;')

with open(r'e:\TEACHING FARM\TF-UB.apk\import_historical_data.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))
    
print('SQL Script generated successfully.')
