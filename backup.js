// ═══ MODULE: backup ═══

async function backupData(){
  showToast('⏳ Menyiapkan backup...');
  try{
    const[users,kandang,inputs,penjualan,daftarPakan,kiriman,kas]=await Promise.all([
      dbGetUsers(),dbGetKandang(),dbGetInput({}),dbGetPenjualan({}),dbGetDaftarPakan(),dbGetKiriman({}),dbGetKas({})
    ]);
    const backup={
      version:'1.0',exported_at:new Date().toISOString(),app:'Teaching Farm UB',
      data:{users,kandang,inputs,penjualan,daftar_pakan:daftarPakan,kiriman_pakan:kiriman,kas_operasional:kas}
    };
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;
    a.download='backup_peternakan_'+new Date().toISOString().split('T')[0]+'.json';
    a.click();URL.revokeObjectURL(url);
    showToast('✅ Backup berhasil didownload!');
  }catch(e){showToast('❌ Gagal backup: '+e.message);}
}

async function backupCSVAll(){
  showToast('⏳ Menyiapkan CSV...');
  try{
    const inputs=await dbGetInput({});
    let csv='Tanggal,Kandang,Sisa Ayam,Deplesi,Prod Butir,Prod kg,HDP,Pakan kg,Air Liter\n';
    inputs.forEach(r=>{
      const d=r.data;if(!d)return;
      const tp=(d.pakan||[]).reduce((s,p)=>s+(parseFloat(p.jumlah)||0),0);
      csv+=`${d.tanggal},${d.kandang},${d.sisa_ayam||0},${(d.deplesi?.mati||0)+(d.deplesi?.afkir||0)},${d.produksi?.total?.butir||0},${d.produksi?.total?.kilo||0},${d.produksi?.hdp||0},${tp},${d.air_liter||0}\n`;
    });
    downloadCSV(csv,'semua_input_'+new Date().toISOString().split('T')[0]+'.csv');
    showToast('✅ CSV berhasil didownload!');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

async function restoreData(input){
  const file=input.files[0];if(!file)return;
  const statusEl=document.getElementById('restore-status');
  statusEl.textContent='⏳ Membaca file...';
  try{
    const text=await file.text();
    const backup=JSON.parse(text);
    if(!backup.data||!backup.version){statusEl.textContent='❌ Format file tidak valid!';return;}
    if(!confirm('⚠️ Restore akan menimpa data yang ada. Lanjutkan?')){statusEl.textContent='';input.value='';return;}
    statusEl.textContent='⏳ Merestore data...';
    const d=backup.data;
    // Restore users
    if(d.users?.length){for(const u of d.users){try{await dbSaveUser(u);}catch(e){}}}
    // Restore kandang
    if(d.kandang?.length){for(const k of d.kandang){try{await dbSaveKandang(k);}catch(e){}}}
    // Restore input harian
    if(d.inputs?.length){for(const r of d.inputs){try{await dbUpsert('input_harian',r);}catch(e){}}}
    // Restore penjualan
    if(d.penjualan?.length){for(const p of d.penjualan){try{await dbUpsert('penjualan',p);}catch(e){}}}
    // Restore daftar pakan
    if(d.daftar_pakan?.length){for(const p of d.daftar_pakan){try{await dbSaveDaftarPakan(p);}catch(e){}}}
    // Restore kiriman pakan
    if(d.kiriman_pakan?.length){for(const k of d.kiriman_pakan){try{await dbUpsert('kiriman_pakan',k);}catch(e){}}}
    // Restore kas
    if(d.kas_operasional?.length){for(const k of d.kas_operasional){try{await dbUpsert('kas_operasional',k);}catch(e){}}}
    // Clear cache
    ['users','kandang_list','input_harian','penjualan_list','daftar_pakan','kiriman_pakan','kas_list'].forEach(k=>cache.del(k));
    statusEl.innerHTML='<span style="color:#16a34a;font-weight:700">✅ Restore berhasil! Halaman akan dimuat ulang...</span>';
    setTimeout(()=>location.reload(),2000);
  }catch(e){statusEl.textContent='❌ Gagal restore: '+e.message;}
  input.value='';
}

// ═══ KAS OPERASIONAL ═══