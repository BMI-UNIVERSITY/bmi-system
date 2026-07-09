import { Env, ok, error, typedJson } from '../lib/types';

interface TransitionBody {
  forwardEmail?: string;
}

export async function handleTransitionToAlumni(req: Request, env: Env, userId: string): Promise<Response> {
  try {
    await env.PLATFORM_CONTEXT!.identity.updateUser(userId, { roles: ['alumni'] });

    const body = await typedJson<TransitionBody>(req);
    if (body.forwardEmail) {
      const emailDomain = 'student.bmi.edu';
      const user = await env.PLATFORM_CONTEXT!.identity.getUser(userId);
      if (user) {
        const localPart = user.email.split('@')[0];
        await env.PLATFORM_CONTEXT!.email.createMailbox(userId, `${localPart}@${emailDomain}`, '');
        await env.PLATFORM_CONTEXT!.email.sendEmail({
          to: body.forwardEmail,
          subject: 'Alumni Email Forwarding Enabled',
          html: `<p>Your alumni email ${localPart}@${emailDomain} has been set up with forwarding to ${body.forwardEmail}.</p>`,
        });
      }
    }

    return ok({ message: 'Successfully transitioned to alumni status' });
  } catch {
    return error('Failed to transition to alumni', 500);
  }
}
