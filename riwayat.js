// ═══ MODULE: riwayat ═══

// ═══ RIWAYAT ═══
let currentRTab='harian';
function switchRTab(tab){
  currentRTab=tab;
  ['harian','penjualan','kiriman'].forEach(t=>{
    document.getElementById('rtab-'+t).classList.toggle('active',t===tab);
    document.getElementById('rtab-content-'+t).style.display=t===tab?'block':'none';
  });
  renderRiwayat();
}

async function renderRiwayat(){
  await populateRiwayatKandang();
  if(currentRTab==='harian')renderRHarian();
  else if(currentRTab==='penjualan')renderRPenjualan();
  else renderRKiriman();
}

async function populateRiwayatKandang(){
  const sel=document.getElementById('r-kandang-filter');
  const prev=sel.value;
  const list=cache.get('kandang_list')||await dbGetKandang();
  sel.innerHTML='<option value="">Semua Kandang</option>';
  list.forEach(k=>{const o=document.createElement('option');o.value=k.nama;o.textContent=k.nama;sel.appendChild(o);});
  if(prev)sel.value=prev;
}

function getRFilter(){
  return{kandang:document.getElementById('r-kandang-filter').value,dari:document.getElementById('r-dari').value,sampai:document.getElementById('r-sampai').value};
}

function inRange(tgl,dari,sampai){
  if(dari&&tgl<dari)return false;
  if(sampai&&tgl>sampai)return false;
  return true;
}

async function renderRHarian(){
  const f=getRFilter();
  const rows=await dbGetInput(f);
  const tbody=document.getElementById('r-harian-tbody');
  const empty=document.getElementById('r-harian-empty');
  const isSA=currentUser?.role==='superadmin';
  const thUser=document.getElementById('th-harian-user');
  if(thUser) thUser.style.display=isSA?'':'none';
  tbody.innerHTML='';
  if(!rows.length){empty.style.display='block';return;}
  empty.style.display='none';
  rows.forEach(row=>{
    const d=row.data;if(!d)return;
    const totalPakan=((d.pakan||[]).reduce((s,p)=>s+(parseFloat(p.jumlah)||0),0)).toFixed(1);
    const pemilik=d.user||row.user_input||'';
    const sameUser=pemilik===currentUser?.username;
    const canDel=sameUser||myLevel()>=3;
    const delBtn=canDel
      ?`<button class="btn-del" onclick="deleteInputHarian('${row.id}')" title="Hapus">🗑</button>`
      :`<button class="btn-del" data-no-access onclick="deleteInputHarian('${row.id}')" title="Butuh izin atasan">🔒</button>`;
    // Kolom tracking superadmin
    const waktuEdit=row.updated_at||row.created_at||'';
    const aksiLabel=row.updated_at&&row.updated_at!==row.created_at
      ?'<span class="badge badge-orange">Edit</span>'
      :'<span class="badge badge-green">Input</span>';
    const userCell=isSA
      ?`<td style="font-size:.75rem;white-space:nowrap">${aksiLabel} <strong>${esc(pemilik)}</strong><br><span style="color:#888">${fmtTglWaktu(waktuEdit)}</span></td>`
      :'';
    const tr=document.createElement('tr');
    tr.innerHTML=
      '<td>'+fmtTgl(d.tanggal)+'</td><td>'+esc(d.kandang)+'</td>'+
      '<td>'+(d.sisa_ayam||0)+' ekor</td><td>'+(d.deplesi?d.deplesi.total:0)+' ekor</td>'+
      '<td>'+(d.produksi?d.produksi.total.butir:0)+' butir</td><td>'+(d.produksi&&d.produksi.total.kilo?parseFloat(d.produksi.total.kilo).toFixed(1):0)+' kg</td><td>'+(d.produksi?d.produksi.hdp:'—')+'</td>'+
      '<td>'+totalPakan+' kg</td><td>'+(d.air_liter||0)+' L</td>'+
      userCell+
      '<td style="white-space:nowrap"><button class="btn-edit" onclick="editInputHarian(\''+row.id+'\')">✏️</button>'+delBtn+'</td>';
    tbody.appendChild(tr);
  });
}

