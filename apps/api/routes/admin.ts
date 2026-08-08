import { ok, error, logAdminAction, typedJson } from '../lib/types';
import { sendEmail } from '../lib/email';
import { getPortalUrl } from '../lib/config';
import type { Env } from '../lib/types';
import { createCoreDb } from '../lib/db';
import { users, passwordResetTokens, adminAuditLogs, emailLogs, contactSubmissions, newsletterSubscribers } from '../schema/core';
import { eq, and, sql, desc, count } from 'drizzle-orm';

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

  const db = createCoreDb(env);

  const existing = (await db.select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1)
    .execute())[0];
  if (existing) {
    return error('An admin already exists. Use the admin panel to promote additional users.', 409);
  }

  const existingUser = (await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email.toLowerCase()))
    .limit(1)
    .execute())[0];
  if (existingUser) {
    return error('A user with this email already exists', 409);
  }

  const { hashPassword } = await import('@bmi/api-middleware');
  const passwordHash = await hashPassword(body.password, env.PASSWORD_PEPPER, env.PBKDF2_ITERATIONS);
  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    email: body.email.toLowerCase(),
    password_hash: passwordHash,
    first_name: body.first_name || 'Admin',
    last_name: body.last_name || 'User',
    role: 'admin',
    is_verified: 1,
  });

  return ok({ message: 'Admin account created successfully.', user_id: userId });
}

export async function handleListUsers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  const db = createCoreDb(env);

  const userList = await db.select({
    id: users.id,
    email: users.email,
    first_name: users.first_name,
    last_name: users.last_name,
    role: users.role,
    is_verified: users.is_verified,
    created_at: users.created_at,
  }).from(users).orderBy(desc(users.created_at)).limit(limit).offset(offset);

  const totalResult = (await db.select({ total: count() }).from(users).execute())[0];

  return ok({ users: userList, total: totalResult?.total ?? 0, limit, offset });
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

  const db = createCoreDb(env);
  const target = (await db.select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetId))
    .execute())[0];

  if (!target) {
    return error('User not found', 404);
  }

  await db.update(users)
    .set({ role: body.role, updated_at: new Date() })
    .where(eq(users.id, targetId));

  await logAdminAction(env, actorId, 'update_user_role', 'user', targetId, { old_role: target.role, new_role: body.role }, request);

  return ok({ message: `User role updated to "${body.role}".` });
}

