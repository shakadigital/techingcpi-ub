// ═══ MODULE: home ═══

async function renderHome(){
  const list=await dbGetKandang();
  cache.set('kandang_list',list);
  const aktif=list.filter(k=>k.status==='Aktif');
  document.getElementById('hs-kandang').textContent=aktif.length;
  const totalPop=aktif.reduce((s,k)=>s+(parseInt(k.populasi)||0),0);
  document.getElementById('hs-populasi').textContent=totalPop.toLocaleString('id-ID');
  const today=new Date().toISOString().split('T')[0];
  const todayInputs=await dbGetInput({tanggal:today});
  let totalProd=0;
  let totalPakan=0;
  todayInputs.forEach(row=>{
    const d=row.data;
    if(d&&d.produksi)totalProd+=parseInt(d.produksi.total.butir)||0;
    if(d&&d.pakan)d.pakan.forEach(p=>totalPakan+=parseFloat(p.jumlah)||0);
  });
  const juals=await dbGetPenjualan({dari:today,sampai:today});
  const totalJual=juals.reduce((s,j)=>s+(parseInt(j.grand_total)||0),0);
  // Hitung total kilo terjual hari ini untuk % terjual
  let totalKiloJual=0;
  juals.forEach(j=>(j.rows||[]).forEach(r=>{totalKiloJual+=parseFloat(r.kilo)||0;}));
  // Harga pasar dari input manual — fallback ke hari terdekat sebelumnya
  const hargaPasarData=await dbGetHargaPasar();
  let hargaRata=0, hargaPasarTgl=null;
  if(hargaPasarData[today]){
    hargaRata=parseFloat(hargaPasarData[today])||0;
    hargaPasarTgl=today;
  } else {
    const tglLalu=Object.keys(hargaPasarData).filter(t=>t<today).sort().pop();
    if(tglLalu){ hargaRata=parseFloat(hargaPasarData[tglLalu])||0; hargaPasarTgl=tglLalu; }
  }
  const hpEl=document.getElementById('hs-harga-pasar');
  if(hargaRata>0){
    hpEl.textContent='Rp '+hargaRata.toLocaleString('id-ID')+'/kg';
    hpEl.title=hargaPasarTgl===today?'Harga pasar hari ini':'Data dari '+fmtTgl(hargaPasarTgl);
    hpEl.style.opacity=hargaPasarTgl===today?'1':'0.7';
    // Tambah tanda * jika data bukan hari ini
    const labelEl=document.getElementById('hs-harga-pasar-label');
    if(labelEl) labelEl.textContent=hargaPasarTgl===today?'Harga Pasar · % Terjual':'Harga Pasar* · % Terjual';
  } else {
    hpEl.textContent='—';
    hpEl.style.opacity='1';
  }
  // % terjual = kilo terjual / total produksi hari ini (kg)
  let totalProdKilo=0;
  todayInputs.forEach(row=>{const d=row.data;if(d&&d.produksi){['normal','cream','retak'].forEach(g=>{totalProdKilo+=parseFloat(d.produksi[g]?.kilo)||0;});}});
  const pctJual=totalProdKilo>0?Math.min(100,Math.round((totalKiloJual/totalProdKilo)*100)):0;
  document.getElementById('hs-produksi').textContent=totalProd.toLocaleString('id-ID');
  document.getElementById('hs-pakan').textContent=totalPakan%1===0?totalPakan.toLocaleString('id-ID'):totalPakan.toFixed(1);
  document.getElementById('hs-penjualan').textContent='Rp '+totalJual.toLocaleString('id-ID');
  const pctEl=document.getElementById('hs-pct-jual');
  pctEl.textContent=totalKiloJual>0?pctJual+'%':'—';
  pctEl.style.color=pctJual>=80?'#16a34a':pctJual>=50?'#f59e0b':'#dc2626';
  const actEl=document.getElementById('home-activity');
  const recent=await dbGetInput({});
  const last5=recent.slice(0,5);
  if(!last5.length){actEl.innerHTML='<div style="color:#aaa;font-size:.85rem;text-align:center;padding:12px 0">Belum ada data tersimpan.</div>';}
  else{
    actEl.innerHTML='<table class="tbl"><thead><tr><th>Tanggal</th><th>Kandang</th><th>Produksi</th><th>HDP</th></tr></thead><tbody>'+
    last5.map(row=>{const d=row.data;if(!d)return'';return`<tr style="cursor:pointer" onclick="openDailySummaryFor('${d.tanggal}','${esc(d.kandang)}')"><td>${fmtTgl(d.tanggal)}</td><td>${esc(d.kandang)}</td><td>${d.produksi?d.produksi.total.butir+' butir':'—'}</td><td>${d.produksi?d.produksi.hdp:'—'}</td></tr>`;}).join('')+
    '</tbody></table>';
  }
  // Status kandang
  const klEl=document.getElementById('home-kandang-list');
  if(!list.length){klEl.innerHTML='<div style="color:#aaa;font-size:.85rem;text-align:center;padding:12px 0">Belum ada kandang.</div>';}
  else{
    klEl.innerHTML='<table class="tbl"><thead><tr><th>Kandang</th><th>Populasi</th><th>Periode</th><th>Hari ke-</th><th>Status</th></tr></thead><tbody>'+
    list.map(k=>{
      const diff=k.chickin?Math.floor((new Date()-new Date(k.chickin))/86400000)+1:0;
      return'<tr><td><strong>'+esc(k.nama)+'</strong></td><td>'+(k.populasi||0)+' ekor</td><td>'+fmtTgl(k.chickin)+'</td><td>'+(diff>0?diff:'—')+'</td><td>'+(k.status==='Aktif'?'<span class="badge badge-green">Aktif</span>':'<span class="badge badge-gray">Selesai</span>')+'</td></tr>';
    }).join('')+'</tbody></table>';
  }
  // Render daily summary & alerts (async, tidak block render utama)
  renderDailySummary(todayInputs, list);
  renderHomeAlerts();
  renderHargaPasarChart();
}

