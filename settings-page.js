// ═══ MODULE: settings-page ═══

function renderSettings(){
  const isSuperadmin = currentUser?.role === 'superadmin';

  // Tab Standar Performa — superadmin only
  const tabStandar = document.getElementById('stab-standar');
  if(tabStandar) tabStandar.style.display = isSuperadmin ? '' : 'none';

  // Tab Backup — superadmin only
  const tabBackup = document.getElementById('stab-backup');
  if(tabBackup) tabBackup.style.display = isSuperadmin ? '' : 'none';

  switchSTab('standar');
}

let currentSTab='standar';
function switchSTab(tab){
  currentSTab=tab;
  ['standar','backup'].forEach(t=>{
    const btn = document.getElementById('stab-'+t);
    const content = document.getElementById('stab-content-'+t);
    if(btn) btn.classList.toggle('active',t===tab);
    if(content) content.style.display=t===tab?'block':'none';
  });
  if(tab==='standar') renderStandarPerforma();
  if(tab==='backup') loadCacheInfo();
}

async function renderKandangTable(){
  const list=await dbGetKandang();
  cache.set('kandang_list',list);
  const tbody=document.getElementById('kandang-tbody');
  const empty=document.getElementById('kandang-empty');
  tbody.innerHTML='';
  if(!list.length){empty.style.display='block';return;}
  empty.style.display='none';
  list.forEach((k,i)=>{
    const cin=k.chickin?new Date(k.chickin):null;
    const days=cin?Math.floor((new Date()-cin)/86400000):0;
    const periode=k.chickin?(k.status==='Aktif'?'Hari ke-'+(days+1)+' (berjalan)':days+' hari'):'—';
    const tr=document.createElement('tr');
    tr.innerHTML='<td><strong>'+esc(k.nama)+'</strong>'+(k.sistem==='kemitraan'?'<br><span style="font-size:.65rem;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:4px">🤝 '+esc(k.nama_inti||'Kemitraan')+'</span>':'')+'</td><td>'+(k.kapasitas||'—')+' ekor</td><td>'+fmtTgl(k.chickin)+'</td><td>'+(k.umur_masuk?k.umur_masuk+' hari':'—')+'</td><td>'+(k.populasi||'—')+' ekor</td><td style="font-size:.8rem">'+periode+'</td><td>'+(k.status==='Aktif'?'<span class="badge badge-green">Aktif</span>':'<span class="badge badge-gray">Selesai</span>')+'</td><td style="white-space:nowrap">'+
      '<button class="btn-edit" onclick="openKandangModal(\''+k.id+'\')">✏️</button>'+
      (can('KEUANGAN')
        ?'<button class="btn-del" onclick="deleteKandang(\''+k.id+'\')" title="Hapus Kandang">🗑</button>'
        :'<button class="btn-del" data-no-access onclick="deleteKandang(\''+k.id+'\')" title="Butuh izin Manajer/Admin">🔒</button>')+
      '<button class="btn-edit" style="background:#ede9fe;color:#6d28d9" onclick="showRingkasanSiklus(\''+esc(k.nama)+'\')">📋</button>'+
      '</td>';
    tbody.appendChild(tr);
  });
}

async function openKandangModal(id){
  const list=cache.get('kandang_list')||await dbGetKandang();
  const k=id?list.find(x=>x.id===id):null;
  document.getElementById('modal-kandang-title').textContent=k?'Edit Kandang':'Tambah Kandang';
  document.getElementById('mk-id').value=k?k.id:'';
  document.getElementById('mk-nama').value=k?k.nama:'';
  document.getElementById('mk-kapasitas').value=k?k.kapasitas:'';
  document.getElementById('mk-chickin').value=k?k.chickin:'';
  document.getElementById('mk-umur').value=k?(k.umur_masuk||0):0;
  document.getElementById('mk-populasi').value=k?k.populasi:'';
  document.getElementById('mk-harga-pullet').value=k?(k.harga_pullet||0):0;
  document.getElementById('mk-sistem').value=k?(k.sistem||'mandiri'):'mandiri';
  document.getElementById('mk-nama-inti').value=k?(k.nama_inti||''):'';
  document.getElementById('mk-harga-kontrak').value=k?(k.harga_kontrak||''):'';
  document.getElementById('mk-persen-mitra').value=k?(k.persen_mitra||30):30;
  document.getElementById('mk-persen-inti').value=k?(k.persen_inti||70):70;
  document.getElementById('mk-status').value=k?k.status:'Aktif';
  toggleKemitraanFields();
  document.getElementById('modal-kandang').style.display='flex';
  calcUmurKandang();
}

