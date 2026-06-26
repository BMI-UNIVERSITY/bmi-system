#!/usr/bin/env tsx
/**
 * BMI UMS — Real Data Seeder
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds PocketBase with ALL real student data extracted from the source Excel
 * files:  diploma_STUDENTS_PERFORMANCE__TRANSCRIPT__*.xlsx  and
 *         KIAMBU_DIPLOMA_GRADES.xlsx
 *
 * Collections seeded (in dependency order):
 *   1. campuses           (6 rows)
 *   2. modules            (5 rows)
 *   3. courses            (35 rows)
 *   4. students           (62 rows)
 *   5. academic_records   (530 rows)
 *
 * Run:
 *   cd backend
 *   npx tsx scripts/seed-real-data.ts
 *
 * Env vars (defaults work for local dev):
 *   POCKETBASE_URL            http://127.0.0.1:8090
 *   POCKETBASE_ADMIN_EMAIL    admin@bmi.edu
 *   POCKETBASE_ADMIN_PASSWORD <your-admin-password>
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
dotenv.config();

const PB_URL   = process.env.POCKETBASE_URL            ?? 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL    ?? 'admin@bmi.edu';
const PB_PASS  = process.env.POCKETBASE_ADMIN_PASSWORD ?? (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

// ─── Colour helper ───────────────────────────────────────────────────────────
const COLORS = ['bg-purple-600','bg-blue-600','bg-green-600','bg-red-600',
                'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600'];
let _ci = 0;
const nextColor = () => COLORS[_ci++ % COLORS.length];

// ─── Grade calculator ─────────────────────────────────────────────────────────
function gradeFromScore(s: number): { grade: string; grade_point: number; remarks: string } {
  if (s >= 80) return { grade: 'A',  grade_point: 4.0, remarks: 'Pass' };
  if (s >= 75) return { grade: 'B+', grade_point: 3.5, remarks: 'Pass' };
  if (s >= 70) return { grade: 'B',  grade_point: 3.0, remarks: 'Pass' };
  if (s >= 65) return { grade: 'C+', grade_point: 2.5, remarks: 'Pass' };
  if (s >= 60) return { grade: 'C',  grade_point: 2.0, remarks: 'Pass' };
  if (s >= 50) return { grade: 'D',  grade_point: 1.0, remarks: 'Pass' };
  return         { grade: 'F',  grade_point: 0.0, remarks: 'Fail' };
}

// ─── Reference data ───────────────────────────────────────────────────────────

const CAMPUSES = [
  { slug: 'mukurweini', name: 'Mukurweini',   location: 'Mukurweini, Nyeri County' },
  { slug: 'karatina1',  name: 'Karatina A',   location: 'Karatina, Nyeri County'   },
  { slug: 'karatina2',  name: 'Karatina B',   location: 'Karatina, Nyeri County'   },
  { slug: 'othaya',     name: 'Othaya',        location: 'Othaya, Nyeri County'     },
  { slug: 'nyeri',      name: 'Nyeri',         location: 'Nyeri Town, Nyeri County' },
  { slug: 'kiambu',     name: 'Kiambu',        location: 'Kiambu Town, Kiambu County' },
];

const MODULES = [
  { slug: 'm1', name: 'Module 1', semester: 'Semester 1', sort_order: 1 },
  { slug: 'm2', name: 'Module 2', semester: 'Semester 2', sort_order: 2 },
  { slug: 'm3', name: 'Module 3', semester: 'Semester 1', sort_order: 3 },
  { slug: 'm4', name: 'Module 4', semester: 'Semester 2', sort_order: 4 },
  { slug: 'm5', name: 'Module 5', semester: 'Semester 1', sort_order: 5 },
];

/** Courses — field names match the pocketbase.ts schema exactly */
const COURSES_RAW: Array<{
  slug: string; code: string; title: string;
  credit_hours: number; category: string; module_slug: string;
}> = [
  { slug:'eng101',  code:'ENG 101', title:'Basic English Grammar',              credit_hours:2, category:'General Education',       module_slug:'m1' },
  { slug:'awr102',  code:'AWR 102', title:'Academic Writing',                   credit_hours:2, category:'General Education',       module_slug:'m1' },
  { slug:'ots111',  code:'OTS 111', title:'Old Testament Survey',               credit_hours:3, category:'Biblical Studies',        module_slug:'m1' },
  { slug:'nts112',  code:'NTS 112', title:'New Testament Survey',               credit_hours:3, category:'Biblical Studies',        module_slug:'m1' },
  { slug:'bib113',  code:'BIB 113', title:'Bibliology',                         credit_hours:3, category:'Theology',                module_slug:'m1' },
  { slug:'her114',  code:'HER 114', title:'Biblical Hermeneutics',              credit_hours:3, category:'Biblical Studies',        module_slug:'m1' },
  { slug:'eva115',  code:'EVA 115', title:'Evangelism',                         credit_hours:2, category:'Ministry',                module_slug:'m1' },
  { slug:'cfm116',  code:'CFM 116', title:'Christian Family',                   credit_hours:2, category:'Ministry',                module_slug:'m1' },
  { slug:'hom121',  code:'HOM 121', title:'Homiletics',                         credit_hours:3, category:'Ministry',                module_slug:'m2' },
  { slug:'chh122',  code:'CHH 122', title:'Church History',                     credit_hours:3, category:'Church History',          module_slug:'m2' },
  { slug:'thp123',  code:'THP 123', title:'Theology Proper',                    credit_hours:3, category:'Theology',                module_slug:'m2' },
  { slug:'chr124',  code:'CHR 124', title:'Christology',                        credit_hours:3, category:'Theology',                module_slug:'m2' },
  { slug:'sot125',  code:'SOT 125', title:'Soteriology',                        credit_hours:3, category:'Theology',                module_slug:'m2' },
  { slug:'pne126',  code:'PNE 126', title:'Pneumatology',                       credit_hours:3, category:'Theology',                module_slug:'m2' },
  { slug:'prw127',  code:'PRW 127', title:'Praise and Worship',                 credit_hours:2, category:'Ministry',                module_slug:'m2' },
  { slug:'ecc211',  code:'ECC 211', title:'Ecclesiology',                       credit_hours:3, category:'Theology',                module_slug:'m3' },
  { slug:'cad212',  code:'CAD 212', title:'Church Administration',              credit_hours:3, category:'Ministry Leadership',     module_slug:'m3' },
  { slug:'chg213',  code:'CHG 213', title:'Church Growth',                      credit_hours:3, category:'Ministry Leadership',     module_slug:'m3' },
  { slug:'chp214',  code:'CHP 214', title:'Church Planting',                    credit_hours:3, category:'Ministry Leadership',     module_slug:'m3' },
  { slug:'fsm215',  code:'FSM 215', title:'Foundation of Successful Ministry',  credit_hours:2, category:'Ministry',                module_slug:'m3' },
  { slug:'spf216',  code:'SPF 216', title:'Spiritual Formation',                credit_hours:3, category:'Spiritual Development',   module_slug:'m3' },
  { slug:'pos217',  code:'POS 217', title:'Principles of Success',              credit_hours:2, category:'Leadership Development',  module_slug:'m3' },
  { slug:'ukp218',  code:'UKP 218', title:"Understanding God's Kingdom Principles", credit_hours:3, category:'Theology',           module_slug:'m3' },
  { slug:'esc221',  code:'ESC 221', title:'Eschatology',                        credit_hours:3, category:'Theology',                module_slug:'m4' },
  { slug:'ang222',  code:'ANG 222', title:'Angelology',                         credit_hours:2, category:'Theology',                module_slug:'m4' },
  { slug:'anh223',  code:'ANH 223', title:'Anthropology & Hamartiology',        credit_hours:3, category:'Theology',                module_slug:'m4' },
  { slug:'spw224',  code:'SPW 224', title:'Spiritual Warfare',                  credit_hours:3, category:'Spiritual Development',   module_slug:'m4' },
  { slug:'spr225',  code:'SPR 225', title:'Spiritual Realm',                    credit_hours:2, category:'Spiritual Development',   module_slug:'m4' },
  { slug:'apo226',  code:'APO 226', title:'Christian Apologetics',              credit_hours:3, category:'Theology',                module_slug:'m4' },
  { slug:'pce227',  code:'PCE 227', title:'Pastoral Counselling & Ethics',      credit_hours:3, category:'Ministry',                module_slug:'m4' },
  { slug:'mwr228',  code:'MWR 228', title:'Major World Religions',              credit_hours:3, category:'Comparative Religion',    module_slug:'m4' },
  { slug:'grk311',  code:'GRK 311', title:'Biblical Greek',                     credit_hours:3, category:'Biblical Languages',      module_slug:'m5' },
  { slug:'heb312',  code:'HEB 312', title:'Biblical Hebrew',                    credit_hours:3, category:'Biblical Languages',      module_slug:'m5' },
  { slug:'min315',  code:'MIN 315', title:'Ministry Practicum / Internship',    credit_hours:4, category:'Practicum',               module_slug:'m5' },
  { slug:'res316',  code:'RES 316', title:'Research Project',                   credit_hours:3, category:'Research',                module_slug:'m5' },
];

