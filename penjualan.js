// ═══ MODULE: penjualan.js ═══
// Penjualan functions: populatePelangganSelect, onPelangganChange, getSalePelanggan,
// populateAllPelangganSelects, addSaleRow, removeSaleRow, calcTotal, calcSaleTotal,
// getStokTelur, renderStokTelur, loadHargaPasarJual, saveHargaPasarFromJual,
// savePenjualan, resetPenjualan, renderRiwayatJual, hapusPenjualan, exportRiwayatJual

async function populatePelangganSelect(sel){
  if(!sel) return;
  const pelanggan = await dbGetPelanggan();
  const prev = sel.value;
  sel.innerHTML = '<option value="Warga">Warga</option>';
  pelanggan.filter(p => p.active !== false).forEach(p => {
    const o = document.createElement('option');
    o.value = p.nama;
    o.textContent = p.nama + (p.tipe ? ` (${p.tipe})` : '');
    sel.appendChild(o);
  });
  // Opsi ketik manual
  const oManual = document.createElement('option');
  oManual.value = '__manual__';
  oManual.textContent = '✏️ Ketik nama...';
  sel.appendChild(oManual);
  if(prev) sel.value = prev;
}

function onPelangganChange(sel){
  const card = sel.closest('.sale-row') || sel.closest('.sale-card');
  const txt = card.querySelector('.pelanggan-text');
  if(sel.value === '__manual__'){
    txt.style.display = 'block';
    txt.value = '';
    txt.focus();
  } else {
    txt.style.display = 'none';
    txt.value = '';
  }
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
  if(!sel) return txt ? txt.value.trim() : '';
  if(sel.value === '__manual__') return txt ? txt.value.trim() : '';
  if(sel.value) return sel.value;
  return txt ? txt.value.trim() : '';
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
    '<div class="sc-row"><div class="sc-field" style="grid-column:1/-1"><label>Pelanggan</label>'+
      '<select class="pelanggan-select" onchange="onPelangganChange(this)"><option value="Warga">Warga</option></select>'+
      '<input type="text" class="pelanggan-text" placeholder="Ketik nama pelanggan..." style="display:none;margin-top:6px"/>'+
    '</div></div>'+
    '<div class="sc-row three">'+
      '<div class="sc-field"><label>Grade</label><select class="grade-select" onchange="onGradeChange(this)"><option value="">-- Grade --</option><option>Normal</option><option>Crem</option><option>Retak</option><option>Bentes</option><option>Ceplokan</option></select></div>'+
      '<div class="sc-field"><label>Butir</label><input type="number" min="0" placeholder="0" oninput="calcTotal(this)"/></div>'+
      '<div class="sc-field"><label>Kilo (kg)</label><input type="number" min="0" step="0.01" placeholder="0" oninput="calcTotal(this)"/></div>'+
    '</div>'+
    '<div class="sc-row"><div class="sc-field"><label>Harga/kg (Rp)</label><input type="number" min="0" step="100" placeholder="0" oninput="calcTotal(this)"/></div></div>'+
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
        return serverStok;
      }
    } catch { /* fallback ke client-side */ }
  }
  
  // Fallback: client-side calculation
  const prod={'Normal':{butir:0,kilo:0},'Crem':{butir:0,kilo:0},'Retak':{butir:0,kilo:0},'Bentes':{butir:0,kilo:0},'Ceplokan':{butir:0,kilo:0}};
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
    if(d.produksi.retak){prod['Retak'].butir+=parseInt(d.produksi.retak.butir)||0;prod['Retak'].kilo+=parseFloat(d.produksi.retak.kilo)||0;}
  });
  const juals=await dbGetPenjualan({sampai:tgl, limit:9999});
  juals.forEach(j=>{
    (j.rows||[]).forEach(r=>{
      let G=r.grade;
      if (G === 'Cream') G = 'Crem';
      if (G === 'Busuk') G = 'Busuk';
      
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
  
  const getDisp = (g, sat, val) => {
    const a = audits.find(x => x.kategori_item === g && x.satuan === sat);
    if (a && a.stok_aktual != null && a.selisih != null) {
      if (sat === 'butir') {
        const sysVal = val - parseInt(a.selisih);
        return `${sysVal.toLocaleString('id-ID')} / <span style="color:#0284c7">${parseInt(a.stok_aktual).toLocaleString('id-ID')}</span>`;
      }
      const sysVal = val - parseFloat(a.selisih);
      return `${sysVal.toFixed(2)} / <span style="color:#0284c7">${parseFloat(a.stok_aktual).toFixed(2)}</span>`;
    }
    return sat === 'butir' ? val.toLocaleString('id-ID') : val.toFixed(2);
  };

  const grades=['Normal','Crem','Retak','Bentes','Ceplokan'];
  const totalButir=grades.reduce((s,g)=>s+stok[g].butir,0);
  const totalKilo=grades.reduce((s,g)=>s+stok[g].kilo,0);
  el.innerHTML=
    '<table class="tbl" style="margin-bottom:0">'+
    '<thead><tr><th>Grade</th><th>Stok (butir)</th><th>Stok (kg)</th></tr></thead><tbody>'+
    grades.map(g=>'<tr><td>'+g+'</td><td style="font-weight:700;color:'+(stok[g].butir>0?'#1b4332':'#dc2626')+'">'+getDisp(g, 'butir', stok[g].butir)+'</td><td>'+getDisp(g, 'kg', stok[g].kilo)+' kg</td></tr>').join('')+
    '<tr class="total-row"><td>TOTAL</td><td>'+totalButir.toLocaleString('id-ID')+'</td><td>'+totalKilo.toFixed(2)+' kg</td></tr>'+
    '</tbody></table>'+
    '<div style="font-size:.75rem;color:#888;margin-top:8px">Kumulatif produksi s.d. '+tgl+'. Angka biru adalah stok aktual dari audit.</div>';
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

  if(hargaFromInput > 0) {
    el.value = parseInt(hargaFromInput, 10).toLocaleString('id-ID');
    el.readOnly = true;
    el.style.opacity = '0.7';
    statusEl.innerHTML = '✅ <span style="color:#2d6a4f">Sudah diinput di halaman Input</span>';
  } else {
    el.value = '';
    el.readOnly = false;
    el.style.opacity = '';
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
  document.getElementById('jual-harga-pasar').readOnly = true;
  document.getElementById('jual-harga-pasar').style.opacity = '0.7';
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
      total:r.querySelector('.total-col')?.textContent||'Rp 0'
    };
  }).filter(r=>r.pelanggan||r.kilo||r.butir);

  if(!rows.length){showToast('⚠️ Isi minimal satu baris penjualan!');return;}

  // Validasi setiap baris
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    const no=i+1;
    if(!r.grade){showToast(`⚠️ Baris ${no}: Grade wajib dipilih!`);return;}
    if(!r.butir&&!r.kilo){showToast(`⚠️ Baris ${no}: Isi jumlah butir atau kilo!`);return;}
    if(r.butir<0||r.kilo<0){showToast(`⚠️ Baris ${no}: Jumlah tidak boleh negatif!`);return;}
    if(r.grade !== 'Busuk' && r.harga<=0){showToast(`⚠️ Baris ${no}: Harga per kg wajib diisi!`);return;}
    if(!r.pelanggan){showToast(`⚠️ Baris ${no}: Nama pelanggan wajib diisi!`);return;}
  }

  showToast('⏳ Memeriksa stok...');
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
  const all=await dbGetPenjualan();
  const tbody=document.getElementById('riwayat-jual-tbody');
  const empty=document.getElementById('riwayat-jual-empty');
  tbody.innerHTML='';
  if(!all.length){empty.style.display='block';return;}
  empty.style.display='none';
  const isAdmin=currentUser?.role==='admin'||currentUser?.role==='superadmin';
  all.slice(0,60).forEach(rec=>{
    const rows=rec.rows||[];
    rows.forEach((r,i)=>{
      const tr=document.createElement('tr');
      const aksiCell=isAdmin
        ?`<td style="text-align:center;vertical-align:middle;white-space:nowrap;">
            <button onclick="editPenjualanItem('${rec.id}', ${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#0ea5e9;margin-right:6px;" title="Edit item ini">✏️</button>
            <button onclick="hapusPenjualanItem('${rec.id}', ${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#dc2626" title="Hapus item ini">🗑️</button>
           </td>`
        :'';
      tr.innerHTML='<td'+(r.grade==='Busuk'?' style="color:#dc2626"':'')+'>'+fmtTgl(rec.tanggal)+'</td><td'+(r.grade==='Busuk'?' style="color:#dc2626"':'')+'>'+esc(r.pelanggan||'—')+'</td><td'+(r.grade==='Busuk'?' style="color:#dc2626;font-weight:bold"':'')+'>'+esc(r.grade||'—')+'</td><td'+(r.grade==='Busuk'?' style="color:#dc2626"':'')+'>'+(r.butir||0)+' butir</td><td'+(r.grade==='Busuk'?' style="color:#dc2626"':'')+'>'+(r.kilo||0)+' kg</td><td'+(r.grade==='Busuk'?' style="color:#dc2626"':'')+'>Rp '+(r.harga?parseFloat(r.harga).toLocaleString('id-ID'):'0')+'</td><td'+(r.grade==='Busuk'?' style="color:#dc2626"':'')+'>'+esc(r.total||'Rp 0')+'</td>'+aksiCell;
      tbody.appendChild(tr);
    });
  });
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
      const newGrandTotal = newRows.reduce((sum, r) => sum + (parseInt((r.total||'').replace(/[^0-9]/g,''))||0), 0);
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
    showToast('✅ Item penjualan dihapus!');
  }catch(e){showToast('❌ Gagal menghapus: '+e.message);}
}

