// ═══ MODULE: laporan ═══

// ═══ LAPORAN ═══
let currentLTab='rekap';
function switchLTab(tab){
  currentLTab=tab;
  ['rekap','labarugi','kemitraan','grafik','fcr'].forEach(t=>{
    const tabEl=document.getElementById('ltab-'+t);
    const contentEl=document.getElementById('ltab-content-'+t);
    if(tabEl) tabEl.classList.toggle('active',t===tab);
    if(contentEl) contentEl.style.display=t===tab?'block':'none';
  });
  if(tab==='kemitraan') initRekapKemitraan();
  else renderLaporan();
}

// ═══ HARGA PASAR HARIAN ═══
async function dbGetHargaPasar() {
  try {
    const rec = await _getByKey('app_config', 'harga_pasar');
    return (rec && rec.value) ? rec.value : {};
  } catch {
    try { return JSON.parse(localStorage.getItem('harga_pasar') || '{}'); } catch { return {}; }
  }
}

async function dbSaveHargaPasarData(data) {
  try {
    await dbUpsert('app_config', { key: 'harga_pasar', value: data, updated_at: new Date().toISOString() });
  } catch {
    localStorage.setItem('harga_pasar', JSON.stringify(data));
  }
}

async function getHargaPasarTanggal(tgl) {
  const data = await dbGetHargaPasar();
  return data[tgl] || 0;
}

async function initHargaPasarUI() {
  const today = new Date().toISOString().split('T')[0];
  const tglEl = document.getElementById('hp-tanggal');
  if (tglEl && !tglEl.value) tglEl.value = today;
  await loadHargaPasarUI();
}

async function loadHargaPasarUI() {
  const tgl = document.getElementById('hp-tanggal')?.value;
  if (!tgl) return;
  const data = await dbGetHargaPasar();
  const harga = data[tgl] || 0;
  document.getElementById('hp-harga').value = harga || '';
  // Badge tersimpan
  const badge = document.getElementById('hp-saved-badge');
  if (badge) badge.style.display = harga > 0 ? '' : 'none';
  // Riwayat 5 hari terakhir
  const riwEl = document.getElementById('hp-riwayat');
  if (riwEl) {
    const entries = Object.entries(data).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 5);
    if (entries.length) {
      riwEl.innerHTML = '5 hari terakhir: ' + entries.map(([t, h]) =>
        `<span style="margin-right:8px"><strong>${fmtTgl(t)}</strong> Rp ${parseFloat(h).toLocaleString('id-ID')}/kg</span>`
      ).join('');
    } else {
      riwEl.textContent = 'Belum ada data harga pasar.';
    }
  }
}

async function saveHargaPasar() {
  const tgl = document.getElementById('hp-tanggal').value;
  const harga = parseFloat(document.getElementById('hp-harga').value) || 0;
  if (!tgl) { showToast('⚠️ Pilih tanggal!'); return; }
  if (harga <= 0) { showToast('⚠️ Masukkan harga yang valid!'); return; }
  const data = await dbGetHargaPasar();
  data[tgl] = harga;
  await dbSaveHargaPasarData(data);
  await loadHargaPasarUI();
  showToast('✅ Harga pasar ' + fmtTgl(tgl) + ' disimpan: Rp ' + harga.toLocaleString('id-ID') + '/kg');
  // Refresh home jika sedang di home
  const activePage = document.querySelector('.page.active');
  if (activePage && activePage.id === 'page-home') renderHome();
}

