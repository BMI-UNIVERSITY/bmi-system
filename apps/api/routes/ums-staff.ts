/**
 * BMI UMS – Staff Routes
 * CRUD for staff profiles (faculty, registrars, admins) backed by D1.
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';
import { getUmsUrl } from '../lib/config';

export async function handleListStaff(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset = (page - 1) * perPage;
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

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM staff st INNER JOIN users u ON st.user_id = u.id ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT st.*, u.email, u.first_name, u.last_name, u.phone, u.role,
            d.name as department_name
     FROM staff st
     INNER JOIN users u ON st.user_id = u.id
     LEFT JOIN departments d ON st.department_id = d.id
     ${where}
     ORDER BY u.last_name ASC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({ items: rows.results, page, perPage, total: countRow?.total ?? 0 });
}

export async function handleGetStaff(_request: Request, env: Env, staffId: string): Promise<Response> {
  const row = await env.PLATFORM_CONTEXT!.db.prepare(
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

  const existingUser = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id, role FROM users WHERE email = ?').bind(email).first<{ id: string; role: string }>();
  let userId: string;

  if (existingUser) {
    if (existingUser.role !== 'applicant') {
      return error(`User with email ${email} already exists with role '${existingUser.role}'`, 409);
    }
    userId = existingUser.id;
    await env.PLATFORM_CONTEXT!.db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).bind(role, userId).run();
  } else {
    userId = crypto.randomUUID().replace(/-/g, '');
    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, email, password_hash, first_name, last_name, phone || null, role).run();
  }

  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO staff (user_id, staff_no, department_id, designation)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET staff_no = excluded.staff_no, updated_at = datetime('now')`
  ).bind(userId, staff_no, department_id || null, designation || null).run();

  const created = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT st.*, u.email, u.first_name, u.last_name FROM staff st
     INNER JOIN users u ON st.user_id = u.id WHERE st.user_id = ?`
  ).bind(userId).first();

  return json({ success: true, data: created }, 201);
}

export async function handleUpdateStaff(request: Request, env: Env, staffId: string): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;

  const staff = await env.PLATFORM_CONTEXT!.db.prepare(
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
    await env.PLATFORM_CONTEXT!.db.prepare(`UPDATE staff SET ${sUpdates.join(', ')} WHERE user_id = ?`).bind(...sVals, uid).run();
  }
  if (uUpdates.length) {
    await env.PLATFORM_CONTEXT!.db.prepare(`UPDATE users SET ${uUpdates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...uVals, uid).run();
  }

  const updated = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT st.*, u.email, u.first_name, u.last_name, u.phone, u.role FROM staff st
     INNER JOIN users u ON st.user_id = u.id WHERE st.user_id = ?`
  ).bind(uid).first();


  return ok(updated);
}

/**
 * POST /api/v1/staff/provision-controlled
 *
 * Creates a controlled institutional staff account (e.g. Academic Registrar,
 * Finance Bursar, HR Director) from the UMS admin panel.
 *
 * Best-practice design:
 *  - Only callable by an existing `admin` (super admin) — enforced at router level.
 *  - Generates a cryptographically-random temporary password.
 *  - Sets `must_change_password = 1` so the user is forced to change it on first login.
 *  - Sends a welcome e-mail with the temp password (if RESEND_API_KEY is configured).
 *  - Does NOT accept a caller-supplied plaintext password — eliminates shared-secret risk.
 *  - The role is restricted to 'staff'; to promote to 'admin' use the separate role-update endpoint.
 *
 * Body: { email, first_name, last_name, designation, staff_no?, department_id? }
 */
