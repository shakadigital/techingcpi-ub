// ═══════════════════════════════════════════════════
// TEACHING FARM UB - AUDIT STOK LOGIC
// ═══════════════════════════════════════════════════

let currentAuditSistem = 0;
let currentAuditSatuan = '';

function openAuditModal(jenis = 'Telur') {
  if (!currentUser || !['superadmin', 'admin', 'supervisor'].includes(currentUser.role)) {
    showToast('Hanya Supervisor ke atas yang dapat melakukan audit stok.', 'error');
    return;
  }
  
  const m = document.getElementById('modal-audit-stok');
  if(!m) return;
  m.style.display = 'flex';
  
  if (document.getElementById('audit-tanggal')) {
    document.getElementById('audit-tanggal').value = typeof todayISO === 'function' ? todayISO() : new Date().toLocaleDateString('en-CA');
  }
  
  document.getElementById('audit-jenis').value = jenis;
  renderAuditKategori();
  
  document.getElementById('audit-stok-aktual').value = '';
  document.getElementById('audit-selisih').value = '';
  document.getElementById('audit-selisih-info').textContent = '';
  document.getElementById('audit-keterangan').value = '';
}

async function renderAuditKategori() {
  const jenis = document.getElementById('audit-jenis').value;
  const katSelect = document.getElementById('audit-kategori');
  
  const singleMode = document.getElementById('audit-single-mode');
  const batchMode = document.getElementById('audit-batch-mode');
  
  if (jenis === 'Telur') {
    singleMode.style.display = 'none';
    batchMode.style.display = 'block';
    await loadAuditBatchTelur();
    return;
  }
  
  singleMode.style.display = 'block';
  batchMode.style.display = 'none';
  katSelect.innerHTML = '<option value="">-- Loading... --</option>';
  
  let options = [];
  
  try {
    if (jenis === 'Pakan') {
      const pakan = await dbGetDaftarPakan();
      options = pakan.map(p => ({val: p.nama_pakan, label: p.nama_pakan, satuan: 'kg'}));
    } else if (jenis === 'Non-Pakan') {
      const katNon = ['vitamin', 'obat', 'vaksin', 'desinfektan', 'lainnya'];
      let stoks = [];
      for(const k of katNon) {
        const s = await dbGetStokNonPakan(k);
        stoks.push(...s.map(x => ({...x, kat_asli: k})));
      }
      options = stoks.map(s => ({val: s.nama, label: s.nama + ' (' + s.satuan + ')', satuan: s.satuan}));
    }
    
    katSelect.innerHTML = '<option value="">-- Pilih Item --</option>';
    options.forEach(o => {
      katSelect.innerHTML += `<option value="${o.val}" data-satuan="${o.satuan}">${o.label}</option>`;
    });
    
    document.getElementById('audit-stok-sistem-text').textContent = '-';
    currentAuditSistem = 0;
    currentAuditSatuan = '';
    document.getElementById('audit-lbl-aktual').textContent = '';
  } catch (e) {
    console.error(e);
    katSelect.innerHTML = '<option value="">Gagal memuat data</option>';
  }
}

let currentBatchTelurSistem = {
  Normal: { butir: 0, kg: 0 },
  Crem: { butir: 0, kg: 0 },
  Bentes: { butir: 0, kg: 0 },
  Ceplokan: { butir: 0, kg: 0 }
};

