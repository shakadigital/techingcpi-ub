// ═══════════════════════════════════════════════════
// MONITORING BW (Body Weight) - Teaching Farm UB
// ═══════════════════════════════════════════════════

let _bwSession = { entries: [], kandang: '', umur: 0, sample: 30 };
let _bwInterval = 10;

function switchBwTab(tab) {
  ['input','sebaran','dashboard'].forEach(t => {
    const tabEl = document.getElementById('bwtab-'+t);
    const contentEl = document.getElementById('bwtab-content-'+t);
    if(tabEl) tabEl.classList.toggle('active', t===tab);
    if(contentEl) contentEl.style.display = t===tab ? '' : 'none';
  });
  if(tab==='sebaran') initBwSebaran();
  if(tab==='dashboard') renderBwDashboard();
}

async function initBwPage() {
  const list = cache.get('kandang_list') || await dbGetKandang();
  const sel = document.getElementById('bw-kandang');
  if(!sel) return;
  sel.innerHTML = '';
  list.filter(k=>k.status==='Aktif').forEach(k => {
    const o = document.createElement('option');
    o.value = k.nama; o.textContent = k.nama;
    sel.appendChild(o);
  });
  updateBwUmur();
  document.getElementById('bw-step-select').style.display = '';
  document.getElementById('bw-step-input').style.display = 'none';
  document.getElementById('bw-step-review').style.display = 'none';
}

function updateBwUmur() {
  const kandangNama = document.getElementById('bw-kandang')?.value;
  const list = cache.get('kandang_list') || [];
  const k = list.find(x => x.nama === kandangNama);
  const umurEl = document.getElementById('bw-umur');
  if(!umurEl) return;
  if(k && k.chickin) {
    const hariSejak = Math.floor((new Date() - new Date(k.chickin)) / 86400000);
    const totalHari = (parseInt(k.umur_masuk)||0) + hariSejak;
    umurEl.value = Math.floor(totalHari / 7);
  } else {
    umurEl.value = 0;
  }
}

function startBwSession() {
  const kandang = document.getElementById('bw-kandang').value;
  const umur = parseInt(document.getElementById('bw-umur').value) || 0;
  const sample = parseInt(document.getElementById('bw-sample').value) || 30;
  if(!kandang) { showToast('⚠️ Pilih kandang!'); return; }
  if(umur <= 0) { showToast('⚠️ Umur tidak valid!'); return; }

  _bwSession = { entries: [], kandang, umur, sample };
  document.getElementById('bw-step-select').style.display = 'none';
  document.getElementById('bw-step-input').style.display = '';
  document.getElementById('bw-step-review').style.display = 'none';
  document.getElementById('bw-session-title').textContent = `Kandang ${kandang} - Minggu ${umur}`;
  document.getElementById('bw-info-count').textContent = 'Jumlah Data: 0 Ekor';
  document.getElementById('bw-info-kapasitas').textContent = `Sample: ${sample}`;
  document.getElementById('bw-entries-tbody').innerHTML = '';
  document.getElementById('bw-entry-count').textContent = '0 ekor';
  document.getElementById('bw-berat-input').value = '';
  setTimeout(() => document.getElementById('bw-berat-input').focus(), 200);
}

function addBwEntry() {
  const inp = document.getElementById('bw-berat-input');
  const berat = parseInt(inp.value);
  if(!berat || berat < 100 || berat > 5000) { showToast('⚠️ Berat harus 100-5000 gram!'); return; }
  _bwSession.entries.push(berat);
  inp.value = '';
  inp.focus();
  renderBwTable();
}

function editBwEntry(idx) {
  const newVal = prompt('Edit berat (gram):', _bwSession.entries[idx]);
  if(newVal === null) return;
  const v = parseInt(newVal);
  if(!v || v < 100 || v > 5000) { showToast('⚠️ Berat harus 100-5000 gram!'); return; }
  _bwSession.entries[idx] = v;
  renderBwTable();
}

function deleteBwEntry(idx) {
  _bwSession.entries.splice(idx, 1);
  renderBwTable();
}

