import { ok, error, typedJson } from '../lib/types';
import type { Env } from '../lib/types';
import { createCoreDb } from '../lib/db';
import {
  studentHolds,
  studentCourseRegistrations,
  programCurriculum,
  programCourses,
  enrollments,
} from '../schema/academic';
import {
  studentPrograms,
  programs,
  persons,
  users,
  academicTerms,
  documents,
  invoices,
  courses,
} from '../schema/core';
import { programFees } from '../schema/academic';
import { eq, and, count, lte, gte } from 'drizzle-orm';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Hold {
  id: string;
  hold_type: 'document' | 'orientation' | 'course_selection' | 'payment';
  reason: string;
  is_active: number;
  created_at: string;
  resolved_at: string | null;
}

// ─── Holds ──────────────────────────────────────────────────────────────────

export async function handleGetMyHolds(_req: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);

  const holds = await db.select({
    id: studentHolds.id,
    hold_type: studentHolds.hold_type,
    reason: studentHolds.reason,
    is_active: studentHolds.is_active,
    created_at: studentHolds.created_at,
    resolved_at: studentHolds.resolved_at,
  })
    .from(studentHolds)
    .where(eq(studentHolds.student_id, userId))
    .orderBy(studentHolds.created_at);

  const active = holds.filter(h => h.is_active);
  const resolved = holds.filter(h => !h.is_active);

  return ok({ holds, active_count: active.length, resolved_count: resolved.length, is_all_cleared: active.length === 0 });
}

// ─── Curriculum ─────────────────────────────────────────────────────────────

export async function handleGetProgramCurriculum(req: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(req.url);
  const termId = url.searchParams.get('term_id');
  const db = createCoreDb(env);

  const studentProg = (await db.select({
    program_id: studentPrograms.program_id,
    program_name: programs.name,
    program_code: programs.code,
    uid: studentPrograms.uid,
  })
    .from(studentPrograms)
    .leftJoin(programs, eq(programs.id, studentPrograms.program_id))
    .leftJoin(persons, eq(persons.uid, studentPrograms.uid))
    .leftJoin(users, eq(users.person_id, persons.id))
    .where(and(eq(users.id, userId), eq(studentPrograms.current_flag, 1)))
    .execute())[0];

  if (!studentProg) return error('No active program found. Please contact admissions.', 404);

  const curriculumQuery = db.select({
    id: programCurriculum.id,
    term_id: programCurriculum.term_id,
    term_name: academicTerms.name,
    term_number: programCurriculum.term_number,
    academic_year: academicTerms.academic_year,
  })
    .from(programCurriculum)
    .leftJoin(academicTerms, eq(academicTerms.id, programCurriculum.term_id))
    .where(
      termId
        ? and(eq(programCurriculum.program_id, studentProg.program_id), eq(programCurriculum.term_id, termId))
        : eq(programCurriculum.program_id, studentProg.program_id)
    )
    .orderBy(programCurriculum.term_number);

  const curriculumRows = await curriculumQuery;

  if (curriculumRows.length === 0) return error('No curriculum defined for this program.', 404);

  const curriculumWithCourses = await Promise.all(curriculumRows.map(async (term) => {
    const termCourses = await db.select({
      id: programCourses.id,
      course_id: programCourses.course_id,
      code: courses.code,
      title: courses.title,
      credits: courses.credits,
      is_mandatory: programCourses.is_mandatory,
      elective_group: programCourses.elective_group,
    })
      .from(programCourses)
      .leftJoin(courses, eq(courses.id, programCourses.course_id))
      .where(eq(programCourses.curriculum_id, term.id))
      .orderBy(programCourses.is_mandatory, courses.code);

    return { ...term, courses: termCourses };
  }));

  return ok({
    program_id: studentProg.program_id,
    program_name: studentProg.program_name,
    program_code: studentProg.program_code,
    terms: curriculumWithCourses,
  });
}

// ─── Active Term Helper ──────────────────────────────────────────────────────

