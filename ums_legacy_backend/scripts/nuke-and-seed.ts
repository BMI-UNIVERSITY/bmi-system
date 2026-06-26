#!/usr/bin/env tsx
/**
 * BMI UMS — V2 Nuke & Seed
 * ─────────────────────────────────────────────────────────────────────────────
 * Wipes all student/grade data and re-seeds with 62 real students + 530 grade
 * records conforming to the V2 schema.
 *
 * KEY DESIGN DECISIONS:
 *  - Modules are REPLACED by a progressive semester system.
 *  - Academic terms are dynamically derived from each student's admission year
 *    (parsed from their student_code, e.g. "2025-0001" → admission year 2025).
 *  - No hardcoded academic year or semester values.
 *  - m1 → Year 1 Sem 1 (2025/2026-SEM1), m2 → Year 1 Sem 2, m3 → Year 2 Sem 1, etc.
 *
 * Run:  npx tsx backend/scripts/nuke-and-seed.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/backend/.env` });

// Import the canonical student dataset
import { STUDENTS } from './seed-real-data.ts';

const PB_URL   = (process.env.POCKETBASE_URL             ?? 'http://127.0.0.1:8090').trim();
const PB_EMAIL = (process.env.POCKETBASE_ADMIN_EMAIL     ?? 'admin@bmi.edu').trim();
const PB_PASS  = (process.env.POCKETBASE_ADMIN_PASSWORD  ?? '').trim();

// ─── Avatar colour helper ────────────────────────────────────────────────────
const COLORS = [
  'bg-purple-600','bg-blue-600','bg-green-600','bg-red-600',
  'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600',
];
let _ci = 0;
const nextColor = () => COLORS[_ci++ % COLORS.length];

// ─── Grade calculator ─────────────────────────────────────────────────────────
function gradeFromScore(s: number): { grade: string; grade_point: number; remarks: string } {
  if (s >= 80) return { grade: 'A',  grade_point: 4.0, remarks: 'Excellent' };
  if (s >= 75) return { grade: 'B+', grade_point: 3.5, remarks: 'Very Good' };
  if (s >= 70) return { grade: 'B',  grade_point: 3.0, remarks: 'Good' };
  if (s >= 65) return { grade: 'C+', grade_point: 2.5, remarks: 'Above Average' };
  if (s >= 60) return { grade: 'C',  grade_point: 2.0, remarks: 'Average' };
  if (s >= 50) return { grade: 'D',  grade_point: 1.0, remarks: 'Pass' };
  return         { grade: 'F',  grade_point: 0.0, remarks: 'Fail' };
}

// ─── Reference data ───────────────────────────────────────────────────────────

const CAMPUSES = [
  { slug: 'mukurweini', name: 'Mukurweini',   location: 'Mukurweini, Nyeri County',    code: 'MUK'   },
  { slug: 'karatina1',  name: 'Karatina A',   location: 'Karatina, Nyeri County',      code: 'KAR-A' },
  { slug: 'karatina2',  name: 'Karatina B',   location: 'Karatina, Nyeri County',      code: 'KAR-B' },
  { slug: 'othaya',     name: 'Othaya',        location: 'Othaya, Nyeri County',        code: 'OTH'   },
  { slug: 'nyeri',      name: 'Nyeri',         location: 'Nyeri Town, Nyeri County',   code: 'NYR'   },
  { slug: 'kiambu',     name: 'Kiambu',        location: 'Kiambu Town, Kiambu County', code: 'KIB'   },
];

/**
 * Maps each module slug to its progressive semester position relative to
 * a student's admission year.
 *
 *  m1 → Year 1, Sem 1  (admYear/admYear+1 – SEM1)
 *  m2 → Year 1, Sem 2  (admYear/admYear+1 – SEM2)
 *  m3 → Year 2, Sem 1  (admYear+1/admYear+2 – SEM1)
 *  m4 → Year 2, Sem 2  (admYear+1/admYear+2 – SEM2)
 *  m5 → Year 3, Sem 1  (admYear+2/admYear+3 – SEM1)
 */
