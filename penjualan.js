// ═══ MODULE: penjualan.js ═══
// Penjualan functions: populatePelangganSelect, onPelangganChange, getSalePelanggan,
// populateAllPelangganSelects, addSaleRow, removeSaleRow, calcTotal, calcSaleTotal,
// getStokTelur, renderStokTelur, loadHargaPasarJual, saveHargaPasarFromJual,
// savePenjualan, resetPenjualan, renderRiwayatJual, hapusPenjualan, exportRiwayatJual

async function populatePelangganSelect(sel){
  if(!sel) return;
  const prev = sel.value;
  sel.innerHTML = `
    <option value="Warga & Partai">Warga & Partai</option>
    <option value="Bakul">Bakul</option>
  `;
  if(prev) sel.value = prev;
}

function onPelangganChange(sel){
  // Fungsi ini sudah tidak diperlukan karena input teks selalu muncul
}

function onGradeChange(sel){
  const card = sel.closest('.sale-row');
  if(!card) return;
  const hargaInput = card.querySelectorAll('input[type="number"]')[2];
  if(hargaInput) {
    if(sel.value === 'Busuk') {
      hargaInput.value = '0';
      calcTotal(hargaInput);
    }
  }
}

function getSalePelanggan(card){
  const sel = card.querySelector('.pelanggan-select');
  const txt = card.querySelector('.pelanggan-text');
  
  const kategori = sel ? sel.value : '';
  const nama = txt ? txt.value.trim() : '';
  
  if(!nama) return ''; // Kosong (akan dicegat saat validasi)
  if(!kategori) return nama;
  
  return `${nama} (${kategori})`;
}

async function populateAllPelangganSelects(){
  const selects = document.querySelectorAll('.pelanggan-select');
  for(const sel of selects){
    await populatePelangganSelect(sel);
  }
}

function addSaleRow(){
  const card=document.createElement('div');
  card.className='sale-card sale-row';
  card.innerHTML=
    '<button class="btn-del-card" onclick="removeSaleRow(this)">✕</button>'+
    '<div class="sc-row"><div class="sc-field" style="grid-column:1/-1"><label>Kategori & Nama Pelanggan <span style="color:red">*</span></label>'+
      '<select class="pelanggan-select" style="margin-bottom:6px"><option value="Warga & Partai">Warga & Partai</option></select>'+
      '<input type="text" class="pelanggan-text" placeholder="Ketik nama pelanggan..." style="display:block; width:100%"/>'+
    '</div></div>'+
    '<div class="sc-row three">'+
      '<div class="sc-field"><label>Grade</label><select class="grade-select" onchange="onGradeChange(this)"><option value="">-- Grade --</option><option>Normal</option><option>Crem</option><option>Bentes</option><option>Ceplokan</option></select></div>'+
      '<div class="sc-field"><label>Butir</label><input type="number" min="0" placeholder="0" oninput="calcTotal(this)"/></div>'+
      '<div class="sc-field"><label>Kilo (kg)</label><input type="number" min="0" step="0.01" placeholder="0" oninput="calcTotal(this)"/></div>'+
    '</div>'+
    '<div class="sc-row"><div class="sc-field"><label>Harga/kg (Rp)</label><input type="number" min="0" step="100" placeholder="0" oninput="calcTotal(this)"/></div></div>'+
    '<div class="sc-row" style="margin-top:8px;"><div class="sc-field"><label>Waktu DO</label><div style="display:flex; gap:16px; margin-top:4px;">'+
    '<label style="display:flex; align-items:center; gap:6px; font-weight:normal;"><input type="radio" class="do-radio" name="waktu_do_'+Date.now()+'" value="DO Pagi" checked> DO Pagi</label>'+
    '<label style="display:flex; align-items:center; gap:6px; font-weight:normal;"><input type="radio" class="do-radio" name="waktu_do_'+Date.now()+'" value="DO Siang"> DO Siang</label>'+
    '</div></div></div>'+
    '<div class="sc-total"><span>Total</span><strong class="total-col">Rp 0</strong></div>';
  document.getElementById('sale-tbody').appendChild(card);
  populatePelangganSelect(card.querySelector('.pelanggan-select'));
}
function removeSaleRow(btn){
  if(document.querySelectorAll('.sale-row').length<=1)return;
  btn.closest('.sale-row').remove();calcSaleTotal();
}
function calcTotal(inp){
  const card=inp.closest('.sale-row');
  const nums=card.querySelectorAll('input[type="number"]');
  // nums[0]=butir, nums[1]=kilo, nums[2]=harga
  const kilo=parseFloat(nums[1]?.value)||0;
  const harga=parseFloat(nums[2]?.value)||0;
  card.querySelector('.total-col').textContent='Rp '+(kilo*harga).toLocaleString('id-ID');
  calcSaleTotal();
}
function calcSaleTotal(){
  let g=0;
  document.querySelectorAll('.sale-row .total-col').forEach(el=>{
    g+=parseInt(el.textContent.replace(/[^0-9]/g,''))||0;
  });
  document.getElementById('grand_total').value='Rp '+g.toLocaleString('id-ID');
}
// ═══ STOK TELUR KUMULATIF ═══
async function getStokTelur(tgl){
  // Coba server-side dulu (lebih cepat, tidak fetch semua data)
  if(typeof dbGetStokTelur === 'function') {
    try {
      const serverStok = await dbGetStokTelur(tgl);
      if(serverStok && serverStok['Normal']) {
        if (serverStok['Bentes kering'] && !serverStok['Bentes']) {
          serverStok['Bentes'] = serverStok['Bentes kering'];
        }
        if (serverStok['Retak']) {
          serverStok['Bentes'].butir += serverStok['Retak'].butir || 0;
          serverStok['Bentes'].kilo += serverStok['Retak'].kilo || 0;
        }
        return serverStok;
      }
    } catch { /* fallback ke client-side */ }
  }
  
  // Fallback: client-side calculation
  const prod={'Normal':{butir:0,kilo:0},'Crem':{butir:0,kilo:0},'Bentes':{butir:0,kilo:0},'Ceplokan':{butir:0,kilo:0}};
  const inputs=await dbGetInput({sampai:tgl});
  inputs.forEach(row=>{
    const d=row.data;if(!d||!d.produksi)return;
    const mapping={'normal':'Normal','crem':'Crem','bentes_kering':'Bentes','ceplokan':'Ceplokan'};
    Object.keys(mapping).forEach(g=>{
      const G=mapping[g];
      prod[G].butir+=parseInt(d.produksi[g]?.butir)||0;
      prod[G].kilo+=parseFloat(d.produksi[g]?.kilo)||0;
    });
    if(d.produksi.cream){prod['Crem'].butir+=parseInt(d.produksi.cream.butir)||0;prod['Crem'].kilo+=parseFloat(d.produksi.cream.kilo)||0;}
    if(d.produksi.retak){prod['Bentes'].butir+=parseInt(d.produksi.retak.butir)||0;prod['Bentes'].kilo+=parseFloat(d.produksi.retak.kilo)||0;}
  });
  const juals=await dbGetPenjualan({sampai:tgl, limit:9999});
  juals.forEach(j=>{
    (j.rows||[]).forEach(r=>{
      let G=r.grade;
      if (G === 'Cream') G = 'Crem';
      if (G === 'Busuk') G = 'Normal';
      if (G === 'Waste') G = 'Bentes';
      if (G === 'Retak') G = 'Bentes';
      
      if(prod[G]){
        prod[G].butir=Math.max(0,prod[G].butir-(parseInt(r.butir)||0));
        prod[G].kilo=Math.max(0,prod[G].kilo-(parseFloat(r.kilo)||0));
      }
    });
  });
  return prod;
}

