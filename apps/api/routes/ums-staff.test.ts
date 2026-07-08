import { describe, it, expect, vi } from 'vitest';
import {
  handleListStaff,
  handleGetStaff,
  handleCreateStaff,
  handleUpdateStaff,
} from './ums-staff';

function makeDB(overrides: Partial<{ first: any; all: any; run: any }> = {}) {
  const firstMock = vi.fn().mockResolvedValue(overrides.first ?? null);
  const allMock = vi.fn().mockResolvedValue({ results: overrides.all ?? [] });
  const runMock = vi.fn().mockResolvedValue({ meta: { changes: 1 } });

  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: firstMock, all: allMock, run: runMock }),
      first: firstMock,
      all: allMock,
    }),
    _first: firstMock,
    _all: allMock,
    _run: runMock,
  };
}

describe('ums-staff routes', () => {
  it('handleListStaff returns paginated staff list', async () => {
    const db = makeDB({ all: [{ user_id: 'u1', first_name: 'Bob', last_name: 'Smith', total: 1 }] });
    db.prepare = vi.fn().mockImplementation((q: string) => ({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ total: 1 }),
        all: vi.fn().mockResolvedValue({ results: [{ user_id: 'u1' }] }),
        run: vi.fn(),
      }),
    }));

    const req = new Request('http://localhost/api/staff?page=1&perPage=10');
    const res = await handleListStaff(req, { DB: db as any } as any);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('page');
  });

  it('handleListStaff supports search filter', async () => {
    const bindMock = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ total: 0 }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
    const req = new Request('http://localhost/api/staff?search=Alice');
    await handleListStaff(req, { DB: db as any } as any);
    // Verify search param is bound correctly (3 times for OR clauses)
    const firstCallArgs = bindMock.mock.calls[0];
    expect(firstCallArgs).toContain('%Alice%');
  });

  it('handleGetStaff returns 404 for unknown staff', async () => {
    const db = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }) }) };
    const req = new Request('http://localhost/api/staff/nobody');
    const res = await handleGetStaff(req, { DB: db as any } as any, 'nobody');
    expect(res.status).toBe(404);
  });

  it('handleGetStaff returns found staff', async () => {
    const staffData = { user_id: 'u1', first_name: 'Alice', staff_no: 'S001' };
    const db = { prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(staffData) }) }) };
    const req = new Request('http://localhost/api/staff/u1');
    const res = await handleGetStaff(req, { DB: db as any } as any, 'u1');
    const body = await res.json() as any;
    expect(body.data.first_name).toBe('Alice');
  });

  it('handleCreateStaff returns 400 if required fields missing', async () => {
    const db = makeDB();
    const req = new Request('http://localhost/api/staff', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com' }), // missing first_name, last_name, staff_no
    });
    const res = await handleCreateStaff(req, { DB: db as any } as any);
    expect(res.status).toBe(400);
  });

  it('handleCreateStaff creates new user and staff record', async () => {
    const db = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null), // no existing user
          run: vi.fn().mockResolvedValue({}),
        }),
      }))
    };
    const req = new Request('http://localhost/api/staff', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@bmi.edu', first_name: 'Alice', last_name: 'Smith', staff_no: 'S001' }),
    });
    const res = await handleCreateStaff(req, { DB: db as any } as any);
    expect(res.status).toBe(201);
  });

  it('handleUpdateStaff returns 404 if staff not found', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) })
      })
    };
    const req = new Request('http://localhost/api/staff/nobody', {
      method: 'PUT',
      body: JSON.stringify({ first_name: 'New' }),
    });
    const res = await handleUpdateStaff(req, { DB: db as any } as any, 'nobody');
    expect(res.status).toBe(404);
  });

  it('handleUpdateStaff updates staff and user fields', async () => {
    const db = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ user_id: 'u1' }),
          run: vi.fn().mockResolvedValue({}),
        }),
      }))
    };
    const req = new Request('http://localhost/api/staff/u1', {
      method: 'PUT',
      body: JSON.stringify({ first_name: 'Updated', designation: 'Professor' }),
    });
    const res = await handleUpdateStaff(req, { DB: db as any } as any, 'u1');
    expect(res.status).toBe(200);
  });
});
