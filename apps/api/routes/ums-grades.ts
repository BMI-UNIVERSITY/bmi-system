/**
 * BMI UMS – Grades Routes
 * CRUD for student grades backed by Cloudflare D1.
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';
import { calculateGrade } from '@bmi/shared';

function paginate(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  return { page, perPage, offset: (page - 1) * perPage };
}

// ─── list grades ─────────────────────────────────────────────────────────────

export async function handleListGrades(
  request: Request,
  env: Env,
  callerId: string,
  callerRole: string
): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);

  const filters: string[] = [];
  const bindings: unknown[] = [];

  let studentId = url.searchParams.get('studentId');

  // SECURITY: Students can only ever see their own grades, regardless of what was requested.
  if (callerRole === 'student') {
    studentId = callerId;
  }
  const courseId = url.searchParams.get('courseId');
  const termId = url.searchParams.get('termId');

  if (studentId) {
    filters.push(`e.student_id = (SELECT user_id FROM students WHERE user_id = ? OR reg_no = ? LIMIT 1)`);
    bindings.push(studentId, studentId);
  }
  if (courseId) { filters.push(`e.course_id = ?`); bindings.push(courseId); }
  if (termId) { filters.push(`e.term_id = ?`); bindings.push(termId); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM grades g
     INNER JOIN enrollments e ON g.enrollment_id = e.id
     ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT g.*, e.student_id, e.course_id, e.term_id,
            c.code as course_code, c.title as course_name, c.credits,
            s.reg_no, u.first_name, u.last_name
     FROM grades g
     INNER JOIN enrollments e ON g.enrollment_id = e.id
     INNER JOIN courses c ON e.course_id = c.id
     INNER JOIN students s ON e.student_id = s.user_id
     INNER JOIN users u ON s.user_id = u.id
     ${where}
     ORDER BY g.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  const mappedResults = rows.results.map((r: Record<string, unknown>) => {
    const { letter_grade, grade_point } = calculateGrade(r.score, r.max_score);
    return { ...r, letter_grade, grade_point };
  });

  return ok({
    items: mappedResults,
    page,
    perPage,
    total: countRow?.total ?? 0,
  });
}

// ─── create grade ─────────────────────────────────────────────────────────────

export async function handleCreateGrade(request: Request, env: Env, gradedBy: string): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const { enrollment_id, assessment_type, score, max_score } = body as Record<string, string>;

  if (!enrollment_id || !assessment_type || score == null || max_score == null) {
    return error('Missing required fields: enrollment_id, assessment_type, score, max_score');
  }

  const enrollment = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM enrollments WHERE id = ?`
  ).bind(enrollment_id).first();
  if (!enrollment) return error('Enrollment not found', 404);

  const id = crypto.randomUUID().replace(/-/g, '');
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO grades (id, enrollment_id, assessment_type, score, max_score, graded_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, enrollment_id, assessment_type, parseFloat(String(score)), parseFloat(String(max_score)), gradedBy).run();

  const created = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT * FROM grades WHERE id = ?`).bind(id).first();
  return json({ success: true, data: created }, 201);
}

// ─── update grade ─────────────────────────────────────────────────────────────

export async function handleUpdateGrade(request: Request, env: Env, gradeId: string): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const updates: string[] = [];
  const vals: unknown[] = [];

  if (body.score !== undefined) { updates.push('score = ?'); vals.push(parseFloat(String(body.score))); }
  if (body.max_score !== undefined) { updates.push('max_score = ?'); vals.push(parseFloat(String(body.max_score))); }
  if (body.assessment_type !== undefined) { updates.push('assessment_type = ?'); vals.push(body.assessment_type); }

  if (!updates.length) return error('No valid fields to update');

  updates.push(`updated_at = datetime('now')`);
  const result = await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE grades SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...vals, gradeId).run();

  if (!result.meta.changes) return error('Grade not found', 404);

  const updated = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT * FROM grades WHERE id = ?`).bind(gradeId).first();
  return ok(updated);
}