async function renderStokTelur(){
  const tgl=document.getElementById('jual-tanggal').value||new Date().toISOString().split('T')[0];
  const el=document.getElementById('stok-telur-body');
  el.innerHTML='<div style="color:#aaa;font-size:.85rem;text-align:center;padding:8px">⏳ Menghitung stok...</div>';
  const stok=await getStokTelur(tgl);
  let audits = [];
  try { audits = await dbGetAudit({ dari: tgl, sampai: tgl, jenis_item: 'Telur' }); } catch(e) {}
  let totalSysButir = 0, totalSysKilo = 0;
  let totalActButir = 0, totalActKilo = 0;
  let hasAuditButir = false, hasAuditKilo = false;
  
  // Ambil data penjualan untuk mengecek apakah Susut sudah terpotong
  let juals = [];
  try { juals = await dbGetPenjualan({sampai: tgl, limit: 9999}); } catch(e){}

  const getDisp = (g, sat, val) => {
    const a = audits.find(x => x.kategori_item === g && x.satuan === sat);
    if (a && a.stok_aktual != null && a.selisih != null) {
      // Cek apakah audit ini sudah dicatat di Penjualan (fitur baru)
      let isDeducted = false;
      juals.forEach(j => {
        if (j.tanggal === a.tanggal) {
          (j.rows||[]).forEach(r => {
            if (r.pelanggan === 'Susut Audit' && r.grade === g) isDeducted = true;
          });
        }
      });
      
      const aktual = sat === 'butir' ? parseInt(a.stok_aktual) : parseFloat(a.stok_aktual);
      const sel = sat === 'butir' ? parseInt(a.selisih) : parseFloat(a.selisih);
      
      // Jika sudah dipotong di Penjualan, val adalah stok aktual. Maka teoritis = val + selisih.
      // Jika belum dipotong, val adalah stok teoritis.
      const sysVal = isDeducted ? (val + sel) : val;
      
      if (sat === 'butir') {
        totalSysButir += sysVal;
        totalActButir += aktual;
        hasAuditButir = true;
        return `${sysVal.toLocaleString('id-ID')} / <span style="color:#0284c7">${aktual.toLocaleString('id-ID')}</span>`;
      }
      
      totalSysKilo += sysVal;
      totalActKilo += aktual;
      hasAuditKilo = true;
      return `${sysVal.toFixed(2)} / <span style="color:#0284c7">${aktual.toFixed(2)}</span>`;
    }
    
    // Fallback jika tidak ada audit di hari tersebut
    if (sat === 'butir') {
      totalSysButir += val;
      totalActButir += val;
      return val.toLocaleString('id-ID');
    }
    totalSysKilo += val;
    totalActKilo += val;
    return val.toFixed(2);
  };

  const grades=['Normal','Crem','Bentes','Ceplokan'];
  
  const tbodyHtml = grades.map(g => {
    return '<tr><td>'+g+'</td><td style="font-weight:700;color:'+(stok[g].butir>0?'#1b4332':'#dc2626')+'">'+getDisp(g, 'butir', stok[g].butir)+'</td><td>'+getDisp(g, 'kg', stok[g].kilo)+' kg</td></tr>';
  }).join('');
  
  const totalButirDisp = hasAuditButir 
    ? `${totalSysButir.toLocaleString('id-ID')} / <span style="color:#0284c7">${totalActButir.toLocaleString('id-ID')}</span>`
    : totalSysButir.toLocaleString('id-ID');
    
  const totalKiloDisp = hasAuditKilo 
    ? `${totalSysKilo.toFixed(2)} / <span style="color:#0284c7">${totalActKilo.toFixed(2)}</span>`
    : totalSysKilo.toFixed(2);

  el.innerHTML=
    '<table class="tbl" style="margin-bottom:0">'+
    '<thead><tr><th>Grade</th><th>Stok (butir)</th><th>Stok (kg)</th></tr></thead><tbody>'+
    tbodyHtml+
    '<tr class="total-row"><td>TOTAL</td><td>'+totalButirDisp+'</td><td>'+totalKiloDisp+' kg</td></tr>'+
    '</tbody></table>'+
    '<div style="font-size:.75rem;color:#888;margin-top:8px">Kumulatif produksi s.d. '+tgl+'. Angka biru adalah stok aktual dari audit.</div>';
    
  if (typeof renderHistoriStok7Hari === 'function') {
    renderHistoriStok7Hari(tgl);
  }
}

// ═══ HARGA PASAR DI HALAMAN JUAL ═══
async function loadHargaPasarJual() {
  const tgl = document.getElementById('jual-tanggal').value || new Date().toISOString().split('T')[0];
  const el = document.getElementById('jual-harga-pasar');
  const statusEl = document.getElementById('jual-hp-status');
  if(!el) return;

  // Cek apakah sudah ada harga pasar di input_harian hari ini (dari kandang manapun)
  const inputs = await dbGetInput({tanggal: tgl});
  let hargaFromInput = 0;
  inputs.forEach(r => {
    if(r.data?.harga_pasar && parseFloat(r.data.harga_pasar) > 0) {
      hargaFromInput = parseFloat(r.data.harga_pasar);
    }
  });

  if(hargaFromInput > 0 && currentUser?.role !== 'superadmin') {
    el.value = parseInt(hargaFromInput, 10).toLocaleString('id-ID');
    el.readOnly = true;
    el.style.opacity = '0.7';
    el.title = 'Harga ikut input produksi harian';
    statusEl.innerHTML = '✅ <span style="color:#2d6a4f">Sudah diinput di halaman Input</span>';
  } else {
    if(hargaFromInput > 0) el.value = parseInt(hargaFromInput, 10).toLocaleString('id-ID');
    el.readOnly = false;
    el.style.opacity = '1';
    el.title = '';
    statusEl.innerHTML = '⚠️ <span style="color:#b45309">Belum diinput hari ini</span>';
  }
}

async function saveHargaPasarFromJual() {
  const tgl = document.getElementById('jual-tanggal').value || new Date().toISOString().split('T')[0];
  const harga = unformatRibuan(document.getElementById('jual-harga-pasar').value) || 0;
  if(!harga) return;

  // Simpan ke semua input_harian hari ini yang belum punya harga_pasar
  const inputs = await dbGetInput({tanggal: tgl});
  if(inputs.length > 0) {
    for(const row of inputs) {
      if(!row.data?.harga_pasar || parseFloat(row.data.harga_pasar) === 0) {
        const updatedData = { ...row.data, harga_pasar: harga };
        await dbSaveInput(tgl, row.kandang, updatedData);
      }
    }
    showToast('✅ Harga pasar Rp ' + harga.toLocaleString('id-ID') + '/kg tersimpan');
  } else {
    // Belum ada input harian — simpan ke kandang pertama yang aktif
    const kandangList = cache.get('kandang_list') || await dbGetKandang();
    const aktif = kandangList.find(k => k.status === 'Aktif');
    if(aktif) {
      await dbSaveInput(tgl, aktif.nama, { tanggal: tgl, kandang: aktif.nama, user: currentUser?.username || '', harga_pasar: harga });
      showToast('✅ Harga pasar Rp ' + harga.toLocaleString('id-ID') + '/kg tersimpan');
    }
  }

  // Update status
  const statusEl = document.getElementById('jual-hp-status');
  if(statusEl) statusEl.innerHTML = '✅ <span style="color:#2d6a4f">Tersimpan</span>';
  if (currentUser?.role !== 'superadmin') {
    document.getElementById('jual-harga-pasar').readOnly = true;
    document.getElementById('jual-harga-pasar').style.opacity = '0.7';
  }
}