function toggleKemitraanFields(){
  const sistem=document.getElementById('mk-sistem').value;
  document.getElementById('mk-kemitraan-fields').style.display=sistem==='kemitraan'?'block':'none';
}

function calcUmurKandang(){
  const chickin=document.getElementById('mk-chickin').value;
  const umurMasuk=parseInt(document.getElementById('mk-umur').value)||0;
  const preview=document.getElementById('mk-umur-preview');
  if(!chickin){preview.textContent='';return;}
  const today=new Date();today.setHours(0,0,0,0);
  const cin=new Date(chickin);cin.setHours(0,0,0,0);
  const hariSejak=Math.floor((today-cin)/86400000);
  const totalHari=umurMasuk+(hariSejak>=0?hariSejak:0);
  const mg=Math.floor(totalHari/7);
  const hr=totalHari%7;
  preview.textContent=`📅 Umur hari ini: ${mg} mg ${hr} hari (${totalHari} hari total)`;
}

async function saveKandang(){
  const nama=document.getElementById('mk-nama').value.trim();
  const kapasitas=parseInt(document.getElementById('mk-kapasitas').value)||0;
  const populasi=parseInt(document.getElementById('mk-populasi').value)||0;
  const chickin=document.getElementById('mk-chickin').value||null;
  const sistem=document.getElementById('mk-sistem').value||'mandiri';

  if(!nama){showToast('⚠️ Nama kandang wajib diisi!');return;}
  if(kapasitas<=0){showToast('⚠️ Kapasitas harus lebih dari 0!');return;}
  if(populasi<=0){showToast('⚠️ Populasi masuk harus lebih dari 0!');return;}
  if(populasi>kapasitas){showToast('⚠️ Populasi tidak boleh melebihi kapasitas!');return;}
  if(chickin){
    const today=new Date().toISOString().split('T')[0];
    if(chickin>today){showToast('⚠️ Tanggal Periode tidak boleh di masa depan!');return;}
  }

  // Validasi kemitraan
  if(sistem==='kemitraan'){
    const namaInti=document.getElementById('mk-nama-inti').value.trim();
    const hargaKontrak=parseFloat(document.getElementById('mk-harga-kontrak').value)||0;
    if(!namaInti){showToast('⚠️ Nama perusahaan inti wajib diisi!');return;}
    if(hargaKontrak<=0){showToast('⚠️ Harga kontrak wajib diisi!');return;}
  }

  const id=document.getElementById('mk-id').value;
  const obj={
    nama,
    kapasitas,
    chickin,
    umur_masuk:parseInt(document.getElementById('mk-umur').value)||null,
    populasi,
    harga_pullet:parseFloat(document.getElementById('mk-harga-pullet').value)||null,
    sistem,
    nama_inti:sistem==='kemitraan'?document.getElementById('mk-nama-inti').value.trim():'',
    harga_kontrak:sistem==='kemitraan'?parseFloat(document.getElementById('mk-harga-kontrak').value)||0:0,
    persen_mitra:sistem==='kemitraan'?parseFloat(document.getElementById('mk-persen-mitra').value)||30:0,
    persen_inti:sistem==='kemitraan'?parseFloat(document.getElementById('mk-persen-inti').value)||70:0,
    status:document.getElementById('mk-status').value
  };
  if(id)obj.id=id;
  showToast('⏳ Menyimpan...');
  try{
    await dbSaveKandang(obj);
    closeModal('modal-kandang');
    await renderKandangTable();
    await populateKandangSelects();
    await dbSaveLog(id?'EDIT':'TAMBAH','kandang',obj.id||null,null,obj,
      `${id?'Edit':'Tambah'} kandang: ${nama}`);
    showToast('✅ Kandang disimpan!');
  }catch(e){showToast('❌ Gagal menyimpan: '+e.message);}
}

