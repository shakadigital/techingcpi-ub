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
