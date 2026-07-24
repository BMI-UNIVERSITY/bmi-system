/**
 * BMI UMS – Courses & Programs Routes
 * Backed by Cloudflare D1. Accessible by admin/staff (write), all authenticated (read).
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';
import { generateRegNo } from '../lib/reg_number';

function paginate(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  return { page, perPage, offset: (page - 1) * perPage };
}

// ─── list courses ─────────────────────────────────────────────────────────────

export async function handleListUmsCourses(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);

  const search = url.searchParams.get('search');
  const departmentId = url.searchParams.get('department_id');
  const filters: string[] = [];
  const bindings: unknown[] = [];

  if (search) {
    filters.push(`(c.code LIKE ? OR c.title LIKE ?)`);
    const q = `%${search}%`;
    bindings.push(q, q);
  }
  if (departmentId) { filters.push(`c.department_id = ?`); bindings.push(departmentId); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT COUNT(*) as total FROM courses c ${where}`)
    .bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT c.*, d.name as department_name FROM courses c
     LEFT JOIN departments d ON c.department_id = d.id
     ${where}
     ORDER BY c.code ASC LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({ items: rows.results, page, perPage, total: countRow?.total ?? 0 });
}

// ─── create course ────────────────────────────────────────────────────────────

export async function handleCreateCourse(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const { code, title, description, credits, term, capacity, department_id } = body as Record<string, string>;

  if (!code || !title || !credits || !term || !capacity) {
    return error('Missing required fields: code, title, credits, term, capacity');
  }

  const id = crypto.randomUUID().replace(/-/g, '');
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO courses (id, code, title, description, credits, term, capacity, department_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, code, title, description || null, parseInt(credits), term, parseInt(capacity), department_id || null).run();

  const created = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT * FROM courses WHERE id = ?`).bind(id).first();
  return json({ success: true, data: created }, 201);
}

// ─── update course ────────────────────────────────────────────────────────────

export async function handleUpdateCourse(request: Request, env: Env, courseId: string): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const allowed = ['title', 'description', 'credits', 'term', 'capacity', 'department_id', 'is_active'];
  const updates: string[] = [];
  const vals: unknown[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) { updates.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (!updates.length) return error('No valid fields to update');

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE courses SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...vals, courseId).run();

  const updated = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT * FROM courses WHERE id = ?`).bind(courseId).first();
  if (!updated) return error('Course not found', 404);
  return ok(updated);
}

// ─── delete course ────────────────────────────────────────────────────────────

export async function handleDeleteCourse(_request: Request, env: Env, courseId: string): Promise<Response> {
  const result = await env.PLATFORM_CONTEXT!.db.prepare(`DELETE FROM courses WHERE id = ?`).bind(courseId).run();
  if (!result.meta.changes) return error('Course not found', 404);
  return ok({ deleted: true });
}

// ─── list programs ────────────────────────────────────────────────────────────

export async function handleListPrograms(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT p.*, d.name as department_name, f.name as faculty_name
     FROM programs p
     LEFT JOIN departments d ON p.department_id = d.id
     LEFT JOIN faculties f ON d.faculty_id = f.id
     ORDER BY p.name ASC LIMIT ? OFFSET ?`
  ).bind(perPage, offset).all();

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT COUNT(*) as total FROM programs`).first<{ total: number }>();
  return ok({ items: rows.results, page, perPage, total: countRow?.total ?? 0 });
}

// ─── list faculties ───────────────────────────────────────────────────────────

export async function handleListFaculties(_request: Request, env: Env): Promise<Response> {
  const rows = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT * FROM faculties ORDER BY name ASC`).all();
  return ok(rows.results);
}

// ─── list departments ─────────────────────────────────────────────────────────

export async function handleListDepartments(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const facultyId = url.searchParams.get('faculty_id');

  const query = facultyId
    ? `SELECT * FROM departments WHERE faculty_id = ? ORDER BY name ASC`
    : `SELECT * FROM departments ORDER BY name ASC`;

  const rows = facultyId
    ? await env.PLATFORM_CONTEXT!.db.prepare(query).bind(facultyId).all()
    : await env.PLATFORM_CONTEXT!.db.prepare(query).all();

  return ok(rows.results);
}

// ─── list academic terms ──────────────────────────────────────────────────────

export async function handleListTerms(_request: Request, env: Env): Promise<Response> {
  const rows = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT * FROM academic_terms ORDER BY start_date DESC`).all();
  return ok(rows.results);
}

// ─── enrollments ──────────────────────────────────────────────────────────────

export async function handleListEnrollments(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId');
  const courseId = url.searchParams.get('courseId');

  const filters: string[] = [];
  const bindings: unknown[] = [];

  if (studentId) { filters.push(`e.student_id = ?`); bindings.push(studentId); }
  if (courseId) { filters.push(`e.course_id = ?`); bindings.push(courseId); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT e.*, c.code as course_code, c.title as course_name, c.credits,
            u.first_name, u.last_name, s.reg_no
     FROM enrollments e
     INNER JOIN courses c ON e.course_id = c.id
     INNER JOIN students s ON e.student_id = s.user_id
     INNER JOIN users u ON s.user_id = u.id
     ${where}
     ORDER BY e.enrolled_at DESC`
  ).bind(...bindings).all();

  return ok(rows.results);
}

export async function handleCreateEnrollment(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const { student_id, course_id, term_id } = body as Record<string, string>;

  if (!student_id || !course_id) return error('student_id and course_id are required');

  // ── Resolve student → program → career for RegNo generation ──────────────
  const studentInfo = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT s.user_id, s.program_id, s.reg_no,
            u.person_id, p.uid,
            pr.code as program_code, pr.level as career
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN persons p ON u.person_id = p.id
     LEFT JOIN programs pr ON s.program_id = pr.id
     WHERE s.user_id = ?`
  ).bind(student_id).first<{
    user_id: string;
    program_id: string | null;
    reg_no: string | null;
    person_id: string | null;
    uid: string | null;
    program_code: string | null;
    career: string | null;
  }>();

  if (!studentInfo) return error('Student not found', 404);

  const enrollmentId = crypto.randomUUID().replace(/-/g, '');

  // Determine admission year from the term or fall back to current year
  let admissionYear = new Date().getUTCFullYear();
  if (term_id) {
    const term = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT academic_year FROM academic_terms WHERE id = ?`
    ).bind(term_id).first<{ academic_year: string }>();
    if (term?.academic_year) {
      const parsed = parseInt(term.academic_year.split('/')[0] ?? term.academic_year);
      if (!isNaN(parsed)) admissionYear = parsed;
    }
  }

  // ── Generate Registration Number if student has a program and no reg_no yet ─
  let regNo: string | null = studentInfo.reg_no;
  const batchOps: { sql: string; params: unknown[] }[] = [
    {
      sql: `INSERT INTO enrollments (id, student_id, course_id, term_id) VALUES (?, ?, ?, ?)`,
      params: [enrollmentId, student_id, course_id, term_id || null]
    }
  ];

  if (
    !regNo &&
    studentInfo.program_id &&
    studentInfo.program_code &&
    studentInfo.career &&
    studentInfo.uid
  ) {
    try {
      regNo = await generateRegNo(
        env.PLATFORM_CONTEXT!.db,
        studentInfo.program_id,
        studentInfo.program_code,
        admissionYear,
        studentInfo.career
      );

      batchOps.push({
        sql: `UPDATE students SET reg_no = ?, updated_at = datetime('now')
              WHERE user_id = ? AND (reg_no IS NULL OR reg_no NOT LIKE 'BMI/%')`,
        params: [regNo, student_id]
      });

      batchOps.push({
        sql: `UPDATE student_programs
              SET registration_number = ?, updated_at = datetime('now')
              WHERE uid = ? AND current_flag = 1 AND registration_number IS NULL`,
        params: [regNo, studentInfo.uid]
      });
    } catch (e) {
      console.error('[reg_number] Failed to generate registration number:', e);
      regNo = null;
    }
  }

  // Execute enrollment (+ optional reg_no updates) atomically
  await env.PLATFORM_CONTEXT!.db.transaction(async (tx) => {
    for (const op of batchOps) {
      await tx.prepare(op.sql).bind(...op.params).run();
    }
  });

  const created = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT * FROM enrollments WHERE id = ?`).bind(enrollmentId).first();
  return json({ success: true, data: { ...created, registration_number: regNo } }, 201);
}
