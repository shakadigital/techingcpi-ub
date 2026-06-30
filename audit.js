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
  katSelect.innerHTML = '<option value="">-- Loading... --</option>';
  
  let options = [];
  
  try {
    if (jenis === 'Telur') {
      options = [
        {val: 'Normal', label: 'Normal (Butir)', satuan: 'butir'},
        {val: 'Normal_kg', label: 'Normal (Kg)', satuan: 'kg'},
        {val: 'Crem', label: 'Crem (Butir)', satuan: 'butir'},
        {val: 'Crem_kg', label: 'Crem (Kg)', satuan: 'kg'},
        {val: 'Retak', label: 'Retak (Butir)', satuan: 'butir'},
        {val: 'Retak_kg', label: 'Retak (Kg)', satuan: 'kg'},
        {val: 'Bentes', label: 'Bentes (Butir)', satuan: 'butir'},
        {val: 'Bentes_kg', label: 'Bentes (Kg)', satuan: 'kg'},
        {val: 'Ceplokan', label: 'Ceplokan (Butir)', satuan: 'butir'},
      ];
    } else if (jenis === 'Pakan') {
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

async function loadAuditStokSistem() {
  const jenis = document.getElementById('audit-jenis').value;
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
    
    if (jenis === 'Telur') {
      let s;
      try {
        s = typeof getStokTelur === 'function' ? await getStokTelur(nowStr) : await window.dbGetStokTelur(nowStr);
      } catch(e) {
        s = await SB.rpc('get_stok_telur_tf_ub', { p_sampai: nowStr });
      }
      if (val.endsWith('_kg')) {
        const grade = val.replace('_kg', '');
        stok = parseFloat(s[grade]?.kilo || 0);
      } else {
        const grade = val;
        stok = parseInt(s[grade]?.butir || 0);
      }
    } else if (jenis === 'Pakan') {
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
  const katSelect = document.getElementById('audit-kategori');
  const opt = katSelect.options[katSelect.selectedIndex];
  
  if(!opt || !opt.value) {
    showToast('Pilih item terlebih dahulu!', 'error');
    return;
  }
  
  const aktualInput = document.getElementById('audit-stok-aktual').value;
  if(aktualInput === '') {
    showToast('Masukkan stok fisik aktual!', 'error');
    return;
  }
  
  const ket = document.getElementById('audit-keterangan').value.trim();
  const aktual = parseFloat(aktualInput);
  const selisih = aktual - currentAuditSistem;
  
  if (selisih !== 0 && !ket) {
    showToast('Keterangan wajib diisi jika ada selisih stok!', 'error');
    return;
  }
  
  let val = opt.value;
  if (jenis === 'Telur' && val.endsWith('_kg')) val = val.replace('_kg', '');
  
  const btn = document.querySelector('#modal-audit-stok .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  
  try {
    const tglInput = document.getElementById('audit-tanggal');
    const tgl = (tglInput && tglInput.value) ? tglInput.value : (typeof todayISO === 'function' ? todayISO() : new Date().toLocaleDateString('en-CA'));
    
    const payload = {
      tanggal: tgl,
      jenis_item: jenis,
      kategori_item: val,
      stok_sistem: currentAuditSistem,
      stok_aktual: aktual,
      selisih: selisih,
      satuan: currentAuditSatuan,
      keterangan: ket,
      user_input: currentUser.name || currentUser.username || 'System'
    };
    
    await dbSaveAudit(payload);
    showToast('Audit stok berhasil disimpan!', 'success');
    closeModal('modal-audit-stok');
    
    // Refresh UI terkait
    if (jenis === 'Telur') {
      if (typeof renderStokTelur === 'function') renderStokTelur();
    } else if (jenis === 'Pakan') {
      if (typeof renderStokPakan === 'function') renderStokPakan();
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
        </div>
      `;
    }
    
    list.innerHTML = html;
    
  } catch (e) {
    console.error('[Riwayat Audit] Error:', e);
    list.innerHTML = '<div style="padding:30px;text-align:center;color:#ef4444;">Gagal memuat histori audit. Cek koneksi internet.</div>';
  }
}
