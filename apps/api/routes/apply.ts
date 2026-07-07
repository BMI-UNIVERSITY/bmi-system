import { ok, error, logAdminAction } from '../lib/types';
import { sendEmail, applicationSubmittedEmail, statusUpdateEmail } from '../lib/email';
import type { Env } from '../lib/types';
import { VALID_PROGRAMS } from '../lib/programs';
import { dispatchWebhook } from '../lib/webhook';
import { generateApplicationNumber } from '../lib/app_number';
import { getLifecycleHistory } from '../lib/lifecycle';
import { dispatchPendingJobs } from '../lib/provisioning';
import { parseBody, SubmitApplicationSchema, ApplicationDraftSchema } from '../lib/schemas';
import { executeAdmissionPipelineOptimized, executeWithMonitoring, executeBatch } from '../lib/performance';

function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function handleSubmitApplication(request: Request, env: Env, userId: string, ctx?: ExecutionContext): Promise<Response> {
  const startTime = performance.now();
  
  const parsed = await parseBody(request, SubmitApplicationSchema);
  if (parsed instanceof Response) return parsed;

  const { program, degree_level, personal_statement, prior_education } = parsed;

  if (!VALID_PROGRAMS.includes(program)) {
    return error('Invalid program selected', 400);
  }

  const [existingApp, maxApps, deadline] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status NOT IN (\'rejected\')').bind(userId).first<{count: number}>(),
    env.DB.prepare('SELECT value FROM app_config WHERE key = \'max_applications_per_user\'').first<{value: string}>(),
    env.DB.prepare('SELECT value FROM app_config WHERE key = \'application_deadline\'').first<{value: string}>()
  ]);

  // Fast validation checks
  const existing = existingApp?.count || 0;
  if (existing > 0) {
    return error('You already have an active application. Please contact admissions to submit a new one.', 409);
  }

  const maxAppsConfig = maxApps?.value;
  if (maxAppsConfig) {
    const totalCountResult = await env.DB.prepare('SELECT COUNT(*) as count FROM applications WHERE user_id = ?').bind(userId).first<{count: number}>();
    const totalApps = totalCountResult?.count || 0;

    if (totalApps >= parseInt(maxAppsConfig)) {
      return error(`You have reached the maximum of ${maxAppsConfig} applications allowed per user.`, 403);
    }
  }

  const deadlineConfig = deadline?.value;
  if (deadlineConfig) {
    const deadlineDate = new Date(deadlineConfig);
    if (new Date() > deadlineDate) {
      return error('The application deadline has passed.', 403);
    }
  }

  const appId = crypto.randomUUID();
  const sanitizedStatement = personal_statement ? sanitizeHtml(personal_statement) : null;
  const sanitizedEducation = prior_education ? sanitizeHtml(prior_education) : null;

  // Create application with optimized batch operations
  try {
    await createApplicationWithDependenciesOptimized(env.DB, {
      appId,
      userId,
      program,
      degreeLevel: degree_level,
      personalStatement: sanitizedStatement ?? undefined,
      priorEducation: sanitizedEducation ? JSON.stringify(sanitizedEducation) : undefined
    });
  } catch (e) {
    console.error('Application creation failed:', e);
    return error('Failed to submit application. Please try again.');
  }

  // Delete draft upon successful submission
  if (ctx) {
    ctx.waitUntil(
      executeWithMonitoring(
        env.DB.prepare('DELETE FROM application_drafts WHERE user_id = ?').bind(userId),
        'delete_application_draft'
      ).catch(e => console.error('[draft] Failed to delete draft:', e))
    );
  } else {
    await env.DB.prepare('DELETE FROM application_drafts WHERE user_id = ?').bind(userId).run().catch(() => {});
  }

  // Async operations for non-critical tasks
  let applicationNumber: string | null = null;
  
  if (ctx) {
    // Generate application number asynchronously
    ctx.waitUntil(
      generateAndUpdateApplicationNumber(env.DB, appId)
        .catch(e => console.error('[app_number] Background generation failed:', e))
    );
    
    // Send notification emails asynchronously  
    ctx.waitUntil(
      sendApplicationNotificationsOptimized(env, userId, program, appId)
        .catch(e => console.error('[email] Background notification failed:', e))
    );
  } else {
    // Fallback for non-context execution (testing)
    const year = new Date().getUTCFullYear();
    try {
      applicationNumber = await generateApplicationNumber(env.DB, year);
      await executeWithMonitoring(
        env.DB.prepare('UPDATE applications SET application_number = ? WHERE id = ?').bind(applicationNumber, appId),
        'set_application_number'
      );
    } catch (e) {
      console.error('[app_number] Failed to generate application number:', e);
    }
    
    // Send emails synchronously as fallback
    await sendApplicationNotificationsOptimized(env, userId, program, appId, applicationNumber);
  }

  // Performance tracking
  const duration = performance.now() - startTime;
  if (duration > 800) {
    console.warn(`Slow application submission detected: ${duration}ms for user ${userId}`);
  }

  return ok({ 
    application_id: appId, 
    application_number: applicationNumber || 'PENDING', 
    status: 'submitted',
    _perf: { duration_ms: Math.round(duration) }
  });
}

