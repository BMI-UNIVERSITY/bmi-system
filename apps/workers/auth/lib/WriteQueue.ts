/**
 * WriteQueue — Durable Object
 *
 * Serializes all D1 write operations to prevent concurrent connection exhaustion
 * (D1 hard-limit: 10 concurrent connections).
 *
 * Durability Guarantee:
 *   - Every incoming SQL statement is persisted to DO transactional storage BEFORE
 *     the HTTP 202 response is sent back to the caller.
 *   - This means a DO eviction, crash, or edge node failure CANNOT lose data; the
 *     queue is recovered from storage on the next request or alarm.
 *   - The queue is only cleared from storage AFTER D1.batch() confirms success.
 *
 * Retry Strategy:
 *   - If D1 returns SQLITE_BUSY or any transient error, the failing batch is
 *     re-queued at the front and retried after an exponential backoff.
 *   - A Durable Object alarm is scheduled as a fallback processor to ensure
 *     recovery even if the DO is evicted mid-retry.
 */

import type { Env } from './types';
import { createLogger } from '@bmi/api-middleware';

const log = createLogger('write-queue');

interface QueueEntry {
  sql: string;
  params: unknown[];
}

export class WriteQueue {
  private ctx: DurableObjectState;
  private env: Env;
  private queue: QueueEntry[] = [];
  private processing = false;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  // ─── HTTP Interface (called by API routes) ───────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    let body: QueueEntry;
    try {
      body = await request.json() as QueueEntry;
      if (!body.sql || !Array.isArray(body.params)) throw new Error('Invalid payload');
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    await this.enqueue(body.sql, body.params);
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Alarm Handler (crash recovery) ─────────────────────────────────────────

  async alarm(): Promise<void> {
    // Recover any queue persisted from a previous evicted execution
    const persisted = await this.ctx.storage.get<QueueEntry[]>('pendingQueue');
    if (persisted && persisted.length > 0) {
      this.queue = [...persisted, ...this.queue];
      await this.ctx.storage.delete('pendingQueue');
    }
    if (this.queue.length > 0 && !this.processing) {
      await this.process();
    }
  }

  // ─── Core Enqueue ────────────────────────────────────────────────────────────

  private async enqueue(sql: string, params: unknown[]): Promise<void> {
    // 1. Push to the in-memory queue
    this.queue.push({ sql, params });

    // 2. Persist the ENTIRE queue to DO transactional storage BEFORE returning.
    //    This is the critical durability step. If the DO is evicted right after
    //    returning 202, the alarm() handler will recover from this persisted state.
    await this.ctx.storage.put('pendingQueue', this.queue);

    // 3. Schedule an alarm as a safety net in case processing never completes
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm) {
      // Alarm fires 10 seconds from now if not already scheduled
      await this.ctx.storage.setAlarm(Date.now() + 10_000);
    }

    // 4. Trigger processing if not already running. We await it so the caller
    //    knows the data is at least safely in storage even if D1 hasn't been hit yet.
    if (!this.processing) {
      await this.process();
    }
  }

  // ─── Batch Processor ─────────────────────────────────────────────────────────

  private async process(): Promise<void> {
    this.processing = true;
    let backoffMs = 0; // tracks current backoff delay; resets on success

    while (this.queue.length > 0) {
      // Take a batch of up to 10 items (D1 batch limit is 100, but we keep
      // batches small so retries are cheaper and individual failures are isolated)
      const batchSize = Math.min(this.queue.length, 10);
      const batch = this.queue.splice(0, batchSize);

      try {
        const stmts = batch.map(q => this.env.DB.prepare(q.sql).bind(...q.params));
        await this.env.DB.batch(stmts);

        // ✅ Batch committed to D1: update the persisted queue (remove processed items)
        if (this.queue.length > 0) {
          await this.ctx.storage.put('pendingQueue', this.queue);
        } else {
          // Queue is now empty — clear storage and cancel alarm
          await this.ctx.storage.delete('pendingQueue');
          await this.ctx.storage.deleteAlarm();
        }

        // Success: reset backoff so the next failure starts fresh
        backoffMs = 0;
      } catch (err: any) {
        log.error('WriteQueue D1 batch write failed, re-queuing with exponential backoff', {
          err: err?.message ?? String(err),
          batchSize: batch.length,
        });

        // ❌ Batch failed: put items back at the FRONT of the queue
        this.queue = [...batch, ...this.queue];

        // Persist the current state (including re-queued items) before backing off
        await this.ctx.storage.put('pendingQueue', this.queue);

        // Exponential backoff: 200ms → 400ms → 800ms, capped at 800ms.
        // Jitter (±25%) prevents multiple DOs from thundering-herding into D1 simultaneously
        // after a shared outage. Formula: delay = min(backoff, 800) * (0.75 + 0.5 * random)
        backoffMs = backoffMs === 0 ? 200 : Math.min(backoffMs * 2, 800);
        const jitter = 0.75 + Math.random() * 0.5; // range: [0.75, 1.25]
        const delay = Math.round(backoffMs * jitter);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.processing = false;
  }
}

// ─── Helper for API routes ───────────────────────────────────────────────────

/**
 * Enqueue a single D1 write through the globally-serialized WriteQueue DO.
 *
 * Usage:
 *   await enqueueWrite(env, 'INSERT INTO users (id, email) VALUES (?, ?)', [id, email]);
 *
 * The caller can safely return a success response after this resolves.
 * The write is durably persisted in DO storage before this function returns.
 */
export async function enqueueWrite(env: Env, sql: string, params: unknown[]): Promise<void> {
  // Use a single named DO instance ("global") to ensure ALL writes globally
  // go through one serialized queue. This is the key to preventing concurrency issues.
  const id = env.WRITE_QUEUE.idFromName('global');
  const stub = env.WRITE_QUEUE.get(id);
  const res = await stub.fetch('https://internal/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WriteQueue DO rejected write: ${res.status} — ${body}`);
  }
}
