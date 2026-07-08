import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import {
  handleGetRevenueTrend,
} from './ums-dashboard';

function makeDB(firstResult: any = { revenue: 500 }) {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(firstResult) }),
    }),
  };
}

describe('ums-dashboard routes', () => {
  it('handleGetRevenueTrend returns N months of revenue', async () => {
    const db = makeDB({ revenue: 1000 });
    const req = new Request('http://localhost/api/dashboard/revenue?months=3');
    const res = await handleGetRevenueTrend(req, makeEnv(db));
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toHaveProperty('month');
    expect(body.data[0]).toHaveProperty('revenue', 1000);
  });

  it('handleGetRevenueTrend defaults to 6 months', async () => {
    const db = makeDB({ revenue: 0 });
    const req = new Request('http://localhost/api/dashboard/revenue');
    const res = await handleGetRevenueTrend(req, makeEnv(db));
    const body = await res.json() as any;

    expect(body.data).toHaveLength(6);
  });

  it('handleGetRevenueTrend handles null revenue (no paid invoices)', async () => {
    const db = makeDB(null);
    const req = new Request('http://localhost/api/dashboard/revenue?months=2');
    const res = await handleGetRevenueTrend(req, makeEnv(db));
    const body = await res.json() as any;

    expect(body.success).toBe(true);
    expect(body.data[0].revenue).toBe(0);
  });
});
