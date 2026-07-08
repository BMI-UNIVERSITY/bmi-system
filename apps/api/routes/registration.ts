import { Env, ok, error, typedJson } from '../lib/types';

export async function handleRegistrationStep(req: Request, env: Env, userId: string, step: string): Promise<Response> {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  try {
    const body = await typedJson<Record<string, unknown>>(req);
    await env.PLATFORM_CONTEXT!.db.prepare('INSERT INTO metadata (id, key, value) VALUES (?, ?, ?) ON CONFLICT(id, key) DO UPDATE SET value=excluded.value')
      .bind(userId, `reg_step_${step}`, JSON.stringify(body))
      .run();
    
    return ok({ message: `Step ${step} saved successfully` });
  } catch (e: unknown) {
    return error('Failed to save registration step', 500);
  }
}
