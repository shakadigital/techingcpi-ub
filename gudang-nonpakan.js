// ═══ MODULE: gudang-nonpakan ═══

// ═══ GUDANG — TAB NON-PAKAN ═══
const NP_CONFIG = {
  vitamin:     { icon:'💊', label:'Vitamin',     satuan:'botol',  category:'cair',  base_unit:'gram', kemasan:['sachet','botol','kaleng','pak','dus'] },
  obat:        { icon:'🩺', label:'Obat',        satuan:'botol',  category:'cair',  base_unit:'ml',   kemasan:['botol','sachet','kaleng','ampul','vial','jerigen'] },
  vaksin:      { icon:'💉', label:'Vaksin',      satuan:'dosis',  category:'padat', base_unit:'dosis',kemasan:['vial','botol','ampul'] },
  desinfektan: { icon:'🧴', label:'Desinfektan', satuan:'liter',  category:'cair',  base_unit:'ml',   kemasan:['botol','jerigen','drum','liter'] },
  lainnya:     { icon:'📦', label:'Lainnya',     satuan:'pcs',    category:'padat', base_unit:'pcs',  kemasan:['pcs','sachet','botol','kaleng','pak','dus'] }
};

// ── Unit helpers (padat & cair) ──
const UNITS_PADAT = [
  { name:'pcs',    factor:1,    base:'pcs',   label:'pcs'    },
  { name:'sachet', factor:1,    base:'pcs',   label:'sachet' },
  { name:'tablet', factor:1,    base:'pcs',   label:'tablet' },
  { name:'ampul',  factor:1,    base:'pcs',   label:'ampul'  },
  { name:'vial',   factor:1,    base:'pcs',   label:'vial'   },
  { name:'dosis',  factor:1,    base:'pcs',   label:'dosis'  },
  { name:'pak',    factor:10,   base:'pcs',   label:'pak (10 pcs)'  },
  { name:'box',    factor:12,   base:'pcs',   label:'box (12 pcs)'  },
  { name:'dus',    factor:24,   base:'pcs',   label:'dus (24 pcs)'  },
  { name:'kg',     factor:1000, base:'pcs',   label:'kg (1000 gr)'  },
];
const UNITS_CAIR = [
  { name:'ml',    factor:0.001,  base:'liter', label:'ml'           },
  { name:'botol', factor:0.6,    base:'liter', label:'botol (600ml)'},
  { name:'liter', factor:1,      base:'liter', label:'liter'        },
  { name:'galon', factor:3.785,  base:'liter', label:'galon (3.785L)'},
  { name:'drum',  factor:200,    base:'liter', label:'drum (200L)'  },
];

function getUnitsForCategory(category) {
  return category === 'cair' ? UNITS_CAIR : UNITS_PADAT;
}

function findUnitDef(name, category) {
  return getUnitsForCategory(category).find(u => u.name === name) || { name, factor:1, base: category==='cair'?'liter':'pcs' };
}

// Konversi qty dari satuan input ke base unit
function toBase(qty, unitName, category) {
  const u = findUnitDef(unitName, category);
  return parseFloat(qty) * u.factor;
}

// Format stok dari base unit ke display unit yang paling readable
function formatStokDisplay(qtyBase, category, preferUnit) {
  const units = getUnitsForCategory(category);
  // Gunakan preferUnit jika ada, fallback ke base
  const u = preferUnit ? findUnitDef(preferUnit, category) : units[0];
  const val = qtyBase / u.factor;
  const rounded = Math.round(val * 1000) / 1000;
  return `${rounded.toLocaleString('id-ID')} ${u.name}`;
}

// Populate select satuan berdasarkan category
function populateUnitSelect(selectId, category, selectedName) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const units = getUnitsForCategory(category);
  sel.innerHTML = units.map(u =>
    `<option value="${u.name}" ${u.name===selectedName?'selected':''}>${u.label}</option>`
  ).join('');
}

let _currentGTab = 'pakan';

function switchGTab(tab) {
  _currentGTab = tab;
  ['pakan','vitamin','obat','vaksin','desinfektan','lainnya'].forEach(t => {
    document.getElementById(`gtab-${t}`).classList.toggle('active', t === tab);
  });

  // Tampilkan konten tabel, sembunyikan cards overview
  const qaCards = document.getElementById('gudang-qa');
  if(qaCards) qaCards.style.display = 'none';
  const contentArea = document.getElementById('gudang-content-area');
  if(contentArea) contentArea.style.display = '';

  const isPakan = tab === 'pakan';
  document.getElementById('gtab-content-pakan').style.display    = isPakan ? '' : 'none';
  document.getElementById('gtab-content-nonpakan').style.display = isPakan ? 'none' : '';

  if(isPakan) {
    renderGudangPakan();
  } else {
    renderGudangNonPakan(tab);
  }
}