// ═══ GRAFIK HARGA PASAR DI HOME ═══
async function renderHargaPasarChart() {
  const ctx = document.getElementById('chart-harga-pasar');
  if(!ctx || typeof Chart === 'undefined') return;

  // Ambil 14 hari terakhir harga pasar dari input_harian
  const sampai = new Date().toISOString().split('T')[0];
  const dari = new Date(Date.now() - 14*86400000).toISOString().split('T')[0];
  const inputs = await dbGetInput({dari, sampai});

  // Kumpulkan harga pasar per tanggal
  const hargaMap = {};
  inputs.forEach(r => {
    const hp = parseFloat(r.data?.harga_pasar) || 0;
    if(hp > 0 && !hargaMap[r.tanggal]) hargaMap[r.tanggal] = hp;
  });

  const dates = Object.keys(hargaMap).sort();
  if(dates.length < 2) {
    document.getElementById('home-harga-info').textContent = 'Belum cukup data harga pasar (min. 2 hari)';
    return;
  }

  const labels = dates.map(d => d.slice(5)); // MM-DD
  const data = dates.map(d => hargaMap[d]);
  const lastHarga = data[data.length-1];
  const prevHarga = data[data.length-2];
  const diff = lastHarga - prevHarga;

  document.getElementById('home-harga-info').textContent =
    `Terakhir: Rp ${lastHarga.toLocaleString('id-ID')}/kg ${diff>0?'▲':'▼'} ${Math.abs(diff).toLocaleString('id-ID')}`;

  if(window._chartHargaPasar) window._chartHargaPasar.destroy();
  window._chartHargaPasar = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Harga Pasar (Rp/kg)',
        data,
        borderColor: '#2d6a4f',
        backgroundColor: 'rgba(45,106,79,.1)',
        fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#2d6a4f'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false, ticks: { callback: v => 'Rp '+v.toLocaleString('id-ID') } },
        x: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

// ═══ BUKA DAILY SUMMARY FULLSCREEN PER TANGGAL ═══
async function openDailySummaryFor(tanggal, kandang) {
  const overlay = document.getElementById('fs-summary-overlay');
  const container = document.getElementById('fs-summary-content');
  if(!overlay || !container) return;

  container.innerHTML = '<div style="color:#aaa;text-align:center;padding:40px">⏳ Memuat data...</div>';
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';

  // Temporarily override renderDailySummary to use specific date
  const inputs = await dbGetInput({tanggal, kandang});
  const kList = cache.get('kandang_list') || await dbGetKandang();

  // Set selector ke kandang yang diklik
  const dsSel = document.getElementById('ds-kandang-sel');
  if(dsSel) {
    // Populate jika belum
    if(dsSel.options.length <= 1) {
      dsSel.innerHTML = '<option value="">Semua Kandang</option>';
      kList.filter(k=>k.status==='Aktif').forEach(k=>{
        const o=document.createElement('option');o.value=k.nama;o.textContent=k.nama;dsSel.appendChild(o);
      });
    }
    dsSel.value = kandang;
  }

  // Override tanggal di renderDailySummary
  const origSummary = document.getElementById('daily-summary');
  origSummary.style.display = '';

  // Patch: temporarily set date for renderDailySummary
  window._overrideSummaryDate = tanggal;
  await renderDailySummary(inputs, kList);
  window._overrideSummaryDate = null;

  // Clone ke fullscreen
  container.innerHTML = '';
  const clone = origSummary.cloneNode(true);
  clone.id = 'fs-daily-summary';
  clone.style.display = '';
  clone.querySelectorAll('.btn-capture').forEach(b => b.style.display = 'none');
  container.appendChild(clone);

  // Hide original again
  origSummary.style.display = 'none';
}

// ═══ DAILY PERFORMANCE SUMMARY ═══
async function renderDailySummary(todayInputs, kandangList){
  const today = window._overrideSummaryDate || new Date().toISOString().split('T')[0];
  const kList=kandangList||cache.get('kandang_list')||await dbGetKandang();

  // Populate selector kandang
  const sel=document.getElementById('ds-kandang-sel');
  const selectorWrapper=document.getElementById('ds-kandang-selector');
  const activeKandangList=kList.filter(k=>k.status==='Aktif');
  
  // Tampilkan selector hanya jika ada lebih dari 1 kandang aktif
  if(selectorWrapper){
    if(activeKandangList.length>1){
      selectorWrapper.style.display='flex';
      if(sel&&sel.options.length<=1){
        sel.innerHTML='<option value="">Semua Kandang</option>';
        activeKandangList.forEach(k=>{
          const o=document.createElement('option');o.value=k.nama;o.textContent=k.nama;sel.appendChild(o);
        });
      }
    }else{
      selectorWrapper.style.display='none';
    }
  }
  const selectedKandang=sel?sel.value:'';

  // Tanggal header
  const tglFmt=fmtTglPanjang(today);
  const dsDate=document.getElementById('ds-date');
  if(dsDate)dsDate.textContent=tglFmt;

  // Ambil data hari ini & kemarin
  const inputs=todayInputs||await dbGetInput({tanggal:today});
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const yd=yesterday.toISOString().split('T')[0];
  const yInputs=await dbGetInput({tanggal:yd});

  // Filter per kandang jika dipilih, atau otomatis pilih kandang pertama jika hanya ada 1
  let targetKandang=selectedKandang;
  if(!targetKandang&&activeKandangList.length===1){
    targetKandang=activeKandangList[0].nama;
  }
  const filtered=targetKandang?inputs.filter(r=>r.kandang===targetKandang):inputs;
  const yFiltered=targetKandang?yInputs.filter(r=>r.kandang===targetKandang):yInputs;

  const bodyEl=document.getElementById('ds-body');
  
  // Jika tidak ada data, tetap tampilkan struktur dengan nilai 0/placeholder
  const hasData = filtered.length > 0;

  // ── Agregat hari ini ──
  let totalButir=0,totalKg=0,totalSisa=0,totalDeplesi=0,totalPakanKg=0,totalAirL=0;
  let hdpSum=0,hdpCount=0,ewSum=0,ewCount=0,fiSum=0,fiCount=0,waterMlSum=0,waterCount=0,rasioSum=0,rasioCount=0;

  if(hasData){
    filtered.forEach(r=>{
      const d=r.data;if(!d)return;
      totalButir+=parseInt(d.produksi?.total?.butir)||0;
      totalKg+=parseFloat(d.produksi?.total?.kilo)||0;
      totalSisa+=parseInt(d.sisa_ayam)||0;
      totalDeplesi+=(parseInt(d.deplesi?.mati)||0)+(parseInt(d.deplesi?.afkir)||0);
      const pakanRow=(d.pakan||[]).reduce((s,p)=>s+(parseFloat(p.jumlah)||0),0);
      totalPakanKg+=pakanRow;
      totalAirL+=parseFloat(d.air_liter)||0;
      const hdp=parseFloat(d.produksi?.hdp)||0;
      if(hdp>0){hdpSum+=hdp;hdpCount++;}
      // EW (Egg Weight) = berat rata-rata per butir gram
      const ew=parseFloat(d.produksi?.berat_rata)||0;
      if(ew>0){ewSum+=ew;ewCount++;}
      // FI (Feed Intake) = gr/ekor = (pakan kg * 1000) / sisa ayam
      const sisa=parseInt(d.sisa_ayam)||0;
      if(sisa>0&&pakanRow>0){fiSum+=(pakanRow*1000/sisa);fiCount++;}
      // Water intake ml/ekor
      const airMl=parseFloat(d.air_liter)*1000||0;
      if(sisa>0&&airMl>0){waterMlSum+=(airMl/sisa);waterCount++;}
      // Rasio air:pakan — hitung langsung dari data
      if(pakanRow>0&&parseFloat(d.air_liter)>0){
        rasioSum+=(parseFloat(d.air_liter)/pakanRow);
        rasioCount++;
      }
    });
  }

  // ── Agregat kemarin (untuk trend) ──
  let yDeplesi=0,yHdpSum=0,yHdpCount=0,yTotalSisa=0;
  if(hasData){
    yFiltered.forEach(r=>{
      const d=r.data;if(!d)return;
      yDeplesi+=(parseInt(d.deplesi?.mati)||0)+(parseInt(d.deplesi?.afkir)||0);
      yTotalSisa+=parseInt(d.sisa_ayam)||0;
      const hdp=parseFloat(d.produksi?.hdp)||0;
      if(hdp>0){yHdpSum+=hdp;yHdpCount++;}
    });
  }

  // ── Kalkulasi final ──
  const avgHDP=hdpCount>0?(hdpSum/hdpCount):0;
  const yAvgHDP=yHdpCount>0?(yHdpSum/yHdpCount):0;
  const avgEW=ewCount>0?(ewSum/ewCount):0;
  const avgFI=fiCount>0?(fiSum/fiCount):0;
  const avgWater=waterCount>0?(waterMlSum/waterCount):0;
  const avgRasio=rasioCount>0?(rasioSum/rasioCount):0;

  // Deplesi % hari ini vs kemarin
  const deplesiPct=totalSisa>0?((totalDeplesi/(totalSisa+totalDeplesi))*100):0;
  const yDeplesiPct=yTotalSisa>0?((yDeplesi/(yTotalSisa+yDeplesi))*100):0;

  // FCR = total pakan kg / total telur kg
  const fcr=totalKg>0?(totalPakanKg/totalKg):0;

  // Umur ayam dari kandang - selalu tampilkan berdasarkan kandang yang dipilih
  let umurMinggu='—',umurHari='—',hariKeProd='—';
  // Cari kandang berdasarkan targetKandang, atau kandang pertama dari data, atau kandang aktif pertama
  let refKandangNama = targetKandang || (hasData && filtered[0]?.kandang) || (activeKandangList.length > 0 ? activeKandangList[0].nama : '');
  const refKandang=kList.find(k=>k.nama===refKandangNama);
  
  if(refKandang?.chickin){
    const hariSejak=Math.floor((new Date(today)-new Date(refKandang.chickin))/86400000);
    const umurMasukVal = parseInt(refKandang.umur_masuk) || 0;
    const totalHari=umurMasukVal+hariSejak;
    umurMinggu=Math.floor(totalHari/7)+'w';
    umurHari=(totalHari%7)+'d';
    hariKeProd='Hari ke-'+(hariSejak+1);
  }
  const dsHariKe=document.getElementById('ds-hari-ke');
  if(dsHariKe)dsHariKe.textContent=hariKeProd;

  // ── Helper trend ──
  const trend=(now,prev)=>{
    if(!prev||!now)return'';
    const diff=now-prev;
    if(Math.abs(diff)<0.01)return'<span class="trend-flat">→ sama</span>';
    return diff>0
      ?'<span class="trend-up">▲ +'+(Math.abs(diff).toFixed(2))+'</span>'
      :'<span class="trend-down">▼ '+(Math.abs(diff).toFixed(2))+'</span>';
  };
  const trendHDP=trend(avgHDP,yAvgHDP);
  const trendDeplesi=trend(deplesiPct,yDeplesiPct);

  // ── Rating helpers ──
  const hdpClass=avgHDP>=80?'val-good':avgHDP>=65?'val-warn':'val-bad';
  const fcrClass=fcr>0?(fcr<=2.0?'val-good':fcr<=2.5?'val-warn':'val-bad'):'';
  const deplesiClass=deplesiPct<=0.05?'val-good':deplesiPct<=0.1?'val-warn':'val-bad';

  // Populasi: gunakan dari data input jika ada, atau dari data kandang
  let displayPopulasi = totalSisa;
  if(!hasData && refKandang?.populasi_awal){
    displayPopulasi = refKandang.populasi_awal;
  }

  // ── Kumpulkan data kesehatan & catatan ──
  let kesehatanHTML = '';
  let catatanText = '';
  if(hasData){
    const vitList=[], obatList=[], vaksinList=[];
    filtered.forEach(r=>{
      const d=r.data;if(!d)return;
      const kes=d.kesehatan||{};
      (kes.vitamin||[]).forEach(v=>{ if(v.nama) vitList.push(v.nama+(v.jumlah?' ('+Math.round(parseFloat(v.jumlah)*100)/100+')':'')); });
      (kes.obat||[]).forEach(v=>{ if(v.nama) obatList.push(v.nama+(v.jumlah?' ('+Math.round(parseFloat(v.jumlah)*100)/100+')':'')); });
      (kes.vaksin||[]).forEach(v=>{ if(v.nama) vaksinList.push(v.nama+(v.jumlah?' ('+Math.round(parseFloat(v.jumlah)*100)/100+')':'')); });
      if(d.catatan&&d.catatan.trim()) catatanText+=(catatanText?'; ':'')+d.catatan.trim();
    });
    if(vitList.length||obatList.length||vaksinList.length){
      kesehatanHTML=`<tr class="section-head"><td colspan="3">💊 Kesehatan</td></tr>`;
      if(vitList.length) kesehatanHTML+=`<tr><td>Vitamin</td><td colspan="2">${esc(vitList.join(', '))}</td></tr>`;
      if(obatList.length) kesehatanHTML+=`<tr><td>Obat</td><td colspan="2">${esc(obatList.join(', '))}</td></tr>`;
      if(vaksinList.length) kesehatanHTML+=`<tr><td>Vaksin</td><td colspan="2">${esc(vaksinList.join(', '))}</td></tr>`;
    }
  }

  // ── Render tabel ──
  bodyEl.innerHTML=`
  <table class="perf-table">
    <tr class="section-head"><td colspan="3">🐔 Populasi</td></tr>
    <tr><td>Umur Ayam</td><td>${umurMinggu} ${umurHari}</td><td>minggu + hari</td></tr>
    <tr><td>Populasi</td><td>${displayPopulasi>0?displayPopulasi.toLocaleString('id-ID'):'—'}</td><td>ekor</td></tr>

    <tr class="section-head"><td colspan="3">📉 Deplesi</td></tr>
    <tr><td>Deplesi Hari Ini</td><td class="${deplesiClass}">${hasData?(totalDeplesi+' ekor ('+deplesiPct.toFixed(3)+'%)'):'—'}</td><td>${trendDeplesi||'—'}</td></tr>

    <tr class="section-head"><td colspan="3">🌾 Pakan & Air</td></tr>
    <tr><td>FI (Feed Intake)</td><td>${avgFI>0?avgFI.toFixed(1):'—'}</td><td>gr/ekor</td></tr>
    <tr><td>Water Intake</td><td>${avgWater>0?avgWater.toFixed(0):'—'}</td><td>ml/ekor</td></tr>
    <tr><td>Rasio Air:Pakan</td><td>${avgRasio>0?avgRasio.toFixed(2):'—'}</td><td>:1</td></tr>

    <tr class="section-head"><td colspan="3">🥚 Produksi Telur</td></tr>
    <tr><td>EW (Egg Weight)</td><td>${avgEW>0?avgEW.toFixed(1):'—'}</td><td>gr/butir</td></tr>
    <tr><td>HD% (Hen Day)</td><td class="${hdpClass}">${avgHDP>0?avgHDP.toFixed(1)+'%':'—'}</td><td>${trendHDP||'—'}</td></tr>
    <tr><td>Total Produksi</td><td>${hasData?(totalButir.toLocaleString('id-ID')+' butir'):'—'}</td><td>${hasData?(totalKg.toFixed(2)+' kg'):'—'}</td></tr>

    <tr class="section-head"><td colspan="3">📊 Efisiensi</td></tr>
    <tr><td>FCR</td><td class="${fcrClass}">${fcr>0?fcr.toFixed(3):'—'}</td><td>${fcr>0?(fcr<=2.0?'✅ Baik':fcr<=2.5?'⚠️ Cukup':'❌ Buruk'):'—'}</td></tr>
    ${kesehatanHTML}
  </table>
  ${catatanText?`<div class="ds-catatan"><div class="ds-catatan-head">📝 Catatan</div><div class="ds-catatan-body">${esc(catatanText)}</div></div>`:''}`;

  // Footer
  const now=new Date();
  const displayKandang=targetKandang||(activeKandangList.length>1?'Semua Kandang':activeKandangList[0]?.nama||'—');
  document.getElementById('ds-footer-note').textContent=
    displayKandang+' · '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+(hasData?'':' · Belum ada data');
}

// ═══ CAPTURE SUMMARY ═══
async function captureSummary(){
  if(typeof html2canvas==='undefined'){
    showToast('⏳ Memuat library capture...');
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload=res;s.onerror=rej;
      document.head.appendChild(s);
    });
  }
  showToast('📸 Mengambil screenshot...');
  const el=document.getElementById('daily-summary');
  try{
    const btn=el.querySelector('.btn-capture');
    if(btn)btn.style.visibility='hidden';
    const canvas=await html2canvas(el,{
      backgroundColor:document.body.classList.contains('dark')?'#1e293b':'#ffffff',
      scale:2,useCORS:true,logging:false
    });
    if(btn)btn.style.visibility='visible';
    const a=document.createElement('a');
    a.download='performa_harian_'+new Date().toISOString().split('T')[0]+'.png';
    a.href=canvas.toDataURL('image/png');
    a.click();
    showToast('✅ Screenshot tersimpan!');
  }catch(e){
    const btn=el.querySelector('.btn-capture');
    if(btn)btn.style.visibility='visible';
    showToast('❌ Gagal capture: '+e.message);
  }
}

