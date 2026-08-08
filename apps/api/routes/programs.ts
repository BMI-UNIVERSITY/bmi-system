/**
 * BMI UMS — Program Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles student program history queries and program transfers.
 *
 * All write operations use db.transaction() — Drizzle's atomic multi-statement
 * execution. If any statement fails, none of the writes are committed.
 *
 * Routes:
 *   GET  /api/v1/students/:id/programs         — program history
 *   POST /api/v1/students/:id/transfer           — atomic program transfer
 */
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';
import { createCoreDb } from '../lib/db';
import {
  programs,
  studentPrograms,
  adminAuditLogs,
} from '../schema/core';
import { students } from '../schema/academic';
import { eq, and } from 'drizzle-orm';

// ─── GET /api/v1/students/:studentId/programs ──────────────────────────────

export async function handleGetStudentPrograms(
  _request: Request,
  env: Env,
  studentId: string
): Promise<Response> {
  const db = createCoreDb(env);

  // Resolve student → uid via persons link
  const student = (await db.select({
    user_id: students.user_id,
    uid: students.uid,
  })
    .from(students)
    .where(eq(students.user_id, studentId))
    .execute())[0];

  if (!student) return error('Student not found', 404);
  if (!student.uid) return error('Student has no UID assigned yet — complete Phase 1 backfill first', 422);

  const history = await db.select({
    id: studentPrograms.id,
    uid: studentPrograms.uid,
    program_id: studentPrograms.program_id,
    admission_year: studentPrograms.admission_year,
    enrollment_date: studentPrograms.enrollment_date,
    completion_date: studentPrograms.completion_date,
    status: studentPrograms.status,
    current_flag: studentPrograms.current_flag,
    cgpa: studentPrograms.cgpa,
    classification: studentPrograms.classification,
    created_at: studentPrograms.created_at,
    updated_at: studentPrograms.updated_at,
    program_name: programs.name,
    program_code: programs.code,
    degree_type: programs.degree_type,
    level: programs.level,
  })
    .from(studentPrograms)
    .leftJoin(programs, eq(programs.id, studentPrograms.program_id))
    .where(eq(studentPrograms.uid, student.uid))
    .orderBy(studentPrograms.enrollment_date);

  return ok(history);
}

// ─── POST /api/v1/students/:studentId/transfer ───────────────────────────────

export async function handleProgramTransfer(
  request: Request,
  env: Env,
  studentId: string,
  actorId: string
): Promise<Response> {
  let body: {
    new_program_id: string;
    admission_year?: number;
    enrollment_date?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { new_program_id, admission_year, enrollment_date, notes } = body;
  if (!new_program_id) return error('new_program_id is required');

  const db = createCoreDb(env);

  // Verify program exists
  const program = (await db.select({ id: programs.id, code: programs.code, name: programs.name })
    .from(programs)
    .where(and(eq(programs.id, new_program_id), eq(programs.is_active, 1)))
    .execute())[0];
  if (!program) return error('Programme not found or inactive', 404);

  // Resolve student → uid
  const student = (await db.select({
    user_id: students.user_id,
    program_id: students.program_id,
    uid: students.uid,
  })
    .from(students)
    .where(eq(students.user_id, studentId))
    .execute())[0];

  if (!student) return error('Student not found', 404);
  if (!student.uid) return error('Student has no UID — complete Phase 1 backfill before transferring', 422);

  // Prevent transferring to the same program
  if (student.program_id === new_program_id) {
    return error('Student is already enrolled in this program', 409);
  }

  const now = new Date();
  const effectiveYear = admission_year ?? now.getUTCFullYear();
  const effectiveDate = enrollment_date ? new Date(enrollment_date) : now;
  const newRowId = crypto.randomUUID().replace(/-/g, '');

  await db.transaction(async (tx) => {
    // 1. Deactivate current program history row
    await tx.update(studentPrograms)
      .set({ current_flag: 0, status: 'transferred', completion_date: effectiveDate, updated_at: now })
      .where(and(eq(studentPrograms.uid, student.uid!), eq(studentPrograms.current_flag, 1)));

    // 2. Insert new program history row
    await tx.insert(studentPrograms).values({
      id: newRowId,
      uid: student.uid!,
      program_id: new_program_id,
      admission_year: effectiveYear,
      enrollment_date: effectiveDate,
      status: 'active',
      current_flag: 1,
      created_at: now,
      updated_at: now,
    });

    // 3. Update convenience pointer on students table
    await tx.update(students)
      .set({ program_id: new_program_id, updated_at: now })
      .where(eq(students.user_id, studentId));

    // 4. Audit log
    await tx.insert(adminAuditLogs).values({
      id: crypto.randomUUID(),
      user_id: actorId,
      action: 'programme_transfer',
      target_type: 'student',
      target_id: studentId,
      details: JSON.stringify({
        from_program_id: student.program_id,
        to_program_id: new_program_id,
        to_program_code: program.code,
        notes: notes ?? null,
        effective_date: effectiveDate.toISOString().split('T')[0],
      }),
    });
  });

  return ok({
    student_id: studentId,
    uid: student.uid,
    new_program_id,
    new_program_code: program.code,
    new_student_program_id: newRowId,
    effective_date: effectiveDate.toISOString().split('T')[0],
  });
}
