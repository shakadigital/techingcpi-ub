// ═══════════════════════════════════════════════════
// INSTALL PROMPT - Teaching Farm UB V4.3.6
// ═══════════════════════════════════════════════════

// Konfigurasi Notifikasi
const INSTALL_COOLDOWN = 24 * 60 * 60 * 1000; // 24 jam
const APP_VERSION = '4.3.6'; // Naikkan ini setiap ada update besar

class InstallPrompt {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.hasShownPrompt = false;
    this.init();
  }

  init() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      // Hanya tampilkan jika belum pernah dismiss
      if(!localStorage.getItem('install_dismissed')) {
        this.showHeaderUpdateBadge();
      }
    });

    window.addEventListener('appinstalled', () => {
      this.handleAppInstalled();
    });

    this.checkIfInstalled();
  }

  checkIfInstalled() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      this.checkVersionAndShowInfo();
    }
    if (document.referrer.includes('android-app://')) {
      this.isInstalled = true;
    }
  }

  // ── Hanya tampilkan popup jika versi BARU ──
  checkVersionAndShowInfo() {
    const shownVersion = localStorage.getItem('shown_version');
    if (shownVersion !== APP_VERSION) {
      // Versi baru — tampilkan info
      setTimeout(() => this.showVersionInfo(), 2000);
    }
    // Jika versi sama, tidak tampilkan apapun
  }

  showInstallBanner() {
    // Tidak dipakai lagi — diganti showHeaderUpdateBadge
    this.showHeaderUpdateBadge();
  }

  showHeaderUpdateBadge() {
    if(this.isInstalled || document.getElementById('header-update-badge')) return;
    // Tambahkan badge kecil di header center
    const header = document.querySelector('header');
    if(!header) return;
    const badge = document.createElement('div');
    badge.id = 'header-update-badge';
    badge.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:-28px;background:rgba(45,106,79,.9);backdrop-filter:blur(8px);color:#fff;padding:4px 12px;border-radius:0 0 8px 8px;font-size:.7rem;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;z-index:199;box-shadow:0 2px 8px rgba(0,0,0,.15)';
    badge.innerHTML = `<span>📲 Update V${APP_VERSION} tersedia</span><button onclick="window.installPrompt.triggerInstall()" style="background:#fff;color:#2d6a4f;border:none;border-radius:4px;padding:2px 8px;font-size:.65rem;font-weight:700;cursor:pointer">Install</button><button onclick="window.installPrompt.dismissUpdate()" style="background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:.8rem;padding:0 2px">✕</button>`;
    header.style.position = 'relative';
    header.appendChild(badge);
  }

  dismissUpdate() {
    localStorage.setItem('install_dismissed', APP_VERSION);
    const badge = document.getElementById('header-update-badge');
    if(badge) badge.remove();
  }

  showInstallPrompt() {
    // Tidak dipakai lagi
    return;
  }

  async triggerInstall() {
    if (!this.deferredPrompt) {
      // Sudah terinstall atau prompt tidak tersedia — tutup badge & tampilkan instruksi manual
      this.dismissUpdate();
      this.showManualInstallInstructions();
      return;
    }
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') this.handleInstallAccepted();
      else this.handleInstallDismissed();
      this.deferredPrompt = null;
    } catch (e) {
      this.showManualInstallInstructions();
    }
    // Selalu tutup badge setelah interaksi install
    this.dismissUpdate();
  }

  showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    let instructions = '';
    if (isIOS) {
      instructions = `<div class="manual-install"><h4>Install di iOS:</h4><ol><li>Tap tombol Share ⎋</li><li>Pilih "Add to Home Screen"</li><li>Tap "Add"</li></ol></div>`;
    } else if (isAndroid) {
      instructions = `<div class="manual-install"><h4>Install di Android:</h4><ol><li>Tap menu browser (⋮)</li><li>Pilih "Add to Home Screen"</li><li>Tap "Install"</li></ol></div>`;
    } else {
      instructions = `<div class="manual-install"><h4>Install di Desktop:</h4><ol><li>Klik icon install di address bar</li><li>Klik "Install"</li></ol></div>`;
    }
    const modal = document.createElement('div');
    modal.className = 'install-modal-overlay show';
    modal.innerHTML = `
      <div class="install-modal">
        <div class="install-modal-header"><h3>📱 Cara Install Manual</h3><button class="install-modal-close" onclick="this.closest('.install-modal-overlay').remove()">✕</button></div>
        <div class="install-modal-body">${instructions}</div>
        <div class="install-modal-footer"><button class="btn-primary" onclick="this.closest('.install-modal-overlay').remove()">Mengerti</button></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  handleInstallAccepted() {
    this.dismissUpdate();
    this.dismissModal();
    if (typeof showToast === 'function') showToast('🎉 App sedang diinstall...');
  }

  handleInstallDismissed() {
    this.dismissUpdate();
    this.dismissModal();
  }

  handleAppInstalled() {
    this.isInstalled = true;
    this.dismissUpdate();
    this.dismissModal();
    setTimeout(() => this.showVersionInfo(), 2000);
  }

  // ── Popup versi baru — simpan ke localStorage setelah ditutup ──
  showVersionInfo() {
    // Jangan tampilkan jika sudah pernah untuk versi ini
    if (localStorage.getItem('shown_version') === APP_VERSION) return;

    const modal = document.createElement('div');
    modal.id = 'version-info-modal';
    modal.className = 'install-modal-overlay show';
    modal.innerHTML = `
      <div class="install-modal version-modal">
        <div class="install-modal-header">
          <div class="install-modal-icon">🚀</div>
          <h3>Teaching cpi-ub V${APP_VERSION}</h3>
        </div>
        <div class="install-modal-body">
          <div class="version-welcome">
            <p><strong>Versi ${APP_VERSION}</strong> berhasil diinstall!</p>
            <p>Fitur baru yang tersedia:</p>
          </div>
          <div class="version-features">
            <div class="version-feature">📱 Shortcut home screen sekarang tampil sebagai "cpi-ub"</div>
            <div class="version-feature">🔄 Update versi aplikasi ke V${APP_VERSION}</div>
            <div class="version-feature">⚡ Peningkatan cache untuk performa lebih cepat</div>
          </div>
          <div class="version-tip">💡 Swipe kiri/kanan untuk navigasi cepat antar halaman!</div>
        </div>
        <div class="install-modal-footer">
          <button class="btn-primary" onclick="window.installPrompt.closeVersionInfo()">🚀 Mulai Menggunakan</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  closeVersionInfo() {
    // Tandai versi ini sudah ditampilkan
    localStorage.setItem('shown_version', APP_VERSION);
    const modal = document.getElementById('version-info-modal');
    if (modal) modal.remove();
  }

  dismissBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) { banner.classList.remove('show'); setTimeout(() => banner.remove(), 300); }
  }

  dismissModal() {
    const modal = document.getElementById('install-modal');
    if (modal) { modal.classList.remove('show'); setTimeout(() => modal.remove(), 300); }
  }
}

window.installPrompt = new InstallPrompt();
