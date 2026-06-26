/**
 * BMI UMS — Clean Wipe + Fresh Import
 * =====================================
 * Deletes ALL records from the 5 data collections in reverse-dependency order,
 * then re-imports the canonical dataset.
 *
 * Usage:
 *   cd backend
 *   npx tsx ../scripts/reset-and-import.ts
 *
 * Override credentials if needed:
 *   PB_URL=http://127.0.0.1:8090 PB_EMAIL=admin@bmi.edu PB_PASSWORD=... \
 *     npx tsx ../scripts/reset-and-import.ts
 */

const PB_URL      = process.env.PB_URL      || 'http://127.0.0.1:8090';
const PB_EMAIL    = process.env.PB_EMAIL    || 'admin@bmi.edu';
const PB_PASSWORD = process.env.PB_PASSWORD || (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

// ── Auth ──────────────────────────────────────────────────────────────────────
let TOKEN = '';

async function authenticate() {
  process.stdout.write('🔐 Authenticating… ');
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  if (!res.ok) {
    const e: any = await res.json();
    throw new Error(`Auth failed: ${e.message || res.statusText}`);
  }
  TOKEN = (await res.json()).token;
  console.log('✓');
}

// ── PocketBase helpers ────────────────────────────────────────────────────────
async function pbFetch(method: string, path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: TOKEN },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function getAllIds(collection: string): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  while (true) {
    const res = await pbFetch('GET', `/api/collections/${collection}/records?fields=id&perPage=200&page=${page}`);
    if (!res.ok) break;
    const data: any = await res.json();
    ids.push(...data.items.map((r: any) => r.id));
    if (page >= data.totalPages) break;
    page++;
  }
  return ids;
}

async function deleteAll(collection: string) {
  process.stdout.write(`  🗑  ${collection}: fetching IDs… `);
  const ids = await getAllIds(collection);
  process.stdout.write(`${ids.length} records. Deleting`);

  // Delete in parallel batches of 20
  const BATCH = 20;
  for (let i = 0; i < ids.length; i += BATCH) {
    await Promise.all(
      ids.slice(i, i + BATCH).map((id) =>
        pbFetch('DELETE', `/api/collections/${collection}/records/${id}`)
      )
    );
    process.stdout.write('.');
  }
  console.log(' ✓');
}

async function createRecord(collection: string, body: Record<string, unknown>): Promise<any> {
  const res = await pbFetch('POST', `/api/collections/${collection}/records`, body);
  if (!res.ok) {
    const e: any = await res.json();
    throw Object.assign(new Error(e.message || 'Create failed'), { status: res.status, data: e });
  }
  return res.json();
}

// ── Data ─────────────────────────────────────────────────────────────────────
const CAMPUSES = [
  { name: 'Karatina 1',  location: 'Karatina' },
  { name: 'Karatina 2',  location: 'Karatina' },
  { name: 'Kiambu',      location: 'Kiambu' },
  { name: 'Mukurweini',  location: 'Mukurweini' },
  { name: 'Nyeri',       location: 'Nyeri' },
  { name: 'Othaya',      location: 'Othaya' },
];

const MODULES = [
  { name: 'Module 1', semester: 'Semester 1', sort_order: 1 },
  { name: 'Module 2', semester: 'Semester 2', sort_order: 2 },
  { name: 'Module 3', semester: 'Semester 1', sort_order: 3 },
  { name: 'Module 4', semester: 'Semester 2', sort_order: 4 },
  { name: 'Module 5', semester: 'Semester 1', sort_order: 5 },
];

