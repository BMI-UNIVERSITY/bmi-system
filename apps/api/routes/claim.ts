import { Env, ok, error, typedJson } from '../lib/types';
import { ExecutionContext } from '@cloudflare/workers-types';
import { validatePasswordStrength, isCommonPassword, hashPassword } from './auth';

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
  if (!strength.valid) return error(strength.errors.join('; '));
  if (isCommonPassword(password)) return error('This password is too common. Please choose a stronger password.');

  try {
    const user = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT id FROM users WHERE admission_code = ? AND account_claimed = 0 AND admission_code_expires_at > datetime('now')`
    ).bind(admissionCode).first<{ id: string }>();

    if (!user) {
      return error('Invalid or expired admission code, or account already claimed.', 400);
    }

    const hashedPassword = await hashPassword(password);

    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE users SET password_hash = ?, account_claimed = 1, admission_code = NULL, admission_code_expires_at = NULL WHERE id = ?`
    ).bind(hashedPassword, user.id).run();

    return ok({ message: 'Account claimed successfully.' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to claim account';
    console.error(e);
    return error(msg, 500);
  }
}
