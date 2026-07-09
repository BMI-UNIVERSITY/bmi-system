import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import {
  handleRequestRecommendation,
  handleGetRecommendationInfo,
  handleListRecommendations,
} from './recommendations';

vi.mock('../lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined), buildEmailLayout: vi.fn().mockReturnValue('<html></html>') }));
vi.mock('../lib/config', () => ({ getPortalUrl: vi.fn().mockReturnValue('https://portal.test') }));

function makeDB(sequence: Array<any>) {
  let callIndex = 0;
  return {
    prepare: vi.fn().mockImplementation(() => {
      const val = sequence[callIndex++ % sequence.length];
      if (val && typeof val === 'object' && 'run' in val) {
        return { bind: vi.fn().mockReturnValue({ ...val }) };
      }
      return {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(val),
          all: vi.fn().mockResolvedValue({ results: Array.isArray(val) ? val : [] }),
          run: vi.fn().mockResolvedValue({}),
        }),
      };
    }),
  };
}

describe('recommendations routes', () => {
  it('handleRequestRecommendation returns 404 if application not found', async () => {
    const db = makeDB([null]);
    const req = new Request('http://localhost/api/recommendations', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'bob@uni.edu' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(db), 'app1', 'user1');
    expect(res.status).toBe(404);
  });

  it('handleRequestRecommendation returns 400 if at 3 recommendations', async () => {
    const db = makeDB([
      { id: 'app1', program: 'CS' },    // app found
      { count: 3 },                     // count check
    ]);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'bob@uni.edu' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(db), 'app1', 'user1');
    expect(res.status).toBe(400);
  });

  it('handleRequestRecommendation returns 400 if referee email invalid', async () => {
    const db = makeDB([
      { id: 'app1', program: 'CS' },
      { count: 1 },
    ]);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'not-an-email' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(db), 'app1', 'user1');
    expect(res.status).toBe(400);
  });

  it('handleRequestRecommendation returns 409 if email already requested', async () => {
    const db = makeDB([
      { id: 'app1', program: 'CS' },
      { count: 1 },
      { id: 'existing-req' }, // existingRec
    ]);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'bob@uni.edu' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(db), 'app1', 'user1');
    expect(res.status).toBe(409);
  });

  it('handleRequestRecommendation creates recommendation request successfully', async () => {
    const db = makeDB([
      { id: 'app1', program: 'CS' },  // app found
      { count: 0 },                   // count check
      null,                           // no existing request
      undefined,                      // insert
      { first_name: 'Alice', last_name: 'Smith' }, // applicant
    ]);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'bob@uni.edu' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(db), 'app1', 'user1');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.status).toBe('requested');
  });

  it('handleGetRecommendationInfo returns 404 for invalid token', async () => {
    const db = makeDB([null]);
    const res = await handleGetRecommendationInfo(
      new Request('http://localhost'),
      makeEnv(db),
      'invalid-token'
    );
    expect(res.status).toBe(404);
  });

  it('handleGetRecommendationInfo returns 410 for expired link (> 30 days)', async () => {
    const oldDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();
    const db = makeDB([{ id: 'r1', requested_at: oldDate }]);
    const res = await handleGetRecommendationInfo(
      new Request('http://localhost'),
      makeEnv(db),
      'some-token'
    );
    expect(res.status).toBe(410);
  });

  it('handleGetRecommendationInfo returns rec info for valid token', async () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const recData = { id: 'r1', referee_name: 'Dr. Bob', status: 'requested', requested_at: recentDate };
    const db = makeDB([recData]);
    const res = await handleGetRecommendationInfo(
      new Request('http://localhost'),
      makeEnv(db),
      'valid-token'
    );
    expect(res.status).toBe(200);
  });

  it('handleListRecommendations returns 404 if application not found', async () => {
    const db = makeDB([null]);
    const req = new Request('http://localhost');
    const res = await handleListRecommendations(req, makeEnv(db), 'app1', 'user1');
    expect(res.status).toBe(404);
  });

  it('handleListRecommendations returns recommendations list', async () => {
    const db = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'app1' }),
          all: vi.fn().mockResolvedValue({ results: [{ id: 'r1', referee_name: 'Dr. Bob', status: 'requested' }] }),
        }),
      }))
    };
    const req = new Request('http://localhost');
    const res = await handleListRecommendations(req, makeEnv(db), 'app1', 'user1');
    const body = await res.json() as any;
    expect(body.data[0].referee_name).toBe('Dr. Bob');
  });
});
