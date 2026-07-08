import { Env, ok, error } from '../lib/types';
import { ExecutionContext } from '@cloudflare/workers-types';

export async function handleClaimAccount(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await req.json() as any;
  const { admissionCode, password } = body;
  
  if (!admissionCode || !password) {
    return error('Admission code and password are required', 400);
  }

  try {
    // 1. Verify admission code with DB (mocked here for simplicity)
    const { results } = await env.PLATFORM_CONTEXT!.db.prepare('SELECT * FROM applications WHERE id = ?').bind(admissionCode).all();
    if (!results || results.length === 0) {
      return error('Invalid admission code', 404);
    }
    const applicant = results[0] as any;
    
    // 2. Create user in Identity Provider
    const user = await env.PLATFORM_CONTEXT!.identity.createUser({
      email: applicant.email,
      password: password,
      roles: ['student'],
      metadata: { admissionCode },
    });

    // 3. Provision Institutional Email
    const emailDomain = 'student.bmi.edu';
    const emailPrefix = user.email.split('@')[0];
    await (env.PLATFORM_CONTEXT!.email as any).createMailbox?.(emailDomain, emailPrefix, applicant.first_name, password);

    // 4. Update application status
    await env.PLATFORM_CONTEXT!.db.prepare('UPDATE applications SET status = ? WHERE id = ?').bind('enrolled', admissionCode).run();

    return ok({ message: 'Account claimed successfully', user });
  } catch (e: any) {
    console.error(e);
    return error(e.message || 'Failed to claim account', 500);
  }
}
