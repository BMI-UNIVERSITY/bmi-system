import { ok, error, logAdminAction } from '../lib/types';
import { sendEmail, applicationSubmittedEmail, statusUpdateEmail } from '../lib/email';
import type { Env } from '../lib/types';
import { VALID_PROGRAMS, VALID_LEVELS } from '../lib/programs';
import { dispatchWebhook } from '../lib/webhook';
import { generateApplicationNumber } from '../lib/app_number';
import { runAdmissionPipeline, appendLifecycleEvent, getLifecycleHistory, STAGES } from '../lib/lifecycle';
import { dispatchPendingJobs } from '../lib/provisioning';

function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function handleSubmitApplication(request: Request, env: Env, userId: string): Promise<Response> {
  let body: {
    program: string;
    degree_level: string;
    personal_statement?: string;
    prior_education?: string;
  };

  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { program, degree_level, personal_statement, prior_education } = body;

  if (!program || !degree_level) {
    return error('Program and degree level are required');
  }

  if (!VALID_PROGRAMS.includes(program)) {
    return error('Invalid program selected');
  }

  if (!VALID_LEVELS.includes(degree_level as typeof VALID_LEVELS[number])) {
    return error(`Degree level must be one of: ${VALID_LEVELS.join(', ')}`);
  }

  if (personal_statement) {
    if (personal_statement.length > 10000) {
      return error('Personal statement must not exceed 10,000 characters');
    }
  }

  if (prior_education) {
    if (prior_education.length > 5000) {
      return error('Prior education description must not exceed 5,000 characters');
    }
  }

  const existing = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status NOT IN ('rejected')`
  ).bind(userId).first<{ count: number }>();

  if (existing && existing.count > 0) {
    return error('You already have an active application. Please contact admissions to submit a new one.', 409);
  }

  const maxApps = await env.DB.prepare(
    `SELECT value FROM app_config WHERE key = 'max_applications_per_user'`
  ).first<{ value: string }>();

  if (maxApps) {
    const totalCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM applications WHERE user_id = ?`
    ).bind(userId).first<{ count: number }>();

    if (totalCount && totalCount.count >= parseInt(maxApps.value)) {
      return error(`You have reached the maximum of ${maxApps.value} applications. Please contact admissions.`, 403);
    }
  }

  const deadline = await env.DB.prepare(
    `SELECT value FROM app_config WHERE key = 'application_deadline'`
  ).first<{ value: string }>();

  if (deadline && deadline.value) {
    const deadlineDate = new Date(deadline.value);
    if (deadlineDate < new Date()) {
      return error('The application deadline has passed. Please contact admissions for more information.', 403);
    }
  }

  const appId = crypto.randomUUID();
  const sanitizedStatement = personal_statement ? sanitizeHtml(personal_statement) : null;
  const sanitizedEducation = prior_education ? sanitizeHtml(prior_education) : null;

  await env.DB.prepare(
    `INSERT INTO applications (id, user_id, program, degree_level, status, personal_statement, prior_education, submitted_at)
     VALUES (?, ?, ?, ?, 'submitted', ?, ?, datetime('now'))`
  ).bind(appId, userId, program, degree_level, sanitizedStatement, sanitizedEducation ? JSON.stringify(sanitizedEducation) : null).run();

  // Generate a sequential, human-facing Application Number immediately after insertion.
  // Runs as a separate atomic statement — safe under D1 concurrency.
  const year = new Date().getUTCFullYear();
  let applicationNumber: string | null = null;
  try {
    applicationNumber = await generateApplicationNumber(env.DB, year);
    await env.DB.prepare(
      `UPDATE applications SET application_number = ? WHERE id = ?`
    ).bind(applicationNumber, appId).run();
  } catch (e) {
    // Non-fatal: log failure but don't block submission. Ops can backfill from the script.
    console.error('[app_number] Failed to generate application number:', e);
  }

  await env.DB.prepare(
    `INSERT INTO application_status_logs (id, application_id, changed_by, old_status, new_status, notes)
     VALUES (?, ?, ?, NULL, 'submitted', 'Initial submission')`
  ).bind(crypto.randomUUID(), appId, userId).run();

  const user = await env.DB.prepare('SELECT email, first_name FROM users WHERE id = ?').bind(userId)
    .first<{ email: string; first_name: string }>();

  if (user && env.RESEND_API_KEY) {
    await sendEmail({
      to: user.email,
      subject: 'BMI University — Application Received',
      html: applicationSubmittedEmail(user.first_name, program, applicationNumber ?? appId),
    }, env.RESEND_API_KEY);

    if (env.ADMIN_EMAIL) {
      await sendEmail({
        to: env.ADMIN_EMAIL,
        subject: `New Application — ${user.first_name} for ${program}`,
        html: `<p>A new application has been submitted.</p>
               <p><b>Applicant:</b> ${user.first_name} (${user.email})</p>
               <p><b>Program:</b> ${program}</p>
               <p><b>Application Number:</b> ${applicationNumber ?? 'PENDING'}</p>
               <p><b>Application ID:</b> ${appId}</p>`,
      }, env.RESEND_API_KEY);
    }
  }

  return ok({ application_id: appId, application_number: applicationNumber, status: 'submitted' });
}

