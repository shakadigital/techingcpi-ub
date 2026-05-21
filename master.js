// ═══ MODULE: master ═══

// ═══ MASTER DATA ═══
const MASTER_ROLES = ['superadmin','admin','manajer'];

function canMaster(){ return MASTER_ROLES.includes(currentUser?.role); }

let _currentMasterType = 'pakan';

function switchMTab(tab){
  _currentMasterType = tab;
  ['pakan','supplier','vitamin','obat','vaksin','pelanggan'].forEach(t=>{
    const btn = document.getElementById(`smtab-${t}`);
    const content = document.getElementById(`smtab-content-${t}`);
    if(btn) btn.classList.toggle('active', t===tab);
    if(content) content.style.display = t===tab ? '' : 'none';
  });
  renderMasterTab(tab);
}

async function renderMaster(){
  const canEdit = canMaster();
  ['pakan','supplier','vitamin','obat','vaksin','pelanggan'].forEach(t=>{
    const btn = document.getElementById(`btn-add-${t}`);
    if(btn) btn.style.display = canEdit ? '' : 'none';
  });
  switchMTab('pakan');
}

async function renderMasterTab(tab){
  switch(tab){
    case 'pakan':     return renderMasterPakan();
    case 'supplier':  return renderMasterSupplier();
    case 'vitamin':   return renderMasterItem('vitamin',  'm-vitamin-tbody',  'm-vitamin-empty');
    case 'obat':      return renderMasterItem('obat',     'm-obat-tbody',     'm-obat-empty');
    case 'vaksin':    return renderMasterItem('vaksin',   'm-vaksin-tbody',   'm-vaksin-empty');
    case 'pelanggan': return renderMasterPelanggan();
  }
}

async function renderMasterPakan(){
  const list = await dbGetDaftarPakan();
  const tbody = document.getElementById('m-pakan-tbody');
  const empty = document.getElementById('m-pakan-empty');
  tbody.innerHTML = '';
  if(!list.length){ empty.style.display='block'; return; }
  empty.style.display = 'none';
  list.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><span class="badge badge-gray" style="font-family:monospace">${esc(p.kode||'—')}</span></td>`+
      `<td><strong>${esc(p.nama)}</strong></td>`+
      `<td>${esc(p.satuan||'kg')}</td>`+
      `<td>${p.stok_minimal||0} kg</td>`+
      `<td><span class="badge ${p.active===false?'badge-gray':'badge-green'}">${p.active===false?'Nonaktif':'Aktif'}</span></td>`+
      `<td>`+
        (canMaster()?`<button class="btn-edit" onclick="openMasterModal('pakan','${p.id}')">✏️</button>`+
        `<button class="btn-del" onclick="deleteMasterData('pakan','${p.id}')">🗑</button>`:'')+
      `</td>`;
    tbody.appendChild(tr);
  });
}

async function renderMasterSupplier(){
  const list = await dbGetSupplier();
  const tbody = document.getElementById('m-supplier-tbody');
  const empty = document.getElementById('m-supplier-empty');
  tbody.innerHTML = '';
  if(!list.length){ empty.style.display='block'; return; }
  empty.style.display = 'none';
  list.forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><span class="badge badge-gray" style="font-family:monospace">${esc(s.kode)}</span></td>`+
      `<td><strong>${esc(s.nama)}</strong></td>`+
      `<td>${esc(s.telepon||'—')}</td>`+
      `<td><span class="badge ${s.active===false?'badge-gray':'badge-green'}">${s.active===false?'Nonaktif':'Aktif'}</span></td>`+
      `<td>`+
        (canMaster()?`<button class="btn-edit" onclick="openMasterModal('supplier','${s.id}')">✏️</button>`+
        `<button class="btn-del" onclick="deleteMasterData('supplier','${s.id}')">🗑</button>`:'')+
      `</td>`;
    tbody.appendChild(tr);
  });
}

