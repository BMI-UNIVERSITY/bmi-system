import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { handleListUsers } from './admin';

describe('Admin Routes', () => {
  it('should handle list users', async () => {
    const req = new Request('http://localhost/api/admin/users');
    const res = await handleListUsers(req, env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