const MODULE_TO_SEMESTER: Record<string, { yearOffset: number; semNum: 1 | 2 }> = {
  m1: { yearOffset: 0, semNum: 1 },
  m2: { yearOffset: 0, semNum: 2 },
  m3: { yearOffset: 1, semNum: 1 },
  m4: { yearOffset: 1, semNum: 2 },
  m5: { yearOffset: 2, semNum: 1 },
};

const COURSES_RAW = [
  // ── Year 1, Semester 1 (Module 1) ──────────────────────────────────────────
  { slug:'eng101', code:'ENG 101', title:'Basic English Grammar',             credit_hours:2, category:'General Education',      module_slug:'m1', sequence_order: 101 },
  { slug:'awr102', code:'AWR 102', title:'Academic Writing',                  credit_hours:2, category:'General Education',      module_slug:'m1', sequence_order: 102 },
  { slug:'ots111', code:'OTS 111', title:'Old Testament Survey',              credit_hours:3, category:'Biblical Studies',       module_slug:'m1', sequence_order: 103 },
  { slug:'nts112', code:'NTS 112', title:'New Testament Survey',              credit_hours:3, category:'Biblical Studies',       module_slug:'m1', sequence_order: 104 },
  { slug:'bib113', code:'BIB 113', title:'Bibliology',                        credit_hours:3, category:'Theology',               module_slug:'m1', sequence_order: 105 },
  { slug:'her114', code:'HER 114', title:'Biblical Hermeneutics',             credit_hours:3, category:'Biblical Studies',       module_slug:'m1', sequence_order: 106 },
  { slug:'eva115', code:'EVA 115', title:'Evangelism',                        credit_hours:2, category:'Ministry',               module_slug:'m1', sequence_order: 107 },
  { slug:'cfm116', code:'CFM 116', title:'Christian Family',                  credit_hours:2, category:'Ministry',               module_slug:'m1', sequence_order: 108 },
  // ── Year 1, Semester 2 (Module 2) ──────────────────────────────────────────
  { slug:'hom121', code:'HOM 121', title:'Homiletics',                        credit_hours:3, category:'Ministry',               module_slug:'m2', sequence_order: 201 },
  { slug:'chh122', code:'CHH 122', title:'Church History',                    credit_hours:3, category:'Church History',         module_slug:'m2', sequence_order: 202 },
  { slug:'thp123', code:'THP 123', title:'Theology Proper',                   credit_hours:3, category:'Theology',               module_slug:'m2', sequence_order: 203 },
  { slug:'chr124', code:'CHR 124', title:'Christology',                       credit_hours:3, category:'Theology',               module_slug:'m2', sequence_order: 204 },
  { slug:'sot125', code:'SOT 125', title:'Soteriology',                       credit_hours:3, category:'Theology',               module_slug:'m2', sequence_order: 205 },
  { slug:'pne126', code:'PNE 126', title:'Pneumatology',                      credit_hours:3, category:'Theology',               module_slug:'m2', sequence_order: 206 },
  { slug:'prw127', code:'PRW 127', title:'Praise and Worship',                credit_hours:2, category:'Ministry',               module_slug:'m2', sequence_order: 207 },
  // ── Year 2, Semester 1 (Module 3) ──────────────────────────────────────────
  { slug:'ecc211', code:'ECC 211', title:'Ecclesiology',                      credit_hours:3, category:'Theology',               module_slug:'m3', sequence_order: 301 },
  { slug:'cad212', code:'CAD 212', title:'Church Administration',             credit_hours:3, category:'Ministry Leadership',    module_slug:'m3', sequence_order: 302 },
  { slug:'chg213', code:'CHG 213', title:'Church Growth',                     credit_hours:3, category:'Ministry Leadership',    module_slug:'m3', sequence_order: 303 },
  { slug:'chp214', code:'CHP 214', title:'Church Planting',                   credit_hours:3, category:'Ministry Leadership',    module_slug:'m3', sequence_order: 304 },
  { slug:'fsm215', code:'FSM 215', title:'Foundation of Successful Ministry', credit_hours:2, category:'Ministry',               module_slug:'m3', sequence_order: 305 },
  { slug:'spf216', code:'SPF 216', title:'Spiritual Formation',               credit_hours:3, category:'Spiritual Development',  module_slug:'m3', sequence_order: 306 },
  { slug:'pos217', code:'POS 217', title:'Principles of Success',             credit_hours:2, category:'Leadership Development', module_slug:'m3', sequence_order: 307 },
  { slug:'ukp218', code:'UKP 218', title:"Understanding God's Kingdom Principles", credit_hours:3, category:'Theology',         module_slug:'m3', sequence_order: 308 },
  // ── Year 2, Semester 2 (Module 4) ──────────────────────────────────────────
  { slug:'esc221', code:'ESC 221', title:'Eschatology',                       credit_hours:3, category:'Theology',               module_slug:'m4', sequence_order: 401 },
  { slug:'ang222', code:'ANG 222', title:'Angelology',                        credit_hours:2, category:'Theology',               module_slug:'m4', sequence_order: 402 },
  { slug:'anh223', code:'ANH 223', title:'Anthropology & Hamartiology',       credit_hours:3, category:'Theology',               module_slug:'m4', sequence_order: 403 },
  { slug:'spw224', code:'SPW 224', title:'Spiritual Warfare',                 credit_hours:3, category:'Spiritual Development',  module_slug:'m4', sequence_order: 404 },
  { slug:'spr225', code:'SPR 225', title:'Spiritual Realm',                   credit_hours:2, category:'Spiritual Development',  module_slug:'m4', sequence_order: 405 },
  { slug:'apo226', code:'APO 226', title:'Christian Apologetics',             credit_hours:3, category:'Theology',               module_slug:'m4', sequence_order: 406 },
  { slug:'pce227', code:'PCE 227', title:'Pastoral Counselling & Ethics',     credit_hours:3, category:'Ministry',               module_slug:'m4', sequence_order: 407 },
  { slug:'mwr228', code:'MWR 228', title:'Major World Religions',             credit_hours:3, category:'Comparative Religion',   module_slug:'m4', sequence_order: 408 },
  // ── Year 3, Semester 1 (Module 5) ──────────────────────────────────────────
  { slug:'grk311', code:'GRK 311', title:'Biblical Greek',                    credit_hours:3, category:'Biblical Languages',     module_slug:'m5', sequence_order: 501 },
  { slug:'heb312', code:'HEB 312', title:'Biblical Hebrew',                   credit_hours:3, category:'Biblical Languages',     module_slug:'m5', sequence_order: 502 },
  { slug:'min315', code:'MIN 315', title:'Ministry Practicum / Internship',   credit_hours:4, category:'Practicum',              module_slug:'m5', sequence_order: 503 },
  { slug:'res316', code:'RES 316', title:'Research Project',                  credit_hours:3, category:'Research',               module_slug:'m5', sequence_order: 504 },
];