// ═══ PENJUALAN ═══
async function savePenjualan(){
  if(!can('JUAL')){showToast('Tidak ada akses!');return;}
  const tgl=document.getElementById('jual-tanggal').value;
  if(!tgl){showToast('⚠️ Pilih tanggal!');return;}
  const rows=[...document.querySelectorAll('.sale-row')].map(r=>{
    const nums=r.querySelectorAll('input[type="number"]');
    const gradeSel=r.querySelector('.sc-row.three select');
    return{
      pelanggan:getSalePelanggan(r),
      grade:gradeSel?.value||'',
      butir:parseFloat(nums[0]?.value)||0,
      kilo:parseFloat(nums[1]?.value)||0,
      harga:parseFloat(nums[2]?.value)||0,
      total:r.querySelector('.total-col')?.textContent||'Rp 0',
      keterangan: r.querySelector('.do-radio:checked')?.value || 'DO Pagi'
    };
  }).filter(r=>r.kilo||r.butir);

  if(!rows.length){showToast('⚠️ Isi minimal satu baris penjualan!');return;}

  // Validasi: pastikan nama pelanggan diisi
  let isNamaKosong = false;
  document.querySelectorAll('.sale-row').forEach(r => {
    const txt = r.querySelector('.pelanggan-text');
    if(txt && !txt.value.trim()) isNamaKosong = true;
  });

  if(isNamaKosong){
    showToast('⚠️ Nama pelanggan wajib diisi!');
    return;
  }

  // Validasi setiap baris
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    const no=i+1;
    if(!r.grade){showToast(`⚠️ Baris ${no}: Grade wajib dipilih!`);return;}
    if(!r.butir&&!r.kilo){showToast(`⚠️ Baris ${no}: Isi jumlah butir atau kilo!`);return;}
    if(r.butir<0||r.kilo<0){showToast(`⚠️ Baris ${no}: Jumlah tidak boleh negatif!`);return;}
    if(r.grade !== 'Busuk' && r.grade !== 'Waste' && r.harga<=0){showToast(`⚠️ Baris ${no}: Harga per kg wajib diisi!`);return;}
    if(!r.pelanggan){showToast(`⚠️ Baris ${no}: Nama pelanggan wajib diisi!`);return;}
  }

  showToast('⏳ Memeriksa harga DO dan stok...');

  let needPagi = rows.some(r => r.keterangan === 'DO Pagi');
  let needSiang = rows.some(r => r.keterangan === 'DO Siang');

  let hargaPagi = 0;
  let hargaSiang = 0;

  if (needPagi) {
    const dateObj = new Date(tgl);
    dateObj.setDate(dateObj.getDate() - 1);
    const tglKemarin = dateObj.toISOString().split('T')[0];
    
    const inputsPagi = await dbGetInput({tanggal: tglKemarin});
    inputsPagi.forEach(r => {
      if(r.data?.harga_pasar && parseFloat(r.data.harga_pasar) > 0) {
        hargaPagi = parseFloat(r.data.harga_pasar);
      }
    });
    if (hargaPagi <= 0) {
      showToast(`⚠️ Harga DO Pagi (patokan ${fmtTgl(tglKemarin)}) belum diinput di halaman Input Harian!`);
      return;
    }
  }

  if (needSiang) {
    const inputsSiang = await dbGetInput({tanggal: tgl});
    inputsSiang.forEach(r => {
      if(r.data?.harga_pasar && parseFloat(r.data.harga_pasar) > 0) {
        hargaSiang = parseFloat(r.data.harga_pasar);
      }
    });
    if (hargaSiang <= 0) {
      showToast(`⚠️ Harga DO Siang (patokan ${fmtTgl(tgl)}) belum diinput di halaman Input Harian!`);
      return;
    }
  }

  // Update keterangan baris penjualan
  rows.forEach(r => {
    if (r.keterangan === 'DO Pagi') {
      r.keterangan = `P ${hargaPagi.toLocaleString('id-ID')}`;
    } else if (r.keterangan === 'DO Siang') {
      r.keterangan = `S ${hargaSiang.toLocaleString('id-ID')}`;
    }
  });

  const stok=await getStokTelur(tgl);
  const jualPerGrade={};
  rows.forEach(r=>{const G=r.grade;if(G)jualPerGrade[G]=(jualPerGrade[G]||0)+(parseInt(r.butir)||0);});
  for(const G in jualPerGrade){
    if(stok[G]!==undefined&&jualPerGrade[G]>stok[G].butir){
      showToast('⚠️ Stok '+G+' tidak cukup! Tersedia: '+stok[G].butir+' butir');return;
    }
  }
  const grandTotal=parseInt(document.getElementById('grand_total').value.replace(/[^0-9]/g,''))||0;
  try{
    await dbSavePenjualan({tanggal:tgl,user_input:currentUser?currentUser.username:'',rows,grand_total:grandTotal});
    await renderStokTelur();await renderRiwayatJual();
    showToast('✅ Penjualan disimpan!');
    resetPenjualan();
  }catch(e){showToast('❌ Gagal menyimpan: '+e.message);}
}

async function saveWasteOnly() {
  if(!can('JUAL')){showToast('Tidak ada akses!');return;}
  const tgl=document.getElementById('jual-tanggal').value;
  if(!tgl){showToast('⚠️ Pilih tanggal!');return;}
  
  const wButir = parseFloat(document.getElementById('waste_butir')?.value) || 0;
  const wKilo = parseFloat(document.getElementById('waste_kilo')?.value) || 0;
  const wKet = document.getElementById('waste_ket')?.value || '';
  
  if (wButir <= 0 && wKilo <= 0) {
    showToast('⚠️ Isi jumlah butir atau berat kilo waste!');
    return;
  }
  
  showToast('⏳ Memeriksa stok...');
  const stok=await getStokTelur(tgl);
  if(wButir>stok.butir||wKilo>stok.kilo){
    if(!confirm(`Stok tidak cukup! Tersedia: ${stok.butir} btr / ${stok.kilo} kg.\nTetap simpan waste?`))return;
  }
  
  const row = {
    pelanggan: 'Internal',
    grade: 'Waste',
    butir: wButir,
    kilo: wKilo,
    harga: 0,
    total: 'Rp 0',
    keterangan: wKet
  };
  
  try {
    document.querySelector('#waste-card-penjualan .btn-save').disabled = true;
    document.querySelector('#waste-card-penjualan .btn-save').textContent = '⏳ Menyimpan...';
    
    await dbSavePenjualan({tanggal:tgl,user_input:currentUser?currentUser.username:'',rows:[row],grand_total:0});
    await renderStokTelur();await renderRiwayatJual();
    if(typeof renderRiwayatWaste === 'function') await renderRiwayatWaste();
    
    document.getElementById('waste_butir').value=0;
    document.getElementById('waste_kilo').value=0;
    document.getElementById('waste_ket').value='';
    showToast('✅ Waste berhasil disimpan!');
  } catch(e) {
    showToast('❌ Gagal menyimpan waste: '+e.message);
  } finally {
    const btn = document.querySelector('#waste-card-penjualan .btn-save');
    if(btn) {
      btn.disabled = false;
      btn.innerHTML = '💾 Simpan Waste';
    }
  }
}

function resetPenjualan(){
  document.getElementById('jual-tanggal').value=new Date().toISOString().split('T')[0];
  const sb=document.getElementById('sale-tbody');
  [...sb.querySelectorAll('.sale-row')].slice(1).forEach(r=>r.remove());
  const first=sb.querySelector('.sale-row');
  if(first){
    first.querySelectorAll('input').forEach(i=>i.value='');
    const pelSel=first.querySelector('.pelanggan-select');
    if(pelSel) pelSel.value='';
    const pelTxt=first.querySelector('.pelanggan-text');
    if(pelTxt){pelTxt.value='';pelTxt.style.display='none';}
    const gradeSel=first.querySelector('.sc-row.three select');
    if(gradeSel) gradeSel.value='';
    const tc=first.querySelector('.total-col');
    if(tc)tc.textContent='Rp 0';
  }
  document.getElementById('grand_total').value='';
  calcSaleTotal();
  renderStokTelur();
  showToast('🔄 Form direset!');
}

