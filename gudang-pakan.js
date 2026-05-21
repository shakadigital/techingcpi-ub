// ═══ MODULE: gudang-pakan ═══

async function calcStokPakan(namaPakan){
  const kiriman=cache.get('kiriman_pakan')||await dbGetKiriman();
  const masuk=kiriman.filter(k=>k.nama_pakan===namaPakan).reduce((s,k)=>s+(parseFloat(k.jumlah)||0),0);
  const inputs=cache.get('_all_inputs')||await dbGetInput();
  let keluar=0;
  inputs.forEach(row=>{
    const d=row.data;if(!d||!d.pakan)return;
    d.pakan.forEach(p=>{if(p.kode===namaPakan)keluar+=parseFloat(p.jumlah)||0;});
  });
  return Math.max(0,masuk-keluar);
}

async function getHargaTerakhir(namaPakan){
  const kiriman=cache.get('kiriman_pakan')||await dbGetKiriman();
  const filtered=kiriman.filter(k=>k.nama_pakan===namaPakan);
  if(!filtered.length)return 0;
  filtered.sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  return parseFloat(filtered[0].harga_per_kg)||0;
}

async function renderGudang(){
  const pakans=await dbGetDaftarPakan();
  cache.set('daftar_pakan',pakans);

  // Fetch semua data sekali — tidak ada N+1
  const kiriman=await dbGetKiriman();
  const allInputs=await dbGetInput();
  cache.set('_all_inputs',allInputs);

  // Pre-compute stok & harga per pakan dari data yang sudah di-fetch
  const stokMap={},hargaMap={};
  kiriman.forEach(k=>{
    if(!k.nama_pakan)return;
    stokMap[k.nama_pakan]=(stokMap[k.nama_pakan]||0)+(parseFloat(k.jumlah)||0);
  });
  allInputs.forEach(row=>{
    const d=row.data;if(!d||!d.pakan)return;
    d.pakan.forEach(p=>{if(p.kode)stokMap[p.kode]=(stokMap[p.kode]||0)-(parseFloat(p.jumlah)||0);});
  });
  // Harga terakhir per pakan
  const kirimanSorted=[...kiriman].sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  kirimanSorted.forEach(k=>{if(k.nama_pakan&&!hargaMap[k.nama_pakan])hargaMap[k.nama_pakan]=parseFloat(k.harga_per_kg)||0;});

  const tbody=document.getElementById('stok-tbody');
  const empty=document.getElementById('stok-empty');
  tbody.innerHTML='';
  if(!pakans.length){empty.style.display='block';}
  else{
    empty.style.display='none';
    pakans.forEach(p=>{
      const stok=Math.max(0,stokMap[p.nama]||0);
      const min=parseFloat(p.stok_minimal)||0;
      const low=stok<=min;
      const pct=min>0?Math.min(100,Math.round((stok/min)*100)):100;
      const harga=hargaMap[p.nama]||0;
      const tr=document.createElement('tr');
      tr.innerHTML=
        '<td><strong>'+esc(p.nama)+'</strong></td>'+
        '<td>'+stok.toFixed(1)+' kg<div class="stok-bar"><div class="stok-bar-track"><div class="stok-bar-fill'+(low?' low':'')+'" style="width:'+Math.min(pct,100)+'%"></div></div><span class="stok-bar-pct">'+(min>0?pct+'%':'—')+'</span></div></td>'+
        '<td>'+(min||'—')+' kg</td>'+
        '<td>'+(harga?'Rp '+parseFloat(harga).toLocaleString('id-ID'):'—')+'</td>'+
        '<td>'+(low?'<span class="badge badge-red">Stok Rendah</span>':'<span class="badge badge-green">Aman</span>')+'</td>'+
        '<td>'+
          (can('KEUANGAN')?'<button class="btn-edit" onclick="openStokModal(\''+p.id+'\')">✏️</button>':'')+
          (can('KEUANGAN')?'<button class="btn-del" onclick="deletePakan(\''+p.id+'\')">🗑</button>':'')+
        '</td>';
      tbody.appendChild(tr);
    });
  }

  // Kiriman tabel — data sudah ada di kiriman
  const ktbody=document.getElementById('kiriman-tbody');
  const kempty=document.getElementById('kiriman-empty');
  ktbody.innerHTML='';
  if(!kiriman.length){kempty.style.display='block';}
  else{
    kempty.style.display='none';
    kiriman.slice(0,40).forEach(k=>{
      const tr=document.createElement('tr');
      const total=(parseFloat(k.jumlah)||0)*(parseFloat(k.harga_total)||0);
      const statusBayar=k.status_bayar||'belum';
      const statusBadge=statusBayar==='lunas'
        ?'<span class="badge badge-green">Lunas</span>'
        :statusBayar==='sebagian'
          ?`<span class="badge badge-orange">Sisa Rp ${parseFloat(k.sisa_tagihan||0).toLocaleString('id-ID')}</span>`
          :'<span class="badge badge-red">Belum Bayar</span>';
      tr.innerHTML='<td>'+fmtTgl(k.tanggal)+'</td><td>'+esc(k.nama_pakan)+'</td><td>'+k.jumlah+' kg</td><td>Rp '+parseFloat(k.harga_per_kg||0).toLocaleString('id-ID')+'/kg</td><td>Rp '+parseFloat(k.harga_total||0).toLocaleString('id-ID')+'</td><td>'+esc(k.keterangan||'—')+'</td>'+
        '<td>'+statusBadge+'</td>'+
        '<td style="white-space:nowrap">'+
          (can('JUAL')?'<button class="btn-edit" onclick="openKirimanEditModal(\''+k.id+'\')">✏️</button>':'')+
          (can('KEUANGAN')&&statusBayar!=='lunas'?'<button class="btn-add" style="padding:3px 8px;font-size:.75rem;margin:0 2px" onclick="openBayarModal(\''+k.id+'\')">💳 Bayar</button>':'')+
          (can('KEUANGAN')?'<button class="btn-del" onclick="deleteKiriman(\''+k.id+'\')">🗑</button>':'')+
        '</td>';
      ktbody.appendChild(tr);
    });
  }

  // Riwayat pemakaian — dari allInputs yang sudah di-fetch
  const pemakaian=[];
  allInputs.forEach(row=>{const d=row.data;if(!d||!d.pakan)return;d.pakan.forEach(p=>{if(p.kode&&p.jumlah)pemakaian.push({tgl:d.tanggal,kandang:d.kandang,pakan:p.kode,jumlah:p.jumlah});});});
  pemakaian.sort((a,b)=>b.tgl.localeCompare(a.tgl));
  const ptbody=document.getElementById('pakai-tbody');
  const pempty=document.getElementById('pakai-empty');
  ptbody.innerHTML='';
  if(!pemakaian.length){pempty.style.display='block';}
  else{pempty.style.display='none';pemakaian.slice(0,40).forEach(p=>{const tr=document.createElement('tr');tr.innerHTML='<td>'+esc(p.tgl)+'</td><td>'+esc(p.kandang)+'</td><td>'+esc(p.pakan)+'</td><td>'+p.jumlah+' kg</td>';ptbody.appendChild(tr);});}

  // Section pembayaran — hanya manajer ke atas
  const canBayar=can('KEUANGAN');
  const secBayar=document.getElementById('section-pembayaran');
  const secPembelian=document.getElementById('section-pembelian');
  if(secBayar) secBayar.style.display=canBayar?'block':'none';
  if(secPembelian) secPembelian.style.display=canBayar?'block':'none';
  if(canBayar) {
    await renderPembayaran();
    await renderPembelian();
  }
}

