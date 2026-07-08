import { ok, error, logAdminAction } from '../lib/types';
import { sendEmail } from '../lib/email';
import { getPortalUrl } from '../lib/config';
import type { Env } from '../lib/types';

export async function handleAdminSetup(request: Request, env: Env): Promise<Response> {
  if (!env.ADMIN_SETUP_KEY) {
    return error('Admin setup is not configured. Set ADMIN_SETUP_KEY as a Cloudflare secret (`npx wrangler secret put ADMIN_SETUP_KEY`) and try again.', 501);
  }

  const setupKey = request.headers.get('X-Admin-Setup-Key');
  if (!setupKey) {
    return error('Unauthorized', 401);
  }
  // Use constant-time comparison to prevent timing oracle attacks.
  const enc = new TextEncoder();
  const a = enc.encode(setupKey);
  const b = enc.encode(env.ADMIN_SETUP_KEY);
  const keysMatch = a.byteLength === b.byteLength &&
    crypto.subtle.timingSafeEqual(a, b);
  if (!keysMatch) {
    return error('Unauthorized', 401);
  }

  let body: { email: string; password: string; first_name?: string; last_name?: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.email || !body.password) {
    return error('Email and password are required');
  }

  const existing = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id FROM users WHERE role = ?').bind('admin').first();
  if (existing) {
    return error('An admin already exists. Use the admin panel to promote additional users.', 409);
  }

  const existingUser = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id FROM users WHERE email = ?').bind(body.email.toLowerCase()).first();
  if (existingUser) {
    return error('A user with this email already exists', 409);
  }

  const { hashPassword } = await import('../lib/jwt');
  const passwordHash = await hashPassword(body.password, env.PASSWORD_PEPPER);
  const userId = crypto.randomUUID();

  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified)
     VALUES (?, ?, ?, ?, ?, 'admin', 1)`
  ).bind(
    userId,
    body.email.toLowerCase(),
    passwordHash,
    body.first_name || 'Admin',
    body.last_name || 'User'
  ).run();

  return ok({ message: 'Admin account created successfully.', user_id: userId });
}

export async function handleListUsers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  const users = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, email, first_name, last_name, role, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const totalResult = await env.PLATFORM_CONTEXT!.db.prepare('SELECT COUNT(*) as total FROM users').first<{ total: number }>();

  return ok({ users: users.results, total: totalResult?.total ?? 0, limit, offset });
}

export async function handleUpdateUserRole(request: Request, env: Env, actorId: string): Promise<Response> {
  const url = new URL(request.url);
  const targetId = url.pathname.split('/')[4];

  if (targetId === actorId) {
    return error('You cannot change your own role', 400);
  }

  let body: { role: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  const validRoles = ['applicant', 'student', 'staff', 'admin'];
  if (!validRoles.includes(body.role)) {
    return error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  const target = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id, role FROM users WHERE id = ?').bind(targetId).first<{ id: string; role: string }>();
  if (!target) {
    return error('User not found', 404);
  }

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(body.role, targetId).run();

  await logAdminAction(env, actorId, 'update_user_role', 'user', targetId, { old_role: target.role, new_role: body.role }, request);

  return ok({ message: `User role updated to "${body.role}".` });
}

export async function handleDeleteUser(request: Request, env: Env, actorId: string): Promise<Response> {
  const url = new URL(request.url);
  const targetId = url.pathname.split('/')[4];

  if (targetId === actorId) {
    return error('You cannot delete your own account', 400);
  }

  const target = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?'
  ).bind(targetId).first<{ id: string; email: string; first_name: string; last_name: string; role: string }>();

  if (!target) {
    return error('User not found', 404);
  }

  if (target.role === 'admin') {
    return error('Admin accounts cannot be deleted. Demote the user first.', 403);
  }

  // Cascade will automatically delete applications, documents, enrollments, sessions
  await env.PLATFORM_CONTEXT!.db.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();

  await logAdminAction(env, actorId, 'delete_user', 'user', targetId, {
    deleted_email: target.email,
    deleted_name: `${target.first_name} ${target.last_name}`,
    deleted_role: target.role,
  }, request);

  return ok({ message: `User "${target.email}" has been permanently deleted.` });
}

export async function handleAdminResetPassword(request: Request, env: Env, actorId: string): Promise<Response> {
  const url = new URL(request.url);
  const targetId = url.pathname.split('/')[4];

  const target = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, email, first_name FROM users WHERE id = ?'
  ).bind(targetId).first<{ id: string; email: string; first_name: string }>();

  if (!target) {
    return error('User not found', 404);
  }

  // Delete any old unused tokens for this user first
  await env.PLATFORM_CONTEXT!.db.prepare(
    'DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL'
  ).bind(targetId).run();

  const resetToken = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
     VALUES (?, ?, ?, datetime('now', '+24 hours'))`
  ).bind(crypto.randomUUID(), targetId, resetToken).run();

  if (env.RESEND_API_KEY) {
    const resetUrl = `${getPortalUrl(env)}/reset-password?token=${resetToken}`;
    await sendEmail(env, {
      to: target.email,
      subject: 'BMI University — Password Reset by Administrator',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
          <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #d4af37; margin: 0; font-size: 24px;">BMI University</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0;">Password Reset</p>
          </div>
          <div style="background: #fff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a;">Hi ${target.first_name},</h2>
            <p style="color: #475569; line-height: 1.6;">
              An administrator has initiated a password reset for your BMI University account.
              Please click the link below to set a new password:
            </p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${resetUrl}"
                 style="display: inline-block; background: #d4af37; color: #0f172a; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">
              Or copy this link into your browser:<br>
              <a href="${resetUrl}" style="color: #d4af37; word-break: break-all;">${resetUrl}</a>
            </p>
            <p style="color: #94a3b8; font-size: 13px;">This link expires in 24 hours.</p>
          </div>
        </div>
      `
    });
  }

  await logAdminAction(env, actorId, 'admin_reset_password', 'user', targetId, {
    target_email: target.email,
    email_sent: !!env.RESEND_API_KEY,
  }, request);

  return ok({ message: `Password reset email sent to ${target.email}.` });
}

export async function handleGetAuditLogs(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
  const actionFilter = url.searchParams.get('action') || null;

  let query = `
    SELECT
      l.id, l.action, l.target_type, l.target_id, l.details,
      l.ip_address, l.created_at,
      u.first_name || ' ' || u.last_name AS actor_name,
      u.email AS actor_email, u.role AS actor_role
    FROM admin_audit_logs l
    LEFT JOIN users u ON u.id = l.user_id
  `;
  const bindings: (string | number)[] = [];

  if (actionFilter) {
    query += ' WHERE l.action = ?';
    bindings.push(actionFilter);
  }

  query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const logs = await env.PLATFORM_CONTEXT!.db.prepare(query).bind(...bindings).all();

  const totalQuery = actionFilter
    ? 'SELECT COUNT(*) as total FROM admin_audit_logs WHERE action = ?'
    : 'SELECT COUNT(*) as total FROM admin_audit_logs';
  const totalResult = await env.PLATFORM_CONTEXT!.db.prepare(totalQuery)
    .bind(...(actionFilter ? [actionFilter] : []))
    .first<{ total: number }>();

  return ok({ logs: logs.results, total: totalResult?.total ?? 0, limit, offset });
}

export async function handleBulkEmails(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  if (!Array.isArray(body.recipients) || !body.subject || !body.html) {
    return error('Invalid payload. Expected { recipients: string[], subject: string, html: string }', 400);
  }

  const { recipients, subject, html } = body;
  
  if (recipients.length > 500) {
    return error('Cannot send more than 500 emails at once', 400);
  }

  let enqueued = 0;
  for (const to of recipients) {
    try {
      const logId = crypto.randomUUID();
      await env.PLATFORM_CONTEXT!.db.prepare(
        `INSERT INTO email_logs (id, to_address, subject, status) VALUES (?, ?, ?, 'pending')`
      ).bind(logId, to, subject).run();

      await env.PLATFORM_CONTEXT!.queue.send({ to, subject, html, logId });
      enqueued++;
    } catch (e) {
      console.error(`Failed to enqueue email for ${to}:`, e);
    }
  }

  return ok({ message: `Successfully queued ${enqueued}/${recipients.length} emails.` });
}