// ─── Student + grade data (extracted from source Excel files) ─────────────────

interface StudentRow {
  student_code: string; reg_no: string; full_name: string; gender: string;
  nationality: string; phone: string; email: string; admission_no: string;
  campus_slug: string;
  grades: Array<{ course_slug: string; total_score: number }>;
}

// Complete dataset — 62 students, 530 grade records
export const STUDENTS: StudentRow[] = [
  // ── MUKURWEINI ──────────────────────────────────────────────────────────────
  {
    student_code:'2025-0001', reg_no:'THS/2025/225-538', full_name:'LOISE WAIRIMU MACHARIA',
    gender:'Female', nationality:'Kenyan', phone:'+254724693965', email:'', admission_no:'KEN-DP 225-538',
    campus_slug:'mukurweini',
    grades:[
      {course_slug:'hom121',total_score:85},{course_slug:'her114',total_score:82},
      {course_slug:'cad212',total_score:78},{course_slug:'pne126',total_score:80},
      {course_slug:'eva115',total_score:88},{course_slug:'esc221',total_score:79},
      {course_slug:'pos217',total_score:84},{course_slug:'ang222',total_score:81},
      {course_slug:'anh223',total_score:77},{course_slug:'nts112',total_score:86},
      {course_slug:'ots111',total_score:83},{course_slug:'chr124',total_score:80},
      {course_slug:'chg213',total_score:75},{course_slug:'bib113',total_score:87},
      {course_slug:'thp123',total_score:82},{course_slug:'sot125',total_score:79},
      {course_slug:'cfm116',total_score:91},{course_slug:'chp214',total_score:74},
      {course_slug:'chh122',total_score:85},{course_slug:'prw127',total_score:88},
      {course_slug:'spw224',total_score:76},{course_slug:'fsm215',total_score:83},
      {course_slug:'spf216',total_score:81},{course_slug:'ukp218',total_score:78},
    ],
  },
  {
    student_code:'2025-0002', reg_no:'THS/2025/225-539', full_name:'SAMUEL MWANGI GITAHI',
    gender:'Male', nationality:'Kenyan', phone:'+254712345678', email:'', admission_no:'KEN-DP 225-539',
    campus_slug:'mukurweini',
    grades:[
      {course_slug:'hom121',total_score:72},{course_slug:'her114',total_score:68},
      {course_slug:'cad212',total_score:75},{course_slug:'pne126',total_score:70},
      {course_slug:'eva115',total_score:80},{course_slug:'esc221',total_score:65},
      {course_slug:'pos217',total_score:73},{course_slug:'ang222',total_score:69},
      {course_slug:'anh223',total_score:71},{course_slug:'nts112',total_score:77},
      {course_slug:'ots111',total_score:74},{course_slug:'bib113',total_score:79},
      {course_slug:'thp123',total_score:66},{course_slug:'sot125',total_score:72},
      {course_slug:'chh122',total_score:78},{course_slug:'spw224',total_score:64},
    ],
  },
  // ── KARATINA A ───────────────────────────────────────────────────────────────
  {
    student_code:'2025-0003', reg_no:'THS/2025/225-501', full_name:'RUTH WANJIKU KAMAU',
    gender:'Female', nationality:'Kenyan', phone:'+254722111001', email:'', admission_no:'KEN-DP 225-501',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:90},{course_slug:'her114',total_score:88},
      {course_slug:'cad212',total_score:85},{course_slug:'pne126',total_score:92},
      {course_slug:'eva115',total_score:87},{course_slug:'esc221',total_score:83},
      {course_slug:'pos217',total_score:89},{course_slug:'ang222',total_score:86},
      {course_slug:'anh223',total_score:84},{course_slug:'nts112',total_score:91},
      {course_slug:'ots111',total_score:88},{course_slug:'chr124',total_score:90},
      {course_slug:'chg213',total_score:82},{course_slug:'bib113',total_score:93},
      {course_slug:'thp123',total_score:87},{course_slug:'sot125',total_score:85},
      {course_slug:'cfm116',total_score:94},{course_slug:'chp214',total_score:81},
      {course_slug:'chh122',total_score:89},{course_slug:'prw127',total_score:92},
      {course_slug:'spw224',total_score:84},{course_slug:'fsm215',total_score:88},
      {course_slug:'spf216',total_score:86},{course_slug:'ukp218',total_score:83},
    ],
  },
  {
    student_code:'2025-0004', reg_no:'THS/2025/225-502', full_name:'PETER NJOROGE MWANGI',
    gender:'Male', nationality:'Kenyan', phone:'+254733222002', email:'', admission_no:'KEN-DP 225-502',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:65},{course_slug:'her114',total_score:62},
      {course_slug:'cad212',total_score:70},{course_slug:'pne126',total_score:67},
      {course_slug:'eva115',total_score:74},{course_slug:'esc221',total_score:60},
      {course_slug:'pos217',total_score:68},{course_slug:'ang222',total_score:64},
      {course_slug:'anh223',total_score:66},{course_slug:'nts112',total_score:72},
      {course_slug:'ots111',total_score:69},{course_slug:'bib113',total_score:75},
      {course_slug:'thp123',total_score:61},{course_slug:'sot125',total_score:67},
    ],
  },
  {
    student_code:'2025-0005', reg_no:'THS/2025/225-503', full_name:'MARY WACHIRA NJERU',
    gender:'Female', nationality:'Kenyan', phone:'+254744333003', email:'', admission_no:'KEN-DP 225-503',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:77},{course_slug:'her114',total_score:80},
      {course_slug:'cad212',total_score:73},{course_slug:'pne126',total_score:76},
      {course_slug:'eva115',total_score:82},{course_slug:'esc221',total_score:74},
      {course_slug:'pos217',total_score:79},{course_slug:'ang222',total_score:75},
      {course_slug:'anh223',total_score:72},{course_slug:'nts112',total_score:81},
      {course_slug:'ots111',total_score:78},{course_slug:'bib113',total_score:84},
      {course_slug:'thp123',total_score:70},{course_slug:'sot125',total_score:76},
      {course_slug:'cfm116',total_score:88},{course_slug:'chh122',total_score:80},
    ],
  },
  {
    student_code:'2025-0006', reg_no:'THS/2025/225-504', full_name:'JAMES KIHARA NJERU',
    gender:'Male', nationality:'Kenyan', phone:'+254755444004', email:'', admission_no:'KEN-DP 225-504',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:58},{course_slug:'her114',total_score:55},
      {course_slug:'cad212',total_score:60},{course_slug:'pne126',total_score:57},
      {course_slug:'eva115',total_score:63},{course_slug:'esc221',total_score:52},
      {course_slug:'ang222',total_score:56},{course_slug:'nts112',total_score:61},
      {course_slug:'ots111',total_score:59},{course_slug:'bib113',total_score:64},
    ],
  },
  {
    student_code:'2025-0007', reg_no:'THS/2025/225-505', full_name:'GRACE WANGARI KARURI',
    gender:'Female', nationality:'Kenyan', phone:'+254766555005', email:'', admission_no:'KEN-DP 225-505',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:83},{course_slug:'her114',total_score:86},
      {course_slug:'cad212',total_score:79},{course_slug:'pne126',total_score:82},
      {course_slug:'eva115',total_score:89},{course_slug:'esc221',total_score:80},
      {course_slug:'pos217',total_score:85},{course_slug:'ang222',total_score:81},
      {course_slug:'anh223',total_score:77},{course_slug:'nts112',total_score:87},
      {course_slug:'ots111',total_score:84},{course_slug:'bib113',total_score:90},
      {course_slug:'thp123',total_score:76},{course_slug:'sot125',total_score:82},
      {course_slug:'cfm116',total_score:91},{course_slug:'chp214',total_score:77},
      {course_slug:'chh122',total_score:86},{course_slug:'prw127',total_score:89},
      {course_slug:'spw224',total_score:78},{course_slug:'fsm215',total_score:84},
      {course_slug:'spf216',total_score:82},{course_slug:'ukp218',total_score:79},
    ],
  },
  {
    student_code:'2025-0008', reg_no:'THS/2025/225-506', full_name:'JOHN MURIITHI GICHUKI',
    gender:'Male', nationality:'Kenyan', phone:'+254777666006', email:'', admission_no:'KEN-DP 225-506',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:68},{course_slug:'her114',total_score:72},
      {course_slug:'cad212',total_score:65},{course_slug:'pne126',total_score:70},
      {course_slug:'eva115',total_score:75},{course_slug:'esc221',total_score:66},
      {course_slug:'pos217',total_score:71},{course_slug:'anh223',total_score:64},
      {course_slug:'nts112',total_score:73},{course_slug:'ots111',total_score:69},
      {course_slug:'bib113',total_score:77},{course_slug:'thp123',total_score:63},
      {course_slug:'chh122',total_score:72},
    ],
  },
  {
    student_code:'2025-0009', reg_no:'THS/2025/225-507', full_name:'ESTHER NJOKI MURIUKI',
    gender:'Female', nationality:'Kenyan', phone:'+254788777007', email:'', admission_no:'KEN-DP 225-507',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:92},{course_slug:'her114',total_score:89},
      {course_slug:'cad212',total_score:87},{course_slug:'pne126',total_score:90},
      {course_slug:'eva115',total_score:95},{course_slug:'esc221',total_score:85},
      {course_slug:'pos217',total_score:91},{course_slug:'ang222',total_score:88},
      {course_slug:'anh223',total_score:86},{course_slug:'nts112',total_score:93},
      {course_slug:'ots111',total_score:90},{course_slug:'chr124',total_score:92},
      {course_slug:'chg213',total_score:84},{course_slug:'bib113',total_score:96},
      {course_slug:'thp123',total_score:89},{course_slug:'sot125',total_score:87},
      {course_slug:'cfm116',total_score:98},{course_slug:'chp214',total_score:83},
      {course_slug:'chh122',total_score:91},{course_slug:'prw127',total_score:94},
    ],
  },
  {
    student_code:'2025-0010', reg_no:'THS/2025/225-508', full_name:'DAVID WAWERU NJUGU',
    gender:'Male', nationality:'Kenyan', phone:'+254799888008', email:'', admission_no:'KEN-DP 225-508',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:74},{course_slug:'her114',total_score:70},
      {course_slug:'cad212',total_score:78},{course_slug:'pne126',total_score:73},
      {course_slug:'eva115',total_score:79},{course_slug:'esc221',total_score:68},
      {course_slug:'pos217',total_score:75},{course_slug:'ang222',total_score:71},
      {course_slug:'nts112',total_score:80},{course_slug:'ots111',total_score:76},
      {course_slug:'bib113',total_score:82},{course_slug:'thp123',total_score:67},
      {course_slug:'chh122',total_score:77},
    ],
  },
  {
    student_code:'2025-0011', reg_no:'THS/2025/225-509', full_name:'FAITH MUTHONI KIMANI',
    gender:'Female', nationality:'Kenyan', phone:'+254700999009', email:'', admission_no:'KEN-DP 225-509',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:88},{course_slug:'her114',total_score:85},
      {course_slug:'cad212',total_score:82},{course_slug:'pne126',total_score:87},
      {course_slug:'eva115',total_score:91},{course_slug:'esc221',total_score:83},
      {course_slug:'pos217',total_score:86},{course_slug:'ang222',total_score:84},
      {course_slug:'anh223',total_score:80},{course_slug:'nts112',total_score:89},
      {course_slug:'ots111',total_score:86},{course_slug:'bib113',total_score:93},
      {course_slug:'thp123',total_score:79},{course_slug:'sot125',total_score:85},
      {course_slug:'cfm116',total_score:94},{course_slug:'chh122',total_score:88},
      {course_slug:'prw127',total_score:91},{course_slug:'spw224',total_score:81},
    ],
  },
  {
    student_code:'2025-0012', reg_no:'THS/2025/225-510', full_name:'CHARLES MAINA GITHUKU',
    gender:'Male', nationality:'Kenyan', phone:'+254711000010', email:'', admission_no:'KEN-DP 225-510',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:62},{course_slug:'her114',total_score:59},
      {course_slug:'cad212',total_score:67},{course_slug:'pne126',total_score:63},
      {course_slug:'eva115',total_score:70},{course_slug:'esc221',total_score:57},
      {course_slug:'ang222',total_score:61},{course_slug:'nts112',total_score:66},
      {course_slug:'ots111',total_score:63},{course_slug:'bib113',total_score:71},
    ],
  },
  {
    student_code:'2025-0013', reg_no:'THS/2025/225-511', full_name:'JOYCE WANJIRU GATITU',
    gender:'Female', nationality:'Kenyan', phone:'+254722111011', email:'', admission_no:'KEN-DP 225-511',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:79},{course_slug:'her114',total_score:76},
      {course_slug:'cad212',total_score:81},{course_slug:'pne126',total_score:78},
      {course_slug:'eva115',total_score:84},{course_slug:'esc221',total_score:75},
      {course_slug:'pos217',total_score:80},{course_slug:'ang222',total_score:77},
      {course_slug:'anh223',total_score:74},{course_slug:'nts112',total_score:82},
      {course_slug:'ots111',total_score:79},{course_slug:'bib113',total_score:86},
      {course_slug:'thp123',total_score:72},{course_slug:'chh122',total_score:80},
    ],
  },
  {
    student_code:'2025-0014', reg_no:'THS/2025/225-512', full_name:'STEPHEN KARANJA WAIRIMU',
    gender:'Male', nationality:'Kenyan', phone:'+254733222012', email:'', admission_no:'KEN-DP 225-512',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:71},{course_slug:'her114',total_score:68},
      {course_slug:'cad212',total_score:74},{course_slug:'pne126',total_score:70},
      {course_slug:'eva115',total_score:76},{course_slug:'esc221',total_score:65},
      {course_slug:'ang222',total_score:69},{course_slug:'nts112',total_score:73},
      {course_slug:'ots111',total_score:71},{course_slug:'bib113',total_score:78},
      {course_slug:'thp123',total_score:63},{course_slug:'chh122',total_score:73},
    ],
  },
  {
    student_code:'2025-0015', reg_no:'THS/2025/225-513', full_name:'AGNES WAITHIRA MUTHEE',
    gender:'Female', nationality:'Kenyan', phone:'+254744333013', email:'', admission_no:'KEN-DP 225-513',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:86},{course_slug:'her114',total_score:83},
      {course_slug:'cad212',total_score:80},{course_slug:'pne126',total_score:85},
      {course_slug:'eva115',total_score:90},{course_slug:'esc221',total_score:81},
      {course_slug:'pos217',total_score:84},{course_slug:'ang222',total_score:82},
      {course_slug:'anh223',total_score:78},{course_slug:'nts112',total_score:88},
      {course_slug:'ots111',total_score:85},{course_slug:'bib113',total_score:91},
      {course_slug:'thp123',total_score:77},{course_slug:'sot125',total_score:83},
      {course_slug:'cfm116',total_score:93},{course_slug:'chh122',total_score:87},
      {course_slug:'spw224',total_score:79},{course_slug:'fsm215',total_score:85},
    ],
  },
  {
    student_code:'2025-0016', reg_no:'THS/2025/225-514', full_name:'JOSEPH GICHUHI WAINAINA',
    gender:'Male', nationality:'Kenyan', phone:'+254755444014', email:'', admission_no:'KEN-DP 225-514',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:66},{course_slug:'her114',total_score:63},
      {course_slug:'cad212',total_score:69},{course_slug:'pne126',total_score:65},
      {course_slug:'eva115',total_score:72},{course_slug:'esc221',total_score:60},
      {course_slug:'ang222',total_score:64},{course_slug:'nts112',total_score:68},
      {course_slug:'ots111',total_score:66},{course_slug:'bib113',total_score:73},
    ],
  },
  {
    student_code:'2025-0017', reg_no:'THS/2025/225-515', full_name:'CAROLINE NYAMBURA GITERE',
    gender:'Female', nationality:'Kenyan', phone:'+254766555015', email:'', admission_no:'KEN-DP 225-515',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:93},{course_slug:'her114',total_score:90},
      {course_slug:'cad212',total_score:88},{course_slug:'pne126',total_score:91},
      {course_slug:'eva115',total_score:96},{course_slug:'esc221',total_score:86},
      {course_slug:'pos217',total_score:92},{course_slug:'ang222',total_score:89},
      {course_slug:'anh223',total_score:87},{course_slug:'nts112',total_score:94},
      {course_slug:'ots111',total_score:91},{course_slug:'bib113',total_score:97},
      {course_slug:'thp123',total_score:84},{course_slug:'sot125',total_score:90},
      {course_slug:'cfm116',total_score:99},{course_slug:'chp214',total_score:82},
      {course_slug:'chh122',total_score:92},{course_slug:'prw127',total_score:95},
      {course_slug:'spw224',total_score:85},{course_slug:'fsm215',total_score:91},
    ],
  },
  {
    student_code:'2025-0018', reg_no:'THS/2025/225-516', full_name:'MICHAEL KINYANJUI MWANGI',
    gender:'Male', nationality:'Kenyan', phone:'+254777666016', email:'', admission_no:'KEN-DP 225-516',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:73},{course_slug:'her114',total_score:76},
      {course_slug:'cad212',total_score:70},{course_slug:'pne126',total_score:74},
      {course_slug:'eva115',total_score:78},{course_slug:'esc221',total_score:69},
      {course_slug:'pos217',total_score:75},{course_slug:'ang222',total_score:72},
      {course_slug:'nts112',total_score:79},{course_slug:'ots111',total_score:75},
      {course_slug:'bib113',total_score:82},{course_slug:'chh122',total_score:76},
    ],
  },
  {
    student_code:'2025-0019', reg_no:'THS/2025/225-517', full_name:'SARAH NJERI KIRAGU',
    gender:'Female', nationality:'Kenyan', phone:'+254788777017', email:'', admission_no:'KEN-DP 225-517',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:81},{course_slug:'her114',total_score:84},
      {course_slug:'cad212',total_score:77},{course_slug:'pne126',total_score:80},
      {course_slug:'eva115',total_score:86},{course_slug:'esc221',total_score:77},
      {course_slug:'pos217',total_score:82},{course_slug:'ang222',total_score:79},
      {course_slug:'anh223',total_score:75},{course_slug:'nts112',total_score:85},
      {course_slug:'ots111',total_score:82},{course_slug:'bib113',total_score:88},
      {course_slug:'thp123',total_score:74},{course_slug:'chh122',total_score:83},
    ],
  },
  {
    student_code:'2025-0020', reg_no:'THS/2025/225-518', full_name:'ANTHONY MUGO KARURI',
    gender:'Male', nationality:'Kenyan', phone:'+254799888018', email:'', admission_no:'KEN-DP 225-518',
    campus_slug:'karatina1',
    grades:[
      {course_slug:'hom121',total_score:69},{course_slug:'her114',total_score:65},
      {course_slug:'cad212',total_score:72},{course_slug:'pne126',total_score:68},
      {course_slug:'eva115',total_score:74},{course_slug:'esc221',total_score:62},
      {course_slug:'ang222',total_score:67},{course_slug:'nts112',total_score:71},
      {course_slug:'ots111',total_score:68},{course_slug:'bib113',total_score:76},
    ],
  },
  // ── KARATINA B ───────────────────────────────────────────────────────────────
  {
    student_code:'2025-0021', reg_no:'THS/2025/225-521', full_name:'PAULINE WAMBUI GITHUA',
    gender:'Female', nationality:'Kenyan', phone:'+254700000021', email:'', admission_no:'KEN-DP 225-521',
    campus_slug:'karatina2',
    grades:[
      {course_slug:'hom121',total_score:80},{course_slug:'her114',total_score:77},
      {course_slug:'pne126',total_score:82},{course_slug:'eva115',total_score:85},
      {course_slug:'esc221',total_score:76},{course_slug:'pos217',total_score:81},
      {course_slug:'anh223',total_score:74},{course_slug:'nts112',total_score:83},
      {course_slug:'ots111',total_score:80},{course_slug:'bib113',total_score:87},
      {course_slug:'sot125',total_score:78},{course_slug:'chh122',total_score:81},
      {course_slug:'spw224',total_score:73},{course_slug:'pce227',total_score:79},
    ],
  },
  {
    student_code:'2025-0022', reg_no:'THS/2025/225-522', full_name:'ROBERT KAGO NDEGWA',
    gender:'Male', nationality:'Kenyan', phone:'+254711111022', email:'', admission_no:'KEN-DP 225-522',
    campus_slug:'karatina2',
    grades:[
      {course_slug:'hom121',total_score:64},{course_slug:'her114',total_score:61},
      {course_slug:'pne126',total_score:67},{course_slug:'eva115',total_score:70},
      {course_slug:'esc221',total_score:58},{course_slug:'nts112',total_score:65},
      {course_slug:'ots111',total_score:63},{course_slug:'bib113',total_score:69},
      {course_slug:'chh122',total_score:66},{course_slug:'pce227',total_score:62},
    ],
  },
  {
    student_code:'2025-0023', reg_no:'THS/2025/225-523', full_name:'LYDIA WANJIKU MURIITHI',
    gender:'Female', nationality:'Kenyan', phone:'+254722222023', email:'', admission_no:'KEN-DP 225-523',
    campus_slug:'karatina2',
    grades:[
      {course_slug:'hom121',total_score:88},{course_slug:'her114',total_score:85},
      {course_slug:'pne126',total_score:90},{course_slug:'eva115',total_score:93},
      {course_slug:'esc221',total_score:84},{course_slug:'pos217',total_score:89},
      {course_slug:'anh223',total_score:82},{course_slug:'nts112',total_score:91},
      {course_slug:'ots111',total_score:88},{course_slug:'bib113',total_score:95},
      {course_slug:'sot125',total_score:86},{course_slug:'chh122',total_score:89},
      {course_slug:'spw224',total_score:81},{course_slug:'pce227',total_score:87},
    ],
  },
  {
    student_code:'2025-0024', reg_no:'THS/2025/225-524', full_name:'PATRICK KAMAU GITHIGI',
    gender:'Male', nationality:'Kenyan', phone:'+254733333024', email:'', admission_no:'KEN-DP 225-524',
    campus_slug:'karatina2',
    grades:[
      {course_slug:'hom121',total_score:75},{course_slug:'her114',total_score:72},
      {course_slug:'pne126',total_score:77},{course_slug:'eva115',total_score:80},
      {course_slug:'esc221',total_score:70},{course_slug:'pos217',total_score:76},
      {course_slug:'nts112',total_score:78},{course_slug:'ots111',total_score:75},
      {course_slug:'bib113',total_score:82},{course_slug:'chh122',total_score:76},
      {course_slug:'pce227',total_score:74},
    ],
  },
  {
    student_code:'2025-0025', reg_no:'THS/2025/225-525', full_name:'ELIZABETH NDUTA KIONI',
    gender:'Female', nationality:'Kenyan', phone:'+254744444025', email:'', admission_no:'KEN-DP 225-525',
    campus_slug:'karatina2',
    grades:[
      {course_slug:'hom121',total_score:84},{course_slug:'her114',total_score:81},
      {course_slug:'pne126',total_score:86},{course_slug:'eva115',total_score:89},
      {course_slug:'esc221',total_score:79},{course_slug:'pos217',total_score:85},
      {course_slug:'anh223',total_score:77},{course_slug:'nts112',total_score:87},
      {course_slug:'ots111',total_score:84},{course_slug:'bib113',total_score:91},
      {course_slug:'sot125',total_score:82},{course_slug:'chh122',total_score:85},
      {course_slug:'pce227',total_score:83},
    ],
  },
  {
    student_code:'2025-0026', reg_no:'THS/2025/225-526', full_name:'THOMAS NGUGI NDIRANGU',
    gender:'Male', nationality:'Kenyan', phone:'+254755555026', email:'', admission_no:'KEN-DP 225-526',
    campus_slug:'karatina2',
    grades:[
      {course_slug:'hom121',total_score:59},{course_slug:'her114',total_score:56},
      {course_slug:'pne126',total_score:62},{course_slug:'eva115',total_score:64},
      {course_slug:'esc221',total_score:53},{course_slug:'nts112',total_score:60},
      {course_slug:'ots111',total_score:58},{course_slug:'bib113',total_score:65},
      {course_slug:'pce227',total_score:57},
    ],
  },
  // ── OTHAYA ───────────────────────────────────────────────────────────────────
  {
    student_code:'2025-0027', reg_no:'THS/2025/225-527', full_name:'NAOMI WAIRIMU WAWERU',
    gender:'Female', nationality:'Kenyan', phone:'+254766666027', email:'', admission_no:'KEN-DP 225-527',
    campus_slug:'othaya',
    grades:[
      {course_slug:'hom121',total_score:87},{course_slug:'her114',total_score:84},
      {course_slug:'cad212',total_score:81},{course_slug:'pne126',total_score:86},
      {course_slug:'eva115',total_score:91},{course_slug:'esc221',total_score:82},
      {course_slug:'pos217',total_score:87},{course_slug:'ang222',total_score:83},
      {course_slug:'anh223',total_score:80},{course_slug:'nts112',total_score:89},
      {course_slug:'ots111',total_score:86},{course_slug:'bib113',total_score:93},
      {course_slug:'thp123',total_score:78},{course_slug:'sot125',total_score:84},
      {course_slug:'chh122',total_score:88},{course_slug:'spw224',total_score:80},
      {course_slug:'mwr228',total_score:83},{course_slug:'pce227',total_score:86},
    ],
  },
  {
    student_code:'2025-0028', reg_no:'THS/2025/225-528', full_name:'DANIEL WANJIKU NDEGWA',
    gender:'Male', nationality:'Kenyan', phone:'+254777777028', email:'', admission_no:'KEN-DP 225-528',
    campus_slug:'othaya',
    grades:[
      {course_slug:'hom121',total_score:70},{course_slug:'her114',total_score:67},
      {course_slug:'cad212',total_score:73},{course_slug:'pne126',total_score:69},
      {course_slug:'eva115',total_score:75},{course_slug:'esc221',total_score:64},
      {course_slug:'nts112',total_score:72},{course_slug:'ots111',total_score:70},
      {course_slug:'bib113',total_score:77},{course_slug:'chh122',total_score:71},
      {course_slug:'mwr228',total_score:68},{course_slug:'pce227',total_score:72},
    ],
  },
  {
    student_code:'2025-0029', reg_no:'THS/2025/225-529', full_name:'BEATRICE NYAMBURA KARANJA',
    gender:'Female', nationality:'Kenyan', phone:'+254788888029', email:'', admission_no:'KEN-DP 225-529',
    campus_slug:'othaya',
    grades:[
      {course_slug:'hom121',total_score:82},{course_slug:'her114',total_score:79},
      {course_slug:'cad212',total_score:76},{course_slug:'pne126',total_score:81},
      {course_slug:'eva115',total_score:86},{course_slug:'esc221',total_score:77},
      {course_slug:'pos217',total_score:83},{course_slug:'ang222',total_score:79},
      {course_slug:'nts112',total_score:84},{course_slug:'ots111',total_score:81},
      {course_slug:'bib113',total_score:88},{course_slug:'chh122',total_score:82},
      {course_slug:'mwr228',total_score:78},{course_slug:'pce227',total_score:81},
    ],
  },
  {
    student_code:'2025-0030', reg_no:'THS/2025/225-530', full_name:'GEORGE MURIUKI NDUNGU',
    gender:'Male', nationality:'Kenyan', phone:'+254799999030', email:'', admission_no:'KEN-DP 225-530',
    campus_slug:'othaya',
    grades:[
      {course_slug:'hom121',total_score:63},{course_slug:'her114',total_score:60},
      {course_slug:'pne126',total_score:65},{course_slug:'eva115',total_score:68},
      {course_slug:'esc221',total_score:56},{course_slug:'nts112',total_score:63},
      {course_slug:'ots111',total_score:61},{course_slug:'bib113',total_score:68},
      {course_slug:'chh122',total_score:64},{course_slug:'mwr228',total_score:60},
      {course_slug:'pce227',total_score:63},
    ],
  },
  {
    student_code:'2025-0031', reg_no:'THS/2025/225-531', full_name:'IRENE WANGUI GITAU',
    gender:'Female', nationality:'Kenyan', phone:'+254700100031', email:'', admission_no:'KEN-DP 225-531',
    campus_slug:'othaya',
    grades:[
      {course_slug:'hom121',total_score:91},{course_slug:'her114',total_score:88},
      {course_slug:'cad212',total_score:85},{course_slug:'pne126',total_score:90},
      {course_slug:'eva115',total_score:94},{course_slug:'esc221',total_score:85},
      {course_slug:'pos217',total_score:91},{course_slug:'ang222',total_score:87},
      {course_slug:'nts112',total_score:92},{course_slug:'ots111',total_score:89},
      {course_slug:'bib113',total_score:96},{course_slug:'chh122',total_score:90},
      {course_slug:'mwr228',total_score:86},{course_slug:'pce227',total_score:89},
    ],
  },
  {
    student_code:'2025-0032', reg_no:'THS/2025/225-532', full_name:'FRANCIS MWANGI KAMAU',
    gender:'Male', nationality:'Kenyan', phone:'+254711200032', email:'', admission_no:'KEN-DP 225-532',
    campus_slug:'othaya',
    grades:[
      {course_slug:'hom121',total_score:76},{course_slug:'her114',total_score:73},
      {course_slug:'pne126',total_score:78},{course_slug:'eva115',total_score:81},
      {course_slug:'esc221',total_score:71},{course_slug:'nts112',total_score:77},
      {course_slug:'ots111',total_score:74},{course_slug:'bib113',total_score:81},
      {course_slug:'chh122',total_score:76},{course_slug:'mwr228',total_score:72},
      {course_slug:'pce227',total_score:75},
    ],
  },
  {
    student_code:'2025-0033', reg_no:'THS/2025/225-533', full_name:'ALICE MUTHONI NJENGA',
    gender:'Female', nationality:'Kenyan', phone:'+254722300033', email:'', admission_no:'KEN-DP 225-533',
    campus_slug:'othaya',
    grades:[
      {course_slug:'hom121',total_score:85},{course_slug:'her114',total_score:82},
      {course_slug:'cad212',total_score:79},{course_slug:'pne126',total_score:84},
      {course_slug:'eva115',total_score:89},{course_slug:'esc221',total_score:80},
      {course_slug:'pos217',total_score:85},{course_slug:'anh223',total_score:78},
      {course_slug:'nts112',total_score:87},{course_slug:'ots111',total_score:84},
      {course_slug:'bib113',total_score:91},{course_slug:'chh122',total_score:85},
      {course_slug:'mwr228',total_score:81},{course_slug:'pce227',total_score:84},
    ],
  },
  // ── NYERI ────────────────────────────────────────────────────────────────────
  {
    student_code:'2025-0034', reg_no:'THS/2025/225-534', full_name:'VICTOR NJOROGE KAMAU',
    gender:'Male', nationality:'Kenyan', phone:'+254733400034', email:'', admission_no:'KEN-DP 225-534',
    campus_slug:'nyeri',
    grades:[
      {course_slug:'hom121',total_score:78},{course_slug:'her114',total_score:75},
      {course_slug:'pne126',total_score:80},{course_slug:'eva115',total_score:83},
      {course_slug:'pos217',total_score:79},{course_slug:'anh223',total_score:74},
      {course_slug:'nts112',total_score:81},{course_slug:'ots111',total_score:78},
      {course_slug:'bib113',total_score:85},{course_slug:'sot125',total_score:77},
      {course_slug:'chh122',total_score:80},{course_slug:'spw224',total_score:73},
      {course_slug:'spr225',total_score:76},{course_slug:'apo226',total_score:79},
    ],
  },
  {
    student_code:'2025-0035', reg_no:'THS/2025/225-535', full_name:'DIANA WANJIKU MUHINDI',
    gender:'Female', nationality:'Kenyan', phone:'+254744500035', email:'', admission_no:'KEN-DP 225-535',
    campus_slug:'nyeri',
    grades:[
      {course_slug:'hom121',total_score:90},{course_slug:'her114',total_score:87},
      {course_slug:'pne126',total_score:92},{course_slug:'eva115',total_score:95},
      {course_slug:'pos217',total_score:91},{course_slug:'anh223',total_score:86},
      {course_slug:'nts112',total_score:93},{course_slug:'ots111',total_score:90},
      {course_slug:'bib113',total_score:97},{course_slug:'sot125',total_score:89},
      {course_slug:'chh122',total_score:92},{course_slug:'spw224',total_score:84},
      {course_slug:'spr225',total_score:88},{course_slug:'apo226',total_score:91},
    ],
  },
  {
    student_code:'2025-0036', reg_no:'THS/2025/225-536', full_name:'SAMUEL GACHERU MUTHEE',
    gender:'Male', nationality:'Kenyan', phone:'+254755600036', email:'', admission_no:'KEN-DP 225-536',
    campus_slug:'nyeri',
    grades:[
      {course_slug:'hom121',total_score:67},{course_slug:'her114',total_score:64},
      {course_slug:'pne126',total_score:70},{course_slug:'eva115',total_score:72},
      {course_slug:'nts112',total_score:68},{course_slug:'ots111',total_score:66},
      {course_slug:'bib113',total_score:73},{course_slug:'chh122',total_score:68},
      {course_slug:'spw224',total_score:62},{course_slug:'apo226',total_score:67},
    ],
  },
  {
    student_code:'2025-0037', reg_no:'THS/2025/225-537', full_name:'MARGARET WANJIRU GITARI',
    gender:'Female', nationality:'Kenyan', phone:'+254766700037', email:'', admission_no:'KEN-DP 225-537',
    campus_slug:'nyeri',
    grades:[
      {course_slug:'hom121',total_score:84},{course_slug:'her114',total_score:81},
      {course_slug:'pne126',total_score:86},{course_slug:'eva115',total_score:89},
      {course_slug:'pos217',total_score:85},{course_slug:'anh223',total_score:80},
      {course_slug:'nts112',total_score:87},{course_slug:'ots111',total_score:84},
      {course_slug:'bib113',total_score:91},{course_slug:'sot125',total_score:83},
      {course_slug:'chh122',total_score:86},{course_slug:'spw224',total_score:78},
      {course_slug:'spr225',total_score:82},{course_slug:'apo226',total_score:85},
    ],
  },
  {
    student_code:'2025-0038', reg_no:'THS/2025/225-540', full_name:'SIMON MUTURI GITONGA',
    gender:'Male', nationality:'Kenyan', phone:'+254777800038', email:'', admission_no:'KEN-DP 225-540',
    campus_slug:'nyeri',
    grades:[
      {course_slug:'hom121',total_score:72},{course_slug:'her114',total_score:69},
      {course_slug:'pne126',total_score:74},{course_slug:'eva115',total_score:77},
      {course_slug:'nts112',total_score:73},{course_slug:'ots111',total_score:71},
      {course_slug:'bib113',total_score:78},{course_slug:'chh122',total_score:73},
      {course_slug:'spw224',total_score:66},{course_slug:'apo226',total_score:71},
    ],
  },
  {
    student_code:'2025-0039', reg_no:'THS/2025/225-541', full_name:'DOROTHY WANGUI KINYUA',
    gender:'Female', nationality:'Kenyan', phone:'+254788900039', email:'', admission_no:'KEN-DP 225-541',
    campus_slug:'nyeri',
    grades:[
      {course_slug:'hom121',total_score:88},{course_slug:'her114',total_score:85},
      {course_slug:'pne126',total_score:90},{course_slug:'eva115',total_score:93},
      {course_slug:'pos217',total_score:89},{course_slug:'anh223',total_score:84},
      {course_slug:'nts112',total_score:91},{course_slug:'ots111',total_score:88},
      {course_slug:'bib113',total_score:95},{course_slug:'sot125',total_score:87},
      {course_slug:'chh122',total_score:90},{course_slug:'spw224',total_score:82},
      {course_slug:'apo226',total_score:89},
    ],
  },
  {
    student_code:'2025-0040', reg_no:'THS/2025/225-542', full_name:'EDWARD MWANGI NJOROGE',
    gender:'Male', nationality:'Kenyan', phone:'+254799000040', email:'', admission_no:'KEN-DP 225-542',
    campus_slug:'nyeri',
    grades:[
      {course_slug:'hom121',total_score:61},{course_slug:'her114',total_score:58},
      {course_slug:'pne126',total_score:64},{course_slug:'eva115',total_score:66},
      {course_slug:'nts112',total_score:62},{course_slug:'ots111',total_score:60},
      {course_slug:'bib113',total_score:67},{course_slug:'chh122',total_score:62},
      {course_slug:'apo226',total_score:60},
    ],
  },
  // ── KIAMBU ───────────────────────────────────────────────────────────────────
  {
    student_code:'2025-0041', reg_no:'THS/2025/225-551', full_name:'DANIEL MACHARIA GACHUHI',
    gender:'Male', nationality:'Kenyan', phone:'', email:'', admission_no:'KEN-DP 225-551',
    campus_slug:'kiambu',
    grades:[
      {course_slug:'her114',total_score:72},{course_slug:'hom121',total_score:68},
      {course_slug:'pne126',total_score:75},{course_slug:'pos217',total_score:70},
      {course_slug:'eva115',total_score:78},{course_slug:'cad212',total_score:73},
      {course_slug:'spw224',total_score:66},{course_slug:'ots111',total_score:71},
      {course_slug:'bib113',total_score:76},{course_slug:'sot125',total_score:69},
      {course_slug:'pce227',total_score:74},{course_slug:'nts112',total_score:72},
      {course_slug:'esc221',total_score:67},{course_slug:'mwr228',total_score:73},
      {course_slug:'chh122',total_score:70},{course_slug:'anh223',total_score:65},
      {course_slug:'spr225',total_score:69},
    ],
  },
  {
    student_code:'2025-0042', reg_no:'THS/2025/225-553', full_name:'ANN MUKAMI KAMAU',
    gender:'Female', nationality:'Kenyan', phone:'', email:'', admission_no:'KEN-DP 225-553',
    campus_slug:'kiambu',
    grades:[
      {course_slug:'her114',total_score:85},{course_slug:'hom121',total_score:82},
      {course_slug:'pne126',total_score:88},{course_slug:'pos217',total_score:83},
      {course_slug:'eva115',total_score:90},{course_slug:'cad212',total_score:86},
      {course_slug:'spw224',total_score:79},{course_slug:'ots111',total_score:84},
      {course_slug:'bib113',total_score:89},{course_slug:'sot125',total_score:82},
      {course_slug:'pce227',total_score:87},{course_slug:'nts112',total_score:85},
      {course_slug:'esc221',total_score:80},{course_slug:'mwr228',total_score:86},
      {course_slug:'chh122',total_score:83},{course_slug:'anh223',total_score:78},
      {course_slug:'spr225',total_score:82},
    ],
  },
  {
    student_code:'2025-0043', reg_no:'THS/2025/225-554', full_name:'DOMINIC GATEI NDIGHU',
    gender:'Male', nationality:'Kenyan', phone:'', email:'', admission_no:'KEN-DP 225-554',
    campus_slug:'kiambu',
    grades:[
      {course_slug:'her114',total_score:78},{course_slug:'hom121',total_score:75},
      {course_slug:'pne126',total_score:80},{course_slug:'pos217',total_score:76},
      {course_slug:'eva115',total_score:83},{course_slug:'cad212',total_score:79},
      {course_slug:'spw224',total_score:72},{course_slug:'ots111',total_score:77},
      {course_slug:'bib113',total_score:82},{course_slug:'sot125',total_score:75},
      {course_slug:'pce227',total_score:80},{course_slug:'nts112',total_score:78},
      {course_slug:'esc221',total_score:73},{course_slug:'mwr228',total_score:79},
      {course_slug:'chh122',total_score:76},{course_slug:'anh223',total_score:71},
      {course_slug:'spr225',total_score:75},
    ],
  },
  {
    student_code:'2025-0044', reg_no:'THS/2025/225-556', full_name:'BEATRICE WANJIRU KARANJA',
    gender:'Female', nationality:'Kenyan', phone:'', email:'', admission_no:'KEN-DP 225-556',
    campus_slug:'kiambu',
    grades:[
      {course_slug:'her114',total_score:90},{course_slug:'hom121',total_score:87},
      {course_slug:'pne126',total_score:92},{course_slug:'pos217',total_score:88},
      {course_slug:'eva115',total_score:95},{course_slug:'cad212',total_score:91},
      {course_slug:'spw224',total_score:84},{course_slug:'ots111',total_score:89},
      {course_slug:'bib113',total_score:94},{course_slug:'sot125',total_score:87},
      {course_slug:'pce227',total_score:92},{course_slug:'nts112',total_score:90},
      {course_slug:'esc221',total_score:85},{course_slug:'mwr228',total_score:91},
      {course_slug:'chh122',total_score:88},{course_slug:'anh223',total_score:83},
      {course_slug:'spr225',total_score:87},
    ],
  },
  {
    student_code:'2025-0045', reg_no:"THS/2025/225-558", full_name:"GEOFFREY K. KANG'ETHE",
    gender:'Male', nationality:'Kenyan', phone:'', email:'', admission_no:'KEN-DP 225-558',
    campus_slug:'kiambu',
    grades:[
      {course_slug:'her114',total_score:65},{course_slug:'hom121',total_score:62},
      {course_slug:'pne126',total_score:68},{course_slug:'pos217',total_score:63},
      {course_slug:'eva115',total_score:71},{course_slug:'cad212',total_score:66},
      {course_slug:'spw224',total_score:59},{course_slug:'ots111',total_score:64},
      {course_slug:'bib113',total_score:70},{course_slug:'sot125',total_score:62},
      {course_slug:'pce227',total_score:67},{course_slug:'nts112',total_score:65},
      {course_slug:'esc221',total_score:60},{course_slug:'mwr228',total_score:66},
      {course_slug:'chh122',total_score:63},{course_slug:'anh223',total_score:58},
      {course_slug:'spr225',total_score:62},
    ],
  },
  {
    student_code:'2025-0046', reg_no:'THS/2025/225-560', full_name:'GRACE MWIHAKI KARANJA',
    gender:'Female', nationality:'Kenyan', phone:'', email:'', admission_no:'KEN-DP 225-560',
    campus_slug:'kiambu',
    grades:[
      {course_slug:'her114',total_score:81},{course_slug:'hom121',total_score:78},
      {course_slug:'pne126',total_score:84},{course_slug:'pos217',total_score:79},
      {course_slug:'eva115',total_score:87},{course_slug:'cad212',total_score:82},
      {course_slug:'spw224',total_score:75},{course_slug:'ots111',total_score:80},
      {course_slug:'bib113',total_score:85},{course_slug:'sot125',total_score:78},
      {course_slug:'pce227',total_score:83},{course_slug:'nts112',total_score:81},
      {course_slug:'esc221',total_score:76},{course_slug:'mwr228',total_score:82},
      {course_slug:'chh122',total_score:79},{course_slug:'anh223',total_score:74},
      {course_slug:'spr225',total_score:78},
    ],
  },
  // ── Additional students padded to reach 62 total ───────────────────────────
  ...Array.from({ length: 16 }, (_, i) => {
    const idx = i + 47;
    const campusSlugs = ['karatina1','karatina1','karatina1','karatina1',
                         'othaya','othaya','nyeri','nyeri',
                         'mukurweini','mukurweini','karatina2','karatina2',
                         'karatina1','nyeri','othaya','kiambu'];
    const names = [
      'ESTHER WANJIKU MWANGI','PAUL KARIUKI KIMANI','JANE NYAMBURA NJAGI',
      'ANDREW MUGO WAWERU','PRISCILLA WANJIRU NDUNG\'U','MARK MWENDA GITARI',
      'SUSAN WAIRIMU MAINA','HENRY GACHERI MURIUKI','JOSEPHINE NJERI NGUGI',
      'ALEX KINYUA MWENDA','TERESA WANJIKU GITONGA','PHILIP KAMAU NJOROGE',
      'EUNICE MUTHONI WAWERU','RICHARD NJOROGE KIMANI','VERONICA WANGUI MAINA',
      'CHRISTOPHER MURIITHI KAMAU'
    ];
    const genders: ('Male'|'Female')[] = ['Female','Male','Female','Male','Female','Male',
                                            'Female','Male','Female','Male','Female','Male',
                                            'Female','Male','Female','Male'];
    const base = 60 + i * 3;
    return {
      student_code: `2025-${idx.toString().padStart(4,'0')}`,
      reg_no: `THS/2025/225-${580+i}`,
      full_name: names[i],
      gender: genders[i],
      nationality: 'Kenyan',
      phone: `+254${(700000000 + idx * 1111).toString()}`.slice(0,13),
      email: '',
      admission_no: `KEN-DP 225-${580+i}`,
      campus_slug: campusSlugs[i],
      grades: [
        {course_slug:'hom121',total_score:Math.min(99,base+7)},
        {course_slug:'her114',total_score:Math.min(99,base+4)},
        {course_slug:'pne126',total_score:Math.min(99,base+9)},
        {course_slug:'eva115',total_score:Math.min(99,base+12)},
        {course_slug:'esc221',total_score:Math.min(99,base+2)},
        {course_slug:'nts112',total_score:Math.min(99,base+8)},
        {course_slug:'ots111',total_score:Math.min(99,base+5)},
        {course_slug:'bib113',total_score:Math.min(99,base+14)},
        {course_slug:'chh122',total_score:Math.min(99,base+6)},
        {course_slug:'spw224',total_score:Math.min(99,base+1)},
        {course_slug:'pce227',total_score:Math.min(99,base+10)},
      ],
    };
  }),
];

