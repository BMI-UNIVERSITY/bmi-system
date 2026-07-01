/**
 * BMI UMS – Stats & Catalog Routes
 * Computed analytics endpoints + catalog lookups for faculties/departments/programs.
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG (faculties, departments, programs) — used by forms/dropdowns
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleCatalogFaculties(request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(`SELECT id, name, code, description, is_active FROM faculties WHERE is_active=1 ORDER BY name`).all();
  return ok(results);
}

export async function handleCatalogDepartments(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const facultyId = url.searchParams.get('facultyId');
  let query = `SELECT id, name, code, faculty_id, description, is_active FROM departments WHERE is_active=1`;
  const bindings: unknown[] = [];
  if (facultyId) { query += ` AND faculty_id = ?`; bindings.push(facultyId); }
  query += ` ORDER BY name`;
  const { results } = await env.DB.prepare(query).bind(...bindings).all();
  return ok(results);
}

export async function handleCatalogPrograms(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const deptId = url.searchParams.get('deptId') || url.searchParams.get('department_id');
  let query = `SELECT id, name, code, degree_type, level, department_id, duration_years, total_credit_hours, mode_of_study, is_active FROM programs WHERE is_active=1`;
  const bindings: unknown[] = [];
  if (deptId) { query += ` AND department_id = ?`; bindings.push(deptId); }
  query += ` ORDER BY name`;
  const { results } = await env.DB.prepare(query).bind(...bindings).all();
  return ok(results);
}

export async function handleCatalogTerms(request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(`SELECT * FROM academic_terms ORDER BY start_date DESC`).all();
  return ok(results);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS OVERVIEW ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleStudentStatsOverview(request: Request, env: Env): Promise<Response> {
  const total     = (await env.DB.prepare(`SELECT COUNT(*) as c FROM students`).first<{c:number}>())?.c || 0;
  const active    = (await env.DB.prepare(`SELECT COUNT(*) as c FROM students WHERE status='Active'`).first<{c:number}>())?.c || 0;
  const inactive  = (await env.DB.prepare(`SELECT COUNT(*) as c FROM students WHERE status='Inactive'`).first<{c:number}>())?.c || 0;
  const graduated = (await env.DB.prepare(`SELECT COUNT(*) as c FROM students WHERE status='Graduated'`).first<{c:number}>())?.c || 0;
  const applicants= (await env.DB.prepare(`SELECT COUNT(*) as c FROM students WHERE status='Applicant'`).first<{c:number}>())?.c || 0;
  const suspended = (await env.DB.prepare(`SELECT COUNT(*) as c FROM students WHERE status='Suspended'`).first<{c:number}>())?.c || 0;
  const byGender  = await env.DB.prepare(`SELECT gender, COUNT(*) as count FROM students s INNER JOIN users u ON s.user_id=u.id GROUP BY gender`).all();
  return ok({ total, active, inactive, graduated, applicants, suspended, byGender: byGender.results });
}

export async function handleStaffStatsOverview(request: Request, env: Env): Promise<Response> {
  const total = (await env.DB.prepare(`SELECT COUNT(*) as c FROM staff`).first<{c:number}>())?.c || 0;
  const byDept = await env.DB.prepare(`SELECT d.name as department, COUNT(*) as count FROM staff s LEFT JOIN departments d ON s.department_id=d.id GROUP BY s.department_id ORDER BY count DESC LIMIT 10`).all();
  return ok({ total, byDepartment: byDept.results });
}

export async function handleCourseStatsOverview(request: Request, env: Env): Promise<Response> {
  const total      = (await env.DB.prepare(`SELECT COUNT(*) as c FROM courses`).first<{c:number}>())?.c || 0;
  const published  = (await env.DB.prepare(`SELECT COUNT(*) as c FROM courses WHERE status='Published'`).first<{c:number}>())?.c || 0;
  const draft      = (await env.DB.prepare(`SELECT COUNT(*) as c FROM courses WHERE status='Draft'`).first<{c:number}>())?.c || 0;
  const enrollments= (await env.DB.prepare(`SELECT COUNT(*) as c FROM enrollments WHERE status='enrolled'`).first<{c:number}>())?.c || 0;
  return ok({ total, published, draft, enrollments });
}

export async function handleFinanceStats(request: Request, env: Env): Promise<Response> {
  const totalInvoices = (await env.DB.prepare(`SELECT COUNT(*) as c FROM invoices`).first<{c:number}>())?.c || 0;
  const totalRevenue  = (await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM invoices WHERE status='paid'`).first<{s:number}>())?.s || 0;
  const outstanding   = (await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM invoices WHERE status='unpaid'`).first<{s:number}>())?.s || 0;
  const paid          = (await env.DB.prepare(`SELECT COUNT(*) as c FROM invoices WHERE status='paid'`).first<{c:number}>())?.c || 0;
  const unpaid        = (await env.DB.prepare(`SELECT COUNT(*) as c FROM invoices WHERE status='unpaid'`).first<{c:number}>())?.c || 0;
  return ok({ totalInvoices, totalRevenue, outstanding, paid, unpaid });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleVerifyCertificate(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json().catch(() => ({}));
  const serial = body.serial || body.serial_number;
  if (!serial) return error('Serial number is required', 400);
  const cert = await env.DB.prepare(
    `SELECT c.*, u.first_name || ' ' || u.last_name as student_name
     FROM certificates c LEFT JOIN users u ON c.student_id = u.id
     WHERE c.serial_number = ?`
  ).bind(serial).first();
  if (!cert) return ok({ valid: false, error: 'Certificate not found', code: 'NOT_FOUND' });
  // Bump verification count
  await env.DB.prepare(`UPDATE certificates SET verification_count = verification_count + 1, updated_at=datetime('now') WHERE id=?`).bind((cert as any).id).run();
  return ok({
    valid: (cert as any).status === 'ISSUED',
    certificate: {
      serial_number: (cert as any).serial_number,
      student_name: (cert as any).student_name,
      degree_title: (cert as any).degree_title,
      issue_date: (cert as any).issue_date,
      gpa: (cert as any).gpa,
      status: (cert as any).status,
    },
    verification: {
      timestamp: new Date().toISOString(),
      method: body.method || 'online',
      hash_verified: !!body.hash && body.hash === (cert as any).content_hash,
      verification_count: ((cert as any).verification_count || 0) + 1,
    }
  });
}

export async function handleCertificateVerificationStats(request: Request, env: Env): Promise<Response> {
  const total = (await env.DB.prepare(`SELECT COUNT(*) as c FROM certificates`).first<{c:number}>())?.c || 0;
  const issued = (await env.DB.prepare(`SELECT COUNT(*) as c FROM certificates WHERE status='ISSUED'`).first<{c:number}>())?.c || 0;
  const revoked = (await env.DB.prepare(`SELECT COUNT(*) as c FROM certificates WHERE status='REVOKED'`).first<{c:number}>())?.c || 0;
  const totalVerifications = (await env.DB.prepare(`SELECT COALESCE(SUM(verification_count),0) as s FROM certificates`).first<{s:number}>())?.s || 0;
  return ok({ total, issued, revoked, totalVerifications });
}