export async function handleSaveDraft(request: Request, env: Env, userId: string): Promise<Response> {
  const parsed = await parseBody(request, ApplicationDraftSchema);
  if (parsed instanceof Response) return parsed;

  const { current_step, application_data } = parsed;

  // Enforce 60-second cooldown
  const existing = await env.DB.prepare(
    'SELECT updated_at FROM application_drafts WHERE user_id = ?'
  ).bind(userId).first<{ updated_at: string }>();

  if (existing && existing.updated_at) {
    // SQLite datetime is UTC: '2026-07-06 16:22:26'
    // To safely parse in JS, append 'Z'
    const updatedStr = existing.updated_at.replace(' ', 'T') + 'Z';
    const secondsSinceLastUpdate = (Date.now() - new Date(updatedStr).getTime()) / 1000;
    
    if (secondsSinceLastUpdate < 60) {
      return ok({ message: 'Draft saved (cooldown)', throttled: true });
    }
  }

  // Insert or Update the draft
  await executeWithMonitoring(
    env.DB.prepare(`
      INSERT INTO application_drafts (user_id, application_data, current_step, updated_at, created_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET 
        application_data = excluded.application_data,
        current_step = excluded.current_step,
        updated_at = datetime('now')
    `).bind(userId, JSON.stringify(application_data), current_step),
    'save_application_draft'
  );

  return ok({ message: 'Draft saved successfully', throttled: false });
}


// Optimized application creation with enhanced batching
async function createApplicationWithDependenciesOptimized(
  db: D1Database,
  applicationData: {
    appId: string;
    userId: string;
    program: string;
    degreeLevel: string;
    personalStatement?: string;
    priorEducation?: string;
  }
): Promise<string> {
  const { appId, userId, program, degreeLevel, personalStatement, priorEducation } = applicationData;
  
  const operations = [
    // Main application record with optimized fields
    db.prepare(
      `INSERT INTO applications (id, user_id, program, degree_level, status, personal_statement, prior_education, submitted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'submitted', ?, ?, datetime('now'), datetime('now'), datetime('now'))`
    ).bind(appId, userId, program, degreeLevel, personalStatement, priorEducation),
    
    // Initial status log with timestamp
    db.prepare(
      `INSERT INTO application_status_logs (id, application_id, changed_by, old_status, new_status, notes, changed_at)
       VALUES (?, ?, ?, NULL, 'submitted', 'Initial submission', datetime('now'))`
    ).bind(crypto.randomUUID(), appId, userId)
  ];

  const result = await executeBatch(db, operations, 50); // Higher batch size for performance
  
  if (!result.success) {
    const errorDetails = result.failures.map(f => f.error).join(', ');
    throw new Error(`Application creation failed: ${errorDetails}`);
  }

  return appId;
}

