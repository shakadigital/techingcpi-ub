// ═══ MODULE: utils.js ═══
// Helper functions: closeModal, showToast, esc, fmtTgl, fmtTglWaktu, fmtTglPanjang,
// exportToCSV, todayISO, yesterdayISO, downloadCSV, exportExcel, exportPDF

function closeModal(id){document.getElementById(id).style.display='none';}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── Format tanggal & waktu lokal Indonesia ──
function fmtTgl(iso){
  if(!iso||iso==='—')return'—';
  try{const d=new Date(iso.length===10?iso+'T00:00:00':iso);return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}
  catch{return iso;}
}
function fmtTglWaktu(iso){
  if(!iso)return'—';
  try{const d=new Date(iso);return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})+', '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});}
  catch{return iso;}
}
function fmtTglPanjang(iso){
  if(!iso)return'—';
  try{const d=new Date(iso.length===10?iso+'T00:00:00':iso);return d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
  catch{return iso;}
}

// ── Export to CSV ──
function exportToCSV(data, filename) {
  if(!data || !data.length) {
    showToast('⚠️ Tidak ada data untuk diexport!');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
          ? `"${escaped}"` 
          : escaped;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function todayISO(){return new Date().toISOString().split('T')[0];}
function yesterdayISO(){const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().split('T')[0];}

// ═══ LAZY LOADING CDN LIBRARIES ═══
// Load library hanya saat dibutuhkan, cache setelah load pertama
const _libCache = {};
const LIB_URLS = {
  chartjs: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  jspdfAutotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'
};

function loadLib(name) {
  if(_libCache[name]) return _libCache[name];
  const url = LIB_URLS[name];
  if(!url) return Promise.reject(new Error('Unknown lib: ' + name));
  _libCache[name] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + name));
    document.head.appendChild(s);
  });
  return _libCache[name];
}

// Load Chart.js (untuk grafik & laporan)
async function ensureChartJS() {
  if(typeof Chart !== 'undefined') return;
  await loadLib('chartjs');
}

// Load XLSX (untuk export Excel)
async function ensureXLSX() {
  if(typeof XLSX !== 'undefined') return;
  await loadLib('xlsx');
}

// Load jsPDF (untuk export PDF)
async function ensureJsPDF() {
  if(typeof jspdf !== 'undefined') return;
  await loadLib('jspdf');
  await loadLib('jspdfAutotable');
}

// ── Hash password dengan SHA-256 (Web Crypto API) ──
async function hashPassword(password) {
  if (!password) return '';
  // Jika password sudah berupa hash SHA-256 (64 karakter heksadesimal), langsung kembalikan
  if (/^[a-f0-9]{64}$/i.test(password)) return password;
  
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