async function renderRPenjualan(){
  const f=getRFilter();
  const all=await dbGetPenjualan(f);
  const tbody=document.getElementById('r-jual-tbody');
  const empty=document.getElementById('r-jual-empty');
  const isSA=currentUser?.role==='superadmin';
  const thUser=document.getElementById('th-jual-user');
  if(thUser) thUser.style.display=isSA?'':'none';
  tbody.innerHTML='';let count=0;
  all.forEach(rec=>{
    (rec.rows||[]).forEach((r,i)=>{
      const tr=document.createElement('tr');
      const pemilik=rec.user_input||'—';
      const waktu=rec.created_at||'';
      const userCell=isSA&&i===0
        ?`<td rowspan="${(rec.rows||[]).length}" style="font-size:.75rem;white-space:nowrap;vertical-align:middle"><span class="badge badge-green">Input</span> <strong>${esc(pemilik)}</strong><br><span style="color:#888">${fmtTglWaktu(waktu)}</span></td>`
        :(isSA?'':'');
      tr.innerHTML='<td>'+fmtTgl(rec.tanggal)+'</td><td>'+esc(r.pelanggan||'—')+'</td><td>'+esc(r.grade||'—')+'</td><td>'+(r.butir||0)+'</td><td>'+(r.kilo||0)+' kg</td><td>Rp '+parseFloat(r.harga||0).toLocaleString('id-ID')+'</td><td>'+esc(r.total||'Rp 0')+'</td>'+userCell;
      tbody.appendChild(tr);count++;
    });
  });
  empty.style.display=count?'none':'block';
}

async function renderRKiriman(){
  const f=getRFilter();
  const all=await dbGetKiriman(f);
  const tbody=document.getElementById('r-kiriman-tbody');
  const empty=document.getElementById('r-kiriman-empty');
  const isSA=currentUser?.role==='superadmin';
  const thUser=document.getElementById('th-kiriman-user');
  if(thUser) thUser.style.display=isSA?'':'none';
  tbody.innerHTML='';let count=0;
  all.forEach(k=>{
    const total=parseFloat(k.harga_total)||0;
    const pemilik=k.user_input||'—';
    const waktu=k.created_at||'';
    const userCell=isSA
      ?`<td style="font-size:.75rem;white-space:nowrap"><span class="badge badge-green">Input</span> <strong>${esc(pemilik)}</strong><br><span style="color:#888">${fmtTglWaktu(waktu)}</span></td>`
      :'';
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+fmtTgl(k.tanggal)+'</td><td>'+esc(k.nama_pakan)+'</td><td>'+k.jumlah+' kg</td><td>Rp '+parseFloat(k.harga_per_kg||0).toLocaleString('id-ID')+'/kg</td><td>Rp '+total.toLocaleString('id-ID')+'</td><td>'+esc(k.keterangan||'—')+'</td>'+userCell;
    tbody.appendChild(tr);count++;
  });
  empty.style.display=count?'none':'block';
}

function filterRiwayat(){renderRiwayat();}

let _editRowId=null; // ID record yang sedang diedit