// Background application number generation
async function generateAndUpdateApplicationNumber(db: D1Database, appId: string): Promise<void> {
  const year = new Date().getUTCFullYear();
  try {
    const applicationNumber = await generateApplicationNumber(db, year);
    await executeWithMonitoring(
      db.prepare('UPDATE applications SET application_number = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(applicationNumber, appId),
      'background_set_application_number'
    );
  } catch (e) {
    console.error('[app_number] Background generation failed for', appId, ':', e);
    throw e;
  }
}

// Optimized notification email sending
async function sendApplicationNotificationsOptimized(
  env: Env, 
  userId: string, 
  program: string, 
  appId: string, 
  applicationNumber?: string | null
): Promise<void> {
  if (!env.RESEND_API_KEY) return;

  // Get user data with single query
  const userResult = await executeWithMonitoring(
    env.DB.prepare('SELECT email, first_name FROM users WHERE id = ?').bind(userId),
    'get_user_for_notification_email'
  );
  
  const user = userResult.result as any;
  if (!user) return;

  // Prepare email promises for parallel execution
  const emailPromises: Promise<boolean>[] = [];
  
  // User notification email
  emailPromises.push(
    sendEmail(env, {
      to: user.email,
      subject: 'BMI University — Application Received',
      html: applicationSubmittedEmail(user.first_name, program, applicationNumber ?? appId),
    })
  );

  // Admin notification email (if configured)
  if (env.ADMIN_EMAIL) {
    emailPromises.push(
      sendEmail(env, {
        to: env.ADMIN_EMAIL,
        subject: `New Application — ${user.first_name} for ${program}`,
        html: `<p>A new application has been submitted.</p>
               <p><b>Applicant:</b> ${user.first_name} (${user.email})</p>
               <p><b>Program:</b> ${program}</p>
               <p><b>Application Number:</b> ${applicationNumber ?? 'PENDING'}</p>
               <p><b>Application ID:</b> ${appId}</p>`,
      })
    );
  }

  // Send all emails in parallel
  await Promise.allSettled(emailPromises);
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

  const appResult = await executeWithMonitoring(
    env.DB.prepare(
      `SELECT a.id, a.status, a.program, a.user_id, u.email, u.first_name
       FROM applications a JOIN users u ON a.user_id = u.id
       WHERE a.id = ?`
    ).bind(appId),
    'get_application_for_status_update'
  );
  
  const app = appResult.result as any;
  if (!app) return error('Application not found', 404);

  const oldStatus = app.status;
  let pipelineResult: { uid: string | null; registration_number: string | null } | null = null;

  const sanitizedNotes = notes ? notes.replace(/<[^>]*>/g, '').substring(0, 2000) : null;

  // Use batch operations for status update
  const statusUpdateOps = [
    env.DB.prepare(
      `UPDATE applications SET status = ?, reviewer_id = ?, reviewer_notes = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(status, adminId, sanitizedNotes, appId),
    
    env.DB.prepare(
      `INSERT INTO application_status_logs (id, application_id, changed_by, old_status, new_status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), appId, adminId, oldStatus, status, sanitizedNotes)
  ];

  const batchResult = await executeBatch(env.DB, statusUpdateOps);
  if (!batchResult.success) {
    return error('Failed to update application status. Please try again.');
  }

  await logAdminAction(env, adminId, 'update_application_status', 'application', appId, { old_status: oldStatus, new_status: status, notes: sanitizedNotes }, request);

  if (status === 'accepted') {
    await executeWithMonitoring(
      env.DB.prepare(`UPDATE users SET role = 'student', updated_at = datetime('now') WHERE id = ?`).bind(app.user_id),
      'promote_user_to_student'
    );

    // Use optimized admission pipeline in the background
    try {
      if (ctx) {
        ctx.waitUntil((async () => {
          await executeAdmissionPipelineOptimized(env.DB, {
            applicationId: appId,
            userId: app.user_id,
            actorId: adminId,
            program: app.program,
          });
          await dispatchPendingJobs(env);
        })().catch(e => console.error('[lifecycle] Admission pipeline background error:', e)));
      } else {
        const result = await executeAdmissionPipelineOptimized(env.DB, {
          applicationId: appId,
          userId: app.user_id,
          actorId: adminId,
          program: app.program,
        });
        pipelineResult = { uid: result.uid, registration_number: result.regNo };
        await dispatchPendingJobs(env);
      }
    } catch (e) {
      console.error('[lifecycle] Admission pipeline error:', e);
    }
  }

  // Send notification email
  if (env.RESEND_API_KEY) {
    ctx.waitUntil(
      sendEmail(env, {
        to: app.email,
        subject: `BMI University — Application Update`,
        html: statusUpdateEmail(app.first_name, status, app.program),
      })
    );
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
