// ═══════════════════════════════════════════════════
// TEACHING FARM UB - USER PRESENCE LOGIC
// ═══════════════════════════════════════════════════

let presencePingInterval = null;

async function pingPresence(isOffline = false) {
  if (!currentUser || !currentUser.id || window.DB_MODE !== 'supabase') return;

  try {
    const payload = {
      last_active: isOffline ? null : new Date().toISOString()
    };
    
    // Gunakan SB.update langsung tanpa menghapus cache agar tidak membuat cache reset
    await SB.update('users_tf_ub', payload, `?id=eq.${currentUser.id}`);
  } catch (e) {
    console.warn('[Presence] Gagal mengirim ping:', e);
  }
}

function startPresencePing() {
  if (window.DB_MODE !== 'supabase') return;
  
  // Ping saat pertama kali masuk
  pingPresence();
  
  // Hapus interval sebelumnya jika ada
  if (presencePingInterval) clearInterval(presencePingInterval);
  
  // Ping rutin setiap 60 detik (1 menit)
  presencePingInterval = setInterval(() => {
    pingPresence();
  }, 60000);
}

function stopPresencePing() {
  if (presencePingInterval) {
    clearInterval(presencePingInterval);
    presencePingInterval = null;
  }
  
  // Segera kirim sinyal offline
  pingPresence(true);
}

async function showOnlineUsers() {
  if (!currentUser || currentUser.role !== 'superadmin' || window.DB_MODE !== 'supabase') return;
  
  const m = document.getElementById('modal-presence');
  const list = document.getElementById('presence-list');
  if (!m || !list) return;
  
  m.style.display = 'flex';
  list.innerHTML = '<div style="padding:20px;text-align:center;">⏳ Memuat daftar pengguna...</div>';
  
  try {
    // Cari user yang last_active dalam 5 menit terakhir
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
    
    // Query users
    const users = await SB.select('users_tf_ub', `?last_active=gte.${fiveMinutesAgo}&select=username,nama,role,last_active`);
    
    if (!users || users.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;">Tidak ada pengguna aktif selain Anda.</div>';
      return;
    }
    
    // Sort descending by last_active
    users.sort((a, b) => new Date(b.last_active) - new Date(a.last_active));
    
    let html = '';
    for (const u of users) {
      const isMe = (u.username === currentUser.username);
      const name = u.nama || u.username;
      
      const lastActiveDate = new Date(u.last_active);
      const timeStr = lastActiveDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:10px; height:10px; border-radius:50%; background:#10b981;"></div>
            <div>
              <div style="font-weight:600; color:#111827;">${name} ${isMe ? '<span style="font-size:0.75rem; background:#dbeafe; color:#1e40af; padding:2px 6px; border-radius:4px; margin-left:4px;">Anda</span>' : ''}</div>
              <div style="font-size:0.8rem; color:#6b7280; text-transform:capitalize;">${u.role}</div>
            </div>
          </div>
          <div style="font-size:0.75rem; color:#9ca3af; text-align:right;">
            Aktif<br>${timeStr}
          </div>
        </div>
      `;
    }
    
    list.innerHTML = html;
    
  } catch (e) {
    console.error('[Presence] Error get online users:', e);
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#dc2626;">Gagal memuat data pengguna.</div>';
  }
}
