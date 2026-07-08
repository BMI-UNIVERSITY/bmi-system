import { makeEnv, makeChainDB } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleClaimAccount } from './claim';

describe('Claim routes — handleClaimAccount', () => {
  const mockCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claims account successfully with valid admission code', async () => {
    const db = makeChainDB([], [[{ id: 'APP-001', email: 'applicant@test.com', first_name: 'Jane' }]]);
    const env = makeEnv(db, { STUDENT_EMAIL_DOMAIN: 'student.bmi.edu' });
    env.PLATFORM_CONTEXT.identity.createUser.mockResolvedValue({
      id: 'user-1', email: 'applicant@test.com', roles: ['student'],
    });

    const req = new Request('http://localhost/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'APP-001', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(env.PLATFORM_CONTEXT.identity.createUser).toHaveBeenCalledWith({
      email: 'applicant@test.com',
      password: 'Str0ng!Pass',
      roles: ['student'],
      metadata: { admissionCode: 'APP-001' },
    });
    expect(env.PLATFORM_CONTEXT.email.createMailbox).toHaveBeenCalledWith(
      'user-1',
      'applicant@student.bmi.edu',
      'Str0ng!Pass',
    );
  });

  it('returns 400 when admissionCode or password is missing', async () => {
    const env = makeEnv();

    const req = new Request('http://localhost/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'APP-001' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(env.PLATFORM_CONTEXT.identity.createUser).not.toHaveBeenCalled();
  });

  it('returns 404 when admission code is not found', async () => {
    const db = makeChainDB([], [[]]);
    const env = makeEnv(db);

    const req = new Request('http://localhost/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'INVALID-CODE', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(env.PLATFORM_CONTEXT.identity.createUser).not.toHaveBeenCalled();
  });

  it('returns 500 when identity provider throws', async () => {
    const db = makeChainDB([], [[{ id: 'APP-001', email: 'applicant@test.com', first_name: 'Jane' }]]);
    const env = makeEnv(db);
    env.PLATFORM_CONTEXT.identity.createUser.mockRejectedValue(new Error('Keycloak unavailable'));

    const req = new Request('http://localhost/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'APP-001', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it('uses default email domain when STUDENT_EMAIL_DOMAIN is not set', async () => {
    const db = makeChainDB([], [[{ id: 'APP-001', email: 'test@test.com', first_name: 'Jane' }]]);
    const env = makeEnv(db);
    env.STUDENT_EMAIL_DOMAIN = undefined;
    env.PLATFORM_CONTEXT.identity.createUser.mockResolvedValue({
      id: 'user-2', email: 'test@test.com', roles: ['student'],
    });

    const req = new Request('http://localhost/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionCode: 'APP-001', password: 'Str0ng!Pass' }),
    });
    const res = await handleClaimAccount(req, env, mockCtx as any);

    expect(res.status).toBe(200);
    expect(env.PLATFORM_CONTEXT.email.createMailbox).toHaveBeenCalledWith(
      'user-2',
      'test@student.bmi.edu',
      'Str0ng!Pass',
    );
  });
});