async function editInputHarian(id){
  const rows=await dbGetInput({});
  const row=rows.find(r=>r.id===id);
  if(!row)return;
  const d=row.data;

  // Tampilkan modal preview data asli sebelum edit
  const modal=document.getElementById('modal-edit-preview');
  if(modal){
    document.getElementById('ep-tanggal').textContent=fmtTgl(d.tanggal)||'—';
    document.getElementById('ep-kandang').textContent=d.kandang||'—';
    document.getElementById('ep-populasi').textContent=(d.sisa_ayam||0)+' ekor';
    document.getElementById('ep-mati').textContent=(d.deplesi?.mati||0)+' ekor';
    document.getElementById('ep-afkir').textContent=(d.deplesi?.afkir||0)+' ekor';
    document.getElementById('ep-normal').textContent=(d.produksi?.normal?.butir||0)+' butir / '+(d.produksi?.normal?.kilo||0)+' kg';
    document.getElementById('ep-crem').textContent=(d.produksi?.crem?.butir||(d.produksi?.cream?.butir||0))+' butir / '+(d.produksi?.crem?.kilo||(d.produksi?.cream?.kilo||0))+' kg';
    document.getElementById('ep-bentes-kering').textContent=(d.produksi?.bentes_kering?.butir||(d.produksi?.retak?.butir||0))+' butir / '+(d.produksi?.bentes_kering?.kilo||(d.produksi?.retak?.kilo||0))+' kg';
    document.getElementById('ep-ceplokan').textContent=(d.produksi?.ceplokan?.butir||0)+' butir / '+(d.produksi?.ceplokan?.kilo||0)+' kg';
    document.getElementById('ep-hdp').textContent=(d.produksi?.hdp||'—')+'%';
    // We can just append waste info directly in ep-catatan or add a new ep-waste if we had one.
    // For now we will just load it into the form.
    document.getElementById('ep-air').textContent=(d.air_liter||0)+' L';
    document.getElementById('ep-pakan').textContent=((d.pakan||[]).map(p=>p.kode+' '+p.jumlah+'kg').join(', '))||'—';
    const wasteStr = (d.waste && (d.waste.butir > 0 || d.waste.kilo > 0)) ? `\nTelur Dibuang: ${d.waste.butir||0} butir / ${d.waste.kilo||0} kg (${d.waste.ket||''})` : '';
    document.getElementById('ep-catatan').textContent=(d.catatan||'—') + wasteStr;
    document.getElementById('ep-user').textContent=(d.user||row.user_input||'—')+' · '+fmtTglWaktu(row.updated_at||row.created_at||'');
    _editRowId=id;
    modal.style.display='flex';
    return;
  }
  // Fallback jika modal tidak ada
  _loadEditToForm(d,id);
}

function _loadEditToForm(d,id){
  _editRowId=id;
  switchPage('input');
  setTimeout(()=>{
    document.getElementById('tanggal').value=d.tanggal||'';
    document.getElementById('kandang').value=d.kandang||'';
    document.getElementById('mati').value=d.deplesi?d.deplesi.mati:0;
    document.getElementById('afkir').value=d.deplesi?d.deplesi.afkir:0;
    document.getElementById('populasi_awal').value=d.sisa_ayam||0;
    document.getElementById('air_liter').value=d.air_liter||0;
    document.getElementById('p_normal_butir').value=d.produksi?.normal?.butir||0;
    document.getElementById('p_normal_kilo').value=d.produksi?.normal?.kilo||0;
    document.getElementById('p_crem_butir').value=d.produksi?.crem?.butir||(d.produksi?.cream?.butir||0);
    document.getElementById('p_crem_kilo').value=d.produksi?.crem?.kilo||(d.produksi?.cream?.kilo||0);
    document.getElementById('p_bentes_kering_butir').value=d.produksi?.bentes_kering?.butir||(d.produksi?.retak?.butir||0);
    document.getElementById('p_bentes_kering_kilo').value=d.produksi?.bentes_kering?.kilo||(d.produksi?.retak?.kilo||0);
    document.getElementById('p_ceplokan_butir').value=d.produksi?.ceplokan?.butir||0;
    document.getElementById('p_ceplokan_kilo').value=d.produksi?.ceplokan?.kilo||0;
    document.getElementById('waste_butir').value=d.waste?.butir||0;
    document.getElementById('waste_kilo').value=d.waste?.kilo||0;
    document.getElementById('waste_ket').value=d.waste?.ket||'';
    document.getElementById('catatan').value=d.catatan||'';
    const hpEl = document.getElementById('harga_pasar');
    if(hpEl) {
      hpEl.value = d.harga_pasar ? parseInt(d.harga_pasar, 10).toLocaleString('id-ID') : '';
      // Jika sudah ada harga pasar, set readonly sebagai review (kecuali superadmin)
      if(d.harga_pasar && parseFloat(d.harga_pasar) > 0 && currentUser?.role !== 'superadmin') {
        hpEl.readOnly = true;
        hpEl.style.opacity = '0.7';
        hpEl.title = 'Sudah diinput sebelumnya';
      } else {
        hpEl.readOnly = false;
        hpEl.style.opacity = '';
        hpEl.title = '';
      }
    }

    // Load pakan rows
    const pakanList=document.getElementById('pakan-list');
    pakanList.innerHTML=''; // clear existing
    if(d.pakan&&d.pakan.length>0){
      d.pakan.forEach(p=>{
        const row=document.createElement('div');row.className='row pakan-row';
        row.innerHTML='<div class="field"><label>Kode Pakan</label><select class="pakan-select" style="border:1.5px solid #e2e8f0;border-radius:7px;padding:8px 10px;font-size:.9rem;width:100%;background:#fff"><option value="">-- Pilih Pakan --</option></select></div><div class="field"><label>Jumlah (kg)</label><input type="number" min="0" step="0.1" placeholder="0" oninput="calcAir()"/></div><div style="display:flex;align-items:flex-end"><button class="btn-del" onclick="removeRow(this,\'pakan-list\',\'pakan-row\')">✕</button></div>';
        pakanList.appendChild(row);
        populatePakanSelect(row.querySelector('.pakan-select'));
        row.querySelector('.pakan-select').value=p.kode||'';
        row.querySelector('input[type="number"]').value=p.jumlah||0;
      });
    } else {
      addPakan(); // minimal 1 row kosong
    }

    // Load kesehatan rows (format baru dengan dropdown)
    populateKesRows(d.kesehatan);

    updatePeriodBar();calcSisa();calcAir();calcProduksi();
  },200);
}

