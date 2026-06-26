import { describe, it, expect, vi } from 'vitest';
import financeRouter from './finance.js';

const getPocketBaseMock = vi.fn();

vi.mock('../services/pocketbase.js', () => ({
  getPocketBase: () => getPocketBaseMock(),
}));

const mockUser = { sub: 'u1', email: 'student@example.com', role: 'student', studentId: 'STU-1' };

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('user', mockUser);
    await next();
  },
  requireRole: (...allowedRoles: string[]) => {
    return async (c: any, next: any) => {
      const user = c.get('user');
      if (!user) return c.json({ success: false, error: 'Authentication required' }, 401);
      if (!allowedRoles.includes(user.role)) {
        return c.json({ success: false, error: 'Access denied: insufficient permissions' }, 403);
      }
      await next();
    };
  },
  getUser: (c: any) => c.get('user'),
}));

vi.mock('../middleware/audit.js', () => ({
  auditMiddleware: async (_c: any, next: any) => next(),
  logAction: () => async (_c: any, next: any) => next(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('Finance route behavior', () => {
  it('GET /api/v1/finance/transactions filters by studentId for student role', async () => {
    const getListMock = vi.fn().mockResolvedValue({
      items: [{ id: 't1', student_id: 'STU-1', ref: 'TX-1', name: 'Tuition', desc: '', amt: 1000, status: 'Paid', date: '2024-01-01' }],
      page: 1,
      perPage: 20,
      totalItems: 1,
    });

    getPocketBaseMock.mockReturnValue({
      collection: () => ({
        getList: getListMock,
      }),
    });

    const req = new Request('http://localhost/transactions', { method: 'GET' });
    const res = await financeRouter.fetch(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.meta.page).toBe(1);

    const callArgs = getListMock.mock.calls[0];
    expect(callArgs[0]).toBe(1); // page
    expect(callArgs[1]).toBe(20); // perPage
    expect(callArgs[2]?.filter).toContain(`student_id = "STU-1"`);
  });
});







