import { makeEnv } from './test-helpers';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  handleAdminSetup,
  handleListUsers,
  handleUpdateUserRole,
  handleDeleteUser,
  handleAdminResetPassword,
  handleGetAuditLogs,
  handleBulkEmails,
} from './admin';

// timingSafeEqual is a Cloudflare-only API not available in Node test runtime
beforeAll(() => {
  if (!(crypto.subtle as any).timingSafeEqual) {
    (crypto.subtle as any).timingSafeEqual = (a: ArrayBuffer, b: ArrayBuffer) => {
      const av = new Uint8Array(a), bv = new Uint8Array(b);
      if (av.byteLength !== bv.byteLength) return false;
      let diff = 0;
      for (let i = 0; i < av.byteLength; i++) diff |= av[i] ^ bv[i];
      return diff === 0;
    };
  }
});

vi.mock('../lib/types', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    logAdminAction: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock('../lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../lib/config', () => ({ getPortalUrl: vi.fn().mockReturnValue('https://portal.test') }));
vi.mock('@bmi/api-middleware', () => ({ hashPassword: vi.fn().mockResolvedValue('hashed-pw') }));

function makeChainDB(firstVals: any[] = [], allVals: any[] = []) {
  let fi = 0, ai = 0;
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockImplementation(() => Promise.resolve(firstVals[fi++ % Math.max(firstVals.length, 1)] ?? null)),
        all:   vi.fn().mockImplementation(() => Promise.resolve({ results: allVals[ai++ % Math.max(allVals.length, 1)] ?? [] })),
        run:   vi.fn().mockResolvedValue({}),
      }),
      first: vi.fn().mockResolvedValue(firstVals[0] ?? null),
      all:   vi.fn().mockResolvedValue({ results: allVals[0] ?? [] }),
    }),
  };
}

describe('admin routes — handleAdminSetup', () => {
  it('returns 501 if ADMIN_SETUP_KEY not configured', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: '{}' });
    const res = await handleAdminSetup(req, {} as any);
    expect(res.status).toBe(501);
  });

  it('returns 401 if setup key header missing', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: '{}' });
    const res = await handleAdminSetup(req, { ADMIN_SETUP_KEY: 'secret' } as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 if setup key is wrong', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: '{}',
      headers: { 'X-Admin-Setup-Key': 'wrong-key' },
    });
    const res = await handleAdminSetup(req, { ADMIN_SETUP_KEY: 'correct-key' } as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 if email or password missing', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@bmi.edu' }),
      headers: { 'X-Admin-Setup-Key': 'mykey' },
    });
    const res = await handleAdminSetup(req, { ADMIN_SETUP_KEY: 'mykey' } as any);
    expect(res.status).toBe(400);
  });

  it('returns 409 if admin already exists', async () => {
    const db = makeChainDB([{ id: 'existing-admin' }]);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', password: 'pass123' }),
      headers: { 'X-Admin-Setup-Key': 'mykey' },
    });
    const res = await handleAdminSetup(req, makeEnv(db, { ADMIN_SETUP_KEY: 'mykey', PASSWORD_PEPPER: 'pepper' }));
    expect(res.status).toBe(409);
  });

  it('creates admin account successfully', async () => {
    // first call: no existing admin; second call: no existing email
    let fi = 0;
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => Promise.resolve(fi++ === 0 ? null : null)),
          run: vi.fn().mockResolvedValue({}),
        }),
      }),
    };
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@bmi.edu', password: 'SecurePass1!', first_name: 'Admin', last_name: 'User' }),
      headers: { 'X-Admin-Setup-Key': 'mykey' },
    });
    const res = await handleAdminSetup(req, makeEnv(db, { ADMIN_SETUP_KEY: 'mykey', PASSWORD_PEPPER: 'pepper' }));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.message).toContain('Admin account created');
  });
});

describe('admin routes — handleListUsers', () => {
  it('returns paginated users with total', async () => {
    const users = [{ id: 'u1', email: 'a@b.com', role: 'student' }];
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: users }),
          first: vi.fn().mockResolvedValue({ total: 1 }),
        }),
        first: vi.fn().mockResolvedValue({ total: 1 }),
      }),
    };
    const req = new Request('http://localhost/api/admin/users?limit=10&offset=0');
    const res = await handleListUsers(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data.total).toBe(1);
    expect(body.data.users).toHaveLength(1);
  });


  it('caps limit at 200', async () => {
    const bindMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue({ total: 0 }),
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock, first: vi.fn().mockResolvedValue({ total: 0 }) }) };
    const req = new Request('http://localhost/api/admin/users?limit=9999');
    await handleListUsers(req, makeEnv(db));
    // First argument of bind should be 200 (capped)
    expect(bindMock.mock.calls[0][0]).toBe(200);
  });
});