// ─── Compute term dates from admission year + position ────────────────────────

interface TermInfo {
  code: string;
  academic_year: string;
  semester_number: 1 | 2;
  start_date: string;
  end_date: string;
  registration_start: string;
  registration_end: string;
  exam_start: string;
  exam_end: string;
}

function buildTermInfo(admissionYear: number, yearOffset: number, semNum: 1 | 2): TermInfo {
  const y1 = admissionYear + yearOffset;
  const y2 = y1 + 1;
  const academic_year = `${y1}/${y2}`;
  const code          = `${academic_year}-SEM${semNum}`;

  let start_date: string, end_date: string,
      registration_start: string, registration_end: string,
      exam_start: string, exam_end: string;

  if (semNum === 1) {
    // January – May
    registration_start = `${y1}-01-05`;
    registration_end   = `${y1}-01-20`;
    start_date         = `${y1}-01-20`;
    exam_start         = `${y1}-04-28`;
    exam_end           = `${y1}-05-09`;
    end_date           = `${y1}-05-31`;
  } else {
    // August – December
    registration_start = `${y1}-08-01`;
    registration_end   = `${y1}-08-15`;
    start_date         = `${y1}-08-15`;
    exam_start         = `${y1}-11-17`;
    exam_end           = `${y1}-11-28`;
    end_date           = `${y1}-12-15`;
  }

  return { code, academic_year, semester_number: semNum,
           start_date, end_date, registration_start, registration_end,
           exam_start, exam_end };
}

