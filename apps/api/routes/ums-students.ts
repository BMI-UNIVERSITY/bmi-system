/**
 * BMI UMS – Student Routes
 * CRUD for student profiles backed by Cloudflare D1.
 * Accessible by: admin, staff (list/read), student (own record only)
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';
import { parseBody, CreateStudentSchema, UpdateStudentSchema } from '../lib/schemas';

// ─── helpers ────────────────────────────────────────────────────────────────

function buildId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function paginate(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  return { page, perPage, offset: (page - 1) * perPage };
}

// ─── list students ───────────────────────────────────────────────────────────

export async function handleListStudents(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);

  const filters: string[] = [];
  const bindings: unknown[] = [];

  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');
  const program = url.searchParams.get('program');
  const campusId = url.searchParams.get('study_center_id');
  const faculty = url.searchParams.get('faculty');

  if (search) {
    filters.push(`(u.first_name LIKE ? OR u.last_name LIKE ? OR s.reg_no LIKE ? OR u.email LIKE ?)`);
    const q = `%${search}%`;
    bindings.push(q, q, q, q);
  }
  if (status) { filters.push(`s.status = ?`); bindings.push(status); }
  if (program) { filters.push(`s.program LIKE ?`); bindings.push(`%${program}%`); }
  if (campusId) { filters.push(`s.study_center_id = ?`); bindings.push(campusId); }
  if (faculty) { filters.push(`s.program LIKE ?`); bindings.push(`%${faculty}%`); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM students s INNER JOIN users u ON s.user_id = u.id ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT s.user_id as id, s.*, u.email, u.first_name, u.last_name, u.phone, u.role
     FROM students s
     INNER JOIN users u ON s.user_id = u.id
     ${where}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({
    items: rows.results,
    page,
    perPage,
    total: countRow?.total ?? 0,
  });
}

// ─── get single student ──────────────────────────────────────────────────────

export async function handleGetStudent(
  request: Request,
  env: Env,
  studentId: string,
  callerId: string,
  callerRole: string,
): Promise<Response> {
  // SECURITY: students may only read their own profile.
  if (callerRole === 'student') {
    const owner = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT user_id FROM students WHERE user_id = ? OR reg_no = ? LIMIT 1`
    ).bind(studentId, studentId).first<{ user_id: string }>();
    if (!owner || owner.user_id !== callerId) {
      return error('Forbidden', 403);
    }
  }

  const row = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT s.user_id as id, s.*, u.email, u.first_name, u.last_name, u.phone, u.role
     FROM students s
     INNER JOIN users u ON s.user_id = u.id
     WHERE s.user_id = ? OR s.reg_no = ?`
  ).bind(studentId, studentId).first();

  if (!row) return error('Student not found', 404);
  return ok(row);
}


// ─── create student ──────────────────────────────────────────────────────────

export async function handleCreateStudent(request: Request, env: Env): Promise<Response> {
  const parsed = await parseBody(request, CreateStudentSchema);
  if (parsed instanceof Response) return parsed;

  const {
    email, first_name, last_name, phone, password_hash,
    reg_no, gender, date_of_birth, nationality, admission_date, program,
    status, avatar_color, study_center_id,
    gpa, year_of_study, degree_level,
  } = parsed;

  // Check if user exists already
  const existingUser = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    userId = buildId();
    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, 'student')`
    ).bind(userId, email, password_hash, first_name, last_name, phone || null).run();
  }

  // Upsert student profile
  const studentId = buildId(); // Generate stable student_id
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO students (user_id, student_id, reg_no, gender, date_of_birth, nationality, admission_date,
       program, status, avatar_color, study_center_id, gpa, year_of_study, degree_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       reg_no = excluded.reg_no, updated_at = datetime('now')`
  ).bind(
    userId, studentId, reg_no, gender || null, date_of_birth || null, nationality || null,
    admission_date, program, status, avatar_color, study_center_id || null,
    gpa || null, year_of_study || null, degree_level || null
  ).run();

  const created = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT s.user_id as id, s.*, u.email, u.first_name, u.last_name, u.phone FROM students s
     INNER JOIN users u ON s.user_id = u.id WHERE s.user_id = ?`
  ).bind(userId).first();

  return json({ success: true, data: created }, 201);
}

// ─── update student ──────────────────────────────────────────────────────────

export async function handleUpdateStudent(request: Request, env: Env, studentId: string): Promise<Response> {
  const body = await parseBody(request, UpdateStudentSchema);
  if (body instanceof Response) return body;

  // Find student
  const student = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT user_id FROM students WHERE user_id = ? OR reg_no = ?`
  ).bind(studentId, studentId).first<{ user_id: string }>();
  if (!student) return error('Student not found', 404);

  const uid = student.user_id;
  const allowed = ['gender','date_of_birth','nationality','admission_date','program',
    'status','avatar_color','study_center_id','gpa','year_of_study','degree_level','graduation_date'];

  const bodyRecord = body as unknown as Record<string, unknown>;
  const updates: string[] = [];
  const vals: unknown[] = [];
  for (const key of allowed) {
    if (bodyRecord[key] !== undefined) { updates.push(`${key} = ?`); vals.push(bodyRecord[key]); }
  }

  // Also update users table fields
  const userFields = ['first_name','last_name','phone'];
  const userUpdates: string[] = [];
  const userVals: unknown[] = [];
  for (const f of userFields) {
    if (bodyRecord[f] !== undefined) { userUpdates.push(`${f} = ?`); userVals.push(bodyRecord[f]); }
  }

  if (updates.length) {
    updates.push(`updated_at = datetime('now')`);
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE students SET ${updates.join(', ')} WHERE user_id = ?`
    ).bind(...vals, uid).run();
  }
  if (userUpdates.length) {
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE users SET ${userUpdates.join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).bind(...userVals, uid).run();
  }

  const updated = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT s.user_id as id, s.*, u.email, u.first_name, u.last_name, u.phone FROM students s
     INNER JOIN users u ON s.user_id = u.id WHERE s.user_id = ?`
  ).bind(uid).first();

  return ok(updated);
}

// ─── delete student ──────────────────────────────────────────────────────────

export async function handleDeleteStudent(request: Request, env: Env, studentId: string): Promise<Response> {
  const student = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT user_id FROM students WHERE user_id = ? OR reg_no = ?`
  ).bind(studentId, studentId).first<{ user_id: string }>();
  if (!student) return error('Student not found', 404);

  // Cascades to students table automatically (ON DELETE CASCADE)
  await env.PLATFORM_CONTEXT!.db.prepare(`DELETE FROM users WHERE id = ?`).bind(student.user_id).run();
  return ok({ deleted: true });
}
