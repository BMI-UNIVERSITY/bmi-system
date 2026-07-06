import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from './index';

// Mock the dependencies used by index.ts
vi.mock('@bmi/api-middleware', () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
  requireAuth: vi.fn(),
  withCors: vi.fn().mockImplementation((res) => res),
  getCorsHeaders: vi.fn().mockReturnValue({}),
  createLogger: vi.fn().mockReturnValue({ error: vi.fn(), info: vi.fn() }),
  requestLogger: vi.fn().mockReturnValue({ error: vi.fn(), info: vi.fn() })
}));

vi.mock('./lib/types', () => ({
  error: (msg: string, status: number) => new Response(msg, { status }),
  validateCsrfToken: () => true,
}));

// We only need to mock one or two handlers to test the dispatcher, but 
// since index imports all routes, we should mock them so they don't break.
vi.mock('./routes/auth', () => ({ handleLogin: vi.fn() }));
vi.mock('./routes/admin', () => ({ handleListUsers: vi.fn().mockResolvedValue(new Response('users')) }));
vi.mock('./routes/ums-timetabling', () => ({ handleCreateTimetabling: vi.fn().mockResolvedValue(new Response('created')) }));
vi.mock('./routes/ums-students', () => ({ handleListStudents: vi.fn().mockResolvedValue(new Response('students')) }));

// Note: we can't easily mock everything index imports without a lot of setup,
// but since Vitest hoists vi.mock, we can just let it import the actual modules
// OR we can rely on the fact that we're just testing the dispatcher.

import { requireAuth } from '@bmi/api-middleware';

describe('API Route Dispatcher & Authorization', () => {
  let env: any;
  let ctx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    env = {};
    ctx = { waitUntil: vi.fn() };
  });

  const createRequest = (method: string, path: string) => {
    return new Request(`http://localhost${path}`, { method });
  };

  it('should return 404 for unknown routes', async () => {
    const req = createRequest('GET', '/api/unknown-route');
    const res = await app.fetch(req, env, ctx);
    expect(res.status).toBe(404);
  });

  it('should allow public access to /api/health', async () => {
    const req = createRequest('GET', '/api/health');
    const res = await app.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    // requireAuth should not have been called
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it('should block unauthenticated access to protected routes', async () => {
    vi.mocked(requireAuth).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    
    const req = createRequest('GET', '/api/v1/students');
    const res = await app.fetch(req, env, ctx);
    
    expect(res.status).toBe(401);
    expect(requireAuth).toHaveBeenCalledWith(req, env.DB, env.JWT_SECRET, ['admin', 'staff']);
  });

  it('should block student access to admin routes', async () => {
    // Simulate a student token but requireAuth blocks it because it needs 'admin'
    vi.mocked(requireAuth).mockResolvedValue(new Response('Forbidden', { status: 403 }));
    
    const req = createRequest('GET', '/api/admin/users');
    const res = await app.fetch(req, env, ctx);
    
    expect(res.status).toBe(403);
    expect(requireAuth).toHaveBeenCalledWith(req, env.DB, env.JWT_SECRET, ['admin']);
  });

  it('should allow admin access to timetabling', async () => {
    // Simulate successful auth
    vi.mocked(requireAuth).mockResolvedValue({ user: { sub: 'admin1', role: 'admin' } });
    
    const req = createRequest('POST', '/api/v1/timetabling');
    const res = await app.fetch(req, env, ctx);
    
    // As long as it doesn't return 401/403 (it will either hit the mock or the actual handler which might 500, but auth passed)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(requireAuth).toHaveBeenCalledWith(req, env.DB, env.JWT_SECRET, ['admin', 'staff']);
  });
});
