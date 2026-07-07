// ═══ MODULE: kemitraan ═══

async function showPengambilanIntiSection(){
  // Tampilkan section pengambilan inti jika ada kandang kemitraan
  const list=cache.get('kandang_list')||await dbGetKandang();
  const hasKemitraan=list.some(k=>k.sistem==='kemitraan'&&k.status==='Aktif');
  const section=document.getElementById('section-pengambilan-inti');
  if(section) section.style.display=hasKemitraan?'block':'none';
  if(hasKemitraan) renderPengambilanIntiTable();
}

async function renderPengambilanIntiTable(){
  const rows=await dbGetPengambilanInti({});
  const tbody=document.getElementById('pengambilan-inti-tbody');
  const empty=document.getElementById('pengambilan-inti-empty');
  if(!tbody)return;
  tbody.innerHTML='';
  if(!rows.length){if(empty)empty.style.display='block';return;}
  if(empty)empty.style.display='none';
  rows.slice(0,30).forEach(r=>{
    const tr=document.createElement('tr');
    const totalBH=(r.detail_harian||[]).reduce((s,d)=>s+(d.bagi_hasil||0),0);
    const totalMitra=(r.detail_harian||[]).reduce((s,d)=>s+(d.mitra_30||0),0);
    const totalInti=(r.detail_harian||[]).reduce((s,d)=>s+(d.inti_70||0),0);
    tr.innerHTML=`<td>${fmtTgl(r.tanggal_ambil)}</td><td style="font-size:.75rem">${fmtTgl(r.tanggal_terakhir)} — ${fmtTgl(r.tanggal_ambil)}</td><td>${r.total_kg} kg</td><td>${(r.total_kg/r.jumlah_hari).toFixed(1)} kg</td><td style="font-weight:700">Rp ${totalBH.toLocaleString('id-ID')}</td><td style="color:#2d6a4f">Rp ${totalMitra.toLocaleString('id-ID')}</td><td style="color:#b45309">Rp ${totalInti.toLocaleString('id-ID')}</td><td><button class="btn-del" onclick="deletePengambilanInti('${r.id}')">🗑</button></td>`;
    tbody.appendChild(tr);
  });
}

async function openPengambilanIntiModal(){
  const list=cache.get('kandang_list')||await dbGetKandang();
  const kemitraanList=list.filter(k=>k.sistem==='kemitraan'&&k.status==='Aktif');
  if(!kemitraanList.length){showToast('⚠️ Tidak ada kandang kemitraan aktif!');return;}

  const sel=document.getElementById('pi-kandang');
  sel.innerHTML='';
  kemitraanList.forEach(k=>{
    const o=document.createElement('option');
    o.value=k.nama;o.textContent=k.nama+' ('+k.nama_inti+')';
    o.dataset.kontrak=k.harga_kontrak||0;
    o.dataset.mitra=k.persen_mitra||30;
    o.dataset.inti=k.persen_inti||70;
    sel.appendChild(o);
  });

  document.getElementById('pi-tgl-ambil').value=new Date().toISOString().split('T')[0];
  document.getElementById('pi-tgl-terakhir').value='';
  document.getElementById('pi-jumlah-hari').value='';
  document.getElementById('pi-total-kg').value='';
  document.getElementById('pi-rata-rata').value='';
  document.getElementById('pi-detail-harian').innerHTML='';
  document.getElementById('pi-summary').style.display='none';

  // Auto-detect tanggal terakhir ambil
  await autoDetectLastPickup();

  document.getElementById('modal-pengambilan-inti').style.display='flex';
}

async function autoDetectLastPickup(){
  const kandang=document.getElementById('pi-kandang').value;
  const existing=await dbGetPengambilanInti({kandang});
  if(existing.length>0){
    document.getElementById('pi-tgl-terakhir').value=existing[0].tanggal_ambil;
    calcPiHari();
  }
}

