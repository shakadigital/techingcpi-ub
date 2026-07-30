// â•â•â• APP.JS â€” CORE MODULE â•â•â•
// Contains: DB object, manualSync, navigation (switchPage, goBack), initApp,
// populateKandangSelects, bootApp, PWA registration, and cache/ROLE_LEVEL constants.
//
// Split modules (loaded via script tags):
//   utils.js, penjualan.js, gudang-pakan.js, home.js, kemitraan.js,
//   settings-page.js, biaya.js, riwayat.js, laporan.js, grafik.js,
//   backup.js, kas.js, master.js, pwa-update.js, gudang-nonpakan.js,
//   standar-performa.js

// â•â•â• STORAGE (localStorage fallback untuk session saja) â•â•â•
const DB={
  get:k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}},
  set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),
  del:k=>localStorage.removeItem(k)
};


// â•â•â• MANUAL SYNC â•â•â•
async function manualSync(){
  const btn=document.getElementById('btn-sync');
  if(!btn) return;
  if(btn.classList.contains('syncing'))return; // Prevent double click
  
  btn.classList.add('syncing');
  btn.title='Syncing...';
  showToast('ðŸ”„ Memulai sync...');
  
  try{
    // Cek mode database
    if(window.DB_MODE!=='supabase'){
      showToast('âš ï¸ Sync hanya tersedia di mode Supabase');
      btn.classList.remove('syncing');
      return;
    }

    // 1. Sync offline queue ke server (jika ada pending data)
    if(window.offlineManager && window.offlineManager.isOnline){
      await window.offlineManager.backgroundSync();
    }
    
    // Clear all cache before fetching so that fresh data is retrieved and repopulates the cache
    if(typeof cache!=='undefined'&&cache._data){
      Object.keys(cache._data).forEach(k=>cache.del(k));
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
    
    if(failed.length>0){
      console.error('Sync errors:',failed);
      btn.classList.add('error');
      setTimeout(()=>btn.classList.remove('error'),2000);
      showToast('âŒ Sync gagal: '+failed.length+' tabel error');
    }else{
      btn.classList.add('success');
      setTimeout(()=>btn.classList.remove('success'),2000);
      showToast('âœ… Sync berhasil! Data diperbarui.');
      
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
    showToast('âŒ Sync gagal: '+e.message);
  }finally{
    btn.classList.remove('syncing');
    btn.title='Sync Data';
  }
}



// â•â•â• NAVIGATION â•â•â•
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
  if(sub) sub.textContent = name==='home' ? 'â€”' : (PAGE_LABELS[name]||name);

  // Update desktop page title
  const deskTitle = document.getElementById('hdr-page-title');
  if(deskTitle) deskTitle.textContent = name==='home' ? 'Dashboard' : (PAGE_LABELS[name]||name);

  if(name==='home')renderHome();
  if(name==='input')autoLoadInputHarian();
  if(name==='settings')renderSettings();
  if(name==='kandang')renderKandangTable();
  if(name==='user')renderUserTable();
  if(name==='master')renderMaster();
  if(name==='gudang') { showGudangCards(); }
  if(name==='penjualan'){
    populateAllPelangganSelects();renderStokTelur();loadHargaPasarJual();renderRiwayatJual();showPengambilanIntiSection();loadPageAuditStokSistem();loadPageRiwayatAudit();
    if (typeof renderRiwayatWaste === 'function') renderRiwayatWaste();
    // Default desktop tab:
    if (!document.querySelector('#page-penjualan .ptab-group.active')) {
      if(typeof switchPTab === 'function') switchPTab('stok-telur-body');
    }
  }
  if(name==='biaya'){initBiayaPage();}
  if(name==='riwayat')renderRiwayat();
  if(name==='bw')initBwPage();
  if(name==='laporan'){populateLaporanKandang();renderLaporan();initHargaPasarUI();showKemitraanTab();}
}

function goBack(){
  const prev = _pageHistory.pop();
  switchPage(prev || 'home', true);
}

// â•â•â• INIT â•â•â•
async function initApp(){
  if(!document.getElementById('tanggal').value)document.getElementById('tanggal').value=new Date().toISOString().split('T')[0];
  if(!document.getElementById('jual-tanggal').value)document.getElementById('jual-tanggal').value=new Date().toISOString().split('T')[0];
  // Parallel fetch â€” semua independen satu sama lain
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

// â•â•â• KANDANG SELECT â•â•â•
async function populateKandangSelects(){
  const list=await dbGetKandang();
  cache.set('kandang_list',list);
  ['kandang'].forEach(id=>{
    const sel=document.getElementById(id);if(!sel)return;
    const prev=sel.value;
    sel.innerHTML='<option value="">-- Pilih Kandang --</option>';
    list.forEach(k=>{const o=document.createElement('option');o.value=k.nama;o.textContent=k.nama+(k.status==='Aktif'?' âœ…':' â¬œ');sel.appendChild(o);});
    if(prev)sel.value=prev;
  });
}

// â•â•â• PWA â•â•â•
if('serviceWorker' in navigator && location.protocol !== 'file:'){
  navigator.serviceWorker.register('sw.js').then(reg => {
    // Jika ada SW baru menunggu, langsung aktifkan
    if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if(newSW) newSW.addEventListener('statechange', () => {
        if(newSW.state === 'installed' && navigator.serviceWorker.controller){
          // SW baru siap â€” reload untuk pakai versi terbaru
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

// â•â•â• BOOT â•â•â•
// Wait for DB script to load before initializing
let _bootAttempts = 0;
function bootApp(){
  _bootAttempts++;

  // Timeout 10 detik â€” jika DB tidak load, tampilkan login
  if(_bootAttempts > 100){
    console.error('âŒ DB script gagal load setelah 10 detik');
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

// --- DESKTOP SIDEBAR LOGIC ---

window.toggleSidebar = function() {
  const sidebar = document.getElementById('desktop-sidebar');
  if(sidebar) {
    sidebar.classList.toggle('collapsed');
  }
};

window.toggleSubmenu = function(element, pageId) {
  // Prevent collapsing if the sidebar itself is collapsed
  const sidebar = document.getElementById('desktop-sidebar');
  if(sidebar && sidebar.classList.contains('collapsed')) {
    sidebar.classList.remove('collapsed');
  }

  const group = element.closest('.nav-group');
  if(group) {
    // Optional: close other expanded groups
    document.querySelectorAll('.nav-group.expanded').forEach(g => {
      if(g !== group) g.classList.remove('expanded');
    });
    
    group.classList.toggle('expanded');
  }

  // Jika ada pageId (misal "input", "penjualan", dll), maka langsung pindah halaman
  if (pageId && typeof switchPage === 'function') {
    switchPage(pageId);
    
    // Set active status
    document.querySelectorAll('#desktop-sidebar .nav-item, #desktop-sidebar .sub-item').forEach(el => {
      el.classList.remove('active');
    });
    element.classList.add('active');
  }
};

window.switchPTab = function(tabId) {
  // Hanya berlaku jika ada elemen ptab-group
  const groups = document.querySelectorAll('#page-penjualan .ptab-group');
  if(groups.length > 0) {
    groups.forEach(g => g.classList.remove('active'));
    const target = document.querySelector(`#page-penjualan .ptab-group[data-ptab="${tabId}"]`);
    if(target) target.classList.add('active');
  }
};

window.navigateAndScroll = function(pageId, sectionId, isTab = false) {
  // 1. Pindah Halaman Utama
  if (typeof switchPage === 'function') {
    switchPage(pageId);
  }

  // Set active style di sidebar
  if(event && event.currentTarget) {
    document.querySelectorAll('#desktop-sidebar .nav-item, #desktop-sidebar .sub-item').forEach(el => {
      el.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    // Jika sub-item diklik, parent nav-item juga dibikin active
    const parentGroup = event.currentTarget.closest('.nav-group');
    if(parentGroup) {
      const parentNav = parentGroup.querySelector('.nav-item');
      if(parentNav) parentNav.classList.add('active');
    }
  }

  // Set default tab if not explicitly a tab
  if (pageId === 'penjualan' && !isTab && sectionId) {
    switchPTab(sectionId);
  }

  // 2. Jika ada target tab (seperti gudang)
  if (isTab && sectionId) {
    setTimeout(() => {
      if (pageId === 'gudang') {
        if (typeof window.switchGTab === 'function') window.switchGTab(sectionId);
        else if (typeof switchGTab === 'function') switchGTab(sectionId);
      } else if (pageId === 'penjualan') {
        switchPTab(sectionId);
      }
    }, 150);
    return;
  }

  // 3. Jika ada elemen target scroll
  if (sectionId) {
    setTimeout(() => {
      const targetEl = document.getElementById(sectionId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300); // Jeda agar transisi halaman selesai dan DOM aktif
  }
};

// ═══ SHORTCUT & ACTIVITY LOG ═══
document.addEventListener('keydown', function(e) {
  // Shortcut: Ctrl + Shift + L
  if (e.ctrlKey && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault();
    openActivityLogModal();
  }
});

async function openActivityLogModal() {
  const modal = document.getElementById('modal-activity-log');
  if (!modal) return;
  modal.style.display = 'flex';
  
  const tbody = document.getElementById('activity-log-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">⏳ Memuat log aktivitas...</td></tr>';
  
  try {
    const logs = await dbGetLog(); // Ambil 200 log terakhir
    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;">Belum ada catatan aktivitas.</td></tr>';
      return;
    }
    
    tbody.innerHTML = logs.map(l => {
      let tglFmt = l.tanggal ? l.tanggal.replace('T', ' ').substring(0, 16) : '—';
      let badgeClass = 'badge-blue';
      if(l.aksi === 'HAPUS' || l.aksi === 'NONAKTIF') badgeClass = 'badge-red';
      else if(l.aksi === 'TAMBAH' || l.aksi === 'AKTIFKAN') badgeClass = 'badge-green';
      else if(l.aksi === 'EDIT' || l.aksi === 'UPDATE') badgeClass = 'badge-orange';
      
      return `<tr>
        <td style="white-space:nowrap;font-size:0.8rem;color:#666">${tglFmt}</td>
        <td><strong>${esc(l.user_input || '—')}</strong></td>
        <td><span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:#f1f5f9;border:1px solid #cbd5e1;font-weight:bold;">${esc(l.aksi || '—')}</span></td>
        <td>${esc(l.tabel || '—')}</td>
        <td style="font-size:0.8rem;max-width:250px;white-space:normal;color:#444">${esc(l.keterangan || '—')}</td>
      </tr>`;
    }).join('');
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#dc2626;">Gagal memuat log.</td></tr>';
    console.error(e);
  }
}
