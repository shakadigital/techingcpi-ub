// ═══════════════════════════════════════════════════
// REAL-TIME MANAGER - Teaching Farm UB V2.9.0
// ═══════════════════════════════════════════════════
// Fixed: Removed dependency on window.supabase (not used in this app)
// Uses smart polling with actual server timestamp checks

class RealtimeManager {
  constructor() {
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.subscribers = new Map();
    this.messageQueue = [];
    this.pollInterval = null;
    this.lastChecked = new Date().toISOString();

    this.init();
  }

  init() {
    // Use smart polling — checks server for actual changes
    this.startPolling();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isConnected) {
        this.connect();
      } else if (document.hidden) {
        this.stopPolling();
      } else {
        this.startPolling();
      }
    });
  }

  startPolling() {
    if (this.pollInterval) return;

    // Poll every 30 seconds when page is visible
    this.pollInterval = setInterval(() => {
      if (this.isConnected && !document.hidden) {
        this.checkForUpdates();
      }
    }, 30000);

    this.isConnected = true;
    this.updateConnectionStatus(true);
    console.log('📡 Real-time polling started (30s interval)');
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async checkForUpdates() {
    // Only check if we're in supabase mode and have the supa helper
    if (window.DB_MODE !== 'supabase' || typeof SB === 'undefined') return;

    try {
      const tables = ['input_harian', 'penjualan', 'kas_operasional', 'kiriman_pakan'];

      for (const table of tables) {
        const query = `?select=id,updated_at&order=updated_at.desc&limit=1&updated_at=gt.${this.lastChecked}`;
        const rows = await SB.select(table, query);

        if (rows && rows.length > 0) {
          this.handleDatabaseChange(table, 'UPDATE', rows[0]);
        }
      }

      this.lastChecked = new Date().toISOString();
    } catch (error) {
      // Silent fail — polling will retry next interval
      console.debug('Polling check failed:', error.message);
    }
  }

  handleDatabaseChange(table, eventType, record) {
    console.log(`🔄 Database change detected: ${table} - ${eventType}`);

    // Notify subscribers
    this.notifySubscribers('database_change', {
      table,
      eventType,
      newRecord: record,
      timestamp: new Date().toISOString()
    });

    // Show real-time notification
    this.showRealtimeNotification(table, eventType, record);

    // Auto-refresh current page if relevant
    this.autoRefreshIfRelevant(table);
  }

  connect() {
    if (this.isConnected) return;
    this.startPolling();
  }

  disconnect() {
    this.isConnected = false;
    this.updateConnectionStatus(false);
    this.stopPolling();
    console.log('📡 Disconnected from real-time service');
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  handleOnline() {
    console.log('🌐 Online - Reconnecting real-time service');
    this.reconnectAttempts = 0;
    this.connect();
  }

  handleOffline() {
    console.log('📡 Offline - Disconnecting real-time service');
    this.disconnect();
  }

  // Subscribe to real-time events
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);

    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  // Notify all subscribers of an event
  notifySubscribers(eventType, data) {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Subscriber callback error:', error);
        }
      });
    }
  }

  // Send real-time message
  send(eventType, data) {
    const message = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      userId: window.currentUser?.username || 'anonymous'
    };

    if (this.isConnected) {
      console.log('📤 Sending real-time message:', message);
      setTimeout(() => {
        this.notifySubscribers('message_received', message);
      }, 100);
    } else {
      this.messageQueue.push(message);
    }
  }

  // Show real-time notification
  showRealtimeNotification(table, eventType, record) {
    if (document.hidden) return;

    const tableNames = {
      'input_harian': 'Input Harian',
      'penjualan': 'Penjualan',
      'kas_operasional': 'Kas Operasional',
      'kiriman_pakan': 'Kiriman Pakan',
      'pembayaran': 'Pembayaran'
    };

    const eventNames = {
      'INSERT': 'ditambahkan',
      'UPDATE': 'diperbarui',
      'DELETE': 'dihapus'
    };

    const tableName = tableNames[table] || table;
    const eventName = eventNames[eventType] || eventType;

    if (typeof showToast === 'function') {
      showToast(`🔄 ${tableName} ${eventName} oleh user lain`);
    }

    this.showRealtimeIndicator();
  }

  showRealtimeIndicator() {
    let indicator = document.getElementById('realtime-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'realtime-indicator';
      indicator.className = 'realtime-indicator';
      indicator.innerHTML = '🔄 <span>Live Update</span>';
      document.body.appendChild(indicator);
    }

    indicator.classList.add('show');

    setTimeout(() => {
      indicator.classList.remove('show');
    }, 2000);
  }

  // Auto-refresh current page if relevant
  autoRefreshIfRelevant(table) {
    const currentPage = this.getCurrentPage();
    const relevantPages = {
      'input_harian': ['home', 'input', 'riwayat'],
      'penjualan': ['home', 'penjualan', 'riwayat'],
      'kas_operasional': ['home', 'biaya'],
      'kiriman_pakan': ['gudang'],
      'pembayaran': ['gudang']
    };

    const pages = relevantPages[table] || [];
    if (pages.includes(currentPage)) {
      console.log(`🔄 Auto-refreshing ${currentPage} due to ${table} change`);

      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = setTimeout(() => {
        this.refreshCurrentPage();
      }, 2000);
    }
  }

  getCurrentPage() {
    const activePage = document.querySelector('.page.active');
    return activePage ? activePage.id.replace('page-', '') : 'home';
  }

  async refreshCurrentPage() {
    const currentPage = this.getCurrentPage();

    try {
      switch (currentPage) {
        case 'home':
          if (typeof renderHome === 'function') await renderHome();
          break;
        case 'input':
          // Jangan reload form jika user sedang mengetik (ada focus di input)
          const activeEl = document.activeElement;
          const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');
          if(!isTyping) {
            if (typeof autoLoadInputHarian === 'function') await autoLoadInputHarian();
          }
          break;
        case 'penjualan':
          if (typeof renderStokTelur === 'function') await renderStokTelur();
          if (typeof renderRiwayatJual === 'function') await renderRiwayatJual();
          break;
        case 'gudang':
          if (typeof switchGTab === 'function') switchGTab(window._currentGTab || 'pakan');
          break;
        case 'biaya':
          if (typeof initBiayaPage === 'function') await initBiayaPage();
          break;
        case 'riwayat':
          if (typeof renderRiwayat === 'function') await renderRiwayat();
          break;
      }
    } catch (error) {
      console.error('❌ Auto-refresh failed:', error);
    }
  }

  updateConnectionStatus(connected) {
    this.isConnected = connected;

    // Update connection indicator in header (with null checks)
    const syncBtn = document.getElementById('btn-sync');
    if (syncBtn) {
      const icon = syncBtn.querySelector('.sync-icon');
      if (icon) {
        icon.style.color = connected ? '#16a34a' : '#dc2626';
      }
      syncBtn.title = connected ? 'Real-time: Connected' : 'Real-time: Disconnected';
    }
  }

  // Get connection info
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriberCount: Array.from(this.subscribers.values()).reduce((total, set) => total + set.size, 0)
    };
  }
}

// Global instance — inisialisasi lazy setelah app siap
window.realtimeManager = null;

window.initRealtimeManager = function() {
  if (!window.realtimeManager) {
    window.realtimeManager = new RealtimeManager();
  }
};

// Export convenience functions
window.subscribeToRealtime = function(eventType, callback) {
  if (window.realtimeManager) return window.realtimeManager.subscribe(eventType, callback);
  return () => {};
};

window.sendRealtimeMessage = function(eventType, data) {
  if (window.realtimeManager) return window.realtimeManager.send(eventType, data);
};
