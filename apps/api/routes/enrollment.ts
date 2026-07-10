import { ok, error, typedJson } from '../lib/types';
import type { Env } from '../lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Hold {
  id: string;
  hold_type: 'document' | 'orientation' | 'course_selection' | 'payment';
  reason: string;
  is_active: number;
  created_at: string;
  resolved_at: string | null;
}

interface CurriculumTerm {
  id: string;
  term_id: string;
  term_name: string;
  term_number: number;
  academic_year: string;
}

interface ProgramCourse {
  id: string;
  course_id: string;
  code: string;
  title: string;
  credits: number;
  is_mandatory: number;
  elective_group: string | null;
}

// ─── Holds ──────────────────────────────────────────────────────────────────

export async function handleGetMyHolds(req: Request, env: Env, userId: string): Promise<Response> {
  const { results: holds } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, hold_type, reason, is_active, created_at, resolved_at
     FROM student_holds WHERE student_id = ? ORDER BY created_at ASC`
  ).bind(userId).all<Hold>();

  const active = holds.filter(h => h.is_active);
  const resolved = holds.filter(h => !h.is_active);

  return ok({ holds, active_count: active.length, resolved_count: resolved.length, is_all_cleared: active.length === 0 });
}

// ─── Curriculum ─────────────────────────────────────────────────────────────

export async function handleGetProgramCurriculum(req: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(req.url);
  const termId = url.searchParams.get('term_id');

  const studentProg = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT sp.programme_id, p.name as program_name, p.code as program_code
     FROM student_programmes sp
     JOIN programs p ON p.id = sp.programme_id
     WHERE sp.uid = (SELECT uid FROM persons WHERE id = (SELECT person_id FROM users WHERE id = ?))
     AND sp.current_flag = 1`
  ).bind(userId).first<{ programme_id: string; program_name: string; program_code: string }>();

  if (!studentProg) return error('No active programme found. Please contact admissions.', 404);

  let curriculumRows;
  if (termId) {
    const curResult = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT pc.id, pc.term_id, at.name as term_name, pc.term_number, at.academic_year
       FROM program_curriculum pc
       JOIN academic_terms at ON at.id = pc.term_id
       WHERE pc.program_id = ? AND pc.term_id = ?
       ORDER BY pc.term_number ASC`
    ).bind(studentProg.programme_id, termId).all<CurriculumTerm>();
    curriculumRows = curResult.results;
  } else {
    const curResult = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT pc.id, pc.term_id, at.name as term_name, pc.term_number, at.academic_year
       FROM program_curriculum pc
       JOIN academic_terms at ON at.id = pc.term_id
       WHERE pc.program_id = ?
       ORDER BY pc.term_number ASC`
    ).bind(studentProg.programme_id).all<CurriculumTerm>();
    curriculumRows = curResult.results;
  }

  if (curriculumRows.length === 0) return error('No curriculum defined for this programme.', 404);

  const curriculumWithCourses = await Promise.all(curriculumRows.map(async (term) => {
    const { results: courses } = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT pc.id, pc.course_id, c.code, c.name as title, c.credits, pc.is_mandatory, pc.elective_group
       FROM program_courses pc
       JOIN courses c ON c.id = pc.course_id
       WHERE pc.curriculum_id = ?
       ORDER BY pc.is_mandatory DESC, c.code ASC`
    ).bind(term.id).all<ProgramCourse>();

    return { ...term, courses };
  }));

  return ok({
    programme_id: studentProg.programme_id,
    program_name: studentProg.program_name,
    program_code: studentProg.program_code,
    terms: curriculumWithCourses,
  });
}

// ─── Auto-Enrollment (Mandatory Courses) ────────────────────────────────────

export async function handleAutoEnrollMandatory(req: Request, env: Env, userId: string): Promise<Response> {
  const hold = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM student_holds WHERE student_id = ? AND hold_type = 'course_selection' AND is_active = 1`
  ).bind(userId).first<{ id: string }>();

  if (!hold) return error('Course selection hold is already resolved.', 400);

  const studentProg = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT sp.programme_id
     FROM student_programmes sp
     WHERE sp.uid = (SELECT uid FROM persons WHERE id = (SELECT person_id FROM users WHERE id = ?))
     AND sp.current_flag = 1`
  ).bind(userId).first<{ programme_id: string }>();

  if (!studentProg) return error('No active programme found.', 404);

  const now = new Date();
  const currentTerm = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, name, academic_year FROM academic_terms
     WHERE date(start_date) <= date('now') AND date(end_date) >= date('now')
     AND status = 'active' LIMIT 1`
  ).first<{ id: string; name: string; academic_year: string }>();

  if (!currentTerm) return error('No active academic term found.', 404);

  const curriculum = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM program_curriculum
     WHERE program_id = ? AND term_id = ?`
  ).bind(studentProg.programme_id, currentTerm.id).first<{ id: string }>();

  if (!curriculum) return error('No curriculum defined for current term.', 404);

  const { results: mandatoryCourses } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT pc.course_id, c.code, c.name as title
     FROM program_courses pc
     JOIN courses c ON c.id = pc.course_id
     WHERE pc.curriculum_id = ? AND pc.is_mandatory = 1`
  ).bind(curriculum.id).all<{ course_id: string; code: string; title: string }>();

  if (mandatoryCourses.length === 0) return error('No mandatory courses defined for current term.', 404);

  let enrolled = 0;
  let skipped = 0;

  for (const course of mandatoryCourses) {
    const existing = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT id FROM student_course_registrations WHERE student_id = ? AND course_id = ? AND term_id = ?`
    ).bind(userId, course.course_id, currentTerm.id).first();

    if (existing) {
      skipped++;
      continue;
    }

    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO student_course_registrations (id, student_id, course_id, term_id, registration_type, status)
       VALUES (?, ?, ?, ?, 'auto', 'registered')`
    ).bind(crypto.randomUUID(), userId, course.course_id, currentTerm.id).run();

    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT OR IGNORE INTO enrollments (id, student_id, course_id, status)
       VALUES (?, ?, ?, 'enrolled')`
    ).bind(crypto.randomUUID(), userId, course.course_id).run();

    enrolled++;
  }

  return ok({
    message: `Enrolled in ${enrolled} mandatory course(s), ${skipped} already enrolled.`,
    enrolled_count: enrolled,
    skipped_count: skipped,
    term: currentTerm.name,
    courses: mandatoryCourses.map(c => ({ code: c.code, title: c.title })),
  });
}

// ─── Elective Courses ──────────────────────────────────────────────────────

export async function handleGetElectiveGroups(req: Request, env: Env, userId: string): Promise<Response> {
  const studentProg = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT sp.programme_id
     FROM student_programmes sp
     WHERE sp.uid = (SELECT uid FROM persons WHERE id = (SELECT person_id FROM users WHERE id = ?))
     AND sp.current_flag = 1`
  ).bind(userId).first<{ programme_id: string }>();

  if (!studentProg) return error('No active programme found.', 404);

  const currentTerm = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, name FROM academic_terms
     WHERE date(start_date) <= date('now') AND date(end_date) >= date('now')
     AND status = 'active' LIMIT 1`
  ).first<{ id: string; name: string }>();

  if (!currentTerm) return error('No active academic term found.', 404);

  const curriculum = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM program_curriculum WHERE program_id = ? AND term_id = ?`
  ).bind(studentProg.programme_id, currentTerm.id).first<{ id: string }>();

  if (!curriculum) return error('No curriculum defined for current term.', 404);

  const { results: electives } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT pc.id, pc.course_id, c.code, c.name as title, c.credits, c.description,
            pc.elective_group
     FROM program_courses pc
     JOIN courses c ON c.id = pc.course_id
     WHERE pc.curriculum_id = ? AND pc.is_mandatory = 0
     ORDER BY pc.elective_group, c.code`
  ).bind(curriculum.id).all<ProgramCourse & { description: string }>();

  const groups = new Map<string, typeof electives>();
  for (const e of electives) {
    const group = e.elective_group || 'Ungrouped';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(e);
  }

  const groupsArray = Array.from(groups.entries()).map(([group, items]) => ({
    group,
    description: getElectiveGroupDescription(group),
    courses: items,
  }));

  return ok({ term: currentTerm.name, elective_groups: groupsArray });
}

function getElectiveGroupDescription(group: string): string {
  const descriptions: Record<string, string> = {
    'Biblical Languages': 'Choose one language course to support your biblical studies.',
    'Ministry Practice': 'Select one practical ministry course to develop hands-on skills.',
    'General Electives': 'Choose from a range of courses to broaden your knowledge.',
    'Theology Electives': 'Select advanced theological topics that align with your interests.',
    'Counseling Electives': 'Choose specialized counseling courses for your concentration.',
  };
  return descriptions[group] || 'Select from the available elective courses below.';
}

export async function handleSubmitElectives(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await typedJson<{ selected_course_ids: string[] }>(req);
  if (!body.selected_course_ids || !Array.isArray(body.selected_course_ids)) {
    return error('selected_course_ids is required.', 400);
  }

  const hold = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM student_holds WHERE student_id = ? AND hold_type = 'course_selection' AND is_active = 1`
  ).bind(userId).first<{ id: string }>();

  if (!hold) return error('Course selection hold is already resolved.', 400);

  const currentTerm = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, name FROM academic_terms
     WHERE date(start_date) <= date('now') AND date(end_date) >= date('now')
     AND status = 'active' LIMIT 1`
  ).first<{ id: string; name: string }>();

  if (!currentTerm) return error('No active academic term found.', 404);

  let enrolled = 0;
  const errors: string[] = [];

  for (const courseId of body.selected_course_ids) {
    const existing = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT id FROM student_course_registrations WHERE student_id = ? AND course_id = ? AND term_id = ?`
    ).bind(userId, courseId, currentTerm.id).first();

    if (existing) {
      errors.push(`Already registered for course ${courseId}`);
      continue;
    }

    const courseExists = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT id FROM courses WHERE id = ?`
    ).bind(courseId).first();

    if (!courseExists) {
      errors.push(`Course ${courseId} not found.`);
      continue;
    }

    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO student_course_registrations (id, student_id, course_id, term_id, registration_type, status)
       VALUES (?, ?, ?, ?, 'elective', 'registered')`
    ).bind(crypto.randomUUID(), userId, courseId, currentTerm.id).run();

    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT OR IGNORE INTO enrollments (id, student_id, course_id, status)
       VALUES (?, ?, ?, 'enrolled')`
    ).bind(crypto.randomUUID(), userId, courseId).run();

    enrolled++;
  }

  if (enrolled > 0) {
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE student_holds SET is_active = 0, resolved_at = datetime('now') WHERE id = ?`
    ).bind(hold.id).run();
  }

  return ok({
    message: enrolled > 0
      ? `Enrolled in ${enrolled} elective(s). Course selection hold resolved.`
      : 'No electives were enrolled.',
    enrolled_count: enrolled,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ─── Onboarding Status ──────────────────────────────────────────────────────

export async function handleGetRegistrationProgress(req: Request, env: Env, userId: string): Promise<Response> {
  const { results: holds } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, hold_type, reason, is_active, created_at, resolved_at FROM student_holds WHERE student_id = ? ORDER BY created_at ASC`
  ).bind(userId).all<Hold>();

  const idDoc = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM documents WHERE user_id = ? AND doc_type = 'id_document' LIMIT 1`
  ).bind(userId).first();
  const hasUploadedId = !!idDoc;

  const currentTerm = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM academic_terms
     WHERE date(start_date) <= date('now') AND date(end_date) >= date('now')
     AND status = 'active' LIMIT 1`
  ).first<{ id: string }>();

  let hasEnrolledMandatory = false;
  let hasSelectedElectives = false;
  let hasActiveEnrollments = false;

  if (currentTerm) {
    const mandatoryCount = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT COUNT(*) as cnt FROM student_course_registrations WHERE student_id = ? AND term_id = ? AND registration_type = 'auto'`
    ).bind(userId, currentTerm.id).first<{ cnt: number }>();
    hasEnrolledMandatory = (mandatoryCount?.cnt || 0) > 0;

    const electiveCount = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT COUNT(*) as cnt FROM student_course_registrations WHERE student_id = ? AND term_id = ? AND registration_type = 'elective'`
    ).bind(userId, currentTerm.id).first<{ cnt: number }>();
    hasSelectedElectives = (electiveCount?.cnt || 0) > 0;

    const totalEnrollments = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT COUNT(*) as cnt FROM student_course_registrations WHERE student_id = ? AND term_id = ? AND status = 'registered'`
    ).bind(userId, currentTerm.id).first<{ cnt: number }>();
    hasActiveEnrollments = (totalEnrollments?.cnt || 0) > 0;
  }

  const invoice = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, status FROM invoices WHERE student_id = ? AND status = 'paid' LIMIT 1`
  ).bind(userId).first();
  const hasPaid = !!invoice;

  const tasks = [
    {
      id: 'upload_id',
      title: 'Upload Student ID Photo',
      completed: hasUploadedId,
      locked: false,
      hold_type: 'document',
      hold_active: holds.some(h => h.hold_type === 'document' && h.is_active),
      action_url: '/student/documents',
    },
    {
      id: 'orientation',
      title: 'Complete Online Orientation',
      completed: !holds.some(h => h.hold_type === 'orientation' && h.is_active),
      locked: !hasUploadedId,
      hold_type: 'orientation',
      hold_active: holds.some(h => h.hold_type === 'orientation' && h.is_active),
      action_url: '/student/orientation',
    },
    {
      id: 'course_selection',
      title: 'Course Registration',
      completed: !holds.some(h => h.hold_type === 'course_selection' && h.is_active),
      locked: holds.some(h => h.hold_type === 'orientation' && h.is_active),
      sub_tasks: [
        { id: 'enroll_mandatory', title: 'Auto-Enroll in Mandatory Courses', completed: hasEnrolledMandatory },
        { id: 'select_electives', title: 'Select Elective Courses', completed: hasSelectedElectives },
      ],
      hold_type: 'course_selection',
      hold_active: holds.some(h => h.hold_type === 'course_selection' && h.is_active),
      action_url: '/student/academics',
    },
    {
      id: 'payment',
      title: 'Pay Tuition & Fees',
      completed: hasPaid,
      locked: !hasActiveEnrollments,
      hold_type: 'payment',
      hold_active: holds.some(h => h.hold_type === 'payment' && h.is_active),
      action_url: '/student/finances',
    },
  ];

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;

  return ok({
    tasks,
    progress: Math.round((completed / total) * 100),
    is_complete: completed === total,
  });
}

// ─── Orientation ────────────────────────────────────────────────────────────

export async function handleCompleteOrientation(req: Request, env: Env, userId: string): Promise<Response> {
  const hold = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM student_holds WHERE student_id = ? AND hold_type = 'orientation' AND is_active = 1`
  ).bind(userId).first<{ id: string }>();

  if (!hold) return error('Orientation hold not found or already resolved.', 404);

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE student_holds SET is_active = 0, resolved_at = datetime('now'), metadata = '{"completed_via":"online"}' WHERE id = ?`
  ).bind(hold.id).run();

  return ok({ message: 'Orientation completed successfully. Course registration is now available.' });
}

// ─── Program Fee Invoice ────────────────────────────────────────────────────

export async function handleGenerateProgramInvoice(req: Request, env: Env, userId: string): Promise<Response> {
  const paymentHold = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM student_holds WHERE student_id = ? AND hold_type = 'payment' AND is_active = 1`
  ).bind(userId).first<{ id: string }>();

  if (!paymentHold) return error('Payment hold already resolved.', 400);

  const courseSelectionHold = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM student_holds WHERE student_id = ? AND hold_type = 'course_selection' AND is_active = 1`
  ).bind(userId).first();

  if (courseSelectionHold) return error('Complete course registration before generating invoice.', 400);

  const studentProg = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT sp.programme_id, p.name as program_name
     FROM student_programmes sp
     JOIN programs p ON p.id = sp.programme_id
     WHERE sp.uid = (SELECT uid FROM persons WHERE id = (SELECT person_id FROM users WHERE id = ?))
     AND sp.current_flag = 1`
  ).bind(userId).first<{ programme_id: string; program_name: string }>();

  if (!studentProg) return error('No active programme found.', 404);

  const currentTerm = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, name FROM academic_terms
     WHERE date(start_date) <= date('now') AND date(end_date) >= date('now')
     AND status = 'active' LIMIT 1`
  ).first<{ id: string; name: string }>();

  if (!currentTerm) return error('No active academic term found.', 404);

  const fee = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, amount, description FROM program_fees WHERE program_id = ? AND term_id = ?`
  ).bind(studentProg.programme_id, currentTerm.id).first<{ id: string; amount: number; description: string }>();

  if (!fee) return error('No fee structure defined for this programme and term. Contact admin.', 404);

  const existingInvoice = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, status FROM invoices WHERE student_id = ? AND status = 'unpaid'`
  ).bind(userId).first<{ id: string; status: string }>();

  if (existingInvoice) {
    return ok({
      invoice_id: existingInvoice.id,
      amount: fee.amount,
      description: fee.description || `${studentProg.program_name} - ${currentTerm.name} Tuition`,
      status: existingInvoice.status,
      message: 'An unpaid invoice already exists.',
    });
  }

  const invoiceId = crypto.randomUUID();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO invoices (id, student_id, amount, status, due_date, created_at)
     VALUES (?, ?, ?, 'unpaid', ?, datetime('now'))`
  ).bind(invoiceId, userId, fee.amount, dueDate.toISOString().split('T')[0]).run();

  return ok({
    invoice_id: invoiceId,
    amount: fee.amount,
    description: fee.description || `${studentProg.program_name} - ${currentTerm.name} Tuition`,
    due_date: dueDate.toISOString().split('T')[0],
    status: 'unpaid',
  });
}

