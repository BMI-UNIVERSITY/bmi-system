import { makeEnv, makeDrizzleMock } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@bmi/api-middleware', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
}));

vi.mock('../lib/jwt', () => ({
  validatePasswordStrength: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  isCommonPassword: vi.fn().mockReturnValue(false),
}));

vi.mock('../lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildEmailLayout: vi.fn().mockReturnValue('<html></html>'),
}));

vi.mock('../lib/db', () => ({
  createCoreDb: vi.fn(),
}));

import { handleClaimAccount } from './claim';
import { createCoreDb } from '../lib/db';

describe('Claim routes — handleClaimAccount', () => {
  const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claims account successfully with valid admission code', async () => {
    const drizzle = makeDrizzleMock([
      { id: 'user-1', email: 'applicant@test.com', first_name: 'Jane' },
    ]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const env = makeEnv(null, { RESEND_API_KEY: 'test-key' });

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'ADM-001', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('claimed');
  });

  it('returns 400 when admissionCode or password is missing', async () => {
    const env = makeEnv();

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'ADM-001' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json() as any;

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 400 when admission code is not found', async () => {
    const drizzle = makeDrizzleMock([null]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const env = makeEnv();

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'INVALID-CODE', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json() as any;

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 400 when password is too weak', async () => {
    const env = makeEnv();

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'ADM-001', password: 'weak' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json() as any;

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('sends welcome email on successful claim', async () => {
    const drizzle = makeDrizzleMock([
      { id: 'user-1', email: 'applicant@test.com', first_name: 'Jane' },
    ]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const env = makeEnv(null, { RESEND_API_KEY: 'test-key' });

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'ADM-001', password: 'Str0ng!Pass' }),
    });
    await handleClaimAccount(req, env, mockCtx as any);

    const { sendEmail } = await import('../lib/email');
    expect(sendEmail).toHaveBeenCalled();
    expect(mockCtx.waitUntil).toHaveBeenCalled();
  });

  it('returns 500 when db query fails', async () => {
    const drizzle: any = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockRejectedValue(new Error('DB unavailable')),
    };
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const env = makeEnv();

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'ADM-001', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    expect(res.status).toBe(500);
  });
});
