// ═══ MODULE: biaya ═══

// ═══ BIAYA OPERASIONAL ═══
const BIAYA_ROLES=['superadmin','admin','manajer','supervisor'];

function canInputBiaya(){
  return currentUser&&BIAYA_ROLES.includes(currentUser.role);
}


// ═══ CATEGORY PICKER ═══
let _catPickerTarget=null;

function openCatPicker(btn){
  const dd=document.getElementById('cat-dropdown');
  const overlay=document.getElementById('cat-sheet-overlay');
  if(_catPickerTarget===btn&&!dd.classList.contains('hidden')){
    closeCatPicker();return;
  }
  document.removeEventListener('click',outsideCatClick);
  _catPickerTarget=btn;
  const curVal=btn.closest('.cat-picker-wrap').previousElementSibling?.value||'tenaga_harian';
  dd.querySelectorAll('.cat-option').forEach(o=>{
    o.classList.toggle('selected',o.dataset.val===curVal);
  });
  dd.classList.remove('hidden');
  overlay.classList.remove('hidden');
  requestAnimationFrame(()=>{
    dd.classList.add('active');
    overlay.classList.add('active');
  });
}

function outsideCatClick(e){
  const dd=document.getElementById('cat-dropdown');
  if(dd.contains(e.target)||(_catPickerTarget&&_catPickerTarget.contains(e.target)))return;
  document.removeEventListener('click',outsideCatClick);
  closeCatPicker();
}

function closeCatPicker(){
  const dd=document.getElementById('cat-dropdown');
  const overlay=document.getElementById('cat-sheet-overlay');
  dd.classList.remove('active');
  overlay.classList.remove('active');
  document.removeEventListener('click',outsideCatClick);
  _catPickerTarget=null;
  setTimeout(()=>{dd.classList.add('hidden');overlay.classList.add('hidden');},280);
}

function selectCatOption(el){
  if(!_catPickerTarget)return;
  const val=el.dataset.val;
  const icon=el.dataset.icon;
  const label=el.dataset.label;
  // Update hidden input
  const wrap=_catPickerTarget.closest('.cat-picker-wrap');
  const hidden=wrap.previousElementSibling;
  if(hidden)hidden.value=val;
  // Update tombol tampilan
  _catPickerTarget.querySelector('.cpb-icon').textContent=icon;
  _catPickerTarget.querySelector('.cpb-label').textContent=label;
  closeCatPicker();
}

// Pasang event ke cat-option via delegation (handle static + dynamic rows)
document.addEventListener('click',e=>{
  const o=e.target.closest('.cat-option');
  if(o&&document.getElementById('cat-dropdown').contains(o))selectCatOption(o);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){
    const o=e.target.closest('.cat-option');
    if(o&&document.getElementById('cat-dropdown').contains(o)){e.preventDefault();selectCatOption(o);}
  }
});

function makeCatPickerHTML(defaultVal='tenaga_harian'){
  const cats={
    tenaga_harian:{icon:'👷',label:'Tenaga Harian / Lembur'},
    bbm_energi:{icon:'⛽',label:'BBM & Energi'},
    listrik_air:{icon:'💡',label:'Listrik & Air'},
    peralatan_farm:{icon:'🔧',label:'Peralatan Farm'},
    mess_fasilitas:{icon:'🏠',label:'Mess & Fasilitas'},
    kesehatan:{icon:'💊',label:'Kesehatan Ternak'},
    transportasi:{icon:'🚛',label:'Transportasi'},
    lainnya:{icon:'📦',label:'Lainnya'}
  };
  const c=cats[defaultVal]||cats.tenaga_harian;
  return `<input type="hidden" class="biaya-kategori-val" value="${defaultVal}"/>
    <div class="cat-picker-wrap">
      <button type="button" class="cat-picker-btn" onclick="openCatPicker(this)">
        <span class="cpb-icon">${c.icon}</span>
        <span class="cpb-label">${c.label}</span>
        <span class="cpb-arrow">▼</span>
      </button>
    </div>`;
}

function buildBiayaRowHTML(kategori='tenaga_harian'){
  return '<div class="field"><label>Kategori</label>'+makeCatPickerHTML(kategori)+'</div>'+
    '<div class="field" style="flex:2"><label>Keterangan</label><input type="text" placeholder="Mis. Gaji harian, BBM genset, dll."/></div>'+
    '<div class="field"><label>Jumlah (Rp)</label><input type="number" min="0" step="1000" placeholder="0" oninput="calcTotalBiaya()"/></div>'+
    '<div style="display:flex;align-items:flex-end"><button class="btn-del" onclick="removeBiayaRow(this)">✕</button></div>';
}

