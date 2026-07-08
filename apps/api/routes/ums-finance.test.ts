import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import { handleListTransactions } from './ums-finance';

function makeDB(firstVal: any = { count: 0 }, allResults: any[] = []) {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(firstVal),
        all: vi.fn().mockResolvedValue({ results: allResults }),
      }),
    }),
  };
}

const sampleInvoice = {
  id: 'inv-abc12345',
  student_id: 'u1',
  first_name: 'Alice',
  last_name: 'Smith',
  amount: 1500,
  status: 'unpaid',
  created_at: '2026-07-01',
};

describe('ums-finance routes', () => {
  it('returns all transactions without filter', async () => {
    const db = makeDB({ count: 1 }, [sampleInvoice]);
    const req = new Request('http://localhost/api/finance/transactions');
    const res = await handleListTransactions(req, makeEnv(db));
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[0].studentName).toBe('Alice Smith');
    expect(body.data[0].status).toBe('Pending'); // 'unpaid' → 'Pending'
    expect(body.data[0].type).toBe('Tuition');
    // reference = first 8 chars of UUID uppercased; UUIDs may contain hyphens
    expect(body.data[0].reference).toMatch(/^[A-Z0-9-]{1,8}$/);
  });

  it('maps paid status correctly', async () => {
    const paidInvoice = { ...sampleInvoice, id: 'inv-abcdef12', status: 'paid' };
    const db = makeDB({ count: 1 }, [paidInvoice]);
    const req = new Request('http://localhost/api/finance/transactions');
    const res = await handleListTransactions(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data[0].status).toBe('Paid');
  });

  it('maps unknown status to Failed', async () => {
    const failedInvoice = { ...sampleInvoice, id: 'inv-zzzzzzzz', status: 'cancelled' };
    const db = makeDB({ count: 1 }, [failedInvoice]);
    const req = new Request('http://localhost/api/finance/transactions');
    const res = await handleListTransactions(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data[0].status).toBe('Failed');
  });

  it('filters by paid status using hard-coded clause', async () => {
    const bindMock = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ count: 0 }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
    const req = new Request('http://localhost/api/finance/transactions?status=paid');
    await handleListTransactions(req, makeEnv(db));
    // 'paid' is a hard-coded clause — bindings should NOT include 'paid'
    const allBindArgs = bindMock.mock.calls.flat();
    expect(allBindArgs).not.toContain('paid');
  });

  it('filters by pending (maps to unpaid) status using hard-coded clause', async () => {
    const bindMock = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ count: 0 }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
    const req = new Request('http://localhost/api/finance/transactions?status=pending');
    await handleListTransactions(req, makeEnv(db));
    const allBindArgs = bindMock.mock.calls.flat();
    expect(allBindArgs).not.toContain('pending');
  });

  it('filters by custom status using parameterized binding', async () => {
    const bindMock = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ count: 0 }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
    const req = new Request('http://localhost/api/finance/transactions?status=overdue');
    await handleListTransactions(req, makeEnv(db));
    expect(bindMock.mock.calls.some((args: any[]) => args.includes('overdue'))).toBe(true);
  });

  it('handles null student name gracefully', async () => {
    const noNameInvoice = { ...sampleInvoice, first_name: null, last_name: null };
    const db = makeDB({ count: 1 }, [noNameInvoice]);
    const req = new Request('http://localhost/api/finance/transactions');
    const res = await handleListTransactions(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data[0].studentName).toBe('Unknown Student');
  });

  it('returns correct pagination metadata', async () => {
    const db = makeDB({ count: 55 }, []);
    const req = new Request('http://localhost/api/finance/transactions?page=2&perPage=10');
    const res = await handleListTransactions(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.page).toBe(2);
    expect(body.perPage).toBe(10);
    expect(body.total).toBe(55);
    expect(body.totalPages).toBe(6);
  });

  it('caps perPage at 100', async () => {
    const bindMock = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ count: 0 }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
    const req = new Request('http://localhost/api/finance/transactions?perPage=9999');
    const res = await handleListTransactions(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.perPage).toBe(100);
  });
});
