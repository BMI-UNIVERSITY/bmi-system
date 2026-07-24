import { Env, ok, error, typedJson } from '../lib/types';

interface TransitionBody {
  student_id: string;
  forwardEmail?: string;
}

export async function handleTransitionToAlumni(req: Request, env: Env, _userId: string): Promise<Response> {
  try {
    const body = await typedJson<TransitionBody>(req);
    if (!body.student_id) {
      return error('student_id is required', 400);
    }

    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE users SET role = 'alumni', updated_at = datetime('now') WHERE id = ?`
    ).bind(body.student_id).run();

    if (body.forwardEmail) {
      const emailDomain = 'student.bmi.edu';
      const user = await env.PLATFORM_CONTEXT!.db.prepare(
        'SELECT email FROM users WHERE id = ?'
      ).bind(body.student_id).first<{ email: string }>();
      if (user) {
        const localPart = user.email.split('@')[0];
        await env.PLATFORM_CONTEXT!.email.createMailbox(body.student_id, `${localPart}@${emailDomain}`, '');
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
