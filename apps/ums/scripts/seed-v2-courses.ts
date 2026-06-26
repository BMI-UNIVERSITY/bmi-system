/**
 * BMI UMS — v2 Full Course Catalog Seed
 * ======================================
 * Idempotently seeds:
 *   1. Faculty  (STM — School of Theology & Ministry)
 *   2. Department  (Biblical Studies & Ministry)
 *   3. Programs  (Certificate & Diploma in Christian Ministry and Theology)
 *   4. Courses  (35 core courses across 5 modules)
 *   5. program_courses  (all courses linked to both programs)
 *
 * Usage:
 *   npx tsx scripts/seed-v2-courses.ts
 *
 * Env vars (all optional — defaults shown):
 *   PB_URL       http://127.0.0.1:8090
 *   PB_EMAIL     admin@bmi.edu
 *   PB_PASSWORD  (POCKETBASE_ADMIN_PASSWORD env var, or prompt fails)
 *
 * Idempotency: each section checks for existing records by code/name before
 * inserting, so running the script twice is safe.
 */

// ── Config ─────────────────────────────────────────────────────────────────────
const PB_URL      = process.env.PB_URL      || 'http://127.0.0.1:8090';
const PB_EMAIL    = process.env.PB_EMAIL    || 'admin@bmi.edu';
const PB_PASSWORD = process.env.PB_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || '';

if (!PB_PASSWORD) {
  console.error('❌  PB_PASSWORD / POCKETBASE_ADMIN_PASSWORD env var is required.');
  process.exit(1);
}

// ── Catalog Data ───────────────────────────────────────────────────────────────

const FACULTY = {
  faculty_code: 'STM',
  name: 'School of Theology & Ministry',
};

const DEPARTMENT = {
  dept_code: 'BSM',
  name: 'Biblical Studies and Applied Ministry',
  // faculty_code field (relation ID) is resolved at runtime
};

const PROGRAMS = [
  {
    program_code: 'CERT-CMT',
    name: 'Certificate in Christian Ministry and Theology',
    degree_level: 'certificate',
    total_credits: 30,
  },
  {
    program_code: 'DIP-CMT',
    name: 'Diploma in Christian Ministry and Theology',
    degree_level: 'diploma',
    total_credits: 90,
  },
];

const MODULES = [
  { name: 'Module 1', semester: 'Semester 1', sort_order: 1 },
  { name: 'Module 2', semester: 'Semester 2', sort_order: 2 },
  { name: 'Module 3', semester: 'Semester 1', sort_order: 3 },
  { name: 'Module 4', semester: 'Semester 2', sort_order: 4 },
  { name: 'Module 5', semester: 'Semester 1', sort_order: 5 },
];