async function confirmEditLanjut(){
  closeModal('modal-edit-preview');
  const rows=await dbGetInput({});
  const row=rows.find(r=>r.id===_editRowId);
  if(!row)return;
  _loadEditToForm(row.data,_editRowId);
}

// ═══ HAPUS UNIVERSAL — role-based ═══
let _hapusFn=null; // fungsi yang akan dieksekusi setelah konfirmasi

function showHapusModal({judul, deskripsi, warning, canDelete, onConfirm}){
  document.getElementById('hapus-info').innerHTML=
    `<strong>${judul}</strong><br><span style="color:#6b7280">${deskripsi}</span>`;
  const warnEl=document.getElementById('hapus-warning');
  if(warning){warnEl.style.display='block';warnEl.innerHTML=warning;}
  else{warnEl.style.display='none';}
  const btnConfirm=document.getElementById('btn-hapus-confirm');
  btnConfirm.style.display=canDelete?'':'none';
  _hapusFn=canDelete?onConfirm:null;
  document.getElementById('modal-hapus').style.display='flex';
}

async function executeHapus(){
  closeModal('modal-hapus');
  if(_hapusFn)await _hapusFn();
  _hapusFn=null;
}

// Helper: cek role lebih tinggi dari user lain
const ROLE_LEVEL={viewer:0,staff:1,operator:2,supervisor:3,manajer:4,admin:5,superadmin:6};
function roleLevel(r){return ROLE_LEVEL[r]??0;}
function myLevel(){return roleLevel(currentUser?.role);}

// ── Hapus Input Harian ──
async function deleteInputHarian(id){
  // Ambil data dulu untuk cek siapa yang input
  const rows=await dbGetInput({});
  const row=rows.find(r=>r.id===id);
  const pemilik=row?.data?.user||row?.user_input||'—';
  const tgl=row?.data?.tanggal||'';
  const knd=row?.data?.kandang||'';
  const sameUser=pemilik===currentUser?.username;
  const pemilikLevel=roleLevel((await dbGetUsers()).find(u=>u.username===pemilik)?.role||'');
  const canDelete=sameUser||(myLevel()>pemilikLevel)||(myLevel()>=3);

  showHapusModal({
    judul:`Hapus Input Harian`,
    deskripsi:`📅 ${tgl} — ${knd}<br>Diinput oleh: <strong>${esc(pemilik)}</strong>`,
    warning: !canDelete
      ?`🚫 Anda tidak berwenang menghapus data yang diinput oleh <strong>${esc(pemilik)}</strong>. Hubungi Manajer atau Admin.`
      :(!sameUser&&myLevel()<=2
        ?`⚠️ Data ini diinput oleh <strong>${esc(pemilik)}</strong>. Pastikan sudah mendapat persetujuan atasan sebelum menghapus.`
        :null),
    canDelete,
    onConfirm:async()=>{
      try{
        await dbSaveLog('HAPUS','input_harian',id,row?.data,null,`Hapus data harian ${tgl} kandang ${knd}`);
        await dbDeleteInput(id);await renderRHarian();showToast('🗑 Data dihapus.');
      }
      catch(e){showToast('❌ Gagal menghapus.');}
    }
  });
}