// ═══ FULLSCREEN DAILY SUMMARY ═══
function openFullscreenSummary(){
  const overlay=document.getElementById('fs-summary-overlay');
  const container=document.getElementById('fs-summary-content');
  const source=document.getElementById('daily-summary');
  if(!overlay||!container||!source)return;
  // Clone daily summary ke fullscreen
  container.innerHTML='';
  const clone=source.cloneNode(true);
  clone.id='fs-daily-summary';
  // Hapus tombol fullscreen dari clone
  const fullBtns=clone.querySelectorAll('.btn-capture');
  fullBtns.forEach(b=>b.style.display='none');
  container.appendChild(clone);
  overlay.classList.add('show');
  document.body.style.overflow='hidden';
}

function closeFullscreenSummary(){
  const overlay=document.getElementById('fs-summary-overlay');
  if(overlay)overlay.classList.remove('show');
  document.body.style.overflow='';
}

// Escape key untuk tutup fullscreen summary
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    const overlay=document.getElementById('fs-summary-overlay');
    if(overlay&&overlay.classList.contains('show')){
      closeFullscreenSummary();
    }
  }
});

async function captureSummaryFullscreen(){
  if(typeof html2canvas==='undefined'){
    showToast('⏳ Memuat library capture...');
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload=res;s.onerror=rej;
      document.head.appendChild(s);
    });
  }
  showToast('📸 Mengambil screenshot...');
  const el=document.getElementById('fs-daily-summary');
  if(!el){showToast('❌ Tidak ada data summary');return;}
  try{
    const canvas=await html2canvas(el,{
      backgroundColor:document.body.classList.contains('dark')?'#1e293b':'#ffffff',
      scale:2,useCORS:true,logging:false
    });
    const a=document.createElement('a');
    a.download='performa_harian_'+new Date().toISOString().split('T')[0]+'.png';
    a.href=canvas.toDataURL('image/png');
    a.click();
    showToast('✅ Screenshot tersimpan!');
  }catch(e){
    showToast('❌ Gagal capture: '+e.message);
  }
}

