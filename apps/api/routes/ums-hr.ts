/**
 * BMI UMS — HR Routes
 * Endpoints: /api/v1/hr/leave-requests, /api/v1/hr/payroll
 * All records stored in the same D1 database for referential integrity.
 */
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';

// ── Leave Requests ────────────────────────────────────────────────────────────

export async function handleListLeaveRequests(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const page    = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset  = (page - 1) * perPage;
  const status  = url.searchParams.get('status');
  const staffId = url.searchParams.get('staff_id');

  const filters: string[] = [];
  const bindings: unknown[] = [];

  if (status)  { filters.push('lr.status = ?');   bindings.push(status); }
  if (staffId) { filters.push('lr.staff_id = ?'); bindings.push(staffId); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM leave_requests lr ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT lr.*,
            u.first_name, u.last_name, u.email,
            s.staff_number, d.name as department_name
     FROM leave_requests lr
     JOIN staff s ON lr.staff_id = s.id
     JOIN users u ON s.user_id = u.id
     LEFT JOIN departments d ON s.department_id = d.id
     ${where}
     ORDER BY lr.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({
    data: rows.results,
    meta: { total: countRow?.total ?? 0, page, perPage },
  });
}

export async function handleGetLeaveRequest(_req: Request, env: Env, id: string): Promise<Response> {
  const row = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT lr.*, u.first_name, u.last_name, u.email, s.staff_number
     FROM leave_requests lr
     JOIN staff s ON lr.staff_id = s.id
     JOIN users u ON s.user_id = u.id
     WHERE lr.id = ?`
  ).bind(id).first();
  if (!row) return error('Leave request not found', 404);
  return ok(row);
}

export async function handleCreateLeaveRequest(req: Request, env: Env, _userId: string): Promise<Response> {
  const body = await req.json() as any;
  const { staff_id, type, start_date, end_date, reason } = body;

  if (!staff_id || !start_date || !end_date) {
    return error('staff_id, start_date, and end_date are required', 400);
  }

  const id = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO leave_requests (id, staff_id, type, start_date, end_date, reason)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, staff_id, type || 'Annual', start_date, end_date, reason || null).run();

  return ok({ id, message: 'Leave request submitted' }, 201);
}

export async function handleUpdateLeaveRequest(
  req: Request, env: Env, id: string, reviewerId: string
): Promise<Response> {
  const body = await req.json() as any;
  const { status } = body;

  if (!['approved', 'rejected', 'cancelled'].includes(status)) {
    return error('Invalid status — must be approved, rejected, or cancelled', 400);
  }

  const existing = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM leave_requests WHERE id = ?`
  ).bind(id).first();
  if (!existing) return error('Leave request not found', 404);

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE leave_requests
     SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
  ).bind(status, reviewerId, id).run();

  return ok({ id, status, message: 'Leave request updated' });
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export async function handleListPayroll(req: Request, env: Env): Promise<Response> {
  const url    = new URL(req.url);
  const period = url.searchParams.get('period');
  const page   = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset = (page - 1) * perPage;

  const filters: string[] = [];
  const bindings: unknown[] = [];
  if (period) { filters.push('pr.period = ?'); bindings.push(period); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM payroll_records pr ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT pr.*, u.first_name, u.last_name, u.email, s.staff_number, d.name as department_name
     FROM payroll_records pr
     JOIN staff s ON pr.staff_id = s.id
     JOIN users u ON s.user_id = u.id
     LEFT JOIN departments d ON s.department_id = d.id
     ${where}
     ORDER BY pr.period DESC, u.last_name ASC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({
    data: rows.results,
    meta: { total: countRow?.total ?? 0, page, perPage },
  });
}

export async function handleCreatePayrollRecord(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as any;
  const { staff_id, period, gross, deductions, notes } = body;

  if (!staff_id || !period || gross == null) {
    return error('staff_id, period, and gross are required', 400);
  }

  const net = (gross || 0) - (deductions || 0);
  const id  = crypto.randomUUID();

  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO payroll_records (id, staff_id, period, gross, deductions, net, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, staff_id, period, gross, deductions || 0, net, notes || null).run();

  return ok({ id, net, message: 'Payroll record created' }, 201);
}
