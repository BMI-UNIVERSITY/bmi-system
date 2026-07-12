import { makeEnv, makeChainDB } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClaimAccount } from './claim';

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

describe('Claim routes — handleClaimAccount', () => {
  const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claims account successfully with valid admission code', async () => {
    const db = makeChainDB([
      { id: 'user-1' }, // first() lookup by admission_code
      { email: 'applicant@test.com', first_name: 'Jane' }, // first() get user info
    ]);
    const env = makeEnv(db, { RESEND_API_KEY: 'test-key' });

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'ADM-001', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json();

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
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 400 when admission code is not found', async () => {
    const db = makeChainDB([null]);
    const env = makeEnv(db);

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'INVALID-CODE', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json();

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
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('sends welcome email on successful claim', async () => {
    const db = makeChainDB([
      { id: 'user-1' },
      { email: 'applicant@test.com', first_name: 'Jane' },
    ]);
    const env = makeEnv(db, { RESEND_API_KEY: 'test-key' });

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
    const chain = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('DB unavailable')),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      transaction: vi.fn().mockImplementation(async (cb: any) => cb(chain)),
      getPlatform: vi.fn().mockReturnValue('test-mock'),
    };
    const env = makeEnv(chain);

    const req = new Request('http://localhost/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'ADM-001', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    expect(res.status).toBe(500);
  });
});
