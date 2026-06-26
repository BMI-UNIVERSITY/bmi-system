import { describe, it, expect, vi } from 'vitest';
import certificatesRouter from './certificates.js';

const getPocketBaseMock = vi.fn();
vi.mock('../services/pocketbase.js', () => ({
  getPocketBase: () => getPocketBaseMock(),
}));

const mockFacultyUser = { sub: 'u1', email: 'faculty@example.com', role: 'faculty' };

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('user', mockFacultyUser);
    await next();
  },
  optionalAuthMiddleware: async (c: any, next: any) => {
    const auth = c.req.header('Authorization');
    if (auth?.startsWith('Bearer ')) c.set('user', mockFacultyUser);
    await next();
  },
  requireRole: (...allowedRoles: string[]) => {
    return async (c: any, next: any) => {
      const user = c.get('user');
      if (!user) return c.json({ success: false, error: 'Authentication required' }, 401);
      if (!allowedRoles.includes(user.role)) return c.json({ success: false, error: 'Access denied: insufficient permissions' }, 403);
      await next();
    };
  },
  getUser: (c: any) => c.get('user'),
}));

vi.mock('../middleware/audit.js', () => ({
  optionalAuditMiddleware: undefined,
  auditMiddleware: async (_c: any, next: any) => next(),
  logAction: () => async (_c: any, next: any) => next(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  auditLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('Certificates route behavior', () => {
  it('POST /verify rejects invalid serial format with INVALID_FORMAT', async () => {
    const req = new Request('http://localhost/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial: 'NOT_A_SERIAL' }),
    });

    const res = await certificatesRouter.fetch(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.code).toBe('INVALID_FORMAT');
  });

  it('GET /certificates is role-gated (faculty gets 403)', async () => {
    const req = new Request('http://localhost/', {
      method: 'GET',
      headers: { Authorization: 'Bearer test' },
    });

    const res = await certificatesRouter.fetch(req);
    expect(res.status).toBe(403);
  });
});







