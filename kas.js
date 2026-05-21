// ═══ MODULE: kas ═══

async function renderKasSaldo(kandangParam){
  // Ambil kandang dari parameter atau dari dropdown biaya-kandang atau kandang input
  const kandang=kandangParam||(document.getElementById('biaya-kandang')?.value||document.getElementById('kandang')?.value||'').trim();
  const bar=document.getElementById('kas-saldo-bar');
  if(!bar)return;
  // Tampilkan untuk KAS_VIEW (supervisor ke atas)
  if(!can('KAS_VIEW')){bar.style.display='none';return;}
  bar.style.display='flex';
  try{
    const list=await dbGetKas(kandang?{kandang}:{});
    const masuk=list.filter(k=>k.jenis==='masuk').reduce((s,k)=>s+(parseFloat(k.jumlah)||0),0);
    const keluar=list.filter(k=>k.jenis==='keluar').reduce((s,k)=>s+(parseFloat(k.jumlah)||0),0);
    const saldo=masuk-keluar;
    document.getElementById('ks-masuk').textContent='Rp '+masuk.toLocaleString('id-ID');
    document.getElementById('ks-keluar').textContent='Rp '+keluar.toLocaleString('id-ID');
    const saldoEl=document.getElementById('ks-saldo');
    saldoEl.textContent='Rp '+Math.abs(saldo).toLocaleString('id-ID')+(saldo<0?' (Minus)':'');
    saldoEl.className='ks-val'+(saldo<0?' red':saldo<500000?' orange':'');
    bar.className='kas-saldo-bar'+(saldo<0?' danger':saldo<500000?' warn':'');
  }catch(e){console.warn('kas saldo error',e);}
  // Tombol Alokasi hanya untuk manajer/admin
  const btnMasuk=document.getElementById('btn-kas-masuk');
  if(btnMasuk)btnMasuk.style.display=can('KAS_MASUK')?'':'none';
  
}

async function openKasModal(jenis){
  if(jenis==='masuk'&&!can('KAS_MASUK')){showToast('⚠️ Hanya Manajer/Admin yang bisa alokasi kas!');return;}
  if(jenis==='keluar'&&!can('KAS_KELUAR')){showToast('⚠️ Hanya Supervisor ke atas yang bisa catat pengeluaran!');return;}
  document.getElementById('mk3-jenis').value=jenis;
  document.getElementById('modal-kas-title').textContent=jenis==='masuk'?'💰 Alokasi Kas dari Manager':'📤 Catat Pengeluaran Kas';
  document.getElementById('mk3-tgl').value=new Date().toISOString().split('T')[0];
  document.getElementById('mk3-jumlah').value='';
  document.getElementById('mk3-ket').value='';
  const sel=document.getElementById('mk3-kandang');
  const list=cache.get('kandang_list')||await dbGetKandang();
  sel.innerHTML='<option value="">Semua Kandang</option>';
  list.forEach(k=>{const o=document.createElement('option');o.value=k.nama;o.textContent=k.nama;sel.appendChild(o);});
  // Ambil kandang dari halaman biaya atau input harian
  const aktif=document.getElementById('biaya-kandang')?.value||document.getElementById('kandang')?.value;
  if(aktif)sel.value=aktif;
  document.getElementById('modal-kas').style.display='flex';
}

async function saveKas(){
  const jenis=document.getElementById('mk3-jenis').value;
  const tanggal=document.getElementById('mk3-tgl').value;
  const jumlah=parseFloat(document.getElementById('mk3-jumlah').value)||0;
  const ket=document.getElementById('mk3-ket').value.trim();
  const kandang=document.getElementById('mk3-kandang').value;
  const kategori=jenis==='masuk'?'Alokasi Dana':'Operasional';

  if(!tanggal){showToast('⚠️ Tanggal wajib diisi!');return;}
  if(!jumlah||jumlah<=0){showToast('⚠️ Jumlah harus lebih dari 0!');return;}

  showToast('⏳ Menyimpan...');
  try{
    await dbSaveKas({tanggal,jenis,kategori,jumlah,keterangan:ket,kandang:kandang||null,user_input:currentUser?.username||''});
    closeModal('modal-kas');
    await renderKasSaldo();
    await dbSaveLog('TAMBAH','kas_operasional',null,null,
      {tanggal,jenis,kategori,jumlah,kandang:kandang||null},
      `${jenis==='masuk'?'Alokasi':'Pengeluaran'} kas: Rp ${jumlah.toLocaleString('id-ID')}${kandang?' ('+kandang+')':''}`);
    showToast(jenis==='masuk'?'✅ Alokasi kas disimpan!':'✅ Pengeluaran kas dicatat!');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}
