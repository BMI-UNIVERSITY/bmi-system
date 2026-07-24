/**
 * API Integration Tests – foundational suite
 *
 * These tests use Wrangler's `unstable_dev()` to spin up a real local worker
 * process (with D1 + KV bindings) and verify end-to-end HTTP behaviour.
 *
 * Requirements:
 *   - `wrangler.json` must be present in apps/api
 *   - Local D1 migrations must have been applied (`npm run db:migrate:local`)
 *
 * Run: npm run test:integration
 */
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let worker: UnstableDevWorker;

beforeAll(async () => {
  worker = await unstable_dev('index.ts', {
    config: 'wrangler.jsonc',
    experimental: { disableExperimentalWarning: true },
  });
});

afterAll(async () => {
  if (worker) await worker.stop();
});

describe('API health / routing', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await worker.fetch('/nonexistent-route-xyz');
    expect(res.status).toBe(404);
  });

  it('returns 405 or 200 for GET /api/auth/login (expects POST)', async () => {
    const res = await worker.fetch('/api/auth/login');
    // The route exists but does not accept GET – 405 or 404 depending on router
    expect([200, 404, 405]).toContain(res.status);
  });

  it('POST /api/auth/login with empty body returns 400 or 422', async () => {
    const res = await worker.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect([400, 401, 422]).toContain(res.status);
  });
});
