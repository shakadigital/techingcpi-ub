// ═══ MODULE: grafik ═══

let chartHDP=null,chartPerforma=null;

async function renderGrafik(){
  await ensureChartJS();
  const {dari:dariStr, sampai:sampaiStr, kandang} = getLaporanRange();
  const now = new Date(sampaiStr);

  // ── HDP + FI Chart (Dual Axis) ──
  const inputs=await dbGetInput({dari:dariStr,sampai:sampaiStr,kandang});
  
  // Cari tanggal data pertama yang ada
  const tanggalAda = inputs.map(r=>r.tanggal).sort();
  const startDate = tanggalAda.length > 0 ? new Date(tanggalAda[0]) : new Date(dariStr);
  
  // Build map untuk HDP dan FI per tanggal
  const dataMap={};
  inputs.forEach(r=>{
    const tgl=r.tanggal;
    const hdp=parseFloat(r.data?.produksi?.hdp)||null;
    const populasi=parseFloat(r.data?.sisa_ayam)||1;
    let totalPakanKg=0;
    (r.data?.pakan||[]).forEach(p=>{totalPakanKg+=parseFloat(p.jumlah)||0;});
    const fi=populasi>0&&totalPakanKg>0?parseFloat(((totalPakanKg*1000)/populasi).toFixed(1)):null;
    
    if(!dataMap[tgl])dataMap[tgl]={hdp:[],fi:[]};
    if(hdp!==null&&hdp>0&&hdp<=100)dataMap[tgl].hdp.push(hdp);
    if(fi!==null&&fi>0&&fi<=200)dataMap[tgl].fi.push(fi);
  });
  
  // Generate labels dan data dari startDate sampai now
  const labels=[];const hdpData=[];const fiData=[];
  let prevMonth=null;
  for(let d=new Date(startDate);d<=now;d.setDate(d.getDate()+1)){
    const s=d.toISOString().split('T')[0];
    const tanggal=d.getDate();
    const bulan=d.getMonth();
    // Label: tanggal saja, tapi reset ke 1 kalau pindah bulan
    labels.push(prevMonth!==null&&bulan!==prevMonth?`1 (${(bulan+1).toString().padStart(2,'0')})`:tanggal.toString());
    prevMonth=bulan;
    
    const v=dataMap[s];
    const avgHdp=v&&v.hdp.length?parseFloat((v.hdp.reduce((a,b)=>a+b,0)/v.hdp.length).toFixed(1)):null;
    const avgFi=v&&v.fi.length?parseFloat((v.fi.reduce((a,b)=>a+b,0)/v.fi.length).toFixed(1)):null;
    hdpData.push(avgHdp);
    fiData.push(avgFi);
  }
  
  const ctxHDP=document.getElementById('chart-hdp').getContext('2d');
  if(chartHDP)chartHDP.destroy();
  chartHDP=new Chart(ctxHDP,{
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'HDP (%)',data:hdpData,borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,.1)',tension:.3,fill:true,pointRadius:3,spanGaps:true,yAxisID:'yL'},
        {label:'FI (g/ekor)',data:fiData,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',tension:.3,fill:false,pointRadius:3,spanGaps:true,yAxisID:'yR'}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'top',labels:{usePointStyle:true,padding:12}},
        tooltip:{callbacks:{
          label:ctx=>{
            const label=ctx.dataset.label||'';
            const val=ctx.parsed.y;
            return val!==null?`${label}: ${val}${label.includes('HDP')?'%':' g/ekor'}`:'Tidak ada data';
          }
        }}
      },
      scales:{
        yL:{type:'linear',position:'left',title:{display:true,text:'HDP (%)'},beginAtZero:false,ticks:{callback:v=>v+'%'}},
        yR:{type:'linear',position:'right',title:{display:true,text:'FI (g/ekor)'},beginAtZero:false,grid:{drawOnChartArea:false}},
        x:{ticks:{maxTicksLimit:15,autoSkip:true}}
      }
    }
  });

  // ── Performa Mingguan Chart (HD, FI, EW, FCR) ──
  // Group per minggu umur ayam, gunakan data yang sudah difilter (inputs)
  const semuaKandang = await dbGetKandang();
  const allKandangs = kandang ? semuaKandang.filter(k=>k.nama===kandang||k.id===kandang) : semuaKandang;
  const weekMap = {}; // key: nomor minggu, value: {hd:[], fi:[], ew:[], fcr:[]}

  for(const k of allKandangs){
    if(!k || !k.chickin) continue;
    const chickInDate = new Date(k.chickin);
    chickInDate.setHours(0,0,0,0);
    const umurChickIn = parseInt(k.umur_masuk)||0;

    // Gunakan inputs yang sudah difilter dari-sampai, bukan semua input
    const kandangInputs = inputs.filter(r => r.kandang === k.nama);

    for(const r of kandangInputs){
      const tgl = new Date(r.tanggal);
      tgl.setHours(0,0,0,0);
      const hariKe = Math.floor((tgl - chickInDate)/(1000*60*60*24));
      if(hariKe < 0) continue; // skip data sebelum chick-in
      const umurHari = umurChickIn + hariKe;
      // Konsisten dengan period bar di input_harian.js: Math.floor(totalHari/7)
      // Minggu 16 = hari ke 112-118, minggu 17 = hari ke 119-125, dst.
      const minggu = Math.max(1, Math.floor(umurHari/7));
      const key = `${minggu}`;
      if(!weekMap[key]) weekMap[key]={hd:[],fi:[],ew:[],fcr:[]};

      const hdp = parseFloat(r.data?.produksi?.hdp)||null;
      // Populasi: ambil dari sisa_ayam data harian, fallback ke populasi kandang
      const populasi = parseFloat(r.data?.sisa_ayam)||parseFloat(k.populasi)||1;
      // FI: total pakan hari itu (gram/ekor) — pakan dalam kg * 1000 / populasi
      let totalPakanKg=0;
      (r.data?.pakan||[]).forEach(p=>{ totalPakanKg+=parseFloat(p.jumlah)||0; });
      const fi = populasi>0 && totalPakanKg>0
        ? parseFloat(((totalPakanKg*1000)/populasi).toFixed(1))
        : null;
      // EW: berat rata-rata telur (gram/butir)
      const ew = parseFloat(r.data?.produksi?.berat_rata)||null;
      // FCR: kg pakan / kg telur produksi hari itu
      const totalTelurKg = parseFloat(r.data?.produksi?.total?.kilo)||0;
      const fcr = totalTelurKg>0 ? parseFloat((totalPakanKg/totalTelurKg).toFixed(2)) : null;

      if(hdp!==null && hdp>0 && hdp<=100) weekMap[key].hd.push(hdp);
      if(fi!==null && fi>0 && fi<=200) weekMap[key].fi.push(fi); // max 200gr/ekor wajar
      if(ew!==null && ew>0 && ew<=80) weekMap[key].ew.push(ew);  // max 80gr/butir wajar
      if(fcr!==null && fcr>0 && fcr<10) weekMap[key].fcr.push(fcr);
    }
  }

  // Sort minggu secara numerik
  const avg = arr => arr.length ? parseFloat((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2)) : null;
  const weekKeys = Object.keys(weekMap).sort((a,b)=>parseInt(a)-parseInt(b));
  const wLabels = weekKeys;
  const hdData  = weekKeys.map(k=>avg(weekMap[k].hd));
  const wFiData  = weekKeys.map(k=>avg(weekMap[k].fi));

  // ── Standar HY-Line: ambil nilai tengah dari range per minggu ──
  const standar = await loadStandarPerforma();
  // Gabungkan pertumbuhan + produksi jadi satu map: minggu → {fi, hd}
  const stdMap = {};
  const parseMid = str => {
    if(!str) return null;
    const s = String(str).replace(/\s/g,'');
    // Format "12–14" atau "12-14" → ambil rata-rata
    const m = s.match(/^([\d.]+)[–\-]([\d.]+)$/);
    if(m) return (parseFloat(m[1])+parseFloat(m[2]))/2;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };
  (standar.pertumbuhan||[]).forEach(r => {
    stdMap[r.umur] = { fi: parseMid(r.konsumsi_pakan), hd: null };
  });
  (standar.produksi||[]).forEach(r => {
    const hdVal = parseMid(r.hdp);
    stdMap[r.umur] = { fi: parseMid(r.konsumsi_pakan), hd: hdVal };
  });

  // Petakan ke label minggu yang ada di grafik aktual
  const stdFiData = weekKeys.map(k => stdMap[parseInt(k)]?.fi ?? null);
  const stdHdData = weekKeys.map(k => stdMap[parseInt(k)]?.hd ?? null);

  const hasStdFi = stdFiData.some(v => v !== null);
  const hasStdHd = stdHdData.some(v => v !== null);

  const ctxP=document.getElementById('chart-performa').getContext('2d');
  if(chartPerforma)chartPerforma.destroy();

  const datasets = [
    {label:'FI Aktual (g/ekor)', data:wFiData,  borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.08)', borderWidth:2.5, tension:.4, fill:false, pointRadius:3, pointHoverRadius:5, spanGaps:true},
    {label:'HD% Aktual',         data:hdData,   borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,.08)',  borderWidth:2.5, tension:.4, fill:false, pointRadius:3, pointHoverRadius:5, spanGaps:true},
  ];
  if(hasStdFi) datasets.push(
    {label:'FI Standar (g/ekor)', data:stdFiData, borderColor:'#93c5fd', borderWidth:1.5, borderDash:[5,4], tension:.3, fill:false, pointRadius:0, pointHoverRadius:4, spanGaps:true}
  );
  if(hasStdHd) datasets.push(
    {label:'HD% Standar',         data:stdHdData, borderColor:'#86efac', borderWidth:1.5, borderDash:[5,4], tension:.3, fill:false, pointRadius:0, pointHoverRadius:4, spanGaps:true}
  );

  chartPerforma=new Chart(ctxP,{
    type:'line',
    data:{
      labels:wLabels,
      datasets
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'bottom',labels:{usePointStyle:true,pointStyle:'line',padding:16,
          filter: item => !item.text.includes('Standar') || item.text.includes('Standar')
        }},
        tooltip:{callbacks:{
          label:ctx=>{
            const v=ctx.parsed.y;
            if(v===null||v===undefined)return null;
            const lbl = ctx.dataset.label||'';
            const u = lbl.includes('HD%') ? '%' : 'g/ekor';
            const prefix = lbl.includes('Standar') ? '📏 ' : '📊 ';
            return `${prefix}${lbl}: ${v}${u}`;
          }
        }}
      },
      scales:{
        y:{
          title:{display:true,text:'FI (g/ekor) / HD (%)'},
          min:0,
          grid:{color:'rgba(0,0,0,.06)'},
          ticks:{color:'#374151'}
        },
        x:{
          title:{display:true,text:'Minggu Umur Ayam (Mgg ke-)'},
          ticks:{maxTicksLimit:20,color:'#374151'},
          grid:{color:'rgba(0,0,0,.04)'}
        }
      }
    }
  });
}

