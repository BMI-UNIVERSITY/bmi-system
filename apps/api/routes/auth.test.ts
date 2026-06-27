import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { handleLogin } from './auth';

describe('Auth Routes', () => {
  it('should reject invalid credentials', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'fake@example.com', password: 'wrong' })
    });
    const res = await handleLogin(req, env);
    expect(res.status).toBe(401);
  });
});