// ─── Admin: Curriculum Management ───────────────────────────────────────────

export async function handleAdminSyncCurriculum(req: Request, env: Env): Promise<Response> {
  const body = await typedJson<{
    program_id: string;
    curriculum: Array<{
      term_id: string;
      term_number: number;
      courses: Array<{ course_id: string; is_mandatory: boolean; elective_group?: string }>;
    }>;
  }>(req);

  const { program_id, curriculum } = body;
  if (!program_id || !curriculum || !Array.isArray(curriculum)) {
    return error('program_id and curriculum array are required.', 400);
  }

  const program = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM programs WHERE id = ?`
  ).bind(program_id).first();

  if (!program) return error('Program not found.', 404);

  let termsAdded = 0;
  let coursesAdded = 0;

  for (const term of curriculum) {
    const termExists = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT id FROM academic_terms WHERE id = ?`
    ).bind(term.term_id).first();

    if (!termExists) return error(`Academic term ${term.term_id} not found.`, 404);

    const curriculumId = crypto.randomUUID();
    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT OR IGNORE INTO program_curriculum (id, program_id, term_id, term_number)
       VALUES (?, ?, ?, ?)`
    ).bind(curriculumId, program_id, term.term_id, term.term_number).run();
    termsAdded++;

    for (const course of term.courses) {
      const courseExists = await env.PLATFORM_CONTEXT!.db.prepare(
        `SELECT id FROM courses WHERE id = ?`
      ).bind(course.course_id).first();

      if (!courseExists) return error(`Course ${course.course_id} not found.`, 404);

      await env.PLATFORM_CONTEXT!.db.prepare(
        `INSERT OR IGNORE INTO program_courses (id, curriculum_id, course_id, is_mandatory, elective_group)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), curriculumId, course.course_id, course.is_mandatory ? 1 : 0, course.elective_group || null).run();
      coursesAdded++;
    }
  }

  return ok({ message: 'Curriculum synced successfully', terms_added: termsAdded, courses_added: coursesAdded });
}

