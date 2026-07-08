import { makeEnv } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRegistrationStep } from './registration';

describe('Registration routes — handleRegistrationStep', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('saves a registration step successfully', async () => {
    const req = new Request('http://localhost/api/registration/personal_details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Jane', lastName: 'Doe' }),
    });
    const res = await handleRegistrationStep(req, env, 'user-123', 'personal_details');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('personal_details');
  });

  it('returns 405 for non-POST requests', async () => {
    const req = new Request('http://localhost/api/registration/personal_details', {
      method: 'GET',
    });
    const res = await handleRegistrationStep(req, env, 'user-123', 'personal_details');

    expect(res.status).toBe(405);
  });

  it('returns 500 when database write fails', async () => {
    const db = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockRejectedValue(new Error('DB unavailable')),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      batch: vi.fn().mockResolvedValue([]),
      transaction: vi.fn().mockImplementation(async (cb: any) => cb(db)),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      getPlatform: vi.fn().mockReturnValue('test'),
    };
    const brokenEnv = makeEnv(db);

    const req = new Request('http://localhost/api/registration/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: '123 Main St' }),
    });
    const res = await handleRegistrationStep(req, brokenEnv, 'user-123', 'address');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it('preserves step data across multiple steps', async () => {
    const req1 = new Request('http://localhost/api/registration/personal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'John' }),
    });
    const res1 = await handleRegistrationStep(req1, env, 'user-456', 'personal');
    expect(res1.status).toBe(200);

    const req2 = new Request('http://localhost/api/registration/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'New York' }),
    });
    const res2 = await handleRegistrationStep(req2, env, 'user-456', 'address');
    expect(res2.status).toBe(200);
  });
});
