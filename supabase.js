// ═══════════════════════════════════════════════════
//  SUPABASE CONFIG - Teaching Farm UB V2.9.0
// ═══════════════════════════════════════════════════
const SUPA_URL = 'https://clabeuujqzldkzqjfuil.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYWJldXVqcXpsZGt6cWpmdWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjAyMDcsImV4cCI6MjA5NDYzNjIwN30.qCpaBmDl7r6V8rYSkstgzC4WFv3VCqcUjaTVILI1978';

// ═══════════════════════════════════════════════════
//  TABLE NAMES (dengan akhiran _tf_ub)
// ═══════════════════════════════════════════════════
const TB = {
  users:              'users_tf_ub',
  kandang:            'kandang_tf_ub',
  input_harian:       'input_harian_tf_ub',
  penjualan:          'penjualan_tf_ub',
  daftar_pakan:       'daftar_pakan_tf_ub',
  kiriman_pakan:      'kiriman_pakan_tf_ub',
  kas_operasional:    'kas_operasional_tf_ub',
  pembayaran:         'pembayaran_tf_ub',
  activity_log:       'activity_log_tf_ub',
  master_supplier:    'master_supplier_tf_ub',
  master_vitamin:     'master_vitamin_tf_ub',
  master_obat:        'master_obat_tf_ub',
  master_vaksin:      'master_vaksin_tf_ub',
  master_pelanggan:   'master_pelanggan_tf_ub',
  kiriman_nonpakan:   'kiriman_nonpakan_tf_ub',
  pemakaian_nonpakan: 'pemakaian_nonpakan_tf_ub',
  app_config:         'app_config_tf_ub',
  pengambilan_inti:   'pengambilan_inti_tf_ub',
  sessions_bw:        'sessions_bw_tf_ub',
  timbang:            'timbang_tf_ub',
  audit_stok:         'audit_stok_tf_ub'
};

