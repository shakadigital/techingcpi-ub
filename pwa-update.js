// ═══ MODULE: pwa-update ═══

async function forceUpdatePWA() {
  if(currentUser?.role !== 'superadmin') {
    showToast('🔒 Hanya Superadmin yang bisa force update!');
    return;
  }
  if(!confirm('Hapus semua cache PWA dan muat ulang versi terbaru?\n\nSemua user yang membuka aplikasi akan otomatis mendapat versi baru.')) return;

  showToast('⏳ Menghapus cache lama...');

  try {
    // 1. Hapus semua cache
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));

    // 2. Reset shown_version agar popup versi baru muncul lagi
    localStorage.removeItem('shown_version');

    // 3. Unregister service worker lama
    if('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    // 4. Log aktivitas
    await dbSaveLog('FORCE_UPDATE', 'system', null, null,
      { version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '—' },
      'Force update PWA oleh superadmin');

    showToast('✅ Cache dihapus! Memuat ulang...');

    // 5. Reload setelah delay singkat
    setTimeout(() => window.location.reload(true), 1500);

  } catch(e) {
    showToast('❌ Gagal: ' + e.message);
  }
}

async function broadcastUpdateNotice() {
  if(currentUser?.role !== 'superadmin') {
    showToast('🔒 Hanya Superadmin!');
    return;
  }
  // Reset shown_version di localStorage semua user tidak bisa dilakukan langsung
  // tapi kita bisa naikkan APP_VERSION di install-prompt.js
  showToast('💡 Untuk broadcast update: naikkan APP_VERSION di install-prompt.js lalu deploy ulang.');
}

// Tampilkan info versi & cache di tab backup
async function loadCacheInfo() {
  try {
    const keys = await caches.keys();
    const el = document.getElementById('current-cache-name');
    if(el) el.textContent = keys.join(', ') || 'Tidak ada cache';
    const ver = document.getElementById('current-app-version');
    if(ver) ver.textContent = typeof APP_VERSION !== 'undefined' ? 'V' + APP_VERSION : '—';
  } catch(e) {}
}

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
