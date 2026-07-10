/**
 * BMI UMS — Program Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles student program history queries and program transfers.
 * 
 * All write operations use env.PLATFORM_CONTEXT!.db.batch() — D1's atomic multi-statement
 * execution. D1 wraps a batch in an implicit transaction: if any statement
 * fails, none of the writes are committed. This is the correct D1-native
 * substitute for PostgreSQL's explicit BEGIN/COMMIT transactions.
 *
 * Routes:
 *   GET  /api/v1/students/:id/programs         — program history
 *   POST /api/v1/students/:id/transfer           — atomic program transfer
 */
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';

// ─── GET /api/v1/students/:studentId/programs ──────────────────────────────

export async function handleGetStudentPrograms(
  _request: Request,
  env: Env,
  studentId: string
): Promise<Response> {
  // Resolve student → uid via persons link
  const student = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT s.user_id, u.person_id, p.uid
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN persons p ON u.person_id = p.id
     WHERE s.user_id = ?`
  ).bind(studentId).first<{ user_id: string; person_id: string | null; uid: string | null }>();

  if (!student) return error('Student not found', 404);
  if (!student.uid) return error('Student has no UID assigned yet — complete Phase 1 backfill first', 422);

  const { results } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT sp.*, pr.name as program_name, pr.code as program_code,
            pr.degree_type, pr.level
     FROM student_programs sp
     JOIN programs pr ON sp.program_id = pr.id
     WHERE sp.uid = ?
     ORDER BY sp.enrollment_date DESC`
  ).bind(student.uid).all();

  return ok(results);
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

  // Verify program exists
  const program = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, code, name FROM programs WHERE id = ? AND is_active = 1`
  ).bind(new_program_id).first<{ id: string; code: string; name: string }>();
  if (!program) return error('Programme not found or inactive', 404);

  // Resolve student → uid
  const student = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT s.user_id, s.program_id as current_program_id, u.person_id, p.uid
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN persons p ON u.person_id = p.id
     WHERE s.user_id = ?`
  ).bind(studentId).first<{
    user_id: string;
    current_program_id: string | null;
    person_id: string | null;
    uid: string | null;
  }>();

  if (!student) return error('Student not found', 404);
  if (!student.uid) return error('Student has no UID — complete Phase 1 backfill before transferring', 422);

  // Prevent transferring to the same program
  if (student.current_program_id === new_program_id) {
    return error('Student is already enrolled in this program', 409);
  }

  const now = new Date().toISOString();
  const effectiveYear = admission_year ?? new Date().getUTCFullYear();
  const effectiveDate = enrollment_date ?? now.split('T')[0];
  const newRowId = crypto.randomUUID().replace(/-/g, '');

  /**
   * Atomic transfer using env.PLATFORM_CONTEXT!.db.batch():
   * D1 executes all statements in a single HTTP request wrapped in an
   * implicit transaction — all succeed or all are rolled back.
   *
   * Order matters:
   *   1. Deactivate the old student_programs row (set current_flag = 0, status = 'transferred')
   *   2. Insert the new student_programs row (current_flag = 1 by default)
   *   3. Update the convenience pointer on students.program_id
   *   4. Log to admin_audit_logs
   *
   * The partial unique index (WHERE current_flag = 1) enforces only one
   * active program per student without needing a SELECT-then-INSERT race.
   */
  await env.PLATFORM_CONTEXT!.db.transaction(async (tx) => {
    const ops = [
      // 1. Deactivate current program history row
      {
        sql: `UPDATE student_programs
         SET current_flag = 0,
             status = 'transferred',
             completion_date = ?,
             updated_at = ?
         WHERE uid = ? AND current_flag = 1`,
        params: [effectiveDate, now, student.uid]
      },
      // 2. Insert new program history row
      {
        sql: `INSERT INTO student_programs
           (id, uid, program_id, admission_year, enrollment_date, status, current_flag, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)`,
        params: [newRowId, student.uid, new_program_id, effectiveYear, effectiveDate, now, now]
      },
      // 3. Update convenience pointer on students table
      {
        sql: `UPDATE students SET program_id = ?, updated_at = ? WHERE user_id = ?`,
        params: [new_program_id, now, studentId]
      },
      // 4. Audit log
      {
        sql: `INSERT INTO admin_audit_logs (id, user_id, action, target_type, target_id, details)
         VALUES (?, ?, 'programme_transfer', 'student', ?, ?)`,
        params: [
          crypto.randomUUID(),
          actorId,
          studentId,
          JSON.stringify({
            from_program_id: student.current_program_id,
            to_program_id: new_program_id,
            to_program_code: program.code,
            notes: notes ?? null,
            effective_date: effectiveDate,
          })
        ]
      }
    ];

    for (const op of ops) {
      await tx.prepare(op.sql).bind(...op.params).run();
    }
  });

  return ok({
    student_id: studentId,
    uid: student.uid,
    new_program_id,
    new_program_code: program.code,
    new_student_program_id: newRowId,
    effective_date: effectiveDate,
  });
}