// ── Hapus Kandang ──
async function deleteKandang(id){
  const list=cache.get('kandang_list')||await dbGetKandang();
  const k=list.find(x=>x.id===id);
  const canDelete=can('KEUANGAN'); // admin & manajer

  showHapusModal({
    judul:`Hapus Kandang`,
    deskripsi:`🏠 <strong>${esc(k?.nama||id)}</strong><br>Populasi: ${k?.populasi||0} ekor · Status: ${k?.status||'—'}`,
    warning: !canDelete
      ?`🚫 Hanya Manajer dan Admin yang dapat menghapus kandang. Hubungi atasan Anda.`
      :`⚠️ Menghapus kandang akan menghilangkan semua referensi kandang ini. Pastikan tidak ada data aktif.`,
    canDelete,
    onConfirm:async()=>{
      try{
        await dbDeleteKandang(id);
        await renderKandangTable();
        await populateKandangSelects();
        await dbSaveLog('HAPUS','kandang',id,k,null,`Hapus kandang: ${k?.nama||id}`);
        showToast('🗑 Kandang dihapus.');
      }catch(e){showToast('❌ Gagal menghapus.');}
    }
  });
}

// ── Hapus User ──
async function deleteUser(id, username){
  // Hard delete — hanya superadmin
  if(currentUser?.role !== 'superadmin'){showToast('🔒 Hanya Superadmin yang bisa hapus permanen!');return;}
  if(username === currentUser?.username){showToast('⚠️ Tidak bisa hapus akun sendiri!');return;}
  const users = await dbGetUsers();
  const u = users.find(x => x.id === id);
  if(u?.role === 'superadmin'){showToast('🔒 Superadmin tidak dapat dihapus!');return;}

  showHapusModal({
    judul: 'Hapus Permanen User',
    deskripsi: `👤 <strong>${esc(username)}</strong> · Role: ${u?.role||'—'}`,
    warning: `⚠️ Hapus permanen tidak bisa dibatalkan. User tidak akan bisa login lagi dan semua data terkait akan terputus.`,
    canDelete: true,
    onConfirm: async () => {
      try{
        await dbDeleteUser(id);
        await renderUserTable();
        await dbSaveLog('HAPUS','users',id,{username,role:u?.role},null,`Hapus permanen user: ${username}`);
        showToast('🗑 User dihapus permanen.');
      }catch(e){showToast('❌ Gagal menghapus.');}
    }
  });
}

