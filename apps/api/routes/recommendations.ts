import { ok, error } from '../lib/types';
import { sendEmail } from '../lib/email';
import type { Env } from '../lib/types';
import { getPortalUrl } from '../lib/config';
import { createCoreDb } from '../lib/db';
import {
  applications,
  recommendationRequests,
  documents,
  users,
} from '../schema/core';
import { eq, and, count } from 'drizzle-orm';

export async function handleRequestRecommendation(request: Request, env: Env, applicationId: string, userId: string): Promise<Response> {
  const db = createCoreDb(env);

  const app = (await db.select({ id: applications.id, program: applications.program })
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.user_id, userId)))
    .execute())[0];

  if (!app) return error('Application not found or access denied', 404);

  const recCountRow = (await db.select({ count: count() })
    .from(recommendationRequests)
    .where(eq(recommendationRequests.application_id, applicationId))
    .execute())[0];

  if (recCountRow && recCountRow.count >= 3) {
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

  const existingRec = (await db.select({ id: recommendationRequests.id })
    .from(recommendationRequests)
    .where(and(
      eq(recommendationRequests.application_id, applicationId),
      eq(recommendationRequests.referee_email, referee_email.toLowerCase())
    ))
    .execute())[0];

  if (existingRec) {
    return error('A recommendation request has already been sent to this email address', 409);
  }

  const token = crypto.randomUUID();
  const reqId = crypto.randomUUID();

  await db.insert(recommendationRequests).values({
    id: reqId,
    application_id: applicationId,
    referee_name: sanitizedName,
    referee_email: referee_email.toLowerCase(),
    token,
  });

  const applicant = (await db.select({ first_name: users.first_name, last_name: users.last_name })
    .from(users)
    .where(eq(users.id, userId))
    .execute())[0];

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
  const db = createCoreDb(env);

  const rec = (await db.select({
    id: recommendationRequests.id,
    referee_name: recommendationRequests.referee_name,
    status: recommendationRequests.status,
    requested_at: recommendationRequests.requested_at,
    first_name: users.first_name,
    last_name: users.last_name,
    program: applications.program,
  })
    .from(recommendationRequests)
    .leftJoin(applications, eq(applications.id, recommendationRequests.application_id))
    .leftJoin(users, eq(users.id, applications.user_id))
    .where(eq(recommendationRequests.token, token))
    .execute())[0];

  if (!rec) return error('Invalid or expired token', 404);

  const requestedAt = new Date(rec.requested_at as unknown as string);
  const daysSinceRequest = Math.floor((Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceRequest > 30) {
    return error('This recommendation link has expired (30 day limit). Please ask the applicant to send a new request.', 410);
  }

  return ok(rec);
}

export async function handleUploadRecommendation(request: Request, env: Env, token: string): Promise<Response> {
  const db = createCoreDb(env);

  const rec = (await db.select({
    id: recommendationRequests.id,
    application_id: recommendationRequests.application_id,
    user_id: applications.user_id,
    status: recommendationRequests.status,
    requested_at: recommendationRequests.requested_at,
  })
    .from(recommendationRequests)
    .leftJoin(applications, eq(applications.id, recommendationRequests.application_id))
    .where(eq(recommendationRequests.token, token))
    .execute())[0];

  if (!rec) return error('Invalid token', 404);
  if (rec.status === 'submitted') return error('Recommendation already submitted', 400);

  const requestedAt = new Date(rec.requested_at as unknown as string);
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

  const r2Key = `documents/${rec.user_id}/${rec.application_id}/recommendation-${crypto.randomUUID()}.${ext}`;

  await env.DOCUMENTS.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { applicationId: rec.application_id!, docType: 'recommendation' }
  });

  const docId = crypto.randomUUID();

  await db.insert(documents).values({
    id: docId,
    application_id: rec.application_id!,
    user_id: rec.user_id!,
    doc_type: 'recommendation',
    file_name: file.name,
    r2_key: r2Key,
    mime_type: file.type,
    file_size_bytes: file.size,
  });

  await db.update(recommendationRequests)
    .set({ status: 'submitted', document_id: docId, completed_at: new Date() })
    .where(eq(recommendationRequests.id, rec.id));

  const applicant = (await db.select({ email: users.email, first_name: users.first_name })
    .from(users)
    .where(eq(users.id, rec.user_id!))
    .execute())[0];

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
  const db = createCoreDb(env);

  const app = (await db.select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.user_id, userId)))
    .execute())[0];

  if (!app) return error('Not found', 404);

  const recs = await db.select({
    id: recommendationRequests.id,
    referee_name: recommendationRequests.referee_name,
    referee_email: recommendationRequests.referee_email,
    status: recommendationRequests.status,
    requested_at: recommendationRequests.requested_at,
    completed_at: recommendationRequests.completed_at,
  })
    .from(recommendationRequests)
    .where(eq(recommendationRequests.application_id, applicationId))
    .orderBy(recommendationRequests.requested_at);

  return ok(recs);
}