async function getActiveTerm(db: ReturnType<typeof createCoreDb>) {
  const now = new Date();
  return (await db.select({ id: academicTerms.id, name: academicTerms.name, academic_year: academicTerms.academic_year })
    .from(academicTerms)
    .where(and(
      lte(academicTerms.start_date, now),
      gte(academicTerms.end_date, now),
      eq(academicTerms.status, 'active')
    ))
    .limit(1)
    .execute())[0];
}

// ─── Auto-Enrollment (Mandatory Courses) ────────────────────────────────────

export async function handleAutoEnrollMandatory(_req: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);

  const hold = (await db.select({ id: studentHolds.id })
    .from(studentHolds)
    .where(and(
      eq(studentHolds.student_id, userId),
      eq(studentHolds.hold_type, 'course_selection'),
      eq(studentHolds.is_active, 1)
    ))
    .execute())[0];

  if (!hold) return error('Course selection hold is already resolved.', 400);

  const studentProg = (await db.select({ program_id: studentPrograms.program_id })
    .from(studentPrograms)
    .leftJoin(persons, eq(persons.uid, studentPrograms.uid))
    .leftJoin(users, eq(users.person_id, persons.id))
    .where(and(eq(users.id, userId), eq(studentPrograms.current_flag, 1)))
    .execute())[0];

  if (!studentProg) return error('No active program found.', 404);

  const currentTerm = await getActiveTerm(db);
  if (!currentTerm) return error('No active academic term found.', 404);

  const curriculum = (await db.select({ id: programCurriculum.id })
    .from(programCurriculum)
    .where(and(
      eq(programCurriculum.program_id, studentProg.program_id),
      eq(programCurriculum.term_id, currentTerm.id)
    ))
    .execute())[0];

  if (!curriculum) return error('No curriculum defined for current term.', 404);

  const mandatoryCourses = await db.select({
    course_id: programCourses.course_id,
    code: courses.code,
    title: courses.title,
  })
    .from(programCourses)
    .leftJoin(courses, eq(courses.id, programCourses.course_id))
    .where(and(eq(programCourses.curriculum_id, curriculum.id), eq(programCourses.is_mandatory, 1)));

  if (mandatoryCourses.length === 0) return error('No mandatory courses defined for current term.', 404);

  const existingRegs = await db.select({ course_id: studentCourseRegistrations.course_id })
    .from(studentCourseRegistrations)
    .where(and(
      eq(studentCourseRegistrations.student_id, userId),
      eq(studentCourseRegistrations.term_id, currentTerm.id)
    ));

  const already = new Set(existingRegs.map(r => r.course_id));
  const toEnroll = mandatoryCourses.filter(c => !already.has(c.course_id!));

  if (toEnroll.length) {
    await db.transaction(async (tx) => {
      for (const course of toEnroll) {
        await tx.insert(studentCourseRegistrations).values({
          id: crypto.randomUUID(),
          student_id: userId,
          course_id: course.course_id!,
          term_id: currentTerm.id,
          registration_type: 'auto',
          status: 'registered',
        }).onConflictDoNothing();
        await tx.insert(enrollments).values({
          id: crypto.randomUUID(),
          student_id: userId,
          course_id: course.course_id!,
          status: 'enrolled',
        }).onConflictDoNothing();
      }
    });
  }

  const enrolled = toEnroll.length;
  const skipped = mandatoryCourses.length - toEnroll.length;

  return ok({
    message: `Enrolled in ${enrolled} mandatory course(s), ${skipped} already enrolled.`,
    enrolled_count: enrolled,
    skipped_count: skipped,
    term: currentTerm.name,
    courses: mandatoryCourses.map(c => ({ code: c.code, title: c.title })),
  });
}

// ─── Elective Courses ──────────────────────────────────────────────────────

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