async function renderMasterItem(type, tbodyId, emptyId){
  const getters = {vitamin:dbGetVitamin, obat:dbGetObat, vaksin:dbGetVaksin};
  const list = await getters[type]();
  const suppliers = await dbGetSupplier();
  const supMap = Object.fromEntries(suppliers.map(s=>[s.id, s.nama]));
  const tbody = document.getElementById(tbodyId);
  const empty = document.getElementById(emptyId);
  tbody.innerHTML = '';
  if(!list.length){ empty.style.display='block'; return; }
  empty.style.display = 'none';
  list.forEach(item=>{
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><span class="badge badge-gray" style="font-family:monospace">${esc(item.kode)}</span></td>`+
      `<td><strong>${esc(item.nama)}</strong></td>`+
      `<td>${esc(supMap[item.supplier_id]||'—')}</td>`+
      `<td>${esc(item.satuan||'—')}</td>`+
      `<td><span class="badge ${item.active===false?'badge-gray':'badge-green'}">${item.active===false?'Nonaktif':'Aktif'}</span></td>`+
      `<td>`+
        (canMaster()?`<button class="btn-edit" onclick="openMasterModal('${type}','${item.id}')">✏️</button>`+
        `<button class="btn-del" onclick="deleteMasterData('${type}','${item.id}')">🗑</button>`:'')+
      `</td>`;
    tbody.appendChild(tr);
  });
}

async function renderMasterPelanggan(){
  const list = await dbGetPelanggan();
  const tbody = document.getElementById('m-pelanggan-tbody');
  const empty = document.getElementById('m-pelanggan-empty');
  tbody.innerHTML = '';
  if(!list.length){ empty.style.display='block'; return; }
  empty.style.display = 'none';
  const tipeBadge = {retail:'badge-blue',grosir:'badge-green',distributor:'badge-orange'};
  list.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><span class="badge badge-gray" style="font-family:monospace">${esc(p.kode)}</span></td>`+
      `<td><strong>${esc(p.nama)}</strong></td>`+
      `<td><span class="badge ${tipeBadge[p.tipe]||'badge-gray'}">${esc(p.tipe||'—')}</span></td>`+
      `<td>${esc(p.telepon||'—')}</td>`+
      `<td><span class="badge ${p.active===false?'badge-gray':'badge-green'}">${p.active===false?'Nonaktif':'Aktif'}</span></td>`+
      `<td>`+
        (canMaster()?`<button class="btn-edit" onclick="openMasterModal('pelanggan','${p.id}')">✏️</button>`+
        `<button class="btn-del" onclick="deleteMasterData('pelanggan','${p.id}')">🗑</button>`:'')+
      `</td>`;
    tbody.appendChild(tr);
  });
}

// ── Form Templates per tipe ──
const MASTER_FORMS = {
  pakan: (d={}) => `
    <input type="hidden" id="mf-id" value="${d.id||''}"/>
    <div class="field" style="margin-bottom:12px">
      <label>Kode Pakan</label>
      <input type="text" id="mf-kode" value="${esc(d.kode||'')}" placeholder="Auto-generate jika kosong" style="font-family:monospace"/>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Nama Pakan <span style="color:#dc2626">*</span></label>
      <input type="text" id="mf-nama" value="${esc(d.nama||'')}" placeholder="Mis. Pakan Layer A"/>
    </div>
    <div class="row">
      <div class="field">
        <label>Satuan</label>
        <select id="mf-satuan">
          <option value="kg" ${d.satuan==='kg'?'selected':''}>kg</option>
          <option value="sak" ${d.satuan==='sak'?'selected':''}>sak</option>
          <option value="ton" ${d.satuan==='ton'?'selected':''}>ton</option>
        </select>
      </div>
      <div class="field">
        <label>Min. Stok (kg)</label>
        <input type="number" id="mf-stok-min" value="${d.stok_minimal||0}" min="0"/>
      </div>
    </div>`,

  supplier: (d={}) => `
    <input type="hidden" id="mf-id" value="${d.id||''}"/>
    <div class="field" style="margin-bottom:12px">
      <label>Kode Supplier</label>
      <input type="text" id="mf-kode" value="${esc(d.kode||'')}" placeholder="Auto-generate jika kosong" style="font-family:monospace"/>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Nama Supplier <span style="color:#dc2626">*</span></label>
      <input type="text" id="mf-nama" value="${esc(d.nama||'')}" placeholder="Nama perusahaan/toko"/>
    </div>
    <div class="row">
      <div class="field">
        <label>Telepon</label>
        <input type="tel" id="mf-telepon" value="${esc(d.telepon||'')}" placeholder="08xx-xxxx-xxxx"/>
      </div>
    </div>
    <div class="field">
      <label>Alamat</label>
      <textarea id="mf-alamat" rows="2" placeholder="Alamat lengkap supplier">${esc(d.alamat||'')}</textarea>
    </div>`,

  _itemWithSupplier: (d={}, supplierOpts='', satuanOpts='') => `
    <input type="hidden" id="mf-id" value="${d.id||''}"/>
    <div class="field" style="margin-bottom:12px">
      <label>Kode</label>
      <input type="text" id="mf-kode" value="${esc(d.kode||'')}" placeholder="Auto-generate jika kosong" style="font-family:monospace"/>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Nama <span style="color:#dc2626">*</span></label>
      <input type="text" id="mf-nama" value="${esc(d.nama||'')}" placeholder="Nama produk"/>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Supplier</label>
      <select id="mf-supplier">${supplierOpts}</select>
    </div>
    <div class="row">
      <div class="field">
        <label>Satuan</label>
        <select id="mf-satuan">${satuanOpts}</select>
      </div>
      <div class="field">
        <label>Harga Satuan (Rp)</label>
        <input type="number" id="mf-harga" value="${d.harga_satuan||0}" min="0" step="100"/>
      </div>
    </div>
    <div class="field">
      <label>Keterangan</label>
      <input type="text" id="mf-ket" value="${esc(d.keterangan||'')}" placeholder="Keterangan tambahan"/>
    </div>`,

  pelanggan: (d={}) => `
    <input type="hidden" id="mf-id" value="${d.id||''}"/>
    <div class="field" style="margin-bottom:12px">
      <label>Kode Pelanggan</label>
      <input type="text" id="mf-kode" value="${esc(d.kode||'')}" placeholder="Auto-generate jika kosong" style="font-family:monospace"/>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Nama Pelanggan <span style="color:#dc2626">*</span></label>
      <input type="text" id="mf-nama" value="${esc(d.nama||'')}" placeholder="Nama pelanggan/toko"/>
    </div>
    <div class="row">
      <div class="field">
        <label>Tipe</label>
        <select id="mf-tipe">
          <option value="retail"      ${d.tipe==='retail'     ?'selected':''}>Retail</option>
          <option value="grosir"      ${d.tipe==='grosir'     ?'selected':''}>Grosir</option>
          <option value="distributor" ${d.tipe==='distributor'?'selected':''}>Distributor</option>
        </select>
      </div>
      <div class="field">
        <label>Telepon</label>
        <input type="tel" id="mf-telepon" value="${esc(d.telepon||'')}" placeholder="08xx-xxxx-xxxx"/>
      </div>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Harga Khusus (Rp/kg)</label>
      <input type="number" id="mf-harga" value="${d.harga_khusus||0}" min="0" step="100" placeholder="0 = harga normal"/>
    </div>
    <div class="field">
      <label>Alamat</label>
      <textarea id="mf-alamat" rows="2" placeholder="Alamat pelanggan">${esc(d.alamat||'')}</textarea>
    </div>`
};