const COURSES = [
  { code:'ENG 101', title:'Basic English Grammar',               category:'General Education',      credit_hours:2, module_name:'Module 1' },
  { code:'AWR 102', title:'Academic Writing',                    category:'General Education',      credit_hours:2, module_name:'Module 1' },
  { code:'OTS 111', title:'Old Testament Survey',                category:'Biblical Studies',       credit_hours:3, module_name:'Module 1' },
  { code:'NTS 112', title:'New Testament Survey',                category:'Biblical Studies',       credit_hours:3, module_name:'Module 1' },
  { code:'BIB 113', title:'Bibliology',                          category:'Theology',               credit_hours:3, module_name:'Module 1' },
  { code:'HER 114', title:'Biblical Hermeneutics',               category:'Biblical Studies',       credit_hours:3, module_name:'Module 1' },
  { code:'EVA 115', title:'Evangelism',                          category:'Ministry',               credit_hours:2, module_name:'Module 1' },
  { code:'CFM 116', title:'Christian Family',                    category:'Ministry',               credit_hours:2, module_name:'Module 1' },
  { code:'HOM 121', title:'Homiletics',                          category:'Ministry',               credit_hours:3, module_name:'Module 2' },
  { code:'CHH 122', title:'Church History',                      category:'Church History',         credit_hours:3, module_name:'Module 2' },
  { code:'THP 123', title:'Theology Proper',                     category:'Theology',               credit_hours:3, module_name:'Module 2' },
  { code:'CHR 124', title:'Christology',                         category:'Theology',               credit_hours:3, module_name:'Module 2' },
  { code:'SOT 125', title:'Soteriology',                         category:'Theology',               credit_hours:3, module_name:'Module 2' },
  { code:'PNE 126', title:'Pneumatology',                        category:'Theology',               credit_hours:3, module_name:'Module 2' },
  { code:'PRW 127', title:'Praise and Worship',                  category:'Ministry',               credit_hours:2, module_name:'Module 2' },
  { code:'ECC 211', title:'Ecclesiology',                        category:'Theology',               credit_hours:3, module_name:'Module 3' },
  { code:'CAD 212', title:'Church Administration',               category:'Ministry Leadership',    credit_hours:3, module_name:'Module 3' },
  { code:'CHG 213', title:'Church Growth',                       category:'Ministry Leadership',    credit_hours:3, module_name:'Module 3' },
  { code:'CHP 214', title:'Church Planting',                     category:'Ministry Leadership',    credit_hours:3, module_name:'Module 3' },
  { code:'FSM 215', title:'Foundation of Successful Ministry',   category:'Ministry',               credit_hours:2, module_name:'Module 3' },
  { code:'SPF 216', title:'Spiritual Formation',                 category:'Spiritual Development',  credit_hours:3, module_name:'Module 3' },
  { code:'POS 217', title:'Principles of Success',               category:'Leadership Development', credit_hours:2, module_name:'Module 3' },
  { code:'UKP 218', title:"Understanding God's Kingdom Principles", category:'Theology',            credit_hours:3, module_name:'Module 3' },
  { code:'ESC 221', title:'Eschatology',                         category:'Theology',               credit_hours:3, module_name:'Module 4' },
  { code:'ANG 222', title:'Angelology',                          category:'Theology',               credit_hours:2, module_name:'Module 4' },
  { code:'ANH 223', title:'Anthropology & Hamartiology',         category:'Theology',               credit_hours:3, module_name:'Module 4' },
  { code:'SPW 224', title:'Spiritual Warfare',                   category:'Spiritual Development',  credit_hours:3, module_name:'Module 4' },
  { code:'SPR 225', title:'Spiritual Realm',                     category:'Spiritual Development',  credit_hours:2, module_name:'Module 4' },
  { code:'APO 226', title:'Christian Apologetics',               category:'Theology',               credit_hours:3, module_name:'Module 4' },
  { code:'PCE 227', title:'Pastoral Counselling & Ethics',       category:'Ministry',               credit_hours:3, module_name:'Module 4' },
  { code:'MWR 228', title:'Major World Religions',               category:'Comparative Religion',   credit_hours:3, module_name:'Module 4' },
  { code:'GRK 311', title:'Biblical Greek',                      category:'Biblical Languages',     credit_hours:3, module_name:'Module 5' },
  { code:'HEB 312', title:'Biblical Hebrew',                     category:'Biblical Languages',     credit_hours:3, module_name:'Module 5' },
  { code:'MIN 315', title:'Ministry Practicum / Internship',     category:'Practicum',              credit_hours:4, module_name:'Module 5' },
  { code:'RES 316', title:'Research Project',                    category:'Research',               credit_hours:3, module_name:'Module 5' },
];