const COURSES = [
  // Module 1
  { code: 'ENG 101', title: 'Basic English Grammar',               category: 'General Education',   credit_hours: 2, module_name: 'Module 1' },
  { code: 'AWR 102', title: 'Academic Writing',                    category: 'General Education',   credit_hours: 2, module_name: 'Module 1' },
  { code: 'OTS 111', title: 'Old Testament Survey',               category: 'Biblical Studies',    credit_hours: 3, module_name: 'Module 1' },
  { code: 'NTS 112', title: 'New Testament Survey',               category: 'Biblical Studies',    credit_hours: 3, module_name: 'Module 1' },
  { code: 'BIB 113', title: 'Bibliology',                         category: 'Theology',            credit_hours: 3, module_name: 'Module 1' },
  { code: 'HER 114', title: 'Biblical Hermeneutics',              category: 'Biblical Studies',    credit_hours: 3, module_name: 'Module 1' },
  { code: 'EVA 115', title: 'Evangelism',                         category: 'Ministry',            credit_hours: 2, module_name: 'Module 1' },
  { code: 'CFM 116', title: 'Christian Family',                   category: 'Ministry',            credit_hours: 2, module_name: 'Module 1' },
  // Module 2
  { code: 'HOM 121', title: 'Homiletics',                         category: 'Ministry',            credit_hours: 3, module_name: 'Module 2' },
  { code: 'CHH 122', title: 'Church History',                     category: 'Church History',      credit_hours: 3, module_name: 'Module 2' },
  { code: 'THP 123', title: 'Theology Proper',                    category: 'Theology',            credit_hours: 3, module_name: 'Module 2' },
  { code: 'CHR 124', title: 'Christology',                        category: 'Theology',            credit_hours: 3, module_name: 'Module 2' },
  { code: 'SOT 125', title: 'Soteriology',                        category: 'Theology',            credit_hours: 3, module_name: 'Module 2' },
  { code: 'PNE 126', title: 'Pneumatology',                       category: 'Theology',            credit_hours: 3, module_name: 'Module 2' },
  { code: 'PRW 127', title: 'Praise and Worship',                 category: 'Ministry',            credit_hours: 2, module_name: 'Module 2' },
  // Module 3
  { code: 'ECC 211', title: 'Ecclesiology',                       category: 'Theology',            credit_hours: 3, module_name: 'Module 3' },
  { code: 'CAD 212', title: 'Church Administration',              category: 'Ministry Leadership', credit_hours: 3, module_name: 'Module 3' },
  { code: 'CHG 213', title: 'Church Growth',                      category: 'Ministry Leadership', credit_hours: 3, module_name: 'Module 3' },
  { code: 'CHP 214', title: 'Church Planting',                    category: 'Ministry Leadership', credit_hours: 3, module_name: 'Module 3' },
  { code: 'FSM 215', title: 'Foundation of Successful Ministry',  category: 'Ministry',            credit_hours: 2, module_name: 'Module 3' },
  { code: 'SPF 216', title: 'Spiritual Formation',                category: 'Spiritual Development', credit_hours: 3, module_name: 'Module 3' },
  { code: 'POS 217', title: 'Principles of Success',              category: 'Leadership Development', credit_hours: 2, module_name: 'Module 3' },
  { code: 'UKP 218', title: "Understanding God's Kingdom Principles", category: 'Theology',       credit_hours: 3, module_name: 'Module 3' },
  // Module 4
  { code: 'ESC 221', title: 'Eschatology',                        category: 'Theology',            credit_hours: 3, module_name: 'Module 4' },
  { code: 'ANG 222', title: 'Angelology',                         category: 'Theology',            credit_hours: 2, module_name: 'Module 4' },
  { code: 'ANH 223', title: 'Anthropology & Hamartiology',        category: 'Theology',            credit_hours: 3, module_name: 'Module 4' },
  { code: 'SPW 224', title: 'Spiritual Warfare',                  category: 'Spiritual Development', credit_hours: 3, module_name: 'Module 4' },
  { code: 'SPR 225', title: 'Spiritual Realm',                    category: 'Spiritual Development', credit_hours: 2, module_name: 'Module 4' },
  { code: 'APO 226', title: 'Christian Apologetics',              category: 'Theology',            credit_hours: 3, module_name: 'Module 4' },
  { code: 'PCE 227', title: 'Pastoral Counselling & Ethics',      category: 'Ministry',            credit_hours: 3, module_name: 'Module 4' },
  { code: 'MWR 228', title: 'Major World Religions',              category: 'Comparative Religion', credit_hours: 3, module_name: 'Module 4' },
  // Module 5
  { code: 'GRK 311', title: 'Biblical Greek',                     category: 'Biblical Languages',  credit_hours: 3, module_name: 'Module 5' },
  { code: 'HEB 312', title: 'Biblical Hebrew',                    category: 'Biblical Languages',  credit_hours: 3, module_name: 'Module 5' },
  { code: 'MIN 315', title: 'Ministry Practicum / Internship',    category: 'Practicum',           credit_hours: 4, module_name: 'Module 5' },
  { code: 'RES 316', title: 'Research Project',                   category: 'Research',            credit_hours: 3, module_name: 'Module 5' },
];

// ── HTTP Helpers ───────────────────────────────────────────────────────────────
let AUTH_TOKEN = '';

async function pbPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${PB_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { Authorization: AUTH_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  });
  return res;
}

async function pbGet(path: string) {
  const res = await fetch(`${PB_URL}${path}`, {
    headers: AUTH_TOKEN ? { Authorization: AUTH_TOKEN } : {},
  });
  return res;
}

async function getAll(collection: string, fields = 'id'): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const res = await pbGet(
      `/api/collections/${collection}/records?page=${page}&perPage=200&fields=${fields}`
    );
    if (!res.ok) return all;
    const data: any = await res.json();
    all.push(...(data.items ?? []));
    if (page >= (data.totalPages ?? 1)) break;
    page++;
  }
  return all;
}