function addBiayaRow(){
  const list=document.getElementById('biaya-list');
  const row=document.createElement('div');
  row.className='row biaya-row';
  row.innerHTML=buildBiayaRowHTML();
  list.appendChild(row);
}

function removeBiayaRow(btn){
  const list=document.getElementById('biaya-list');
  if(list.querySelectorAll('.biaya-row').length<=1)return;
  btn.closest('.biaya-row').remove();
  calcTotalBiaya();
}

function calcTotalBiaya(){
  let total=0;
  document.querySelectorAll('.biaya-row input[type="number"]').forEach(i=>{total+=parseFloat(i.value)||0;});
  document.getElementById('total_biaya').value=total?'Rp '+total.toLocaleString('id-ID'):'Rp 0';
}

function getBiayaRows(){
  return [...document.querySelectorAll('.biaya-row')].map(r=>{
    const ketInput=r.querySelector('input[type="text"]');
    const jmlInput=r.querySelector('input[type="number"]');
    const katInput=r.querySelector('.biaya-kategori-val');
    return{ket:ketInput?.value||'',kategori:katInput?katInput.value:'lainnya',jumlah:parseFloat(jmlInput?.value)||0};
  }).filter(b=>b.ket||b.jumlah);
}

function resetBiayaRows(){
  const list=document.getElementById('biaya-list');
  [...list.querySelectorAll('.biaya-row')].slice(1).forEach(r=>r.remove());
  const first=list.querySelector('.biaya-row');
  if(first){
    first.querySelectorAll('input[type="text"],input[type="number"]').forEach(i=>i.value='');
    const katInput=first.querySelector('.biaya-kategori-val');
    if(katInput){katInput.value='tenaga_harian';}
    const btn=first.querySelector('.cat-picker-btn');
    if(btn){btn.querySelector('.cpb-icon').textContent='👷';btn.querySelector('.cpb-label').textContent='Tenaga Harian / Lembur';}
  }
  calcTotalBiaya();
}