async function editPenjualanItem(id, index) {
  if(!currentUser||!['admin','superadmin'].includes(currentUser.role)){showToast('⛔ Hanya Admin yang bisa mengedit!');return;}
  
  const all=await dbGetPenjualan();
  const rec=all.find(x=>x.id===id);
  if(!rec || !rec.rows[index]) return;
  
  const r = rec.rows[index];
  
  document.getElementById('edit-pj-id').value = id;
  document.getElementById('edit-pj-index').value = index;
  
  await populatePelangganSelect(document.getElementById('edit-pj-pelanggan'));
  
  // Set pelanggan
  let pelFound = false;
  for(let opt of document.getElementById('edit-pj-pelanggan').options) {
    if(opt.value === r.pelanggan) {
      opt.selected = true;
      pelFound = true; break;
    }
  }
  if(!pelFound) {
    document.getElementById('edit-pj-pelanggan').value = '__manual__';
    document.getElementById('edit-pj-pelanggan-txt').style.display = 'block';
    document.getElementById('edit-pj-pelanggan-txt').value = r.pelanggan || '';
  } else {
    document.getElementById('edit-pj-pelanggan-txt').style.display = 'none';
  }
  
  let g = r.grade || '';
  if (g === 'Cream') g = 'Crem';
  
  document.getElementById('edit-pj-grade').value = g;
  document.getElementById('edit-pj-butir').value = r.butir || '';
  document.getElementById('edit-pj-kilo').value = r.kilo || '';
  document.getElementById('edit-pj-harga').value = r.harga || '';
  document.getElementById('edit-pj-total').textContent = r.total || 'Rp 0';
  
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
  
  const selPel = document.getElementById('edit-pj-pelanggan');
  const txtPel = document.getElementById('edit-pj-pelanggan-txt');
  const pel = selPel.value === '__manual__' ? txtPel.value.trim() : selPel.value;
  
  const grade = document.getElementById('edit-pj-grade').value;
  const butir = parseFloat(document.getElementById('edit-pj-butir').value) || 0;
  const kilo = parseFloat(document.getElementById('edit-pj-kilo').value) || 0;
  const harga = parseFloat(document.getElementById('edit-pj-harga').value) || 0;
  const totalStr = document.getElementById('edit-pj-total').textContent;
  
  if(!pel || !grade || (!butir && !kilo) || (grade !== 'Busuk' && harga <= 0)) {
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
    const newRow = { pelanggan: pel, grade, butir, kilo, harga, total: totalStr };
    
    rec.rows[index] = newRow;
    
    const newGrandTotal = rec.rows.reduce((sum, r) => sum + (parseInt((r.total||'').replace(/[^0-9]/g,''))||0), 0);
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
    const headers=['Tanggal','Pelanggan','Grade','Butir','Kilo (kg)','Harga/kg (Rp)','Total (Rp)','Diinput Oleh'];
    const data=[];
    list.forEach(p=>{
      const items=p.rows||[];
      items.forEach(item=>{
        data.push([p.tanggal,item.pelanggan||'',item.grade||'',item.butir||0,item.kilo||0,item.harga||0,item.total||0,p.user_input||'']);
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
            'Butir': r.butir || 0,
            'Kilo': r.kilo || 0,
            'Harga': r.harga || 0,
            'Total': parseFloat(String(r.total).replace(/[^0-9,-]/g, '')) || 0
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

