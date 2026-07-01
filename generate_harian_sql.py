import pandas as pd
import json

file_path = r'e:\TEACHING FARM\TF-UB.apk\input_harian_tf_ub_rows.csv'
sql_output_path = r'e:\TEACHING FARM\TF-UB.apk\import_harian.sql'

def generate_sql():
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    sql_statements = []
    sql_statements.append('-- =========================================')
    sql_statements.append('-- IMPORT DATA HARIAN DARI CSV')
    sql_statements.append('-- =========================================\n')
    
    sql_statements.append('BEGIN;')
    sql_statements.append('DELETE FROM input_harian_tf_ub;\n')
    
    # Urutkan berdasarkan tanggal jika diperlukan (opsional, tapi bagus untuk insert yang berurutan)
    df = df.sort_values(by='tanggal')
    
    for index, row in df.iterrows():
        id_val = str(row['id'])
        tanggal = str(row['tanggal'])
        kandang = str(row['kandang'])
        user_input = str(row['user_input'])
        data_str = str(row['data'])
        
        created_at = str(row['created_at'])
        updated_at = str(row['updated_at'])
        
        # Escape single quotes in JSON string
        data_escaped = data_str.replace("'", "''")
        
        # Generate INSERT statement (lengkap dengan id, created_at, dan updated_at agar sama persis)
        sql = f"INSERT INTO input_harian_tf_ub (id, tanggal, kandang, user_input, data, created_at, updated_at) " \
              f"VALUES ('{id_val}', '{tanggal}', '{kandang}', '{user_input}', '{data_escaped}', '{created_at}', '{updated_at}');"
        
        sql_statements.append(sql)

    sql_statements.append('\nCOMMIT;')
    
    try:
        with open(sql_output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql_statements))
        print(f"Berhasil men-generate {len(df)} baris INSERT INTO input_harian_tf_ub.")
        print(f"File SQL disimpan di: {sql_output_path}")
    except Exception as e:
        print(f"Error writing SQL file: {e}")

if __name__ == "__main__":
    generate_sql()