async function populateLaporanKandang(){
  const list=cache.get('kandang_list')||await dbGetKandang();
  // Populate semua select kandang di halaman laporan
  // Populate select kandang di halaman laporan
  ['l-kandang'].forEach(id=>{
    const sel=document.getElementById(id);
    if(!sel)return;
    const prev=sel.value;
    sel.innerHTML='<option value="">Semua Kandang</option>';
    list.forEach(k=>{const o=document.createElement('option');o.value=k.nama;o.textContent=k.nama;sel.appendChild(o);});
    if(prev)sel.value=prev;
  });
  document.getElementById('l-periode').onchange=function(){
    const show=this.value==='custom';
    document.getElementById('l-dari').style.display=show?'':'none';
    document.getElementById('l-sampai').style.display=show?'':'none';
  };
  const fcrPeriodeEl=document.getElementById('fcr-periode');
  if(fcrPeriodeEl) fcrPeriodeEl.onchange=function(){
    const show=this.value==='custom';
    document.getElementById('fcr-dari').style.display=show?'':'none';
    document.getElementById('fcr-sampai').style.display=show?'':'none';
  };
}

function getLaporanRange(){
  const p=document.getElementById('l-periode').value;
  const now=new Date();
  let dari,sampai=now.toISOString().split('T')[0];
  if(p==='bulan'){
    dari=now.getFullYear()+'-'+(String(now.getMonth()+1).padStart(2,'0'))+'-01';
  } else if(!isNaN(p)) {
    const d=new Date(now); d.setDate(d.getDate() - (parseInt(p)-1));
    dari=d.toISOString().split('T')[0];
  } else {
    dari=document.getElementById('l-dari').value||sampai;
    sampai=document.getElementById('l-sampai').value||sampai;
  }
  return{dari,sampai,kandang:document.getElementById('l-kandang').value};
}

function renderLaporan(){
  if(currentLTab==='rekap')renderLapRekap();
  else if(currentLTab==='labarugi')renderLapLabaRugi();
  else if(currentLTab==='grafik')renderGrafik();
  else if(currentLTab==='fcr')renderFCR();
}

