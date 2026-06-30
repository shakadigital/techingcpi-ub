// ═══════════════════════════════════════════════════
//  LOCAL DB (IndexedDB)
// ═══════════════════════════════════════════════════

const LOCAL_DB_NAME = 'teaching_farm_ub';
const LOCAL_DB_VERSION = 4;

function _idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;

      const ensureStore = (name, opts) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, opts);
        }
      };

      ensureStore('users', { keyPath: 'id' });
      ensureStore('kandang', { keyPath: 'id' });

      if (!db.objectStoreNames.contains('input_harian')) {
        const s = db.createObjectStore('input_harian', { keyPath: 'id' });
        s.createIndex('tanggal', 'tanggal', { unique: false });
        s.createIndex('kandang', 'kandang', { unique: false });
        s.createIndex('tanggal_kandang', ['tanggal', 'kandang'], { unique: true });
      }

      ensureStore('penjualan', { keyPath: 'id' });
      ensureStore('daftar_pakan', { keyPath: 'id' });
      ensureStore('kiriman_pakan', { keyPath: 'id' });
      ensureStore('kas_operasional', { keyPath: 'id' });
      ensureStore('pembayaran', { keyPath: 'id' });
      ensureStore('activity_log', { keyPath: 'id' });

      // v2: master tables & non-pakan
      ensureStore('master_supplier',  { keyPath: 'id' });
      ensureStore('master_vitamin',   { keyPath: 'id' });
      ensureStore('master_obat',      { keyPath: 'id' });
      ensureStore('master_vaksin',    { keyPath: 'id' });
      ensureStore('master_pelanggan', { keyPath: 'id' });
      ensureStore('kiriman_nonpakan',   { keyPath: 'id' });
      ensureStore('pemakaian_nonpakan', { keyPath: 'id' });
      ensureStore('app_config',       { keyPath: 'key' });

      // v3: products & units (sistem konversi satuan)
      ensureStore('products', { keyPath: 'id' });
      ensureStore('units',    { keyPath: 'id' });

      // v4: pengambilan telur oleh inti (kemitraan)
      ensureStore('pengambilan_inti', { keyPath: 'id' });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function _idbTx(storeName, mode, fn) {
  const db = await _idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let out;
    Promise.resolve()
      .then(() => fn(store))
      .then((v) => {
        out = v;
      })
      .catch(reject);
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function _reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function _getAll(storeName) {
  return _idbTx(storeName, 'readonly', (store) => _reqToPromise(store.getAll()));
}

async function _getByKey(storeName, key) {
  return _idbTx(storeName, 'readonly', (store) => _reqToPromise(store.get(key)));
}

async function _put(storeName, obj) {
  return _idbTx(storeName, 'readwrite', (store) => _reqToPromise(store.put(obj)));
}

async function _delete(storeName, key) {
  return _idbTx(storeName, 'readwrite', (store) => _reqToPromise(store.delete(key)));
}

async function _queryInputHarian(filters = {}) {
  const all = await _getAll('input_harian');
  const out = all.filter((r) => {
    if (!r) return false;
    if (filters.tanggal && r.tanggal !== filters.tanggal) return false;
    if (filters.kandang && r.kandang !== filters.kandang) return false;
    if (filters.dari && r.tanggal < filters.dari) return false;
    if (filters.sampai && r.tanggal > filters.sampai) return false;
    return true;
  });
  out.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return out;
}

async function _queryTanggalRange(storeName, filters = {}) {
  const all = await _getAll(storeName);
  const out = all.filter((r) => {
    if (!r) return false;
    if (filters.dari && r.tanggal < filters.dari) return false;
    if (filters.sampai && r.tanggal > filters.sampai) return false;
    if (filters.kandang && r.kandang !== filters.kandang) return false;
    if (filters.jenis && r.jenis !== filters.jenis) return false;
    return true;
  });
  out.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return out;
}

// ═══════════════════════════════════════════════════
//  CACHE LAYER (in-memory)
// ═══════════════════════════════════════════════════
const cache = {
  _data: {},
  get: k => cache._data[k] ?? null,
  set: (k, v) => { cache._data[k] = v; },
  del: k => { delete cache._data[k]; }
};

// ═══════════════════════════════════════════════════
//  DATA API — kompatibel dengan supabase.js
// ═══════════════════════════════════════════════════

async function dbGetUsers() {
  try {
    const rows = await _getAll('users');
    rows.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    cache.set('users', rows);
    return rows;
  } catch { return cache.get('users') || []; }
}

async function dbSaveUser(obj) {
  if (!obj.id) obj.id = crypto.randomUUID();
  await _put('users', obj);
  cache.del('users');
}

async function dbDeleteUser(id) {
  await _delete('users', id);
  cache.del('users');
}

async function dbFindUser(username, hashedPassword, plaintextPassword) {
  try {
    const rows = await dbGetUsers();
    return (rows || []).find(u =>
      u.username === username &&
      (u.password === hashedPassword || u.password === plaintextPassword) &&
      (u.active === true || u.active === 'true' || u.active === 1)
    ) || null;
  } catch { return null; }
}

async function dbGetKandang() {
  try {
    const rows = await _getAll('kandang');
    rows.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    cache.set('kandang_list', rows);
    return rows;
  } catch { return cache.get('kandang_list') || []; }
}

async function dbSaveKandang(obj) {
  if (!obj.id) obj.id = crypto.randomUUID();
  await _put('kandang', obj);
  cache.del('kandang_list');
}

async function dbDeleteKandang(id) {
  await _delete('kandang', id);
  cache.del('kandang_list');
}

async function dbSaveInput(tanggal, kandang, data) {
  const existing = await dbGetInput({ tanggal, kandang });
  if (existing && existing.length > 0) {
    const prev = existing[0];
    await _put('input_harian', {
      ...prev,
      tanggal,
      kandang,
      user_input: data.user,
      data,
      updated_at: new Date().toISOString()
    });
  } else {
    await _put('input_harian', {
      id: crypto.randomUUID(),
      tanggal,
      kandang,
      user_input: data.user,
      data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  cache.del('input_harian');
  cache.del('_all_inputs');
}

async function dbGetInput(filters = {}) {
  try {
    const isAll = !filters.tanggal && !filters.kandang && !filters.dari && !filters.sampai;
    if (isAll && cache.get('_all_inputs')) return cache.get('_all_inputs');
    const rows = await _queryInputHarian(filters);
    if (isAll) cache.set('_all_inputs', rows || []);
    return rows || [];
  } catch { return []; }
}

async function dbDeleteInput(id) {
  await _delete('input_harian', id);
  cache.del('_all_inputs');
}

async function dbSavePenjualan(obj) {
  if (!obj.id) obj.id = crypto.randomUUID();
  obj.created_at = obj.created_at || new Date().toISOString();
  await _put('penjualan', obj);
  cache.del('penjualan_list');
}

async function dbDeletePenjualan(id) {
  await _delete('penjualan', id);
  cache.del('penjualan_list');
}

async function dbUpdatePenjualan(id, obj) {
  const existing = await _get('penjualan', id);
  await _put('penjualan', { ...existing, ...obj });
  cache.del('penjualan_list');
}

async function dbGetPenjualan(filters = {}) {
  try {
    const rows = await _queryTanggalRange('penjualan', filters);
    cache.set('penjualan_list', rows);
    return rows || [];
  } catch { return cache.get('penjualan_list') || []; }
}

async function dbGetDaftarPakan() {
  try {
    const rows = await _getAll('daftar_pakan');
    rows.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    cache.set('daftar_pakan', rows);
    return rows;
  } catch { return cache.get('daftar_pakan') || []; }
}

async function dbSaveDaftarPakan(obj) {
  if (!obj.id) obj.id = crypto.randomUUID();
  await _put('daftar_pakan', obj);
  cache.del('daftar_pakan');
}

async function dbDeleteDaftarPakan(id) {
  await _delete('daftar_pakan', id);
  cache.del('daftar_pakan');
}

async function dbGetKiriman(filters = {}) {
  try {
    const rows = await _queryTanggalRange('kiriman_pakan', filters);
    cache.set('kiriman_pakan', rows);
    return rows || [];
  } catch { return cache.get('kiriman_pakan') || []; }
}

async function dbSaveKiriman(obj) {
  obj.id = crypto.randomUUID();
  await _put('kiriman_pakan', obj);
  cache.del('kiriman_pakan');
}

async function dbDeleteKiriman(id) {
  await _delete('kiriman_pakan', id);
  cache.del('kiriman_pakan');
}

async function dbGetKas(filters = {}) {
  try {
    const rows = await _queryTanggalRange('kas_operasional', filters);
    cache.set('kas_list', rows);
    return rows || [];
  } catch { return cache.get('kas_list') || []; }
}

async function dbSaveKas(obj) {
  obj.id = crypto.randomUUID();
  await _put('kas_operasional', obj);
  cache.del('kas_list');
}

async function dbDeleteKas(id) {
  await _delete('kas_operasional', id);
  cache.del('kas_list');
}

async function dbGetSaldoKas(kandang) {
  const list = await dbGetKas(kandang ? { kandang } : {});
  const masuk  = list.filter(k => k.jenis === 'masuk') .reduce((s, k) => s + (parseFloat(k.jumlah) || 0), 0);
  const keluar = list.filter(k => k.jenis === 'keluar').reduce((s, k) => s + (parseFloat(k.jumlah) || 0), 0);
  return { masuk, keluar, saldo: masuk - keluar, list };
}

async function dbSaveLog(aksi, tabel, recordId, dataLama, dataBaru, keterangan = '') {
  try {
    await _put('activity_log', {
      id: crypto.randomUUID(),
      user_input: window.currentUser?.username || '—',
      aksi,
      tabel,
      record_id: recordId || null,
      data_lama: dataLama || null,
      data_baru: dataBaru || null,
      keterangan: keterangan || null,
      tanggal: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[activity_log] Gagal simpan log:', e);
  }
}

async function dbGetLog(filters = {}) {
  try {
    const rows = await _getAll('activity_log');
    const out = (rows || []).filter((r) => {
      if (!r) return false;
      if (filters.user && r.user_input !== filters.user) return false;
      if (filters.tabel && r.tabel !== filters.tabel) return false;
      const t = (r.tanggal || '').slice(0, 10);
      if (filters.dari && t < filters.dari) return false;
      if (filters.sampai && t > filters.sampai) return false;
      return true;
    });
    out.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    return out.slice(0, 200);
  } catch { return []; }
}

async function dbGetPembayaran(filters = {}) {
  try {
    const rows = await _queryTanggalRange('pembayaran', filters);
    cache.set('pembayaran_list', rows);
    return rows || [];
  } catch { return cache.get('pembayaran_list') || []; }
}

async function dbSavePembayaran(obj) {
  obj.id = crypto.randomUUID();
  await _put('pembayaran', obj);
  cache.del('pembayaran_list');
}

async function dbDeletePembayaran(id) {
  await _delete('pembayaran', id);
  cache.del('pembayaran_list');
}

async function dbUpdateStatusTagihan(kirimanId, jumlahBayar) {
  try {
    const k = await _getByKey('kiriman_pakan', kirimanId);
    if (!k) return;
    const totalTagihan = parseFloat(k.harga_total) || 0;
    const bayarList = (await _getAll('pembayaran')).filter(b => b.referensi_id === kirimanId);
    const totalBayar = (bayarList || []).reduce((s, b) => s + (parseFloat(b.jumlah_bayar) || 0), 0);
    const sisa = Math.max(0, totalTagihan - totalBayar);
    const status = sisa <= 0 ? 'lunas' : totalBayar > 0 ? 'sebagian' : 'belum';
    await _put('kiriman_pakan', { ...k, status_bayar: status, sisa_tagihan: sisa });
    cache.del('kiriman_pakan');
  } catch (e) { console.warn('updateStatusTagihan error:', e); }
}

// ── MASTER TABLES ──────────────────────────────────

async function dbGetMaster(table, filters = {}) {
  try {
    let rows = await _getAll(table);
    // Hanya tampilkan yang aktif
    rows = rows.filter(r => r && (r.active === true || r.active === undefined));
    if (filters.kategori) rows = rows.filter(r => r.kategori === filters.kategori);
    rows.sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
    cache.set(table, rows);
    return rows;
  } catch { return cache.get(table) || []; }
}

async function dbSaveMaster(table, obj) {
  if (!obj.id) {
    obj.id = crypto.randomUUID();
    obj.created_at = new Date().toISOString();
  }
  obj.updated_at = new Date().toISOString();
  await _put(table, obj);
  cache.del(table);
}

async function dbDeleteMaster(table, id) {
  // Soft delete — set active = false
  const existing = await _getByKey(table, id);
  if (existing) {
    await _put(table, { ...existing, active: false, updated_at: new Date().toISOString() });
  }
  cache.del(table);
}

async function dbGenerateKode(table, prefix) {
  try {
    // Ambil SEMUA record (termasuk nonaktif) untuk hindari duplikat kode
    const rows = await _getAll(table);
    const filtered = rows.filter(r => r && r.kode && r.kode.startsWith(prefix + '-'));
    if (!filtered.length) return `${prefix}-001`;
    filtered.sort((a, b) => b.kode.localeCompare(a.kode));
    const lastNum = parseInt(filtered[0].kode.replace(prefix + '-', '')) || 0;
    return `${prefix}-${String(lastNum + 1).padStart(3, '0')}`;
  } catch {
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  }
}

// Specific getters
const dbGetSupplier  = (f) => dbGetMaster('master_supplier', f);
const dbGetVitamin   = (f) => dbGetMaster('master_vitamin', f);
const dbGetObat      = (f) => dbGetMaster('master_obat', f);
const dbGetVaksin    = (f) => dbGetMaster('master_vaksin', f);
const dbGetPelanggan = (f) => dbGetMaster('master_pelanggan', f);

async function dbGetAllMaster() {
  const [supplier, vitamin, obat, vaksin, pelanggan, pakan] = await Promise.all([
    dbGetSupplier(),
    dbGetVitamin(),
    dbGetObat(),
    dbGetVaksin(),
    dbGetPelanggan(),
    dbGetDaftarPakan()
  ]);
  return { supplier, vitamin, obat, vaksin, pelanggan, pakan };
}

// ── STOK NON-PAKAN ─────────────────────────────────

async function dbGetKirimanNonPakan(filters = {}) {
  try {
    let rows = await _getAll('kiriman_nonpakan');
    rows = rows.filter(r => {
      if (!r) return false;
      if (filters.kategori && r.kategori !== filters.kategori) return false;
      if (filters.dari && r.tanggal < filters.dari) return false;
      if (filters.sampai && r.tanggal > filters.sampai) return false;
      return true;
    });
    rows.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    cache.set('kiriman_np_' + (filters.kategori || 'all'), rows);
    return rows;
  } catch { return cache.get('kiriman_np_' + (filters.kategori || 'all')) || []; }
}

async function dbSaveKirimanNonPakan(obj) {
  obj.id = crypto.randomUUID();
  obj.created_at = obj.created_at || new Date().toISOString();
  await _put('kiriman_nonpakan', obj);
  cache.del('kiriman_np_' + (obj.kategori || 'all'));
  cache.del('kiriman_np_all');
}

async function dbDeleteKirimanNonPakan(id, kategori) {
  await _delete('kiriman_nonpakan', id);
  cache.del('kiriman_np_' + (kategori || 'all'));
  cache.del('kiriman_np_all');
}

async function dbGetPemakaianNonPakan(filters = {}) {
  try {
    let rows = await _getAll('pemakaian_nonpakan');
    rows = rows.filter(r => {
      if (!r) return false;
      if (filters.kategori && r.kategori !== filters.kategori) return false;
      if (filters.dari && r.tanggal < filters.dari) return false;
      if (filters.sampai && r.tanggal > filters.sampai) return false;
      return true;
    });
    rows.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    return rows;
  } catch { return []; }
}

async function dbSavePemakaianNonPakan(obj) {
  obj.id = crypto.randomUUID();
  obj.created_at = obj.created_at || new Date().toISOString();
  await _put('pemakaian_nonpakan', obj);
}

async function dbDeletePemakaianNonPakan(id) {
  await _delete('pemakaian_nonpakan', id);
}

async function dbGetStokNonPakan(kategori) {
  const [kiriman, pakai] = await Promise.all([
    dbGetKirimanNonPakan({ kategori }),
    dbGetPemakaianNonPakan({ kategori })
  ]);
  const units = await _getAll('units');
  const findU = (name) => units.find(u => u.active !== false && u.name === name);

  const stokMap = {};
  kiriman.forEach(k => {
    if (!stokMap[k.nama_item]) stokMap[k.nama_item] = {
      masuk_base: 0, keluar_base: 0,
      display_unit: k.satuan, category: k.category || 'padat', harga: 0
    };
    const u = findU(k.satuan);
    const factor = u ? parseFloat(u.conversion_factor) : 1;
    stokMap[k.nama_item].masuk_base += (parseFloat(k.jumlah) || 0) * factor;
    stokMap[k.nama_item].harga = parseFloat(k.harga_satuan) || stokMap[k.nama_item].harga;
    if (k.category) stokMap[k.nama_item].category = k.category;
  });
  pakai.forEach(p => {
    if (!stokMap[p.nama_item]) stokMap[p.nama_item] = {
      masuk_base: 0, keluar_base: 0,
      display_unit: p.satuan, category: p.category || 'padat', harga: 0
    };
    const u = findU(p.satuan);
    const factor = u ? parseFloat(u.conversion_factor) : 1;
    stokMap[p.nama_item].keluar_base += (parseFloat(p.jumlah) || 0) * factor;
  });

  return Object.entries(stokMap).map(([nama, v]) => {
    const stok_base = Math.max(0, v.masuk_base - v.keluar_base);
    const u = findU(v.display_unit);
    const factor = u ? parseFloat(u.conversion_factor) : 1;
    return {
      nama,
      stok_base,
      stok: stok_base / factor,          // dalam display_unit
      satuan: v.display_unit,
      category: v.category,
      harga: v.harga
    };
  });
}

// ── STANDAR PERFORMA (app_config) ──────────────────

async function dbGetStandar() {
  try {
    const rec = await _getByKey('app_config', 'standar_performa');
    if (rec && rec.value) return rec.value;
    // Fallback ke localStorage
    try { return JSON.parse(localStorage.getItem('standar_performa')); } catch { return null; }
  } catch {
    try { return JSON.parse(localStorage.getItem('standar_performa')); } catch { return null; }
  }
}

async function dbSaveStandar(data) {
  try {
    await _put('app_config', {
      key: 'standar_performa',
      value: data,
      updated_at: new Date().toISOString()
    });
    cache.del('standar_performa');
  } catch (e) {
    // Fallback ke localStorage
    localStorage.setItem('standar_performa', JSON.stringify(data));
    console.warn('dbSaveStandar fallback to localStorage:', e.message);
    throw e;
  }
}

// ── SEED DATA (dipanggil sekali saat pertama kali) ─

async function _seedDefaultData() {
  // Cek apakah sudah ada user
  const users = await _getAll('users');
  if (users && users.length > 0) return; // sudah ada data, skip

  // Seed users — password harus diganti saat setup pertama kali
  await _put('users', { id: crypto.randomUUID(), username: 'admin', password: 'GANTI_PASSWORD_INI', role: 'admin', active: true, created_at: new Date().toISOString() });

  // Seed kandang
  await _put('kandang', { id: crypto.randomUUID(), nama: 'Kandang 1', kapasitas: 5000, status: 'aktif', keterangan: 'Kandang utama', created_at: new Date().toISOString() });
  await _put('kandang', { id: crypto.randomUUID(), nama: 'Kandang 2', kapasitas: 3000, status: 'aktif', keterangan: 'Kandang cadangan', created_at: new Date().toISOString() });

  // Seed daftar pakan
  await _put('daftar_pakan', { id: crypto.randomUUID(), nama: 'Pakan Starter', jenis: 'Konsentrat', satuan: 'kg', harga_satuan: 8500, stok_minimal: 500, active: true, created_at: new Date().toISOString() });
  await _put('daftar_pakan', { id: crypto.randomUUID(), nama: 'Pakan Grower', jenis: 'Konsentrat', satuan: 'kg', harga_satuan: 7500, stok_minimal: 500, active: true, created_at: new Date().toISOString() });
  await _put('daftar_pakan', { id: crypto.randomUUID(), nama: 'Pakan Layer', jenis: 'Konsentrat', satuan: 'kg', harga_satuan: 7000, stok_minimal: 1000, active: true, created_at: new Date().toISOString() });

  // Seed master supplier
  const supIds = {};
  const suppliers = [
    { kode: 'SUP-001', nama: 'PT Charoen Pokphand', kategori: 'pakan', keterangan: 'Supplier pakan utama' },
    { kode: 'SUP-002', nama: 'PT Medion', kategori: 'vaksin', keterangan: 'Supplier vaksin & obat' },
    { kode: 'SUP-003', nama: 'PT Mensana', kategori: 'obat', keterangan: 'Supplier obat ternak' },
    { kode: 'SUP-004', nama: 'CV Agro Makmur', kategori: 'vitamin', keterangan: 'Supplier vitamin ternak' },
    { kode: 'SUP-005', nama: 'Toko Pakan Sejahtera', kategori: 'umum', keterangan: 'Supplier lokal' },
  ];
  for (const s of suppliers) {
    const id = crypto.randomUUID();
    supIds[s.kode] = id;
    await _put('master_supplier', { id, ...s, active: true, created_at: new Date().toISOString() });
  }

  // Seed master vitamin
  const vitamins = [
    { kode: 'VIT-001', nama: 'Vitachick', satuan: 'sachet', keterangan: 'Vitamin untuk DOC' },
    { kode: 'VIT-002', nama: 'Fortevit', satuan: 'botol', keterangan: 'Vitamin multivitamin layer' },
    { kode: 'VIT-003', nama: 'Vita Stress', satuan: 'sachet', keterangan: 'Vitamin anti stress' },
    { kode: 'VIT-004', nama: 'Elektrolit Plus', satuan: 'sachet', keterangan: 'Elektrolit untuk ayam' },
  ];
  for (const v of vitamins) {
    await _put('master_vitamin', { id: crypto.randomUUID(), ...v, active: true, created_at: new Date().toISOString() });
  }

  // Seed master obat
  const obats = [
    { kode: 'OBT-001', nama: 'Amoxilin', satuan: 'botol', keterangan: 'Antibiotik broad spectrum' },
    { kode: 'OBT-002', nama: 'Colistin', satuan: 'sachet', keterangan: 'Antibiotik untuk CRD' },
    { kode: 'OBT-003', nama: 'Enrofloxacin', satuan: 'botol', keterangan: 'Antibiotik fluoroquinolon' },
    { kode: 'OBT-004', nama: 'Desinfektan Kandang', satuan: 'liter', keterangan: 'Untuk sanitasi kandang' },
  ];
  for (const o of obats) {
    await _put('master_obat', { id: crypto.randomUUID(), ...o, active: true, created_at: new Date().toISOString() });
  }

  // Seed master vaksin
  const vaksins = [
    { kode: 'VAK-001', nama: 'ND Lasota', satuan: 'dosis', keterangan: 'Vaksin Newcastle Disease' },
    { kode: 'VAK-002', nama: 'IB H120', satuan: 'dosis', keterangan: 'Vaksin Infectious Bronchitis' },
    { kode: 'VAK-003', nama: 'AI H5N1', satuan: 'dosis', keterangan: 'Vaksin Avian Influenza' },
    { kode: 'VAK-004', nama: 'Gumboro', satuan: 'dosis', keterangan: 'Vaksin Gumboro/IBD' },
  ];
  for (const v of vaksins) {
    await _put('master_vaksin', { id: crypto.randomUUID(), ...v, active: true, created_at: new Date().toISOString() });
  }

  // Seed master pelanggan
  const pelanggan = [
    { kode: 'PLG-001', nama: 'Pasar Tradisional', tipe: 'eceran', keterangan: 'Pelanggan pasar umum' },
    { kode: 'PLG-002', nama: 'Toko Sembako Maju', tipe: 'bakul', keterangan: 'Pelanggan grosir tetap' },
  ];
  for (const p of pelanggan) {
    await _put('master_pelanggan', { id: crypto.randomUUID(), ...p, active: true, created_at: new Date().toISOString() });
  }

  console.log('[db_local] Seed data berhasil diisi.');
}

// Jalankan seed saat script dimuat
_seedDefaultData().catch(e => console.warn('[db_local] Seed error:', e));

// ── HELPER PUBLIK untuk restore (preserve existing ID) ─
async function dbUpsert(table, obj) {
  if (!obj.id) obj.id = crypto.randomUUID();
  return _put(table, obj);
}

// ── UNITS (Tabel Satuan & Konversi) ────────────────
// Setiap unit punya: id, name, category ('padat'|'cair'), base_unit ('pcs'|'liter'), conversion_factor, display_unit, active

async function dbGetUnits(category) {
  try {
    let rows = await _getAll('units');
    rows = rows.filter(r => r && r.active !== false);
    if (category) rows = rows.filter(r => r.category === category);
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  } catch { return []; }
}

async function dbSaveUnit(obj) {
  if (!obj.id) { obj.id = crypto.randomUUID(); obj.created_at = new Date().toISOString(); }
  obj.updated_at = new Date().toISOString();
  await _put('units', obj);
}

async function dbDeleteUnit(id) {
  const u = await _getByKey('units', id);
  if (u) await _put('units', { ...u, active: false, updated_at: new Date().toISOString() });
}

// Konversi jumlah dari satuan input ke base_unit
// Contoh: 2 BOX (factor=12, base=pcs) → 24 pcs
function convertToBase(qty, unit) {
  if (!unit) return qty;
  return parseFloat(qty) * parseFloat(unit.conversion_factor || 1);
}

// Konversi dari base_unit ke display_unit untuk tampilan
// Contoh: 24 pcs, display_unit BOX (factor=12) → 2 BOX
function convertFromBase(qtyBase, unit) {
  if (!unit || !unit.conversion_factor) return qtyBase;
  return qtyBase / parseFloat(unit.conversion_factor);
}

// Cari unit berdasarkan nama (case-insensitive)
async function findUnit(name) {
  const all = await _getAll('units');
  return all.find(u => u.active !== false && u.name.toLowerCase() === (name||'').toLowerCase()) || null;
}

// ── PRODUCTS (Katalog Produk Gudang) ───────────────
// Setiap product: id, name, category ('padat'|'cair'), base_unit, conversion_factor, display_unit, qty (stok dalam base_unit), active

async function dbGetProducts(category) {
  try {
    let rows = await _getAll('products');
    rows = rows.filter(r => r && r.active !== false);
    if (category) rows = rows.filter(r => r.category === category);
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  } catch { return []; }
}

async function dbGetProduct(id) {
  return _getByKey('products', id);
}

async function dbSaveProduct(obj) {
  if (!obj.id) { obj.id = crypto.randomUUID(); obj.created_at = new Date().toISOString(); }
  obj.updated_at = new Date().toISOString();
  await _put('products', obj);
}

async function dbDeleteProduct(id) {
  const p = await _getByKey('products', id);
  if (p) await _put('products', { ...p, active: false, updated_at: new Date().toISOString() });
}

// Tambah stok produk (kiriman masuk) — qty dalam satuan display, dikonversi ke base
async function dbProductAddStock(productId, qtyDisplay, unitName) {
  const p = await dbGetProduct(productId);
  if (!p) throw new Error('Produk tidak ditemukan');
  const unit = await findUnit(unitName || p.display_unit);
  const qtyBase = unit ? convertToBase(qtyDisplay, unit) : parseFloat(qtyDisplay);
  p.qty = (parseFloat(p.qty) || 0) + qtyBase;
  p.updated_at = new Date().toISOString();
  await _put('products', p);
  return { qtyBase, qtyAfter: p.qty };
}

// Kurangi stok produk (pemakaian) — qty dalam satuan display, dikonversi ke base
async function dbProductUseStock(productId, qtyDisplay, unitName) {
  const p = await dbGetProduct(productId);
  if (!p) throw new Error('Produk tidak ditemukan');
  const unit = await findUnit(unitName || p.display_unit);
  const qtyBase = unit ? convertToBase(qtyDisplay, unit) : parseFloat(qtyDisplay);
  const stokSekarang = parseFloat(p.qty) || 0;
  if (qtyBase > stokSekarang) throw new Error(`Stok tidak cukup. Tersedia: ${_formatStok(stokSekarang, p)}`);
  p.qty = stokSekarang - qtyBase;
  p.updated_at = new Date().toISOString();
  await _put('products', p);
  return { qtyBase, qtyAfter: p.qty };
}

// Format stok untuk tampilan (konversi dari base ke display)
function _formatStok(qtyBase, product) {
  if (!product) return qtyBase.toFixed(3);
  const factor = parseFloat(product.conversion_factor) || 1;
  const display = qtyBase / factor;
  const rounded = Math.round(display * 1000) / 1000;
  return `${rounded} ${product.display_unit || product.base_unit}`;
}

// Ambil stok dalam satuan display
function getDisplayQty(product) {
  if (!product) return 0;
  const factor = parseFloat(product.conversion_factor) || 1;
  return (parseFloat(product.qty) || 0) / factor;
}

// ── SEED UNITS & PRODUCTS ──────────────────────────

async function _seedUnitsAndProducts() {
  const existing = await _getAll('units');
  if (existing && existing.length > 0) return; // sudah ada

  // === UNITS PADAT (base: pcs) ===
  const unitsPadat = [
    { name: 'pcs',    category: 'padat', base_unit: 'pcs', conversion_factor: 1,    display_unit: 'pcs'    },
    { name: 'box',    category: 'padat', base_unit: 'pcs', conversion_factor: 12,   display_unit: 'box'    },
    { name: 'dus',    category: 'padat', base_unit: 'pcs', conversion_factor: 24,   display_unit: 'dus'    },
    { name: 'pak',    category: 'padat', base_unit: 'pcs', conversion_factor: 10,   display_unit: 'pak'    },
    { name: 'sachet', category: 'padat', base_unit: 'pcs', conversion_factor: 1,    display_unit: 'sachet' },
    { name: 'tablet', category: 'padat', base_unit: 'pcs', conversion_factor: 1,    display_unit: 'tablet' },
    { name: 'ampul',  category: 'padat', base_unit: 'pcs', conversion_factor: 1,    display_unit: 'ampul'  },
    { name: 'vial',   category: 'padat', base_unit: 'pcs', conversion_factor: 1,    display_unit: 'vial'   },
    { name: 'dosis',  category: 'padat', base_unit: 'pcs', conversion_factor: 1,    display_unit: 'dosis'  },
    { name: 'kg',     category: 'padat', base_unit: 'pcs', conversion_factor: 1000, display_unit: 'kg'     },
  ];

  // === UNITS CAIR (base: liter) ===
  const unitsCair = [
    { name: 'liter',  category: 'cair', base_unit: 'liter', conversion_factor: 1,       display_unit: 'liter'  },
    { name: 'ml',     category: 'cair', base_unit: 'liter', conversion_factor: 0.001,   display_unit: 'ml'     },
    { name: 'botol',  category: 'cair', base_unit: 'liter', conversion_factor: 0.6,     display_unit: 'botol'  },
    { name: 'galon',  category: 'cair', base_unit: 'liter', conversion_factor: 3.785,   display_unit: 'galon'  },
    { name: 'drum',   category: 'cair', base_unit: 'liter', conversion_factor: 200,     display_unit: 'drum'   },
  ];

  for (const u of [...unitsPadat, ...unitsCair]) {
    await _put('units', { id: crypto.randomUUID(), ...u, active: true, created_at: new Date().toISOString() });
  }

  console.log('[db_local] Seed units selesai.');
}

// Jalankan seed units saat script dimuat
_seedUnitsAndProducts().catch(e => console.warn('[db_local] Seed units error:', e));


// ── PENGAMBILAN INTI (Kemitraan) ───────────────────
// Record: { id, tanggal_ambil, tanggal_terakhir, jumlah_hari, total_kg, kandang, nama_inti, detail_harian[], created_at }
// detail_harian: [{ tanggal, rata_kg, harga_pasar, harga_kontrak, selisih, bagi_hasil, mitra_30, inti_70 }]

async function dbGetPengambilanInti(filters = {}) {
  try {
    let rows = await _getAll('pengambilan_inti');
    if (filters.kandang) rows = rows.filter(r => r.kandang === filters.kandang);
    rows.sort((a, b) => (b.tanggal_ambil || '').localeCompare(a.tanggal_ambil || ''));
    return rows;
  } catch { return []; }
}

async function dbSavePengambilanInti(obj) {
  if (!obj.id) {
    obj.id = crypto.randomUUID();
    obj.created_at = new Date().toISOString();
  }
  obj.updated_at = new Date().toISOString();
  await _put('pengambilan_inti', obj);
}

async function dbDeletePengambilanInti(id) {
  await _del('pengambilan_inti', id);
}
