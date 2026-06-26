/**
 * Seeds faculties, departments, programs, courses, program_courses, sample staff & library
 * when collections are empty (dev / first-run convenience).
 *
 * Uses upsert-style logic: checks for existing records by unique key before creating,
 * preventing duplicate rows on repeated restarts.
 */
import { getPocketBase } from './pocketbase.js';
import { logger } from '../utils/logger.js';

const SAMPLE_COURSES: Array<{
  course_code: string;
  title: string;
  credits: number;
  faculty: string;
  department: string;
  level: string;
  status: string;
  description: string;
  syllabus: string;
}> = [
  { course_code: 'THEO101', title: 'Systematic Theology I', credits: 3, faculty: 'Theology', department: 'Biblical Studies and Applied Ministry', level: 'Undergraduate', status: 'Published', description: 'Introduction to core theological doctrines.', syllabus: 'God, Creation, Revelation.' },
  { course_code: 'CS101', title: 'Introduction to Web Development', credits: 4, faculty: 'ICT', department: 'Computer Science', level: 'Undergraduate', status: 'Published', description: 'Basics of HTML, CSS, and JS.', syllabus: 'Web Standards, Frontend Dev.' },
  { course_code: 'BUS201', title: 'Business Ethics', credits: 3, faculty: 'Business', department: 'Management', level: 'Undergraduate', status: 'Published', description: 'Ethical principles in modern business.', syllabus: 'Corporate Responsibility, Ethics.' },
  { course_code: 'BABS-300', title: 'BA in Biblical Studies', credits: 120, faculty: 'Theology', department: 'Biblical Studies and Applied Ministry', level: 'Undergraduate', status: 'Published', description: 'In-depth study of the Bible.', syllabus: 'OT, NT, Hermeneutics.' },
  { course_code: 'MDIV-600', title: 'Masters of Divinity', credits: 90, faculty: 'Theology', department: 'Divinity', level: 'Postgraduate', status: 'Published', description: 'Professional degree for ordained ministry.', syllabus: 'Greek/Hebrew, Preaching.' },
];

/** Find or create a record by a unique text field. Returns the record. */
async function findOrCreate(collection: string, uniqueField: string, uniqueValue: string, data: Record<string, unknown>) {
  const pb = getPocketBase();
  try {
    const existing = await pb.collection(collection).getFirstListItem(`${uniqueField} = "${uniqueValue.replace(/"/g, '\\"')}"`);
    return existing;
  } catch (error) {
    // Not found — create
    return await pb.collection(collection).create(data);
  }
}