async function openMasterModal(type, id=null){
  if(!canMaster()){showToast('⚠️ Hanya Supervisor ke atas yang bisa mengelola data master!');return;}

  _currentMasterType = type;
  const titles = {
    pakan:'Pakan', supplier:'Supplier', vitamin:'Vitamin',
    obat:'Obat', vaksin:'Vaksin', pelanggan:'Pelanggan'
  };
  document.getElementById('modal-master-title').textContent =
    (id ? '✏️ Edit ' : '＋ Tambah ') + titles[type];

  let data = {};
  if(id){
    const getters = {
      pakan: dbGetDaftarPakan, supplier: dbGetSupplier,
      vitamin: dbGetVitamin, obat: dbGetObat,
      vaksin: dbGetVaksin, pelanggan: dbGetPelanggan
    };
    const list = await getters[type]();
    data = list.find(x=>x.id===id) || {};
  }

  let html = '';
  if(type === 'pakan'){
    html = MASTER_FORMS.pakan(data);
  } else if(type === 'supplier'){
    html = MASTER_FORMS.supplier(data);
  } else if(type === 'pelanggan'){
    html = MASTER_FORMS.pelanggan(data);
  } else {
    // vitamin, obat, vaksin — perlu supplier dropdown
    const suppliers = await dbGetSupplier();
    const supOpts = '<option value="">-- Pilih Supplier --</option>' +
      suppliers.map(s=>`<option value="${s.id}" ${data.supplier_id===s.id?'selected':''}>${esc(s.nama)}</option>`).join('');
    const satuanMap = {
      vitamin: ['botol','sachet','liter'],
      obat:    ['botol','sachet','tablet','ampul'],
      vaksin:  ['dosis','vial','botol']
    };
    const satuanOpts = (satuanMap[type]||['pcs']).map(s=>
      `<option value="${s}" ${data.satuan===s?'selected':''}>${s}</option>`).join('');
    html = MASTER_FORMS._itemWithSupplier(data, supOpts, satuanOpts);
  }

  document.getElementById('modal-master-body').innerHTML = html;
  document.getElementById('modal-master').style.display = 'flex';
}