async function renderRiwayatJual(){
  const inputDari = document.getElementById('filter-riwayat-dari');
  const inputSampai = document.getElementById('filter-riwayat-sampai');
  
  if (inputDari && inputSampai && (!inputDari.value || !inputSampai.value)) {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 6); // 7 days including today
    inputSampai.value = today.toISOString().split('T')[0];
    inputDari.value = lastWeek.toISOString().split('T')[0];
  }
  
  const filter = {};
  if (inputDari && inputDari.value) filter.dari = inputDari.value;
  if (inputSampai && inputSampai.value) filter.sampai = inputSampai.value;
  filter.limit = 9999;
  
  const all=await dbGetPenjualan(filter);
  const tbody=document.getElementById('riwayat-jual-tbody');
  const empty=document.getElementById('riwayat-jual-empty');
  tbody.innerHTML='';
  
  let hasData = false;
  const isAdmin=currentUser?.role==='admin'||currentUser?.role==='superadmin';
  
  all.forEach(rec=>{
    const rows=rec.rows||[];
    rows.forEach((r,i)=>{
      const isWaste = r.grade === 'Waste';
      const isBusuk = r.grade === 'Busuk';
      const isSusut = r.pelanggan === 'Susut Audit';
      
      // Filter out waste and audit from Riwayat Penjualan
      if (isWaste || isBusuk || isSusut) return;
      
      hasData = true;
      const tr=document.createElement('tr');
      const st = '';
      const fw = '';
      const ar = 'text-align:right;';
      
      const canEdit = isAdmin || ['supervisor', 'staff'].includes(currentUser?.role);
      const canDelete = isAdmin;
      
      let aksiCell = '<td style="text-align:center;vertical-align:middle;white-space:nowrap;">';
      if (canEdit) aksiCell += `<button onclick="editPenjualanItem('${rec.id}', ${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#0ea5e9;margin-right:6px;" title="Edit item ini">✏️</button>`;
      if (canDelete) aksiCell += `<button onclick="hapusPenjualanItem('${rec.id}', ${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#dc2626" title="Hapus item ini">🗑️</button>`;
      aksiCell += '</td>';

      const dateStr = fmtTgl(rec.tanggal).replace(/\d{4}$/, match => match.slice(2));
      const tButir = (r.butir||0).toLocaleString('id-ID');
      const tKilo = (r.kilo||0).toLocaleString('id-ID');
      const valHarga = r.harga ? parseFloat(r.harga).toLocaleString('id-ID') : '0';
      const tHarga = `<div style="display:flex; justify-content:space-between; padding-left:12px;"><span>Rp</span><span>${valHarga}</span></div>`;
      
      const rTotalRaw = parseFloat(String(r.total||'0').replace(/[^0-9,-]/g, '').replace(',', '.'));
      const valTotal = isNaN(rTotalRaw) ? '0' : rTotalRaw.toLocaleString('id-ID');
      const tTotal = `<div style="display:flex; justify-content:space-between; padding-left:12px;"><span>Rp</span><span>${valTotal}</span></div>`;

      tr.innerHTML = `
        <td style="${st}">${dateStr}</td>
        <td style="${st}">${esc(r.pelanggan||'—')}</td>
        <td style="${st}${fw}">${esc(r.grade||'—')}</td>
        <td style="${st}">${esc(r.keterangan||'—')}</td>
        <td style="${st}${ar}">${tButir}</td>
        <td style="${st}${ar}">${r.kilo||0}</td>
        <td style="${st}${ar}">${tHarga}</td>
        <td style="${st}${ar}">${tTotal}</td>
        ${aksiCell}
      `;
      tbody.appendChild(tr);
    });
  });
  
  if(!hasData){empty.style.display='block';} else {empty.style.display='none';}
}

async function hapusPenjualanItem(id, index){
  if(!currentUser||!['admin','superadmin'].includes(currentUser.role)){showToast('⛔ Hanya Admin yang bisa menghapus data penjualan!');return;}
  const konfirm=confirm('⚠️ Hapus item penjualan ini?\n\nJika ini adalah item terakhir di tanggal tersebut, seluruh struk akan ikut terhapus.');
  if(!konfirm)return;
  try{
    showToast('⏳ Menghapus...');
    const all=await dbGetPenjualan();
    const rec=all.find(x=>x.id===id);
    if(!rec) throw new Error('Data tidak ditemukan');
    
    const itemHapus = rec.rows[index];
    const newRows = rec.rows.filter((_, i) => i !== index);
    
    // Jika masih ada sisa baris, update transaksi
    if (newRows.length > 0) {
      const newGrandTotal = newRows.reduce((sum, r) => sum + (parseInt(String(r.total||'0').replace(/[^0-9]/g,''))||0), 0);
      const updatedRec = { ...rec, rows: newRows, grand_total: newGrandTotal };
      
      if (typeof window.dbUpdatePenjualanWithOffline === 'function') {
        await window.dbUpdatePenjualanWithOffline(id, updatedRec);
      } else {
        await window.dbUpdatePenjualan(id, updatedRec);
      }
      await dbSaveLog('UPDATE','penjualan',id,updatedRec,rec,
        `Menghapus sebagian item: ${itemHapus.grade} ${itemHapus.butir} butir (${itemHapus.kilo}kg) dari tgl ${rec.tanggal}`);
    } else {
      // Jika kosong, hapus seluruh transaksi
      await dbDeletePenjualan(id);
      await dbSaveLog('HAPUS','penjualan',id,rec,null,
        `Hapus total penjualan tgl ${rec?.tanggal||'—'}, total Rp ${(rec?.grand_total||0).toLocaleString('id-ID')}`);
    }

    await renderStokTelur();
    await renderRiwayatJual();
    if(typeof renderRiwayatWaste === 'function') await renderRiwayatWaste();
    showToast('✅ Item penjualan dihapus!');
  }catch(e){showToast('❌ Gagal menghapus: '+e.message);}
}

async function editPenjualanItem(id, index) {
  const all=await dbGetPenjualan();
  const rec=all.find(x=>x.id===id);
  if(!rec || !rec.rows[index]) return;
  
  const r = rec.rows[index];
  const isWaste = r.grade === 'Waste';
  const canEdit = ['admin','superadmin'].includes(currentUser?.role) || (isWaste && ['supervisor','staff'].includes(currentUser?.role));
  
  if(!currentUser || !canEdit){showToast('⛔ Anda tidak memiliki akses untuk mengedit item ini!');return;}
  
  document.getElementById('edit-pj-id').value = id;
  document.getElementById('edit-pj-index').value = index;
  
  await populatePelangganSelect(document.getElementById('edit-pj-pelanggan'));
  
  // Set pelanggan
  let pel = r.pelanggan || '';
  let kat = '';
  let nama = pel;
  
  const match = pel.match(/^(.*) \((.*)\)$/);
  if (match) {
    nama = match[1];
    kat = match[2];
  } else {
    // Cek apakah murni kategori
    let foundKat = false;
    for(let opt of document.getElementById('edit-pj-pelanggan').options) {
      if(opt.value && opt.value === pel) {
        foundKat = true;
        break;
      }
    }
    if(foundKat) {
      kat = pel;
      nama = '';
    }
  }
  
  document.getElementById('edit-pj-pelanggan').value = kat;
  document.getElementById('edit-pj-pelanggan-txt').value = nama;
  
  let g = r.grade || '';
  if (g === 'Cream') g = 'Crem';
  
  document.getElementById('edit-pj-grade').value = g;
  document.getElementById('edit-pj-butir').value = r.butir || '';
  document.getElementById('edit-pj-kilo').value = r.kilo || '';
  document.getElementById('edit-pj-harga').value = r.harga || '';
  document.getElementById('edit-pj-total').textContent = r.total || 'Rp 0';
  document.getElementById('edit-pj-ket').value = r.keterangan || '';
  
  document.getElementById('modal-edit-penjualan').style.display = 'flex';
}

function calcEditPenjualan() {
  const kilo = parseFloat(document.getElementById('edit-pj-kilo').value) || 0;
  const harga = parseFloat(document.getElementById('edit-pj-harga').value) || 0;
  document.getElementById('edit-pj-total').textContent = 'Rp ' + (kilo * harga).toLocaleString('id-ID');
}

async function simpanEditPenjualan() {
  const id = document.getElementById('edit-pj-id').value;
  const index = parseInt(document.getElementById('edit-pj-index').value, 10);
  
  const selPel = document.getElementById('edit-pj-pelanggan').value;
  const txtPel = document.getElementById('edit-pj-pelanggan-txt').value.trim();
  
  let pel = txtPel;
  if(selPel && pel) pel = `${pel} (${selPel})`;
  else if(selPel && !pel) pel = selPel;
  
  const grade = document.getElementById('edit-pj-grade').value;
  const butir = parseFloat(document.getElementById('edit-pj-butir').value) || 0;
  const kilo = parseFloat(document.getElementById('edit-pj-kilo').value) || 0;
  const harga = parseFloat(document.getElementById('edit-pj-harga').value) || 0;
  const totalStr = document.getElementById('edit-pj-total').textContent;
  const ket = document.getElementById('edit-pj-ket').value;
  
  if(!pel || !grade || (!butir && !kilo) || (grade !== 'Busuk' && grade !== 'Waste' && harga <= 0)) {
    showToast('⚠️ Harap lengkapi semua data dengan benar!');
    return;
  }
  
  try {
    const btn = document.getElementById('btn-save-edit-pj');
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan...';
    
    const all = await dbGetPenjualan();
    const rec = all.find(x=>x.id===id);
    if(!rec) throw new Error('Data induk tidak ditemukan');
    
    const oldRow = { ...rec.rows[index] };
    const newRow = { pelanggan: pel, grade, butir, kilo, harga, total: totalStr, keterangan: ket };
    
    rec.rows[index] = newRow;
    
    const newGrandTotal = rec.rows.reduce((sum, r) => sum + (parseInt(String(r.total||'0').replace(/[^0-9]/g,''))||0), 0);
    rec.grand_total = newGrandTotal;
    
    if (typeof window.dbUpdatePenjualanWithOffline === 'function') {
      await window.dbUpdatePenjualanWithOffline(id, rec);
    } else {
      await window.dbUpdatePenjualan(id, rec);
    }
    
    await dbSaveLog('UPDATE','penjualan',id,rec,oldRow,
      `Edit item penjualan tgl ${rec.tanggal}: ${oldRow.grade} -> ${grade}`);
      
    await renderStokTelur();
    await renderRiwayatJual();
    
    closeModal('modal-edit-penjualan');
    showToast('✅ Perubahan berhasil disimpan!');
  } catch (e) {
    showToast('❌ Gagal menyimpan: ' + e.message);
  } finally {
    const btn = document.getElementById('btn-save-edit-pj');
    btn.disabled = false;
    btn.textContent = '💾 Simpan Perubahan';
  }
}