describe('admin routes — handleUpdateUserRole', () => {
  it('returns 400 if actor changes own role', async () => {
    const req = new Request('http://localhost/api/admin/users/actor1/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'student' }),
    });
    const res = await handleUpdateUserRole(req, {} as any, 'actor1');
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const req = new Request('http://localhost/api/admin/users/target1/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'superuser' }),
    });
    const res = await handleUpdateUserRole(req, {} as any, 'actor1');
    expect(res.status).toBe(400);
  });

  it('returns 404 if target user not found', async () => {
    const db = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }) }) };
    const req = new Request('http://localhost/api/admin/users/target1/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'staff' }),
    });
    const res = await handleUpdateUserRole(req, makeEnv(db), 'actor1');
    expect(res.status).toBe(404);
  });

  it('updates user role successfully', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'target1', role: 'student' }),
          run: vi.fn().mockResolvedValue({}),
        }),
      }),
    };
    const req = new Request('http://localhost/api/admin/users/target1/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'staff' }),
    });
    const res = await handleUpdateUserRole(req, makeEnv(db), 'actor1');
    expect(res.status).toBe(200);
  });
});

describe('admin routes — handleDeleteUser', () => {
  it('returns 400 if actor deletes own account', async () => {
    const req = new Request('http://localhost/api/admin/users/actor1');
    const res = await handleDeleteUser(req, {} as any, 'actor1');
    expect(res.status).toBe(400);
  });

  it('returns 404 if user not found', async () => {
    const db = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }) }) };
    const req = new Request('http://localhost/api/admin/users/target1');
    const res = await handleDeleteUser(req, makeEnv(db), 'actor1');
    expect(res.status).toBe(404);
  });

  it('returns 403 if target is admin', async () => {
    const db = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 'target1', role: 'admin', email: 'a@b.com', first_name: 'A', last_name: 'B' }) }) }) };
    const req = new Request('http://localhost/api/admin/users/target1');
    const res = await handleDeleteUser(req, makeEnv(db), 'actor1');
    expect(res.status).toBe(403);
  });

  it('deletes user successfully', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'target1', role: 'student', email: 'u@b.com', first_name: 'U', last_name: 'B' }),
          run: vi.fn().mockResolvedValue({}),
        }),
      }),
    };
    const req = new Request('http://localhost/api/admin/users/target1');
    const res = await handleDeleteUser(req, makeEnv(db), 'actor1');
    expect(res.status).toBe(200);
  });
});

describe('admin routes — handleAdminResetPassword', () => {
  it('returns 404 if user not found', async () => {
    const db = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }) }) };
    const req = new Request('http://localhost/api/admin/users/nobody/reset-password');
    const res = await handleAdminResetPassword(req, makeEnv(db), 'actor1');
    expect(res.status).toBe(404);
  });

  it('creates reset token and returns success', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'u1', email: 'u@bmi.edu', first_name: 'Alice' }),
          run: vi.fn().mockResolvedValue({}),
        }),
      }),
    };
    const req = new Request('http://localhost/api/admin/users/u1/reset-password', { method: 'POST' });
    const res = await handleAdminResetPassword(req, makeEnv(db, { RESEND_API_KEY: 'key' }), 'actor1');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.message).toContain('Password reset email sent');
  });
});

describe('admin routes — handleGetAuditLogs', () => {
  it('returns paginated audit logs', async () => {
    const logs = [{ id: 'l1', action: 'create_user', actor_name: 'Admin' }];
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: logs }),
          first: vi.fn().mockResolvedValue({ total: 1 }),
        }),
      }),
    };
    const req = new Request('http://localhost/api/admin/audit-logs');
    const res = await handleGetAuditLogs(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data.logs[0].action).toBe('create_user');
  });

  it('filters by action when provided', async () => {
    const bindMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue({ total: 0 }),
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
    const req = new Request('http://localhost/api/admin/audit-logs?action=delete_user');
    await handleGetAuditLogs(req, makeEnv(db));
    // action filter should be bound first
    expect(bindMock.mock.calls.some((args: any[]) => args.includes('delete_user'))).toBe(true);
  });
});

describe('admin routes — handleBulkEmails', () => {
  it('returns 400 if payload invalid', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ subject: 'Hello' }), // missing recipients and html
    });
    const res = await handleBulkEmails(req, {} as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 if over 500 recipients', async () => {
    const recipients = Array.from({ length: 501 }, (_, i) => `u${i}@test.com`);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ recipients, subject: 'S', html: '<p>H</p>' }),
    });
    const res = await handleBulkEmails(req, {} as any);
    expect(res.status).toBe(400);
  });

  it('queues emails and returns count', async () => {
    const queueSendMock = vi.fn().mockResolvedValue(undefined);
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) }),
      }),
    };
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ recipients: ['a@b.com', 'c@d.com'], subject: 'Hello', html: '<p>Hi</p>' }),
    });
    const res = await handleBulkEmails(req, makeEnv(db));
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data.message).toContain('2/2');
  });
});
