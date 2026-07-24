import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

describe('Auth Worker Integration Tests', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('worker-auth.ts', {
      experimental: { disableExperimentalWarning: true },
      persistTo: './.wrangler/state/v3',
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return 404 for random non-API routes', async () => {
    const res = await worker.fetch('/hello-world');
    expect(res.status).toBe(404);
  });

  it('should respond to the base path with API info', async () => {
    const res = await worker.fetch('/api/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('name', 'BMI API Worker');
  });

  it('should reject unauthenticated requests to /api/auth/me', async () => {
    const res = await worker.fetch('/api/auth/me');
    // It should either return 401 Unauthorized or 403 Forbidden depending on middleware
    expect([401, 403]).toContain(res.status);
  });
  
  it('should fail login with invalid credentials', async () => {
    const res = await worker.fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' })
    });
    
    // We expect a 400 or 401 for bad credentials
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