async function softDeleteUser(id, username){
  // Soft delete — nonaktifkan user (admin bisa)
  if(!['admin','superadmin'].includes(currentUser?.role)){showToast('⚠️ Tidak ada akses!');return;}
  if(username === currentUser?.username){showToast('⚠️ Tidak bisa nonaktifkan akun sendiri!');return;}
  if(!confirm(`Nonaktifkan user "${username}"? User tidak bisa login tapi data tetap tersimpan.`)) return;
  try{
    await dbSaveUser({...(await dbGetUsers()).find(u=>u.id===id)||{id}, active: false});
    cache.del('users');
    await renderUserTable();
    await dbSaveLog('NONAKTIF','users',id,{active:true},{active:false},`Nonaktifkan user: ${username}`);
    showToast(`🚫 User "${username}" dinonaktifkan.`);
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

async function activateUser(id, username){
  if(!['admin','superadmin'].includes(currentUser?.role)){showToast('⚠️ Tidak ada akses!');return;}
  try{
    await dbSaveUser({...(await dbGetUsers()).find(u=>u.id===id)||{id}, active: true});
    cache.del('users');
    await renderUserTable();
    await dbSaveLog('AKTIFKAN','users',id,{active:false},{active:true},`Aktifkan kembali user: ${username}`);
    showToast(`✅ User "${username}" diaktifkan kembali.`);
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

// ── Hapus Daftar Pakan ──
async function deletePakan(id){
  if(!can('KEUANGAN')){showToast('⚠️ Hanya Admin/Manajer yang bisa hapus pakan!');return;}
  const list=cache.get('daftar_pakan')||await dbGetDaftarPakan();
  const p=list.find(x=>x.id===id);

  showHapusModal({
    judul:`Hapus Pakan`,
    deskripsi:`🌾 <strong>${esc(p?.nama||id)}</strong><br>Min. stok: ${p?.stok_minimal||0} kg`,
    warning:`⚠️ Menghapus pakan akan menghilangkan data dari semua dropdown input. Pastikan tidak ada stok aktif.`,
    canDelete:true,
    onConfirm:async()=>{
      try{
        await dbDeleteDaftarPakan(id);
        await renderGudang();
        await dbSaveLog('HAPUS','daftar_pakan',id,p,null,`Hapus pakan: ${p?.nama||id}`);
        showToast('🗑 Pakan dihapus.');
      }
      catch(e){showToast('❌ Gagal menghapus.');}
    }
  });
}

// ── Hapus Kiriman Pakan ──
async function deleteKiriman(id){
  if(!can('KEUANGAN')){showToast('⚠️ Hanya Admin/Manajer yang bisa hapus kiriman!');return;}
  const kiriman=cache.get('kiriman_pakan')||await dbGetKiriman({});
  const k=kiriman.find(x=>x.id===id);

  showHapusModal({
    judul:`Hapus Kiriman Pakan`,
    deskripsi:`🚚 <strong>${esc(k?.nama_pakan||'—')}</strong> ${k?.jumlah||0} kg dari ${esc(k?.supplier||'—')}`,
    warning:`⚠️ Menghapus kiriman akan mempengaruhi kalkulasi stok pakan secara otomatis.`,
    canDelete:true,
    onConfirm:async()=>{
      try{
        await dbDeleteKiriman(id);
        await renderGudang();
        await dbSaveLog('HAPUS','kiriman_pakan',id,k,null,
          `Hapus kiriman: ${k?.nama_pakan||'—'} ${k?.jumlah||0}kg tgl ${k?.tanggal||'—'}`);
        showToast('🗑 Kiriman dihapus.');
      }
      catch(e){showToast('❌ Gagal menghapus.');}
    }
  });
}

async function exportRiwayat(){
  const today=new Date().toISOString().split('T')[0];
  if(currentRTab==='harian'){
    const f=getRFilter();
    const rows=await dbGetInput(f);
    if(!rows.length){showToast('⚠️ Tidak ada data untuk diexport!');return;}
    const headers=['Tanggal','Kandang','Sisa Ayam','Deplesi','Prod Butir','Prod Kilo','HDP','Pakan (kg)','Air (L)'];
    const data=rows.map(row=>{
      const d=row.data;if(!d)return null;
      const tp=((d.pakan||[]).reduce((s,p)=>s+(parseFloat(p.jumlah)||0),0)).toFixed(1);
      return[d.tanggal,d.kandang,d.sisa_ayam||0,d.deplesi?d.deplesi.total:0,d.produksi?d.produksi.total.butir:0,d.produksi&&d.produksi.total.kilo?parseFloat(d.produksi.total.kilo).toFixed(1):0,d.produksi?d.produksi.hdp:'',tp,d.air_liter||0];
    }).filter(Boolean);
    await exportExcel('Riwayat Harian',headers,data,'riwayat_harian_'+today+'.xlsx');
  } else if(currentRTab==='penjualan'){
    const all=await dbGetPenjualan({});
    if(!all.length){showToast('⚠️ Tidak ada data untuk diexport!');return;}
    const headers=['Tanggal','Pelanggan','Grade','Butir','Kilo (kg)','Harga/kg (Rp)','Total (Rp)'];
    const data=[];
    all.forEach(rec=>{(rec.rows||[]).forEach(r=>{data.push([rec.tanggal,r.pelanggan||'',r.grade||'',r.butir||0,r.kilo||0,r.harga||0,String(r.total||'').replace(/[^0-9]/g,'')]);});});
    await exportExcel('Riwayat Penjualan',headers,data,'riwayat_penjualan_'+today+'.xlsx');
  } else {
    const kiriman=await dbGetKiriman({});
    if(!kiriman.length){showToast('⚠️ Tidak ada data untuk diexport!');return;}
    const headers=['Tanggal','Pakan','Jumlah (kg)','Harga/kg (Rp)','Total (Rp)','Supplier','Keterangan'];
    const data=kiriman.map(k=>[k.tanggal,k.nama_pakan,k.jumlah,k.harga_per_kg||0,parseFloat(k.harga_total)||0,k.supplier||'',k.keterangan||'']);
    await exportExcel('Riwayat Kiriman Pakan',headers,data,'riwayat_kiriman_'+today+'.xlsx');
  }
}