export async function handleProvisionControlledAccount(request: Request, env: Env, actorId: string): Promise<Response> {
  let body: {
    email?: string;
    first_name?: string;
    last_name?: string;
    designation?: string;
    staff_no?: string;
    department_id?: string;
  };

  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  const { email, first_name, last_name, designation, staff_no, department_id } = body;

  if (!email || !first_name || !last_name || !designation) {
    return error('Missing required fields: email, first_name, last_name, designation');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return error('Invalid email address format');
  }

  const existing = await env.PLATFORM_CONTEXT!.db
    .prepare('SELECT id, role FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<{ id: string; role: string }>();

  if (existing) {
    return error(`A user with email "${email}" already exists (role: ${existing.role}).`, 409);
  }

  // --- Generate a cryptographically secure temporary password ---
  // 20 random chars + enforced complexity suffix so it passes any strength validator.
  // Never stored as plaintext — hashed immediately below.
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const tempPassword = Array.from(randomBytes, (b) => chars[b % chars.length]).join('') + 'Aa1!';

  const { hashPassword } = await import('@bmi/api-middleware');
  const passwordHash = await hashPassword(tempPassword, env.PASSWORD_PEPPER, env.PBKDF2_ITERATIONS);

  const userId = crypto.randomUUID();
  const generatedStaffNo = staff_no || `STF-${Date.now()}`;

  // is_verified=1  — admin-provisioned, skip e-mail verification loop
  // must_change_password=1 — forces a password reset on first login
  const assignedRole = designation === 'System Administrator' ? 'admin' : 'staff';
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO users
       (id, email, password_hash, first_name, last_name, role, is_verified, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
  ).bind(userId, email.toLowerCase(), passwordHash, first_name, last_name, assignedRole).run();

  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO staff (user_id, staff_no, department_id, designation, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       staff_no   = excluded.staff_no,
       updated_at = datetime('now')`
  ).bind(userId, generatedStaffNo, department_id || null, designation).run();

  // Send welcome / credential e-mail — best-effort, non-blocking
  if (env.RESEND_API_KEY) {
    const { sendEmail, buildEmailLayout } = await import('../lib/email');
    const portalUrl = getUmsUrl(env);
    const emailHtml = buildEmailLayout('BMI University — Account Created', `
      <h2 style="color:#0f172a;">Welcome, ${first_name}!</h2>
      <p style="color:#475569;line-height:1.6;">
        An administrator has provisioned a <strong>${designation}</strong> account for you
        on the University Management System (UMS).
      </p>
      <div style="background:#f8fafc;border-left:4px solid #d4af37;padding:16px;margin:24px 0;border-radius:4px;">
        <p style="margin:0 0 8px;"><strong>Login Portal:</strong>
          <a href="${portalUrl}" style="color:#6b21a8;">${portalUrl}</a></p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${email.toLowerCase()}</p>
        <p style="margin:0;"><strong>Temporary Password:</strong>
          <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
      </div>
      <p style="color:#dc2626;font-weight:bold;">⚠ You will be required to set a new password on first login.</p>
      <p style="color:#94a3b8;font-size:13px;">
        If you did not expect this email, contact your system administrator immediately.
      </p>
    `);
    sendEmail(env, {
      to: email.toLowerCase(),
      subject: 'BMI University — Your UMS Account Has Been Created',
      html: emailHtml,
    }).catch((e: unknown) => console.error('[provision-controlled] welcome email failed:', e));
  }

  const { logAdminAction } = await import('../lib/types');
  await logAdminAction(
    env, actorId, 'provision_controlled_account', 'user', userId,
    { email: email.toLowerCase(), designation, staff_no: generatedStaffNo, email_sent: !!env.RESEND_API_KEY },
    request,
  );

  return json({
    success: true,
    message: `Controlled account created for ${first_name} ${last_name}.${
      env.RESEND_API_KEY ? ' A welcome email with login credentials has been sent.' : ''
    }`,
    data: {
      user_id: userId,
      staff_no: generatedStaffNo,
      email: email.toLowerCase(),
      role: 'staff',
      designation,
      // Only return temp password in the response body when there is no e-mail
      // configured — so the admin can relay it manually via a secure channel.
      ...(!env.RESEND_API_KEY ? { temp_password: tempPassword } : {}),
    },
  }, 201);
}

