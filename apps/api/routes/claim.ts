import { Env, ok, error, typedJson } from '../lib/types';
import { ExecutionContext } from '@cloudflare/workers-types';
import { hashPassword } from '@bmi/api-middleware';
import { validatePasswordStrength, isCommonPassword } from '../lib/jwt';
import { sendEmail, buildEmailLayout } from '../lib/email';
import { createCoreDb } from '../lib/db';
import { users } from '../schema/core';
import { eq, and, gt } from 'drizzle-orm';

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
    const db = createCoreDb(env);
    const user = (await db.select({
      id: users.id,
      first_name: users.first_name,
      email: users.email,
    }).from(users).where(
      and(
        eq(users.admission_code, admissionCode),
        eq(users.account_claimed, 0),
        gt(users.admission_code_expires_at, new Date())
      )
    ).execute())[0];

    if (!user) {
      return error('Invalid or expired admission code, or account already claimed.', 400);
    }

    const hashedPassword = await hashPassword(password, env.PASSWORD_PEPPER, env.PBKDF2_ITERATIONS);

    await db.update(users)
      .set({
        password_hash: hashedPassword,
        account_claimed: 1,
        admission_code: null,
        admission_code_expires_at: null,
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id));

    if (env.RESEND_API_KEY) {
      ctx.waitUntil(sendEmail(env, {
        to: user.email,
        subject: 'Welcome to BMI University — Complete Your Onboarding',
        html: buildEmailLayout('Account Activated', `
          <h2 style="color: #0f172a;">Welcome, ${user.first_name}!</h2>
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