export async function handleGetElectiveGroups(_req: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);

  const studentProg = (await db.select({ program_id: studentPrograms.program_id })
    .from(studentPrograms)
    .leftJoin(persons, eq(persons.uid, studentPrograms.uid))
    .leftJoin(users, eq(users.person_id, persons.id))
    .where(and(eq(users.id, userId), eq(studentPrograms.current_flag, 1)))
    .execute())[0];

  if (!studentProg) return error('No active program found.', 404);

  const currentTerm = await getActiveTerm(db);
  if (!currentTerm) return error('No active academic term found.', 404);

  const curriculum = (await db.select({ id: programCurriculum.id })
    .from(programCurriculum)
    .where(and(
      eq(programCurriculum.program_id, studentProg.program_id),
      eq(programCurriculum.term_id, currentTerm.id)
    ))
    .execute())[0];

  if (!curriculum) return error('No curriculum defined for current term.', 404);

  const electives = await db.select({
    id: programCourses.id,
    course_id: programCourses.course_id,
    code: courses.code,
    title: courses.title,
    credits: courses.credits,
    description: courses.description,
    elective_group: programCourses.elective_group,
  })
    .from(programCourses)
    .leftJoin(courses, eq(courses.id, programCourses.course_id))
    .where(and(eq(programCourses.curriculum_id, curriculum.id), eq(programCourses.is_mandatory, 0)))
    .orderBy(programCourses.elective_group, courses.code);

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

export async function handleSubmitElectives(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await typedJson<{ selected_course_ids: string[] }>(req);
  if (!body.selected_course_ids || !Array.isArray(body.selected_course_ids)) {
    return error('selected_course_ids is required.', 400);
  }

  const db = createCoreDb(env);

  const hold = (await db.select({ id: studentHolds.id })
    .from(studentHolds)
    .where(and(
      eq(studentHolds.student_id, userId),
      eq(studentHolds.hold_type, 'course_selection'),
      eq(studentHolds.is_active, 1)
    ))
    .execute())[0];

  if (!hold) return error('Course selection hold is already resolved.', 400);

  const currentTerm = await getActiveTerm(db);
  if (!currentTerm) return error('No active academic term found.', 404);

  let enrolled = 0;
  const errors: string[] = [];

  for (const courseId of body.selected_course_ids) {
    const existing = (await db.select({ id: studentCourseRegistrations.id })
      .from(studentCourseRegistrations)
      .where(and(
        eq(studentCourseRegistrations.student_id, userId),
        eq(studentCourseRegistrations.course_id, courseId),
        eq(studentCourseRegistrations.term_id, currentTerm.id)
      ))
      .execute())[0];

    if (existing) {
      errors.push(`Already registered for course ${courseId}`);
      continue;
    }

    const courseExists = (await db.select({ id: courses.id })
      .from(courses)
      .where(eq(courses.id, courseId))
      .execute())[0];

    if (!courseExists) {
      errors.push(`Course ${courseId} not found.`);
      continue;
    }

    await db.insert(studentCourseRegistrations).values({
      id: crypto.randomUUID(),
      student_id: userId,
      course_id: courseId,
      term_id: currentTerm.id,
      registration_type: 'elective',
      status: 'registered',
    });

    await db.insert(enrollments).values({
      id: crypto.randomUUID(),
      student_id: userId,
      course_id: courseId,
      status: 'enrolled',
    }).onConflictDoNothing();

    enrolled++;
  }

  if (enrolled > 0) {
    await db.update(studentHolds)
      .set({ is_active: 0, resolved_at: new Date() })
      .where(eq(studentHolds.id, hold.id));
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

export async function handleGetRegistrationProgress(_req: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);

  const holds = await db.select({
    id: studentHolds.id,
    hold_type: studentHolds.hold_type,
    reason: studentHolds.reason,
    is_active: studentHolds.is_active,
    created_at: studentHolds.created_at,
    resolved_at: studentHolds.resolved_at,
  })
    .from(studentHolds)
    .where(eq(studentHolds.student_id, userId))
    .orderBy(studentHolds.created_at) as unknown as Hold[];

  const idDoc = (await db.select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.user_id, userId), eq(documents.doc_type, 'id_document')))
    .limit(1)
    .execute())[0];
  const hasUploadedId = !!idDoc;

  const currentTerm = await getActiveTerm(db);

  let hasEnrolledMandatory = false;
  let hasSelectedElectives = false;
  let hasActiveEnrollments = false;

  if (currentTerm) {
    const mandatoryCountRow = (await db.select({ cnt: count() })
      .from(studentCourseRegistrations)
      .where(and(
        eq(studentCourseRegistrations.student_id, userId),
        eq(studentCourseRegistrations.term_id, currentTerm.id),
        eq(studentCourseRegistrations.registration_type, 'auto')
      ))
      .execute())[0];
    hasEnrolledMandatory = (mandatoryCountRow?.cnt || 0) > 0;

    const electiveCountRow = (await db.select({ cnt: count() })
      .from(studentCourseRegistrations)
      .where(and(
        eq(studentCourseRegistrations.student_id, userId),
        eq(studentCourseRegistrations.term_id, currentTerm.id),
        eq(studentCourseRegistrations.registration_type, 'elective')
      ))
      .execute())[0];
    hasSelectedElectives = (electiveCountRow?.cnt || 0) > 0;

    const totalEnrollmentsRow = (await db.select({ cnt: count() })
      .from(studentCourseRegistrations)
      .where(and(
        eq(studentCourseRegistrations.student_id, userId),
        eq(studentCourseRegistrations.term_id, currentTerm.id),
        eq(studentCourseRegistrations.status, 'registered')
      ))
      .execute())[0];
    hasActiveEnrollments = (totalEnrollmentsRow?.cnt || 0) > 0;
  }

  const invoice = (await db.select({ id: invoices.id, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.student_id, userId), eq(invoices.status, 'paid')))
    .limit(1)
    .execute())[0];
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