export async function handleGetMyApplication(request: Request, env: Env, userId: string): Promise<Response> {
  const app = await env.DB.prepare(
    `SELECT a.*, 
       (SELECT json_group_array(json_object('id', d.id, 'doc_type', d.doc_type, 'file_name', d.file_name, 'uploaded_at', d.uploaded_at))
        FROM documents d WHERE d.application_id = a.id) as documents
     FROM applications a WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 1`
  ).bind(userId).first<Record<string, unknown>>();

  if (!app) return error('No application found', 404);

  // D1 json_group_array returns a JSON string — parse it into a real array
  if (typeof app.documents === 'string') {
    try {
      app.documents = JSON.parse(app.documents);
    } catch {
      app.documents = [];
    }
  }
  if (!Array.isArray(app.documents)) app.documents = [];

  return ok(app);
}


export async function handleListApplications(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  let query = `SELECT a.id, a.program, a.degree_level, a.status, a.submitted_at, a.created_at,
                      u.first_name, u.last_name, u.email
               FROM applications a JOIN users u ON a.user_id = u.id`;
  const bindings: unknown[] = [];

  if (status && ['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'].includes(status)) {
    query += ' WHERE a.status = ?';
    bindings.push(status);
  }

  query += ' ORDER BY a.submitted_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...bindings).all();
  return ok(results);
}

export async function handleGetApplication(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const appId = url.pathname.split('/')[4];

  const app = await env.DB.prepare(
    `SELECT a.*, u.first_name, u.last_name, u.email,
       (SELECT json_group_array(json_object('id', d.id, 'doc_type', d.doc_type, 'file_name', d.file_name, 'uploaded_at', d.uploaded_at))
        FROM documents d WHERE d.application_id = a.id) as documents
     FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?`
  ).bind(appId).first<Record<string, unknown>>();

  if (!app) return error('Application not found', 404);

  if (typeof app.documents === 'string') {
    try {
      app.documents = JSON.parse(app.documents);
    } catch {
      app.documents = [];
    }
  }
  if (!Array.isArray(app.documents)) app.documents = [];

  return ok(app);
}

