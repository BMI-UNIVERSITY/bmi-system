import { describe, it, expect, vi } from 'vitest';
import { makeEnv } from './test-helpers';
import {
  handleGetStudentStanding,
  handleGetCurrentStanding,
  handleAdminListStanding,
  handleComputeStanding,
  handleListStandingRules,
} from './academic_standing';

// ─── DB mock builder ──────────────────────────────────────────────────────────

function makeSequentialDB(sequence: Array<{ first?: any; all?: any; run?: any }>) {
  let idx = 0;
  return {
    prepare: vi.fn().mockImplementation(() => {
      const step = sequence[idx++ % Math.max(sequence.length, 1)] ?? {};
      return {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(step.first ?? null),
          all: vi.fn().mockResolvedValue({ results: step.all ?? [], meta: {} }),
          run: vi.fn().mockResolvedValue({ meta: { changes: step.run?.changes ?? 0 } }),
        }),
        first: vi.fn().mockResolvedValue(step.first ?? null),
        all: vi.fn().mockResolvedValue({ results: step.all ?? [] }),
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      };
    }),
    batch: vi.fn().mockResolvedValue([]),
  };
}

// ─── handleGetStudentStanding ─────────────────────────────────────────────────

describe('handleGetStudentStanding', () => {
  it('returns standing history for admin', async () => {
    const records = [
      { id: 'r1', student_id: 'u1', term_id: 't1', standing: 'good', term_gpa: 3.5, cumulative_gpa: 3.5 },
      { id: 'r2', student_id: 'u1', term_id: 't2', standing: 'warning', term_gpa: 1.8, cumulative_gpa: 2.6 },
    ];
    const db = makeSequentialDB([{ all: records }]);
    const req = new Request('http://localhost/api/v1/students/u1/standing');
    const res = await handleGetStudentStanding(req, makeEnv(db), 'u1', 'admin-user', 'admin');
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data.standing_history).toHaveLength(2);
    expect(body.data.count).toBe(2);
  });

  it('returns 403 if student tries to access another student', async () => {
    const db = makeSequentialDB([{ all: [] }]);
    const req = new Request('http://localhost/api/v1/students/u2/standing');
    const res = await handleGetStudentStanding(req, makeEnv(db), 'u2', 'u1-is-requester', 'student');
    expect(res.status).toBe(403);
  });

  it('allows student to view their own standing', async () => {
    const records = [{ id: 'r1', student_id: 'u1', standing: 'good', term_gpa: 3.2 }];
    const db = makeSequentialDB([{ all: records }]);
    const req = new Request('http://localhost/api/v1/students/u1/standing');
    const res = await handleGetStudentStanding(req, makeEnv(db), 'u1', 'u1', 'student');
    expect(res.status).toBe(200);
  });
});

// ─── handleGetCurrentStanding ─────────────────────────────────────────────────

describe('handleGetCurrentStanding', () => {
  it('returns default good standing when no records exist', async () => {
    const db = makeSequentialDB([{ first: null }]);
    const req = new Request('http://localhost/api/v1/students/u1/standing/current');
    const res = await handleGetCurrentStanding(req, makeEnv(db), 'u1', 'u1', 'student');
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data.standing).toBe('good');
    expect(body.data.message).toBeDefined();
  });

  it('returns most recent record when records exist', async () => {
    const db = makeSequentialDB([{ first: { id: 'r1', standing: 'probation', term_gpa: 1.6, term_name: 'Fall 2026' } }]);
    const req = new Request('http://localhost/api/v1/students/u1/standing/current');
    const res = await handleGetCurrentStanding(req, makeEnv(db), 'u1', 'u1', 'student');
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data.standing).toBe('probation');
    expect(body.data.term_gpa).toBe(1.6);
  });

  it('returns 403 if student accesses another student', async () => {
    const db = makeSequentialDB([{ first: null }]);
    const req = new Request('http://localhost/api/v1/students/u99/standing/current');
    const res = await handleGetCurrentStanding(req, makeEnv(db), 'u99', 'u1', 'student');
    expect(res.status).toBe(403);
  });
});