async function createRecord(collection: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH_TOKEN },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error: any = await res.json().catch (error) => ({}));
    throw Object.assign(
      new Error(error.message || `Create failed on ${collection}`),
      { status: res.status, data: error }
    );
  }
  return res.json();
}

async function authenticate() {
  console.log(`\n🔐 Authenticating as ${PB_EMAIL}…`);
  const res = await pbPost('/api/admins/auth-with-password', {
    identity: PB_EMAIL,
    password: PB_PASSWORD,
  });
  if (!res.ok) {
    const error: any = await res.json().catch (error) => ({}));
    throw new Error(`Auth failed: ${error.message || res.statusText}`);
  }
  const data: any = await res.json();
  AUTH_TOKEN = data.token;
  console.log('   ✓ Authenticated');
}

// ── Phase helpers ──────────────────────────────────────────────────────────────

/** Upsert a single faculty; returns its PocketBase record ID. */
async function seedFaculty(): Promise<string> {
  console.log('\n🏫 Phase 1: Faculty');
  const existing = await getAll('faculties', 'id,faculty_code,name');
  const found = existing.find((r) => r.faculty_code === FACULTY.faculty_code);
  if (found) {
    console.log(`   ↩ Faculty already exists: ${FACULTY.name} [${found.id}]`);
    return found.id;
  }
  const rec = await createRecord('faculties', FACULTY);
  console.log(`   ✓ Created faculty: ${FACULTY.name} [${rec.id}]`);
  return rec.id;
}

/** Upsert a single department; returns its PocketBase record ID. */
async function seedDepartment(facultyId: string): Promise<string> {
  console.log('\n🏢 Phase 2: Department');
  const existing = await getAll('departments', 'id,dept_code,name');
  const found = existing.find((r) => r.dept_code === DEPARTMENT.dept_code);
  if (found) {
    console.log(`   ↩ Department already exists: ${DEPARTMENT.name} [${found.id}]`);
    return found.id;
  }
  const rec = await createRecord('departments', {
    ...DEPARTMENT,
    faculty_code: facultyId,   // relation field name as defined by migration
  });
  console.log(`   ✓ Created department: ${DEPARTMENT.name} [${rec.id}]`);
  return rec.id;
}

/** Upsert Certificate & Diploma programs; returns map of program_code → id. */
async function seedPrograms(departmentId: string): Promise<Map<string, string>> {
  console.log('\n🎓 Phase 3: Programs');
  const existing = await getAll('programs', 'id,program_code,name');
  const idMap = new Map<string, string>();

  for (const prog of PROGRAMS) {
    const found = existing.find((r) => r.program_code === prog.program_code);
    if (found) {
      idMap.set(prog.program_code, found.id);
      console.log(`   ↩ Program exists: ${prog.name} [${found.id}]`);
    } else {
      const rec = await createRecord('programs', {
        ...prog,
        dept_code: departmentId, // relation field name from migration
      });
      idMap.set(prog.program_code, rec.id);
      console.log(`   ✓ Created program: ${prog.name} [${rec.id}]`);
    }
  }
  return idMap;
}

/** Upsert all 5 modules; returns map of module name → id. */
async function seedModules(): Promise<Map<string, string>> {
  console.log('\n📚 Phase 4: Modules');
  const existing = await getAll('modules', 'id,name');
  const idMap = new Map<string, string>();

  for (const mod of MODULES) {
    const found = existing.find((r) => r.name === mod.name);
    if (found) {
      idMap.set(mod.name, found.id);
      process.stdout.write('.');
    } else {
      const rec = await createRecord('modules', mod);
      idMap.set(mod.name, rec.id);
      process.stdout.write('+');
    }
  }
  console.log(`\n   ✓ ${idMap.size} modules ready`);
  return idMap;
}

/** Upsert all 35 courses; returns map of course code → id. */
async function seedCourses(moduleIdMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('\n📖 Phase 5: Courses');
  const existing = await getAll('courses', 'id,code');
  const existingMap = new Map<string, string>(existing.map((r: any) => [r.code, r.id]));
  const idMap = new Map<string, string>();
  let created = 0, skipped = 0, failed = 0;

  for (const course of COURSES) {
    if (existingMap.has(course.code)) {
      idMap.set(course.code, existingMap.get(course.code)!);
      skipped++;
      continue;
    }

    const moduleId = moduleIdMap.get(course.module_name);
    if (!moduleId) {
      console.warn(`\n   ⚠  Module "${course.module_name}" not found for course ${course.code}`);
      failed++;
      continue;
    }

    try {
      const rec = await createRecord('courses', {
        code:         course.code,
        title:        course.title,
        category:     course.category,
        credit_hours: course.credit_hours,
        module_id:    moduleId,
        status:       'Published',
      });
      idMap.set(course.code, rec.id);
      created++;
    } catch (error) {
      console.warn(`\n   ✗  Failed to create ${course.code}: ${e.message}`);
      failed++;
    }
  }

  console.log(`   ✅  ${created} created, ${skipped} skipped, ${failed} failed — ${idMap.size} total`);
  return idMap;
}