// ═══════════════════════════════════════════════════
//  HTTP HELPER
// ═══════════════════════════════════════════════════
async function supa(method, table, body = null, query = '') {
  const url = `${SUPA_URL}/rest/v1/${table}${query}`;
  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
  };
  if (method === 'GET') headers['Accept'] = 'application/json';
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Shorthand helpers
const SB = {
  select: (table, query = '') => supa('GET', table, null, query),
  insert: (table, body) => supa('POST', table, body),
  update: (table, body, query) => supa('PATCH', table, body, query),
  upsert: (table, body) => supa('POST', table, body, '?on_conflict=id'),
  delete: (table, query) => supa('DELETE', table, null, query),
  rpc: async (fnName, params = {}) => {
    const url = `${SUPA_URL}/rest/v1/rpc/${fnName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`RPC ${fnName}: ${await res.text()}`);
    return res.json();
  }
};

// ═══════════════════════════════════════════════════
//  CACHE LAYER (untuk performa & offline fallback)
//  Max 50 entries, LRU eviction
// ═══════════════════════════════════════════════════
const cache = {
  _data: {},
  _order: [],
  _maxSize: 50,
  get: k => { 
    if(cache._data[k] !== undefined) {
      // Move to end (most recently used)
      cache._order = cache._order.filter(x => x !== k);
      cache._order.push(k);
    }
    return cache._data[k] ?? null;
  },
  set: (k, v) => { 
    if(cache._data[k] === undefined) cache._order.push(k);
    else cache._order = [...cache._order.filter(x => x !== k), k];
    cache._data[k] = v;
    // Evict oldest if over limit
    while(cache._order.length > cache._maxSize) {
      const oldest = cache._order.shift();
      delete cache._data[oldest];
    }
  },
  del: k => { delete cache._data[k]; cache._order = cache._order.filter(x => x !== k); }
};

// ═══════════════════════════════════════════════════
//  DATA API — semua fungsi async
// ═══════════════════════════════════════════════════

// ── USERS ──────────────────────────────────────────
async function dbGetUsers() {
  try {
    const rows = await SB.select(TB.users, '?select=*&order=created_at.asc');
    cache.set('users', rows);
    return rows;
  } catch { return cache.get('users') || []; }
}

async function dbSaveUser(obj) {
  if (obj.id) {
    await SB.update(TB.users, obj, `?id=eq.${obj.id}`);
  } else {
    obj.id = crypto.randomUUID();
    await SB.insert(TB.users, obj);
  }
  cache.del('users');
}

async function dbDeleteUser(id) {
  await SB.delete(TB.users, `?id=eq.${id}`);
  cache.del('users');
}

async function dbFindUser(username, hashedPassword, plaintextPassword) {
  try {
    const rows = await SB.select(TB.users, `?select=*&username=eq.${encodeURIComponent(username)}`);
    return (rows || []).find(u =>
      u.username === username &&
      (u.password === hashedPassword || u.password === plaintextPassword) &&
      (u.active === true || u.active === 'true' || u.active === 1)
    ) || null;
  } catch { return null; }
}

// ── KANDANG ────────────────────────────────────────
async function dbGetKandang() {
  try {
    const rows = await SB.select(TB.kandang, '?select=*&order=created_at.asc');
    cache.set('kandang_list', rows);
    return rows;
  } catch { return cache.get('kandang_list') || []; }
}

async function dbSaveKandang(obj) {
  if (obj.id) {
    await SB.update(TB.kandang, obj, `?id=eq.${obj.id}`);
  } else {
    obj.id = crypto.randomUUID();
    await SB.insert(TB.kandang, obj);
  }
  cache.del('kandang_list');
}

async function dbDeleteKandang(id) {
  await SB.delete(TB.kandang, `?id=eq.${id}`);
  cache.del('kandang_list');
}

// ── GENERIC UPSERT (untuk backup/restore & edit kiriman) ──
async function dbUpsert(table, obj) {
  const tableName = TB[table] || table;
  if (!obj.id) obj.id = crypto.randomUUID();
  // Try update first, if not exists then insert
  const existing = await SB.select(tableName, `?id=eq.${obj.id}`);
  if (existing && existing.length > 0) {
    await SB.update(tableName, obj, `?id=eq.${obj.id}`);
  } else {
    await SB.insert(tableName, obj);
  }
}

// ── INPUT HARIAN ───────────────────────────────────
async function dbSaveInput(tanggal, kandang, data) {
  const existing = await SB.select(TB.input_harian, `?tanggal=eq.${tanggal}&kandang=eq.${encodeURIComponent(kandang)}`);
  if (existing && existing.length > 0) {
    await SB.update(TB.input_harian, { data, user_input: data.user }, `?tanggal=eq.${tanggal}&kandang=eq.${encodeURIComponent(kandang)}`);
  } else {
    await SB.insert(TB.input_harian, {
      id: crypto.randomUUID(),
      tanggal,
      kandang,
      user_input: data.user,
      data
    });
  }
  cache.del('input_harian');
  cache.del('_all_inputs');
}

async function dbGetInput(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc';
    if (filters.tanggal) q += `&tanggal=eq.${filters.tanggal}`;
    if (filters.kandang) q += `&kandang=eq.${encodeURIComponent(filters.kandang)}`;
    if (filters.dari) q += `&tanggal=gte.${filters.dari}`;
    if (filters.sampai) q += `&tanggal=lte.${filters.sampai}`;
    if (filters.limit) q += `&limit=${filters.limit}`;
    const isAll = !filters.tanggal && !filters.kandang && !filters.dari && !filters.sampai && !filters.limit;
    if (isAll && cache.get('_all_inputs')) return cache.get('_all_inputs');
    const rows = await SB.select(TB.input_harian, q);
    if (isAll) cache.set('_all_inputs', rows || []);
    return rows || [];
  } catch { return []; }
}

async function dbDeleteInput(id) {
  await SB.delete(TB.input_harian, `?id=eq.${id}`);
  cache.del('_all_inputs');
}

// ── PENJUALAN ──────────────────────────────────────
async function dbSavePenjualan(obj) {
  if (obj.id) {
    await SB.update(TB.penjualan, obj, `?id=eq.${obj.id}`);
  } else {
    obj.id = crypto.randomUUID();
    await SB.insert(TB.penjualan, obj);
  }
  cache.del('penjualan_list');
}

async function dbDeletePenjualan(id) {
  await SB.delete(TB.penjualan, `?id=eq.${id}`);
  cache.del('penjualan_list');
}

async function dbUpdatePenjualan(id, obj) {
  await SB.update(TB.penjualan, obj, `?id=eq.${id}`);
  cache.del('penjualan_list');
}

async function dbGetPenjualan(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc';
    if (filters.dari) q += `&tanggal=gte.${filters.dari}`;
    if (filters.sampai) q += `&tanggal=lte.${filters.sampai}`;
    if (filters.limit) q += `&limit=${filters.limit}`;
    else q += '&limit=100'; // Default limit untuk performa
    const rows = await SB.select(TB.penjualan, q);
    cache.set('penjualan_list', rows);
    return rows || [];
  } catch { return cache.get('penjualan_list') || []; }
}

// ── DAFTAR PAKAN ───────────────────────────────────
async function dbGetDaftarPakan() {
  try {
    const rows = await SB.select(TB.daftar_pakan, '?select=*&order=nama.asc');
    cache.set('daftar_pakan', rows);
    return rows;
  } catch { return cache.get('daftar_pakan') || []; }
}

async function dbSaveDaftarPakan(obj) {
  if (obj.id) {
    await SB.update(TB.daftar_pakan, obj, `?id=eq.${obj.id}`);
  } else {
    obj.id = crypto.randomUUID();
    await SB.insert(TB.daftar_pakan, obj);
  }
  cache.del('daftar_pakan');
}

async function dbDeleteDaftarPakan(id) {
  await SB.delete(TB.daftar_pakan, `?id=eq.${id}`);
  cache.del('daftar_pakan');
}

// ── KIRIMAN PAKAN ──────────────────────────────────
async function dbGetKiriman(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc';
    if (filters.dari) q += `&tanggal=gte.${filters.dari}`;
    if (filters.sampai) q += `&tanggal=lte.${filters.sampai}`;
    if (filters.limit) q += `&limit=${filters.limit}`;
    else q += '&limit=100'; // Default limit
    const rows = await SB.select(TB.kiriman_pakan, q);
    cache.set('kiriman_pakan', rows);
    return rows || [];
  } catch { return cache.get('kiriman_pakan') || []; }
}

async function dbSaveKiriman(obj) {
  obj.id = crypto.randomUUID();
  await SB.insert(TB.kiriman_pakan, obj);
  cache.del('kiriman_pakan');
}

async function dbDeleteKiriman(id) {
  await SB.delete(TB.kiriman_pakan, `?id=eq.${id}`);
  cache.del('kiriman_pakan');
}

// ── KAS OPERASIONAL ────────────────────────────────
async function dbGetKas(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc,created_at.desc';
    if (filters.dari)   q += `&tanggal=gte.${filters.dari}`;
    if (filters.sampai) q += `&tanggal=lte.${filters.sampai}`;
    if (filters.kandang) q += `&kandang=eq.${encodeURIComponent(filters.kandang)}`;
    if (filters.limit) q += `&limit=${filters.limit}`;
    else q += '&limit=200'; // Default limit
    const rows = await SB.select(TB.kas_operasional, q);
    cache.set('kas_list', rows);
    return rows || [];
  } catch { return cache.get('kas_list') || []; }
}

async function dbSaveKas(obj) {
  obj.id = crypto.randomUUID();
  await SB.insert(TB.kas_operasional, obj);
  cache.del('kas_list');
}

async function dbDeleteKas(id) {
  await SB.delete(TB.kas_operasional, `?id=eq.${id}`);
  cache.del('kas_list');
}

async function dbGetSaldoKas(kandang) {
  // Server-side aggregate — jauh lebih cepat dari fetch semua record
  try {
    const result = await SB.rpc('get_saldo_kas_tf_ub', { p_kandang: kandang || null });
    // Tetap ambil list terbaru (limited) untuk tampilan
    const list = await dbGetKas(kandang ? { kandang } : {});
    return { masuk: result.masuk, keluar: result.keluar, saldo: result.saldo, list };
  } catch {
    // Fallback ke client-side jika RPC gagal
    const list = await dbGetKas(kandang ? { kandang } : {});
    const masuk  = list.filter(k => k.jenis === 'masuk') .reduce((s, k) => s + (parseFloat(k.jumlah) || 0), 0);
    const keluar = list.filter(k => k.jenis === 'keluar').reduce((s, k) => s + (parseFloat(k.jumlah) || 0), 0);
    return { masuk, keluar, saldo: masuk - keluar, list };
  }
}

// Server-side stok telur (menghindari fetch semua input + penjualan)
async function dbGetStokTelur(sampai) {
  try {
    return await SB.rpc('get_stok_telur_tf_ub', { p_sampai: sampai || new Date().toISOString().split('T')[0] });
  } catch { return null; }
}

// Server-side stok pakan
async function dbGetStokPakan() {
  try {
    return await SB.rpc('get_stok_pakan_tf_ub', {});
  } catch { return null; }
}

// Server-side FIFO biaya pakan
async function dbGetFifoBiayaPakan(dari, sampai, kandang) {
  try {
    return await SB.rpc('get_fifo_biaya_pakan_tf_ub', { 
      p_dari: dari, 
      p_sampai: sampai, 
      p_kandang: kandang || null 
    });
  } catch (e) {
    console.error('FIFO RPC Error:', e);
    return [];
  }
}

// ── ACTIVITY LOG ───────────────────────────────────
async function dbSaveLog(aksi, tabel, recordId, dataLama, dataBaru, keterangan = '') {
  try {
    await SB.insert(TB.activity_log, {
      id: crypto.randomUUID(),
      user_input: window.currentUser?.username || '—',
      aksi,
      tabel,
      record_id: recordId || null,
      data_lama: dataLama || null,
      data_baru: dataBaru || null,
      keterangan: keterangan || null
    });
  } catch (e) {
    console.warn('[activity_log] Gagal simpan log:', e);
  }
}

async function dbGetLog(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc&limit=200';
    if (filters.user)  q += `&user_input=eq.${encodeURIComponent(filters.user)}`;
    if (filters.tabel) q += `&tabel=eq.${encodeURIComponent(filters.tabel)}`;
    if (filters.dari)  q += `&tanggal=gte.${filters.dari}`;
    if (filters.sampai)q += `&tanggal=lte.${filters.sampai}`;
    return await SB.select(TB.activity_log, q) || [];
  } catch { return []; }
}

// ── PEMBAYARAN ─────────────────────────────────────
async function dbGetPembayaran(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc';
    if (filters.dari)    q += `&tanggal=gte.${filters.dari}`;
    if (filters.sampai)  q += `&tanggal=lte.${filters.sampai}`;
    if (filters.jenis)   q += `&jenis=eq.${filters.jenis}`;
    if (filters.kandang) q += `&kandang=eq.${encodeURIComponent(filters.kandang)}`;
    const rows = await SB.select(TB.pembayaran, q);
    cache.set('pembayaran_list', rows);
    return rows || [];
  } catch { return cache.get('pembayaran_list') || []; }
}

async function dbSavePembayaran(obj) {
  obj.id = crypto.randomUUID();
  await SB.insert(TB.pembayaran, obj);
  cache.del('pembayaran_list');
}

async function dbDeletePembayaran(id) {
  await SB.delete(TB.pembayaran, `?id=eq.${id}`);
  cache.del('pembayaran_list');
}

async function dbUpdateStatusTagihan(kirimanId, jumlahBayar) {
  try {
    const rows = await SB.select(TB.kiriman_pakan, `?id=eq.${kirimanId}`);
    if (!rows || !rows.length) return;
    const k = rows[0];
    const totalTagihan = parseFloat(k.harga_total) || 0;
    const bayarList = await SB.select(TB.pembayaran, `?referensi_id=eq.${kirimanId}`);
    const totalBayar = (bayarList || []).reduce((s, b) => s + (parseFloat(b.jumlah_bayar) || 0), 0);
    const sisa = Math.max(0, totalTagihan - totalBayar);
    const status = sisa <= 0 ? 'lunas' : totalBayar > 0 ? 'sebagian' : 'belum';
    await SB.update(TB.kiriman_pakan, { status_bayar: status, sisa_tagihan: sisa }, `?id=eq.${kirimanId}`);
    cache.del('kiriman_pakan');
  } catch (e) { console.warn('updateStatusTagihan error:', e); }
}

// ── MASTER TABLES ──────────────────────────────────
async function dbGetMaster(table, filters = {}) {
  const tableName = TB[table] || table;
  try {
    let q = '?select=*&active=eq.true&order=kode.asc';
    if (filters.kategori) q += `&kategori=eq.${encodeURIComponent(filters.kategori)}`;
    const rows = await SB.select(tableName, q);
    cache.set(table, rows);
    return rows || [];
  } catch { return cache.get(table) || []; }
}

async function dbSaveMaster(table, obj) {
  const tableName = TB[table] || table;
  if (obj.id) {
    obj.updated_at = new Date().toISOString();
    await SB.update(tableName, obj, `?id=eq.${obj.id}`);
  } else {
    obj.id = crypto.randomUUID();
    obj.created_at = new Date().toISOString();
    await SB.insert(tableName, obj);
  }
  cache.del(table);
  cache.del(tableName);
}

async function dbDeleteMaster(table, id) {
  const tableName = TB[table] || table;
  await SB.update(tableName, { active: false, updated_at: new Date().toISOString() }, `?id=eq.${id}`);
  cache.del(table);
  cache.del(tableName);
}

async function dbGenerateKode(table, prefix) {
  const tableName = TB[table] || table;
  try {
    const rows = await SB.select(tableName, `?select=kode&kode=ilike.${prefix}-%25&order=kode.desc&limit=1`);
    if (!rows || !rows.length) return `${prefix}-001`;
    const lastKode = rows[0].kode;
    const lastNum = parseInt(lastKode.replace(prefix + '-', '')) || 0;
    return `${prefix}-${String(lastNum + 1).padStart(3, '0')}`;
  } catch {
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  }
}

// Specific getters
const dbGetSupplier  = (f) => dbGetMaster(TB.master_supplier, f);
const dbGetVitamin   = (f) => dbGetMaster(TB.master_vitamin, f);
const dbGetObat      = (f) => dbGetMaster(TB.master_obat, f);
const dbGetVaksin    = (f) => dbGetMaster(TB.master_vaksin, f);
const dbGetPelanggan = (f) => dbGetMaster(TB.master_pelanggan, f);

async function dbGetAllMaster() {
  const [supplier, vitamin, obat, vaksin, pelanggan, pakan] = await Promise.all([
    dbGetSupplier(), dbGetVitamin(), dbGetObat(), dbGetVaksin(), dbGetPelanggan(), dbGetDaftarPakan()
  ]);
  return { supplier, vitamin, obat, vaksin, pelanggan, pakan };
}

// ── STOK NON-PAKAN ────────────────────────────────
async function dbGetKirimanNonPakan(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc';
    if (filters.kategori) q += `&kategori=eq.${encodeURIComponent(filters.kategori)}`;
    if (filters.dari)     q += `&tanggal=gte.${filters.dari}`;
    if (filters.sampai)   q += `&tanggal=lte.${filters.sampai}`;
    const rows = await SB.select(TB.kiriman_nonpakan, q);
    cache.set('kiriman_np_' + (filters.kategori || 'all'), rows);
    return rows || [];
  } catch { return cache.get('kiriman_np_' + (filters.kategori || 'all')) || []; }
}

async function dbSaveKirimanNonPakan(obj) {
  obj.id = crypto.randomUUID();
  await SB.insert(TB.kiriman_nonpakan, obj);
  cache.del('kiriman_np_' + obj.kategori);
  cache.del('kiriman_np_all');
}

async function dbDeleteKirimanNonPakan(id, kategori) {
  await SB.delete(TB.kiriman_nonpakan, `?id=eq.${id}`);
  cache.del('kiriman_np_' + (kategori || 'all'));
  cache.del('kiriman_np_all');
}

async function dbGetPemakaianNonPakan(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc';
    if (filters.kategori) q += `&kategori=eq.${encodeURIComponent(filters.kategori)}`;
    if (filters.dari)     q += `&tanggal=gte.${filters.dari}`;
    if (filters.sampai)   q += `&tanggal=lte.${filters.sampai}`;
    const rows = await SB.select(TB.pemakaian_nonpakan, q);
    return rows || [];
  } catch { return []; }
}

async function dbSavePemakaianNonPakan(obj) {
  obj.id = crypto.randomUUID();
  await SB.insert(TB.pemakaian_nonpakan, obj);
}

async function dbDeletePemakaianNonPakan(id) {
  await SB.delete(TB.pemakaian_nonpakan, `?id=eq.${id}`);
}

async function dbGetStokNonPakan(kategori) {
  const [kiriman, pakai] = await Promise.all([
    dbGetKirimanNonPakan({ kategori }),
    dbGetPemakaianNonPakan({ kategori })
  ]);
  const stokMap = {};
  kiriman.forEach(k => {
    if (!stokMap[k.nama_item]) stokMap[k.nama_item] = { masuk: 0, keluar: 0, satuan: k.satuan, harga: 0 };
    stokMap[k.nama_item].masuk += parseFloat(k.jumlah) || 0;
    stokMap[k.nama_item].harga = parseFloat(k.harga_satuan) || stokMap[k.nama_item].harga;
  });
  pakai.forEach(p => {
    if (!stokMap[p.nama_item]) stokMap[p.nama_item] = { masuk: 0, keluar: 0, satuan: p.satuan, harga: 0 };
    stokMap[p.nama_item].keluar += parseFloat(p.jumlah) || 0;
  });
  return Object.entries(stokMap).map(([nama, v]) => ({
    nama, stok: Math.max(0, v.masuk - v.keluar), satuan: v.satuan, harga: v.harga
  }));
}

// ── PENGAMBILAN INTI (Kemitraan) ───────────────────
async function dbGetPengambilanInti(filters = {}) {
  try {
    let q = '?select=*&order=tanggal_ambil.desc';
    if (filters.kandang) q += `&kandang=eq.${encodeURIComponent(filters.kandang)}`;
    const rows = await SB.select(TB.pengambilan_inti, q);
    return rows || [];
  } catch { return []; }
}

async function dbSavePengambilanInti(obj) {
  if (!obj.id) {
    obj.id = crypto.randomUUID();
    obj.created_at = new Date().toISOString();
  }
  obj.updated_at = new Date().toISOString();
  await SB.insert(TB.pengambilan_inti, obj);
}

async function dbDeletePengambilanInti(id) {
  await SB.delete(TB.pengambilan_inti, `?id=eq.${id}`);
}

// ── STANDAR PERFORMA ───────────────────────────────
async function dbGetStandar() {
  try {
    const rows = await SB.select(TB.app_config, `?key=eq.standar_performa&select=value`);
    if(rows && rows.length && rows[0].value) return rows[0].value;
    return null;
  } catch {
    try { return JSON.parse(localStorage.getItem('standar_performa')); } catch { return null; }
  }
}

async function dbSaveStandar(data) {
  try {
    const existing = await SB.select(TB.app_config, `?key=eq.standar_performa`);
    if(existing && existing.length) {
      await SB.update(TB.app_config, { value: data, updated_at: new Date().toISOString() }, `?key=eq.standar_performa`);
    } else {
      await SB.insert(TB.app_config, { id: crypto.randomUUID(), key: 'standar_performa', value: data, created_at: new Date().toISOString() });
    }
    cache.del('standar_performa');
  } catch(e) {
    localStorage.setItem('standar_performa', JSON.stringify(data));
    console.warn('dbSaveStandar fallback to localStorage:', e.message);
    throw e;
  }
}

// ── AUDIT STOK ─────────────────────────────────────────
async function dbGetAudit(filters = {}) {
  try {
    let q = '?select=*&order=tanggal.desc';
    if(filters.jenis_item) q += `&jenis_item=eq.${encodeURIComponent(filters.jenis_item)}`;
    if(filters.dari) q += `&tanggal=gte.${filters.dari}`;
    if(filters.sampai) q += `&tanggal=lte.${filters.sampai}`;
    return await SB.select(TB.audit_stok, q) || [];
  } catch(e) {
    console.error('dbGetAudit error:', e);
    return [];
  }
}

async function dbSaveAudit(obj) {
  if (!obj.id) obj.id = crypto.randomUUID();
  if (!obj.created_at) obj.created_at = new Date().toISOString();
  await SB.insert(TB.audit_stok, obj);
}