export async function handleUpdateStatus(
  request: Request,
  env: Env,
  appId: string,
  adminId: string,
  ctx: ExecutionContext
): Promise<Response> {
  let body: { status: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { status, notes } = body;
  const validStatuses = ['under_review', 'accepted', 'rejected', 'waitlisted'];
  if (!validStatuses.includes(status)) {
    return error(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  const app = await env.DB.prepare(
    `SELECT a.id, a.status, a.program, a.user_id, u.email, u.first_name
     FROM applications a JOIN users u ON a.user_id = u.id
     WHERE a.id = ?`
  ).bind(appId).first<{ id: string; status: string; program: string; user_id: string; email: string; first_name: string }>();

  if (!app) return error('Application not found', 404);

  const oldStatus = app.status;
  let pipelineResult: { uid: string | null; registration_number: string | null } | null = null;

  const sanitizedNotes = notes ? notes.replace(/<[^>]*>/g, '').substring(0, 2000) : null;

  await env.DB.prepare(
    `UPDATE applications SET status = ?, reviewer_id = ?, reviewer_notes = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
  ).bind(status, adminId, sanitizedNotes, appId).run();

  await env.DB.prepare(
    `INSERT INTO application_status_logs (id, application_id, changed_by, old_status, new_status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), appId, adminId, oldStatus, status, sanitizedNotes).run();

  await logAdminAction(env, adminId, 'update_application_status', 'application', appId, { old_status: oldStatus, new_status: status, notes: sanitizedNotes }, request);

  if (status === 'accepted') {
    await env.DB.prepare(`UPDATE users SET role = 'student', updated_at = datetime('now') WHERE id = ?`)
      .bind(app.user_id).run();

    // ── Trigger the full admission lifecycle pipeline ──────────────────────
    // Non-blocking per step: each stage logs its own success/failure row.
    // ctx.waitUntil is not available here, but pipeline is fast enough for
    // synchronous execution within Worker CPU time budget.
    try {
      const { uid, regNo } = await runAdmissionPipeline(env.DB, {
        applicationId: appId,
        userId: app.user_id,
        actorId: adminId,
        program: app.program,
      });
      // Attach outputs to response for admin visibility
      pipelineResult = { uid, registration_number: regNo };

      // Kick off background processing of provisioning jobs
      ctx.waitUntil(dispatchPendingJobs(env).catch(console.error));
    } catch (e) {
      // Pipeline errors are already logged in lifecycle_events — don't surface to client
      console.error('[lifecycle] Admission pipeline error:', e);
    }
  }

  if (env.RESEND_API_KEY) {
    await sendEmail({
      to: app.email,
      subject: `BMI University — Application Update`,
      html: statusUpdateEmail(app.first_name, status, app.program),
    }, env.RESEND_API_KEY);
  }

  // Fire outbound webhook — non-blocking, errors handled internally
  ctx.waitUntil(
    dispatchWebhook(env, 'application.status_changed', {
      application_id: appId,
      old_status: oldStatus,
      new_status: status,
      program: app.program,
      user_id: app.user_id,
      changed_at: new Date().toISOString(),
    }).catch(() => {})
  );

  return ok({
    application_id: appId,
    old_status: oldStatus,
    new_status: status,
    ...(pipelineResult ? { admission: pipelineResult } : {}),
  });
}

// ─── GET lifecycle history for an application ─────────────────────────────────

export async function handleGetLifecycle(
  _request: Request,
  env: Env,
  appId: string,
  userId: string,
  userRole: string
): Promise<Response> {
  const app = await env.DB.prepare('SELECT id, user_id FROM applications WHERE id = ?')
    .bind(appId).first<{ id: string; user_id: string }>();
  if (!app) return error('Application not found', 404);
  if (userRole !== 'admin' && userRole !== 'staff' && app.user_id !== userId) {
    return error('Access denied', 403);
  }
  const events = await getLifecycleHistory(env.DB, { applicationId: appId });
  return ok(events);
}

export async function handleGetStatusLogs(request: Request, env: Env, appId: string, userId: string, userRole: string): Promise<Response> {
  const app = await env.DB.prepare('SELECT id, user_id FROM applications WHERE id = ?')
    .bind(appId).first<{ id: string; user_id: string }>();

  if (!app) return error('Application not found', 404);

  if (userRole !== 'admin' && userRole !== 'staff' && app.user_id !== userId) {
    return error('Access denied', 403);
  }

  const { results } = await env.DB.prepare(
    `SELECT l.old_status, l.new_status, l.notes, l.changed_at,
            u.first_name as changed_by_name
     FROM application_status_logs l
     LEFT JOIN users u ON l.changed_by = u.id
     WHERE l.application_id = ?
     ORDER BY l.changed_at DESC`
  ).bind(appId).all();

  return ok(results);
}
