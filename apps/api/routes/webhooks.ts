/**
 * worker/routes/webhooks.ts
 *
 * Inbound webhook receiver + admin dead-letter management routes.
 *
 * POST /api/webhooks/inbound       — receive signed event from external system
 * GET  /api/webhooks/events        — admin: view sync event log
 * GET  /api/webhooks/dead-letters  — admin: view dead-letter queue
 * POST /api/webhooks/retry/:id     — admin: manually retry a dead-letter event
 */

import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';
import { verifySignature, dispatchWebhook } from '../lib/webhook';
import type { WebhookEventType } from '@bmi/shared';

/** POST /api/webhooks/inbound — receive and verify an inbound signed webhook */
export async function handleInboundWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.WEBHOOK_SECRET) {
    return error('Webhook receiver not configured', 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get('X-BMI-Signature') ?? '';

  const valid = await verifySignature(rawBody, signature, env.WEBHOOK_SECRET);
  if (!valid) {
    console.warn('[webhook] Signature mismatch from', request.headers.get('CF-Connecting-IP'));
    return error('Invalid signature', 401);
  }

  let payload: { type?: string; data?: Record<string, unknown>; id?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return error('Invalid JSON body', 400);
  }

  if (!payload.type || !payload.data) {
    return error('Missing required fields: type, data', 400);
  }

  // Log the inbound event for audit/debugging
  await env.DB.prepare(
    `INSERT INTO sync_event_log (id, event_type, payload, target_url, status, attempts)
     VALUES (?, ?, ?, 'inbound', 'success', 1)`,
  )
    .bind(crypto.randomUUID(), `inbound.${payload.type}`, rawBody)
    .run()
    .catch(() => {}); // Non-fatal if logging fails

  return ok({ received: true, type: payload.type });
}

/** GET /api/webhooks/events — admin: paginated sync event log */
export async function handleListEvents(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status'); // optional filter
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));

  const where = status ? `WHERE status = ?` : '';
  const binds: unknown[] = status ? [status, limit, offset] : [limit, offset];

  const [rows, total] = await Promise.all([
    env.DB.prepare(
      `SELECT id, event_type, target_url, status, attempts, last_error, created_at, resolved_at
       FROM sync_event_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...binds)
      .all<{
        id: string; event_type: string; target_url: string | null;
        status: string; attempts: number; last_error: string | null;
        created_at: string; resolved_at: string | null;
      }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sync_event_log ${where}`,
    )
      .bind(...(status ? [status] : []))
      .first<{ n: number }>(),
  ]);

  return ok({ results: rows.results, total: total?.n ?? 0, limit, offset });
}

/** GET /api/webhooks/dead-letters — admin: view dead-letter queue */
export async function handleListDeadLetters(_request: Request, env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT dl.id, dl.event_log_id, dl.last_error, dl.created_at,
            el.event_type, el.target_url, el.attempts
     FROM webhook_dead_letters dl
     JOIN sync_event_log el ON el.id = dl.event_log_id
     ORDER BY dl.created_at DESC
     LIMIT 50`,
  ).all<{
    id: string; event_log_id: string; last_error: string | null;
    created_at: string; event_type: string; target_url: string | null; attempts: number;
  }>();

  return ok(rows.results);
}

/** POST /api/webhooks/retry/:id — admin: manually retry a dead-letter event */
export async function handleRetryDeadLetter(
  _request: Request,
  env: Env,
  deadLetterId: string,
): Promise<Response> {
  const dl = await env.DB.prepare(
    `SELECT dl.payload, el.event_type
     FROM webhook_dead_letters dl
     JOIN sync_event_log el ON el.id = dl.event_log_id
     WHERE dl.id = ?`,
  )
    .bind(deadLetterId)
    .first<{ payload: string; event_type: string }>();

  if (!dl) return error('Dead-letter record not found', 404);

  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(dl.payload) as { data?: Record<string, unknown> };
    data = parsed.data ?? {};
  } catch {
    return error('Could not parse stored payload', 500);
  }

  // Remove from dead-letter queue before retry
  await env.DB.prepare('DELETE FROM webhook_dead_letters WHERE id = ?').bind(deadLetterId).run();

  // Dispatch without awaiting (fire-and-forget retry)
  dispatchWebhook(env, dl.event_type as WebhookEventType, data).catch(() => {});

  return ok({ retrying: true, event_type: dl.event_type });
}
