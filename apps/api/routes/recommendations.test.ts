import { makeEnv, makeDrizzleMock } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleRequestRecommendation,
  handleGetRecommendationInfo,
  handleListRecommendations,
} from './recommendations';

vi.mock('../lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined), buildEmailLayout: vi.fn().mockReturnValue('<html></html>') }));
vi.mock('../lib/config', () => ({ getPortalUrl: vi.fn().mockReturnValue('https://portal.test') }));
vi.mock('../lib/db', () => ({ createCoreDb: vi.fn() }));

import { createCoreDb } from '../lib/db';

describe('recommendations routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handleRequestRecommendation returns 404 if application not found', async () => {
    const drizzle = makeDrizzleMock([null]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost/api/recommendations', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'bob@uni.edu' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(), 'app1', 'user1');
    expect(res.status).toBe(404);
  });

  it('handleRequestRecommendation returns 400 if at 3 recommendations', async () => {
    const drizzle = makeDrizzleMock([
      { id: 'app1', program: 'CS' },   // app found
      { count: 3 },                    // count check
    ]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'bob@uni.edu' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(), 'app1', 'user1');
    expect(res.status).toBe(400);
  });

  it('handleRequestRecommendation returns 400 if referee email invalid', async () => {
    const drizzle = makeDrizzleMock([{ id: 'app1', program: 'CS' }, { count: 1 }]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'not-an-email' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(), 'app1', 'user1');
    expect(res.status).toBe(400);
  });

  it('handleRequestRecommendation returns 409 if email already requested', async () => {
    const drizzle = makeDrizzleMock([
      { id: 'app1', program: 'CS' },
      { count: 1 },
      { id: 'existing-req' },   // existingRec
    ]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'bob@uni.edu' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(), 'app1', 'user1');
    expect(res.status).toBe(409);
  });

  it('handleRequestRecommendation creates recommendation request successfully', async () => {
    const drizzle = makeDrizzleMock([
      { id: 'app1', program: 'CS' },            // app found
      { count: 0 },                              // count check
      null,                                      // no existing request
      { first_name: 'Alice', last_name: 'Smith' }, // applicant
    ]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ referee_name: 'Dr. Bob', referee_email: 'bob@uni.edu' }),
    });
    const res = await handleRequestRecommendation(req, makeEnv(), 'app1', 'user1');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.status).toBe('requested');
  });

  it('handleGetRecommendationInfo returns 404 for invalid token', async () => {
    const drizzle = makeDrizzleMock([null]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const res = await handleGetRecommendationInfo(
      new Request('http://localhost'),
      makeEnv(),
      'invalid-token'
    );
    expect(res.status).toBe(404);
  });

  it('handleGetRecommendationInfo returns 410 for expired link (>30 days)', async () => {
    const oldDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();
    const drizzle = makeDrizzleMock([{ id: 'r1', requested_at: oldDate }]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const res = await handleGetRecommendationInfo(
      new Request('http://localhost'),
      makeEnv(),
      'some-token'
    );
    expect(res.status).toBe(410);
  });

  it('handleGetRecommendationInfo returns rec info for valid token', async () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const drizzle = makeDrizzleMock([{ id: 'r1', referee_name: 'Dr. Bob', status: 'requested', requested_at: recentDate }]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const res = await handleGetRecommendationInfo(
      new Request('http://localhost'),
      makeEnv(),
      'valid-token'
    );
    expect(res.status).toBe(200);
  });

  it('handleListRecommendations returns 404 if application not found', async () => {
    const drizzle = makeDrizzleMock([null]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost');
    const res = await handleListRecommendations(req, makeEnv(), 'app1', 'user1');
    expect(res.status).toBe(404);
  });

  it('handleListRecommendations returns recommendations list', async () => {
    const recs = [{ id: 'r1', referee_name: 'Dr. Bob', status: 'requested' }];
    const drizzle = makeDrizzleMock([{ id: 'app1' }], [recs]);
    vi.mocked(createCoreDb).mockReturnValue(drizzle);
    const req = new Request('http://localhost');
    const res = await handleListRecommendations(req, makeEnv(), 'app1', 'user1');
    const body = await res.json() as any;
    expect(body.data[0].referee_name).toBe('Dr. Bob');
  });
});
