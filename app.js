// ═══ APP.JS — CORE MODULE ═══
// Contains: DB object, manualSync, navigation (switchPage, goBack), initApp,
// populateKandangSelects, bootApp, PWA registration, and cache/ROLE_LEVEL constants.
//
// Split modules (loaded via script tags):
//   utils.js, penjualan.js, gudang-pakan.js, home.js, kemitraan.js,
//   settings-page.js, biaya.js, riwayat.js, laporan.js, grafik.js,
//   backup.js, kas.js, master.js, pwa-update.js, gudang-nonpakan.js,
//   standar-performa.js

// ═══ STORAGE (localStorage fallback untuk session saja) ═══
const DB={
  get:k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}},
  set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),
  del:k=>localStorage.removeItem(k)
};


// ═══ MANUAL SYNC ═══
async function manualSync(){
  const btn=document.getElementById('btn-sync');
  if(!btn) return;
  if(btn.classList.contains('syncing'))return; // Prevent double click
  
  btn.classList.add('syncing');
  btn.title='Syncing...';
  showToast('🔄 Memulai sync...');
  
  try{
    // Cek mode database
    if(window.DB_MODE!=='supabase'){
      showToast('⚠️ Sync hanya tersedia di mode Supabase');
      btn.classList.remove('syncing');
      return;
    }

    // 1. Sync offline queue ke server (jika ada pending data)
    if(window.offlineManager && window.offlineManager.isOnline){
      await window.offlineManager.backgroundSync();
    }
    
    // 2. Refresh semua data dari server
    const results=await Promise.allSettled([
      dbGetUsers(),
      dbGetKandang(),
      dbGetInput({}),
      dbGetPenjualan({}),
      dbGetDaftarPakan(),
      dbGetKiriman({}),
      dbGetKas({})
    ]);
    
    // Cek hasil
    const failed=results.filter(r=>r.status==='rejected');
    
    // Clear all cache regardless of partial failures so successful ones update UI
    if(typeof cache!=='undefined'&&cache._data){
      Object.keys(cache._data).forEach(k=>cache.del(k));
    }
    
    if(failed.length>0){
      console.error('Sync errors:',failed);
      btn.classList.add('error');
      setTimeout(()=>btn.classList.remove('error'),2000);
      showToast('❌ Sync gagal: '+failed.length+' tabel error');
    }else{
      btn.classList.add('success');
      setTimeout(()=>btn.classList.remove('success'),2000);
      showToast('✅ Sync berhasil! Data diperbarui.');
      
      // Refresh tampilan jika di home
      const activePage=document.querySelector('.page.active');
      if(activePage&&activePage.id==='page-home'){
        renderHome();
      }
    }
  }catch(e){
    console.error('Sync error:',e);
    btn.classList.add('error');
    setTimeout(()=>btn.classList.remove('error'),2000);
    showToast('❌ Sync gagal: '+e.message);
  }finally{
    btn.classList.remove('syncing');
    btn.title='Sync Data';
  }
}



// ═══ NAVIGATION ═══
const _pageHistory = [];

const PAGE_LABELS = {
  home:'Home', input:'Input Harian', penjualan:'Penjualan',
  biaya:'Biaya Operasional', gudang:'Gudang', laporan:'Laporan',
  riwayat:'Riwayat', settings:'Pengaturan', kandang:'Kandang',
  user:'User', master:'Master Data'
};

