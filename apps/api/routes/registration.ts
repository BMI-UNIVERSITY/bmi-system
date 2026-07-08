import { Env, success, error } from '../lib/types';

export async function handleRegistrationStep(req: Request, env: Env, userId: string, step: string): Promise<Response> {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  try {
    const body = await req.json() as any;
    // Save step progress to db
    await env.PLATFORM_CONTEXT!.db.prepare('INSERT INTO metadata (id, key, value) VALUES (?, ?, ?) ON CONFLICT(id, key) DO UPDATE SET value=excluded.value')
      .bind(userId, `reg_step_${step}`, JSON.stringify(body))
      .run();
    
    return success({ message: `Step ${step} saved successfully` });
  } catch (e: any) {
    return error('Failed to save registration step', 500);
  }
}