// ═══ FCR (Feed Conversion Ratio) ═══
function getFCRRange(){
  const p=document.getElementById('fcr-periode').value;
  const now=new Date();
  let dari,sampai=now.toISOString().split('T')[0];
  if(p==='minggu'){const d=new Date(now);d.setDate(d.getDate()-6);dari=d.toISOString().split('T')[0];}
  else if(p==='bulan'){dari=now.getFullYear()+'-'+(String(now.getMonth()+1).padStart(2,'0'))+'-01';}
  else{dari=document.getElementById('fcr-dari').value||sampai;sampai=document.getElementById('fcr-sampai').value||sampai;}
  return{dari,sampai,kandang:document.getElementById('fcr-kandang').value};
}

async function renderFCR(){
  await ensureChartJS();
  const {dari, sampai, kandang} = getLaporanRange();
  const inputs=await dbGetInput({dari,sampai,kandang});
  // Group by kandang
  const byKandang={};
  inputs.forEach(r=>{
    const k=r.kandang;
    if(!byKandang[k])byKandang[k]={pakanKg:0,telurKg:0};
    // Pakan
    const pakanRows=r.data?.pakan||[];
    pakanRows.forEach(p=>{byKandang[k].pakanKg+=parseFloat(p.jumlah)||0;});
    // Telur
    byKandang[k].telurKg+=parseFloat(r.data?.produksi?.total?.kilo)||0;
  });
  const rows=Object.entries(byKandang).map(([nama,v])=>{
    const fcr=v.telurKg>0?parseFloat((v.pakanKg/v.telurKg).toFixed(2)):null;
    let rating='—',ratingClass='';
    if(fcr!==null){
      if(fcr<=2.0){rating='Baik';ratingClass='baik';}
      else if(fcr<=2.5){rating='Cukup';ratingClass='cukup';}
      else{rating='Buruk';ratingClass='buruk';}
    }
    return{nama,pakanKg:v.pakanKg,telurKg:v.telurKg,fcr,rating,ratingClass};
  });
  // Summary cards
  const totalPakan=rows.reduce((s,r)=>s+r.pakanKg,0);
  const totalTelur=rows.reduce((s,r)=>s+r.telurKg,0);
  const avgFCR=totalTelur>0?parseFloat((totalPakan/totalTelur).toFixed(2)):null;
  let avgRating='—',avgClass='';
  if(avgFCR!==null){if(avgFCR<=2.0){avgRating='Baik';avgClass='baik';}else if(avgFCR<=2.5){avgRating='Cukup';avgClass='cukup';}else{avgRating='Buruk';avgClass='buruk';}}
  document.getElementById('fcr-summary').innerHTML=
    `<div class="fcr-card"><div class="fc-label">Total Pakan</div><div class="fc-val">${totalPakan.toFixed(1)}<small style="font-size:.9rem"> kg</small></div></div>`+
    `<div class="fcr-card"><div class="fc-label">Total Telur</div><div class="fc-val">${totalTelur.toFixed(1)}<small style="font-size:.9rem"> kg</small></div></div>`+
    `<div class="fcr-card"><div class="fc-label">FCR Rata-rata</div><div class="fc-val">${avgFCR??'—'}</div>${avgFCR!==null?'<span class="fc-rating '+avgClass+'">'+avgRating+'</span>':''}</div>`+
    `<div class="fcr-card"><div class="fc-label">Kandang Dianalisis</div><div class="fc-val">${rows.length}</div></div>`;
  const tbody=document.getElementById('fcr-tbody');
  const empty=document.getElementById('fcr-empty');
  tbody.innerHTML='';
  if(!rows.length){empty.style.display='block';return;}
  empty.style.display='none';
  rows.forEach(r=>{
    tbody.innerHTML+=`<tr><td><strong>${esc(r.nama)}</strong></td><td>${r.pakanKg.toFixed(1)} kg</td><td>${r.telurKg.toFixed(1)} kg</td><td><strong>${r.fcr??'—'}</strong></td><td>${r.fcr!==null?'<span class="fc-rating '+r.ratingClass+'">'+r.rating+'</span>':'—'}</td></tr>`;
  });
}

