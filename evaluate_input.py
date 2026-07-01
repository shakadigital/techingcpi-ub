import pandas as pd
import json

file_path = r'e:\TEACHING FARM\TF-UB.apk\input_harian_tf_ub_rows.csv'

def evaluate_data():
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    print(f"Total baris data: {len(df)}")
    print("-" * 50)
    
    issues_found = 0
    
    # Sort by date to check logical flow (e.g., sisa ayam)
    df = df.sort_values(by='tanggal')
    
    previous_sisa_ayam = None
    
    for index, row in df.iterrows():
        tanggal = row['tanggal']
        data_str = row['data']
        
        try:
            # Parse JSON data
            data = json.loads(data_str)
        except Exception as e:
            print(f"[{tanggal}] Error parsing JSON: {e}")
            issues_found += 1
            continue
            
        produksi = data.get('produksi', {})
        deplesi = data.get('deplesi', {})
        
        # 1. Evaluasi Total Telur (Butir & Kilo)
        total_butir_calc = 0
        total_kilo_calc = 0.0
        
        kategori_telur = ['normal', 'crem', 'cream', 'retak', 'bentes_kering', 'ceplokan']
        for kat in kategori_telur:
            if kat in produksi:
                # Handle possible empty string or weird format by stripping
                butir_val = str(produksi[kat].get('butir', 0)).strip() or 0
                kilo_val = str(produksi[kat].get('kilo', 0)).strip() or 0
                
                try:
                    total_butir_calc += int(float(butir_val))
                    total_kilo_calc += float(kilo_val)
                except ValueError:
                    pass
                
        butir_input_val = str(produksi.get('total', {}).get('butir', 0)).strip() or 0
        kilo_input_val = str(produksi.get('total', {}).get('kilo', 0)).strip() or 0
        
        total_butir_input = int(float(butir_input_val)) if butir_input_val else 0
        total_kilo_input = float(kilo_input_val) if kilo_input_val else 0.0
        
        # Toleransi selisih pembulatan kilo
        kilo_diff = abs(total_kilo_calc - total_kilo_input)
        
        if total_butir_calc != total_butir_input:
            print(f"[{tanggal}] Selisih Butir Telur: Kalkulasi {total_butir_calc} vs Input {total_butir_input}")
            issues_found += 1
            
        if kilo_diff > 0.2: # Toleransi 0.2 kilo krn pembulatan
            print(f"[{tanggal}] Selisih Kilo Telur: Kalkulasi {total_kilo_calc:.2f} vs Input {total_kilo_input:.2f}")
            issues_found += 1
            
        # 2. Evaluasi Sisa Ayam & Deplesi
        sisa_ayam = int(data.get('sisa_ayam', 0) or 0)
        mati = int(deplesi.get('mati', 0) or 0)
        afkir = int(deplesi.get('afkir', 0) or 0)
        total_deplesi = mati + afkir
        
        if int(deplesi.get('total', 0) or 0) != total_deplesi:
            print(f"[{tanggal}] Selisih Total Deplesi: Kalkulasi {total_deplesi} vs Input {deplesi.get('total', 0)}")
            issues_found += 1
            
        if previous_sisa_ayam is not None:
            expected_sisa_ayam = previous_sisa_ayam - total_deplesi
            if sisa_ayam != expected_sisa_ayam:
                # print(f"[{tanggal}] Selisih Sisa Ayam: Harusnya {expected_sisa_ayam} (Kemarin {previous_sisa_ayam} - Mati/Afkir {total_deplesi}), tapi tercatat {sisa_ayam}")
                pass
                
        previous_sisa_ayam = sisa_ayam
        
    print("-" * 50)
    print(f"Evaluasi selesai. Ditemukan {issues_found} masalah data (selisih penjumlahan kilo/butir).")

if __name__ == "__main__":
    evaluate_data()
