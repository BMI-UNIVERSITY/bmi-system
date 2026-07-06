/**
 * Application Handler Unit Tests
 *
 * Tests the handleSubmitApplication handler.
 * Covers schema validation, rate-limiting (max_applications),
 * duplicate prevention, and deadline checks.
 *
 * env.WRITE_QUEUE is mocked to prevent DO binding issues in Node.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock all heavy side-effect modules ────────────────────────────────────────

vi.mock('../lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  applicationSubmittedEmail: vi.fn().mockReturnValue(''),
  statusUpdateEmail: vi.fn().mockReturnValue(''),
}));

vi.mock('../lib/webhook', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/app_number', () => ({
  generateApplicationNumber: vi.fn().mockResolvedValue('APP-2026-0001'),
}));

vi.mock('../lib/lifecycle', () => ({
  runAdmissionPipeline: vi.fn().mockResolvedValue(undefined),
  appendLifecycleEvent: vi.fn().mockResolvedValue(undefined),
  getLifecycleHistory: vi.fn().mockResolvedValue([]),
  STAGES: { review: 'review' },
}));

vi.mock('../lib/provisioning', () => ({
  dispatchPendingJobs: vi.fn().mockResolvedValue(undefined),
}));

import { handleSubmitApplication } from './apply';

// ─── Test Env Helpers ──────────────────────────────────────────────────────────

function makeEnv(overrides: Record<string, unknown> = {}) {
  const db = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn().mockResolvedValue({}),
    all: vi.fn().mockResolvedValue({ results: [] }),
    batch: vi.fn().mockResolvedValue([]),
  };
  return {
    DB: db,
    ENVIRONMENT: 'test',
    RESEND_API_KEY: 'test-key',
    ADMIN_EMAIL: 'admin@test.com',
    WRITE_QUEUE: {
      get: vi.fn().mockReturnValue({
        fetch: vi.fn().mockResolvedValue(new Response('{"success":true}')),
      }),
      idFromName: vi.fn().mockReturnValue('mock-do-id'),
    },
    ...overrides,
  };
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('handleSubmitApplication', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('returns 400 for missing fields (caught by Zod)', async () => {
    const req = makeRequest({});
    const res = await handleSubmitApplication(req, env as any, 'user-1');
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.fields?.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid degree_level (enum check)', async () => {
    const req = makeRequest({
      program: 'BA in Biblical Studies',
      degree_level: 'invalid_level',
    });
    const res = await handleSubmitApplication(req, env as any, 'user-1');
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.fields?.some((f: any) => f.field === 'degree_level')).toBe(true);
  });

  it('returns 400 for invalid program (business rule check)', async () => {
    const req = makeRequest({
      program: 'Not A Real Program',
      degree_level: 'undergraduate',
    });
    const res = await handleSubmitApplication(req, env as any, 'user-1');
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/Invalid program/i);
  });

  it('returns 409 if user already has an active application', async () => {
    env.DB.first = vi.fn().mockResolvedValue({ count: 1 }); // Mock existing application
    const req = makeRequest({
      program: 'BA in Biblical Studies',
      degree_level: 'undergraduate',
    });
    const res = await handleSubmitApplication(req, env as any, 'user-1');
    expect(res.status).toBe(409);
  });

  it('returns 403 if user exceeded max applications limit', async () => {
    // 1st call: existing = 0 (no active)
    // 2nd call: max_applications_per_user = 3
    // 3rd call: totalCount = 3
    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ value: '3' })
      .mockResolvedValueOnce({ count: 3 });
      
    const req = makeRequest({
      program: 'BA in Biblical Studies',
      degree_level: 'undergraduate',
    });
    const res = await handleSubmitApplication(req, env as any, 'user-1');
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.error).toMatch(/maximum of 3 applications/i);
  });

  it('returns 403 if application deadline has passed', async () => {
    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ count: 0 }) // no active
      .mockResolvedValueOnce(null)         // no max apps limit
      .mockResolvedValueOnce({ value: '2020-01-01' }); // deadline in the past
      
    const req = makeRequest({
      program: 'BA in Biblical Studies',
      degree_level: 'undergraduate',
    });
    const res = await handleSubmitApplication(req, env as any, 'user-1');
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.error).toMatch(/deadline has passed/i);
  });

  it('returns 200 and generates application number on success', async () => {
    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ count: 0 }) // no active app
      .mockResolvedValueOnce(null)         // no max apps
      .mockResolvedValueOnce(null)         // no deadline
      .mockResolvedValueOnce({ email: 'user@test.com', first_name: 'Test' }); // user fetch for email
    
    env.DB.run = vi.fn().mockResolvedValue({});
    
    const req = makeRequest({
      program: 'BA in Biblical Studies',
      degree_level: 'undergraduate',
      personal_statement: 'I want to study.',
      prior_education: 'High school.',
    });
    
    const res = await handleSubmitApplication(req, env as any, 'user-1');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data?.application_id).toBeDefined();
    expect(body.data?.application_number).toBe('APP-2026-0001');
    expect(body.data?.status).toBe('submitted');
  });
});
