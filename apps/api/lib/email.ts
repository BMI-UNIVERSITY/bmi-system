import { PORTAL_URL } from '@bmi/shared';

const FROM_ADDRESS = 'BMI University <admissions@hkmministries.org>';
// Brand token cross-reference: colors sourced from @bmi/shared/src/tokens.ts (BrandColors.gold / BrandColors.navy)

import type { Env } from './types';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  logId?: string; // added internally when queuing
}

export async function sendEmail(env: Env, payload: EmailPayload): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  
  try {
    // 1. Insert into email_logs as 'pending'
    const logId = crypto.randomUUID();
    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO email_logs (id, to_address, subject, status) VALUES (?, ?, ?, 'pending')`
    ).bind(logId, payload.to, payload.subject).run();

    // 2. Enqueue the message for background processing
    const queuedPayload = { ...payload, logId };
    await env.PLATFORM_CONTEXT!.queue.send(queuedPayload);

    return true;
  } catch (err) {
    console.error('Failed to enqueue email:', err);
    return false;
  }
}

import type { PlatformContext } from '@bmi/bootstrap';

export async function processEmailDelivery(payload: EmailPayload, ctx: PlatformContext): Promise<boolean> {
  try {
    await ctx.email.sendEmail({
      to: payload.to,
      from: FROM_ADDRESS,
      subject: payload.subject,
      html: payload.html,
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

export function applicationSubmittedEmail(firstName: string, program: string, applicationId: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
      <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #d4af37; margin: 0; font-size: 24px;">BMI University</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0;">Application Received</p>
      </div>
      <div style="background: #fff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a;">Dear ${firstName},</h2>
        <p style="color: #475569; line-height: 1.6;">
          Thank you for submitting your application to <strong>BMI University</strong>. We have received your application for:
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #d4af37; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #0f172a;">${program}</strong>
        </div>
        <p style="color: #475569; line-height: 1.6;">
          <strong>Application Reference:</strong> <code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${applicationId.substring(0, 8).toUpperCase()}</code>
        </p>
        <p style="color: #475569; line-height: 1.6;">
          Our admissions team will review your application and contact you within <strong>5–10 business days</strong>. 
          You can track your application status at any time by logging into your portal.
        </p>
        <div style="margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 8px;">
          <p style="margin: 0 0 8px; color: #475569; font-weight: 600;">Next Steps:</p>
          <ol style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Upload your transcripts and ID documents in the portal</li>
            <li>Request letters of recommendation from your referees</li>
          </ol>
        </div>
        <a href="${PORTAL_URL}/status" 
           style="display: inline-block; background: #d4af37; color: #0f172a; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
          Track Application Status
        </a>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="color: #94a3b8; font-size: 13px;">
          Questions? Email us at <a href="mailto:bmiuniversity8@gmail.com" style="color: #d4af37;">bmiuniversity8@gmail.com</a><br>
          or call us at 704-607-5540
        </p>
      </div>
    </div>
  `;
}

export function statusUpdateEmail(firstName: string, newStatus: string, program: string, notes?: string): string {
  const statusMessages: Record<string, string> = {
    under_review: 'Your application is now under review by our admissions committee.',
    accepted: 'Congratulations! You have been accepted to BMI University. Welcome to the BMI family!',
    rejected: 'After careful review, we are unable to offer you admission at this time.',
    waitlisted: 'You have been placed on our waitlist. We will contact you if a space becomes available.',
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
      <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #d4af37; margin: 0; font-size: 24px;">BMI University</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0;">Application Update</p>
      </div>
      <div style="background: #fff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a;">Dear ${firstName},</h2>
        <p style="color: #475569; line-height: 1.6;">
          There is an update regarding your application for <strong>${program}</strong>:
        </p>
        <p style="color: #0f172a; font-size: 18px; font-weight: bold;">${statusMessages[newStatus] || `Status updated to: ${newStatus.replace('_', ' ')}`}</p>
        ${notes ? `<p style="color: #475569; line-height: 1.6; font-style: italic;">${notes}</p>` : ''}
        <a href="${PORTAL_URL}/status"
           style="display: inline-block; background: #d4af37; color: #0f172a; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
          View Application Status
        </a>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="color: #94a3b8; font-size: 13px;">
          Questions? Email us at <a href="mailto:bmiuniversity8@gmail.com" style="color: #d4af37;">bmiuniversity8@gmail.com</a>
        </p>
      </div>
    </div>
  `;
}