async function exportRiwayatJual(){
  if(!can('EXPORT_LAP')){showToast('⚠️ Hanya Supervisor ke atas yang bisa download!');return;}
  showToast('⏳ Menyiapkan Excel...');
  try{
    const list=await dbGetPenjualan({limit: 999999});
    if(list.length===0){showToast('⚠️ Tidak ada data penjualan');return;}
    const headers=['Tanggal','Pelanggan','Grade','Harga DO','Butir','Kilo (kg)','Harga/kg (Rp)','Total (Rp)','Diinput Oleh'];
    const data=[];
    list.forEach(p=>{
      const items=p.rows||[];
      items.forEach(item=>{
        data.push([p.tanggal,item.pelanggan||'',item.grade||'',item.keterangan||'',item.butir||0,item.kilo||0,item.harga||0,item.total||0,p.user_input||'']);
      });
    });
    await exportExcel('Riwayat Penjualan Telur',headers,data,`Riwayat_Penjualan_${new Date().toISOString().slice(0,10)}.xlsx`);
  }catch(e){
    console.error('Export error:',e);
    showToast('❌ Gagal export: '+e.message);
  }
}

// --- EXPORT / IMPORT EXCEL PENJUALAN ---
async function exportExcelPenjualan() {
  if (!can('JUAL')) { showToast('Tidak ada akses!'); return; }
  showToast('? Menyiapkan file Excel...');
  try {
    await ensureXLSX();
    const data = await dbGetPenjualan({ limit: 999999 });
    const flatData = [];
    data.forEach(p => {
      if (Array.isArray(p.rows)) {
        p.rows.forEach(r => {
          flatData.push({
            'ID_Transaksi': p.id,
            'Tanggal': p.tanggal,
            'Penginput': p.user_input || '',
            'Pelanggan': r.pelanggan || '',
            'Grade': r.grade || '',
            'DO': r.keterangan || '',
            'Butir': r.butir || 0,
            'Kilo': r.kilo || 0,
            'Harga': r.harga || 0,
            'Total': parseFloat(String(r.total).replace(/[^0-9,-]/g, '').replace(',', '.')) || 0
          });
        });
      }
    });
    
    if (flatData.length === 0) {
      showToast('?? Tidak ada data penjualan.');
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penjualan');
    XLSX.writeFile(wb, `Data_Penjualan_${Date.now()}.xlsx`);
    showToast('File Excel berhasil diunduh!');
  } catch(e) {
    console.error(e);
    showToast('Gagal mengunduh Excel.');
  }
}

async function importExcelPenjualan(e) {
  if (!can('JUAL')) { showToast('Tidak ada akses!'); return; }
  const file = e.target.files[0];
  if (!file) return;
  
  showToast('? Membaca file Excel...');
  try {
    await ensureXLSX();
    const reader = new FileReader();
    reader.onload = async function(event) {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);
        
        if (rows.length === 0) {
          showToast('?? File Excel kosong!');
          return;
        }
        
        showToast('? Memproses dan menyimpan data...');
        const grouped = {};
        rows.forEach(r => {
          const id = r['ID_Transaksi'] || ('NEW_' + r['Tanggal'] + '_' + (r['Penginput']||''));
          if (!grouped[id]) {
            grouped[id] = {
              id: r['ID_Transaksi'] || null,
              tanggal: r['Tanggal'],
              user_input: r['Penginput'] || '',
              rows: [],
              grand_total: 0
            };
          }
          const butir = parseFloat(r['Butir']) || 0;
          const kilo = parseFloat(r['Kilo']) || 0;
          const harga = parseFloat(r['Harga']) || 0;
          let total = parseFloat(r['Total']) || 0;
          if (total === 0) total = (kilo > 0) ? (kilo * harga) : (butir * (harga/2000));
          
          grouped[id].rows.push({
            pelanggan: r['Pelanggan'] || '',
            grade: r['Grade'] || '',
            butir: butir,
            kilo: kilo,
            harga: harga,
            total: 'Rp ' + total.toLocaleString('id-ID')
          });
          grouped[id].grand_total += total;
        });
        
        let countUpdated = 0, countNew = 0;
        for (const key in grouped) {
          const trans = grouped[key];
          await dbSavePenjualan(trans);
          if (trans.id) countUpdated++;
          else countNew++;
        }
        
        showToast(`Berhasil! ${countUpdated} diupdate, ${countNew} transaksi baru.`);
        if (typeof loadRiwayatPenjualan === 'function') loadRiwayatPenjualan();
        if (typeof renderStokTelur === 'function') renderStokTelur();
      } catch(err) {
        console.error(err);
        showToast('Gagal memproses isi Excel.');
      }
      document.getElementById('import-excel-penjualan').value = '';
    };
    reader.readAsArrayBuffer(file);
  } catch(e) {
    console.error(e);
    showToast('Gagal memuat library Excel.');
  }
}

// ==========================================
// AUDIT STOK TELUR (PAGE)
// ==========================================
let currentPageAuditTelurSistem = {
  Normal: { butir: 0, kg: 0 },
  Crem: { butir: 0, kg: 0 },
  Bentes: { butir: 0, kg: 0 },
  Ceplokan: { butir: 0, kg: 0 }
};

