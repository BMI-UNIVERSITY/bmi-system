import { makeEnv } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleTransitionToAlumni } from './alumni';

describe('Alumni routes — handleTransitionToAlumni', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('transitions a user to alumni role', async () => {
    const req = new Request('http://localhost/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await handleTransitionToAlumni(req, env, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(env.PLATFORM_CONTEXT.identity.updateUser).toHaveBeenCalledWith('user-123', { roles: ['alumni'] });
  });

  it('sets up email forwarding when requested', async () => {
    env.PLATFORM_CONTEXT.identity.getUser.mockResolvedValue({
      id: 'user-123',
      email: 'jane@student.bmi.edu',
      roles: ['student'],
    });

    const req = new Request('http://localhost/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forwardEmail: 'jane@gmail.com' }),
    });
    const res = await handleTransitionToAlumni(req, env, 'user-123');

    expect(res.status).toBe(200);
    expect(env.PLATFORM_CONTEXT.identity.updateUser).toHaveBeenCalledWith('user-123', { roles: ['alumni'] });
    expect(env.PLATFORM_CONTEXT.identity.getUser).toHaveBeenCalledWith('user-123');
  });

  it('does not attempt forwarding when forwardEmail is not provided', async () => {
    const req = new Request('http://localhost/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await handleTransitionToAlumni(req, env, 'user-123');

    expect(res.status).toBe(200);
    expect(env.PLATFORM_CONTEXT.identity.getUser).not.toHaveBeenCalled();
  });

  it('returns 500 when identity provider throws', async () => {
    env.PLATFORM_CONTEXT.identity.updateUser.mockRejectedValue(new Error('Keycloak error'));

    const req = new Request('http://localhost/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await handleTransitionToAlumni(req, env, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
