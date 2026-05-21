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