// ═══ SETTINGS — USER ═══
async function renderUserTable(){
  const isSuperadmin = currentUser?.role === 'superadmin';
  const isAdmin      = currentUser?.role === 'admin' || isSuperadmin;
  document.getElementById('user-noaccess').style.display = isAdmin ? 'none' : 'block';
  document.getElementById('user-section').style.display  = isAdmin ? 'block' : 'none';
  if(!isAdmin) return;

  const users = await dbGetUsers();
  const tbody = document.getElementById('user-tbody');
  tbody.innerHTML = '';

  const roleBadge = {
    superadmin: '<span class="badge" style="background:#1e1b4b;color:#a5b4fc">⭐ Superadmin</span>',
    admin:      '<span class="badge badge-blue">Admin</span>',
    manajer:    '<span class="badge badge-green">Manajer</span>',
    supervisor: '<span class="badge" style="background:#ede9fe;color:#6d28d9">Supervisor</span>',
    operator:   '<span class="badge badge-orange">Operator</span>',
    staff:      '<span class="badge badge-gray">Staff</span>',
    viewer:     '<span class="badge" style="background:#f1f5f9;color:#64748b">👁 Viewer</span>'
  };

  users.forEach(u => {
    const isSelf            = u.username === currentUser.username;
    const targetIsSuperadmin = u.role === 'superadmin';
    const isActive          = u.active !== false;

    // Superadmin tidak bisa diedit kecuali oleh dirinya sendiri
    const canEdit = isSelf || (isSuperadmin && !targetIsSuperadmin) || (!targetIsSuperadmin && isAdmin);

    // Hapus permanen: hanya superadmin, dan tidak bisa hapus diri sendiri atau superadmin lain
    const canHardDelete = isSuperadmin && !targetIsSuperadmin && !isSelf;

    // Nonaktifkan (soft-delete): admin bisa, tapi tidak bisa ke superadmin atau diri sendiri
    const canSoftDelete = isAdmin && !targetIsSuperadmin && !isSelf && isActive;

    // Aktifkan kembali: admin bisa aktifkan user yang nonaktif
    const canActivate = isAdmin && !targetIsSuperadmin && !isSelf && !isActive;

    const statusBadge = isActive
      ? '<span class="badge badge-green">Aktif</span>'
      : '<span class="badge badge-gray">Nonaktif</span>';

    let aksiHtml = '';
    if(canEdit)        aksiHtml += `<button class="btn-edit" onclick="openUserModal('${u.id}')" title="Edit">✏️</button>`;
    if(canSoftDelete)  aksiHtml += `<button class="btn-del" style="background:#fef3c7;color:#92400e" onclick="softDeleteUser('${u.id}','${esc(u.username)}')" title="Nonaktifkan">🚫</button>`;
    if(canActivate)    aksiHtml += `<button class="btn-edit" style="background:#d8f3dc;color:#1b4332" onclick="activateUser('${u.id}','${esc(u.username)}')" title="Aktifkan kembali">✅</button>`;
    if(canHardDelete)  aksiHtml += `<button class="btn-del" onclick="deleteUser('${u.id}','${esc(u.username)}')" title="Hapus permanen">🗑</button>`;

    const tr = document.createElement('tr');
    // Baris user nonaktif ditampilkan lebih redup
    if(!isActive) tr.style.opacity = '0.55';
    tr.innerHTML =
      `<td><strong>${esc(u.username)}</strong>${targetIsSuperadmin?' 🔒':''}</td>`+
      `<td>${roleBadge[u.role] || `<span class="badge badge-gray">${esc(u.role)}</span>`}</td>`+
      `<td>${statusBadge}</td>`+
      `<td>${aksiHtml}</td>`;
    tbody.appendChild(tr);
  });
}