export async function handleDeleteUser(request: Request, env: Env, actorId: string): Promise<Response> {
  const url = new URL(request.url);
  const targetId = url.pathname.split('/')[4];

  if (targetId === actorId) {
    return error('You cannot delete your own account', 400);
  }

  const db = createCoreDb(env);
  const target = (await db.select({
    id: users.id,
    email: users.email,
    first_name: users.first_name,
    last_name: users.last_name,
    role: users.role,
  }).from(users).where(eq(users.id, targetId)).execute())[0];

  if (!target) {
    return error('User not found', 404);
  }

  if (target.role === 'admin') {
    return error('Admin accounts cannot be deleted. Demote the user first.', 403);
  }

  // Cascade will automatically delete applications, documents, enrollments, sessions
  await db.delete(users).where(eq(users.id, targetId));

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

  const db = createCoreDb(env);
  const target = (await db.select({
    id: users.id,
    email: users.email,
    first_name: users.first_name,
  }).from(users).where(eq(users.id, targetId)).execute())[0];

  if (!target) {
    return error('User not found', 404);
  }

  // Delete any old unused tokens for this user first
  await db.delete(passwordResetTokens)
    .where(and(eq(passwordResetTokens.user_id, targetId), sql`${passwordResetTokens.used_at} IS NULL`));

  const resetToken = crypto.randomUUID();
  await db.insert(passwordResetTokens).values({
    id: crypto.randomUUID(),
    user_id: targetId,
    token: resetToken,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

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

  const db = createCoreDb(env);

  const logsQuery = db.select({
    id: adminAuditLogs.id,
    action: adminAuditLogs.action,
    target_type: adminAuditLogs.target_type,
    target_id: adminAuditLogs.target_id,
    details: adminAuditLogs.details,
    ip_address: adminAuditLogs.ip_address,
    created_at: adminAuditLogs.created_at,
    actor_name: sql<string>`${users.first_name} || ' ' || ${users.last_name}`,
    actor_email: users.email,
    actor_role: users.role,
  })
  .from(adminAuditLogs)
  .leftJoin(users, eq(users.id, adminAuditLogs.user_id));

  if (actionFilter) {
    logsQuery.where(eq(adminAuditLogs.action, actionFilter));
  }

  const logs = await logsQuery.orderBy(desc(adminAuditLogs.created_at)).limit(limit).offset(offset);

  const totalCountQuery = db.select({ total: count() }).from(adminAuditLogs);
  if (actionFilter) {
    totalCountQuery.where(eq(adminAuditLogs.action, actionFilter));
  }
  const totalResult = (await totalCountQuery.execute())[0];

  return ok({ logs, total: totalResult?.total ?? 0, limit, offset });
}

export async function handleBulkEmails(request: Request, env: Env): Promise<Response> {
  const body = await typedJson<{ recipients?: string[]; subject?: string; html?: string }>(request);
  if (!Array.isArray(body.recipients) || !body.subject || !body.html) {
    return error('Invalid payload. Expected { recipients: string[], subject: string, html: string }', 400);
  }

  const { recipients, subject, html } = body;
  
  if (recipients.length > 500) {
    return error('Cannot send more than 500 emails at once', 400);
  }

  const db = createCoreDb(env);
  let enqueued = 0;

  for (const to of recipients) {
    try {
      const logId = crypto.randomUUID();
      await db.insert(emailLogs).values({
        id: logId,
        to_address: to,
        subject: subject,
        status: 'pending',
      });

      await env.PLATFORM_CONTEXT!.queue.send({ to, subject, html, logId });
      enqueued++;
    } catch (e) {
      console.error(`Failed to enqueue email for ${to}:`, e);
    }
  }

  return ok({ message: `Successfully queued ${enqueued}/${recipients.length} emails.` });
}

/** GET /api/admin/contact-submissions — list contact form submissions */
export async function handleListContactSubmissions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'new';
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50'));
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const db = createCoreDb(env);
  const submissionsQuery = db.select({
    id: contactSubmissions.id,
    name: contactSubmissions.name,
    email: contactSubmissions.email,
    subject: contactSubmissions.subject,
    message: contactSubmissions.message,
    status: contactSubmissions.status,
    ip_address: contactSubmissions.ip_address,
    created_at: contactSubmissions.created_at,
  }).from(contactSubmissions);

  if (status !== 'all') {
    submissionsQuery.where(eq(contactSubmissions.status, status));
  }

  const rows = await submissionsQuery.orderBy(desc(contactSubmissions.created_at)).limit(limit).offset(offset);

  return ok({ results: rows, limit, offset });
}

/** GET /api/admin/newsletter-subscribers — list newsletter subscribers */
export async function handleListNewsletterSubscribers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'active';
  const limit = Math.min(500, parseInt(url.searchParams.get('limit') ?? '100'));
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const db = createCoreDb(env);

  const listQuery = db.select({
    id: newsletterSubscribers.id,
    email: newsletterSubscribers.email,
    source: newsletterSubscribers.source,
    status: newsletterSubscribers.status,
    subscribed_at: newsletterSubscribers.subscribed_at,
  }).from(newsletterSubscribers);

  const countQuery = db.select({ n: count() }).from(newsletterSubscribers);

  if (status !== 'all') {
    listQuery.where(eq(newsletterSubscribers.status, status));
    countQuery.where(eq(newsletterSubscribers.status, status));
  }

  const [rows, total] = await Promise.all([
    listQuery.orderBy(desc(newsletterSubscribers.subscribed_at)).limit(limit).offset(offset),
    countQuery.execute(),
  ]);

  return ok({ results: rows, total: total[0]?.n ?? 0, limit, offset });
}