/**
 * Link every course to every program via program_courses.
 * Certificate gets Module 1-2 courses; Diploma gets all courses.
 */
async function seedProgramCourses(
  courseIdMap: Map<string, string>,
  programIdMap: Map<string, string>
) {
  console.log('\n🔗 Phase 6: Program → Course Links');

  const existing = await getAll('program_courses', 'id,program_code,course_code');
  // key = programId::courseId
  const existingKeys = new Set<string>(
    existing.map((r: any) => `${r.program_code}::${r.course_code}`)
  );

  const certId    = programIdMap.get('CERT-CMT')!;
  const diplomaId = programIdMap.get('DIP-CMT')!;

  if (!certId || !diplomaId) {
    console.error('   ✗  Program IDs not found — skipping link phase');
    return;
  }

  // Certificate: Module 1 + 2 courses only (intro-level, ≤ credit code < 200)
  const certCodes = new Set(
    COURSES
      .filter((c) => ['Module 1', 'Module 2'].includes(c.module_name))
      .map((c) => c.code)
  );

  let created = 0, skipped = 0;

  for (const [code, courseId] of courseIdMap) {
    // Always link to diploma
    const diplomaKey = `${diplomaId}::${courseId}`;
    if (!existingKeys.has(diplomaKey)) {
      try {
        await createRecord('program_courses', {
          program_code: diplomaId,
          course_code:  courseId,
          is_required:  true,
          sequence_order: COURSES.findIndex((c) => c.code === code) + 1,
        });
        existingKeys.add(diplomaKey);
        created++;
      } catch (error) { }
    } else {
      skipped++;
    }

    // Link to certificate only if cert-level course
    if (certCodes.has(code)) {
      const certKey = `${certId}::${courseId}`;
      if (!existingKeys.has(certKey)) {
        try {
          await createRecord('program_courses', {
            program_code: certId,
            course_code:  courseId,
            is_required:  true,
            sequence_order: [...certCodes].indexOf(code) + 1,
          });
          existingKeys.add(certKey);
          created++;
        } catch (error) { }
      } else {
        skipped++;
      }
    }
  }

  console.log(`   ✅  ${created} links created, ${skipped} already existed`);
}

// ── Summary ────────────────────────────────────────────────────────────────────
async function printSummary() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  📊  Catalog Summary');
  console.log('═══════════════════════════════════════════════════════');

  const [faculties, departments, programs, courses, links] = await Promise.all([
    getAll('faculties', 'id'),
    getAll('departments', 'id'),
    getAll('programs', 'id'),
    getAll('courses', 'id'),
    getAll('program_courses', 'id'),
  ]);

  console.log(`  Faculties    : ${faculties.length}`);
  console.log(`  Departments  : ${departments.length}`);
  console.log(`  Programs     : ${programs.length}`);
  console.log(`  Courses      : ${courses.length}`);
  console.log(`  Course links : ${links.length}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  BMI UMS — v2 Course Catalog Seed');
  console.log(`  Target: ${PB_URL}`);
  console.log('═══════════════════════════════════════════════════════');

  await authenticate();

  const facultyId    = await seedFaculty();
  const departmentId = await seedDepartment(facultyId);
  const programIdMap = await seedPrograms(departmentId);
  const moduleIdMap  = await seedModules();
  const courseIdMap  = await seedCourses(moduleIdMap);
  await seedProgramCourses(courseIdMap, programIdMap);
  await printSummary();

  console.log('✅  Seed complete!');
  console.log('   Next: verify at http://127.0.0.1:8090/_/\n');
}

main().catch (error) => {
  console.error('\n❌  Seed failed:', error.message);
  if (error.data) console.error('    Details:', JSON.stringify(error.data, null, 2));
  process.exit(1);
  });