export async function handleCompleteOrientation(_req: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);

  const hold = (await db.select({ id: studentHolds.id })
    .from(studentHolds)
    .where(and(
      eq(studentHolds.student_id, userId),
      eq(studentHolds.hold_type, 'orientation'),
      eq(studentHolds.is_active, 1)
    ))
    .execute())[0];

  if (!hold) return error('Orientation hold not found or already resolved.', 404);

  await db.update(studentHolds)
    .set({ is_active: 0, resolved_at: new Date(), metadata: '{"completed_via":"online"}' })
    .where(eq(studentHolds.id, hold.id));

  return ok({ message: 'Orientation completed successfully. Course registration is now available.' });
}

// ─── Program Fee Invoice ────────────────────────────────────────────────────

export async function handleGenerateProgramInvoice(_req: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);

  const paymentHold = (await db.select({ id: studentHolds.id })
    .from(studentHolds)
    .where(and(
      eq(studentHolds.student_id, userId),
      eq(studentHolds.hold_type, 'payment'),
      eq(studentHolds.is_active, 1)
    ))
    .execute())[0];

  if (!paymentHold) return error('Payment hold already resolved.', 400);

  const courseSelectionHold = (await db.select({ id: studentHolds.id })
    .from(studentHolds)
    .where(and(
      eq(studentHolds.student_id, userId),
      eq(studentHolds.hold_type, 'course_selection'),
      eq(studentHolds.is_active, 1)
    ))
    .execute())[0];

  if (courseSelectionHold) return error('Complete course registration before generating invoice.', 400);

  const studentProg = (await db.select({
    program_id: studentPrograms.program_id,
    program_name: programs.name,
  })
    .from(studentPrograms)
    .leftJoin(programs, eq(programs.id, studentPrograms.program_id))
    .leftJoin(persons, eq(persons.uid, studentPrograms.uid))
    .leftJoin(users, eq(users.person_id, persons.id))
    .where(and(eq(users.id, userId), eq(studentPrograms.current_flag, 1)))
    .execute())[0];

  if (!studentProg) return error('No active program found.', 404);

  const currentTerm = await getActiveTerm(db);
  if (!currentTerm) return error('No active academic term found.', 404);

  const fee = (await db.select({ id: programFees.id, amount: programFees.amount, description: programFees.description })
    .from(programFees)
    .where(and(
      eq(programFees.program_id, studentProg.program_id),
      eq(programFees.term_id, currentTerm.id)
    ))
    .execute())[0];

  if (!fee) return error('No fee structure defined for this program and term. Contact admin.', 404);

  const existingInvoice = (await db.select({ id: invoices.id, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.student_id, userId), eq(invoices.status, 'unpaid')))
    .execute())[0];

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

  await db.insert(invoices).values({
    id: invoiceId,
    student_id: userId,
    amount: Math.round(fee.amount),
    status: 'unpaid',
    due_date: dueDate,
  });

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

  const db = createCoreDb(env);

  const program = (await db.select({ id: programs.id })
    .from(programs)
    .where(eq(programs.id, program_id))
    .execute())[0];

  if (!program) return error('Program not found.', 404);

  let termsAdded = 0;
  let coursesAdded = 0;

  for (const term of curriculum) {
    const termExists = (await db.select({ id: academicTerms.id })
      .from(academicTerms)
      .where(eq(academicTerms.id, term.term_id))
      .execute())[0];

    if (!termExists) return error(`Academic term ${term.term_id} not found.`, 404);

    const curriculumId = crypto.randomUUID();
    await db.insert(programCurriculum).values({
      id: curriculumId,
      program_id: program_id,
      term_id: term.term_id,
      term_number: term.term_number,
    }).onConflictDoNothing();
    termsAdded++;

    for (const course of term.courses) {
      const courseExists = (await db.select({ id: courses.id })
        .from(courses)
        .where(eq(courses.id, course.course_id))
        .execute())[0];

      if (!courseExists) return error(`Course ${course.course_id} not found.`, 404);

      await db.insert(programCourses).values({
        id: crypto.randomUUID(),
        curriculum_id: curriculumId,
        course_id: course.course_id,
        is_mandatory: course.is_mandatory ? 1 : 0,
        elective_group: course.elective_group || null,
      }).onConflictDoNothing();
      coursesAdded++;
    }
  }

  return ok({ message: 'Curriculum synced successfully', terms_added: termsAdded, courses_added: coursesAdded });
}

