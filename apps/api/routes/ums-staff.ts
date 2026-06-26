/**
 * BMI UMS – Staff Routes
 * CRUD for staff profiles (faculty, registrars, admins) backed by D1.
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';

export async function handleListStaff(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const departmentId = url.searchParams.get('department_id');

  const filters: string[] = [];
  const bindings: unknown[] = [];

  if (search) {
    filters.push(`(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`);
    const q = `%${search}%`;
    bindings.push(q, q, q);
  }
  if (departmentId) { filters.push(`st.department_id = ?`); bindings.push(departmentId); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await env.DB.prepare(
    `SELECT st.*, u.email, u.first_name, u.last_name, u.phone, u.role,
            d.name as department_name
     FROM staff st
     INNER JOIN users u ON st.user_id = u.id
     LEFT JOIN departments d ON st.department_id = d.id
     ${where}
     ORDER BY u.last_name ASC`
  ).bind(...bindings).all();

  return ok(rows.results);
}

export async function handleGetStaff(request: Request, env: Env, staffId: string): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT st.*, u.email, u.first_name, u.last_name, u.phone, u.role,
            d.name as department_name
     FROM staff st
     INNER JOIN users u ON st.user_id = u.id
     LEFT JOIN departments d ON st.department_id = d.id
     WHERE st.user_id = ? OR st.staff_no = ?`
  ).bind(staffId, staffId).first();

  if (!row) return error('Staff member not found', 404);
  return ok(row);
}

export async function handleCreateStaff(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const {
    email, first_name, last_name, phone, password_hash = 'RESET_REQUIRED',
    staff_no, department_id, designation, role = 'staff',
  } = body as Record<string, string>;

  if (!email || !first_name || !last_name || !staff_no) {
    return error('Missing required: email, first_name, last_name, staff_no');
  }

  let existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    await env.DB.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).bind(role, userId).run();
  } else {
    userId = crypto.randomUUID().replace(/-/g, '');
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, email, password_hash, first_name, last_name, phone || null, role).run();
  }

  await env.DB.prepare(
    `INSERT INTO staff (user_id, staff_no, department_id, designation)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET staff_no = excluded.staff_no, updated_at = datetime('now')`
  ).bind(userId, staff_no, department_id || null, designation || null).run();

  const created = await env.DB.prepare(
    `SELECT st.*, u.email, u.first_name, u.last_name FROM staff st
     INNER JOIN users u ON st.user_id = u.id WHERE st.user_id = ?`
  ).bind(userId).first();

  return json({ success: true, data: created }, 201);
}

export async function handleUpdateStaff(request: Request, env: Env, staffId: string): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;

  const staff = await env.DB.prepare(
    `SELECT user_id FROM staff WHERE user_id = ? OR staff_no = ?`
  ).bind(staffId, staffId).first<{ user_id: string }>();
  if (!staff) return error('Staff member not found', 404);

  const uid = staff.user_id;
  const staffFields = ['department_id', 'designation', 'staff_no'];
  const userFields = ['first_name', 'last_name', 'phone', 'role'];

  const sUpdates: string[] = []; const sVals: unknown[] = [];
  const uUpdates: string[] = []; const uVals: unknown[] = [];

  for (const k of staffFields) { if (body[k] !== undefined) { sUpdates.push(`${k} = ?`); sVals.push(body[k]); } }
  for (const k of userFields) { if (body[k] !== undefined) { uUpdates.push(`${k} = ?`); uVals.push(body[k]); } }

  if (sUpdates.length) {
    sUpdates.push(`updated_at = datetime('now')`);
    await env.DB.prepare(`UPDATE staff SET ${sUpdates.join(', ')} WHERE user_id = ?`).bind(...sVals, uid).run();
  }
  if (uUpdates.length) {
    await env.DB.prepare(`UPDATE users SET ${uUpdates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...uVals, uid).run();
  }

  const updated = await env.DB.prepare(
    `SELECT st.*, u.email, u.first_name, u.last_name, u.phone, u.role FROM staff st
     INNER JOIN users u ON st.user_id = u.id WHERE st.user_id = ?`
  ).bind(uid).first();

  return ok(updated);
}
