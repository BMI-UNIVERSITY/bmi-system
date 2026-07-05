/**
 * worker/lib/webhook.ts
 *
 * Outbound webhook dispatcher with HMAC-SHA256 signing, exponential-backoff
 * retry (×3), dead-letter queueing, and ops alerting via Resend.
 */

import type { Env } from './types';
import type { WebhookEventType } from '@bmi/shared';
import { sendEmail } from './email';

export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: Record<string, unknown>;
}

/** HMAC-SHA256 sign a string payload with the given secret. */
async function signPayload(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify an inbound HMAC-SHA256 signature. */
export async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await signPayload(payload, secret);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Write a sync event log entry. Returns the new event log ID. */
async function logEvent(
  env: Env,
  type: WebhookEventType,
  payload: WebhookPayload,
  targetUrl: string | undefined,
): Promise<string> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO sync_event_log (id, event_type, payload, target_url, status, attempts)
     VALUES (?, ?, ?, ?, 'pending', 0)`,
  )
    .bind(id, type, JSON.stringify(payload), targetUrl ?? null)
    .run();
  return id;
}

/** Move a failed event to the dead-letter table and send an ops alert. */
async function deadLetter(
  env: Env,
  eventLogId: string,
  payload: WebhookPayload,
  lastError: string,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE sync_event_log SET status='dead', last_error=?, resolved_at=datetime('now') WHERE id=?`,
  )
    .bind(lastError, eventLogId)
    .run();

  await env.DB.prepare(
    `INSERT INTO webhook_dead_letters (id, event_log_id, payload, last_error)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), eventLogId, JSON.stringify(payload), lastError)
    .run();

  // Send ops alert — guard against infinite loops if alert itself fails
  if (env.OPS_ALERT_EMAIL && env.RESEND_API_KEY) {
    await sendEmail(
      {
        to: env.OPS_ALERT_EMAIL,
        subject: `[BMI Portal] Webhook dead-letter: ${payload.type}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#dc2626;">⚠ Webhook Dead-Letter Alert</h2>
            <p><strong>Event Type:</strong> ${payload.type}</p>
            <p><strong>Event ID:</strong> ${payload.id}</p>
            <p><strong>Event Log ID:</strong> ${eventLogId}</p>
            <p><strong>Last Error:</strong> ${lastError}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <hr/>
            <p style="color:#64748b;font-size:13px;">
              Review and retry at: Admin → Webhooks → Dead Letters
            </p>
          </div>`,
      },
      env.RESEND_API_KEY,
    ).catch(() => {
      /* Suppress — alert failure must never cause infinite loop */
    });
  }
}

/**
 * Dispatch a signed outbound webhook with up to 3 retry attempts.
 * Uses exponential backoff: 1 s → 4 s → 16 s.
 * On permanent failure, writes to dead-letter queue and alerts ops.
 *
 * This function is non-throwing — all errors are handled internally.
 */
export async function dispatchWebhook(
  env: Env,
  type: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  if (!env.WEBHOOK_URL) return; // Feature disabled — no-op

  const payload: WebhookPayload = {
    id: crypto.randomUUID(),
    type,
    created_at: new Date().toISOString(),
    data,
  };

  const eventLogId = await logEvent(env, type, payload, env.WEBHOOK_URL).catch(
    () => null,
  );

  const payloadStr = JSON.stringify(payload);
  const signature = env.WEBHOOK_SECRET
    ? await signPayload(payloadStr, env.WEBHOOK_SECRET)
    : 'unsigned';

  const delays = [1000, 4000, 16000]; // ms

  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt - 1]));
    }

    let lastError = '';
    try {
      const res = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BMI-Signature': signature,
          'X-BMI-Event': type,
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10_000), // 10s timeout per attempt
      });

      if (res.ok) {
        // Success — update log
        if (eventLogId) {
          await env.DB.prepare(
            `UPDATE sync_event_log SET status='success', attempts=?, resolved_at=datetime('now') WHERE id=?`,
          )
            .bind(attempt + 1, eventLogId)
            .run()
            .catch(() => {});
        }
        return;
      }

      lastError = `HTTP ${res.status}: ${await res.text().catch(() => '(unreadable)')}`;

      // 4xx errors are non-retryable
      if (res.status >= 400 && res.status < 500) {
        if (eventLogId) {
          await deadLetter(env, eventLogId, payload, lastError);
        }
        return;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    // Update attempt count
    if (eventLogId) {
      await env.DB.prepare(
        `UPDATE sync_event_log SET attempts=?, last_error=?, status='failed' WHERE id=?`,
      )
        .bind(attempt + 1, lastError, eventLogId)
        .run()
        .catch(() => {});
    }

    // After final attempt → dead-letter
    if (attempt === 2) {
      if (eventLogId) {
        await deadLetter(env, eventLogId, payload, lastError);
      }
    }
  }
}
