/**
 * BMI API – Grades Contract Tests
 *
 * Validates that every response from the grades endpoints conforms to the
 * agreed contract expected by the UMS frontend:
 *
 *   LIST  GET /api/ums/grades
 *     → { success: true, data: { items: Grade[], page, perPage, total } }
 *     - "total" field present, "totalItems" field ABSENT (was removed in Task 4)
 *
 *   POST  POST /api/ums/grades
 *     → { success: true, data: Grade }  (201)
 *
 *   PATCH PATCH /api/ums/grades/:id
 *     → { success: true, data: Grade }
 *
 *   ERROR responses
 *     → { success: false, error: string }
 *
 * Grade items include computed fields: letter_grade, grade_point.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import {
  handleListGrades,
  handleCreateGrade,
  handleUpdateGrade,
} from './ums-grades';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeReq(
  path: string,
  method = 'GET',
  body?: Record<string, unknown>,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function parseJson(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

// ─── LIST grades ──────────────────────────────────────────────────────────────

describe('GET /api/ums/grades – pagination contract', () => {
  it('returns HTTP 200', async () => {
    const res = await handleListGrades(makeReq('/api/ums/grades'), env);
    expect(res.status).toBe(200);
  });

  it('response envelope: { success: true, data: {...} }', async () => {
    const res = await handleListGrades(makeReq('/api/ums/grades'), env);
    const body = await parseJson(res);

    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');
  });

  it('data contains required pagination fields: items, page, perPage, total', async () => {
    const res = await handleListGrades(makeReq('/api/ums/grades'), env);
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;

    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('perPage');
    expect(data).toHaveProperty('total');
    expect(typeof data.page).toBe('number');
    expect(typeof data.perPage).toBe('number');
    expect(typeof data.total).toBe('number');
  });

  it('does NOT include legacy "totalItems" field (removed in Task 4)', async () => {
    const res = await handleListGrades(makeReq('/api/ums/grades'), env);
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;

    // This is the critical regression guard — the old API had both total and totalItems.
    // Frontend had a workaround that copied totalItems → total. Now we must have total only.
    expect(data).not.toHaveProperty('totalItems');
    expect(data).toHaveProperty('total');
  });

  it('respects ?page and ?perPage query params', async () => {
    const res = await handleListGrades(
      makeReq('/api/ums/grades?page=1&perPage=10'),
      env,
    );
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;

    expect(data.page).toBe(1);
    expect(data.perPage).toBe(10);
    expect((data.items as unknown[]).length).toBeLessThanOrEqual(10);
  });

  it('grade items include computed letter_grade and grade_point fields', async () => {
    const res = await handleListGrades(makeReq('/api/ums/grades'), env);
    const body = await parseJson(res);
    const items = (body.data as Record<string, unknown>).items as Record<string, unknown>[];

    if (items.length === 0) return; // no grades in DB yet — skip

    const grade = items[0];
    expect(grade).toHaveProperty('letter_grade');
    expect(grade).toHaveProperty('grade_point');
  });

  it('grade items use snake_case field names', async () => {
    const res = await handleListGrades(makeReq('/api/ums/grades'), env);
    const body = await parseJson(res);
    const items = (body.data as Record<string, unknown>).items as Record<string, unknown>[];

    if (items.length === 0) return;

    const grade = items[0];
    // snake_case expected
    expect(grade).toHaveProperty('enrollment_id');
    expect(grade).toHaveProperty('assessment_type');
    // camelCase must NOT appear
    expect(grade).not.toHaveProperty('enrollmentId');
    expect(grade).not.toHaveProperty('assessmentType');
  });

  it('filters by ?studentId query param', async () => {
    const res = await handleListGrades(
      makeReq('/api/ums/grades?studentId=NONEXISTENT'),
      env,
    );
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;

    expect(body.success).toBe(true);
    expect((data.items as unknown[]).length).toBe(0);
    expect(data.total).toBe(0);
  });
});

// ─── CREATE grade ─────────────────────────────────────────────────────────────

describe('POST /api/ums/grades – creation contract', () => {
  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('/api/ums/grades', 'POST', { assessment_type: 'Quiz' });
    const res = await handleCreateGrade(req, env, 'staff-id-123');
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  it('returns 404 when enrollment_id does not exist', async () => {
    const req = makeReq('/api/ums/grades', 'POST', {
      enrollment_id: 'non-existent-enrollment',
      assessment_type: 'Quiz',
      score: 80,
      max_score: 100,
    });
    const res = await handleCreateGrade(req, env, 'staff-id-123');
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
  });
});

// ─── UPDATE grade ─────────────────────────────────────────────────────────────

describe('PATCH /api/ums/grades/:id – update contract', () => {
  it('returns 400 when no valid fields provided', async () => {
    const res = await handleUpdateGrade(
      makeReq('/api/ums/grades/any-id', 'PATCH', {}),
      env,
      'any-id',
    );
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error');
  });

  it('returns 404 for unknown grade id', async () => {
    const res = await handleUpdateGrade(
      makeReq('/api/ums/grades/NO-SUCH-GRADE', 'PATCH', { score: 90 }),
      env,
      'NO-SUCH-GRADE',
    );
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
  });
});

// ─── response shape regression guard ─────────────────────────────────────────

describe('Grades response shape – regression guard', () => {
  it('top-level envelope never has totalItems (legacy field removed)', async () => {
    const res = await handleListGrades(makeReq('/api/ums/grades'), env);
    const body = await parseJson(res);
    // Direct check on the raw JSON string for belt-and-suspenders
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('"totalItems"');
  });

  it('top-level envelope always has success boolean', async () => {
    const res = await handleListGrades(makeReq('/api/ums/grades'), env);
    const body = await parseJson(res);
    expect(typeof body.success).toBe('boolean');
  });
});