export async function seedAcademicReferenceDataIfEmpty(): Promise<void> {
  const pb = getPocketBase();
  if (!pb.authStore.isValid) {
    logger.warn('seedAcademicReferenceDataIfEmpty: not authenticated, skipping');
    return;
  }

  try {
    // Quick check: if we already have staff, the seed has completed successfully before
    const staffCheck = await pb.collection('staff').getList(1, 1);
    if (staffCheck.totalItems > 0) {
      logger.info('Database already seeded (staff present), skipping');
      return;
    }

    logger.info('Seeding academic reference data...');

    // Faculties (find-or-create to avoid duplicates)
    const fTheo = await findOrCreate('faculties', 'faculty_code', 'THEO', { faculty_code: 'THEO', name: 'School of Theology and Ministry' });
    const fIct  = await findOrCreate('faculties', 'faculty_code', 'ICT',  { faculty_code: 'ICT',  name: 'School of ICT' });
    const fBus  = await findOrCreate('faculties', 'faculty_code', 'BUS',  { faculty_code: 'BUS',  name: 'School of Business' });

    // Departments
    const dBs  = await findOrCreate('departments', 'dept_code', 'BS',  { dept_code: 'BS',  name: 'Biblical Studies and Applied Ministry',  faculty_code: fTheo.id });
    await findOrCreate('departments', 'dept_code', 'CS',  { dept_code: 'CS',  name: 'Computer Science',  faculty_code: fIct.id });
    await findOrCreate('departments', 'dept_code', 'MGT', { dept_code: 'MGT', name: 'Management',        faculty_code: fBus.id });
    const dDiv = await findOrCreate('departments', 'dept_code', 'DIV', { dept_code: 'DIV', name: 'Divinity',          faculty_code: fTheo.id });

    // Programs
    const pUg = await findOrCreate('programs', 'program_code', 'BABS', {
      program_code: 'BABS',
      name: 'BA Biblical Studies',
      degree_level: 'Undergraduate',
      total_credits: 120,
      dept_code: dBs.id,
    });
    const pGrad = await findOrCreate('programs', 'program_code', 'MDIV', {
      program_code: 'MDIV',
      name: 'Master of Divinity',
      degree_level: 'Postgraduate',
      total_credits: 90,
      dept_code: dDiv.id,
    });

    // Courses
    const courseIdByCode = new Map<string, string>();
    for (const c of SAMPLE_COURSES) {
      const row = await findOrCreate('courses', 'code', c.course_code, {
        code: c.course_code,
        title: c.title,
        credit_hours: c.credits,
        is_elective: false,
        faculty: c.faculty,
        department: c.department,
        level: c.level,
        status: c.status,
        description: c.description,
        syllabus: c.syllabus,
      });
      courseIdByCode.set(c.course_code, row.id);
    }

    // Program ↔ Course links
    const link = async (programId: string, courseCode: string, order: number) => {
      const cid = courseIdByCode.get(courseCode);
      if (!cid) return;
      // Check if link already exists
      try {
        await pb.collection('program_courses').getFirstListItem(
          `program_code = "${programId}" && course_id = "${cid}"`
        );
        return; // already linked
      } catch (error) {
        // Not found — create
      }
      await pb.collection('program_courses').create({
        program_code: programId,
        course_id: cid,
        is_required: true,
        sequence_order: order,
      });
    };

    await link(pUg.id, 'THEO101', 1);
    await link(pUg.id, 'CS101', 2);
    await link(pUg.id, 'BABS-300', 3);
    await link(pGrad.id, 'THEO101', 1);
    await link(pGrad.id, 'MDIV-600', 2);

    // Sample staff member
    await findOrCreate('staff', 'staff_number', 'STF-SEED-001', {
      staff_number: 'STF-SEED-001',
      first_name: 'Samuel',
      last_name: 'Kiptoo',
      email: 's.kiptoo@bmi.edu',
      phone: '+254711000001',
      title: 'Dean',
      role: 'Dean',
      dept_code: dBs.id,
      department: 'Biblical Studies and Applied Ministry',
      category: 'Academic',
      specialization: 'Systematic Theology',
      office: 'Zion Wing 101',
      office_hours: 'Mon-Wed 10-12',
      status: 'Full-time',
      join_date: '2015-08-01',
      avatar_color: 'bg-purple-700',
    });

    // Sample library item
    await findOrCreate('library_items', 'title', 'Systematic Theology', {
      title: 'Systematic Theology',
      author: 'Wayne Grudem',
      category: 'Theology',
      type: 'Hardcopy',
      status: 'Available',
      year: '1994',
      description: 'Comprehensive introduction to biblical doctrine.',
      downloadUrl: '',
    });

    // Sample student for dashboard visibility
    const sampleStudent = await findOrCreate('students', 'student_number', 'BMI-2026-0001', {
      student_number: 'BMI-2026-0001',
      first_name: 'Grace',
      last_name: 'Mwangi',
      email: 'g.mwangi@students.bmi.edu',
      phone: '+254722000001',
      gender: 'Female',
      program_code: pUg.id,
      admission_date: '2026-01-15',
      status: 'Active',
      avatar_color: 'bg-emerald-600',
      photo_zoom: 1,
    });

    // Sample transaction for dashboard
    await findOrCreate('transactions', 'ref', 'TXN-SEED-001', {
      ref: 'TXN-SEED-001',
      name: 'Grace Mwangi',
      desc: 'Tuition Payment - Semester 1',
      amt: 45000,
      status: 'Paid',
      date: '2026-01-20',
      student_id: sampleStudent.id,
    });

    // Seeding current academic term
    await findOrCreate('academic_terms', 'code', '2026-SEM1', {
      code: '2026-SEM1',
      academic_year: '2026',
      semester_number: 1,
      term_type: 'semester',
      start_date: '2026-01-05T00:00:00.000Z',
      end_date: '2026-05-15T00:00:00.000Z',
      registration_start: '2026-01-02T00:00:00.000Z',
      registration_end: '2026-01-16T00:00:00.000Z',
      exam_start: '2026-05-04T00:00:00.000Z',
      exam_end: '2026-05-08T00:00:00.000Z',
      status: 'active',
      is_current: true,
    });

    logger.info('Academic reference seed complete ✓');
  } catch (error) {
    logger.warn({ err: error }, 'Academic seed failed (non-fatal)');
  }
}