// ═══ BIAYA OPERASIONAL PAGE ═══
async function saveBiayaData(){
  const tanggal=document.getElementById('biaya-tanggal').value;
  const kandang=document.getElementById('biaya-kandang').value;
  if(!tanggal){showToast('⚠️ Pilih tanggal!');return;}
  const biayaRows=getBiayaRows();
  if(biayaRows.length===0){showToast('⚠️ Tambahkan minimal 1 biaya!');return;}

  // Validasi setiap baris biaya
  for(let i=0;i<biayaRows.length;i++){
    const b=biayaRows[i];
    const no=i+1;
    if(!b.jumlah||b.jumlah<=0){showToast(`⚠️ Baris ${no}: Jumlah biaya harus lebih dari 0!`);return;}
    if(!b.ket){showToast(`⚠️ Baris ${no}: Keterangan wajib diisi!`);return;}
  }

  showToast('⏳ Menyimpan...');
  try{
    for(const b of biayaRows){
      await dbSaveKas({
        tanggal,
        jenis:'keluar',
        kategori:b.kategori||'lainnya',
        jumlah:b.jumlah,
        keterangan:b.ket,
        kandang:kandang||null,
        user_input:currentUser?.username||''
      });
    }
    await dbSaveLog('TAMBAH','kas_operasional',null,null,
      {tanggal,kandang,total:biayaRows.reduce((s,b)=>s+b.jumlah,0),items:biayaRows.length},
      `Input biaya operasional: ${biayaRows.length} item, total Rp ${biayaRows.reduce((s,b)=>s+b.jumlah,0).toLocaleString('id-ID')}`);
    showToast('✅ Biaya operasional disimpan!');
    resetBiayaRows();
    document.getElementById('biaya-tanggal').value=new Date().toISOString().split('T')[0];
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

async function loadRekapBiaya(){
  const bulan=document.getElementById('biaya-bulan').value;
  const kandang=document.getElementById('biaya-rekap-kandang').value;
  if(!bulan){showToast('⚠️ Pilih bulan!');return;}
  const[tahun,bln]=bulan.split('-');
  const dari=`${tahun}-${bln}-01`;
  const sampai=`${tahun}-${bln}-${new Date(tahun,bln,0).getDate()}`;
  showToast('⏳ Memuat rekap...');
  try{
    const list=await dbGetKas({dari,sampai,kandang:kandang||undefined});
    const keluar=list.filter(k=>k.jenis==='keluar');
    if(keluar.length===0){
      document.getElementById('rekap-biaya-result').innerHTML='<div class="info-box">Tidak ada data biaya untuk periode ini.</div>';
      return;
    }
    // Group by kategori
    const byKat={};
    keluar.forEach(k=>{
      const kat=k.kategori||'lainnya';
      if(!byKat[kat])byKat[kat]={total:0,items:[]};
      byKat[kat].total+=parseFloat(k.jumlah)||0;
      byKat[kat].items.push(k);
    });
    const total=keluar.reduce((s,k)=>s+(parseFloat(k.jumlah)||0),0);
    let html='<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Kategori</th><th>Jumlah (Rp)</th><th>%</th></tr></thead><tbody>';
    Object.keys(byKat).forEach(kat=>{
      const pct=((byKat[kat].total/total)*100).toFixed(1);
      html+=`<tr><td>${esc(kat)}</td><td>Rp ${byKat[kat].total.toLocaleString('id-ID')}</td><td>${pct}%</td></tr>`;
    });
    html+=`<tr style="font-weight:700;background:#f0fdf4"><td>TOTAL</td><td>Rp ${total.toLocaleString('id-ID')}</td><td>100%</td></tr>`;
    html+='</tbody></table></div>';
    document.getElementById('rekap-biaya-result').innerHTML=html;
    showToast('✅ Rekap dimuat!');
  }catch(e){showToast('❌ Gagal: '+e.message);}
}

async function exportRekapBiaya(){
  const bulan=document.getElementById('biaya-bulan').value;
  const kandang=document.getElementById('biaya-rekap-kandang').value;
  if(!bulan){showToast('⚠️ Pilih bulan!');return;}
  const[tahun,bln]=bulan.split('-');
  const dari=`${tahun}-${bln}-01`;
  const sampai=`${tahun}-${bln}-${new Date(tahun,bln,0).getDate()}`;
  showToast('⏳ Mengekspor...');
  try{
    const list=await dbGetKas({dari,sampai,kandang:kandang||undefined});
    const keluar=list.filter(k=>k.jenis==='keluar');
    if(keluar.length===0){showToast('⚠️ Tidak ada data untuk diekspor');return;}
    const headers=['Tanggal','Kategori','Keterangan','Kandang','Jumlah (Rp)'];
    const data=keluar.map(k=>[k.tanggal,k.kategori||'',k.keterangan||'',k.kandang||'',k.jumlah]);
    await exportExcel(`Rekap Biaya Operasional ${bulan}${kandang?' - '+kandang:''}`,headers,data,`Biaya_Operasional_${bulan}${kandang?'_'+kandang:''}.xlsx`);
  }catch(e){showToast('❌ Gagal: '+e.message);}
}


function initBiayaPage(){
  if(!document.getElementById('biaya-tanggal').value)
    document.getElementById('biaya-tanggal').value=new Date().toISOString().split('T')[0];
  if(!document.getElementById('biaya-bulan').value)
    document.getElementById('biaya-bulan').value=new Date().toISOString().slice(0,7);
  populateBiayaKandang();
  renderKasSaldo(); // Load saldo kas
}

async function populateBiayaKandang(){
  try{
    const list=cache.get('kandang_list')||await dbGetKandang();
    ['biaya-kandang','biaya-rekap-kandang'].forEach(id=>{
      const sel=document.getElementById(id);
      if(!sel)return;
      const prev=sel.value;
      sel.innerHTML='<option value="">Semua Kandang</option>';
      list.forEach(k=>sel.innerHTML+=`<option value="${esc(k.nama)}">${esc(k.nama)}</option>`);
      if(prev)sel.value=prev;
    });
    // Add event listener untuk update saldo saat kandang berubah
    const selKandang=document.getElementById('biaya-kandang');
    if(selKandang&&!selKandang.dataset.listenerAdded){
      selKandang.addEventListener('change',()=>renderKasSaldo());
      selKandang.dataset.listenerAdded='true';
    }
  }catch(e){
    console.error('populateBiayaKandang error:',e);
  }
}