function renderBwTable() {
  const tbody = document.getElementById('bw-entries-tbody');
  const entries = _bwSession.entries;
  tbody.innerHTML = entries.map((b, i) =>
    `<tr><td>${i+1}</td><td style="font-weight:700">${b.toLocaleString('id-ID')}</td><td><span style="color:#2563eb;cursor:pointer;font-size:.75rem;margin-right:8px" onclick="editBwEntry(${i})">Edit</span><span style="color:#dc2626;cursor:pointer;font-size:.75rem" onclick="deleteBwEntry(${i})">Hapus</span></td></tr>`
  ).reverse().join('');
  document.getElementById('bw-entry-count').textContent = entries.length + ' ekor';
  document.getElementById('bw-info-count').textContent = `Jumlah Data: ${entries.length} Ekor`;
}

function cancelBwSession() {
  if(_bwSession.entries.length && !confirm('Batalkan sesi? Data akan hilang.')) return;
  _bwSession = { entries: [], kandang: '', umur: 0, sample: 30 };
  document.getElementById('bw-step-input').style.display = 'none';
  document.getElementById('bw-step-select').style.display = '';
}


// ── Review & Save ──
function calcBwStats(entries) {
  const n = entries.length;
  const mean = Math.round(entries.reduce((s,v) => s+v, 0) / n);
  const stdDev = Math.sqrt(entries.reduce((s,v) => s + Math.pow(v-mean, 2), 0) / n);
  const cv = (stdDev / mean) * 100;
  const zonaMin = Math.round(mean * 0.9);
  const zonaMax = Math.round(mean * 1.1);
  const uniform = entries.filter(v => v >= zonaMin && v <= zonaMax).length;
  const uniformity = (uniform / n) * 100;
  return { n, mean, stdDev: Math.round(stdDev), cv, uniformity, min: Math.min(...entries), max: Math.max(...entries), zonaMin, zonaMax };
}

