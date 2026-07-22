import { Env, ok, error, typedJson } from '../lib/types';
import { ExecutionContext } from '@cloudflare/workers-types';
import { hashPassword } from '@bmi/api-middleware';
import { validatePasswordStrength, isCommonPassword } from '../lib/jwt';
import { sendEmail, buildEmailLayout } from '../lib/email';

interface ClaimBody {
  admissionCode?: string;
  password?: string;
}

export async function handleClaimAccount(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await typedJson<ClaimBody>(req);
  const { admissionCode, password } = body;
  
  if (!admissionCode || !password) {
    return error('Admission code and password are required', 400);
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) return error(strength.errors[0]);
  if (isCommonPassword(password)) return error('This password is too common. Please choose a stronger password.');

  try {
    const user = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT id FROM users WHERE admission_code = ? AND account_claimed = 0 AND admission_code_expires_at > datetime('now')`
    ).bind(admissionCode).first<{ id: string }>();

    if (!user) {
      return error('Invalid or expired admission code, or account already claimed.', 400);
    }

    const hashedPassword = await hashPassword(password, env.PASSWORD_PEPPER, env.PBKDF2_ITERATIONS);

    const userInfo = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT first_name, email FROM users WHERE id = ?`
    ).bind(user.id).first<{ first_name: string; email: string }>();

    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE users SET password_hash = ?, account_claimed = 1, admission_code = NULL, admission_code_expires_at = NULL WHERE id = ?`
    ).bind(hashedPassword, user.id).run();

    const holdTypes = [
      { hold_type: 'document', reason: 'Upload your student ID photo to verify your identity.' },
      { hold_type: 'orientation', reason: 'Complete the online orientation to learn about campus policies and resources.' },
      { hold_type: 'course_selection', reason: 'Complete course registration (mandatory auto-enrollment + elective selection).' },
      { hold_type: 'payment', reason: 'Pay your program tuition and fees to complete registration.' },
    ];

    for (const h of holdTypes) {
      await env.PLATFORM_CONTEXT!.db.prepare(
        `INSERT INTO student_holds (id, student_id, hold_type, reason) VALUES (?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), user.id, h.hold_type, h.reason).run();
    }

    if (userInfo && env.RESEND_API_KEY) {
      ctx.waitUntil(sendEmail(env, {
        to: userInfo.email,
        subject: 'Welcome to BMI University — Complete Your Onboarding',
        html: buildEmailLayout('Account Activated', `
          <h2 style="color: #0f172a;">Welcome, ${userInfo.first_name}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Your account has been successfully claimed. You now have access to the BMI University Student Portal.
          </p>
          <div style="margin: 24px 0; padding: 20px 24px; background: #f8fafc; border-left: 4px solid #d4af37; border-radius: 4px;">
            <p style="margin: 0 0 8px; color: #0f172a; font-weight: 700; font-size: 15px;">Your Registration Steps:</p>
            <ol style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li><strong>Upload ID Photo</strong> — Upload your student ID photo for verification</li>
              <li><strong>Complete Orientation</strong> — Complete the online orientation module</li>
              <li><strong>Course Registration</strong> — Auto-enroll in mandatory courses and select your electives</li>
              <li><strong>Pay Tuition</strong> — Pay your program tuition fee to complete registration</li>
            </ol>
          </div>
          <p style="color: #475569; line-height: 1.6;">
            Log in now at the student portal to begin your onboarding.
          </p>
          <p style="color: #475569; line-height: 1.6;">
            If you have any questions, contact our admissions office at bmiuniversity8@gmail.com or call 704-607-5540.
          </p>
        `),
      }).catch(e => console.error('[claim] Welcome email failed:', e)));
    }

    return ok({ message: 'Account claimed successfully.' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to claim account';
    console.error(e);
    return error(msg, 500);
  }
}
