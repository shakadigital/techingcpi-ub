// ═══════════════════════════════════════════════════
// TEACHING FARM UB - AUDIT STOK LOGIC
// ═══════════════════════════════════════════════════

let currentAuditSistem = 0;
let currentAuditSatuan = '';

function openAuditModal(jenis = 'Telur') {
  if (currentUser.role !== 'Supervisor' && currentUser.role !== 'Admin') {
    showToast('Hanya Supervisor dan Admin yang dapat melakukan audit stok.', 'error');
    return;
  }
  
  const m = document.getElementById('modal-audit-stok');
  if(!m) return;
  m.classList.add('show');
  
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
        {val: 'Bentes kering', label: 'Bentes Kering (Butir)', satuan: 'butir'},
        {val: 'Bentes kering_kg', label: 'Bentes Kering (Kg)', satuan: 'kg'},
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
    const nowStr = new Date().toLocaleDateString('en-CA');
    
    if (jenis === 'Telur') {
      const s = await SB.rpc('get_stok_telur_tf_ub', { p_sampai: nowStr });
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
    document.getElementById('audit-stok-sistem-text').textContent = 
      formatRibuan(stok.toFixed(jenis === 'Telur' && !val.endsWith('_kg') && val !== 'Ceplokan' ? 0 : 2)) + ' ' + currentAuditSatuan;
      
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
  
  selInput.value = (selisih > 0 ? '+' : '') + formatRibuan(selisih.toFixed(2));
  
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
    const payload = {
      tanggal: new Date().toLocaleDateString('en-CA'),
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