function reviewBwSession() {
  const entries = _bwSession.entries;
  if(entries.length < 5) { showToast('⚠️ Minimal 5 ekor untuk analisa valid!'); return; }
  const stats = calcBwStats(entries);

  document.getElementById('bw-step-input').style.display = 'none';
  document.getElementById('bw-step-review').style.display = '';

  const uniColor = stats.uniformity >= 85 ? '#16a34a' : stats.uniformity >= 75 ? '#d97706' : '#dc2626';
  const cvColor = stats.cv <= 8 ? '#16a34a' : stats.cv <= 12 ? '#d97706' : '#dc2626';

  document.getElementById('bw-review-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="padding:14px;background:#f0fdf4;border-radius:10px"><div style="font-size:.7rem;color:#888">Total Ekor</div><div style="font-size:1.4rem;font-weight:800">${stats.n}</div></div>
      <div style="padding:14px;background:#f0fdf4;border-radius:10px"><div style="font-size:.7rem;color:#888">Rata-rata Berat</div><div style="font-size:1.4rem;font-weight:800">${stats.mean} gr</div></div>
      <div style="padding:14px;background:#fefce8;border-radius:10px"><div style="font-size:.7rem;color:#888">Keseragaman</div><div style="font-size:1.4rem;font-weight:800;color:${uniColor}">${stats.uniformity.toFixed(2)}%</div></div>
      <div style="padding:14px;background:#fefce8;border-radius:10px"><div style="font-size:.7rem;color:#888">CV</div><div style="font-size:1.4rem;font-weight:800;color:${cvColor}">${stats.cv.toFixed(2)}%</div></div>
      <div style="padding:14px;background:#f8fafc;border-radius:10px"><div style="font-size:.7rem;color:#888">Berat Min</div><div style="font-size:1.1rem;font-weight:700">${stats.min} gr</div></div>
      <div style="padding:14px;background:#f8fafc;border-radius:10px"><div style="font-size:.7rem;color:#888">Berat Max</div><div style="font-size:1.1rem;font-weight:700">${stats.max} gr</div></div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-size:.78rem;font-weight:600;margin-bottom:6px">🎯 Zona Keseragaman (±10% dari rata-rata)</div>
      <div style="font-size:.75rem;color:#555;margin-bottom:4px">● Dalam zona: ${stats.zonaMin} – ${stats.zonaMax} gr</div>
      <div style="background:#e2e8f0;border-radius:20px;height:20px;position:relative;overflow:hidden">
        <div style="background:linear-gradient(90deg,#16a34a,#22c55e);height:100%;width:${Math.min(stats.uniformity,100)}%;border-radius:20px"></div>
        <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:.7rem;font-weight:700">${stats.uniformity.toFixed(1)}%</span>
      </div>
      <div style="font-size:.72rem;color:${uniColor};margin-top:4px;font-weight:600">${stats.uniformity>=85?'✅ Keseragaman Baik':stats.uniformity>=75?'⚠️ Keseragaman Cukup':'❌ Keseragaman Kurang'}</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn-secondary" onclick="backToInput()" style="flex:1;padding:12px">← Kembali Edit</button>
      <button class="btn-primary" onclick="saveBwSession()" style="flex:1;padding:12px">Simpan ✓</button>
    </div>`;
}

function backToInput() {
  document.getElementById('bw-step-review').style.display = 'none';
  document.getElementById('bw-step-input').style.display = '';
}

async function saveBwSession() {
  const entries = _bwSession.entries;
  const stats = calcBwStats(entries);
  if(typeof SB === 'undefined') { showToast('❌ Database belum terhubung!'); return; }
  showToast('⏳ Menyimpan...');
  try {
    const sessionId = crypto.randomUUID();
    await SB.insert(TB.sessions_bw, { id: sessionId, kandang: _bwSession.kandang, umur_mg: _bwSession.umur, jumlah_sample: stats.n, rata_rata: stats.mean, uniformity: Math.round(stats.uniformity*10)/10, cv: Math.round(stats.cv*10)/10, created_by: currentUser?.username||'' });
    const rows = entries.map((berat, i) => ({ id: crypto.randomUUID(), session_id: sessionId, nomor: i+1, berat }));
    await SB.insert(TB.timbang, rows);
    showToast(`✅ Disimpan! Rata-rata: ${stats.mean}g, Uniformity: ${stats.uniformity.toFixed(1)}%`);
    _bwSession = { entries: [], kandang: '', umur: 0, sample: 30 };
    document.getElementById('bw-step-review').style.display = 'none';
    document.getElementById('bw-step-select').style.display = '';
  } catch(e) { showToast('❌ Gagal: ' + e.message); }
}


// ── Sebaran ──
async function initBwSebaran() {
  const list = cache.get('kandang_list') || await dbGetKandang();
  const sel = document.getElementById('bw-seb-kandang');
  if(!sel) return;
  sel.innerHTML = '';
  list.filter(k=>k.status==='Aktif').forEach(k => {
    const o = document.createElement('option'); o.value = k.nama; o.textContent = k.nama;
    sel.appendChild(o);
  });
  loadBwSesiList();
}

async function loadBwSesiList() {
  const kandang = document.getElementById('bw-seb-kandang')?.value;
  const sel = document.getElementById('bw-seb-sesi');
  if(!sel||!kandang) return;
  if(typeof SB === 'undefined') return;
  sel.innerHTML = '<option value="">-- Pilih Sesi --</option>';
  try {
    const rows = await SB.select(TB.sessions_bw, `?kandang=eq.${encodeURIComponent(kandang)}&order=created_at.desc&limit=20`);
    (rows||[]).forEach(r => {
      const o = document.createElement('option'); o.value = r.id;
      o.textContent = `Minggu ${r.umur_mg} — ${new Date(r.created_at).toLocaleDateString('id-ID')}`;
      sel.appendChild(o);
    });
  } catch(e) {}
}

function setBwInterval(val) {
  _bwInterval = val;
  document.querySelectorAll('#bwtab-content-sebaran .tab-btn').forEach(b => b.classList.remove('active'));
  if(event && event.target) event.target.classList.add('active');
  renderBwSebaran();
}

async function renderBwSebaran() {
  const sessionId = document.getElementById('bw-seb-sesi')?.value;
  const el = document.getElementById('bw-sebaran-content');
  if(!el||!sessionId) { if(el) el.innerHTML='<div style="color:#aaa;text-align:center;padding:20px;font-size:.85rem">Pilih sesi timbang.</div>'; return; }
  if(typeof SB === 'undefined') { el.innerHTML='<div style="color:#dc2626;text-align:center;padding:20px">Database belum terhubung.</div>'; return; }

  try {
    const [sessions, timbangData] = await Promise.all([
      SB.select(TB.sessions_bw, `?id=eq.${sessionId}`),
      SB.select(TB.timbang, `?session_id=eq.${sessionId}&order=nomor.asc`)
    ]);
    const session = sessions?.[0];
    const entries = (timbangData||[]).map(t => t.berat);
    if(!entries.length) { el.innerHTML='<div style="color:#aaa;text-align:center;padding:20px">Tidak ada data.</div>'; return; }

    const stats = calcBwStats(entries);
    const interval = _bwInterval;
    const minBin = Math.floor(stats.min / interval) * interval;
    const maxBin = Math.ceil(stats.max / interval) * interval;
    const bins = [];
    for(let b = minBin; b <= maxBin; b += interval) {
      const count = entries.filter(v => v >= b && v < b + interval).length;
      bins.push({ range: `${b}–${b+interval}`, count, pct: ((count/stats.n)*100).toFixed(1) });
    }
    const maxCount = Math.max(...bins.map(b=>b.count));
    const uniColor = stats.uniformity >= 85 ? '#16a34a' : stats.uniformity >= 75 ? '#d97706' : '#dc2626';

    el.innerHTML = `
      <div style="background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:14px;font-size:.78rem">
        <span>🐔 <strong>${esc(session.kandang)}</strong> — Minggu ${session.umur_mg}</span> · 
        <span>📅 ${new Date(session.created_at).toLocaleDateString('id-ID')}</span> · 
        <span>👤 ${esc(session.created_by||'—')}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px">
        <div style="padding:10px;background:#f8fafc;border-radius:8px"><div style="font-size:.65rem;color:#888">Total Ekor</div><div style="font-size:1.1rem;font-weight:800">${stats.n} ekor</div></div>
        <div style="padding:10px;background:#f8fafc;border-radius:8px"><div style="font-size:.65rem;color:#888">Rata-rata</div><div style="font-size:1.1rem;font-weight:800">${stats.mean} gr</div></div>
        <div style="padding:10px;background:#f8fafc;border-radius:8px"><div style="font-size:.65rem;color:#888">Keseragaman</div><div style="font-size:1.1rem;font-weight:800;color:${uniColor}">${stats.uniformity.toFixed(1)}%</div></div>
        <div style="padding:10px;background:#f8fafc;border-radius:8px"><div style="font-size:.65rem;color:#888">CV</div><div style="font-size:1.1rem;font-weight:800">${stats.cv.toFixed(1)}%</div></div>
        <div style="padding:10px;background:#f8fafc;border-radius:8px"><div style="font-size:.65rem;color:#888">Berat Min</div><div style="font-size:1.1rem;font-weight:700">${stats.min} gr</div></div>
        <div style="padding:10px;background:#f8fafc;border-radius:8px"><div style="font-size:.65rem;color:#888">Berat Max</div><div style="font-size:1.1rem;font-weight:700">${stats.max} gr</div></div>
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:.78rem;font-weight:600;margin-bottom:4px">🎯 Zona Keseragaman (±10% dari rata-rata)</div>
        <div style="font-size:.72rem;color:#555">● Dalam zona: ${stats.zonaMin} – ${stats.zonaMax} gr</div>
        <div style="background:#e2e8f0;border-radius:20px;height:18px;position:relative;overflow:hidden;margin-top:4px">
          <div style="background:linear-gradient(90deg,#16a34a,#22c55e);height:100%;width:${Math.min(stats.uniformity,100)}%;border-radius:20px"></div>
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:.65rem;font-weight:700">${stats.uniformity.toFixed(1)}%</span>
        </div>
        <div style="font-size:.7rem;color:${uniColor};margin-top:3px;font-weight:600">${stats.uniformity>=85?'✅ Keseragaman Baik':stats.uniformity>=75?'⚠️ Keseragaman Cukup':'❌ Keseragaman Kurang'}</div>
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:.78rem;font-weight:600;margin-bottom:8px">📊 Distribusi Berat (interval ${interval} gr)</div>
        <div style="max-height:220px;overflow-y:auto">
          ${bins.map(b => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-size:.72rem">
            <span style="width:70px;text-align:right;color:#555">${b.range}</span>
            <div style="flex:1;background:#e2e8f0;border-radius:4px;height:14px;overflow:hidden"><div style="background:${b.count>0?'#2d6a4f':'transparent'};height:100%;width:${maxCount?(b.count/maxCount*100):0}%"></div></div>
            <span style="width:25px;font-weight:600">${b.count}</span>
            <span style="width:35px;color:#888">${b.pct}%</span>
          </div>`).join('')}
        </div>
      </div>`;
  } catch(e) { el.innerHTML=`<div style="color:#dc2626;text-align:center;padding:20px">Error: ${e.message}</div>`; }
}

// ── Dashboard ──
async function renderBwDashboard() {
  const el = document.getElementById('bw-dashboard-content');
  if(!el) return;
  if(typeof SB === 'undefined') { el.innerHTML='<div style="color:#dc2626;text-align:center;padding:20px">⚠️ Database belum terhubung. Pastikan mode Supabase aktif.</div>'; return; }
  try {
    const sessions = await SB.select(TB.sessions_bw, '?select=*&order=created_at.desc&limit=100');
    if(!sessions||!sessions.length) { el.innerHTML='<div style="color:#aaa;text-align:center;padding:40px;font-size:.85rem">Belum ada data timbang.</div>'; return; }

    const totalSesi = sessions.length;
    const kandangSet = new Set(sessions.map(s=>s.kandang));
    const totalAyam = sessions.reduce((s,r) => s+(r.jumlah_sample||0), 0);
    const byUmur = {};
    sessions.forEach(r => { if(!byUmur[r.umur_mg]||new Date(r.created_at)>new Date(byUmur[r.umur_mg].created_at)) byUmur[r.umur_mg]=r; });
    const sortedUmur = Object.keys(byUmur).sort((a,b)=>a-b);

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        <div style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border-radius:10px;padding:14px;text-align:center"><div style="font-size:.65rem;opacity:.8">Total Sesi</div><div style="font-size:1.4rem;font-weight:800">${totalSesi}</div></div>
        <div style="background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;border-radius:10px;padding:14px;text-align:center"><div style="font-size:.65rem;opacity:.8">Kandang Aktif</div><div style="font-size:1.4rem;font-weight:800">${kandangSet.size}</div></div>
        <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border-radius:10px;padding:14px;text-align:center"><div style="font-size:.65rem;opacity:.8">Total Ditimbang</div><div style="font-size:1.4rem;font-weight:800">${totalAyam.toLocaleString('id-ID')}</div></div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><div class="num">📈</div><h2>Tren Rata-rata Berat per Minggu</h2></div>
        <div class="card-body"><div class="chart-wrap"><canvas id="chart-bw-trend"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="num">📋</div><h2>Ringkasan per Sesi</h2></div>
        <div class="card-body"><div style="overflow-x:auto">
          <table class="tbl" style="font-size:.78rem">
            <thead><tr><th>Tanggal</th><th>Kandang</th><th>Umur</th><th>Ekor</th><th>Rata-rata</th><th>Uniformity</th><th>CV</th><th></th></tr></thead>
            <tbody>${sessions.slice(0,20).map(r=>`<tr><td>${new Date(r.created_at).toLocaleDateString('id-ID')}</td><td>${esc(r.kandang)}</td><td>${r.umur_mg} mg</td><td>${r.jumlah_sample}</td><td style="font-weight:700">${r.rata_rata} g</td><td class="${r.uniformity>=85?'val-good':r.uniformity>=75?'val-warn':'val-bad'}">${r.uniformity}%</td><td>${r.cv}%</td><td><button class="btn-del" onclick="deleteBwSession('${r.id}')">🗑</button></td></tr>`).join('')}</tbody>
          </table>
        </div></div>
      </div>`;

    // Chart
    if(typeof Chart!=='undefined'&&sortedUmur.length>1) {
      const ctx=document.getElementById('chart-bw-trend');
      if(window._chartBwTrend) window._chartBwTrend.destroy();
      window._chartBwTrend=new Chart(ctx,{type:'line',data:{labels:sortedUmur.map(u=>'Minggu '+u),datasets:[{label:'Rata-rata (gr)',data:sortedUmur.map(u=>byUmur[u].rata_rata),borderColor:'#2d6a4f',backgroundColor:'rgba(45,106,79,.1)',fill:true,tension:0.3,pointRadius:5}]},options:{responsive:true,plugins:{legend:{display:true}},scales:{y:{beginAtZero:false}}}});
    }
  } catch(e) { el.innerHTML=`<div style="color:#dc2626;text-align:center;padding:20px">Error: ${e.message}</div>`; }
}

async function deleteBwSession(id) {
  if(!confirm('Hapus data timbang ini?')) return;
  if(typeof SB === 'undefined') { showToast('❌ Database belum terhubung!'); return; }
  try {
    await SB.delete(TB.timbang, `?session_id=eq.${id}`);
    await SB.delete(TB.sessions_bw, `?id=eq.${id}`);
    renderBwDashboard();
    showToast('🗑 Data dihapus.');
  } catch(e) { showToast('❌ Gagal: '+e.message); }
}

// Enter key shortcut
document.addEventListener('keydown', function(e) {
  if(e.key==='Enter'&&document.activeElement?.id==='bw-berat-input') { e.preventDefault(); addBwEntry(); }
});