export async function handleAdminSetProgramFee(req: Request, env: Env): Promise<Response> {
  const body = await typedJson<{ program_id: string; term_id: string; amount: number; description?: string }>(req);
  const { program_id, term_id, amount, description } = body;

  if (!program_id || !term_id || amount == null) return error('program_id, term_id, and amount are required.', 400);

  const feeId = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO program_fees (id, program_id, term_id, amount, description)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(program_id, term_id) DO UPDATE SET amount = excluded.amount, description = excluded.description`
  ).bind(feeId, program_id, term_id, amount, description || null).run();

  return ok({ message: 'Program fee set successfully', fee_id: feeId, amount });
}

export async function handleAdminResolveHold(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await typedJson<{ hold_id?: string; hold_type?: string }>(req);

  if (body.hold_id) {
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE student_holds SET is_active = 0, resolved_at = datetime('now') WHERE id = ?`
    ).bind(body.hold_id).run();
  } else if (body.hold_type) {
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE student_holds SET is_active = 0, resolved_at = datetime('now') WHERE student_id = ? AND hold_type = ? AND is_active = 1`
    ).bind(userId, body.hold_type).run();
  } else {
    return error('Provide hold_id or hold_type.', 400);
  }

  return ok({ message: 'Hold resolved.' });
}