async function loadAuditBatchTelur() {
  const tglInput = document.getElementById('audit-tanggal');
  const nowStr = (tglInput && tglInput.value) ? tglInput.value : (typeof todayISO === 'function' ? todayISO() : new Date().toLocaleDateString('en-CA'));
  
  const tbody = document.querySelector('#audit-batch-table tbody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:10px; color:#6b7280;">⏳ Menghitung stok sistem...</td></tr>';
  
  try {
    let s;
    if (typeof window.dbGetStokTelurAll === 'function') {
      s = await window.dbGetStokTelurAll(nowStr);
    } else {
      const res = await fetch(`https://clabeuuigpjdkkqifujl.supabase.co/rest/v1/rpc/get_stok_telur_tf_ub?tgl=${nowStr}`, {
        headers: { 'apikey': (typeof SB !== 'undefined' ? SB.key : '') }
      });
      const data = await res.json();
      if(data && data.length > 0) s = data[0];
    }
    
    if (s && s.stok) {
      currentBatchTelurSistem = {
        Normal: { butir: s.stok.Normal?.butir || 0, kg: s.stok.Normal?.kilo || 0 },
        Crem: { butir: s.stok.Crem?.butir || 0, kg: s.stok.Crem?.kilo || 0 },
        Bentes: { butir: s.stok.Bentes?.butir || 0, kg: s.stok.Bentes?.kilo || 0 },
        Ceplokan: { butir: s.stok.Ceplokan?.butir || 0, kg: s.stok.Ceplokan?.kilo || 0 }
      };
    } else {
      throw new Error('Data stok telur kosong');
    }
  } catch(e) {
    console.warn('Fallback stok telur lokal', e);
    if (typeof prod !== 'undefined' && prod.Normal) {
      currentBatchTelurSistem = {
        Normal: { butir: prod.Normal.butir || 0, kg: prod.Normal.kilo || 0 },
        Crem: { butir: prod.Crem?.butir || 0, kg: prod.Crem?.kilo || 0 },
        Bentes: { butir: prod.Bentes?.butir || 0, kg: prod.Bentes?.kilo || 0 },
        Ceplokan: { butir: prod.Ceplokan?.butir || 0, kg: prod.Ceplokan?.kilo || 0 }
      };
    }
  }
  
  const grades = ['Normal', 'Crem', 'Bentes', 'Ceplokan'];
  let html = '';
  
  grades.forEach(g => {
    const sysButir = currentBatchTelurSistem[g].butir;
    const sysKg = currentBatchTelurSistem[g].kg;
    
    html += `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 4px; font-weight:600; color:#374151;">${g}</td>
        <td style="padding:8px 4px; text-align:center; color:#4b5563;">
          <div style="font-size:0.95rem;">${sysButir.toLocaleString('id-ID')}</div>
          <div style="font-size:0.75rem; color:#9ca3af;">${sysKg.toLocaleString('id-ID')} kg</div>
        </td>
        <td style="padding:8px 4px;">
          <input type="number" id="audit-batch-butir-${g}" style="width:100%; min-width:60px; padding:6px; border:1px solid #d1d5db; border-radius:4px; text-align:center;" placeholder="...">
        </td>
        <td style="padding:8px 4px;">
          <input type="number" id="audit-batch-kg-${g}" step="any" style="width:100%; min-width:60px; padding:6px; border:1px solid #d1d5db; border-radius:4px; text-align:center;" placeholder="...">
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

async function loadAuditStokSistem() {
  const jenis = document.getElementById('audit-jenis').value;
  if (jenis === 'Telur') {
    await loadAuditBatchTelur();
    return;
  }

  const katSelect = document.getElementById('audit-kategori');
  const opt = katSelect.options[katSelect.selectedIndex];
  if(!opt || !opt.value) {
    document.getElementById('audit-stok-sistem-text').textContent = '-';
    return;
  }
  
  const val = opt.value;
  currentAuditSatuan = opt.getAttribute('data-satuan');
  document.getElementById('audit-lbl-aktual').textContent = currentAuditSatuan;
  document.getElementById('audit-stok-sistem-text').textContent = 'Menghitung...';
  
  try {
    let stok = 0;
    const tglInput = document.getElementById('audit-tanggal');
    const nowStr = (tglInput && tglInput.value) ? tglInput.value : (typeof todayISO === 'function' ? todayISO() : new Date().toLocaleDateString('en-CA'));
    
    if (jenis === 'Pakan') {
      const s = await SB.rpc('get_stok_pakan_tf_ub');
      stok = parseFloat(s[val] || 0);
    } else if (jenis === 'Non-Pakan') {
       const katNon = ['vitamin', 'obat', 'vaksin', 'desinfektan', 'lainnya'];
       for(const k of katNon) {
         const sr = await dbGetStokNonPakan(k);
         const f = sr.find(x => x.nama === val);
         if (f) { stok = parseFloat(f.stok || 0); break; }
       }
    }
    
    currentAuditSistem = stok;
    const decimals = (jenis === 'Telur' && !val.endsWith('_kg') && val !== 'Ceplokan') ? 0 : 2;
    document.getElementById('audit-stok-sistem-text').textContent = 
      parseFloat(stok).toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' ' + currentAuditSatuan;
      
    calcAuditSelisih();
  } catch (e) {
    console.error(e);
    document.getElementById('audit-stok-sistem-text').textContent = 'Gagal memuat';
  }
}

function calcAuditSelisih() {
  const aktualInput = document.getElementById('audit-stok-aktual').value;
  if (aktualInput === '') {
    document.getElementById('audit-selisih').value = '';
    document.getElementById('audit-selisih-info').textContent = '';
    return;
  }
  
  const aktual = parseFloat(aktualInput);
  const selisih = aktual - currentAuditSistem;
  
  const selInput = document.getElementById('audit-selisih');
  const selInfo = document.getElementById('audit-selisih-info');
  
  const formattedSelisih = Math.abs(selisih).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  selInput.value = (selisih > 0 ? '+' : (selisih < 0 ? '-' : '')) + formattedSelisih;
  
  if (selisih < 0) {
    selInput.style.color = '#dc2626'; // Red
    selInfo.style.color = '#dc2626';
    selInfo.textContent = 'Stok Hilang / Menyusut';
  } else if (selisih > 0) {
    selInput.style.color = '#16a34a'; // Green
    selInfo.style.color = '#16a34a';
    selInfo.textContent = 'Stok Berlebih / Bertambah';
  } else {
    selInput.style.color = '#111827';
    selInfo.style.color = '#111827';
    selInfo.textContent = 'Stok Balance (Sesuai)';
  }
}

async function saveAuditStok() {
  const jenis = document.getElementById('audit-jenis').value;
  const ket = document.getElementById('audit-keterangan').value.trim();
  
  const btn = document.querySelector('#modal-audit-stok .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  
  try {
    const tglInput = document.getElementById('audit-tanggal');
    const tgl = (tglInput && tglInput.value) ? tglInput.value : (typeof todayISO === 'function' ? todayISO() : new Date().toLocaleDateString('en-CA'));
    const userInput = currentUser.name || currentUser.username || 'System';
    
    if (jenis === 'Telur') {
      // BATCH MODE TELUR
      const grades = ['Normal', 'Crem', 'Bentes', 'Ceplokan'];
      let auditPayloads = [];
      let penjualanRows = [];
      
      let hasSelisihTanpaKet = false;
      let hasAnyInput = false;
      
      for (const g of grades) {
        const inputButir = document.getElementById(`audit-batch-butir-${g}`);
        const inputKg = document.getElementById(`audit-batch-kg-${g}`);
        
        const sysButir = currentBatchTelurSistem[g]?.butir || 0;
        const sysKg = currentBatchTelurSistem[g]?.kg || 0;
        
        // Cek Butir
        if (inputButir && inputButir.value !== '') {
          hasAnyInput = true;
          const actButir = parseInt(inputButir.value);
          const selButir = actButir - sysButir;
          if (selButir !== 0 && !ket) hasSelisihTanpaKet = true;
          
          auditPayloads.push({
            tanggal: tgl, jenis_item: jenis, kategori_item: g, satuan: 'butir',
            stok_sistem: sysButir, stok_aktual: actButir, selisih: selButir,
            keterangan: ket, user_input: userInput
          });
          
          if (selButir !== 0) {
            penjualanRows.push({
              pelanggan: 'Susut Audit', grade: g, butir: selButir, kilo: 0,
              harga: 0, total: 'Rp 0', keterangan: ket || 'Penyesuaian stok audit'
            });
          }
        }
        
        // Cek Kg
        if (inputKg && inputKg.value !== '') {
          hasAnyInput = true;
          const actKg = parseFloat(inputKg.value);
          const selKg = actKg - sysKg;
          if (selKg !== 0 && !ket) hasSelisihTanpaKet = true;
          
          auditPayloads.push({
            tanggal: tgl, jenis_item: jenis, kategori_item: g, satuan: 'kg',
            stok_sistem: sysKg, stok_aktual: actKg, selisih: selKg,
            keterangan: ket, user_input: userInput
          });
          
          if (selKg !== 0) {
            // Cek apakah row penjualan untuk grade ini sudah ada (biar digabung)
            const existRow = penjualanRows.find(r => r.grade === g);
            if (existRow) {
              existRow.kilo = selKg;
            } else {
              penjualanRows.push({
                pelanggan: 'Susut Audit', grade: g, butir: 0, kilo: selKg,
                harga: 0, total: 'Rp 0', keterangan: ket || 'Penyesuaian stok audit'
              });
            }
          }
        }
      }
      
      if (!hasAnyInput) {
        showToast('Minimal isi 1 kotak fisik aktual!', 'error');
        btn.disabled = false; btn.textContent = '💾 Simpan Audit';
        return;
      }
      if (hasSelisihTanpaKet) {
        showToast('Keterangan wajib diisi jika ada selisih stok!', 'error');
        btn.disabled = false; btn.textContent = '💾 Simpan Audit';
        return;
      }
      
      // Save audits sequentially or parallel
      for (const payload of auditPayloads) {
        await dbSaveAudit(payload);
      }
      
      // Save to penjualan if needed
      if (penjualanRows.length > 0 && typeof dbSavePenjualan === 'function') {
        await dbSavePenjualan({
          tanggal: tgl, user_input: userInput, rows: penjualanRows, grand_total: 0
        });
        if(typeof renderRiwayatJual === 'function') renderRiwayatJual();
      }
      
      showToast('Audit batch berhasil disimpan!', 'success');
      closeModal('modal-audit-stok');
      if (typeof renderStokTelur === 'function') renderStokTelur();
      
    } else {
      // SINGLE MODE (PAKAN / NON-PAKAN)
      const katSelect = document.getElementById('audit-kategori');
      const opt = katSelect.options[katSelect.selectedIndex];
      
      if(!opt || !opt.value) {
        showToast('Pilih item terlebih dahulu!', 'error');
        btn.disabled = false; btn.textContent = '💾 Simpan Audit';
        return;
      }
      
      const aktualInput = document.getElementById('audit-stok-aktual').value;
      if(aktualInput === '') {
        showToast('Masukkan stok fisik aktual!', 'error');
        btn.disabled = false; btn.textContent = '💾 Simpan Audit';
        return;
      }
      
      const aktual = parseFloat(aktualInput);
      const selisih = aktual - currentAuditSistem;
      
      if (selisih !== 0 && !ket) {
        showToast('Keterangan wajib diisi jika ada selisih stok!', 'error');
        btn.disabled = false; btn.textContent = '💾 Simpan Audit';
        return;
      }
      
      const val = opt.value;
      const payload = {
        tanggal: tgl, jenis_item: jenis, kategori_item: val,
        stok_sistem: currentAuditSistem, stok_aktual: aktual, selisih: selisih,
        satuan: currentAuditSatuan, keterangan: ket, user_input: userInput
      };
      
      await dbSaveAudit(payload);
      showToast('Audit stok berhasil disimpan!', 'success');
      closeModal('modal-audit-stok');
      
      if (jenis === 'Pakan' && typeof renderStokPakan === 'function') renderStokPakan();
    }
  } catch (e) {
    console.error(e);
    showToast('Gagal menyimpan audit.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Audit';
  }
}

// ═══════════════════════════════════════════════════
// RIWAYAT AUDIT STOK
// ═══════════════════════════════════════════════════

async function openRiwayatAuditModal(jenis = 'Telur') {
  const m = document.getElementById('modal-riwayat-audit');
  const list = document.getElementById('riwayat-audit-list');
  if (!m || !list) return;
  
  m.style.display = 'flex';
  list.innerHTML = '<div style="padding:30px;text-align:center;color:#6b7280;">⏳ Memuat riwayat audit...</div>';
  
  try {
    // Ambil data audit terbaru dari database
    const audits = await SB.select('audit_stok_tf_ub', `?jenis_item=eq.${jenis}&order=tanggal.desc,created_at.desc&limit=50`);
    
    if (!audits || audits.length === 0) {
      list.innerHTML = `<div style="padding:30px;text-align:center;color:#6b7280;">Belum ada histori audit untuk item ${jenis}.</div>`;
      return;
    }
    
    let html = '';
    for (const a of audits) {
      const tgl = new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const created = new Date(a.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      
      const isMinus = parseFloat(a.selisih) < 0;
      const isPlus = parseFloat(a.selisih) > 0;
      let badgeColor = '#9ca3af'; // gray (balance)
      let badgeText = 'Balance';
      
      if (isMinus) {
        badgeColor = '#ef4444'; // red
        badgeText = 'Menyusut';
      } else if (isPlus) {
        badgeColor = '#10b981'; // green
        badgeText = 'Bertambah';
      }
      
      const selisihFormat = (isPlus ? '+' : '') + parseFloat(a.selisih).toLocaleString('id-ID') + ' ' + (a.satuan || '');
      
      html += `
        <div style="padding:15px; border-bottom:1px solid #e5e7eb; display:flex; flex-direction:column; gap:8px; background:#fff;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-weight:700; color:#111827; font-size:1.05rem;">${a.kategori_item}</div>
              <div style="font-size:0.85rem; color:#6b7280; display:flex; align-items:center; gap:6px; margin-top:2px;">
                <span style="background:#f3f4f6; padding:2px 6px; border-radius:4px; border:1px solid #e5e7eb;">📅 ${tgl}</span>
                <span>⏰ ${created}</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:700; font-size:1.1rem; color:${badgeColor};">${selisihFormat}</div>
              <div style="font-size:0.75rem; color:#fff; background:${badgeColor}; padding:2px 6px; border-radius:12px; display:inline-block; margin-top:4px;">${badgeText}</div>
            </div>
          </div>
          
          <div style="background:#f9fafb; padding:10px; border-radius:6px; font-size:0.85rem; border:1px dashed #d1d5db;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:#6b7280;">Stok Sistem: <b>${parseFloat(a.stok_sistem).toLocaleString('id-ID')} ${a.satuan||''}</b></span>
              <span style="color:#6b7280;">Fisik Aktual: <b>${parseFloat(a.stok_aktual).toLocaleString('id-ID')} ${a.satuan||''}</b></span>
            </div>
            <div style="color:#374151; border-top:1px dashed #e5e7eb; padding-top:6px; margin-top:4px;">
              📝 <i>"${a.keterangan || 'Tidak ada keterangan'}"</i>
            </div>
            <div style="color:#9ca3af; font-size:0.75rem; margin-top:4px; text-align:right;">
              Oleh: <b>${a.user_input || 'System'}</b>
            </div>
          </div>
          ${ (currentUser && currentUser.role === 'superadmin') ? `
          <div style="margin-top:10px; display:flex; gap:8px; justify-content:flex-end; border-top:1px dashed #e5e7eb; padding-top:10px;">
            <button onclick="editRiwayatAudit('${a.id}')" style="background:none; border:1px solid #d1d5db; border-radius:4px; padding:4px 10px; font-size:0.75rem; color:#4b5563; cursor:pointer; display:flex; align-items:center; gap:4px;"><span style="font-size:0.9rem">✏️</span> Edit</button>
            <button onclick="hapusRiwayatAudit('${a.id}')" style="background:none; border:1px solid #fca5a5; border-radius:4px; padding:4px 10px; font-size:0.75rem; color:#ef4444; cursor:pointer; display:flex; align-items:center; gap:4px;"><span style="font-size:0.9rem">🗑️</span> Hapus</button>
          </div>
          ` : '' }
        </div>
      `;
    }
    
    list.innerHTML = html;
    
  } catch (e) {
    console.error('[Riwayat Audit] Error:', e);
    list.innerHTML = '<div style="padding:30px;text-align:center;color:#ef4444;">Gagal memuat histori audit. Cek koneksi internet.</div>';
  }
}

window.hapusRiwayatAudit = async function(id) {
  if(!confirm('Yakin ingin menghapus histori audit ini?\\n\\nJika audit ini memiliki riwayat otomatis "Susut Audit" di Penjualan, sistem juga akan menghapusnya secara otomatis.')) return;
  try {
    const list = document.getElementById('riwayat-audit-list');
    list.innerHTML = '<div style="padding:30px;text-align:center;color:#6b7280;">⏳ Menghapus...</div>';
    
    // Ambil data audit sebelum dihapus
    const audits = await SB.select('audit_stok_tf_ub', `?id=eq.${id}`);
    const a = audits && audits.length > 0 ? audits[0] : null;
    
    if (a) {
      // Hapus audit
      await SB.delete('audit_stok_tf_ub', `?id=eq.${id}`);
      
      // Hapus penjualan terkait (Susut Audit) jika ada
      if (a.jenis_item === 'Telur' && parseFloat(a.selisih) !== 0 && typeof dbGetPenjualan === 'function') {
        const pRows = await dbGetPenjualan({dari: a.tanggal, sampai: a.tanggal, limit: 1});
        if (pRows && pRows.length > 0) {
          const p = pRows[0];
          let rows = p.rows || [];
          const idx = rows.findIndex(r => r.pelanggan === 'Susut Audit' && r.grade === a.kategori_item && 
                 ((a.satuan === 'butir' && r.butir == a.selisih) || (a.satuan === 'kg' && r.kilo == a.selisih)));
          if (idx !== -1) {
            rows.splice(idx, 1);
            if (typeof window.dbUpdatePenjualanWithOffline === 'function') {
              await window.dbUpdatePenjualanWithOffline(p.id, rows, rows.reduce((sum, r) => sum + (parseInt((r.total||'').replace(/[^0-9]/g,''))||0), 0), p.tanggal);
            } else if (typeof window.dbUpdatePenjualanRows === 'function') {
              await window.dbUpdatePenjualanRows(p.id, rows);
            } else {
              await SB.update('penjualan_tf_ub', {rows: rows}, `?id=eq.${p.id}`);
            }
          }
        }
      }
    }
    showToast('Histori audit berhasil dihapus!', 'success');
    openRiwayatAuditModal();
    if (typeof renderStokTelur === 'function') renderStokTelur();
    if (typeof renderRiwayatJual === 'function') renderRiwayatJual();
  } catch(e) {
    console.error(e);
    showToast('Gagal menghapus audit!', 'error');
    openRiwayatAuditModal();
  }
};

window.editRiwayatAudit = async function(id) {
  try {
    const list = document.getElementById('riwayat-audit-list');
    const audits = await SB.select('audit_stok_tf_ub', `?id=eq.${id}`);
    const a = audits && audits.length > 0 ? audits[0] : null;
    if (!a) {
      showToast('Data audit tidak ditemukan!', 'error');
      return;
    }
    
    const newAktualStr = prompt(`EDIT AUDIT (${a.kategori_item})\\nStok Sistem: ${a.stok_sistem} ${a.satuan}\\nMasukkan Fisik Aktual yang baru:`, a.stok_aktual);
    if (newAktualStr === null) return; // User membatalkan
    
    const newAktual = parseFloat(newAktualStr);
    if (isNaN(newAktual)) {
      showToast('Angka tidak valid!', 'error');
      return;
    }
    
    const newKet = prompt(`Masukkan Keterangan baru:`, a.keterangan || '');
    if (newKet === null) return; // User membatalkan
    
    const newSelisih = newAktual - parseFloat(a.stok_sistem);
    if (newSelisih !== 0 && newKet.trim() === '') {
      showToast('Keterangan wajib diisi jika ada selisih!', 'error');
      return;
    }
    
    list.innerHTML = '<div style="padding:30px;text-align:center;color:#6b7280;">⏳ Menyimpan...</div>';
    
    // Update audit
    await SB.update('audit_stok_tf_ub', {
      stok_aktual: newAktual,
      selisih: newSelisih,
      keterangan: newKet
    }, `?id=eq.${id}`);
    
    // Update penjualan terkait (Susut Audit) jika ada
    if (a.jenis_item === 'Telur' && typeof dbGetPenjualan === 'function') {
      const pRows = await dbGetPenjualan({dari: a.tanggal, sampai: a.tanggal, limit: 1});
      if (pRows && pRows.length > 0) {
        const p = pRows[0];
        let rows = p.rows || [];
        // Cari riwayat Susut Audit lama berdasarkan selisih lama
        const idx = rows.findIndex(r => r.pelanggan === 'Susut Audit' && r.grade === a.kategori_item && 
               ((a.satuan === 'butir' && r.butir == a.selisih) || (a.satuan === 'kg' && r.kilo == a.selisih)));
               
        if (idx !== -1) {
          if (newSelisih === 0) {
            // Hapus row jika selisih baru 0
            rows.splice(idx, 1);
          } else {
            // Update row
            rows[idx].butir = (a.satuan === 'butir') ? newSelisih : 0;
            rows[idx].kilo = (a.satuan === 'kg') ? newSelisih : 0;
            rows[idx].keterangan = newKet;
          }
          if (typeof window.dbUpdatePenjualanWithOffline === 'function') {
            await window.dbUpdatePenjualanWithOffline(p.id, rows, rows.reduce((sum, r) => sum + (parseInt((r.total||'').replace(/[^0-9]/g,''))||0), 0), p.tanggal);
          } else {
            await SB.update('penjualan_tf_ub', {rows: rows}, `?id=eq.${p.id}`);
          }
        } else if (newSelisih !== 0) {
          // Buat baru jika sebelumnya tidak ada (karena selisih lama 0)
          rows.push({
            pelanggan: 'Susut Audit',
            grade: a.kategori_item,
            butir: (a.satuan === 'butir') ? newSelisih : 0,
            kilo: (a.satuan === 'kg') ? newSelisih : 0,
            harga: 0,
            total: 'Rp 0',
            keterangan: newKet || 'Penyesuaian stok audit'
          });
          if (typeof window.dbUpdatePenjualanWithOffline === 'function') {
            await window.dbUpdatePenjualanWithOffline(p.id, rows, rows.reduce((sum, r) => sum + (parseInt((r.total||'').replace(/[^0-9]/g,''))||0), 0), p.tanggal);
          } else {
            await SB.update('penjualan_tf_ub', {rows: rows}, `?id=eq.${p.id}`);
          }
        }
      }
    }
    
    showToast('Histori audit berhasil diupdate!', 'success');
    openRiwayatAuditModal();
    if (typeof renderStokTelur === 'function') renderStokTelur();
    if (typeof renderRiwayatJual === 'function') renderRiwayatJual();
  } catch(e) {
    console.error(e);
    showToast('Gagal update audit!', 'error');
    openRiwayatAuditModal();
  }
};