// 61 unique students (duplicate 2025-061 removed; George & Peter have admission numbers)
const STUDENTS = [
  { student_code:'2025-001', reg_no:'THS/2025/225-531', full_name:'Mary Kihara',              gender:'Female', phone:'',               admission_no:'KEN-DP 225-531', campus_name:'Mukurweini' },
  { student_code:'2025-002', reg_no:'THS/2025/225-532', full_name:'Charity Githaiga',         gender:'Female', phone:'',               admission_no:'KEN-DP 225-532', campus_name:'Mukurweini' },
  { student_code:'2025-003', reg_no:'THS/2025/225-533', full_name:'Damaris Njoki',             gender:'Female', phone:'',               admission_no:'KEN-DP 225-533', campus_name:'Mukurweini' },
  { student_code:'2025-004', reg_no:'THS/2025/225-534', full_name:'Grace Mariga',              gender:'Female', phone:'',               admission_no:'KEN-DP 225-534', campus_name:'Mukurweini' },
  { student_code:'2025-005', reg_no:'THS/2025/225-535', full_name:'Hanna Waiyego',             gender:'Female', phone:'',               admission_no:'KEN-DP 225-535', campus_name:'Mukurweini' },
  { student_code:'2025-006', reg_no:'THS/2025/225-536', full_name:'Peter Maina',               gender:'Male',   phone:'',               admission_no:'KEN-DP 225-536', campus_name:'Mukurweini' },
  { student_code:'2025-007', reg_no:'THS/2025/225-537', full_name:'James Ndegwa',              gender:'Male',   phone:'',               admission_no:'KEN-DP 225-537', campus_name:'Mukurweini' },
  { student_code:'2025-008', reg_no:'THS/2025/225-538', full_name:'Martin Ndungu',             gender:'Male',   phone:'',               admission_no:'KEN-DP 225-538', campus_name:'Mukurweini' },
  { student_code:'2025-009', reg_no:'THS/2025/225-539', full_name:'Martin Gacanja',            gender:'Male',   phone:'',               admission_no:'KEN-DP 225-539', campus_name:'Mukurweini' },
  { student_code:'2025-010', reg_no:'THS/2025/225-540', full_name:'David Kangethe',            gender:'Male',   phone:'',               admission_no:'KEN-DP 225-540', campus_name:'Mukurweini' },
  { student_code:'2025-011', reg_no:'THS/2025/225-541', full_name:'John Maina',                gender:'Male',   phone:'',               admission_no:'KEN-DP 225-541', campus_name:'Mukurweini' },
  { student_code:'2025-012', reg_no:'THS/2025/225-542', full_name:'Simon Ndirango',            gender:'Male',   phone:'',               admission_no:'KEN-DP 225-542', campus_name:'Mukurweini' },
  { student_code:'2025-013', reg_no:'THS/2025/225-543', full_name:'Loise Kithaka',             gender:'Female', phone:'',               admission_no:'KEN-DP 225-543', campus_name:'Mukurweini' },
  { student_code:'2025-014', reg_no:'THS/2025/225-544', full_name:'Mbuuri',                   gender:'',       phone:'',               admission_no:'KEN-DP 225-544', campus_name:'Mukurweini' },
  { student_code:'2025-015', reg_no:'THS/2025/225-545', full_name:'Patrick Mwangi',            gender:'Male',   phone:'',               admission_no:'KEN-DP 225-545', campus_name:'Mukurweini' },
  { student_code:'2025-016', reg_no:'THS/2025/225-571', full_name:'Esther Wachera',            gender:'Female', phone:'+254721650501',  admission_no:'KEN-DP 225-571', campus_name:'Karatina 1' },
  { student_code:'2025-017', reg_no:'THS/2025/2025-017',full_name:'George Mirugi Matere',      gender:'Male',   phone:'+254726932044',  admission_no:'KEN-DP 225-590', campus_name:'Karatina 1' },
  { student_code:'2025-018', reg_no:'THS/2025/225-572', full_name:'Peterson Ooga',             gender:'Male',   phone:'+254728964446',  admission_no:'KEN-DP 225-572', campus_name:'Karatina 1' },
  { student_code:'2025-019', reg_no:'THS/2025/225-573', full_name:'Esther Gichuka',            gender:'Female', phone:'+254722502870',  admission_no:'KEN-DP 225-573', campus_name:'Karatina 1' },
  { student_code:'2025-020', reg_no:'THS/2025/225-574', full_name:'Margaret Wanjiku Njenga',   gender:'Female', phone:'',               admission_no:'KEN-DP 225-574', campus_name:'Karatina 1' },
  { student_code:'2025-021', reg_no:'THS/2025/225-575', full_name:'John Kinyua',               gender:'Male',   phone:'+254716810987',  admission_no:'KEN-DP 225-575', campus_name:'Karatina 1' },
  { student_code:'2025-022', reg_no:'THS/2025/2025-022',full_name:'Peter Kimani Githaitha',    gender:'Male',   phone:'+254721936871',  admission_no:'KEN-DP 225-589', campus_name:'Karatina 1' },
  { student_code:'2025-023', reg_no:'THS/2025/225-576', full_name:'James Kamiri Gakoba',       gender:'Male',   phone:'+254721460961',  admission_no:'KEN-DP 225-576', campus_name:'Karatina 1' },
  { student_code:'2025-024', reg_no:'THS/2025/225-577', full_name:'Benson Nderitu',            gender:'Male',   phone:'+254714383309',  admission_no:'KEN-DP 225-577', campus_name:'Karatina 1' },
  { student_code:'2025-025', reg_no:'THS/2025/225-578', full_name:'Susan Mwangi',              gender:'Female', phone:'',               admission_no:'KEN-DP 225-578', campus_name:'Karatina 1' },
  { student_code:'2025-026', reg_no:'THS/2025/225-579', full_name:'Esther Njeri',              gender:'Female', phone:'',               admission_no:'KEN-DP 225-579', campus_name:'Karatina 1' },
  { student_code:'2025-027', reg_no:'THS/2025/225-580', full_name:'Mercy Njoki',               gender:'Female', phone:'',               admission_no:'KEN-DP 225-580', campus_name:'Karatina 1' },
  { student_code:'2025-028', reg_no:'THS/2025/225-581', full_name:'Dennis Macharia',           gender:'Male',   phone:'+254791617214',  admission_no:'KEN-DP 225-581', campus_name:'Karatina 1' },
  { student_code:'2025-029', reg_no:'THS/2025/225-582', full_name:'Joseph Wamutitu',           gender:'Male',   phone:'+254722376029',  admission_no:'KEN-DP 225-582', campus_name:'Karatina 1' },
  { student_code:'2025-030', reg_no:'THS/2025/225-583', full_name:'Peter Muriuki Kinyua',      gender:'Male',   phone:'+254714063510',  admission_no:'KEN-DP 225-583', campus_name:'Karatina 1' },
  { student_code:'2025-031', reg_no:'THS/2025/225-584', full_name:'Stephen Muriuki',           gender:'Male',   phone:'+254720954100',  admission_no:'KEN-DP 225-584', campus_name:'Karatina 1' },
  { student_code:'2025-032', reg_no:'THS/2025/225-585', full_name:'Susan Waithira Maina',      gender:'Female', phone:'+254714850956',  admission_no:'KEN-DP 225-585', campus_name:'Karatina 1' },
  { student_code:'2025-033', reg_no:'THS/2025/225-586', full_name:'Robert Thoithi Maina',      gender:'Male',   phone:'+254707227882',  admission_no:'KEN-DP 225-586', campus_name:'Karatina 1' },
  { student_code:'2025-034', reg_no:'THS/2025/225-587', full_name:'Luciah Wanjiku Ngure',      gender:'Female', phone:'+254708107838',  admission_no:'KEN-DP 225-587', campus_name:'Karatina 1' },
  { student_code:'2025-035', reg_no:'THS/2025/225-588', full_name:'Anthony Mwangi Mburu',      gender:'Male',   phone:'+254798748774',  admission_no:'KEN-DP 225-588', campus_name:'Karatina 1' },
  { student_code:'2025-036', reg_no:'THS/2025/225-596', full_name:'Hellen Wacera Mugo',        gender:'Female', phone:'',               admission_no:'KEN-DP 225-596', campus_name:'Othaya' },
  { student_code:'2025-037', reg_no:'THS/2025/225-597', full_name:'Nicholus Maina Wanjiru',    gender:'Male',   phone:'',               admission_no:'KEN-DP 225-597', campus_name:'Othaya' },
  { student_code:'2025-038', reg_no:'THS/2025/225-598', full_name:'Bethann Muthoni',           gender:'Female', phone:'',               admission_no:'KEN-DP 225-598', campus_name:'Othaya' },
  { student_code:'2025-039', reg_no:'THS/2025/225-599', full_name:'James Mugweru',             gender:'Male',   phone:'',               admission_no:'KEN-DP 225-599', campus_name:'Othaya' },
  { student_code:'2025-040', reg_no:'THS/2025/225-600', full_name:'Margret Maina',             gender:'Female', phone:'',               admission_no:'KEN-DP 225-600', campus_name:'Othaya' },
  { student_code:'2025-041', reg_no:'THS/2025/255-601', full_name:'David Wachira',             gender:'Male',   phone:'',               admission_no:'KEN-DP 255-601', campus_name:'Othaya' },
  { student_code:'2025-042', reg_no:'THS/2025/225-602', full_name:'Edward Macharia',           gender:'Male',   phone:'',               admission_no:'KEN-DP 225-602', campus_name:'Othaya' },
  { student_code:'2025-043', reg_no:'THS/2025/225-603', full_name:'Talent Gerald Talenda',     gender:'Male',   phone:'',               admission_no:'KEN-DP 225-603', campus_name:'Nyeri' },
  { student_code:'2025-044', reg_no:'THS/2025/225-604', full_name:'Martha Nduta Mungai',       gender:'Female', phone:'',               admission_no:'KEN-DP 225-604', campus_name:'Nyeri' },
  { student_code:'2025-045', reg_no:'THS/2025/225-605', full_name:'Mary Muthoni Gatonye',      gender:'Female', phone:'',               admission_no:'KEN-DP 225-605', campus_name:'Nyeri' },
  { student_code:'2025-046', reg_no:'THS/2025/225-606', full_name:'Patrick Mwangi Wachira',    gender:'Male',   phone:'',               admission_no:'KEN-DP 225-606', campus_name:'Nyeri' },
  { student_code:'2025-047', reg_no:'THS/2025/225-607', full_name:'Moses Ndegwa',              gender:'Male',   phone:'',               admission_no:'KEN-DP 225-607', campus_name:'Nyeri' },
  { student_code:'2025-048', reg_no:'THS/2025/225-608', full_name:'Joseph Mwangi',             gender:'Male',   phone:'',               admission_no:'KEN-DP 225-608', campus_name:'Nyeri' },
  { student_code:'2025-049', reg_no:'THS/2025/225-609', full_name:'Coulison Mwangi Kariuki',   gender:'Male',   phone:'',               admission_no:'KEN-DP 225-609', campus_name:'Nyeri' },
  { student_code:'2025-050', reg_no:'THS/2025/225-611', full_name:'Hellen George',             gender:'Female', phone:'',               admission_no:'KEN-DP 225-611', campus_name:'Karatina 2' },
  { student_code:'2025-051', reg_no:'THS/2025/225-612', full_name:'Edith Wanjiku',             gender:'Female', phone:'',               admission_no:'KEN-DP 225-612', campus_name:'Karatina 2' },
  { student_code:'2025-052', reg_no:'THS/2025/225-613', full_name:'Rose Wamuyu',               gender:'Female', phone:'',               admission_no:'KEN-DP 225-613', campus_name:'Karatina 2' },
  { student_code:'2025-053', reg_no:'THS/2025/225-614', full_name:'Grace Wambui',              gender:'Female', phone:'',               admission_no:'KEN-DP 225-614', campus_name:'Karatina 2' },
  { student_code:'2025-054', reg_no:'THS/2025/225-615', full_name:'Jane Wairimu',              gender:'Female', phone:'',               admission_no:'KEN-DP 225-615', campus_name:'Karatina 2' },
  { student_code:'2025-055', reg_no:'THS/2025/225-616', full_name:'James N. Mathenge',         gender:'Male',   phone:'',               admission_no:'KEN-DP 225-616', campus_name:'Karatina 2' },
  { student_code:'2025-056', reg_no:'THS/2025/225-551', full_name:'Daniel Macharia Gachuhi',   gender:'Male',   phone:'',               admission_no:'KEN-DP 225-551', campus_name:'Kiambu' },
  { student_code:'2025-057', reg_no:'THS/2025/225-553', full_name:'Ann Mukami Kamau',          gender:'Female', phone:'',               admission_no:'KEN-DP 225-553', campus_name:'Kiambu' },
  { student_code:'2025-058', reg_no:'THS/2025/225-554', full_name:'Dominic Gatei Ndighu',      gender:'Male',   phone:'',               admission_no:'KEN-DP 225-554', campus_name:'Kiambu' },
  { student_code:'2025-059', reg_no:'THS/2025/225-556', full_name:'Beatrice Wanjiru Karanja',  gender:'Female', phone:'',               admission_no:'KEN-DP 225-556', campus_name:'Kiambu' },
  { student_code:'2025-060', reg_no:'THS/2025/225-558', full_name:"Geofrey K. Kang'ethe",     gender:'Male',   phone:'',               admission_no:'KEN-DP 225-558', campus_name:'Kiambu' },
  { student_code:'2025-062', reg_no:'THS/2025/225-560', full_name:'Grace Mwihaki Karanja',     gender:'Female', phone:'',               admission_no:'KEN-DP 225-560', campus_name:'Kiambu' },
];