// ─── Wipe a collection (handles 404 gracefully) ───────────────────────────────

async function wipeFast(token: string, collection: string): Promise<void> {
  process.stdout.write(`   Wiping ${collection.padEnd(35)}... `);
  let total = 0;
  while (true) {
    const r = await fetch(
      `${PB_URL}/api/collections/${collection}/records?perPage=200&skipTotal=1`,
      { headers: { Authorization: token } }
    );
    if (!r.ok) {
      const code = r.status;
      console.log(code === 404 ? '(collection not found — skipped)' : `(HTTP ${code} — skipped)`);
      return;
    }
    const d = await r.json() as any;
    if (!d.items || d.items.length === 0) break;

    // Delete in parallel batches of 20
    for (let i = 0; i < d.items.length; i += 20) {
      const chunk = d.items.slice(i, i + 20);
      await Promise.all(chunk.map((item: any) =>
        fetch(`${PB_URL}/api/collections/${collection}/records/${item.id}`, {
          method: 'DELETE', headers: { Authorization: token },
        })
      ));
      total += chunk.length;
    }
    if (d.items.length < 200) break;
  }
  console.log(`${total} deleted`);
}

// ─── Find-or-create helper ────────────────────────────────────────────────────

async function findOrCreate(
  token: string,
  collection: string,
  filterField: string,
  filterValue: string,
  data: object
): Promise<string> {
  const filter = encodeURIComponent(`${filterField}="${filterValue}"`);
  const r = await fetch(`${PB_URL}/api/collections/${collection}/records?filter=${filter}`,
    { headers: { Authorization: token } });
  const d = await r.json() as any;
  if (d.items?.length > 0) return d.items[0].id;

  const cr = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(data),
  });
  if (!cr.ok) {
    const err = await cr.json() as any;
    throw new Error(`[${collection}] create failed: ${JSON.stringify(err.data ?? err.message)}`);
  }
  return ((await cr.json()) as any).id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   BMI UMS — V2 Nuke & Seed                              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── Authenticate ─────────────────────────────────────────────────────────────
  console.log('🔐  Authenticating as admin...');
  const authResp = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
  });
  if (!authResp.ok) {
    const txt = await authResp.text();
    throw new Error(`Authentication failed (${authResp.status}): ${txt}`);
  }
  const authData = await authResp.json() as any;
  const token: string = authData.token;
  console.log('✅  Authenticated\n');

  // ── WIPE (leaf → root dependency order) ─────────────────────────────────────
  console.log('🗑️   Wiping existing data...');
  await wipeFast(token, 'grades');
  await wipeFast(token, 'enrollments');
  await wipeFast(token, 'program_courses');
  await wipeFast(token, 'transcripts');
  await wipeFast(token, 'transcript_verification_logs');
  await wipeFast(token, 'verification_logs');
  await wipeFast(token, 'academic_records');
  await wipeFast(token, 'students');
  await wipeFast(token, 'academic_terms');
  await wipeFast(token, 'study_centers');
  console.log('✅  Wipe complete\n');

  // ── TAXONOMY: Ensure Faculty / Department / Program ──────────────────────────
  console.log('🏛️   Ensuring core taxonomy (Faculty → Department → Program)...');

  const facultyId = await findOrCreate(token, 'faculties', 'faculty_code', 'THEO', {
    faculty_code: 'THEO',
    name: 'School of Theology',
  });
  console.log(`   Faculty   : THEO (${facultyId})`);

  const deptId = await findOrCreate(token, 'departments', 'dept_code', 'THEO-DEPT', {
    dept_code: 'THEO-DEPT',
    name: 'Biblical Studies and Applied Ministry',
    faculty_code: facultyId,
  });
  console.log(`   Department: THEO-DEPT (${deptId})`);

  const programId = await findOrCreate(token, 'programs', 'program_code', 'DCMT-200', {
    program_code: 'DCMT-200',
    name: 'Diploma in Christian Ministry and Theology',
    degree_level: 'Diploma',
    total_credits: 90,
    dept_code: deptId,
  });
  console.log(`   Program   : DCMT-200 (${programId})\n`);

  // ── STUDY CENTERS ─────────────────────────────────────────────────────────
  console.log('📍  Seeding study centers...');
  const studyCenterIdMap = new Map<string, string>(); // slug → pbId

  for (const c of CAMPUSES) {
    const r = await fetch(`${PB_URL}/api/collections/study_centers/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ name: c.name, location: c.location, code: c.code, status: 'active' }),
    });
    if (r.ok) {
      studyCenterIdMap.set(c.slug, ((await r.json()) as any).id);
    } else {
      // Try finding existing
      const fr = await fetch(
        `${PB_URL}/api/collections/study_centers/records?filter=${encodeURIComponent(`code="${c.code}"`)}`,
        { headers: { Authorization: token } }
      );
      const fd = await fr.json() as any;
      if (fd.items?.length > 0) studyCenterIdMap.set(c.slug, fd.items[0].id);
      else console.warn(`   ⚠  Could not create/find study center: ${c.name}`);
    }
  }
  console.log(`   ✅  ${studyCenterIdMap.size} study centers\n`);

  // ── COURSES: Map existing by code, create if missing ────────────────────────
  console.log('📖  Loading / creating courses...');
  const courseIdMap = new Map<string, string>(); // slug → pbId

  // Load all existing courses from DB
  let coursesPage = 1;
  while (true) {
    const r = await fetch(`${PB_URL}/api/collections/courses/records?perPage=200&page=${coursesPage}`, {
      headers: { Authorization: token }
    });
    const d = await r.json() as any;
    for (const item of (d.items ?? [])) {
      const matched = COURSES_RAW.find(c => c.code === item.code || c.code === item.course_code);
      if (matched) courseIdMap.set(matched.slug, item.id);
    }
    if ((d.items ?? []).length < 200) break;
    coursesPage++;
  }

  // Create any that are missing
  let createdCourses = 0;
  for (const c of COURSES_RAW) {
    if (courseIdMap.has(c.slug)) continue;
    const r = await fetch(`${PB_URL}/api/collections/courses/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        code: c.code, course_code: c.code, title: c.title,
        credit_hours: c.credit_hours, credits: c.credit_hours,
        category: c.category, status: 'Published', is_elective: false,
      }),
    });
    if (r.ok) { courseIdMap.set(c.slug, ((await r.json()) as any).id); createdCourses++; }
    else console.warn(`   ⚠  Failed to create course ${c.code}`);
  }
  console.log(`   ✅  ${courseIdMap.size} courses (${createdCourses} newly created, ${courseIdMap.size - createdCourses} pre-existing)\n`);

  // ── PROGRAM_COURSES: Link DCMT-200 → all 35 courses ─────────────────────────
  console.log('🔗  Creating program_courses links (DCMT-200 → courses)...');
  let pcCreated = 0;
  for (const c of COURSES_RAW) {
    const courseId = courseIdMap.get(c.slug);
    if (!courseId) { console.warn(`   ⚠  No ID for course ${c.code} — skipping link`); continue; }

    const r = await fetch(`${PB_URL}/api/collections/program_courses/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        program_code: programId,  // program_courses.program_code is a relation to programs
        course_code:  courseId,   // program_courses.course_code is a relation to courses
        is_required:  true,
        sequence_order: c.sequence_order,
      }),
    });
    if (r.ok) pcCreated++;
    else {
      const err = await r.json() as any;
      console.warn(`   ⚠  Link failed for ${c.code}: ${JSON.stringify(err.data ?? err.message)}`);
    }
  }
  console.log(`   ✅  ${pcCreated} program_courses links\n`);

  // ── STUDENTS ──────────────────────────────────────────────────────────────
  console.log(`👩‍🎓  Seeding ${STUDENTS.length} students...`);
  const studentIdMap = new Map<string, string>(); // student_code → pbId
  let stuCreated = 0, stuFailed = 0;

  for (const s of STUDENTS) {
    const scId = studyCenterIdMap.get(s.campus_slug) ?? null;
    const nameParts = s.full_name.trim().split(/\s+/);
    const first_name = nameParts[0] ?? '';
    const last_name  = nameParts.slice(1).join(' ');

    // Admission year from student_code (format: "2025-0001" → 2025)
    const admYearStr = s.student_code.split('-')[0];
    const admYear    = parseInt(admYearStr, 10) || 2025;

    const r = await fetch(`${PB_URL}/api/collections/students/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        student_code:   s.student_code,
        student_number: s.student_code,
        reg_no:         s.reg_no,
        full_name:      s.full_name,
        first_name,
        last_name,
        gender:         s.gender,
        nationality:    (s as any).nationality ?? 'Kenyan',
        phone:          (s as any).phone ?? '',
        email:          s.email || null,
        admission_no:   (s as any).admission_no ?? s.reg_no,
        admission_date: `${admYear}-01-15`,
        admissionYear:  String(admYear),
        programme:      'Diploma in Christian Ministry and Theology',
        program_code:   programId,
        status:         'Active',
        study_center_id: scId,
        avatar_color:   nextColor(),
        year_of_study:  1,
        mode_of_study:  'Full-Time',
      }),
    });

    if (r.ok) {
      studentIdMap.set(s.student_code, ((await r.json()) as any).id);
      stuCreated++;
    } else {
      const err = await r.json() as any;
      console.warn(`   ⚠  ${s.full_name}: ${JSON.stringify(err.data ?? err.message)}`);
      stuFailed++;
    }
  }
  console.log(`   ✅  ${stuCreated} students created (${stuFailed} failed)\n`);

  // ── ACADEMIC TERMS: Dynamic find-or-create ───────────────────────────────────
  console.log('📅  Building dynamic academic terms...');
  const termIdMap = new Map<string, string>(); // termCode → pbId
  const now = new Date();

  async function getOrCreateTerm(admYear: number, yearOffset: number, semNum: 1 | 2): Promise<string> {
    const info = buildTermInfo(admYear, yearOffset, semNum);
    if (termIdMap.has(info.code)) return termIdMap.get(info.code)!;

    // Check if it already exists in DB
    const filter = encodeURIComponent(`code="${info.code}"`);
    const fr = await fetch(`${PB_URL}/api/collections/academic_terms/records?filter=${filter}`,
      { headers: { Authorization: token } });
    const fd = await fr.json() as any;
    if (fd.items?.length > 0) {
      termIdMap.set(info.code, fd.items[0].id);
      return fd.items[0].id;
    }

    // Determine term status
    const tStart = new Date(info.start_date);
    const tEnd   = new Date(info.end_date);
    const termStatus = now < tStart ? 'upcoming' : (now > tEnd ? 'closed' : 'active');
    const isCurrent  = now >= tStart && now <= tEnd;

    const cr = await fetch(`${PB_URL}/api/collections/academic_terms/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        code:                info.code,
        academic_year:       info.academic_year,
        semester_number:     info.semester_number,
        term_type:           'semester',
        start_date:          info.start_date,
        end_date:            info.end_date,
        registration_start:  info.registration_start,
        registration_end:    info.registration_end,
        exam_start:          info.exam_start,
        exam_end:            info.exam_end,
        status:              termStatus,
        is_current:          isCurrent,
      }),
    });
    if (!cr.ok) {
      const err = await cr.json() as any;
      throw new Error(`Failed to create term ${info.code}: ${JSON.stringify(err.data ?? err.message)}`);
    }
    const rec = await cr.json() as any;
    termIdMap.set(info.code, rec.id);
    console.log(`   Created: ${info.code}  (${info.academic_year}, Sem ${info.semester_number}, status=${termStatus})`);
    return rec.id;
  }

  // ── ENROLLMENTS & GRADES ───────────────────────────────────────────────────
  console.log('\n📊  Seeding enrollments & grades...');
  let enrollCreated = 0, gradeCreated = 0, gradeSkipped = 0;
  const progressInterval = 50;

  for (const s of STUDENTS) {
    const studentPbId = studentIdMap.get(s.student_code);
    if (!studentPbId) continue;

    const admYear = parseInt(s.student_code.split('-')[0], 10) || 2025;

    for (const g of s.grades) {
      const courseObj = COURSES_RAW.find(c => c.slug === g.course_slug);
      if (!courseObj) { gradeSkipped++; continue; }

      const coursePbId = courseIdMap.get(g.course_slug);
      if (!coursePbId) { gradeSkipped++; continue; }

      const { yearOffset, semNum } = MODULE_TO_SEMESTER[courseObj.module_slug];
      const termInfo = buildTermInfo(admYear, yearOffset, semNum);
      const termId   = await getOrCreateTerm(admYear, yearOffset, semNum);

      const { grade, grade_point, remarks } = gradeFromScore(g.total_score);

      // 1) Create enrollment
      const enrR = await fetch(`${PB_URL}/api/collections/enrollments/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          student_number:  studentPbId,           // relation → students
          course_code:     coursePbId,            // relation → courses
          program_id:      programId,             // relation → programs
          term_id:         termId,                // relation → academic_terms
          academic_year:   termInfo.academic_year,
          semester:        `SEMESTER ${semNum}`,
          semester_number: semNum,
          enrollment_date: termInfo.registration_start,
          status:          'enrolled',
        }),
      });

      if (!enrR.ok) {
        const err = await enrR.json() as any;
        console.warn(`   ⚠  Enrollment ${s.student_code}+${g.course_slug}: ${JSON.stringify(err.data ?? err.message)}`);
        gradeSkipped++;
        continue;
      }
      const enrollment = await enrR.json() as any;
      enrollCreated++;

      // 2) Create grade
      const grdR = await fetch(`${PB_URL}/api/collections/grades/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          enrollment_id:   enrollment.id,          // relation → enrollments
          student_id:      studentPbId,            // relation → students
          course_id:       coursePbId,             // relation → courses
          term_id:         termId,                 // relation → academic_terms
          academic_year:   termInfo.academic_year,
          semester_number: semNum,
          total_score:     g.total_score,
          percentage:      g.total_score,          // percentage field (required) = total score out of 100
          grade_letter:    grade,                  // actual DB field name is grade_letter
          gpa:             grade_point,            // actual DB field name is gpa
          cat_1_score:     null,
          cat_2_score:     null,
          assignment_score: null,
          exam_score:      null,
          status:          'submitted',
          remarks,
        }),
      });

      if (grdR.ok) {
        gradeCreated++;
      } else {
        const err = await grdR.json() as any;
        console.warn(`   ⚠  Grade ${s.student_code}+${g.course_slug}: ${JSON.stringify(err.data ?? err.message)}`);
        gradeSkipped++;
      }

      // Progress indicator
      const done = enrollCreated + gradeSkipped;
      if (done % progressInterval === 0) {
        process.stdout.write(`\r   Progress: ${enrollCreated} enrollments | ${gradeCreated} grades | ${gradeSkipped} skipped    `);
      }
    }
  }
  console.log(`\n   ✅  ${enrollCreated} enrollments | ${gradeCreated} grades | ${gradeSkipped} skipped`);

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  const termList = [...termIdMap.keys()].sort();
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   ✅  V2 Nuke & Seed Complete!                           ║');
  console.log(`║   Study Centers  : ${CAMPUSES.length}`.padEnd(59) + '║');
  console.log(`║   Courses        : ${courseIdMap.size}`.padEnd(59) + '║');
  console.log(`║   Program Links  : ${pcCreated}`.padEnd(59) + '║');
  console.log(`║   Students       : ${stuCreated}`.padEnd(59) + '║');
  console.log(`║   Academic Terms : ${termIdMap.size} (dynamically generated)`.padEnd(59) + '║');
  console.log(`║   Enrollments    : ${enrollCreated}`.padEnd(59) + '║');
  console.log(`║   Grades         : ${gradeCreated}`.padEnd(59) + '║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║   Terms created:'.padEnd(59) + '║');
  for (const t of termList) {
    console.log(`║     • ${t}`.padEnd(59) + '║');
  }
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e?.message ?? e);
  process.exit(1);
});