// ═══ PEMBAYARAN PAKAN & PULLET ═══
async function renderPembayaran(){
  const list=await dbGetPembayaran({});
  const tbody=document.getElementById('bayar-tbody');
  const empty=document.getElementById('bayar-empty');
  if(!tbody)return;
  tbody.innerHTML='';
  if(!list.length){empty.style.display='block';return;}
  empty.style.display='none';
  list.slice(0,60).forEach(b=>{
    const statusSisa=b.sisa_tagihan>0
      ?`<span class="badge badge-orange">Sisa Rp ${parseFloat(b.sisa_tagihan).toLocaleString('id-ID')}</span>`
      :'<span class="badge badge-green">Lunas</span>';
    const tr=document.createElement('tr');
    tr.innerHTML=
      '<td>'+fmtTgl(b.tanggal)+'</td>'+
      '<td>'+(b.jenis==='pakan'?'🌾 Pakan':'🐔 Pullet')+'</td>'+
      '<td>'+esc(b.supplier||'—')+'</td>'+
      '<td style="font-weight:700;color:#1b4332">Rp '+parseFloat(b.jumlah_bayar).toLocaleString('id-ID')+'</td>'+
      '<td><span class="badge badge-gray">'+esc(b.metode)+'</span></td>'+
      '<td style="font-size:.8rem">'+esc(b.keterangan||'—')+'</td>'+
      '<td>'+statusSisa+'<button class="btn-del" style="margin-left:4px" onclick="deletePembayaran(\''+b.id+'\')">🗑</button></td>';
    tbody.appendChild(tr);
  });
}