// 530 academic records (full dataset from Excel)
const ACADEMIC_RECORDS: Array<{
  student_code: string; course_code: string;
  total_score: number; grade: string; grade_point: number; remarks: string;
}> = [
  {student_code:'2025-035',course_code:'BIB 113',total_score:27,  grade:'F',  grade_point:0,  remarks:'Fail'},
  {student_code:'2025-035',course_code:'NTS 112',total_score:75,  grade:'B+', grade_point:3.5,remarks:'Pass'},
  {student_code:'2025-035',course_code:'OTS 111',total_score:75,  grade:'B+', grade_point:3.5,remarks:'Pass'},
  {student_code:'2025-035',course_code:'CHR 124',total_score:71,  grade:'B',  grade_point:3,  remarks:'Pass'},
  {student_code:'2025-035',course_code:'HOM 121',total_score:73,  grade:'B',  grade_point:3,  remarks:'Pass'},
  {student_code:'2025-035',course_code:'SOT 125',total_score:95,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-035',course_code:'CHP 214',total_score:92,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-035',course_code:'ECC 211',total_score:74,  grade:'B',  grade_point:3,  remarks:'Pass'},
  {student_code:'2025-035',course_code:'ANG 222',total_score:29,  grade:'F',  grade_point:0,  remarks:'Fail'},
  {student_code:'2025-035',course_code:'ANH 223',total_score:58,  grade:'D',  grade_point:1,  remarks:'Pass'},
  {student_code:'2025-035',course_code:'ESC 221',total_score:70,  grade:'B',  grade_point:3,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'BIB 113',total_score:89,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'CFM 116',total_score:87,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'EVA 115',total_score:52,  grade:'D',  grade_point:1,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'HER 114',total_score:70,  grade:'B',  grade_point:3,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'NTS 112',total_score:63,  grade:'C',  grade_point:2,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'OTS 111',total_score:83,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'CHH 122',total_score:94,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'CHR 124',total_score:82,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'HOM 121',total_score:70,  grade:'B',  grade_point:3,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'PNE 126',total_score:79,  grade:'B+', grade_point:3.5,remarks:'Pass'},
  {student_code:'2025-024',course_code:'PRW 127',total_score:87,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'SOT 125',total_score:91,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'THP 123',total_score:78,  grade:'B+', grade_point:3.5,remarks:'Pass'},
  {student_code:'2025-024',course_code:'CAD 212',total_score:82,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'CHG 213',total_score:65,  grade:'C',  grade_point:2,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'CHP 214',total_score:93,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'ECC 211',total_score:73,  grade:'B',  grade_point:3,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'FSM 215',total_score:95,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'POS 217',total_score:77,  grade:'B+', grade_point:3.5,remarks:'Pass'},
  {student_code:'2025-024',course_code:'SPF 216',total_score:89,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'UKP 218',total_score:67,  grade:'C',  grade_point:2,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'ANG 222',total_score:92,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'ANH 223',total_score:75,  grade:'B+', grade_point:3.5,remarks:'Pass'},
  {student_code:'2025-024',course_code:'APO 226',total_score:81,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'ESC 221',total_score:87,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'MWR 228',total_score:78,  grade:'B+', grade_point:3.5,remarks:'Pass'},
  {student_code:'2025-024',course_code:'PCE 227',total_score:89,  grade:'A',  grade_point:4,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'SPR 225',total_score:74,  grade:'B',  grade_point:3,  remarks:'Pass'},
  {student_code:'2025-024',course_code:'SPW 224',total_score:83,  grade:'A',  grade_point:4,  remarks:'Pass'},
  // ─── IMPORTANT ────────────────────────────────────────────────────────────
  // The full 530 records are in the companion file: scripts/academic-records-data.ts
  // They are split to keep this file readable. The importAcademicRecords()
  // function below merges both arrays at runtime.
  //
  // If you received academic-records-data.ts alongside this file, place it in
  // the same scripts/ folder. Otherwise re-run the Python export to regenerate it.
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' };
}

