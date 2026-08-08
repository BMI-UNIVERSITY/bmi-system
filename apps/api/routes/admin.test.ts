import { makeEnv, makeDrizzleMock } from './test-helpers';
import { describe, it, expect, vi, beforeAll } from 'vitest';

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
vi.mock('../lib/db', () => ({ createCoreDb: vi.fn() }));

import {
  handleAdminSetup,
  handleListUsers,
  handleUpdateUserRole,
  handleDeleteUser,
  handleAdminResetPassword,
  handleGetAuditLogs,
  handleBulkEmails,
  handleListContactSubmissions,
  handleListNewsletterSubscribers,
} from './admin';
import { createCoreDb } from '../lib/db';

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
    const drizzle = makeDrizzleMock([{ id: 'existing-admin' }]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', password: 'pass123' }),
      headers: { 'X-Admin-Setup-Key': 'mykey' },
    });
    const res = await handleAdminSetup(req, makeEnv(null, { ADMIN_SETUP_KEY: 'mykey', PASSWORD_PEPPER: 'pepper' }));
    expect(res.status).toBe(409);
  });

  it('creates admin account successfully', async () => {
    const drizzle = makeDrizzleMock([null, null]); // no existing admin, no existing email
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@bmi.edu', password: 'SecurePass1!', first_name: 'Admin', last_name: 'User' }),
      headers: { 'X-Admin-Setup-Key': 'mykey' },
    });
    const res = await handleAdminSetup(req, makeEnv(null, { ADMIN_SETUP_KEY: 'mykey', PASSWORD_PEPPER: 'pepper' }));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.message).toContain('Admin account created');
  });
});

describe('admin routes — handleListUsers', () => {
  it('returns paginated users with total', async () => {
    const userRows = [{ id: 'u1', email: 'a@b.com', role: 'student' }];
    // allVals[0] = the full user list (chain await), allVals[1] doesn't matter
    const drizzle = makeDrizzleMock([{ total: 1 }], [userRows]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users?limit=10&offset=0');
    const res = await handleListUsers(req, makeEnv());
    const body = await res.json() as any;
    expect(body.data.total).toBe(1);
    expect(body.data.users).toHaveLength(1);
  });

  it('caps limit at 200', async () => {
    const drizzle = makeDrizzleMock([{ total: 0 }], [[]]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users?limit=9999');
    const res = await handleListUsers(req, makeEnv());
    const body = await res.json() as any;
    expect(body.data.limit).toBe(200);
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
    const drizzle = makeDrizzleMock([null]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users/target1/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'staff' }),
    });
    const res = await handleUpdateUserRole(req, makeEnv(), 'actor1');
    expect(res.status).toBe(404);
  });

  it('updates user role successfully', async () => {
    const drizzle = makeDrizzleMock([{ id: 'target1', role: 'student' }]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users/target1/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'staff' }),
    });
    const res = await handleUpdateUserRole(req, makeEnv(), 'actor1');
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
    const drizzle = makeDrizzleMock([null]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users/target1');
    const res = await handleDeleteUser(req, makeEnv(), 'actor1');
    expect(res.status).toBe(404);
  });

  it('returns 403 if target is admin', async () => {
    const drizzle = makeDrizzleMock([{ id: 'target1', role: 'admin', email: 'a@b.com', first_name: 'A', last_name: 'B' }]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users/target1');
    const res = await handleDeleteUser(req, makeEnv(), 'actor1');
    expect(res.status).toBe(403);
  });

  it('deletes user successfully', async () => {
    const drizzle = makeDrizzleMock([{ id: 'target1', role: 'student', email: 'u@b.com', first_name: 'U', last_name: 'B' }]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users/target1');
    const res = await handleDeleteUser(req, makeEnv(), 'actor1');
    expect(res.status).toBe(200);
  });
});

describe('admin routes — handleAdminResetPassword', () => {
  it('returns 404 if user not found', async () => {
    const drizzle = makeDrizzleMock([null]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users/nobody/reset-password');
    const res = await handleAdminResetPassword(req, makeEnv(), 'actor1');
    expect(res.status).toBe(404);
  });

  it('creates reset token and returns success', async () => {
    const drizzle = makeDrizzleMock([{ id: 'u1', email: 'u@bmi.edu', first_name: 'Alice' }]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/users/u1/reset-password', { method: 'POST' });
    const res = await handleAdminResetPassword(req, makeEnv(null, { RESEND_API_KEY: 'key' }), 'actor1');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.message).toContain('Password reset email sent');
  });
});

describe('admin routes — handleGetAuditLogs', () => {
  it('returns paginated audit logs', async () => {
    const logs = [{ id: 'l1', action: 'create_user', actor_name: 'Admin' }];
    // allVals[0] = the log rows (chain await for logsQuery)
    const drizzle = makeDrizzleMock([{ total: 1 }], [logs]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/audit-logs');
    const res = await handleGetAuditLogs(req, makeEnv());
    const body = await res.json() as any;
    expect(body.data.logs[0].action).toBe('create_user');
  });

  it('filters by action when provided', async () => {
    const drizzle = makeDrizzleMock([{ total: 0 }], [[]]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/admin/audit-logs?action=delete_user');
    const res = await handleGetAuditLogs(req, makeEnv());
    expect(res.status).toBe(200);
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
    const drizzle = makeDrizzleMock();
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ recipients: ['a@b.com', 'c@d.com'], subject: 'Hello', html: '<p>Hi</p>' }),
    });
    const res = await handleBulkEmails(req, makeEnv());
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data.message).toContain('2/2');
  });
});