async function renderLapRekap(){
  const{dari,sampai,kandang}=getLaporanRange();

  // Update title
  const titleName = document.getElementById('lap-kandang-name');
  if(titleName) titleName.textContent = kandang ? `(${kandang})` : '';

  // Ambil data untuk hitung kumulatif
  const allRowsRaw = await dbGetInput(kandang ? {kandang} : {});
  // Urutkan dari terlama ke terbaru untuk hitung kumulatif deplesi
  const sortedRows = allRowsRaw.sort((a,b) => a.tanggal.localeCompare(b.tanggal));
  
  const kandangList = cache.get('kandang_list') || await dbGetKandang();
  const currentSisaMap = {};
  kandangList.forEach(k => { currentSisaMap[k.nama] = parseInt(k.populasi) || 0; });

  // Buat map kandang untuk lookup chickin & umur_masuk
  const kandangMap = {};
  kandangList.forEach(k => { kandangMap[k.nama] = k; });

  // Hitung sisa ayam secara kumulatif berdasarkan urutan tanggal
  const processedRows = sortedRows.map(row => {
    const d = { ...row.data };
    const kName = row.kandang;
    const depTotal = parseInt(d.deplesi?.total || 0);
    
    const prevSisa = currentSisaMap[kName] || 0;
    const newSisa = Math.max(0, prevSisa - depTotal);
    currentSisaMap[kName] = newSisa;
    
    d.sisa_ayam_calc = newSisa;
    d._kandang_nama = kName; // simpan nama kandang untuk lookup umur
    return d;
  }).filter(Boolean);

  // Filter sesuai range tanggal & balik urutan (terbaru di atas)
  const rows = processedRows.filter(d => {
    if(dari && d.tanggal < dari) return false;
    if(sampai && d.tanggal > sampai) return false;
    return true;
  }).reverse();

  const totalProd=rows.reduce((s,d)=>s+(parseInt(d.produksi?d.produksi.total.butir:0)||0),0);
  const totalKilo=rows.reduce((s,d)=>s+(parseFloat(d.produksi?d.produksi.total.kilo:0)||0),0);
  const totalDep=rows.reduce((s,d)=>s+(parseInt(d.deplesi?d.deplesi.total:0)||0),0);
  const totalPakan=rows.reduce((s,d)=>s+((d.pakan||[]).reduce((ss,p)=>ss+(parseFloat(p.jumlah)||0),0)),0);
  const avgHDP=rows.length?rows.reduce((s,d)=>s+(parseFloat(d.produksi?d.produksi.hdp:0)||0),0)/rows.length:0;

  document.getElementById('lap-summary').innerHTML=
    sumCard('📅 Hari Data','green',rows.length+' hari')+
    sumCard('🥚 Total Produksi','blue',totalProd.toLocaleString('id-ID')+' butir')+
    sumCard('⚖️ Total Berat','blue',totalKilo.toFixed(1)+' kg')+
    sumCard('📉 Avg HDP','orange',avgHDP.toFixed(1)+'%')+
    sumCard('💀 Total Deplesi','red',totalDep+' ekor')+
    sumCard('🌾 Total Pakan','orange',totalPakan.toFixed(1)+' kg');

  const tbody=document.getElementById('lap-rekap-tbody');
  const empty=document.getElementById('lap-rekap-empty');
  tbody.innerHTML='';
  if(!rows.length){empty.style.display='block';return;}
  empty.style.display='none';

  // Limit tampilan default 14 baris terbaru, scroll untuk data lama
  const tableWrapper = tbody.closest('.overflow-x-auto') || tbody.closest('div[style*="overflow"]') || tbody.parentElement.parentElement;
  if(tableWrapper){
    tableWrapper.style.maxHeight = '520px';
    tableWrapper.style.overflowY = 'auto';
  }

  rows.forEach(d=>{
    const pakanKg = (d.pakan||[]).reduce((s,p)=>s+(parseFloat(p.jumlah)||0),0);
    const sisaAyam = d.sisa_ayam_calc;
    const fi = sisaAyam > 0 ? (pakanKg * 1000 / sisaAyam) : 0;
    
    const prodButir = parseInt(d.produksi?.total?.butir)||0;
    const prodKg = parseFloat(d.produksi?.total?.kilo)||0;
    const ew = prodButir > 0 ? (prodKg * 1000 / prodButir) : 0;

    // Bersihkan HDP dari % ganda jika sudah ada
    let hdp = d.produksi?.hdp || '—';
    if(typeof hdp === 'string' && hdp.includes('%')) hdp = hdp.replace('%', '').trim();

    // Hitung umur ayam pada tanggal tersebut
    let umurLabel = '—';
    const kData = kandangMap[d._kandang_nama];
    if(kData?.chickin){
      const tglRow = new Date(d.tanggal); tglRow.setHours(0,0,0,0);
      const cin = new Date(kData.chickin); cin.setHours(0,0,0,0);
      const hariSejak = Math.floor((tglRow - cin) / 86400000);
      if(hariSejak >= 0){
        const totalHari = (parseInt(kData.umur_masuk)||0) + hariSejak;
        const mg = Math.floor(totalHari / 7);
        const hr = totalHari % 7;
        umurLabel = mg + 'mg' + (hr > 0 ? ' ' + hr + 'hr' : '');
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="white-space:nowrap;color:#2d6a4f;font-weight:600;font-size:.82rem">${umurLabel}</td>
      <td>${fmtTgl(d.tanggal)}</td>
      <td>${d.deplesi?d.deplesi.total:0}</td>
      <td>${sisaAyam}</td>
      <td>${pakanKg.toFixed(1)}</td>
      <td>${fi.toFixed(1)}</td>
      <td>${prodButir}</td>
      <td>${prodKg.toFixed(1)}</td>
      <td>${hdp}${hdp !== '—' ? '%' : ''}</td>
      <td>${ew.toFixed(1)}</td>`;
    tbody.appendChild(tr);
  });

  // Tambahkan baris TOTAL di bawah
  const sumSisaAyam = rows.reduce((s,d)=>s+(d.sisa_ayam_calc||0),0);
  const avgFI = sumSisaAyam > 0 ? (totalPakan * 1000 / sumSisaAyam) : 0;
  const avgEW = totalProd > 0 ? (totalKilo * 1000 / totalProd) : 0;
  
  const trTotal = document.createElement('tr');
  trTotal.style.background = '#e2e8f0';
  trTotal.style.fontWeight = 'bold';
  trTotal.style.position = 'sticky';
  trTotal.style.bottom = '0';
  trTotal.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.05)';
  trTotal.innerHTML = `
    <td colspan="2" style="text-align:center">TOTAL / RATA-RATA</td>
    <td>${totalDep}</td>
    <td>—</td>
    <td>${totalPakan.toFixed(1)}</td>
    <td>${avgFI.toFixed(1)}</td>
    <td>${totalProd}</td>
    <td>${totalKilo.toFixed(1)}</td>
    <td>${avgHDP.toFixed(2)}%</td>
    <td>${avgEW.toFixed(1)}</td>
  `;
  tbody.appendChild(trTotal);

  // Scroll ke atas (data terbaru) setelah render
  if(tableWrapper) tableWrapper.scrollTop = 0;
}

async function renderLapLabaRugi(){
  const{dari,sampai,kandang}=getLaporanRange();
  const pendMap={};
  const juals=await dbGetPenjualan({dari,sampai});
  juals.forEach(rec=>{pendMap[rec.tanggal]=(pendMap[rec.tanggal]||0)+(parseInt(rec.grand_total)||0);});

  // Ambil kiriman pakan untuk tagihan belum bayar
  const semuaKiriman=await dbGetKiriman({});

  const biayaMap={},opsMap={};
  
  // Hitung biaya pakan menggunakan FIFO dari server
  const fifoBiaya = await dbGetFifoBiayaPakan(dari, sampai, kandang);
  fifoBiaya.forEach(f => {
    biayaMap[f.tanggal] = (biayaMap[f.tanggal] || 0) + parseFloat(f.biaya_pakan || 0);
  });

  // Hitung biaya operasional dari tabel kas_operasional
  const semuaKas = await dbGetKas({dari, sampai});
  semuaKas.forEach(k => {
    if(k.jenis === 'keluar') {
      if(!kandang || k.kandang === kandang || !k.kandang) {
        opsMap[k.tanggal] = (opsMap[k.tanggal]||0) + parseFloat(k.jumlah||0);
      }
    }
  });

  const allInputs=await dbGetInput({dari,sampai,kandang});

  // Hitung total pembayaran real (yang sudah dibayar)
  const semuaBayar=await dbGetPembayaran({dari,sampai});
  const totalBayarReal=semuaBayar.reduce((s,b)=>s+(parseFloat(b.jumlah_bayar)||0),0);
  const totalTagihanBelumBayar=semuaKiriman
    .filter(k=>k.status_bayar!=='lunas')
    .reduce((s,k)=>s+(parseFloat(k.sisa_tagihan)||0),0);

  const allDates=[...new Set([...Object.keys(pendMap),...Object.keys(biayaMap),...Object.keys(opsMap)])].sort().reverse();
  let totalPend=0,totalBiaya=0,totalOps=0;
  const tbody=document.getElementById('lr-tbody');
  const empty=document.getElementById('lr-empty');
  tbody.innerHTML='';
  if(!allDates.length){empty.style.display='block';}
  else{
    empty.style.display='none';
    
    const tableWrapper = tbody.closest('.overflow-x-auto') || tbody.closest('div[style*="overflow"]') || tbody.parentElement.parentElement;
    if(tableWrapper){
      tableWrapper.style.maxHeight = '520px';
      tableWrapper.style.overflowY = 'auto';
    }

    allDates.forEach(tgl=>{
      const pend=pendMap[tgl]||0,biaya=biayaMap[tgl]||0,ops=opsMap[tgl]||0;
      const totalB=biaya+ops,laba=pend-totalB;
      totalPend+=pend;totalBiaya+=biaya;totalOps+=ops;
      const tr=document.createElement('tr');
      tr.innerHTML='<td>'+fmtTgl(tgl)+'</td><td style="color:#1b4332;font-weight:600">Rp '+pend.toLocaleString('id-ID')+'</td><td style="color:#dc2626">Rp '+biaya.toLocaleString('id-ID')+'</td><td style="color:#f59e0b;font-weight:600">Rp '+ops.toLocaleString('id-ID')+'</td><td style="color:#dc2626;font-weight:600">Rp '+totalB.toLocaleString('id-ID')+'</td><td style="font-weight:700;color:'+(laba>=0?'#1b4332':'#dc2626')+'">Rp '+laba.toLocaleString('id-ID')+'</td>';
      tbody.appendChild(tr);
    });

    const totalSemua=totalBiaya+totalOps;
    const totalLaba=totalPend-totalSemua;

    const trTotal = document.createElement('tr');
    trTotal.style.background = '#e2e8f0';
    trTotal.style.fontWeight = 'bold';
    trTotal.style.position = 'sticky';
    trTotal.style.bottom = '0';
    trTotal.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.05)';
    trTotal.innerHTML = `
      <td style="text-align:center">TOTAL</td>
      <td style="color:#1b4332">Rp ${totalPend.toLocaleString('id-ID')}</td>
      <td style="color:#dc2626">Rp ${totalBiaya.toLocaleString('id-ID')}</td>
      <td style="color:#f59e0b">Rp ${totalOps.toLocaleString('id-ID')}</td>
      <td style="color:#dc2626">Rp ${totalSemua.toLocaleString('id-ID')}</td>
      <td style="color:${totalLaba>=0?'#1b4332':'#dc2626'}">Rp ${totalLaba.toLocaleString('id-ID')}</td>
    `;
    tbody.appendChild(trTotal);

    if(tableWrapper) tableWrapper.scrollTop = 0;
  }

  const totalSemua=totalBiaya+totalOps;
  const totalLaba=totalPend-totalSemua;
  // Margin real = pendapatan - yang sudah dibayar - ops
  const labaReal=totalPend-totalBayarReal-totalOps;
  document.getElementById('lr-summary').innerHTML=
    sumCard('💵 Total Pendapatan','green','Rp '+totalPend.toLocaleString('id-ID'))+
    sumCard('🌾 Biaya Pakan Terpakai','red','Rp '+totalBiaya.toLocaleString('id-ID'))+
    sumCard('🔧 Biaya Operasional','orange','Rp '+totalOps.toLocaleString('id-ID'))+
    sumCard('💸 Total Biaya','red','Rp '+totalSemua.toLocaleString('id-ID'))+
    sumCard(totalLaba>=0?'📈 Laba (Akrual)':'📉 Rugi (Akrual)',totalLaba>=0?'green':'red','Rp '+Math.abs(totalLaba).toLocaleString('id-ID'))+
    sumCard('📊 Margin Akrual',totalLaba>=0?'blue':'red',totalPend>0?(totalLaba/totalPend*100).toFixed(1)+'%':'—')+
    sumCard('💳 Total Dibayar ke Supplier','blue','Rp '+totalBayarReal.toLocaleString('id-ID'))+
    sumCard('⏳ Sisa Tagihan Belum Bayar','orange','Rp '+totalTagihanBelumBayar.toLocaleString('id-ID'))+
    sumCard(labaReal>=0?'✅ Laba Real (Kas)':'❌ Rugi Real (Kas)',labaReal>=0?'green':'red','Rp '+Math.abs(labaReal).toLocaleString('id-ID'))+
    sumCard('📊 Margin Real (Kas)',labaReal>=0?'blue':'red',totalPend>0?(labaReal/totalPend*100).toFixed(1)+'%':'—');
}

function sumCard(label,color,val){
  return'<div class="sum-card '+color+'"><div class="sl">'+label+'</div><div class="sv">'+val+'</div></div>';
}

async function exportLaporan(format='csv'){
  if(!can('EXPORT_LAP')){showToast('⚠️ Tidak ada akses export laporan!');return;}
  const{dari,sampai,kandang}=getLaporanRange();
  const isSupervisor=currentUser&&currentUser.role==='supervisor';
  const fname='laporan_'+currentLTab+'_'+new Date().toISOString().split('T')[0];
  showToast('⏳ Menyiapkan export...');

  // ── Kumpulkan data ──
  let headers=[], rows=[], title='';

  if(currentLTab==='rekap'){
    title='Laporan Rekap Produksi';
    headers=['Tanggal','Deplesi','Sisa Ayam','Pakan (kg)','Fi (gr)','Prod (butir)','Prod (kg)','HDP (%)','EW (gr)'];
    
    const allRowsRaw = await dbGetInput(kandang ? {kandang} : {});
    const sortedRows = allRowsRaw.sort((a,b) => a.tanggal.localeCompare(b.tanggal));
    const kandangList = cache.get('kandang_list') || await dbGetKandang();
    const currentSisaMap = {};
    kandangList.forEach(k => { currentSisaMap[k.nama] = parseInt(k.populasi) || 0; });

    const processedRows = sortedRows.map(row => {
      const d = { ...row.data };
      const kName = row.kandang;
      const depTotal = parseInt(d.deplesi?.total || 0);
      const prevSisa = currentSisaMap[kName] || 0;
      const newSisa = Math.max(0, prevSisa - depTotal);
      currentSisaMap[kName] = newSisa;
      d.sisa_ayam_calc = newSisa; 
      return d;
    }).filter(d => {
      if(dari && d.tanggal < dari) return false;
      if(sampai && d.tanggal > sampai) return false;
      return true;
    });

    processedRows.forEach(d=>{
      const pakanKg = (d.pakan||[]).reduce((s,p)=>s+(parseFloat(p.jumlah)||0),0);
      const sisaAyam = d.sisa_ayam_calc;
      const fi = sisaAyam > 0 ? (pakanKg * 1000 / sisaAyam) : 0;
      const prodButir = parseInt(d.produksi?.total?.butir)||0;
      const prodKg = parseFloat(d.produksi?.total?.kilo)||0;
      const ew = prodButir > 0 ? (prodKg * 1000 / prodButir) : 0;
      
      let hdp = d.produksi?.hdp || 0;
      if(typeof hdp === 'string') hdp = hdp.replace('%', '').trim();
      
      rows.push([d.tanggal, d.deplesi?.total||0, sisaAyam, pakanKg.toFixed(1), fi.toFixed(1), prodButir, prodKg.toFixed(1), hdp + '%', ew.toFixed(1)]);
    });

  } else if(currentLTab==='labarugi'){
    title='Laporan Laba Rugi';
    const juals=await dbGetPenjualan({dari,sampai});
    const pendMap={};
    juals.forEach(rec=>{pendMap[rec.tanggal]=(pendMap[rec.tanggal]||0)+(parseInt(rec.grand_total)||0);});
    
    const biayaMap={},opsMap={};
    const fifoBiaya = await dbGetFifoBiayaPakan(dari, sampai, kandang);
    fifoBiaya.forEach(f => {
      biayaMap[f.tanggal] = (biayaMap[f.tanggal] || 0) + parseFloat(f.biaya_pakan || 0);
    });

    // Hitung biaya operasional dari tabel kas_operasional
    const semuaKas = await dbGetKas({dari, sampai});
    semuaKas.forEach(k => {
      if(k.jenis === 'keluar') {
        if(!kandang || k.kandang === kandang || !k.kandang) {
          opsMap[k.tanggal] = (opsMap[k.tanggal]||0) + parseFloat(k.jumlah||0);
        }
      }
    });

    const inputs=await dbGetInput({dari,sampai,kandang});
    if(isSupervisor){
      headers=['Tanggal','Penjualan (Rp)','Biaya Pakan (Rp)','Biaya Ops (Rp)'];
      [...new Set([...Object.keys(pendMap),...Object.keys(biayaMap)])].sort().reverse().forEach(tgl=>{
        rows.push([tgl,pendMap[tgl]||0,Math.round(biayaMap[tgl]||0),Math.round(opsMap[tgl]||0)]);
      });
    } else {
      headers=['Tanggal','Pendapatan (Rp)','Biaya Pakan (Rp)','Biaya Ops (Rp)','Total Biaya (Rp)','Laba/Rugi (Rp)'];
      [...new Set([...Object.keys(pendMap),...Object.keys(biayaMap)])].sort().reverse().forEach(tgl=>{
        const p=pendMap[tgl]||0,b=Math.round(biayaMap[tgl]||0),o=Math.round(opsMap[tgl]||0);
        rows.push([tgl,p,b,o,b+o,p-b-o]);
      });
    }
  } else {
    showToast('⚠️ Pilih tab Rekap atau Laba Rugi untuk export.');return;
  }

  if(!rows.length){showToast('⚠️ Tidak ada data untuk di-export.');return;}

  if(format==='csv'){
    const csv=[headers.join(','),...rows.map(r=>r.join(','))].join('\n');
    downloadCSV(csv,fname+'.csv');
  } else if(format==='excel'){
    await exportExcel(title,headers,rows,fname+'.xlsx');
  } else if(format==='pdf'){
    await exportPDF(title,headers,rows,fname+'.pdf',dari,sampai,kandang);
  }
}

async function exportExcel(title, headers, rows, filename){
  await ensureXLSX();
  const wb=XLSX.utils.book_new();
  // Baris judul
  const wsData=[[title],['Diekspor: '+new Date().toLocaleString('id-ID')],[''],[headers],...rows];
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  // Style lebar kolom otomatis
  ws['!cols']=headers.map((_,i)=>({wch:Math.max(headers[i].length,
    ...rows.map(r=>String(r[i]||'').length))+2}));
  // Merge judul
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:headers.length-1}}];
  XLSX.utils.book_append_sheet(wb,ws,'Laporan');
  XLSX.writeFile(wb,filename);
  showToast('✅ Excel berhasil didownload!');
}

async function exportPDF(title, headers, rows, filename, dari, sampai, kandang){
  await ensureJsPDF();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:rows[0]?.length>5?'landscape':'portrait',unit:'mm',format:'a4'});
  // Header
  doc.setFontSize(14);doc.setFont('helvetica','bold');
  doc.text('Teaching cpi-ub',14,15);
  doc.setFontSize(11);doc.setFont('helvetica','normal');
  doc.text(title,14,22);
  doc.setFontSize(9);doc.setTextColor(100);
  doc.text(`Periode: ${dari||'—'} s/d ${sampai||'—'}  |  Kandang: ${kandang||'Semua'}  |  Diekspor: ${new Date().toLocaleString('id-ID')}`,14,28);
  doc.setTextColor(0);
  // Tabel
  doc.autoTable({
    head:[headers],
    body:rows,
    startY:33,
    styles:{fontSize:8,cellPadding:2},
    headStyles:{fillColor:[45,106,79],textColor:255,fontStyle:'bold'},
    alternateRowStyles:{fillColor:[240,253,244]},
    columnStyles:headers.reduce((acc,_,i)=>({...acc,[i]:{halign:i>0?'right':'left'}}),{}),
    didDrawPage:(data)=>{
      // Footer
      doc.setFontSize(7);doc.setTextColor(150);
      doc.text('Teaching cpi-ub — '+new Date().toLocaleDateString('id-ID'),14,doc.internal.pageSize.height-8);
      doc.text('Hal '+data.pageNumber,doc.internal.pageSize.width-20,doc.internal.pageSize.height-8);
    }
  });
  doc.save(filename);
  showToast('✅ PDF berhasil didownload!');
}

function downloadCSV(csv,filename){
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}
