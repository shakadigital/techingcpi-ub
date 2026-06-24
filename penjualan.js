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
      '<div class="sc-field"><label>Grade</label><select><option value="">-- Grade --</option><option>Normal</option><option>Crem</option><option>Bentes kering</option><option>Ceplokan</option></select></div>'+
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
      if(serverStok) return serverStok;
    } catch { /* fallback ke client-side */ }
  }
  
  // Fallback: client-side calculation
  const prod={'Normal':{butir:0,kilo:0},'Crem':{butir:0,kilo:0},'Bentes kering':{butir:0,kilo:0},'Ceplokan':{butir:0,kilo:0}};
  const inputs=await dbGetInput({sampai:tgl});
  inputs.forEach(row=>{
    const d=row.data;if(!d||!d.produksi)return;
    const mapping={'normal':'Normal','crem':'Crem','bentes_kering':'Bentes kering','ceplokan':'Ceplokan'};
    Object.keys(mapping).forEach(g=>{
      const G=mapping[g];
      prod[G].butir+=parseInt(d.produksi[g]?.butir)||0;
      prod[G].kilo+=parseFloat(d.produksi[g]?.kilo)||0;
    });
    if(d.produksi.cream){prod['Crem'].butir+=parseInt(d.produksi.cream.butir)||0;prod['Crem'].kilo+=parseFloat(d.produksi.cream.kilo)||0;}
    if(d.produksi.retak){prod['Bentes kering'].butir+=parseInt(d.produksi.retak.butir)||0;prod['Bentes kering'].kilo+=parseFloat(d.produksi.retak.kilo)||0;}
  });
  const juals=await dbGetPenjualan({sampai:tgl, limit:9999});
  juals.forEach(j=>{
    (j.rows||[]).forEach(r=>{
      const G=r.grade;
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
  const grades=['Normal','Crem','Bentes kering','Ceplokan'];
  const totalButir=grades.reduce((s,g)=>s+stok[g].butir,0);
  const totalKilo=grades.reduce((s,g)=>s+stok[g].kilo,0);
  el.innerHTML=
    '<table class="tbl" style="margin-bottom:0">'+
    '<thead><tr><th>Grade</th><th>Stok (butir)</th><th>Stok (kg)</th></tr></thead><tbody>'+
    grades.map(g=>'<tr><td>'+g+'</td><td style="font-weight:700;color:'+(stok[g].butir>0?'#1b4332':'#dc2626')+'">'+stok[g].butir.toLocaleString('id-ID')+'</td><td>'+stok[g].kilo.toFixed(2)+' kg</td></tr>').join('')+
    '<tr class="total-row"><td>TOTAL</td><td>'+totalButir.toLocaleString('id-ID')+'</td><td>'+totalKilo.toFixed(2)+' kg</td></tr>'+
    '</tbody></table>'+
    '<div style="font-size:.75rem;color:#888;margin-top:8px">Kumulatif produksi semua kandang s.d. '+tgl+', dikurangi penjualan.</div>';
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
    if(r.harga<=0){showToast(`⚠️ Baris ${no}: Harga per kg wajib diisi!`);return;}
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
      const aksiCell=isAdmin&&i===0
        ?`<td rowspan="${rows.length}" style="text-align:center;vertical-align:middle">
            <button onclick="hapusPenjualan('${rec.id}')" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#dc2626" title="Hapus transaksi ini">🗑️</button>
           </td>`
        :(isAdmin?'':'<td></td>');
      tr.innerHTML='<td>'+fmtTgl(rec.tanggal)+'</td><td>'+esc(r.pelanggan||'—')+'</td><td>'+esc(r.grade||'—')+'</td><td>'+(r.butir||0)+' butir</td><td>'+(r.kilo||0)+' kg</td><td>Rp '+(r.harga?parseFloat(r.harga).toLocaleString('id-ID'):'0')+'</td><td>'+esc(r.total||'Rp 0')+'</td>'+(i===0?aksiCell:'');
      tbody.appendChild(tr);
    });
  });
}

async function hapusPenjualan(id){
  if(!currentUser||!['admin','superadmin'].includes(currentUser.role)){showToast('⛔ Hanya Admin yang bisa menghapus data penjualan!');return;}
  const konfirm=confirm('⚠️ Hapus transaksi penjualan ini?\n\nData yang dihapus tidak bisa dikembalikan.');
  if(!konfirm)return;
  try{
    showToast('⏳ Menghapus...');
    const all=await dbGetPenjualan();
    const rec=all.find(x=>x.id===id);
    await dbDeletePenjualan(id);
    await dbSaveLog('HAPUS','penjualan',id,rec,null,
      `Hapus penjualan tgl ${rec?.tanggal||'—'}, total Rp ${(rec?.grand_total||0).toLocaleString('id-ID')}`);
    await renderStokTelur();
    await renderRiwayatJual();
    showToast('✅ Transaksi penjualan dihapus!');
  }catch(e){showToast('❌ Gagal menghapus: '+e.message);}
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
      const items=p.items||[];
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