// Kembali ke tampilan cards gudang
function showGudangCards() {
  const qaCards = document.getElementById('gudang-qa');
  if(qaCards) qaCards.style.display = '';
  const contentArea = document.getElementById('gudang-content-area');
  if(contentArea) contentArea.style.display = 'none';
  // Reset active state
  ['pakan','vitamin','obat','vaksin','desinfektan','lainnya'].forEach(t => {
    document.getElementById(`gtab-${t}`).classList.remove('active');
  });
  // Refresh stok info di cards
  loadGudangCardStok();
}

// Load info stok ringkas ke dalam cards
async function loadGudangCardStok() {
  // Pakan
  try {
    const pakans = await dbGetDaftarPakan();
    const kiriman = await dbGetKiriman({});
    let totalStokPakan = 0;
    pakans.forEach(p => {
      const masuk = kiriman.filter(k => k.nama_pakan === p.nama).reduce((s, k) => s + (parseFloat(k.jumlah) || 0), 0);
      totalStokPakan += masuk;
    });
    const elPakan = document.getElementById('gtab-pakan-info');
    if(elPakan) elPakan.textContent = pakans.length ? `${pakans.length} jenis · ${totalStokPakan.toLocaleString('id-ID')} kg` : 'Belum ada data';
  } catch(e) {}

  // Non-pakan categories
  const categories = ['vitamin','obat','vaksin','desinfektan','lainnya'];
  for(const cat of categories) {
    try {
      const stok = await dbGetStokNonPakan(cat);
      const el = document.getElementById(`gtab-${cat}-info`);
      if(el) {
        if(stok.length) {
          const totalItems = stok.length;
          const lowItems = stok.filter(s => s.stok <= 0).length;
          el.textContent = `${totalItems} item` + (lowItems ? ` · ⚠️ ${lowItems} habis` : ' · ✅');
        } else {
          el.textContent = 'Belum ada stok';
        }
      }
    } catch(e) {}
  }
}

async function renderGudangPakan() {
  // Render semua konten pakan yang sudah ada
  await renderGudang();
}

async function renderGudangNonPakan(kategori) {
  const cfg = NP_CONFIG[kategori];
  if(!cfg) return;

  // Update judul
  document.getElementById('np-stok-icon').textContent     = cfg.icon;
  document.getElementById('np-stok-title').textContent    = `Stok ${cfg.label}`;
  document.getElementById('np-kiriman-title').textContent = `Kiriman ${cfg.label} Masuk`;
  document.getElementById('np-pakai-title').textContent   = `Riwayat Pemakaian ${cfg.label}`;

  // Render stok
  await renderNpStok(kategori);
  // Render kiriman
  await renderNpKiriman(kategori);
  // Render pemakaian
  await renderNpPakai(kategori);
}

