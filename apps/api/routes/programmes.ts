/**
 * BMI UMS — Programme Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles student programme history queries and programme transfers.
 * 
 * All write operations use env.PLATFORM_CONTEXT!.db.batch() — D1's atomic multi-statement
 * execution. D1 wraps a batch in an implicit transaction: if any statement
 * fails, none of the writes are committed. This is the correct D1-native
 * substitute for PostgreSQL's explicit BEGIN/COMMIT transactions.
 *
 * Routes:
 *   GET  /api/v1/students/:id/programmes         — programme history
 *   POST /api/v1/students/:id/transfer           — atomic programme transfer
 */
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';

// ─── GET /api/v1/students/:studentId/programmes ──────────────────────────────

export async function handleGetStudentProgrammes(
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
    `SELECT sp.*, pr.name as programme_name, pr.code as programme_code,
            pr.degree_type, pr.level
     FROM student_programmes sp
     JOIN programs pr ON sp.programme_id = pr.id
     WHERE sp.uid = ?
     ORDER BY sp.enrollment_date DESC`
  ).bind(student.uid).all();

  return ok(results);
}

// ─── POST /api/v1/students/:studentId/transfer ───────────────────────────────

export async function handleProgrammeTransfer(
  request: Request,
  env: Env,
  studentId: string,
  actorId: string
): Promise<Response> {
  let body: {
    new_programme_id: string;
    admission_year?: number;
    enrollment_date?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { new_programme_id, admission_year, enrollment_date, notes } = body;
  if (!new_programme_id) return error('new_programme_id is required');

  // Verify programme exists
  const programme = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, code, name FROM programs WHERE id = ? AND is_active = 1`
  ).bind(new_programme_id).first<{ id: string; code: string; name: string }>();
  if (!programme) return error('Programme not found or inactive', 404);

  // Resolve student → uid
  const student = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT s.user_id, s.programme_id as current_programme_id, u.person_id, p.uid
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN persons p ON u.person_id = p.id
     WHERE s.user_id = ?`
  ).bind(studentId).first<{
    user_id: string;
    current_programme_id: string | null;
    person_id: string | null;
    uid: string | null;
  }>();

  if (!student) return error('Student not found', 404);
  if (!student.uid) return error('Student has no UID — complete Phase 1 backfill before transferring', 422);

  // Prevent transferring to the same programme
  if (student.current_programme_id === new_programme_id) {
    return error('Student is already enrolled in this programme', 409);
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
   *   1. Deactivate the old student_programmes row (set current_flag = 0, status = 'transferred')
   *   2. Insert the new student_programmes row (current_flag = 1 by default)
   *   3. Update the convenience pointer on students.programme_id
   *   4. Log to admin_audit_logs
   *
   * The partial unique index (WHERE current_flag = 1) enforces only one
   * active programme per student without needing a SELECT-then-INSERT race.
   */
  await env.PLATFORM_CONTEXT!.db.transaction(async (tx) => {
    const ops = [
      // 1. Deactivate current programme history row
      {
        sql: `UPDATE student_programmes
         SET current_flag = 0,
             status = 'transferred',
             completion_date = ?,
             updated_at = ?
         WHERE uid = ? AND current_flag = 1`,
        params: [effectiveDate, now, student.uid]
      },
      // 2. Insert new programme history row
      {
        sql: `INSERT INTO student_programmes
           (id, uid, programme_id, admission_year, enrollment_date, status, current_flag, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)`,
        params: [newRowId, student.uid, new_programme_id, effectiveYear, effectiveDate, now, now]
      },
      // 3. Update convenience pointer on students table
      {
        sql: `UPDATE students SET programme_id = ?, updated_at = ? WHERE user_id = ?`,
        params: [new_programme_id, now, studentId]
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
            from_programme_id: student.current_programme_id,
            to_programme_id: new_programme_id,
            to_programme_code: programme.code,
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
    new_programme_id,
    new_programme_code: programme.code,
    new_student_programme_id: newRowId,
    effective_date: effectiveDate,
  });
}