async function loadPageAuditStokSistem() {
  const tglInput = document.getElementById('page-audit-tanggal');
  const nowStr = (tglInput && tglInput.value) ? tglInput.value : (typeof todayISO === 'function' ? todayISO() : new Date().toLocaleDateString('en-CA'));
  
  const tbody = document.querySelector('#page-audit-batch-table tbody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:10px; color:#6b7280;">⏳ Menghitung stok sistem...</td></tr>';
  
  try {
    let s;
    if (typeof getStokTelur === 'function') {
      s = await getStokTelur(nowStr);
    } else {
      s = await SB.rpc('get_stok_telur_tf_ub', { p_sampai: nowStr });
    }
    
    if (s) {
      currentPageAuditTelurSistem = {
        Normal: { butir: s.Normal?.butir || 0, kg: s.Normal?.kilo || 0 },
        Crem: { butir: s.Crem?.butir || 0, kg: s.Crem?.kilo || 0 },
        Bentes: { butir: s.Bentes?.butir || 0, kg: s.Bentes?.kilo || 0 },
        Ceplokan: { butir: s.Ceplokan?.butir || 0, kg: s.Ceplokan?.kilo || 0 }
      };
    } else {
      throw new Error('Data stok telur kosong');
    }
  } catch(e) {
    console.warn('Fallback stok telur lokal', e);
    if (typeof prod !== 'undefined' && prod.Normal) {
      currentPageAuditTelurSistem = {
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
    const sysButir = currentPageAuditTelurSistem[g].butir;
    const sysKg = currentPageAuditTelurSistem[g].kg;
    
    html += `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:4px 2px; font-weight:600; color:#374151;">${g}</td>
        <td style="padding:4px 2px; text-align:center; color:#4b5563;">
          <div style="font-size:0.9rem;">${sysButir.toLocaleString('id-ID')}</div>
          <div style="font-size:0.75rem; color:#9ca3af;">${sysKg.toLocaleString('id-ID')} kg</div>
        </td>
        <td style="padding:4px 2px;">
          <input type="number" id="page-audit-batch-butir-${g}" style="width:100%; min-width:60px; padding:4px; border:1px solid #d1d5db; border-radius:4px; text-align:center;" placeholder="...">
        </td>
        <td style="padding:4px 2px;">
          <input type="number" id="page-audit-batch-kg-${g}" step="any" style="width:100%; min-width:60px; padding:4px; border:1px solid #d1d5db; border-radius:4px; text-align:center;" placeholder="...">
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

async function savePageAuditStok() {
  const ket = document.getElementById('page-audit-keterangan').value.trim();
  
  const btn = document.querySelector('button[onclick="savePageAuditStok()"]');
  if(btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
  
  try {
    const tglInput = document.getElementById('page-audit-tanggal');
    const tgl = (tglInput && tglInput.value) ? tglInput.value : (typeof todayISO === 'function' ? todayISO() : new Date().toLocaleDateString('en-CA'));
    const userInput = currentUser.name || currentUser.username || 'System';
    
    const grades = ['Normal', 'Crem', 'Bentes', 'Ceplokan'];
    let auditPayloads = [];
    let penjualanRows = [];
    
    let hasSelisihTanpaKet = false;
    let hasAnyInput = false;
    
    for (const g of grades) {
      const inputButir = document.getElementById(`page-audit-batch-butir-${g}`);
      const inputKg = document.getElementById(`page-audit-batch-kg-${g}`);
      
      const sysButir = currentPageAuditTelurSistem[g]?.butir || 0;
      const sysKg = currentPageAuditTelurSistem[g]?.kg || 0;
      
      // Cek Butir
      if (inputButir && inputButir.value !== '') {
        hasAnyInput = true;
        const actButir = parseInt(inputButir.value);
        const selButir = actButir - sysButir;
        if (selButir !== 0 && !ket) hasSelisihTanpaKet = true;
        
        auditPayloads.push({
          tanggal: tgl, jenis_item: 'Telur', kategori_item: g, satuan: 'butir',
          stok_sistem: sysButir, stok_aktual: actButir, selisih: selButir,
          keterangan: ket, user_input: userInput
        });
        
        if (selButir !== 0) {
          penjualanRows.push({
            pelanggan: 'Susut Audit', grade: g, butir: -selButir, kilo: 0,
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
          tanggal: tgl, jenis_item: 'Telur', kategori_item: g, satuan: 'kg',
          stok_sistem: sysKg, stok_aktual: actKg, selisih: selKg,
          keterangan: ket, user_input: userInput
        });
        
        if (selKg !== 0) {
          const existingRow = penjualanRows.find(r => r.grade === g && r.pelanggan === 'Susut Audit');
          if (existingRow) {
            existingRow.kilo = -selKg;
          } else {
            penjualanRows.push({
              pelanggan: 'Susut Audit', grade: g, butir: 0, kilo: -selKg,
              harga: 0, total: 'Rp 0', keterangan: ket || 'Penyesuaian stok audit'
            });
          }
        }
      }
    }
    
    if (!hasAnyInput) {
      alert('⚠️ Isi setidaknya satu kolom aktual yang berbeda dari sistem.');
      if(btn) { btn.disabled = false; btn.textContent = '💾 Simpan Audit Telur'; }
      return;
    }
    
    if (hasSelisihTanpaKet) {
      alert('⚠️ Wajib mengisi Keterangan jika terdapat selisih stok (stok berubah).');
      if(btn) { btn.disabled = false; btn.textContent = '💾 Simpan Audit Telur'; }
      return;
    }
    
    // Save to audit_stok
    for (const p of auditPayloads) {
      await dbSaveAudit(p);
    }
    
    // Inject to penjualan if there are discrepancies
    if (penjualanRows.length > 0) {
      const penjPanel = {
        tanggal: tgl,
        rows: penjualanRows,
        grand_total: 0
      };
      await dbSavePenjualan(penjPanel);
    }
    
    showToast('✅ Audit stok berhasil disimpan!');
    document.getElementById('page-audit-keterangan').value = '';
    
    // Reload UI
    await loadPageAuditStokSistem();
    await loadPageRiwayatAudit();
    
    // Update daily stock logic if applicable
    if (typeof calculateStockHarian === 'function') {
      calculateStockHarian();
    }
    
  } catch (e) {
    console.error(e);
    alert('❌ Terjadi kesalahan: ' + e.message);
  } finally {
    if(btn) { btn.disabled = false; btn.textContent = '💾 Simpan Audit Telur'; }
  }
}

async function loadPageRiwayatAudit() {
  const container = document.getElementById('page-riwayat-audit-list');
  if(!container) return;
  
  container.innerHTML = '<div style="padding:20px; text-align:center; color:#6b7280;">⏳ Memuat riwayat...</div>';
  
  try {
    const list = await dbGetAudit({ jenis_item: 'Telur' }); // Filter only Telur
    
    if (list.length === 0) {
      container.innerHTML = '<div style="padding:20px; text-align:center; color:#6b7280;">Belum ada riwayat audit stok telur.</div>';
      return;
    }
    
    // Group by Date and Keterangan (User)
    let grouped = {};
    list.forEach(a => {
      const gKey = a.tanggal + '_' + (a.keterangan||'');
      if (!grouped[gKey]) {
        grouped[gKey] = {
          tanggal: a.tanggal,
          keterangan: a.keterangan || '-',
          user: a.user_input || 'System',
          created_at: a.created_at,
          items: []
        };
      }
      grouped[gKey].items.push(a);
    });
    
    const sortedKeys = Object.keys(grouped).sort((a,b) => {
      if (grouped[b].tanggal !== grouped[a].tanggal) return grouped[b].tanggal.localeCompare(grouped[a].tanggal);
      return (grouped[b].created_at || '').localeCompare(grouped[a].created_at || '');
    });
    
    window._riwayatAuditSortedKeys = sortedKeys;
    window._riwayatAuditGrouped = grouped;
    window._riwayatAuditIndex = 0;
    container.innerHTML = '';
    
    window._renderNextRiwayatAudit = function() {
      if (window._riwayatAuditIndex >= window._riwayatAuditSortedKeys.length) return;
      
      const limit = window._riwayatAuditIndex + 10;
      let html = '';
      
      for (let i = window._riwayatAuditIndex; i < limit && i < window._riwayatAuditSortedKeys.length; i++) {
        const k = window._riwayatAuditSortedKeys[i];
        const g = window._riwayatAuditGrouped[k];
        let tglStr = g.tanggal;
        if (typeof fmtTgl === 'function') tglStr = fmtTgl(g.tanggal);
        
        let rowsHtml = '';
        // Kelompokkan per grade untuk mencegah duplikat (terutama jika ada klik ganda)
        let gradesMap = {};
        g.items.forEach(it => {
          const grade = it.kategori_item || '-';
          if (!gradesMap[grade]) {
            gradesMap[grade] = {
              sysB: 0, actB: 0, selB: 0, idB: null,
              sysK: 0, actK: 0, selK: 0, idK: null
            };
          }
          if (it.satuan === 'butir') {
            gradesMap[grade].sysB = parseFloat(it.stok_sistem)||0;
            gradesMap[grade].actB = parseFloat(it.stok_aktual)||0;
            gradesMap[grade].selB = parseFloat(it.selisih)||0;
            gradesMap[grade].idB = it.id;
          } else if (it.satuan === 'kg' || it.satuan === 'kilo') {
            gradesMap[grade].sysK = parseFloat(it.stok_sistem)||0;
            gradesMap[grade].actK = parseFloat(it.stok_aktual)||0;
            gradesMap[grade].selK = parseFloat(it.selisih)||0;
            gradesMap[grade].idK = it.id;
          }
        });
        
        const gradeOrder = ['Normal', 'Crem', 'Bentes', 'Ceplokan'];
        let totSysB = 0, totActB = 0, totSelB = 0;
        let totSysK = 0, totActK = 0, totSelK = 0;
        
        gradeOrder.forEach(grade => {
          if (!gradesMap[grade]) return;
          const d = gradesMap[grade];
          
          totSysB += d.sysB; totActB += d.actB; totSelB += d.selB;
          totSysK += d.sysK; totActK += d.actK; totSelK += d.selK;
          
          const fmt = (v, dec) => v.toLocaleString('id-ID', {maximumFractionDigits:dec});
          
          const selBColor = d.selB > 0 ? '#10b981' : (d.selB < 0 ? '#ef4444' : '#6b7280');
          const selBSign = d.selB > 0 ? '+' : '';
          const selKColor = d.selK > 0 ? '#10b981' : (d.selK < 0 ? '#ef4444' : '#6b7280');
          const selKSign = d.selK > 0 ? '+' : '';
          
          const canEdit = currentUser && ['supervisor','admin','superadmin'].includes(currentUser.role);
          
          let actBDisp = d.actB !== d.sysB ? `<div style="font-weight:600; color:#111827;">${fmt(d.actB, 0)}</div>` : `<div style="color:#6b7280;">Sesuai</div>`;
          if (canEdit && d.idB) actBDisp = `<div style="display:flex; justify-content:flex-end; gap:6px; align-items:center;">${actBDisp} <span onclick="editRiwayatAudit('${d.idB}')" style="cursor:pointer;font-size:0.85rem;" title="Edit Aktual Butir">✏️</span></div>`;
          
          let actKDisp = d.actK !== d.sysK ? `<div style="font-weight:600; color:#111827;">${fmt(d.actK, 2)}</div>` : `<div style="color:#6b7280;">Sesuai</div>`;
          if (canEdit && d.idK) actKDisp = `<div style="display:flex; justify-content:flex-end; gap:6px; align-items:center;">${actKDisp} <span onclick="editRiwayatAudit('${d.idK}')" style="cursor:pointer;font-size:0.85rem;" title="Edit Aktual Kg">✏️</span></div>`;
          
          rowsHtml += `
            <tr style="border-top:1px solid #e5e7eb;">
              <td style="padding:6px; font-weight:500;">${grade}</td>
              <td style="padding:6px; text-align:right;">${fmt(d.sysB, 0)}</td>
              <td style="padding:6px; text-align:right;">${actBDisp}</td>
              <td style="padding:6px; text-align:right;">${fmt(d.sysK, 2)}</td>
              <td style="padding:6px; text-align:right;">${actKDisp}</td>
              <td style="padding:6px; text-align:right; font-weight:700; color:${selBColor}">${selBSign}${fmt(d.selB, 0)}</td>
              <td style="padding:6px; text-align:right; font-weight:700; color:${selKColor}">${selKSign}${fmt(d.selK, 2)}</td>
            </tr>
          `;
        });
        
        const fmtTot = (v, dec) => v.toLocaleString('id-ID', {maximumFractionDigits:dec});
        const totSelBColor = totSelB > 0 ? '#10b981' : (totSelB < 0 ? '#ef4444' : '#111827');
        const totSelBSign = totSelB > 0 ? '+' : '';
        const totSelKColor = totSelK > 0 ? '#10b981' : (totSelK < 0 ? '#ef4444' : '#111827');
        const totSelKSign = totSelK > 0 ? '+' : '';
        
        rowsHtml += `
          <tr style="background:#f9fafb; font-weight:bold; border-top:2px solid #d1d5db;">
            <td style="padding:8px 6px;">Total</td>
            <td style="padding:8px 6px; text-align:right;">${fmtTot(totSysB, 0)}</td>
            <td style="padding:8px 6px; text-align:right;">${fmtTot(totActB, 0)}</td>
            <td style="padding:8px 6px; text-align:right;">${fmtTot(totSysK, 2)}</td>
            <td style="padding:8px 6px; text-align:right;">${fmtTot(totActK, 2)}</td>
            <td style="padding:8px 6px; text-align:right; color:${totSelBColor}">${totSelBSign}${fmtTot(totSelB, 0)}</td>
            <td style="padding:8px 6px; text-align:right; color:${totSelKColor}">${totSelKSign}${fmtTot(totSelK, 2)}</td>
          </tr>
        `;
        
        html += `
          <div style="background:#fff; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:12px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <div style="background:#f9fafb; padding:10px 12px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:600; color:#111827; font-size:0.95rem;">${tglStr}</div>
                <div style="font-size:0.8rem; color:#6b7280;">Oleh: <b>${g.user}</b></div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.8rem; color:#4b5563; font-style:italic;">"${g.keterangan}"</div>
              </div>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:0.85rem; min-width:600px;">
                <thead>
                  <tr style="background:#f3f4f6; color:#4b5563;">
                    <th style="padding:6px; text-align:left;">Grade</th>
                    <th style="padding:6px; text-align:right;">Sistem (btr)</th>
                    <th style="padding:6px; text-align:right;">Aktual (btr)</th>
                    <th style="padding:6px; text-align:right;">Sistem (kg)</th>
                    <th style="padding:6px; text-align:right;">Aktual (kg)</th>
                    <th style="padding:6px; text-align:right;">Susut (btr)</th>
                    <th style="padding:6px; text-align:right;">Susut (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
      
      window._riwayatAuditIndex = limit;
      
      // Jika masih ada sisa data, tambahkan teks indikator scroll
      let htmlToAppend = html;
      if (window._riwayatAuditIndex < window._riwayatAuditSortedKeys.length) {
         htmlToAppend += '<div id="riwayat-audit-loading-indicator" style="text-align:center; padding:10px; color:#9ca3af; font-size:0.8rem;">Scroll ke bawah untuk melihat lebih banyak...</div>';
      }
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlToAppend;
      
      // Hapus indikator loading lama jika ada
      const oldIndicator = container.querySelector('#riwayat-audit-loading-indicator');
      if (oldIndicator) oldIndicator.remove();
      
      while(tempDiv.firstChild) {
        container.appendChild(tempDiv.firstChild);
      }
    };
    
    // Bind scroll pada window
    if (!window._auditScrollBound) {
      window.addEventListener('scroll', function() {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
           if (window._renderNextRiwayatAudit) window._renderNextRiwayatAudit();
        }
      });
      window._auditScrollBound = true;
    }
    
    // Render 10 pertama
    window._renderNextRiwayatAudit();
  } catch(e) {
    console.error(e);
    container.innerHTML = `<div style="padding:20px; text-align:center; color:#ef4444;">Gagal memuat: ${e.message}</div>`;
  }
}

// ==========================================
// HISTORI STOK 7 HARI TERAKHIR (KHUSUS TAB STOK)
// ==========================================
async function renderHistoriStok7Hari(endDateStr) {
  const tbody = document.getElementById('histori-stok-7hari-tbody');
  if (!tbody) return;
  
  if (!endDateStr) {
    endDateStr = document.getElementById('jual-tanggal').value || new Date().toISOString().split('T')[0];
  }
  
  const endObj = new Date(endDateStr);
  const startObj = new Date(endObj);
  startObj.setDate(startObj.getDate() - 6);
  const startDateStr = startObj.toISOString().split('T')[0];
  
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">⏳ Memuat histori 7 hari...</td></tr>';
  
  try {
    const prevDateObj = new Date(startObj);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split('T')[0];
    
    // Stok awal H-1
    const stokAwalObj = await getStokTelur(prevDateStr); 
    let currentStok = {
      'Normal': {butir: stokAwalObj.Normal?.butir||0, kilo: stokAwalObj.Normal?.kilo||0},
      'Crem': {butir: stokAwalObj.Crem?.butir||0, kilo: stokAwalObj.Crem?.kilo||0},
      'Bentes': {butir: stokAwalObj.Bentes?.butir||0, kilo: stokAwalObj.Bentes?.kilo||0},
      'Ceplokan': {butir: stokAwalObj.Ceplokan?.butir||0, kilo: stokAwalObj.Ceplokan?.kilo||0}
    };
    
    const inputs = await dbGetInput({dari: startDateStr, sampai: endDateStr});
    const juals = await dbGetPenjualan({dari: startDateStr, sampai: endDateStr, limit: 9999});
    const audits = typeof dbGetAudit === 'function' ? await dbGetAudit({dari: startDateStr, sampai: endDateStr, jenis_item: 'Telur'}) : [];
    
    const dailyData = {}; 
    const dateArray = [];
    
    for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      dateArray.push(dStr);
      dailyData[dStr] = {};
      ['Normal','Crem','Bentes','Ceplokan'].forEach(g => {
        dailyData[dStr][g] = {
           masuk: {b:0, k:0}, jual: {b:0, k:0}, waste: {b:0, k:0}, audit: {b:0, k:0, has:false}
        };
      });
    }
    
    // Process Inputs (Masuk)
    inputs.forEach(row => {
      const dStr = row.tanggal;
      if (!dailyData[dStr]) return;
      const d = row.data; if(!d || !d.produksi) return;
      
      const mapping={'normal':'Normal','crem':'Crem','bentes_kering':'Bentes','ceplokan':'Ceplokan'};
      Object.keys(mapping).forEach(g=>{
        const G = mapping[g];
        dailyData[dStr][G].masuk.b += parseInt(d.produksi[g]?.butir)||0;
        dailyData[dStr][G].masuk.k += parseFloat(d.produksi[g]?.kilo)||0;
      });
      if(d.produksi.cream){
        dailyData[dStr]['Crem'].masuk.b += parseInt(d.produksi.cream.butir)||0;
        dailyData[dStr]['Crem'].masuk.k += parseFloat(d.produksi.cream.kilo)||0;
      }
      if(d.produksi.retak){
        dailyData[dStr]['Bentes'].masuk.b += parseInt(d.produksi.retak.butir)||0;
        dailyData[dStr]['Bentes'].masuk.k += parseFloat(d.produksi.retak.kilo)||0;
      }
    });
    
    // Process Sales & Waste
    juals.forEach(j => {
      const dStr = j.tanggal;
      if (!dailyData[dStr]) return;
      (j.rows || []).forEach(r => {
        let G = r.grade;
        let isWaste = false;
        if (G === 'Cream') G = 'Crem';
        if (G === 'Busuk') {
          G = 'Normal';
          isWaste = true;
        } else if (G === 'Waste') {
          G = 'Bentes';
          isWaste = true;
        }
        if (G === 'Retak') G = 'Bentes';
        
        if (dailyData[dStr][G]) {
          if (isWaste) {
            dailyData[dStr][G].waste.b += parseInt(r.butir)||0;
            dailyData[dStr][G].waste.k += parseFloat(r.kilo)||0;
          } else if (r.pelanggan !== 'Susut Audit') {
            // Jangan masukkan Susut Audit ke kolom Jual, biarkan dihitung di kolom Susut/Audit nanti
            dailyData[dStr][G].jual.b += parseInt(r.butir)||0;
            dailyData[dStr][G].jual.k += parseFloat(r.kilo)||0;
          }
        }
      });
    });
    
    // Process Audits
    audits.forEach(a => {
      const dStr = a.tanggal;
      let G = a.kategori_item;
      if (G === 'Retak') G = 'Bentes';
      if (G === 'Cream') G = 'Crem';
      if (dailyData[dStr] && dailyData[dStr][G]) {
        dailyData[dStr][G].audit.has = true;
        if (a.satuan === 'butir') {
          dailyData[dStr][G].audit.b = parseFloat(a.selisih)||0;
          dailyData[dStr][G].audit.actB = parseFloat(a.stok_aktual)||0;
        } else if (a.satuan === 'kg' || a.satuan === 'kilo') {
          dailyData[dStr][G].audit.k = parseFloat(a.selisih)||0;
          dailyData[dStr][G].audit.actK = parseFloat(a.stok_aktual)||0;
        }
      }
    });
    
    let html = '';
    const grades = ['Normal','Crem','Bentes','Ceplokan'];
    
    const fmt = (val, isKilo) => {
      if (isKilo) return val.toLocaleString('id-ID', {minimumFractionDigits:1, maximumFractionDigits:2});
      return val.toLocaleString('id-ID');
    };
    
    // Iterasi secara terbalik (descending) jika ingin tanggal terbaru di atas. 
    // Tapi karena tabel histori biasa urut naik, kita biarkan ascending.
    dateArray.forEach(dStr => {
      // Calculate closing stock for the day
      grades.forEach(g => {
        const data = dailyData[dStr][g];
        const awal = {b: currentStok[g].butir, k: currentStok[g].kilo};
        let sisaB = awal.b + data.masuk.b - data.jual.b - data.waste.b;
        let sisaK = awal.k + data.masuk.k - data.jual.k - data.waste.k;
        if (data.audit.has) {
          // Reset point: Jika ada audit, maka sisa = stok aktual
          // Selisih ditambahkan untuk display indikasi susut
          if (data.audit.actB !== undefined) sisaB = data.audit.actB;
          if (data.audit.actK !== undefined) sisaK = data.audit.actK;
        }
        currentStok[g].butir = sisaB;
        currentStok[g].kilo = sisaK;
      });
      
      // Build Row
      html += `<tr>`;
      html += `<td style="white-space:nowrap">${dStr}</td>`;
      grades.forEach(g => {
        const s = currentStok[g];
        // Jika minus, beri warna merah, jika 0 beri warna abu-abu
        const colB = s.butir < 0 ? 'color:#dc2626;font-weight:bold' : (s.butir === 0 ? 'color:#aaa' : 'color:#1b4332;font-weight:600');
        const colK = s.kilo < 0 ? 'color:#dc2626;font-weight:bold' : (s.kilo === 0 ? 'color:#aaa' : '');
        html += `<td style="text-align:right; ${colB}">${fmt(s.butir, false)}</td>`;
        html += `<td style="text-align:right; ${colK}">${fmt(s.kilo, true)}</td>`;
      });
      html += `</tr>`;
    });
    
    if (!html) html = '<tr><td colspan="9" style="text-align:center">Belum ada histori di rentang 7 hari ini.</td></tr>';
    tbody.innerHTML = html;
    
  } catch(e) {
    console.error('Error renderHistoriStok7Hari:', e);
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:red">Gagal memuat histori.</td></tr>';
  }
}

// ==========================================
// RIWAYAT BUANG (WASTE)
// ==========================================
async function renderRiwayatWaste() {
  const inputBulan = document.getElementById('filter-waste-bulan');
  
  if (inputBulan && !inputBulan.value) {
    const today = new Date();
    inputBulan.value = today.toISOString().substring(0, 7); // Format YYYY-MM
  }
  
  const filter = {};
  if (inputBulan && inputBulan.value) {
    // Cari dari awal bulan sampai akhir bulan
    const tglArr = inputBulan.value.split('-');
    const tahun = parseInt(tglArr[0], 10);
    const bulan = parseInt(tglArr[1], 10);
    const lastDay = new Date(tahun, bulan, 0).getDate();
    filter.dari = `${inputBulan.value}-01`;
    filter.sampai = `${inputBulan.value}-${lastDay.toString().padStart(2, '0')}`;
  }
  filter.limit = 9999;
  
  const all = await dbGetPenjualan(filter);
  const tbody = document.getElementById('riwayat-waste-tbody');
  const empty = document.getElementById('riwayat-waste-empty');
  if (!tbody || !empty) return;
  
  tbody.innerHTML = '';
  let hasData = false;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  
  all.forEach(rec => {
    const rows = rec.rows || [];
    rows.forEach((r, i) => {
      // Hanya ambil yang Waste
      if (r.grade !== 'Waste') return;
      
      hasData = true;
      const tr = document.createElement('tr');
      
      const canEdit = isAdmin || ['supervisor', 'staff'].includes(currentUser?.role);
      const canDelete = isAdmin;
      
      let aksiCell = '<td style="text-align:center;vertical-align:middle;white-space:nowrap;">';
      if (canDelete) aksiCell += `<button onclick="hapusPenjualanItem('${rec.id}', ${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#dc2626" title="Hapus waste ini">🗑️</button>`;
      aksiCell += '</td>';

      const dateStr = fmtTgl(rec.tanggal).replace(/\d{4}$/, match => match.slice(2));
      const tButir = (r.butir||0).toLocaleString('id-ID');
      const tKilo = (r.kilo||0).toLocaleString('id-ID', {minimumFractionDigits:1, maximumFractionDigits:2});
      
      tr.innerHTML = `
        <td style="white-space:nowrap;font-size:0.85rem">${dateStr}</td>
        <td style="text-align:right">${tButir}</td>
        <td style="text-align:right">${tKilo}</td>
        <td>${r.keterangan || '-'}</td>
        ${aksiCell}
      `;
      tbody.appendChild(tr);
    });
  });
  
  if(!hasData){empty.style.display='block';} else {empty.style.display='none';}
}