async function openUserModal(id){
  const users=await dbGetUsers();
  const u=id?users.find(x=>x.id===id):null;
  // superadmin hanya bisa edit dirinya sendiri
  if(u?.role==='superadmin'&&currentUser?.role!=='superadmin'){showToast('🔒 Tidak bisa mengedit Superadmin!');return;}
  document.getElementById('modal-user-title').textContent=u?'Edit User':'Tambah User';
  document.getElementById('mu-id').value=u?u.id:'';
  document.getElementById('mu-username').value=u?u.username:'';
  document.getElementById('mu-password').value=u?u.password:'';
  // Tampilkan opsi superadmin hanya jika login sebagai superadmin
  const roleSelect=document.getElementById('mu-role');
  const hasSuperadmin=roleSelect.querySelector('option[value="superadmin"]');
  if(currentUser?.role==='superadmin'&&!hasSuperadmin){
    const opt=document.createElement('option');opt.value='superadmin';opt.textContent='⭐ Superadmin';
    roleSelect.insertBefore(opt,roleSelect.firstChild);
  } else if(currentUser?.role!=='superadmin'&&hasSuperadmin){
    roleSelect.removeChild(hasSuperadmin);
  }
  roleSelect.value=u?u.role:'operator';
  document.getElementById('modal-user').style.display='flex';
}

async function saveUser(){
  const uname=document.getElementById('mu-username').value.trim();
  const pw=document.getElementById('mu-password').value.trim();
  const id=document.getElementById('mu-id').value;

  if(!uname){showToast('⚠️ Username wajib diisi!');return;}
  if(!/^[a-zA-Z0-9_]+$/.test(uname)){showToast('⚠️ Username hanya boleh huruf, angka, dan underscore!');return;}
  if(uname.length<3){showToast('⚠️ Username minimal 3 karakter!');return;}
  if(!pw){showToast('⚠️ Password wajib diisi!');return;}
  if(pw.length<6){showToast('⚠️ Password minimal 6 karakter!');return;}

  const obj={username:uname,password:pw,role:document.getElementById('mu-role').value,active:true};
  if(id)obj.id=id;
  showToast('⏳ Menyimpan...');
  try{
    await dbSaveUser(obj);
    closeModal('modal-user');
    await renderUserTable();
    await dbSaveLog(id?'EDIT':'TAMBAH','users',obj.id||null,null,
      {username:uname,role:obj.role},
      `${id?'Edit':'Tambah'} user: ${uname} (${obj.role})`);
    showToast('✅ User disimpan!');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

// ═══ UTILS ═══

function toggleSettings(){
  const menu=document.getElementById('settings-menu');
  menu.classList.toggle('show');
}

function goSettings(tab){
  switchPage('settings');
  if(tab) switchSTab(tab);
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.querySelector('.settings-dropdown');
  const menu = document.getElementById('settings-menu');
  if(dropdown && menu && !dropdown.contains(e.target)){
    menu.classList.remove('show');
  }
});
// Close dropdown when clicking outside
document.addEventListener('click',function(e){
  const dropdown=document.querySelector('.settings-dropdown');
  const menu=document.getElementById('settings-menu');
  if(dropdown && menu && !dropdown.contains(e.target)){
    menu.classList.remove('show');
  }
});

// ═══ DARK MODE ═══
function toggleDark(){
  const isDark=document.body.classList.toggle('dark');
  localStorage.setItem('darkMode',isDark?'1':'0');
  // Update dropdown icons/text
  const icon=document.getElementById('dark-icon');
  const text=document.getElementById('dark-text');
  if(icon)icon.textContent=isDark?'☀️':'🌙';
  if(text)text.textContent=isDark?'Mode Terang':'Mode Gelap';
  // Update old button if exists
  const btn=document.getElementById('btn-dark');
  if(btn)btn.textContent=isDark?'☀️':'🌙';
}
function initDarkMode(){
  if(localStorage.getItem('darkMode')==='1'){
    document.body.classList.add('dark');
    // Update dropdown
    const icon=document.getElementById('dark-icon');
    const text=document.getElementById('dark-text');
    if(icon)icon.textContent='☀️';
    if(text)text.textContent='Mode Terang';
    // Update old button if exists
    const btn=document.getElementById('btn-dark');
    if(btn)btn.textContent='☀️';
  }
}