// ═══ RINGKASAN SIKLUS ═══
let _siklusData=null;
async function showRingkasanSiklus(namaKandang){
  showToast('⏳ Memuat ringkasan...');
  const list=cache.get('kandang_list')||await dbGetKandang();
  const k=list.find(x=>x.nama===namaKandang);
  if(!k){showToast('❌ Kandang tidak ditemukan');return;}
  const inputs=await dbGetInput({kandang:namaKandang});
  const penjualanAll=await dbGetPenjualan();
  const kiriman=await dbGetKiriman();
  // Hitung total produksi
  let totalButir=0,totalKgTelur=0,totalPakanKg=0,totalDeplesi=0;
  inputs.forEach(r=>{
    const d=r.data;if(!d)return;
    totalButir+=parseInt(d.produksi?.total?.butir)||0;
    totalKgTelur+=parseFloat(d.produksi?.total?.kilo)||0;
    totalDeplesi+=(parseInt(d.deplesi?.mati)||0)+(parseInt(d.deplesi?.afkir)||0);
    (d.pakan||[]).forEach(p=>{totalPakanKg+=parseFloat(p.jumlah)||0;});
  });
  // Hitung pendapatan dari penjualan (filter by kandang tidak bisa langsung, ambil semua)
  const totalPendapatan=penjualanAll.reduce((s,j)=>s+(parseInt(j.grand_total)||0),0);
  // Hitung biaya pakan dari kiriman
  const totalBiayaPakan=kiriman.reduce((s,ki)=>s+(parseFloat(ki.total_harga)||0),0);
  // Hitung biaya operasional dari input
  let totalBiayaOps=0;
  inputs.forEach(r=>{(r.data?.biaya||[]).forEach(b=>{totalBiayaOps+=parseFloat(b.jumlah)||0;});});
  const totalBiaya=totalBiayaPakan+totalBiayaOps;
  const labaRugi=totalPendapatan-totalBiaya;
  const fcr=totalKgTelur>0?parseFloat((totalPakanKg/totalKgTelur).toFixed(2)):null;
  const fcrRating=fcr===null?'—':fcr<=2.0?'Baik':fcr<=2.5?'Cukup':'Buruk';
  const pctDeplesi=k.populasi>0?((totalDeplesi/k.populasi)*100).toFixed(2):0;
  const avgHDP=inputs.length>0?(inputs.reduce((s,r)=>s+(parseFloat(r.data?.produksi?.hdp)||0),0)/inputs.length).toFixed(1):0;
  _siklusData={namaKandang,k,totalButir,totalKgTelur,totalPakanKg,totalDeplesi,totalPendapatan,totalBiayaPakan,totalBiayaOps,labaRugi,fcr,fcrRating,pctDeplesi,avgHDP,hari:inputs.length};
  const fmt=n=>'Rp '+Math.abs(n).toLocaleString('id-ID');
  document.getElementById('modal-siklus-title').textContent='📋 Ringkasan Siklus — '+namaKandang;
  document.getElementById('modal-siklus-body').innerHTML=`
    <div class="siklus-box"><h4>🏠 Info Kandang</h4>
      <div class="siklus-row"><span class="sr-label">Nama Kandang</span><span class="sr-val">${esc(k.nama)}</span></div>
      <div class="siklus-row"><span class="sr-label">Periode</span><span class="sr-val">${fmtTgl(k.chickin)}</span></div>
      <div class="siklus-row"><span class="sr-label">Populasi Masuk</span><span class="sr-val">${(k.populasi||0).toLocaleString('id-ID')} ekor</span></div>
      <div class="siklus-row"><span class="sr-label">Status</span><span class="sr-val">${k.status}</span></div>
      <div class="siklus-row"><span class="sr-label">Hari Data Tercatat</span><span class="sr-val">${inputs.length} hari</span></div>
    </div>
    <div class="siklus-box"><h4>🥚 Produksi</h4>
      <div class="siklus-row"><span class="sr-label">Total Produksi</span><span class="sr-val">${totalButir.toLocaleString('id-ID')} butir</span></div>
      <div class="siklus-row"><span class="sr-label">Total Berat Telur</span><span class="sr-val">${totalKgTelur.toFixed(1)} kg</span></div>
      <div class="siklus-row"><span class="sr-label">Rata-rata HDP</span><span class="sr-val">${avgHDP}%</span></div>
    </div>
    <div class="siklus-box"><h4>🐔 Deplesi</h4>
      <div class="siklus-row"><span class="sr-label">Total Deplesi</span><span class="sr-val">${totalDeplesi.toLocaleString('id-ID')} ekor</span></div>
      <div class="siklus-row"><span class="sr-label">% Deplesi</span><span class="sr-val">${pctDeplesi}%</span></div>
    </div>
    <div class="siklus-box"><h4>🌾 Pakan & FCR</h4>
      <div class="siklus-row"><span class="sr-label">Total Pakan</span><span class="sr-val">${totalPakanKg.toFixed(1)} kg</span></div>
      <div class="siklus-row"><span class="sr-label">FCR</span><span class="sr-val">${fcr??'—'} <span style="font-size:.75rem;color:#888">(${fcrRating})</span></span></div>
    </div>
    <div class="siklus-box"><h4>💰 Keuangan</h4>
      <div class="siklus-row"><span class="sr-label">Total Pendapatan</span><span class="sr-val green">${fmt(totalPendapatan)}</span></div>
      <div class="siklus-row"><span class="sr-label">Biaya Pakan</span><span class="sr-val red">${fmt(totalBiayaPakan)}</span></div>
      <div class="siklus-row"><span class="sr-label">Biaya Operasional</span><span class="sr-val red">${fmt(totalBiayaOps)}</span></div>
      <div class="siklus-row"><span class="sr-label">Total Biaya</span><span class="sr-val red">${fmt(totalBiaya)}</span></div>
      <div class="siklus-row" style="border-top:2px solid #e2e8f0;margin-top:4px;padding-top:8px"><span class="sr-label" style="font-weight:700">Laba / Rugi</span><span class="sr-val ${labaRugi>=0?'green':'red'}" style="font-size:1.1rem">${labaRugi>=0?'':'−'}${fmt(labaRugi)}</span></div>
    </div>`;
  document.getElementById('modal-siklus').style.display='flex';
}

