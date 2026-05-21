// ═══ MODULE: standar-performa ═══

// ═══════════════════════════════════════════════════════════════
// ═══ STANDAR PERFORMA HY-LINE BROWN (Superadmin Only) ═══
// ═══════════════════════════════════════════════════════════════

// Data default standar HY-Line Brown Max Pro (Standar Internasional)
// Sumber: HY-Line Brown Max Pro Management Guide
const STANDAR_DEFAULT = {
  pertumbuhan: [
    {umur:1,  kematian_kum:0.40, berat_badan:'68-72',    air_minum:'18-28',  konsumsi_pakan:'12-14', kum_konsumsi:'80-100',    keseragaman:'>85%'},
    {umur:2,  kematian_kum:0.55, berat_badan:'118-124',  air_minum:'26-42',  konsumsi_pakan:'17-21', kum_konsumsi:'200-250',   keseragaman:''},
    {umur:3,  kematian_kum:0.65, berat_badan:'184-194',  air_minum:'33-54',  konsumsi_pakan:'22-27', kum_konsumsi:'360-430',   keseragaman:''},
    {umur:4,  kematian_kum:0.75, berat_badan:'263-278',  air_minum:'41-64',  konsumsi_pakan:'27-32', kum_konsumsi:'550-660',   keseragaman:''},
    {umur:5,  kematian_kum:0.85, berat_badan:'353-373',  air_minum:'45-78',  konsumsi_pakan:'30-39', kum_konsumsi:'760-930',   keseragaman:'>80%'},
    {umur:6,  kematian_kum:0.95, berat_badan:'451-477',  air_minum:'53-88',  konsumsi_pakan:'35-44', kum_konsumsi:'1000-1240', keseragaman:''},
    {umur:7,  kematian_kum:1.05, berat_badan:'555-586',  air_minum:'62-98',  konsumsi_pakan:'41-49', kum_konsumsi:'1290-1580', keseragaman:''},
    {umur:8,  kematian_kum:1.15, berat_badan:'660-698',  air_minum:'71-112', konsumsi_pakan:'47-56', kum_konsumsi:'1620-1970', keseragaman:''},
    {umur:9,  kematian_kum:1.25, berat_badan:'764-807',  air_minum:'77-120', konsumsi_pakan:'51-60', kum_konsumsi:'1970-2390', keseragaman:''},
    {umur:10, kematian_kum:1.35, berat_badan:'862-911',  air_minum:'81-124', konsumsi_pakan:'54-62', kum_konsumsi:'2350-2830', keseragaman:''},
    {umur:11, kematian_kum:1.45, berat_badan:'952-1007', air_minum:'87-134', konsumsi_pakan:'58-67', kum_konsumsi:'2760-3300', keseragaman:'>85%'},
    {umur:12, kematian_kum:1.55, berat_badan:'1034-1093',air_minum:'90-140', konsumsi_pakan:'60-70', kum_konsumsi:'3180-3790', keseragaman:''},
    {umur:13, kematian_kum:1.63, berat_badan:'1107-1171',air_minum:'93-144', konsumsi_pakan:'62-72', kum_konsumsi:'3610-4290', keseragaman:''},
    {umur:14, kematian_kum:1.70, berat_badan:'1173-1240',air_minum:'96-148', konsumsi_pakan:'64-74', kum_konsumsi:'4060-4810', keseragaman:''},
    {umur:15, kematian_kum:1.78, berat_badan:'1232-1303',air_minum:'99-154', konsumsi_pakan:'66-77', kum_konsumsi:'4520-5350', keseragaman:''},
    {umur:16, kematian_kum:1.85, berat_badan:'1288-1361',air_minum:'102-158',konsumsi_pakan:'68-79', kum_konsumsi:'5000-5900', keseragaman:''},
    {umur:17, kematian_kum:2.00, berat_badan:'1342-1418',air_minum:'108-170',konsumsi_pakan:'72-85', kum_konsumsi:'5500-6500', keseragaman:'>90%'},
  ],
  // hdp = % produksi telur (current), konsumsi_pakan = g/ekor/hari, berat_telur = g/butir
  produksi: [
    {umur:18, hdp:'6.1-7.7',   kematian_kum:0.12, berat_badan:'1396-1475', air_minum:'122-176', konsumsi_pakan:'81-88',   berat_telur:'46.5-47.2'},
    {umur:19, hdp:'22.4-27.1', kematian_kum:0.12, berat_badan:'1451-1533', air_minum:'135-188', konsumsi_pakan:'90-94',   berat_telur:'49.3-50.0'},
    {umur:20, hdp:'50.7-57.3', kematian_kum:0.12, berat_badan:'1507-1593', air_minum:'143-198', konsumsi_pakan:'95-99',   berat_telur:'51.6-52.4'},
    {umur:21, hdp:'75.7-80.5', kematian_kum:0.24, berat_badan:'1564-1653', air_minum:'149-206', konsumsi_pakan:'99-103',  berat_telur:'53.5-54.3'},
    {umur:22, hdp:'88.6-90.6', kematian_kum:0.35, berat_badan:'1620-1712', air_minum:'155-214', konsumsi_pakan:'103-107', berat_telur:'55.0-55.8'},
    {umur:23, hdp:'93.2-94.1', kematian_kum:0.35, berat_badan:'1672-1768', air_minum:'161-222', konsumsi_pakan:'107-111', berat_telur:'56.4-57.2'},
    {umur:24, hdp:'94.9-95.5', kematian_kum:0.47, berat_badan:'1719-1817', air_minum:'165-228', konsumsi_pakan:'110-114', berat_telur:'57.5-58.4'},
    {umur:25, hdp:'95.7-96.2', kematian_kum:0.59, berat_badan:'1759-1859', air_minum:'168-230', konsumsi_pakan:'112-115', berat_telur:'58.4-59.3'},
    {umur:26, hdp:'96.0-96.4', kematian_kum:0.59, berat_badan:'1790-1892', air_minum:'170-232', konsumsi_pakan:'113-116', berat_telur:'59.2-60.1'},
    {umur:27, hdp:'92.2-96.6', kematian_kum:0.71, berat_badan:'1812-1915', air_minum:'170-232', konsumsi_pakan:'113-116', berat_telur:'59.9-60.8'},
    {umur:28, hdp:'96.2-96.6', kematian_kum:0.71, berat_badan:'1827-1931', air_minum:'170-232', konsumsi_pakan:'113-116', berat_telur:'60.4-61.3'},
    {umur:29, hdp:'96.2-96.6', kematian_kum:0.83, berat_badan:'1837-1942', air_minum:'170-234', konsumsi_pakan:'113-117', berat_telur:'60.9-61.8'},
    {umur:30, hdp:'96.1-96.5', kematian_kum:0.83, berat_badan:'1844-1949', air_minum:'170-234', konsumsi_pakan:'113-117', berat_telur:'61.3-62.2'},
    {umur:31, hdp:'96.1-96.5', kematian_kum:0.94, berat_badan:'1850-1955', air_minum:'170-234', konsumsi_pakan:'113-117', berat_telur:'61.7-62.6'},
    {umur:32, hdp:'96.1-96.5', kematian_kum:0.94, berat_badan:'1856-1962', air_minum:'170-234', konsumsi_pakan:'113-117', berat_telur:'62.0-62.9'},
    {umur:33, hdp:'95.9-96.3', kematian_kum:1.06, berat_badan:'1862-1969', air_minum:'170-234', konsumsi_pakan:'113-117', berat_telur:'62.3-63.2'},
    {umur:34, hdp:'95.7-96.1', kematian_kum:1.06, berat_badan:'1868-1975', air_minum:'170-234', konsumsi_pakan:'113-117', berat_telur:'62.5-63.4'},
    {umur:35, hdp:'95.6-96.0', kematian_kum:1.18, berat_badan:'1882-1989', air_minum:'170-234', konsumsi_pakan:'113-117', berat_telur:'62.7-63.6'},
    {umur:36, hdp:'95.4-95.8', kematian_kum:1.18, berat_badan:'1888-1996', air_minum:'170-232', konsumsi_pakan:'113-116', berat_telur:'62.9-63.8'},
    {umur:37, hdp:'95.2-95.7', kematian_kum:1.30, berat_badan:'1894-2002', air_minum:'170-232', konsumsi_pakan:'113-116', berat_telur:'63.1-64.0'},
    {umur:38, hdp:'95.0-95.5', kematian_kum:1.30, berat_badan:'1899-2007', air_minum:'170-232', konsumsi_pakan:'113-116', berat_telur:'63.2-64.1'},
    {umur:39, hdp:'94.8-95.3', kematian_kum:1.41, berat_badan:'1903-2012', air_minum:'170-232', konsumsi_pakan:'113-116', berat_telur:'63.3-64.2'},
    {umur:40, hdp:'94.5-95.0', kematian_kum:1.41, berat_badan:'1906-2015', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'63.4-64.4'},
    {umur:41, hdp:'94.4-94.9', kematian_kum:1.53, berat_badan:'1909-2018', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'63.5-64.5'},
    {umur:42, hdp:'94.1-94.6', kematian_kum:1.53, berat_badan:'1911-2021', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'63.6-64.6'},
    {umur:43, hdp:'93.8-94.4', kematian_kum:1.64, berat_badan:'1914-2023', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'63.7-64.7'},
    {umur:44, hdp:'93.5-94.1', kematian_kum:1.76, berat_badan:'1916-2025', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'63.8-64.8'},
    {umur:45, hdp:'93.2-93.8', kematian_kum:1.76, berat_badan:'1917-2027', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'63.9-64.9'},
    {umur:46, hdp:'92.9-93.5', kematian_kum:1.87, berat_badan:'1919-2029', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'63.9-64.9'},
    {umur:47, hdp:'92.7-93.3', kematian_kum:1.87, berat_badan:'1920-2030', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.0-65.0'},
    {umur:48, hdp:'92.5-93.1', kematian_kum:1.97, berat_badan:'1921-2031', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.0-65.0'},
    {umur:49, hdp:'92.2-92.8', kematian_kum:1.97, berat_badan:'1922-2032', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.1-65.1'},
    {umur:50, hdp:'92.0-92.7', kematian_kum:2.08, berat_badan:'1923-2033', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.1-65.1'},
    {umur:51, hdp:'91.8-92.4', kematian_kum:2.20, berat_badan:'1924-2034', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.2-65.2'},
    {umur:52, hdp:'91.6-92.2', kematian_kum:2.31, berat_badan:'1925-2035', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.2-65.2'},
    {umur:53, hdp:'91.3-91.9', kematian_kum:2.31, berat_badan:'1926-2036', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.3-65.3'},
    {umur:54, hdp:'91.1-91.7', kematian_kum:2.42, berat_badan:'1927-2037', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.3-65.3'},
    {umur:55, hdp:'90.9-91.5', kematian_kum:2.52, berat_badan:'1928-2038', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.3-65.3'},
    {umur:56, hdp:'90.7-91.4', kematian_kum:2.52, berat_badan:'1929-2039', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.4-65.4'},
    {umur:57, hdp:'90.5-91.2', kematian_kum:2.63, berat_badan:'1930-2040', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.4-65.4'},
    {umur:58, hdp:'90.3-91.0', kematian_kum:2.74, berat_badan:'1930-2041', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.4-65.4'},
    {umur:59, hdp:'90.1-90.8', kematian_kum:2.86, berat_badan:'1931-2042', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.5-65.5'},
    {umur:60, hdp:'89.8-90.5', kematian_kum:2.96, berat_badan:'1932-2042', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.5-65.5'},
    {umur:61, hdp:'89.5-90.2', kematian_kum:3.07, berat_badan:'1933-2043', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.6-65.6'},
    {umur:62, hdp:'89.3-90.0', kematian_kum:3.18, berat_badan:'1934-2044', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.6-65.6'},
    {umur:63, hdp:'89.1-89.8', kematian_kum:3.29, berat_badan:'1934-2045', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.6-65.6'},
    {umur:64, hdp:'88.9-89.7', kematian_kum:3.28, berat_badan:'1935-2046', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.6-65.6'},
    {umur:65, hdp:'88.6-89.4', kematian_kum:3.39, berat_badan:'1936-2046', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.7-65.7'},
    {umur:66, hdp:'88.2-89.1', kematian_kum:3.49, berat_badan:'1937-2047', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.7-65.7'},
    {umur:67, hdp:'87.8-88.8', kematian_kum:3.48, berat_badan:'1937-2048', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.7-65.7'},
    {umur:68, hdp:'87.5-88.3', kematian_kum:3.59, berat_badan:'1938-2049', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.7-65.7'},
    {umur:69, hdp:'87.1-88.2', kematian_kum:3.70, berat_badan:'1939-2049', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.8-65.8'},
    {umur:70, hdp:'86.6-87.8', kematian_kum:3.81, berat_badan:'1939-2050', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.8-65.8'},
    {umur:71, hdp:'86.1-87.3', kematian_kum:4.02, berat_badan:'1940-2051', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.8-65.8'},
    {umur:72, hdp:'85.4-86.6', kematian_kum:4.12, berat_badan:'1940-2051', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.9-65.9'},
    {umur:73, hdp:'84.9-86.0', kematian_kum:4.34, berat_badan:'1941-2052', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.9-65.9'},
    {umur:74, hdp:'84.4-85.6', kematian_kum:4.44, berat_badan:'1942-2052', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.9-65.9'},
    {umur:75, hdp:'84.1-85.3', kematian_kum:4.66, berat_badan:'1942-2053', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.9-65.9'},
    {umur:76, hdp:'83.6-85.0', kematian_kum:4.76, berat_badan:'1943-2054', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'64.9-65.9'},
    {umur:77, hdp:'83.3-84.7', kematian_kum:4.97, berat_badan:'1943-2054', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.0-66.0'},
    {umur:78, hdp:'82.9-84.4', kematian_kum:5.07, berat_badan:'1944-2055', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.0-66.0'},
    {umur:79, hdp:'82.5-84.1', kematian_kum:5.29, berat_badan:'1944-2055', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.0-66.0'},
    {umur:80, hdp:'82.0-83.6', kematian_kum:5.39, berat_badan:'1945-2056', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.0-66.0'},
    {umur:81, hdp:'81.6-83.2', kematian_kum:5.59, berat_badan:'1945-2056', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.0-66.0'},
    {umur:82, hdp:'81.1-82.8', kematian_kum:5.69, berat_badan:'1945-2057', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.1-66.1'},
    {umur:83, hdp:'80.7-82.4', kematian_kum:5.90, berat_badan:'1946-2057', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.1-66.1'},
    {umur:84, hdp:'80.2-81.8', kematian_kum:6.00, berat_badan:'1946-2057', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.1-66.1'},
    {umur:85, hdp:'79.8-81.4', kematian_kum:6.21, berat_badan:'1947-2058', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.1-66.1'},
    {umur:86, hdp:'79.4-81.0', kematian_kum:6.31, berat_badan:'1947-2058', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.2-66.2'},
    {umur:87, hdp:'78.7-80.3', kematian_kum:6.51, berat_badan:'1947-2059', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.2-66.2'},
    {umur:88, hdp:'78.1-79.6', kematian_kum:6.61, berat_badan:'1948-2059', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.2-66.2'},
    {umur:89, hdp:'77.7-79.2', kematian_kum:6.81, berat_badan:'1948-2059', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.2-66.2'},
    {umur:90, hdp:'77.4-78.8', kematian_kum:7.01, berat_badan:'1948-2060', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.3-66.3'},
    {umur:91, hdp:'77.0-78.4', kematian_kum:7.22, berat_badan:'1949-2060', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.3-66.3'},
    {umur:92, hdp:'76.6-78.0', kematian_kum:7.41, berat_badan:'1949-2060', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.3-66.3'},
    {umur:93, hdp:'76.2-77.6', kematian_kum:7.62, berat_badan:'1949-2061', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.3-66.3'},
    {umur:94, hdp:'76.0-77.4', kematian_kum:7.81, berat_badan:'1949-2061', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.3-66.3'},
    {umur:95, hdp:'75.8-77.2', kematian_kum:8.02, berat_badan:'1950-2061', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.4-66.4'},
    {umur:96, hdp:'75.4-76.8', kematian_kum:8.11, berat_badan:'1950-2061', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.4-66.4'},
    {umur:97, hdp:'75.0-76.4', kematian_kum:8.30, berat_badan:'1950-2061', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.4-66.4'},
    {umur:98, hdp:'74.7-76.0', kematian_kum:8.50, berat_badan:'1950-2061', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.4-66.4'},
    {umur:99, hdp:'74.3-75.9', kematian_kum:8.69, berat_badan:'1950-2062', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.4-66.4'},
    {umur:100,hdp:'73.9-75.2', kematian_kum:8.91, berat_badan:'1950-2062', air_minum:'168-232', konsumsi_pakan:'112-116', berat_telur:'65.5-66.5'},
  ]
};

let _standarData = null; // cache in-memory

async function loadStandarPerforma() {
  if(_standarData) return _standarData;
  try {
    const saved = await dbGetStandar();
    if(saved && saved.pertumbuhan && saved.produksi) {
      _standarData = saved;
    } else {
      _standarData = JSON.parse(JSON.stringify(STANDAR_DEFAULT));
    }
  } catch(e) {
    _standarData = JSON.parse(JSON.stringify(STANDAR_DEFAULT));
  }
  return _standarData;
}

let _currentSPTab = 'pertumbuhan';

function switchSPTab(tab) {
  _currentSPTab = tab;
  ['pertumbuhan','produksi'].forEach(t => {
    document.getElementById('sptab-'+t)?.classList.toggle('active', t===tab);
    const c = document.getElementById('sptab-content-'+t);
    if(c) c.style.display = t===tab ? 'block' : 'none';
  });
}

async function renderStandarPerforma() {
  if(currentUser?.role !== 'superadmin') return;
  const data = await loadStandarPerforma();
  renderStandarTable('pertumbuhan', data.pertumbuhan);
  renderStandarTable('produksi', data.produksi);
}

function renderStandarTable(fase, rows) {
  const tbody = document.getElementById('tbody-standar-'+fase);
  if(!tbody) return;
  tbody.innerHTML = '';

  if(!rows || !rows.length) {
    const cols = fase === 'pertumbuhan' ? 8 : 9;
    tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:#aaa;padding:20px">Belum ada data. Klik "＋ Tambah Baris".</td></tr>`;
    return;
  }

  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = idx;
    tr.dataset.fase = fase;

    // Highlight baris milestone (bold)
    const isMilestone = fase==='pertumbuhan'
      ? [5,10,15,17].includes(row.umur)
      : [21,25,30,40,50,60,70].includes(row.umur);
    if(isMilestone) tr.style.fontWeight = '700';

    if(fase === 'pertumbuhan') {
      tr.innerHTML = `
        <td><input type="number" class="sp-inp" value="${row.umur}" min="1" max="17" style="width:50px" data-field="umur"/></td>
        <td><input type="number" class="sp-inp" value="${row.kematian_kum}" step="0.01" style="width:60px" data-field="kematian_kum"/></td>
        <td><input type="text"   class="sp-inp" value="${row.berat_badan}" style="width:90px" data-field="berat_badan"/></td>
        <td><input type="text"   class="sp-inp" value="${row.air_minum}" style="width:80px" data-field="air_minum"/></td>
        <td><input type="text"   class="sp-inp" value="${row.konsumsi_pakan}" style="width:80px" data-field="konsumsi_pakan"/></td>
        <td><input type="text"   class="sp-inp" value="${row.kum_konsumsi}" style="width:100px" data-field="kum_konsumsi"/></td>
        <td><input type="text"   class="sp-inp" value="${row.keseragaman||''}" style="width:70px" placeholder="—" data-field="keseragaman"/></td>
        <td><button class="btn-del" onclick="deleteStandarRow('${fase}',${idx})" title="Hapus baris">🗑</button></td>
      `;
    } else {
      tr.innerHTML = `
        <td><input type="number" class="sp-inp" value="${row.umur}" min="18" style="width:50px" data-field="umur"/></td>
        <td><input type="number" class="sp-inp" value="${row.kematian_kum}" step="0.01" style="width:60px" data-field="kematian_kum"/></td>
        <td><input type="text"   class="sp-inp" value="${row.berat_telur||''}" style="width:60px" data-field="berat_telur"/></td>
        <td><input type="text"   class="sp-inp" value="${row.hdp||''}" style="width:60px" data-field="hdp"/></td>
        <td><input type="text"   class="sp-inp" value="${row.massa_telur||''}" style="width:70px" data-field="massa_telur"/></td>
        <td><input type="text"   class="sp-inp" value="${row.air_minum||''}" style="width:80px" data-field="air_minum"/></td>
        <td><input type="text"   class="sp-inp" value="${row.konsumsi_pakan||''}" style="width:80px" data-field="konsumsi_pakan"/></td>
        <td><input type="text"   class="sp-inp" value="${row.fcr||''}" style="width:60px" placeholder="—" data-field="fcr"/></td>
        <td><button class="btn-del" onclick="deleteStandarRow('${fase}',${idx})" title="Hapus baris">🗑</button></td>
      `;
    }
    tbody.appendChild(tr);
  });
}

function addStandarRow(fase) {
  if(!_standarData) return;
  const rows = _standarData[fase];
  const lastUmur = rows.length ? rows[rows.length-1].umur : (fase==='pertumbuhan' ? 0 : 17);
  if(fase === 'pertumbuhan') {
    rows.push({umur: lastUmur+1, kematian_kum:0, berat_badan:'', air_minum:'', konsumsi_pakan:'', kum_konsumsi:'', keseragaman:''});
  } else {
    rows.push({umur: lastUmur+1, kematian_kum:0, berat_telur:'', hdp:'', massa_telur:'', air_minum:'', konsumsi_pakan:'', fcr:''});
  }
  renderStandarTable(fase, rows);
  // Scroll ke baris baru
  const tbody = document.getElementById('tbody-standar-'+fase);
  if(tbody) tbody.lastElementChild?.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function deleteStandarRow(fase, idx) {
  if(!_standarData) return;
  _standarData[fase].splice(idx, 1);
  renderStandarTable(fase, _standarData[fase]);
  showToast('🗑 Baris dihapus. Klik Simpan untuk menyimpan perubahan.');
}

function collectStandarFromTable(fase) {
  const tbody = document.getElementById('tbody-standar-'+fase);
  if(!tbody) return [];
  const rows = [];
  tbody.querySelectorAll('tr[data-idx]').forEach(tr => {
    const row = {};
    tr.querySelectorAll('.sp-inp').forEach(inp => {
      const field = inp.dataset.field;
      const val = inp.value.trim();
      row[field] = inp.type === 'number' ? (parseFloat(val)||0) : val;
    });
    rows.push(row);
  });
  return rows;
}

async function saveStandarPerforma() {
  if(currentUser?.role !== 'superadmin') {
    showToast('⛔ Hanya superadmin yang bisa menyimpan standar performa!');
    return;
  }
  // Kumpulkan data dari tabel yang sedang aktif
  const pertumbuhan = collectStandarFromTable('pertumbuhan');
  const produksi    = collectStandarFromTable('produksi');

  // Sort berdasarkan umur
  pertumbuhan.sort((a,b) => a.umur - b.umur);
  produksi.sort((a,b) => a.umur - b.umur);

  const payload = { pertumbuhan, produksi, updated_at: new Date().toISOString(), updated_by: currentUser.username };

  try {
    showToast('⏳ Menyimpan standar performa...');
    await dbSaveStandar(payload);
    _standarData = payload;
    renderStandarTable('pertumbuhan', pertumbuhan);
    renderStandarTable('produksi', produksi);
    showToast('✅ Standar performa berhasil disimpan!');
    await dbSaveLog('UPDATE','standar_performa',null,null,{fase:'all'},'Update standar performa HY-Line Brown');
  } catch(e) {
    showToast('❌ Gagal menyimpan: '+e.message);
  }
}

// Fungsi publik untuk mengambil standar (digunakan di laporan/grafik)
async function getStandarPerforma() {
  return await loadStandarPerforma();
}