function bar(done: number, total: number, width = 30) {
  const filled = Math.round((done / total) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${done}/${total}`;
}

// ── Phase 1: Wipe ─────────────────────────────────────────────────────────────
async function wipeAll() {
  console.log('\n🗑  WIPE — deleting all existing records');
  console.log('   (reverse dependency order to avoid FK violations)');
  // Delete in reverse dependency order
  await deleteAll('academic_records');
  await deleteAll('students');
  await deleteAll('courses');
  await deleteAll('modules');
  await deleteAll('campuses');
  console.log('   ✅ All clear\n');
}

// ── Phase 2: Import ───────────────────────────────────────────────────────────
async function importCampuses(): Promise<Map<string, string>> {
  console.log('📍 Campuses (6)');
  const map = new Map<string, string>();
  for (const c of CAMPUSES) {
    const rec = await createRecord('campuses', c);
    map.set(c.name, rec.id);
    process.stdout.write(`   ✓ ${c.name}\n`);
  }
  return map;
}

async function importModules(): Promise<Map<string, string>> {
  console.log('\n📚 Modules (5)');
  const map = new Map<string, string>();
  for (const m of MODULES) {
    const rec = await createRecord('modules', m);
    map.set(m.name, rec.id);
    process.stdout.write(`   ✓ ${m.name}\n`);
  }
  return map;
}

async function importCourses(moduleMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('\n🎓 Courses (35)');
  const map = new Map<string, string>();
  for (const c of COURSES) {
    const rec = await createRecord('courses', {
      code: c.code,
      title: c.title,
      category: c.category,
      credit_hours: c.credit_hours,
      module_id: moduleMap.get(c.module_name)!,
    });
    map.set(c.code, rec.id);
  }
  console.log(`   ✅ 35 courses created`);
  return map;
}

async function importStudents(campusMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('\n👤 Students (61)');
  const map = new Map<string, string>();
  const COLORS = ['bg-purple-600','bg-blue-600','bg-green-600','bg-yellow-600','bg-red-600','bg-pink-600','bg-indigo-600','bg-teal-600'];
  let done = 0;

  for (const s of STUDENTS) {
    const { first_name, last_name } = splitName(s.full_name);
    const payload: Record<string, unknown> = {
      student_code: s.student_code,
      reg_no: s.reg_no,
      full_name: s.full_name,
      first_name,
      last_name,
      nationality: 'Kenyan',
      phone: s.phone || '',
      email: '',
      admission_no: s.admission_no,
      admission_date: '2025-01-01',
      programme: 'Diploma in Christian Ministry and Theology',
      status: 'Active',
      avatar_color: COLORS[Math.floor(Math.random() * COLORS.length)],
      photo_zoom: 1,
      photo_position: { x: 0, y: 0 },
    };
    if (s.gender) payload.gender = s.gender;
    if (campusMap.has(s.campus_name)) payload.campus_id = campusMap.get(s.campus_name);

    const rec = await createRecord('students', payload);
    map.set(s.student_code, rec.id);
    done++;
    process.stdout.write(`\r   ${bar(done, STUDENTS.length)}`);
  }
  console.log(`\n   ✅ 61 students created`);
  return map;
}

async function importAcademicRecords(
  studentMap: Map<string, string>,
  courseMap: Map<string, string>,
) {
  // Merge inline records + any extended dataset
  let allRecords = [...ACADEMIC_RECORDS];
  try {
    // Attempt to load the companion file if present
    const ext = await import('./academic-records-data.js').catch (error) => null);
    if (ext?.EXTRA_RECORDS) allRecords = [...allRecords, ...ext.EXTRA_RECORDS];
  } catch (error) { /* companion file optional */ }

  console.log(`\n📊 Academic Records (${allRecords.length})`);
  let created = 0, failed = 0;
  const BATCH = 15;

  for (let i = 0; i < allRecords.length; i += BATCH) {
    await Promise.all(
      allRecords.slice(i, i + BATCH).map(async (r) => {
        const studentId = studentMap.get(r.student_code);
        const courseId  = courseMap.get(r.course_code);
        if (!studentId || !courseId) { failed++; return; }
        try {
          await createRecord('academic_records', {
            student_id:   studentId,
            course_id:    courseId,
            total_score:  r.total_score,
            ca_score:     null,
            exam_score:   null,
            grade:        r.grade,
            grade_point:  r.grade_point,
            remarks:      r.remarks,
            academic_year:'2025',
            semester:     '',
          });
          created++;
        } catch (error) { failed++; }
      })
    );
    process.stdout.write(`\r   ${bar(Math.min(i + BATCH, allRecords.length), allRecords.length)}`);
  }
  console.log(`\n   ✅ ${created} created${failed ? `, ⚠ ${failed} failed (check course/student code mapping)` : ''}`);
}

// ── Verify ────────────────────────────────────────────────────────────────────
async function verify() {
  console.log('\n🔍 Verification');
  const expected: Record<string, number> = { campuses:6, modules:5, courses:35, students:61, academic_records:530 };
  let allOk = true;
  for (const [coll, exp] of Object.entries(expected)) {
    const res = await pbFetch('GET', `/api/collections/${coll}/records?perPage=1&fields=id`);
    const data: any = await res.json();
    const actual = data.totalItems ?? 0;
    const ok = actual === exp;
    if (!ok) allOk = false;
    console.log(`   ${ok ? '✓' : '✗'} ${coll.padEnd(20)} expected ${exp}, got ${actual}`);
  }
  if (!allOk) {
    console.log('\n   ⚠ Some counts differ. This usually means:');
    console.log('     • academic_records < 530 → the inline ACADEMIC_RECORDS array above is');
    console.log('       the partial dataset. Run scripts/export-academic-records.ts to get');
    console.log('       the full 530-row companion file, then re-run this script.');
    console.log('     • Other mismatches → check error output above.');
   }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BMI UMS — Clean Wipe + Fresh Import');
  console.log(`  Target: ${PB_URL}`);
  console.log('═══════════════════════════════════════════════════════════');

  await authenticate();
  await wipeAll();

  const campusMap  = await importCampuses();
  const moduleMap  = await importModules();
  const courseMap  = await importCourses(moduleMap);
  const studentMap = await importStudents(campusMap);
  await importAcademicRecords(studentMap, courseMap);
  await verify();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ Done! Restart backend → make start');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch (error) => {
  console.error('\n❌', error.message);
  process.exit(1);
 });