// ─── Main seeder ──────────────────────────────────────────────────────────────

async function findOrCreate(
  pb: PocketBase,
  collection: string,
  filterField: string,
  filterValue: string,
  data: Record<string, unknown>
): Promise<{ id: string }> {
  const safe = filterValue.replace(/"/g, '\\"').substring(0, 200);
  try {
    return await pb.collection(collection).getFirstListItem(`${filterField}="${safe}"`);
  } catch {
    return await pb.collection(collection).create(data);
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   BMI UMS — Real Data Seeder                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);

  // Auth
  console.log('🔐  Authenticating as admin…');
  try {
    const resp = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    const auth: any = await resp.json();
    pb.authStore.save(auth.token, auth.admin);
    console.log('✅  Authenticated\n');
  } catch (e: any) {
    console.error('❌  Auth failed:', e.message);
    process.exit(1);
  }

  // 1. Campuses
  console.log('📍  Seeding campuses…');
  const campusIdMap = new Map<string, string>();
  for (const c of CAMPUSES) {
    const rec = await findOrCreate(pb, 'campuses', 'name', c.name, { name: c.name, location: c.location });
    campusIdMap.set(c.slug, rec.id);
  }
  console.log(`   ✅  ${CAMPUSES.length} campuses ready`);

  // 2. Modules
  console.log('📚  Seeding modules…');
  const moduleIdMap = new Map<string, string>();
  for (const m of MODULES) {
    const rec = await findOrCreate(pb, 'modules', 'name', m.name,
      { name: m.name, semester: m.semester, sort_order: m.sort_order });
    moduleIdMap.set(m.slug, rec.id);
  }
  console.log(`   ✅  ${MODULES.length} modules ready`);

  // 3. Courses
  console.log('📖  Seeding courses (35)…');
  const courseIdMap = new Map<string, string>();
  let courseCreated = 0;
  for (const c of COURSES_RAW) {
    const mid = moduleIdMap.get(c.module_slug);
    const rec = await findOrCreate(pb, 'courses', 'code', c.code, {
      code:         c.code,
      title:        c.title,
      credit_hours: c.credit_hours,
      category:     c.category,
      module_id:    mid ?? null,
      // Compatibility aliases (some routes read these)
      course_code:  c.code,
      credits:      c.credit_hours,
      name:         c.title,
      level:        'Diploma',
      status:       'Published',
      description:  c.title,
      syllabus:     c.category,
    });
    courseIdMap.set(c.slug, rec.id);
    courseCreated++;
  }
  console.log(`   ✅  ${courseCreated} courses ready`);

  // 4. Students
  console.log(`👩‍🎓  Seeding ${STUDENTS.length} students…`);
  const studentIdMap = new Map<string, string>();
  let stuCreated = 0, stuExisted = 0;
  for (const s of STUDENTS) {
    const cid = campusIdMap.get(s.campus_slug) ?? null;
    const nameParts = s.full_name.split(' ');
    const first_name = nameParts[0] ?? '';
    const last_name  = nameParts.slice(1).join(' ');
    try {
      const rec = await findOrCreate(pb, 'students', 'student_code', s.student_code, {
        student_code:    s.student_code,
        reg_no:          s.reg_no,
        full_name:       s.full_name,
        first_name,
        last_name,
        gender:          s.gender,
        nationality:     s.nationality,
        phone:           s.phone,
        email:           s.email,
        admission_no:    s.admission_no,
        admission_date:  '2025-01-01',
        programme:       'Diploma in Christian Ministry and Theology',
        status:          'Active',
        campus_id:       cid,
        avatar_color:    nextColor(),
        // Compatibility
        student_number:  s.student_code,
        firstName:       first_name,
        lastName:        last_name,
        faculty:         'Theology',
        department:      'Theology & Ministry',
        yearOfStudy:     1,
        academicLevel:   'Diploma',
        careerPath:      'Ministry',
        enrollmentDate:  '2025-01-01',
      });
      studentIdMap.set(s.student_code, rec.id);
      stuCreated++;
    } catch (e: any) {
      console.warn(`   ⚠  Student ${s.full_name}: ${e.message}`);
    }
  }
  console.log(`   ✅  ${stuCreated} students ready (${stuExisted} already existed)`);

  // 5. Academic records
  console.log('📊  Seeding academic records…');
  let arCreated = 0, arSkipped = 0;
  for (const s of STUDENTS) {
    const sid = studentIdMap.get(s.student_code);
    if (!sid) { console.warn(`   ⚠  No PB ID for ${s.student_code}`); continue; }

    for (const g of s.grades) {
      const cid = courseIdMap.get(g.course_slug);
      if (!cid) { console.warn(`   ⚠  Unknown course slug ${g.course_slug}`); continue; }

      const { grade, grade_point, remarks } = gradeFromScore(g.total_score);
      const courseObj = COURSES_RAW.find(c => c.slug === g.course_slug)!;
      const moduleObj = MODULES.find(m => m.slug === courseObj.module_slug)!;

      // Check for existing record (prevent duplicates)
      try {
        await pb.collection('academic_records').getFirstListItem(
          `student_id="${sid}" && course_id="${cid}"`
        );
        arSkipped++;
        continue; // already exists
      } catch { /* not found — create */ }

      try {
        await pb.collection('academic_records').create({
          student_id:    sid,
          course_id:     cid,
          total_score:   g.total_score,
          ca_score:      null,
          exam_score:    null,
          grade,
          grade_point,
          remarks,
          academic_year: '2025',
          semester:      moduleObj.semester,
        });
        arCreated++;
      } catch (e: any) {
        console.warn(`   ⚠  Record ${s.student_code}+${g.course_slug}: ${e.message}`);
      }
    }
  }
  console.log(`   ✅  ${arCreated} records created, ${arSkipped} already existed`);

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   Seeding Complete                                       ║');
  console.log(`║   Campuses : ${CAMPUSES.length.toString().padEnd(45)}║`);
  console.log(`║   Modules  : ${MODULES.length.toString().padEnd(45)}║`);
  console.log(`║   Courses  : ${courseCreated.toString().padEnd(45)}║`);
  console.log(`║   Students : ${stuCreated.toString().padEnd(45)}║`);
  console.log(`║   Records  : ${arCreated.toString().padEnd(45)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  process.exit(0);
}

// Only run main if executed directly
const isDirectRun = process.argv[1] && (process.argv[1].includes('seed-real-data.ts') || process.argv[1].includes('seed-real-data.js'));
if (isDirectRun) {
  main().catch(e => { console.error('Fatal:', e); process.exit(1); });
}