// ═══ PEMBELIAN & TAGIHAN ═══
let currentPembTab = 'belum';

async function renderPembelian(){
  const kiriman = await dbGetKiriman({});
  const tbody = document.getElementById('pembelian-tbody');
  const empty = document.getElementById('pembelian-empty');
  if(!tbody) return;
  
  // Filter berdasarkan tab aktif
  let filteredData = kiriman;
  if(currentPembTab === 'belum') {
    filteredData = kiriman.filter(k => k.status_bayar !== 'lunas');
  } else if(currentPembTab === 'lunas') {
    filteredData = kiriman.filter(k => k.status_bayar === 'lunas');
  }
  
  tbody.innerHTML = '';
  if(!filteredData.length) {
    empty.style.display = 'block';
    empty.textContent = currentPembTab === 'belum' ? 'Tidak ada tagihan yang belum lunas.' : 
                       currentPembTab === 'lunas' ? 'Tidak ada tagihan yang sudah lunas.' : 
                       'Tidak ada data pembelian.';
    return;
  }
  
  empty.style.display = 'none';
  filteredData.slice(0,50).forEach(k => {
    const total = parseFloat(k.harga_total) || 0;
    const sisa = parseFloat(k.sisa_tagihan) || 0;
    const statusBayar = k.status_bayar || 'belum';
    
    let statusBadge, statusClass;
    if(statusBayar === 'lunas') {
      statusBadge = '<span class="badge badge-green">✅ Lunas</span>';
      statusClass = '';
    } else if(statusBayar === 'sebagian') {
      statusBadge = `<span class="badge badge-orange">⏳ Sisa Rp ${sisa.toLocaleString('id-ID')}</span>`;
      statusClass = '';
    } else {
      statusBadge = `<span class="badge badge-red">❌ Belum Bayar</span>`;
      statusClass = '';
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = 
      `<td>${fmtTgl(k.tanggal)}</td>` +
      `<td>🌾 Pakan</td>` +
      `<td>${esc(k.supplier || '—')}</td>` +
      `<td>${esc(k.nama_pakan)} (${k.jumlah} kg)</td>` +
      `<td>${k.jumlah} kg</td>` +
      `<td style="font-weight:700;color:#1b4332">Rp ${total.toLocaleString('id-ID')}</td>` +
      `<td>${statusBadge}</td>` +
      `<td>` +
        (statusBayar !== 'lunas' ? `<button class="btn-edit" onclick="openBayarModal('${k.id}')" title="Bayar">💳</button>` : '') +
        `<button class="btn-edit" onclick="editKiriman('${k.id}')" title="Edit" style="background:#ede9fe;color:#6d28d9;margin-left:4px">✏️</button>` +
        (can('KEUANGAN') ? `<button class="btn-del" onclick="deleteKiriman('${k.id}')" title="Hapus" style="margin-left:4px">🗑</button>` : '') +
      `</td>`;
    tbody.appendChild(tr);
  });
}

function switchPembTab(tab) {
  currentPembTab = tab;
  
  // Update tab buttons
  document.getElementById('pemb-tab-belum').classList.toggle('active', tab === 'belum');
  document.getElementById('pemb-tab-lunas').classList.toggle('active', tab === 'lunas');
  document.getElementById('pemb-tab-semua').classList.toggle('active', tab === 'semua');
  
  // Re-render table
  renderPembelian();
}

async function exportPembelian() {
  if(!can('EXPORT_LAP')) {
    showToast('⚠️ Tidak ada akses export!');
    return;
  }
  try {
    const kiriman = await dbGetKiriman({});
    if(!kiriman.length){showToast('⚠️ Tidak ada data untuk diexport!');return;}
    const headers=['Tanggal','Supplier','Nama Pakan','Jumlah (kg)','Harga per kg (Rp)','Total Tagihan (Rp)','Status Bayar','Sisa Tagihan (Rp)','Keterangan','User Input'];
    const data = kiriman.map(k => [
      k.tanggal, k.supplier||'', k.nama_pakan,
      k.jumlah, k.harga_per_kg||0, k.harga_total||0,
      k.status_bayar||'belum', k.sisa_tagihan||0,
      k.keterangan||'', k.user_input||''
    ]);
    exportExcel('Laporan Pembelian Pakan', headers, data, `Laporan_Pembelian_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch(e) {
    showToast('❌ Gagal export: ' + e.message);
  }
}

async function editKiriman(id) {
  if(!can('BIAYA')) {
    showToast('⚠️ Tidak ada akses edit kiriman!');
    return;
  }
  
  try {
    const kiriman = await dbGetKiriman({});
    const k = kiriman.find(x => x.id === id);
    if(!k) {
      showToast('❌ Data kiriman tidak ditemukan!');
      return;
    }
    
    // Populate form dengan data existing
    const pakans = await dbGetDaftarPakan();
    const sel = document.getElementById('mk2-pakan');
    sel.innerHTML = '';
    pakans.forEach(p => {
      const o = document.createElement('option');
      o.value = p.nama;
      o.textContent = p.nama;
      sel.appendChild(o);
    });
    
    // Set values
    document.getElementById('mk2-id').value = k.id;
    document.getElementById('mk2-tgl').value = k.tanggal;
    document.getElementById('mk2-pakan').value = k.nama_pakan;
    document.getElementById('mk2-jumlah').value = k.jumlah;
    document.getElementById('mk2-harga').value = k.harga_per_kg || 0;
    document.getElementById('mk2-supplier').value = k.supplier || '';
    document.getElementById('mk2-ket').value = k.keterangan || '';
    
    calcKirimanTotal();
    document.getElementById('modal-kiriman').style.display = 'flex';
    
  } catch(e) {
    showToast('❌ Gagal load data: ' + e.message);
  }
}

async function openBayarModal(kirimanId){
  if(!can('KEUANGAN')){showToast('⚠️ Hanya Manajer ke atas yang bisa catat pembayaran!');return;}
  // Reset form
  document.getElementById('mb-ref-id').value=kirimanId||'';
  document.getElementById('mb-tgl').value=new Date().toISOString().split('T')[0];
  document.getElementById('mb-jenis').value='pakan';
  document.getElementById('mb-jumlah').value='';
  document.getElementById('mb-noref').value='';
  document.getElementById('mb-ket').value='';
  document.getElementById('mb-tagihan-total').value='';
  document.getElementById('mb-sisa').value='';
  document.getElementById('mb-sisa-setelah-wrap').style.display='none';

  // Populate supplier dropdown
  await populateSupplierSelect('mb-supplier-select');
  setSupplierValue('mb-supplier-select','mb-supplier-text','mb-supplier','');

  // Populate dropdown tagihan kiriman belum lunas
  const kiriman=await dbGetKiriman({});
  const sel=document.getElementById('mb-tagihan');
  sel.innerHTML='<option value="">-- Pilih tagihan atau isi manual --</option>';
  kiriman.filter(k=>k.status_bayar!=='lunas').forEach(k=>{
    const sisa=parseFloat(k.sisa_tagihan)||parseFloat(k.harga_total)||0;
    const opt=document.createElement('option');
    opt.value=k.id;
    opt.dataset.total=k.harga_total||0;
    opt.dataset.sisa=sisa;
    opt.dataset.supplier=k.supplier||'';
    opt.textContent=`${fmtTgl(k.tanggal)} — ${k.nama_pakan} ${k.jumlah}kg — Sisa Rp ${sisa.toLocaleString('id-ID')}`;
    sel.appendChild(opt);
  });

  // Jika dipanggil dari tombol kiriman tertentu
  if(kirimanId){
    sel.value=kirimanId;
    onTagihanSelect();
  }
  document.getElementById('modal-bayar').style.display='flex';
}

function onBayarJenisChange(){
  const jenis=document.getElementById('mb-jenis').value;
  document.getElementById('mb-tagihan-wrap').style.display=jenis==='pakan'?'block':'none';
  if(jenis==='pullet'){
    document.getElementById('mb-tagihan-total').removeAttribute('readonly');
    document.getElementById('mb-sisa').removeAttribute('readonly');
  } else {
    document.getElementById('mb-tagihan-total').setAttribute('readonly','');
    document.getElementById('mb-sisa').setAttribute('readonly','');
  }
}

function onTagihanSelect(){
  const sel=document.getElementById('mb-tagihan');
  const opt=sel.options[sel.selectedIndex];
  if(opt&&opt.value){
    document.getElementById('mb-tagihan-total').value=opt.dataset.total||0;
    document.getElementById('mb-sisa').value=opt.dataset.sisa||0;
    setSupplierValue('mb-supplier-select','mb-supplier-text','mb-supplier',opt.dataset.supplier||'');
  } else {
    document.getElementById('mb-tagihan-total').value='';
    document.getElementById('mb-sisa').value='';
  }
  calcSisaBayar();
}

function calcSisaBayar(){
  const sisa=parseFloat(document.getElementById('mb-sisa').value)||0;
  const bayar=parseFloat(document.getElementById('mb-jumlah').value)||0;
  const wrap=document.getElementById('mb-sisa-setelah-wrap');
  const el=document.getElementById('mb-sisa-setelah');
  if(bayar>0){
    const sisaSetelah=Math.max(0,sisa-bayar);
    wrap.style.display='block';
    el.textContent='Rp '+sisaSetelah.toLocaleString('id-ID');
    el.style.color=sisaSetelah<=0?'#16a34a':'#dc2626';
  } else {
    wrap.style.display='none';
  }
}

async function savePembayaran(){
  const tanggal=document.getElementById('mb-tgl').value;
  const jenis=document.getElementById('mb-jenis').value;
  const supplier=document.getElementById('mb-supplier').value.trim();
  const jumlah_bayar=parseFloat(document.getElementById('mb-jumlah').value)||0;
  const jumlah_tagihan=parseFloat(document.getElementById('mb-tagihan-total').value)||0;
  const sisa_sebelum=parseFloat(document.getElementById('mb-sisa').value)||0;
  const sisa_tagihan=Math.max(0,sisa_sebelum-jumlah_bayar);
  const metode=document.getElementById('mb-metode').value;
  const no_referensi=document.getElementById('mb-noref').value.trim();
  const keterangan=document.getElementById('mb-ket').value.trim();
  const refId=document.getElementById('mb-ref-id').value||document.getElementById('mb-tagihan').value||null;

  if(!tanggal){showToast('⚠️ Tanggal wajib diisi!');return;}
  if(!supplier){showToast('⚠️ Nama supplier wajib diisi!');return;}
  if(!jumlah_bayar||jumlah_bayar<=0){showToast('⚠️ Jumlah bayar harus lebih dari 0!');return;}
  if(jumlah_tagihan>0&&jumlah_bayar>sisa_sebelum){
    showToast(`⚠️ Jumlah bayar (Rp ${jumlah_bayar.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${sisa_sebelum.toLocaleString('id-ID')})!`);return;
  }

  showToast('⏳ Menyimpan...');
  try{
    await dbSavePembayaran({
      tanggal,jenis,supplier,
      referensi_id:refId||null,
      jumlah_tagihan,jumlah_bayar,sisa_tagihan,
      metode,no_referensi:no_referensi||null,
      keterangan:keterangan||null,
      user_input:currentUser?.username||''
    });
    if(refId) await dbUpdateStatusTagihan(refId,jumlah_bayar);
    closeModal('modal-bayar');
    await renderGudang();
    await dbSaveLog('TAMBAH','pembayaran',null,null,
      {tanggal,jenis,supplier,jumlah_bayar,metode},
      `Pembayaran ${jenis}: ${supplier} Rp ${jumlah_bayar.toLocaleString('id-ID')} via ${metode}`);
    showToast('✅ Pembayaran dicatat!');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

async function deletePembayaran(id){
  if(!can('KEUANGAN')){showToast('⚠️ Tidak ada akses!');return;}
  if(!confirm('Hapus data pembayaran ini?'))return;
  try{
    const list=await dbGetPembayaran({});
    const b=list.find(x=>x.id===id);
    await dbDeletePembayaran(id);
    await renderGudang();
    await dbSaveLog('HAPUS','pembayaran',id,b,null,
      `Hapus pembayaran: ${b?.supplier||'—'} Rp ${(b?.jumlah_bayar||0).toLocaleString('id-ID')}`);
    showToast('🗑 Pembayaran dihapus.');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

async function openStokModal(id){
  const pakans=cache.get('daftar_pakan')||await dbGetDaftarPakan();
  const p=id?pakans.find(x=>x.id===id):null;
  document.getElementById('modal-stok-title').textContent=p?'Edit Pakan':'Daftarkan Pakan';
  document.getElementById('ms-id').value=p?p.id:'';
  document.getElementById('ms-nama').value=p?p.nama:'';
  document.getElementById('ms-min').value=p?p.stok_minimal:'';
  document.getElementById('modal-stok').style.display='flex';
}
async function saveStok(){
  const nama=document.getElementById('ms-nama').value.trim();
  const min=parseFloat(document.getElementById('ms-min').value)||0;
  if(!nama){showToast('⚠️ Nama pakan wajib diisi!');return;}
  if(nama.length<2){showToast('⚠️ Nama pakan minimal 2 karakter!');return;}
  if(min<0){showToast('⚠️ Minimum stok tidak boleh negatif!');return;}
  const id=document.getElementById('ms-id').value;
  const obj={nama,stok_minimal:min};
  if(id)obj.id=id;
  try{await dbSaveDaftarPakan(obj);closeModal('modal-stok');await renderGudang();
    await dbSaveLog(id?'EDIT':'TAMBAH','daftar_pakan',obj.id||null,null,obj,`${id?'Edit':'Tambah'} pakan: ${nama}`);
    showToast('✅ Pakan disimpan!');}
  catch(e){showToast('❌ Gagal: '+e.message);}
}
// ── Helper: populate supplier dropdown + fallback text input ──
async function populateSupplierSelect(selectId) {
  const sel = document.getElementById(selectId);
  if(!sel) return;
  const suppliers = await dbGetSupplier();
  sel.innerHTML = '<option value="">-- Pilih Supplier --</option>';
  suppliers.filter(s => s.active !== false).forEach(s => {
    const o = document.createElement('option');
    o.value = s.nama;
    o.textContent = s.nama;
    sel.appendChild(o);
  });
  // Tambah opsi "Lainnya" jika ada data master
  if(suppliers.length) {
    const o = document.createElement('option');
    o.value = '__other__';
    o.textContent = '— Lainnya (ketik manual) —';
    sel.appendChild(o);
  }
}

function onSupplierSelectChange(selectId, textId, hiddenId) {
  const sel = document.getElementById(selectId);
  const txt = document.getElementById(textId);
  const hid = document.getElementById(hiddenId);
  if(sel.value === '__other__') {
    txt.style.display = 'block';
    txt.value = '';
    txt.focus();
    hid.value = '';
    txt.oninput = () => { hid.value = txt.value.trim(); };
  } else {
    txt.style.display = 'none';
    txt.value = '';
    hid.value = sel.value;
  }
}

// Set nilai supplier pada dropdown (saat edit), fallback ke text jika tidak ada di master
function setSupplierValue(selectId, textId, hiddenId, value) {
  const sel = document.getElementById(selectId);
  const txt = document.getElementById(textId);
  const hid = document.getElementById(hiddenId);
  if(!value) { sel.value = ''; txt.style.display='none'; hid.value=''; return; }
  // Cek apakah value ada di options
  const found = Array.from(sel.options).some(o => o.value === value);
  if(found) {
    sel.value = value;
    txt.style.display = 'none';
    hid.value = value;
  } else {
    // Tidak ada di master → tampilkan sebagai "Lainnya"
    sel.value = '__other__';
    txt.style.display = 'block';
    txt.value = value;
    hid.value = value;
    txt.oninput = () => { hid.value = txt.value.trim(); };
  }
}

async function openKirimanModal(){
  const pakans=await dbGetDaftarPakan();
  if(!pakans.length){showToast('⚠️ Daftarkan pakan terlebih dahulu!');return;}
  const sel=document.getElementById('mk2-pakan');
  sel.innerHTML='';pakans.forEach(p=>{const o=document.createElement('option');o.value=p.nama;o.textContent=p.nama;sel.appendChild(o);});
  document.getElementById('mk2-id').value='';
  document.getElementById('mk2-tgl').value=new Date().toISOString().split('T')[0];
  document.getElementById('mk2-jumlah').value='';
  document.getElementById('mk2-harga').value='';
  document.getElementById('mk2-total').value='';
  document.getElementById('mk2-ket').value='';
  await populateSupplierSelect('mk2-supplier-select');
  setSupplierValue('mk2-supplier-select','mk2-supplier-text','mk2-supplier','');
  document.getElementById('modal-kiriman').style.display='flex';
}
function calcKirimanTotal(){
  const j=parseFloat(document.getElementById('mk2-jumlah').value)||0;
  const h=parseFloat(document.getElementById('mk2-harga').value)||0;
  document.getElementById('mk2-total').value=j&&h?'Rp '+(j*h).toLocaleString('id-ID'):'';
}
async function saveKiriman(){
  const tanggal=document.getElementById('mk2-tgl').value;
  const nama_pakan=document.getElementById('mk2-pakan').value;
  const jumlah=parseFloat(document.getElementById('mk2-jumlah').value)||0;
  const harga_per_kg=parseFloat(document.getElementById('mk2-harga').value)||0;
  const harga_total=jumlah*harga_per_kg;
  const supplier=document.getElementById('mk2-supplier').value.trim();
  const keterangan=document.getElementById('mk2-ket').value;
  const sumber=document.getElementById('mk2-sumber').value||'inti';
  const editId=document.getElementById('mk2-id').value;

  if(!tanggal){showToast('⚠️ Tanggal wajib diisi!');return;}
  if(!nama_pakan){showToast('⚠️ Pilih jenis pakan!');return;}
  if(!jumlah||jumlah<=0){showToast('⚠️ Jumlah harus lebih dari 0!');return;}
  if(harga_per_kg<=0){showToast('⚠️ Harga per kg wajib diisi!');return;}
  if(!supplier){showToast('⚠️ Nama supplier wajib diisi!');return;}

  try{
    if(editId){
      const kiriman = await dbGetKiriman({});
      const existing = kiriman.find(x => x.id === editId);
      if(existing){
        await dbUpsert('kiriman_pakan', {...existing, tanggal, nama_pakan, jumlah, harga_per_kg, harga_total, supplier, keterangan, sumber, sisa_tagihan: harga_total});
        cache.del('kiriman_pakan');
      }
    }else{
      await dbSaveKiriman({tanggal,nama_pakan,jumlah,harga_per_kg,harga_total,supplier,keterangan,sumber,sisa_tagihan:harga_total,status_bayar:'belum',user_input:currentUser?.username||''});
    }
    closeModal('modal-kiriman');await renderGudang();
    await dbSaveLog(editId?'EDIT':'TAMBAH','kiriman_pakan',editId||null,null,
      {tanggal,nama_pakan,jumlah,harga_per_kg,harga_total,supplier,sumber},
      `${editId?'Edit':'Tambah'} kiriman: ${nama_pakan} ${jumlah}kg dari ${supplier||'—'} (${sumber})`);
    showToast(editId?'✅ Kiriman diperbarui!':`✅ Kiriman pakan dicatat (${sumber==='inti'?'tagihan inti':'beli sendiri'})!`);
  }catch(e){showToast('❌ Gagal: '+e.message);}
}
// Edit kiriman — supervisor ke atas boleh
async function openKirimanEditModal(id){
  if(!can('JUAL')){showToast('⚠️ Tidak ada akses!');return;}
  const kiriman=await dbGetKiriman({});
  const k=kiriman.find(x=>x.id===id);
  if(!k)return;
  const pakans=await dbGetDaftarPakan();
  const sel=document.getElementById('mk2-pakan');
  sel.innerHTML='';
  pakans.forEach(p=>{const o=document.createElement('option');o.value=p.nama;o.textContent=p.nama;sel.appendChild(o);});
  document.getElementById('mk2-id').value=k.id;
  document.getElementById('mk2-tgl').value=k.tanggal||'';
  sel.value=k.nama_pakan||'';
  document.getElementById('mk2-jumlah').value=k.jumlah||'';
  document.getElementById('mk2-harga').value=k.harga_per_kg||'';
  calcKirimanTotal();
  document.getElementById('mk2-ket').value=k.keterangan||'';
  await populateSupplierSelect('mk2-supplier-select');
  setSupplierValue('mk2-supplier-select','mk2-supplier-text','mk2-supplier',k.supplier||'');
  document.getElementById('modal-kiriman').style.display='flex';
}

// ═══ HOME ═══