// ─── handleAdminListStanding ──────────────────────────────────────────────────

describe('handleAdminListStanding', () => {
  it('lists students with non-good standing by default', async () => {
    const students = [
      { student_id: 'u1', standing: 'probation', term_gpa: 1.6, email: 's@bmi.edu', reg_no: 'BMI/001' },
    ];
    const db = makeSequentialDB([
      { all: students },
      { all: [{ total: 1 }] },
    ]);
    const req = new Request('http://localhost/api/v1/admin/standing');
    const res = await handleAdminListStanding(req, makeEnv(db));
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data.data).toHaveLength(1);
    expect(body.data.meta.total).toBe(1);
  });

  it('supports filtering by standing level', async () => {
    const db = makeSequentialDB([
      { all: [] },
      { all: [{ total: 0 }] },
    ]);
    const req = new Request('http://localhost/api/v1/admin/standing?standing=suspended');
    const res = await handleAdminListStanding(req, makeEnv(db));
    expect(res.status).toBe(200);
  });

  it('applies pagination', async () => {
    const db = makeSequentialDB([
      { all: [] },
      { all: [{ total: 25 }] },
    ]);
    const req = new Request('http://localhost/api/v1/admin/standing?page=2&perPage=10');
    const res = await handleAdminListStanding(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data.meta.page).toBe(2);
    expect(body.data.meta.perPage).toBe(10);
  });
});

// ─── handleComputeStanding ────────────────────────────────────────────────────

describe('handleComputeStanding', () => {
  it('returns 400 if term_id is missing', async () => {
    const db = makeSequentialDB([]);
    const req = new Request('http://localhost/api/v1/admin/standing/compute', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await handleComputeStanding(req, makeEnv(db));
    expect(res.status).toBe(400);
  });

  it('returns 404 if term not found', async () => {
    const db = makeSequentialDB([{ first: null }]);
    const req = new Request('http://localhost/api/v1/admin/standing/compute', {
      method: 'POST',
      body: JSON.stringify({ term_id: 'non-existent-term' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await handleComputeStanding(req, makeEnv(db));
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON', async () => {
    const db = makeSequentialDB([]);
    const req = new Request('http://localhost/api/v1/admin/standing/compute', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await handleComputeStanding(req, makeEnv(db));
    expect(res.status).toBe(400);
  });

  it('runs dry_run and returns preview without writing', async () => {
    // term found, then rules, then no students enrolled → dry run returns processed=0
    const db = makeSequentialDB([
      { first: { id: 't1', name: 'Fall 2026' } },  // term lookup
      { all: [{ rule_name: 'Good Standing', standing: 'good', min_gpa: 2.0, is_active: 1 }] }, // rules
      { all: [] },  // no enrolled students
    ]);
    const req = new Request('http://localhost/api/v1/admin/standing/compute', {
      method: 'POST',
      body: JSON.stringify({ term_id: 't1', dry_run: true }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await handleComputeStanding(req, makeEnv(db));
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data.dry_run).toBe(true);
    expect(body.data.processed).toBe(0);
  });
});

// ─── handleListStandingRules ──────────────────────────────────────────────────

describe('handleListStandingRules', () => {
  it('returns all standing rules ordered by severity', async () => {
    const rules = [
      { id: 'r1', rule_name: 'Good Standing', standing: 'good', min_gpa: 2.0, is_active: 1 },
      { id: 'r2', rule_name: 'Academic Warning', standing: 'warning', min_gpa: 1.75, is_active: 1 },
      { id: 'r3', rule_name: 'Probation', standing: 'probation', min_gpa: 1.5, is_active: 1 },
    ];
    const db = makeSequentialDB([{ all: rules }]);
    const req = new Request('http://localhost/api/v1/admin/standing/rules');
    const res = await handleListStandingRules(req, makeEnv(db));
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(3);
  });
});
