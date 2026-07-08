import { Env, ok, error, typedJson } from '../lib/types';
import { ExecutionContext } from '@cloudflare/workers-types';

const DEFAULT_EMAIL_DOMAIN = 'student.bmi.edu';

interface ClaimBody {
  admissionCode?: string;
  password?: string;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  email: string;
  [key: string]: unknown;
}

export async function handleClaimAccount(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await typedJson<ClaimBody>(req);
  const { admissionCode, password } = body;
  
  if (!admissionCode || !password) {
    return error('Admission code and password are required', 400);
  }

  try {
    const { results } = await env.PLATFORM_CONTEXT!.db.prepare('SELECT * FROM applications WHERE id = ?').bind(admissionCode).all<ApplicationRow>();
    if (!results || results.length === 0) {
      return error('Invalid admission code', 404);
    }
    const applicant = results[0];
    
    const user = await env.PLATFORM_CONTEXT!.identity.createUser({
      email: applicant.email,
      password: password,
      roles: ['student'],
      metadata: { admissionCode },
    });

    const emailDomain = env.STUDENT_EMAIL_DOMAIN || DEFAULT_EMAIL_DOMAIN;
    const emailPrefix = user.email.split('@')[0];
    await env.PLATFORM_CONTEXT!.email.createMailbox(user.id, `${emailPrefix}@${emailDomain}`, password);

    await env.PLATFORM_CONTEXT!.db.prepare('UPDATE applications SET status = ? WHERE id = ?').bind('enrolled', admissionCode).run();

    return ok({ message: 'Account claimed successfully', user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to claim account';
    console.error(e);
    return error(msg, 500);
  }
}