function onPiKandangChange(){
  autoDetectLastPickup();
  document.getElementById('pi-detail-harian').innerHTML='';
  document.getElementById('pi-summary').style.display='none';
}

function calcPiHari(){
  const tglTerakhir=document.getElementById('pi-tgl-terakhir').value;
  const tglAmbil=document.getElementById('pi-tgl-ambil').value;
  if(!tglTerakhir||!tglAmbil)return;
  const d1=new Date(tglTerakhir);d1.setHours(0,0,0,0);
  const d2=new Date(tglAmbil);d2.setHours(0,0,0,0);
  const hari=Math.round((d2-d1)/86400000);
  if(hari<=0){showToast('⚠️ Tanggal ambil harus setelah tanggal terakhir!');return;}
  document.getElementById('pi-jumlah-hari').value=hari;
  calcPiRataRata();
}

async function calcPiRataRata(){
  const hari=parseInt(document.getElementById('pi-jumlah-hari').value)||0;
  const totalKg=parseFloat(document.getElementById('pi-total-kg').value)||0;
  if(!hari||!totalKg){
    document.getElementById('pi-rata-rata').value='';
    document.getElementById('pi-detail-harian').innerHTML='';
    document.getElementById('pi-summary').style.display='none';
    return;
  }
  const rataRata=totalKg/hari;
  document.getElementById('pi-rata-rata').value=rataRata.toFixed(2)+' kg/hari';

  // Ambil harga pasar per hari dari input_harian
  const tglTerakhir=document.getElementById('pi-tgl-terakhir').value;
  const kandang=document.getElementById('pi-kandang').value;
  const sel=document.getElementById('pi-kandang');
  const opt=sel.options[sel.selectedIndex];
  const hargaKontrak=parseFloat(opt?.dataset.kontrak)||0;
  const pctMitra=parseFloat(opt?.dataset.mitra)||30;
  const pctInti=parseFloat(opt?.dataset.inti)||70;

  const allInputs=await dbGetInput({kandang});
  const detailEl=document.getElementById('pi-detail-harian');
  let html='<table class="tbl" style="font-size:.78rem"><thead><tr><th>Tanggal</th><th>Rata-rata</th><th>H.Pasar</th><th>Kontrak</th><th>Selisih</th><th>Bagi Hasil</th><th>Mitra '+pctMitra+'%</th><th>Inti '+pctInti+'%</th></tr></thead><tbody>';

  let totalBH=0,totalMitra=0,totalInti=0;
  const d1=new Date(tglTerakhir);d1.setHours(0,0,0,0);

  for(let i=1;i<=hari;i++){
    const dt=new Date(d1.getTime()+i*86400000);
    const tglStr=dt.toISOString().split('T')[0];
    // Cari harga pasar dari input_harian
    const inputHari=allInputs.find(r=>r.data?.tanggal===tglStr&&r.data?.kandang===kandang);
    const hargaPasar=inputHari?.data?.harga_pasar||0;
    const selisih=Math.max(0,hargaPasar-hargaKontrak);
    const bagiHasil=rataRata*selisih;
    const mitra=bagiHasil*(pctMitra/100);
    const inti=bagiHasil*(pctInti/100);
    totalBH+=bagiHasil;totalMitra+=mitra;totalInti+=inti;

    const cls=hargaPasar?'':'style="color:#dc2626"';
    html+=`<tr><td>${tglStr.slice(5)}</td><td>${rataRata.toFixed(1)}</td><td ${cls}>${hargaPasar?'Rp '+hargaPasar.toLocaleString('id-ID'):'⚠️ Belum diisi'}</td><td>Rp ${hargaKontrak.toLocaleString('id-ID')}</td><td>Rp ${selisih.toLocaleString('id-ID')}</td><td>Rp ${Math.round(bagiHasil).toLocaleString('id-ID')}</td><td>Rp ${Math.round(mitra).toLocaleString('id-ID')}</td><td>Rp ${Math.round(inti).toLocaleString('id-ID')}</td></tr>`;
  }
  html+='</tbody></table>';
  detailEl.innerHTML=html;

  // Summary
  const summaryEl=document.getElementById('pi-summary');
  summaryEl.style.display='block';
  document.getElementById('pi-summary-content').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div><strong>Total Bagi Hasil:</strong></div><div style="text-align:right;font-weight:700">Rp ${Math.round(totalBH).toLocaleString('id-ID')}</div>
      <div>Mitra (${pctMitra}%):</div><div style="text-align:right;color:#2d6a4f;font-weight:700">Rp ${Math.round(totalMitra).toLocaleString('id-ID')}</div>
      <div>Inti (${pctInti}%):</div><div style="text-align:right;color:#b45309;font-weight:700">Rp ${Math.round(totalInti).toLocaleString('id-ID')}</div>
    </div>`;
}

async function savePengambilanInti(){
  const kandang=document.getElementById('pi-kandang').value;
  const tglTerakhir=document.getElementById('pi-tgl-terakhir').value;
  const tglAmbil=document.getElementById('pi-tgl-ambil').value;
  const hari=parseInt(document.getElementById('pi-jumlah-hari').value)||0;
  const totalKg=parseFloat(document.getElementById('pi-total-kg').value)||0;

  if(!kandang||!tglTerakhir||!tglAmbil){showToast('⚠️ Lengkapi semua field!');return;}
  if(hari<=0){showToast('⚠️ Jumlah hari tidak valid!');return;}
  if(totalKg<=0){showToast('⚠️ Total kg harus lebih dari 0!');return;}

  const sel=document.getElementById('pi-kandang');
  const opt=sel.options[sel.selectedIndex];
  const hargaKontrak=parseFloat(opt?.dataset.kontrak)||0;
  const pctMitra=parseFloat(opt?.dataset.mitra)||30;
  const pctInti=parseFloat(opt?.dataset.inti)||70;
  const rataRata=totalKg/hari;

  // Build detail harian
  const allInputs=await dbGetInput({kandang});
  const d1=new Date(tglTerakhir);d1.setHours(0,0,0,0);
  const detail=[];

  for(let i=1;i<=hari;i++){
    const dt=new Date(d1.getTime()+i*86400000);
    const tglStr=dt.toISOString().split('T')[0];
    const inputHari=allInputs.find(r=>r.data?.tanggal===tglStr&&r.data?.kandang===kandang);
    const hargaPasar=inputHari?.data?.harga_pasar||0;
    const selisih=Math.max(0,hargaPasar-hargaKontrak);
    const bagiHasil=rataRata*selisih;
    detail.push({
      tanggal:tglStr,
      rata_kg:rataRata,
      harga_pasar:hargaPasar,
      harga_kontrak:hargaKontrak,
      selisih,
      bagi_hasil:Math.round(bagiHasil),
      mitra_30:Math.round(bagiHasil*(pctMitra/100)),
      inti_70:Math.round(bagiHasil*(pctInti/100))
    });
  }

  const obj={
    tanggal_ambil:tglAmbil,
    tanggal_terakhir:tglTerakhir,
    jumlah_hari:hari,
    total_kg:totalKg,
    kandang,
    nama_inti:opt?.textContent||'',
    harga_kontrak:hargaKontrak,
    persen_mitra:pctMitra,
    persen_inti:pctInti,
    detail_harian:detail
  };

  try{
    await dbSavePengambilanInti(obj);
    await dbSaveLog('TAMBAH','pengambilan_inti',obj.id,null,obj,
      `Pengambilan inti ${kandang} tgl ${tglAmbil}: ${totalKg}kg`);
    closeModal('modal-pengambilan-inti');
    renderPengambilanIntiTable();
    showToast('✅ Pengambilan inti disimpan!');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

async function deletePengambilanInti(id){
  if(!confirm('Hapus data pengambilan ini?'))return;
  try{
    await dbDeletePengambilanInti(id);
    renderPengambilanIntiTable();
    showToast('🗑 Data dihapus.');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

// ═══ SETTINGS — KANDANG ═══

async function showKemitraanTab(){
  const list=cache.get('kandang_list')||await dbGetKandang();
  const hasKemitraan=list.some(k=>k.sistem==='kemitraan');
  const tab=document.getElementById('ltab-kemitraan');
  if(tab) tab.style.display=hasKemitraan?'':'none';
}

async function initRekapKemitraan(){
  const list=cache.get('kandang_list')||await dbGetKandang();
  const kemitraanList=list.filter(k=>k.sistem==='kemitraan');
  const sel=document.getElementById('km-kandang');
  if(!sel)return;
  sel.innerHTML='';
  kemitraanList.forEach(k=>{
    const o=document.createElement('option');
    o.value=k.nama;o.textContent=k.nama+' ('+k.nama_inti+')';
    o.dataset.chickin=k.chickin||'';
    o.dataset.kontrak=k.harga_kontrak||0;
    o.dataset.mitra=k.persen_mitra||30;
    o.dataset.inti=k.persen_inti||70;
    sel.appendChild(o);
  });
  // Auto-set periode dari chickin sampai hari ini
  if(kemitraanList.length){
    const k=kemitraanList[0];
    document.getElementById('km-dari').value=k.chickin||'';
    document.getElementById('km-sampai').value=new Date().toISOString().split('T')[0];
  }
}

async function renderRekapKemitraan(){
  const kandangNama=document.getElementById('km-kandang').value;
  const dari=document.getElementById('km-dari').value;
  const sampai=document.getElementById('km-sampai').value;
  const el=document.getElementById('km-rekap-content');
  if(!kandangNama||!dari||!sampai){el.innerHTML='<div style="color:#aaa;text-align:center;padding:20px">Lengkapi filter di atas.</div>';return;}

  el.innerHTML='<div style="color:#aaa;text-align:center;padding:20px">⏳ Menghitung...</div>';

  const list=cache.get('kandang_list')||await dbGetKandang();
  const kandang=list.find(k=>k.nama===kandangNama);
  if(!kandang){el.innerHTML='<div style="color:#dc2626;text-align:center;padding:20px">Kandang tidak ditemukan.</div>';return;}

  const hargaKontrak=parseFloat(kandang.harga_kontrak)||0;
  const pctMitra=parseFloat(kandang.persen_mitra)||30;
  const pctInti=parseFloat(kandang.persen_inti)||70;

  // 1. Ambil data produksi (dari input_harian)
  const inputs=await dbGetInput({kandang:kandangNama,dari,sampai});
  let totalNormalKg=0,totalCreamKg=0,totalRetakKg=0;
  inputs.forEach(r=>{
    const d=r.data;if(!d||!d.produksi)return;
    totalNormalKg+=parseFloat(d.produksi.normal?.kilo)||0;
    totalCreamKg+=parseFloat(d.produksi.crem?.kilo)||0;
    totalRetakKg+=parseFloat(d.produksi.bentes_kering?.kilo)||0;
  });
  const totalKg=totalNormalKg+totalCreamKg+totalRetakKg;

  // 2. Ambil data penjualan (untuk harga jual cream/retak)
  const penjualanAll=await dbGetPenjualan({dari,sampai});
  let creamRevenue=0,retakRevenue=0;
  penjualanAll.forEach(p=>{
    (p.rows||[]).forEach(r=>{
      if(r.grade==='Crem' || r.grade==='Cream') creamRevenue+=(parseFloat(r.kilo)||0)*(parseFloat(r.harga)||0);
      if(r.grade==='Bentes' || r.grade==='Retak') retakRevenue+=(parseFloat(r.kilo)||0)*(parseFloat(r.harga)||0);
    });
  });

  // 3. Bagi hasil dari pengambilan inti
  const pengambilan=await dbGetPengambilanInti({kandang:kandangNama});
  const pengambilanPeriode=pengambilan.filter(p=>p.tanggal_ambil>=dari&&p.tanggal_ambil<=sampai);
  let bagiHasilInti=0;
  pengambilanPeriode.forEach(p=>{
    (p.detail_harian||[]).forEach(d=>{bagiHasilInti+=(d.mitra_30||0);});
  });

  // 4. Bagi hasil jual kandang (Normal saja): kg × (harga pasar+500 - kontrak) × 30%
  let bagiHasilKandang=0;
  penjualanAll.forEach(p=>{
    (p.rows||[]).forEach(r=>{
      if(r.grade==='Normal'){
        const hargaJual=parseFloat(r.harga)||0;
        const selisih=Math.max(0,hargaJual-hargaKontrak);
        bagiHasilKandang+=((parseFloat(r.kilo)||0)*selisih*(pctMitra/100));
      }
    });
  });

  // 5. Biaya operasional dari inti (kas masuk)
  const kasAll=await dbGetKas({dari,sampai,kandang:kandangNama});
  const opsFromInti=kasAll.filter(k=>k.jenis==='masuk').reduce((s,k)=>s+(parseFloat(k.jumlah)||0),0);

  // 6. Pendapatan kontrak
  const kontrakNormal=totalNormalKg*hargaKontrak;

  // SUBTOTAL PENDAPATAN
  const totalPendapatan=kontrakNormal+bagiHasilKandang+bagiHasilInti+creamRevenue+retakRevenue+opsFromInti;

  // 7. Pengeluaran — pakan dari inti
  const kirimanPakan=await dbGetKiriman({dari,sampai});
  const pakanInti=kirimanPakan.filter(k=>(k.sumber||'inti')==='inti');
  let totalPakanInti=0;
  let pakanDetail='';
  pakanInti.forEach(k=>{
    const total=parseFloat(k.harga_total)||0;
    totalPakanInti+=total;
    pakanDetail+=`<tr><td style="padding-left:20px">- ${esc(k.nama_pakan)}</td><td>${k.jumlah} kg</td><td style="text-align:right">Rp ${total.toLocaleString('id-ID')}</td></tr>`;
  });

  // 8. Pengeluaran — obat/vaksin/vitamin dari inti
  const kirimanNp=await dbGetKirimanNonPakan({});
  const npInti=kirimanNp.filter(k=>(k.sumber||'inti')==='inti'&&k.tanggal>=dari&&k.tanggal<=sampai);
  let totalNpInti=0;
  let npDetail='';
  npInti.forEach(k=>{
    const total=parseFloat(k.harga_total)||0;
    totalNpInti+=total;
    npDetail+=`<tr><td style="padding-left:20px">- ${esc(k.nama_item)} (${k.kategori})</td><td>${k.jumlah_kemasan||k.jumlah} ${k.jenis_kemasan||k.satuan}</td><td style="text-align:right">Rp ${total.toLocaleString('id-ID')}</td></tr>`;
  });

  // SUBTOTAL PENGELUARAN
  const totalPengeluaran=totalPakanInti+totalNpInti;

  // SALDO
  const saldo=totalPendapatan-totalPengeluaran;

  // Render
  el.innerHTML=`
  <div style="border:2px solid #2d6a4f;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#1b4332,#2d6a4f);color:#fff;padding:14px 16px">
      <div style="font-size:1rem;font-weight:700">🤝 Rekap Kemitraan</div>
      <div style="font-size:.78rem;opacity:.85;margin-top:4px">${esc(kandangNama)} · ${esc(kandang.nama_inti||'—')}</div>
      <div style="font-size:.72rem;opacity:.7">Periode: ${dari} s.d. ${sampai} · Kontrak: Rp ${hargaKontrak.toLocaleString('id-ID')}/kg</div>
    </div>

    <div style="padding:14px 16px">
      <table class="tbl" style="font-size:.82rem;margin-bottom:16px">
        <tr class="section-head"><td colspan="3">📦 PRODUKSI & PENJUALAN</td></tr>
        <tr><td>Normal</td><td>${totalNormalKg.toFixed(2)} kg × Rp ${hargaKontrak.toLocaleString('id-ID')}</td><td style="text-align:right;font-weight:700">Rp ${kontrakNormal.toLocaleString('id-ID')}</td></tr>
        <tr><td></td><td>+ Bagi hasil ${pctMitra}%</td><td style="text-align:right;color:#2d6a4f">Rp ${Math.round(bagiHasilKandang+bagiHasilInti).toLocaleString('id-ID')}</td></tr>
        <tr><td>Crem</td><td>${totalCreamKg.toFixed(2)} kg (100% mitra)</td><td style="text-align:right">Rp ${creamRevenue.toLocaleString('id-ID')}</td></tr>
        <tr><td>Bentes</td><td>${totalRetakKg.toFixed(2)} kg (100% mitra)</td><td style="text-align:right">Rp ${retakRevenue.toLocaleString('id-ID')}</td></tr>

        <tr class="section-head"><td colspan="3">💰 PENDAPATAN MITRA (saldo di Inti)</td></tr>
        <tr><td>Kontrak Normal</td><td></td><td style="text-align:right">Rp ${kontrakNormal.toLocaleString('id-ID')}</td></tr>
        <tr><td>Bagi hasil jual kandang (${pctMitra}%)</td><td></td><td style="text-align:right">Rp ${Math.round(bagiHasilKandang).toLocaleString('id-ID')}</td></tr>
        <tr><td>Bagi hasil pengambilan inti (${pctMitra}%)</td><td></td><td style="text-align:right">Rp ${Math.round(bagiHasilInti).toLocaleString('id-ID')}</td></tr>
        <tr><td>Penjualan Crem</td><td></td><td style="text-align:right">Rp ${creamRevenue.toLocaleString('id-ID')}</td></tr>
        <tr><td>Penjualan Bentes</td><td></td><td style="text-align:right">Rp ${retakRevenue.toLocaleString('id-ID')}</td></tr>
        <tr><td>Biaya operasional dari inti</td><td></td><td style="text-align:right">Rp ${opsFromInti.toLocaleString('id-ID')}</td></tr>
        <tr class="total-row" style="font-weight:700"><td>SUBTOTAL PENDAPATAN</td><td></td><td style="text-align:right">Rp ${Math.round(totalPendapatan).toLocaleString('id-ID')}</td></tr>

        <tr class="section-head"><td colspan="3">💸 PENGELUARAN (dipotong dari saldo)</td></tr>
        <tr><td colspan="2" style="font-weight:600">Pakan dari Inti</td><td style="text-align:right;font-weight:600">Rp ${totalPakanInti.toLocaleString('id-ID')}</td></tr>
        ${pakanDetail}
        <tr><td colspan="2" style="font-weight:600">Obat/Vaksin/Vitamin dari Inti</td><td style="text-align:right;font-weight:600">Rp ${totalNpInti.toLocaleString('id-ID')}</td></tr>
        ${npDetail}
        <tr style="font-weight:700;color:#dc2626"><td>SUBTOTAL PENGELUARAN</td><td></td><td style="text-align:right">Rp ${Math.round(totalPengeluaran).toLocaleString('id-ID')}</td></tr>
      </table>

      <div style="background:linear-gradient(135deg,#1b4332,#2d6a4f);color:#fff;border-radius:10px;padding:14px 16px;text-align:center">
        <div style="font-size:.75rem;opacity:.8;margin-bottom:4px">SALDO MITRA DI INTI</div>
        <div style="font-size:1.4rem;font-weight:800">Rp ${Math.round(saldo).toLocaleString('id-ID')}</div>
        <div style="font-size:.72rem;opacity:.7;margin-top:4px">${saldo>=0?'✅ Mitra masih punya saldo':'⚠️ Mitra ada kekurangan'}</div>
      </div>
    </div>
  </div>`;
}
