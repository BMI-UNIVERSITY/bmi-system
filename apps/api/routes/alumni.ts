import { Env, ok, error } from '../lib/types';

export async function handleTransitionToAlumni(req: Request, env: Env, userId: string): Promise<Response> {
  try {
    // 1. Update Identity Provider roles
    await env.PLATFORM_CONTEXT!.identity.updateUser(userId, { roles: ['alumni'] });

    // 2. Set up email forwarding if requested
    const body = await req.json() as any;
    if (body.forwardEmail) {
      const emailDomain = 'student.bmi.edu';
      const user = await env.PLATFORM_CONTEXT!.identity.getUser(userId);
      if (user) {
        const localPart = user.email.split('@')[0];
        await (env.PLATFORM_CONTEXT!.email as any).setForwarding?.(emailDomain, localPart, body.forwardEmail);
      }
    }

    return ok({ message: 'Successfully transitioned to alumni status' });
  } catch (e: any) {
    return error('Failed to transition to alumni', 500);
  }
}