export async function handleAdminSetProgramFee(req: Request, env: Env): Promise<Response> {
  const body = await typedJson<{ program_id: string; term_id: string; amount: number; description?: string }>(req);
  const { program_id, term_id, amount, description } = body;

  if (!program_id || !term_id || amount == null) return error('program_id, term_id, and amount are required.', 400);

  const db = createCoreDb(env);
  const feeId = crypto.randomUUID();

  await db.insert(programFees).values({
    id: feeId,
    program_id,
    term_id,
    amount,
    description: description || null,
  }).onConflictDoUpdate({
    target: [programFees.program_id, programFees.term_id],
    set: { amount, description: description || null, updated_at: new Date() },
  });

  return ok({ message: 'Program fee set successfully', fee_id: feeId, amount });
}

export async function handleAdminResolveHold(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await typedJson<{ hold_id?: string; hold_type?: string }>(req);
  const db = createCoreDb(env);

  if (body.hold_id) {
    await db.update(studentHolds)
      .set({ is_active: 0, resolved_at: new Date() })
      .where(eq(studentHolds.id, body.hold_id));
  } else if (body.hold_type) {
    await db.update(studentHolds)
      .set({ is_active: 0, resolved_at: new Date() })
      .where(and(
        eq(studentHolds.student_id, userId),
        eq(studentHolds.hold_type, body.hold_type),
        eq(studentHolds.is_active, 1)
      ));
  } else {
    return error('Provide hold_id or hold_type.', 400);
  }

  return ok({ message: 'Hold resolved.' });
}