// ═══ PENGAMBILAN INTI (KEMITRAAN) ═══


async function renderHomeAlerts(){
  const alerts=[];
  const today=new Date().toISOString().split('T')[0];
  const kandangList=await dbGetKandang();
  const aktif=kandangList.filter(k=>k.status==='Aktif');

  // 1. Alert stok pakan rendah
  try{
    const pakans=await dbGetDaftarPakan();
    for(const p of pakans){
      const stok=await calcStokPakan(p.nama);
      const min=parseFloat(p.stok_minimal)||0;
      if(min>0&&stok<min){
        alerts.push({type:'danger',icon:'🌾',title:'Stok Pakan Rendah',desc:p.nama+': '+stok.toFixed(1)+' kg (min: '+min+' kg)'});
      }
    }
  }catch(e){}

  // 2. Alert HDP turun drastis (≥10% dari hari sebelumnya)
  try{
    const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
    const yd=yesterday.toISOString().split('T')[0];
    const todayInputs=await dbGetInput({tanggal:today});
    const yestInputs=await dbGetInput({tanggal:yd});
    for(const ti of todayInputs){
      const yi=yestInputs.find(r=>r.kandang===ti.kandang);
      if(!yi)continue;
      const hdpToday=parseFloat(ti.data?.produksi?.hdp)||0;
      const hdpYest=parseFloat(yi.data?.produksi?.hdp)||0;
      if(hdpYest>0&&hdpToday>0){
        const drop=((hdpYest-hdpToday)/hdpYest)*100;
        if(drop>=10){
          alerts.push({type:'warn',icon:'📉',title:'HDP Turun Drastis',desc:ti.kandang+': '+hdpYest.toFixed(1)+'% → '+hdpToday.toFixed(1)+'% (turun '+drop.toFixed(1)+'%)'});
        }
      }
    }
  }catch(e){}

  // 3. Alert kandang aktif belum input hari ini
  try{
    const todayInputs=await dbGetInput({tanggal:today});
    const sudahInput=new Set(todayInputs.map(r=>r.kandang));
    for(const k of aktif){
      if(!sudahInput.has(k.nama)){
        alerts.push({type:'info',icon:'⏰',title:'Belum Input Hari Ini',desc:'Kandang '+k.nama+' belum ada data input untuk hari ini.'});
      }
    }
  }catch(e){}

  const el=document.getElementById('home-alerts');
  if(!el)return;
  if(!alerts.length){el.style.display='none';el.innerHTML='';return;}
  el.style.display='block';
  el.innerHTML=alerts.map(a=>`<div class="alert-item ${a.type}"><div class="ai-icon">${a.icon}</div><div class="ai-text"><div class="ai-title">${a.title}</div><div class="ai-desc">${a.desc}</div></div></div>`).join('');
}

// ═══ GRAFIK (Chart.js) ═══
let chartHDP=null,chartPerforma=null;