async function renderNpStok(kategori) {
  const stokList = await dbGetStokNonPakan(kategori);
  const tbody = document.getElementById('np-stok-tbody');
  const empty = document.getElementById('np-stok-empty');
  tbody.innerHTML = '';
  if(!stokList.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  stokList.forEach(s => {
    const low = s.stok_base <= 0;
    const categoryBadge = s.category === 'cair'
      ? '<span class="badge badge-blue" style="font-size:.6rem">💧 Cair</span>'
      : '<span class="badge badge-gray" style="font-size:.6rem">📦 Padat</span>';
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><strong>${esc(s.nama)}</strong> ${categoryBadge}</td>`+
      `<td style="font-weight:700;color:${low?'#dc2626':'#1b4332'}">${s.stok.toFixed(2)}</td>`+
      `<td>${esc(s.satuan)}</td>`+
      `<td>${s.harga ? 'Rp '+parseFloat(s.harga).toLocaleString('id-ID') : '—'}</td>`+
      `<td>${low
        ? '<span class="badge badge-red">Habis</span>'
        : '<span class="badge badge-green">Tersedia</span>'}</td>`;
    tbody.appendChild(tr);
  });
}

async function renderNpKiriman(kategori) {
  const list = await dbGetKirimanNonPakan({ kategori });
  const tbody = document.getElementById('np-kiriman-tbody');
  const empty = document.getElementById('np-kiriman-empty');
  tbody.innerHTML = '';
  if(!list.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  list.slice(0, 50).forEach(k => {
    const total = parseFloat(k.harga_total) || ((parseFloat(k.jumlah_kemasan)||0) * (parseFloat(k.harga_satuan)||0));
    const displayJumlah = k.jumlah_kemasan
      ? `${k.jumlah_kemasan} ${k.jenis_kemasan||''} (${k.jumlah} ${k.satuan})`
      : `${k.jumlah} ${k.satuan||''}`;
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${fmtTgl(k.tanggal)}</td>`+
      `<td><strong>${esc(k.nama_item)}</strong></td>`+
      `<td>${displayJumlah}</td>`+
      `<td>${esc(k.satuan||'—')}</td>`+
      `<td>${k.harga_satuan ? 'Rp '+parseFloat(k.harga_satuan).toLocaleString('id-ID') : '—'}</td>`+
      `<td>${total ? 'Rp '+total.toLocaleString('id-ID') : '—'}</td>`+
      `<td>${esc(k.supplier||'—')}</td>`+
      `<td>${esc(k.kandang||'Semua')}</td>`+
      `<td>`+
        (can('BIAYA') ? `<button class="btn-edit" onclick="editNpKiriman('${k.id}','${kategori}')" title="Edit">✏️</button>` : '')+
        (can('BIAYA') ? `<button class="btn-del" onclick="deleteNpKiriman('${k.id}','${kategori}')" style="margin-left:4px">🗑</button>` : '')+
      `</td>`;
    tbody.appendChild(tr);
  });
}

async function renderNpPakai(kategori) {
  const list = await dbGetPemakaianNonPakan({ kategori });
  const tbody = document.getElementById('np-pakai-tbody');
  const empty = document.getElementById('np-pakai-empty');
  tbody.innerHTML = '';
  if(!list.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  list.slice(0, 50).forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${fmtTgl(p.tanggal)}</td>`+
      `<td><strong>${esc(p.nama_item)}</strong></td>`+
      `<td>${p.jumlah}</td>`+
      `<td>${esc(p.satuan||'—')}</td>`+
      `<td>${esc(p.kandang||'Semua')}</td>`+
      `<td>${esc(p.keterangan||'—')}</td>`+
      `<td>`+
        (can('BIAYA') ? `<button class="btn-edit" onclick="editNpPakai('${p.id}','${kategori}')" title="Edit">✏️</button>` : '')+
        (can('BIAYA') ? `<button class="btn-del" onclick="deleteNpPakai('${p.id}','${kategori}')" style="margin-left:4px">🗑</button>` : '')+
      `</td>`;
    tbody.appendChild(tr);
  });
}

// ── Modal Kiriman Non-Pakan ──
async function openNpKirimanModal() {
  const kategori = _currentGTab;
  const cfg = NP_CONFIG[kategori];
  if(!cfg) return;

  document.getElementById('npk-kategori').value = kategori;
  document.getElementById('modal-np-kiriman-title').textContent = `${cfg.icon} Catat Kiriman ${cfg.label}`;
  document.getElementById('npk-tgl').value = new Date().toISOString().split('T')[0];
  document.getElementById('npk-nama').value = '';
  document.getElementById('npk-jumlah').value = '';
  document.getElementById('npk-isi-kemasan').value = '';
  document.getElementById('npk-harga').value = '';
  document.getElementById('npk-total').value = '';
  document.getElementById('npk-ket').value = '';
  // Populate base_unit options — semua kategori bisa pilih satuan isi
  const baseUnitSel = document.getElementById('npk-base-unit');
  const baseUnitOpts = {
    vitamin: ['gram','ml','kg'],
    obat: ['ml','gram','liter','kg'],
    vaksin: ['dosis','ml'],
    desinfektan: ['ml','liter'],
    lainnya: ['pcs','gram','ml','kg','liter']
  };
  baseUnitSel.innerHTML = (baseUnitOpts[kategori]||['pcs']).map(u =>
    `<option value="${u}">${u}</option>`
  ).join('');
  const convInfo = document.getElementById('npk-conversion-info');
  if(convInfo) convInfo.style.display = 'none';

  // Populate jenis kemasan dari config
  const selSatuan = document.getElementById('npk-satuan');
  selSatuan.innerHTML = (cfg.kemasan||['botol']).map(k =>
    `<option value="${k}">${k}</option>`
  ).join('');

  // Populate kandang
  const kandangList = cache.get('kandang_list') || await dbGetKandang();
  const selKandang = document.getElementById('npk-kandang');
  selKandang.innerHTML = '<option value="">Semua Kandang</option>';
  kandangList.forEach(k => {
    const o = document.createElement('option');
    o.value = k.nama; o.textContent = k.nama;
    selKandang.appendChild(o);
  });

  // Populate nama item dari master data sesuai kategori
  const getters = {
    vitamin:     dbGetVitamin,
    obat:        dbGetObat,
    vaksin:      dbGetVaksin,
    desinfektan: () => dbGetMaster(typeof TB!=='undefined'?TB.master_obat:'master_obat_tf_ub', { kategori: 'desinfektan' }),
    lainnya:     null
  };
  const selNama = document.getElementById('npk-nama-select');
  selNama.innerHTML = '<option value="">-- Pilih Item --</option>';
  document.getElementById('npk-nama').style.display = 'none';
  document.getElementById('npk-nama').value = '';

  if(getters[kategori]) {
    const masterList = await getters[kategori]();
    masterList.forEach(m => {
      const o = document.createElement('option');
      o.value = m.nama;
      o.textContent = m.nama + (m.satuan ? ` (${m.satuan})` : '');
      if(m.satuan) o.dataset.satuan = m.satuan;
      selNama.appendChild(o);
    });
  }
  const oLain = document.createElement('option');
  oLain.value = '__lainnya__';
  oLain.textContent = '＋ Ketik nama lain...';
  selNama.appendChild(oLain);

  // Populate supplier dropdown
  await populateSupplierSelect('npk-supplier-select');
  setSupplierValue('npk-supplier-select','npk-supplier-text','npk-supplier','');

  document.getElementById('modal-np-kiriman').style.display = 'flex';
}

function calcNpKirimanTotal() {
  const jumlah = parseFloat(document.getElementById('npk-jumlah').value) || 0;
  const isiKemasan = parseFloat(document.getElementById('npk-isi-kemasan').value) || 0;
  const harga = parseFloat(document.getElementById('npk-harga').value) || 0;
  const baseUnit = document.getElementById('npk-base-unit').value || 'pcs';

  // Hitung total base unit
  const totalBase = jumlah * isiKemasan;
  const convInfo = document.getElementById('npk-conversion-info');

  if(jumlah > 0 && isiKemasan > 0) {
    const kemasan = document.getElementById('npk-satuan').value;
    convInfo.style.display = 'block';
    convInfo.textContent = `📦 ${jumlah} ${kemasan} × ${isiKemasan} ${baseUnit} = ${totalBase.toLocaleString('id-ID')} ${baseUnit} total masuk`;
  } else {
    convInfo.style.display = 'none';
  }

  // Hitung total harga: jumlah kemasan × harga per kemasan
  document.getElementById('npk-total').value = jumlah && harga ? 'Rp ' + (jumlah * harga).toLocaleString('id-ID') : '';
}

function onNpkNamaChange() {
  const sel = document.getElementById('npk-nama-select');
  const inp = document.getElementById('npk-nama');
  if(sel.value === '__lainnya__') {
    inp.style.display = '';
    inp.value = '';
    inp.focus();
  } else {
    inp.style.display = 'none';
    inp.value = sel.value;
    // Auto-set satuan dari master jika ada
    const opt = sel.options[sel.selectedIndex];
    if(opt && opt.dataset.satuan) {
      const satuanSel = document.getElementById('npk-satuan');
      if(satuanSel) {
        // Cari option yang cocok
        const match = [...satuanSel.options].find(o => o.value === opt.dataset.satuan);
        if(match) satuanSel.value = opt.dataset.satuan;
      }
    }
  }
}

function calcNpTotal() {
  const j = parseFloat(document.getElementById('npk-jumlah').value) || 0;
  const h = parseFloat(document.getElementById('npk-harga').value) || 0;
  document.getElementById('npk-total').value = j && h ? 'Rp ' + (j*h).toLocaleString('id-ID') : '';
  calcNpConversion();
}

function calcNpConversion() {
  const kategori = document.getElementById('npk-kategori')?.value;
  const cfg = NP_CONFIG[kategori];
  if(!cfg) return;
  const qty = parseFloat(document.getElementById('npk-jumlah').value) || 0;
  const unitName = document.getElementById('npk-satuan').value;
  const infoEl = document.getElementById('npk-conversion-info');
  if(!infoEl) return;
  if(!qty || !unitName) { infoEl.style.display = 'none'; return; }
  const u = findUnitDef(unitName, cfg.category);
  const base = qty * u.factor;
  const baseLabel = cfg.category === 'cair' ? 'liter' : 'pcs';
  if(u.factor === 1) { infoEl.style.display = 'none'; return; }
  infoEl.style.display = '';
  infoEl.textContent = `≈ ${base.toLocaleString('id-ID', {maximumFractionDigits:3})} ${baseLabel} (dalam satuan dasar)`;
}

function calcNpPakaiConversion() {
  const kategori = document.getElementById('npp-kategori')?.value;
  const cfg = NP_CONFIG[kategori];
  if(!cfg) return;
  const qty = parseFloat(document.getElementById('npp-jumlah').value) || 0;
  const unitName = document.getElementById('npp-satuan').value;
  const infoEl = document.getElementById('npp-conversion-info');
  if(!infoEl) return;
  if(!qty || !unitName) { infoEl.style.display = 'none'; return; }
  const u = findUnitDef(unitName, cfg.category);
  const base = qty * u.factor;
  const baseLabel = cfg.category === 'cair' ? 'liter' : 'pcs';
  if(u.factor === 1) { infoEl.style.display = 'none'; return; }
  infoEl.style.display = '';
  infoEl.textContent = `≈ ${base.toLocaleString('id-ID', {maximumFractionDigits:3})} ${baseLabel} (dalam satuan dasar)`;
}

async function saveNpKiriman() {
  const kategori  = document.getElementById('npk-kategori').value;
  const tanggal   = document.getElementById('npk-tgl').value;
  const selNama   = document.getElementById('npk-nama-select');
  const nama_item = (selNama.value === '__lainnya__' || selNama.value === '')
    ? document.getElementById('npk-nama').value.trim()
    : selNama.value;
  const jumlahKemasan = parseFloat(document.getElementById('npk-jumlah').value) || 0;
  const isiKemasan    = parseFloat(document.getElementById('npk-isi-kemasan').value) || 0;
  const satuan   = document.getElementById('npk-satuan').value;
  const baseUnit = document.getElementById('npk-base-unit').value || 'pcs';
  const jumlahBase = jumlahKemasan * isiKemasan; // total dalam base_unit
  const harga_satuan = parseFloat(document.getElementById('npk-harga').value) || 0;
  const harga_total  = jumlahKemasan * harga_satuan;
  const supplier = document.getElementById('npk-supplier').value.trim();
  const keterangan = document.getElementById('npk-ket').value.trim();
  const kandang  = document.getElementById('npk-kandang').value;
  const sumber = document.getElementById('npk-sumber').value || 'inti';

  if(!tanggal)    { showToast('⚠️ Tanggal wajib diisi!'); return; }
  if(!nama_item)  { showToast('⚠️ Nama item wajib diisi!'); return; }
  if(jumlahKemasan <= 0) { showToast('⚠️ Jumlah kemasan harus lebih dari 0!'); return; }
  if(isiKemasan <= 0) { showToast('⚠️ Isi per kemasan wajib diisi!'); return; }

  showToast('⏳ Menyimpan...');
  try {
    await dbSaveKirimanNonPakan({
      tanggal, kategori, nama_item,
      jumlah: jumlahBase,           // simpan dalam base_unit
      satuan: baseUnit,             // base_unit (ml/gram/dosis)
      jumlah_kemasan: jumlahKemasan,
      isi_per_kemasan: isiKemasan,
      jenis_kemasan: satuan,        // botol/vial/sachet/kaleng
      sumber,                       // 'inti' atau 'sendiri'
      harga_satuan, harga_total, supplier: supplier||null,
      keterangan: keterangan||null, kandang: kandang||null,
      user_input: currentUser?.username || ''
    });
    await dbSaveLog('TAMBAH','kiriman_nonpakan',null,null,
      {tanggal,kategori,nama_item,jumlah:jumlahBase,satuan:baseUnit,kemasan:`${jumlahKemasan} ${satuan} @${isiKemasan}${baseUnit}`},
      `Kiriman ${kategori}: ${nama_item} ${jumlahKemasan} ${satuan} × ${isiKemasan}${baseUnit} = ${jumlahBase}${baseUnit}`);
    closeModal('modal-np-kiriman');
    renderGudangNonPakan(kategori);
    showToast(`✅ Kiriman ${NP_CONFIG[kategori]?.label} disimpan! (${jumlahBase} ${baseUnit})`);
  } catch(e) { showToast('❌ Gagal: ' + e.message); }
}

// ── Modal Pemakaian Non-Pakan ──
async function openNpPakaiModal() {
  const kategori = _currentGTab;
  const cfg = NP_CONFIG[kategori];
  if(!cfg) return;

  document.getElementById('npp-kategori').value = kategori;
  document.getElementById('modal-np-pakai-title').textContent = `📋 Catat Pemakaian ${cfg.label}`;
  document.getElementById('npp-tgl').value = new Date().toISOString().split('T')[0];
  document.getElementById('npp-nama').value = '';
  document.getElementById('npp-jumlah').value = '';
  document.getElementById('npp-ket').value = '';
  const convInfoP = document.getElementById('npp-conversion-info');
  if(convInfoP) convInfoP.style.display = 'none';

  // Set satuan — akan di-update saat user pilih item
  const selSatuanP = document.getElementById('npp-satuan');
  const defaultBaseUnits = {vitamin:['gram','ml','kg'], obat:['ml','gram','liter','kg'], vaksin:['dosis','ml'], desinfektan:['ml','liter'], lainnya:['pcs','gram','ml','kg','liter']};
  selSatuanP.innerHTML = (defaultBaseUnits[kategori]||['pcs']).map(u =>
    `<option value="${u}">${u}</option>`
  ).join('');
  selSatuanP.disabled = false;

  // Populate kandang
  const kandangList = cache.get('kandang_list') || await dbGetKandang();
  const sel = document.getElementById('npp-kandang');
  sel.innerHTML = '<option value="">Semua Kandang</option>';
  kandangList.forEach(k => {
    const o = document.createElement('option');
    o.value = k.nama; o.textContent = k.nama;
    sel.appendChild(o);
  });

  // Populate nama dari stok yang ada + opsi manual
  const stokList = await dbGetStokNonPakan(kategori);
  const selNpp = document.getElementById('npp-nama-select');
  selNpp.innerHTML = '<option value="">-- Pilih Item --</option>';
  document.getElementById('npp-nama').style.display = 'none';
  document.getElementById('npp-nama').value = '';

  stokList.forEach(s => {
    const o = document.createElement('option');
    o.value = s.nama;
    o.textContent = `${s.nama} — stok: ${s.stok.toFixed(2)} ${s.satuan}`;
    selNpp.appendChild(o);
  });
  // Juga tambahkan dari master jika belum ada di stok
  const gettersNpp = { vitamin: dbGetVitamin, obat: dbGetObat, vaksin: dbGetVaksin };
  if(gettersNpp[kategori]) {
    const masterList = await gettersNpp[kategori]();
    masterList.forEach(m => {
      if(!stokList.find(s => s.nama === m.nama)) {
        const o = document.createElement('option');
        o.value = m.nama;
        o.textContent = m.nama + ' (stok: 0)';
        selNpp.appendChild(o);
      }
    });
  }
  const oLainNpp = document.createElement('option');
  oLainNpp.value = '__lainnya__';
  oLainNpp.textContent = '＋ Ketik nama lain...';
  selNpp.appendChild(oLainNpp);

  document.getElementById('modal-np-pakai').style.display = 'flex';
}

function onNppNamaChange() {
  const sel = document.getElementById('npp-nama-select');
  const inp = document.getElementById('npp-nama');
  if(sel.value === '__lainnya__') {
    inp.style.display = '';
    inp.value = '';
    inp.focus();
  } else {
    inp.style.display = 'none';
    inp.value = sel.value;
  }
}

async function saveNpPakai() {
  const kategori  = document.getElementById('npp-kategori').value;
  const tanggal   = document.getElementById('npp-tgl').value;
  const selNama   = document.getElementById('npp-nama-select');
  const nama_item = (selNama.value === '__lainnya__' || selNama.value === '')
    ? document.getElementById('npp-nama').value.trim()
    : selNama.value;
  const jumlah    = parseFloat(document.getElementById('npp-jumlah').value) || 0;
  const cfg = NP_CONFIG[kategori];
  const satuan    = cfg?.base_unit || document.getElementById('npp-satuan').value;
  const keterangan = document.getElementById('npp-ket').value.trim();
  const kandang   = document.getElementById('npp-kandang').value;

  if(!tanggal)    { showToast('⚠️ Tanggal wajib diisi!'); return; }
  if(!nama_item)  { showToast('⚠️ Nama item wajib diisi!'); return; }
  if(jumlah <= 0) { showToast('⚠️ Jumlah harus lebih dari 0!'); return; }

  // Cek stok cukup — sudah dalam base_unit
  const stokList = await dbGetStokNonPakan(kategori);
  const stokItem = stokList.find(s => s.nama === nama_item);
  if(stokItem && jumlah > stokItem.stok) {
    showToast(`⚠️ Stok ${nama_item} tidak cukup! Tersedia: ${stokItem.stok.toLocaleString('id-ID')} ${satuan}`);
    return;
  }

  showToast('⏳ Menyimpan...');
  try {
    await dbSavePemakaianNonPakan({
      tanggal, kategori, nama_item, jumlah, satuan,
      keterangan: keterangan||null, kandang: kandang||null,
      user_input: currentUser?.username || ''
    });
    await dbSaveLog('TAMBAH','pemakaian_nonpakan',null,null,
      {tanggal,kategori,nama_item,jumlah,satuan},
      `Pemakaian ${kategori}: ${nama_item} ${jumlah} ${satuan}`);
    closeModal('modal-np-pakai');
    renderGudangNonPakan(kategori);
    showToast(`✅ Pemakaian ${NP_CONFIG[kategori]?.label} dicatat!`);
  } catch(e) { showToast('❌ Gagal: ' + e.message); }
}

async function deleteNpKiriman(id, kategori) {
  if(!can('BIAYA')) { showToast('⚠️ Tidak ada akses!'); return; }
  if(!confirm('Hapus data kiriman ini?')) return;
  try {
    await dbDeleteKirimanNonPakan(id, kategori);
    await dbSaveLog('HAPUS','kiriman_nonpakan',id,null,null,`Hapus kiriman ${kategori}`);
    renderGudangNonPakan(kategori);
    showToast('🗑 Kiriman dihapus.');
  } catch(e) { showToast('❌ Gagal: ' + e.message); }
}

async function deleteNpPakai(id, kategori) {
  if(!can('BIAYA')) { showToast('⚠️ Tidak ada akses!'); return; }
  if(!confirm('Hapus data pemakaian ini?')) return;
  try {
    await dbDeletePemakaianNonPakan(id);
    await dbSaveLog('HAPUS','pemakaian_nonpakan',id,null,null,`Hapus pemakaian ${kategori}`);
    renderGudangNonPakan(kategori);
    showToast('🗑 Pemakaian dihapus.');
  } catch(e) { showToast('❌ Gagal: ' + e.message); }
}

// ── Edit Kiriman Non-Pakan ──
async function editNpKiriman(id, kategori) {
  if(!can('BIAYA')) { showToast('⚠️ Tidak ada akses!'); return; }
  const list = await dbGetKirimanNonPakan({ kategori });
  const item = list.find(k => k.id === id);
  if(!item) { showToast('❌ Data tidak ditemukan!'); return; }

  // Buka modal kiriman dan isi data
  _currentGTab = kategori;
  await openNpKirimanModal();

  // Isi form dengan data existing
  document.getElementById('npk-tgl').value = item.tanggal || '';
  document.getElementById('npk-kandang').value = item.kandang || '';
  const selNama = document.getElementById('npk-nama-select');
  if(selNama) {
    const opt = [...selNama.options].find(o => o.value === item.nama_item);
    if(opt) { selNama.value = item.nama_item; }
    else { selNama.value = '__lainnya__'; document.getElementById('npk-nama').style.display=''; document.getElementById('npk-nama').value = item.nama_item; }
  }
  document.getElementById('npk-jumlah').value = item.jumlah_kemasan || item.jumlah || '';
  document.getElementById('npk-isi-kemasan').value = item.isi_per_kemasan || '';
  if(item.jenis_kemasan) document.getElementById('npk-satuan').value = item.jenis_kemasan;
  const baseUnitSel = document.getElementById('npk-base-unit');
  if(baseUnitSel && item.satuan) baseUnitSel.value = item.satuan;
  document.getElementById('npk-harga').value = item.harga_satuan || '';
  setSupplierValue('npk-supplier-select','npk-supplier-text','npk-supplier', item.supplier||'');
  document.getElementById('npk-ket').value = item.keterangan || '';
  calcNpKirimanTotal();

  // Override save agar update bukan insert
  const btnSave = document.querySelector('#modal-np-kiriman .btn-primary');
  if(btnSave) {
    btnSave.onclick = async function() {
      await _updateNpKiriman(id, kategori);
    };
  }
}

async function _updateNpKiriman(id, kategori) {
  const tanggal = document.getElementById('npk-tgl').value;
  const selNama = document.getElementById('npk-nama-select');
  const nama_item = (selNama.value === '__lainnya__' || selNama.value === '')
    ? document.getElementById('npk-nama').value.trim() : selNama.value;
  const jumlahKemasan = parseFloat(document.getElementById('npk-jumlah').value) || 0;
  const isiKemasan = parseFloat(document.getElementById('npk-isi-kemasan').value) || 0;
  const satuan = document.getElementById('npk-satuan').value;
  const baseUnit = document.getElementById('npk-base-unit').value || 'pcs';
  const jumlahBase = jumlahKemasan * isiKemasan;
  const harga_satuan = parseFloat(document.getElementById('npk-harga').value) || 0;
  const harga_total = jumlahKemasan * harga_satuan;
  const supplier = document.getElementById('npk-supplier').value.trim();
  const keterangan = document.getElementById('npk-ket').value.trim();
  const kandang = document.getElementById('npk-kandang').value;

  if(!tanggal || !nama_item || jumlahKemasan <= 0 || isiKemasan <= 0) {
    showToast('⚠️ Lengkapi semua field wajib!'); return;
  }

  showToast('⏳ Menyimpan...');
  try {
    const obj = {
      id, tanggal, kategori, nama_item,
      jumlah: jumlahBase, satuan: baseUnit,
      jumlah_kemasan: jumlahKemasan, isi_per_kemasan: isiKemasan, jenis_kemasan: satuan,
      harga_satuan, harga_total, supplier: supplier||null,
      keterangan: keterangan||null, kandang: kandang||null,
      user_input: currentUser?.username || ''
    };
    // Hapus lama, simpan baru (works for both Supabase & local)
    await dbDeleteKirimanNonPakan(id, kategori);
    await dbSaveKirimanNonPakan(obj);
    await dbSaveLog('EDIT','kiriman_nonpakan',id,null,obj,`Edit kiriman ${kategori}: ${nama_item}`);
    closeModal('modal-np-kiriman');
    renderGudangNonPakan(kategori);
    showToast('✅ Kiriman diperbarui!');
    // Reset onclick ke default
    const btnSave = document.querySelector('#modal-np-kiriman .btn-primary');
    if(btnSave) btnSave.onclick = saveNpKiriman;
  } catch(e) { showToast('❌ Gagal: ' + e.message); }
}

// ── Edit Pemakaian Non-Pakan ──
async function editNpPakai(id, kategori) {
  if(!can('BIAYA')) { showToast('⚠️ Tidak ada akses!'); return; }
  const list = await dbGetPemakaianNonPakan({ kategori });
  const item = list.find(p => p.id === id);
  if(!item) { showToast('❌ Data tidak ditemukan!'); return; }

  _currentGTab = kategori;
  await openNpPakaiModal();

  // Isi form
  document.getElementById('npp-tgl').value = item.tanggal || '';
  document.getElementById('npp-kandang').value = item.kandang || '';
  const selNama = document.getElementById('npp-nama-select');
  if(selNama) {
    const opt = [...selNama.options].find(o => o.value === item.nama_item);
    if(opt) { selNama.value = item.nama_item; }
    else { selNama.value = '__lainnya__'; document.getElementById('npp-nama').style.display=''; document.getElementById('npp-nama').value = item.nama_item; }
  }
  document.getElementById('npp-jumlah').value = item.jumlah || '';
  const selSatuan = document.getElementById('npp-satuan');
  if(selSatuan && item.satuan) selSatuan.value = item.satuan;
  document.getElementById('npp-ket').value = item.keterangan || '';

  // Override save
  const btnSave = document.querySelector('#modal-np-pakai .btn-primary');
  if(btnSave) {
    btnSave.onclick = async function() {
      await _updateNpPakai(id, kategori);
    };
  }
}

async function _updateNpPakai(id, kategori) {
  const tanggal = document.getElementById('npp-tgl').value;
  const selNama = document.getElementById('npp-nama-select');
  const nama_item = (selNama.value === '__lainnya__' || selNama.value === '')
    ? document.getElementById('npp-nama').value.trim() : selNama.value;
  const jumlah = parseFloat(document.getElementById('npp-jumlah').value) || 0;
  const satuan = document.getElementById('npp-satuan').value;
  const keterangan = document.getElementById('npp-ket').value.trim();
  const kandang = document.getElementById('npp-kandang').value;

  if(!tanggal || !nama_item || jumlah <= 0) {
    showToast('⚠️ Lengkapi semua field wajib!'); return;
  }

  showToast('⏳ Menyimpan...');
  try {
    const obj = {
      id, tanggal, kategori, nama_item, jumlah, satuan,
      keterangan: keterangan||null, kandang: kandang||null,
      user_input: currentUser?.username || ''
    };
    // Hapus lama, simpan baru
    await dbDeletePemakaianNonPakan(id);
    await dbSavePemakaianNonPakan(obj);
    await dbSaveLog('EDIT','pemakaian_nonpakan',id,null,obj,`Edit pemakaian ${kategori}: ${nama_item}`);
    closeModal('modal-np-pakai');
    renderGudangNonPakan(kategori);
    showToast('✅ Pemakaian diperbarui!');
    // Reset onclick
    const btnSave = document.querySelector('#modal-np-pakai .btn-primary');
    if(btnSave) btnSave.onclick = saveNpPakai;
  } catch(e) { showToast('❌ Gagal: ' + e.message); }
}

// ═══ MONITORING BW (Body Weight) ═══
// Lihat file: bw-module.js

// ═══ REKAP KEMITRAAN ═══