function switchPage(name, _fromBack=false){
  if(name==='penjualan'&&!can('JUAL')){showToast('Tidak ada akses ke halaman Penjualan');return;}
  if(name==='biaya'&&!can('BIAYA')){showToast('Tidak ada akses ke halaman Biaya Operasional');return;}
  if(name==='master'&&!can('KEUANGAN')){showToast('Tidak ada akses ke Master Data');return;}

  // Track history (jangan push jika dipanggil dari goBack)
  if(!_fromBack){
    const current = document.querySelector('.page.active')?.id?.replace('page-','');
    if(current && current !== name) _pageHistory.push(current);
    if(_pageHistory.length > 20) _pageHistory.shift(); // batas stack
  }

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.qa-btn').forEach(n=>n.classList.remove('active'));
  const targetPage = document.getElementById('page-'+name);
  if(targetPage) targetPage.classList.add('active');
  else console.warn('Halaman tidak ditemukan: page-'+name);
  const navEl = document.getElementById('nav-'+name);
  if(navEl) navEl.classList.add('active');

  // Back button: tampil di semua halaman kecuali home
  const btnBack = document.getElementById('btn-back');
  if(btnBack) btnBack.style.display = name==='home' ? 'none' : 'flex';

  // Update subtitle header dengan nama halaman
  const sub = document.getElementById('hdr-kandang');
  if(sub) sub.textContent = name==='home' ? '—' : (PAGE_LABELS[name]||name);

  if(name==='home')renderHome();
  if(name==='input')autoLoadInputHarian();
  if(name==='settings')renderSettings();
  if(name==='kandang')renderKandangTable();
  if(name==='user')renderUserTable();
  if(name==='master')renderMaster();
  if(name==='gudang') { showGudangCards(); }
  if(name==='penjualan'){populateAllPelangganSelects();renderStokTelur();loadHargaPasarJual();renderRiwayatJual();showPengambilanIntiSection();}
  if(name==='biaya'){initBiayaPage();}
  if(name==='riwayat')renderRiwayat();
  if(name==='bw')initBwPage();
  if(name==='laporan'){populateLaporanKandang();renderLaporan();initHargaPasarUI();showKemitraanTab();}
}

function goBack(){
  const prev = _pageHistory.pop();
  switchPage(prev || 'home', true);
}

// ═══ INIT ═══
async function initApp(){
  if(!document.getElementById('tanggal').value)document.getElementById('tanggal').value=new Date().toISOString().split('T')[0];
  if(!document.getElementById('jual-tanggal').value)document.getElementById('jual-tanggal').value=new Date().toISOString().split('T')[0];
  // Parallel fetch — semua independen satu sama lain
  await Promise.all([
    populateKandangSelects(),
    populateAllPakanSelects(),
    populateAllPelangganSelects(),
    loadKesMaster()
  ]);
  updatePeriodBar();
  calcSisa();calcSaleTotal();
  renderHome();
}

// ═══ KANDANG SELECT ═══
async function populateKandangSelects(){
  const list=await dbGetKandang();
  cache.set('kandang_list',list);
  ['kandang'].forEach(id=>{
    const sel=document.getElementById(id);if(!sel)return;
    const prev=sel.value;
    sel.innerHTML='<option value="">-- Pilih Kandang --</option>';
    list.forEach(k=>{const o=document.createElement('option');o.value=k.nama;o.textContent=k.nama+(k.status==='Aktif'?' ✅':' ⬜');sel.appendChild(o);});
    if(prev)sel.value=prev;
  });
}

// ═══ PWA ═══
if('serviceWorker' in navigator && location.protocol !== 'file:'){
  navigator.serviceWorker.register('sw.js').then(reg => {
    // Jika ada SW baru menunggu, langsung aktifkan
    if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if(newSW) newSW.addEventListener('statechange', () => {
        if(newSW.state === 'installed' && navigator.serviceWorker.controller){
          // SW baru siap — reload untuk pakai versi terbaru
          window.location.reload();
        }
      });
    });
  }).catch(()=>{});

  // Jika SW controller berubah (update aktif), reload
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(!refreshing){ refreshing = true; window.location.reload(); }
  });
}

// ═══ BOOT ═══
// Wait for DB script to load before initializing
let _bootAttempts = 0;
function bootApp(){
  _bootAttempts++;

  // Timeout 10 detik — jika DB tidak load, tampilkan login
  if(_bootAttempts > 100){
    console.error('❌ DB script gagal load setelah 10 detik');
    document.getElementById('loading-screen').style.display='none';
    document.getElementById('login-screen').style.display='flex';
    return;
  }

  if(typeof dbGetUsers==='undefined'){
    setTimeout(bootApp,100);
    return;
  }

  try {
    initUsers();
    setTimeout(checkSession,300);
  } catch(e) {
    console.error('bootApp error:', e);
    document.getElementById('loading-screen').style.display='none';
    document.getElementById('login-screen').style.display='flex';
  }
}

// Jalankan setelah DOM siap
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