function exportSiklus(){
  if(!_siklusData)return;
  const d=_siklusData;
  const today=new Date().toISOString().split('T')[0];
  const headers=['Kategori','Item','Nilai'];
  const data=[
    ['Ringkasan','Kandang',d.namaKandang],
    ['Ringkasan','Periode',d.k.chickin],
    ['Ringkasan','Populasi Masuk',d.k.populasi],
    ['Ringkasan','Hari Tercatat',d.hari],
    ['Produksi','Total Butir',d.totalButir],
    ['Produksi','Total kg Telur',d.totalKgTelur],
    ['Produksi','Rata-rata HDP',d.avgHDP+'%'],
    ['Deplesi','Total Deplesi',d.totalDeplesi],
    ['Deplesi','% Deplesi',d.pctDeplesi+'%'],
    ['Pakan & FCR','Total Pakan (kg)',d.totalPakanKg],
    ['Pakan & FCR','FCR',d.fcr],
    ['Pakan & FCR','Rating FCR',d.fcrRating],
    ['Keuangan','Pendapatan (Rp)',d.totalPendapatan],
    ['Keuangan','Biaya Pakan (Rp)',d.totalBiayaPakan],
    ['Keuangan','Biaya Ops (Rp)',d.totalBiayaOps],
    ['Keuangan','Laba/Rugi (Rp)',d.labaRugi],
  ];
  await exportExcel('Ringkasan Siklus - '+d.namaKandang,headers,data,'siklus_'+d.namaKandang+'_'+today+'.xlsx');
}

// ═══ BACKUP & RESTORE ═══