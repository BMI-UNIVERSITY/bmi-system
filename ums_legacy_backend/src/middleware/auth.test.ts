import { describe, it, expect, vi } from 'vitest';
import { authMiddleware, requireRole } from './auth.js';

vi.mock('../config/index.js', () => ({
  CONFIG: {
    JWT_SECRET: 'test-secret-for-jwt-testing',
  },
}));

describe('Auth Middleware', () => {
  describe('authMiddleware', () => {
    it('should reject requests without Authorization header', async () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(null),
        },
        json: vi.fn().mockReturnValue(new Response()),
      };
      const mockNext = vi.fn();

      await authMiddleware(mockContext as any, mockNext);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
        }),
        401
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests without Bearer token', async () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Basic credentials'),
        },
        json: vi.fn().mockReturnValue(new Response()),
      };
      const mockNext = vi.fn();

      await authMiddleware(mockContext as any, mockNext);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
        }),
        401
      );
    });

    it('should reject invalid tokens', async () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer invalid-token'),
        },
        json: vi.fn().mockReturnValue(new Response()),
      };
      const mockNext = vi.fn();

      await authMiddleware(mockContext as any, mockNext);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid or expired token',
        }),
        401
      );
    });
  });

  describe('requireRole', () => {
    it('should reject when user has insufficient role', async () => {
      const mockContext = {
        get: vi.fn().mockReturnValue({ sub: 'user-id', email: 'user@test.com', role: 'viewer' }),
        json: vi.fn().mockReturnValue(new Response()),
      };
      const mockNext = vi.fn();

      const adminOnly = requireRole('admin');
      await adminOnly(mockContext as any, mockNext);
      
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied: insufficient permissions',
        }),
        403
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow when user has required role', async () => {
      const mockContext = {
        get: vi.fn().mockReturnValue({ sub: 'user-id', email: 'admin@test.com', role: 'admin' }),
        json: vi.fn().mockReturnValue(new Response()),
      };
      const mockNext = vi.fn();

      const adminOnly = requireRole('admin');
      await adminOnly(mockContext as any, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow when user has one of multiple allowed roles', async () => {
      const mockContext = {
        get: vi.fn().mockReturnValue({ sub: 'user-id', email: 'registrar@test.com', role: 'registrar' }),
        json: vi.fn().mockReturnValue(new Response()),
      };
      const mockNext = vi.fn();

      const multiRole = requireRole('admin', 'registrar');
      await multiRole(mockContext as any, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});






