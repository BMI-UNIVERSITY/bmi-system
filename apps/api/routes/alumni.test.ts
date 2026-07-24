import { makeEnv, makeChainDB } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import { handleTransitionToAlumni } from './alumni';

describe('Alumni routes — handleTransitionToAlumni', () => {
  it('transitions a user to alumni role via direct D1 update', async () => {
    const db = makeChainDB();
    const env = makeEnv(db);

    const req = new Request('http://localhost/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: 'student-456' }),
    });
    const res = await handleTransitionToAlumni(req, env, 'admin-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('sets up email forwarding when requested', async () => {
    const db = makeChainDB(
      [{ email: 'jane@student.bmi.edu' }]
    );
    const env = makeEnv(db);

    const req = new Request('http://localhost/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: 'student-456', forwardEmail: 'jane@gmail.com' }),
    });
    const res = await handleTransitionToAlumni(req, env, 'admin-123');

    expect(res.status).toBe(200);
  });

  it('does not attempt forwarding when forwardEmail is not provided', async () => {
    const db = makeChainDB();
    const env = makeEnv(db);

    const req = new Request('http://localhost/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: 'student-456' }),
    });
    const res = await handleTransitionToAlumni(req, env, 'admin-123');

    expect(res.status).toBe(200);
  });

  it('returns 500 when db query fails', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }),
    };
    const env = makeEnv(db);

    const req = new Request('http://localhost/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: 'student-456' }),
    });
    const res = await handleTransitionToAlumni(req, env, 'admin-123');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
