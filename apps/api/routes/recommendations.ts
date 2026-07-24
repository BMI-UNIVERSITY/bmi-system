import { ok, error } from '../lib/types';
import { sendEmail } from '../lib/email';
import type { Env } from '../lib/types';
import { getPortalUrl } from '../lib/config';

export async function handleRequestRecommendation(request: Request, env: Env, applicationId: string, userId: string): Promise<Response> {
  const app = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id, program FROM applications WHERE id = ? AND user_id = ?')
    .bind(applicationId, userId).first<{ id: string; program: string }>();

  if (!app) return error('Application not found or access denied', 404);

  const recCount = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT COUNT(*) as count FROM recommendation_requests WHERE application_id = ?'
  ).bind(applicationId).first<{ count: number }>();

  if (recCount && recCount.count >= 3) {
    return error('Maximum of 3 recommendation requests per application', 400);
  }

  let body: { referee_name: string; referee_email: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON');
  }

  const { referee_name, referee_email } = body;
  if (!referee_name || !referee_email) return error('Referee name and email required');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(referee_email)) return error('Invalid referee email address');

  const sanitizedName = referee_name.replace(/<[^>]*>/g, '').substring(0, 200);

  const existingRec = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id FROM recommendation_requests WHERE application_id = ? AND referee_email = ?'
  ).bind(applicationId, referee_email.toLowerCase()).first();

  if (existingRec) {
    return error('A recommendation request has already been sent to this email address', 409);
  }

  const token = crypto.randomUUID();
  const reqId = crypto.randomUUID();

  await env.PLATFORM_CONTEXT!.db.prepare(`
    INSERT INTO recommendation_requests (id, application_id, referee_name, referee_email, token)
    VALUES (?, ?, ?, ?, ?)
  `).bind(reqId, applicationId, sanitizedName, referee_email.toLowerCase(), token).run();

  const applicant = await env.PLATFORM_CONTEXT!.db.prepare('SELECT first_name, last_name FROM users WHERE id = ?')
    .bind(userId).first<{ first_name: string; last_name: string }>();

  if (env.RESEND_API_KEY && applicant) {
    const baseUrl = getPortalUrl(env);
    const uploadUrl = `${baseUrl}/recommend/${token}`;
    const { buildEmailLayout } = await import('../lib/email');
    await sendEmail(env, {
      to: referee_email,
      subject: `Recommendation Request for ${applicant.first_name} ${applicant.last_name}`,
      html: buildEmailLayout(
        'Recommendation Request',
        `
        <h2 style="color: #0f172a;">Dear ${sanitizedName},</h2>
        <p style="color: #475569; line-height: 1.6;">
          <strong>${applicant.first_name} ${applicant.last_name}</strong> has applied to the <strong>${app.program}</strong> program at BMI University and has requested a letter of recommendation from you.
        </p>
        <p style="color: #475569; line-height: 1.6;">
          Please use the secure link below to upload your recommendation letter. This link is unique to you and will expire after 30 days.
        </p>
        <a href="${uploadUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">Upload Recommendation Letter</a>
        <p style="color: #475569; line-height: 1.6; font-size: 13px;">Or copy this link: <a href="${uploadUrl}" style="color:#d4af37;">${uploadUrl}</a></p>
        `
      )
    });
  }

  return ok({ id: reqId, status: 'requested' });
}

export async function handleGetRecommendationInfo(_request: Request, env: Env, token: string): Promise<Response> {
  const req = await env.PLATFORM_CONTEXT!.db.prepare(`
    SELECT r.id, r.referee_name, r.status, r.requested_at,
           u.first_name, u.last_name, a.program
    FROM recommendation_requests r
    JOIN applications a ON r.application_id = a.id
    JOIN users u ON a.user_id = u.id
    WHERE r.token = ?
  `).bind(token).first();

  if (!req) return error('Invalid or expired token', 404);

  const data = req as { requested_at: string };
  const requestedAt = new Date(data.requested_at);
  const now = new Date();
  const daysSinceRequest = Math.floor((now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceRequest > 30) {
    return error('This recommendation link has expired (30 day limit). Please ask the applicant to send a new request.', 410);
  }

  return ok(req);
}

export async function handleUploadRecommendation(request: Request, env: Env, token: string): Promise<Response> {
  const req = await env.PLATFORM_CONTEXT!.db.prepare(`
    SELECT r.id, r.application_id, a.user_id, r.status, r.requested_at
    FROM recommendation_requests r
    JOIN applications a ON r.application_id = a.id
    WHERE r.token = ?
  `).bind(token).first<{ id: string; application_id: string; user_id: string; status: string; requested_at: string }>();

  if (!req) return error('Invalid token', 404);
  if (req.status === 'submitted') return error('Recommendation already submitted', 400);

  const requestedAt = new Date(req.requested_at);
  const daysSinceRequest = Math.floor((Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceRequest > 30) {
    return error('This recommendation link has expired. Please ask the applicant to send a new request.', 410);
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) return error('No file provided');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  if (!['pdf', 'doc', 'docx'].includes(ext)) {
    return error('Only PDF and Word documents are accepted for recommendations');
  }

  const r2Key = `documents/${req.user_id}/${req.application_id}/recommendation-${crypto.randomUUID()}.${ext}`;

  await env.DOCUMENTS.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { applicationId: req.application_id, docType: 'recommendation' }
  });

  const docId = crypto.randomUUID();

  await env.PLATFORM_CONTEXT!.db.prepare(`
    INSERT INTO documents (id, application_id, user_id, doc_type, file_name, r2_key, mime_type, file_size_bytes)
    VALUES (?, ?, ?, 'recommendation', ?, ?, ?, ?)
  `).bind(docId, req.application_id, req.user_id, file.name, r2Key, file.type, file.size).run();

  await env.PLATFORM_CONTEXT!.db.prepare(`
    UPDATE recommendation_requests 
    SET status = 'submitted', document_id = ?, completed_at = datetime('now')
    WHERE id = ?
  `).bind(docId, req.id).run();

  const applicant = await env.PLATFORM_CONTEXT!.db.prepare('SELECT email, first_name FROM users WHERE id = ?')
    .bind(req.user_id).first<{ email: string; first_name: string }>();

  if (applicant && env.RESEND_API_KEY) {
    const { buildEmailLayout } = await import('../lib/email');
    await sendEmail(env, {
      to: applicant.email,
      subject: 'BMI University — Recommendation Received',
      html: buildEmailLayout(
        'Recommendation Received',
        `
        <h2 style="color: #0f172a;">Dear ${applicant.first_name},</h2>
        <p style="color: #475569; line-height: 1.6;">
          A recommendation letter has been received and added to your application.
        </p>
        <a href="${getPortalUrl(env)}/status" style="display:inline-block;padding:12px 24px;background:#d4af37;color:#0f172a;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">View Application Status</a>
        `
      )
    });
  }

  return ok({ success: true });
}

export async function handleListRecommendations(_request: Request, env: Env, applicationId: string, userId: string): Promise<Response> {
  const app = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id FROM applications WHERE id = ? AND user_id = ?')
    .bind(applicationId, userId).first();

  if (!app) return error('Not found', 404);

  const { results } = await env.PLATFORM_CONTEXT!.db.prepare(`
    SELECT id, referee_name, referee_email, status, requested_at, completed_at
    FROM recommendation_requests
    WHERE application_id = ?
    ORDER BY requested_at DESC
  `).bind(applicationId).all();

  return ok(results);
}