async function saveMasterData(){
  if(!canMaster()){showToast('⚠️ Tidak ada akses!');return;}

  const type = _currentMasterType;
  const id   = document.getElementById('mf-id')?.value || '';
  const nama = document.getElementById('mf-nama')?.value.trim() || '';
  let   kode = document.getElementById('mf-kode')?.value.trim() || '';

  if(!nama){showToast('⚠️ Nama wajib diisi!');return;}

  // Validasi duplikat nama (hanya untuk data baru atau jika nama berubah)
  if(!id || document.getElementById('mf-nama')?.dataset.originalNama !== nama) {
    const tableMap = {pakan:'daftar_pakan',supplier:'master_supplier',vitamin:'master_vitamin',
                      obat:'master_obat',vaksin:'master_vaksin',pelanggan:'master_pelanggan'};
    const getters  = {pakan:dbGetDaftarPakan,supplier:dbGetSupplier,vitamin:dbGetVitamin,
                      obat:dbGetObat,vaksin:dbGetVaksin,pelanggan:dbGetPelanggan};
    try {
      const existing = await getters[type]();
      const duplikat = existing.find(x => x.nama.toLowerCase() === nama.toLowerCase() && x.id !== id);
      if(duplikat) {
        showToast(`⚠️ Nama "${nama}" sudah terdaftar (${duplikat.kode})!`);
        return;
      }
    } catch(e) { /* lanjut jika gagal cek */ }
  }
  // Auto-generate kode hanya jika kosong DAN ini data baru (bukan edit)
  if(!kode && !id){
    const prefixMap = {pakan:'PKN',supplier:'SUP',vitamin:'VIT',obat:'OBT',vaksin:'VAK',pelanggan:'PLG'};
    const tableMap  = {pakan:'daftar_pakan',supplier:'master_supplier',vitamin:'master_vitamin',
                       obat:'master_obat',vaksin:'master_vaksin',pelanggan:'master_pelanggan'};
    showToast('⏳ Generate kode...');
    kode = await dbGenerateKode(tableMap[type], prefixMap[type]);
  } else if(!kode && id) {
    showToast('⚠️ Kode tidak boleh kosong saat edit!');
    return;
  }

  let obj = { kode, nama, active: true, created_by: currentUser?.username || '' };
  if(id) obj.id = id;

  // Tambah field spesifik per tipe
  if(type === 'pakan'){
    obj.satuan      = document.getElementById('mf-satuan')?.value || 'kg';
    obj.stok_minimal= parseFloat(document.getElementById('mf-stok-min')?.value)||0;
  } else if(type === 'supplier'){
    obj.telepon  = document.getElementById('mf-telepon')?.value.trim()||null;
    obj.alamat   = document.getElementById('mf-alamat')?.value.trim()||null;
  } else if(type === 'pelanggan'){
    obj.tipe         = document.getElementById('mf-tipe')?.value || 'retail';
    obj.telepon      = document.getElementById('mf-telepon')?.value.trim()||null;
    obj.harga_khusus = parseFloat(document.getElementById('mf-harga')?.value)||0;
    obj.alamat       = document.getElementById('mf-alamat')?.value.trim()||null;
  } else {
    // vitamin, obat, vaksin
    obj.supplier_id  = document.getElementById('mf-supplier')?.value||null;
    obj.satuan       = document.getElementById('mf-satuan')?.value||'botol';
    obj.harga_satuan = parseFloat(document.getElementById('mf-harga')?.value)||0;
    obj.keterangan   = document.getElementById('mf-ket')?.value.trim()||null;
  }

  showToast('⏳ Menyimpan...');
  try{
    const tableMap = {pakan:'daftar_pakan',supplier:'master_supplier',vitamin:'master_vitamin',
                      obat:'master_obat',vaksin:'master_vaksin',pelanggan:'master_pelanggan'};
    if(type === 'pakan'){
      await dbSaveDaftarPakan(obj);
    } else {
      await dbSaveMaster(tableMap[type], obj);
    }
    closeModal('modal-master');
    renderMasterTab(type);
    await dbSaveLog(id?'EDIT':'TAMBAH', 'master_'+type, obj.id||null, null, {kode,nama},
      `${id?'Edit':'Tambah'} master ${type}: ${kode} - ${nama}`);
    showToast(`✅ Data ${type} berhasil disimpan!`);
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

async function deleteMasterData(type, id){
  if(!canMaster()){showToast('⚠️ Tidak ada akses!');return;}
  if(!confirm('Nonaktifkan data ini? Data tidak akan dihapus permanen.'))return;
  try{
    const tableMap = {pakan:'daftar_pakan',supplier:'master_supplier',vitamin:'master_vitamin',
                      obat:'master_obat',vaksin:'master_vaksin',pelanggan:'master_pelanggan'};
    if(type === 'pakan'){
      await dbDeleteDaftarPakan(id);
    } else {
      await dbDeleteMaster(tableMap[type], id);
    }
    renderMasterTab(type);
    await dbSaveLog('NONAKTIF', tableMap[type]||type, id, null, {active:false},
      `Nonaktifkan master ${type}: id=${id}`);
    showToast('✅ Data dinonaktifkan.');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}
