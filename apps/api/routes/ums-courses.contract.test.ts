/**
 * BMI API – Courses Contract Tests
 *
 * Validates that every response from the courses/programs/faculties/departments
 * endpoints conforms to the agreed contract expected by the UMS frontend.
 *
 * Paginated list endpoints:
 *   GET /api/ums/courses        → { success, data: { items, page, perPage, total } }
 *   GET /api/ums/programs       → { success, data: { items, page, perPage, total } }
 *
 * Non-paginated list endpoints (simple arrays):
 *   GET /api/ums/faculties      → { success, data: Faculty[] }
 *   GET /api/ums/departments    → { success, data: Department[] }
 *   GET /api/ums/terms          → { success, data: Term[] }
 *   GET /api/ums/enrollments    → { success, data: Enrollment[] }
 *
 * Mutating endpoints:
 *   POST   /api/ums/courses       → 201, { success: true, data: Course }
 *   PATCH  /api/ums/courses/:id   → 200, { success: true, data: Course }
 *   DELETE /api/ums/courses/:id   → 200, { success: true, data: { deleted: true } }
 *   POST   /api/ums/enrollments   → 201, { success: true, data: Enrollment }
 *
 * Error responses always use:
 *   { success: false, error: string }
 */

import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import {
  handleListUmsCourses,
  handleCreateCourse,
  handleUpdateCourse,
  handleDeleteCourse,
  handleListPrograms,
  handleListFaculties,
  handleListDepartments,
  handleListTerms,
  handleListEnrollments,
  handleCreateEnrollment,
} from './ums-courses';

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

// ─── LIST courses (paginated) ─────────────────────────────────────────────────

describe('GET /api/ums/courses – pagination contract', () => {
  it('returns HTTP 200', async () => {
    const res = await handleListUmsCourses(makeReq('/api/ums/courses'), env);
    expect(res.status).toBe(200);
  });

  it('response envelope: { success: true, data: {...} }', async () => {
    const res = await handleListUmsCourses(makeReq('/api/ums/courses'), env);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });

  it('data contains required pagination fields: items, page, perPage, total', async () => {
    const res = await handleListUmsCourses(makeReq('/api/ums/courses'), env);
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

  it('does NOT include legacy "totalItems" field', async () => {
    const res = await handleListUmsCourses(makeReq('/api/ums/courses'), env);
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;
    expect(data).not.toHaveProperty('totalItems');
  });

  it('respects ?page and ?perPage query params', async () => {
    const res = await handleListUmsCourses(
      makeReq('/api/ums/courses?page=1&perPage=5'),
      env,
    );
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;
    expect(data.page).toBe(1);
    expect(data.perPage).toBe(5);
    expect((data.items as unknown[]).length).toBeLessThanOrEqual(5);
  });

  it('filters by ?search param', async () => {
    const res = await handleListUmsCourses(
      makeReq('/api/ums/courses?search=NONEXISTENT_COURSE_XYZ'),
      env,
    );
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect((data.items as unknown[]).length).toBe(0);
    expect(data.total).toBe(0);
  });

  it('course items use snake_case field names', async () => {
    const res = await handleListUmsCourses(makeReq('/api/ums/courses'), env);
    const body = await parseJson(res);
    const items = (body.data as Record<string, unknown>).items as Record<string, unknown>[];

    if (items.length === 0) return;

    const course = items[0];
    // Required snake_case fields
    expect(course).toHaveProperty('id');
    expect(course).toHaveProperty('code');
    expect(course).toHaveProperty('title');
    // Must NOT expose camelCase variants
    expect(course).not.toHaveProperty('creditHours');
    expect(course).not.toHaveProperty('departmentId');
  });
});

// ─── CREATE course ────────────────────────────────────────────────────────────

describe('POST /api/ums/courses – creation contract', () => {
  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('/api/ums/courses', 'POST', { code: 'TST101' });
    const res = await handleCreateCourse(req, env);
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error');
  });

  it('returns 201 + { success: true, data: Course } on success', async () => {
    const req = makeReq('/api/ums/courses', 'POST', {
      code: `TST-${Date.now()}`,
      title: 'Contract Test Course',
      credits: 3,
      term: 'Spring 2025',
      capacity: 30,
    });
    const res = await handleCreateCourse(req, env);
    expect(res.status).toBe(201);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');
  });
});

// ─── UPDATE course ────────────────────────────────────────────────────────────

describe('PATCH /api/ums/courses/:id – update contract', () => {
  it('returns 400 when no valid fields provided', async () => {
    const res = await handleUpdateCourse(
      makeReq('/api/ums/courses/any-id', 'PATCH', {}),
      env,
      'any-id',
    );
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
  });

  it('returns 404 for unknown course id', async () => {
    const res = await handleUpdateCourse(
      makeReq('/api/ums/courses/NO-SUCH-COURSE', 'PATCH', { title: 'Updated' }),
      env,
      'NO-SUCH-COURSE',
    );
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
  });
});

// ─── DELETE course ────────────────────────────────────────────────────────────

describe('DELETE /api/ums/courses/:id – delete contract', () => {
  it('returns 404 for unknown course id', async () => {
    const res = await handleDeleteCourse(
      makeReq('/api/ums/courses/NO-SUCH-COURSE', 'DELETE'),
      env,
      'NO-SUCH-COURSE',
    );
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
  });
});

// ─── LIST programs (paginated) ────────────────────────────────────────────────

describe('GET /api/ums/programs – pagination contract', () => {
  it('returns HTTP 200 with paginated shape', async () => {
    const res = await handleListPrograms(makeReq('/api/ums/programs'), env);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;

    expect(body.success).toBe(true);
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('perPage');
    expect(data).toHaveProperty('total');
  });
});

// ─── Non-paginated list endpoints ─────────────────────────────────────────────

describe('GET /api/ums/faculties – flat array contract', () => {
  it('returns 200 + { success: true, data: array }', async () => {
    const res = await handleListFaculties(makeReq('/api/ums/faculties'), env);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('GET /api/ums/departments – flat array contract', () => {
  it('returns 200 + { success: true, data: array }', async () => {
    const res = await handleListDepartments(makeReq('/api/ums/departments'), env);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('filters by ?faculty_id param', async () => {
    const res = await handleListDepartments(
      makeReq('/api/ums/departments?faculty_id=NONEXISTENT'),
      env,
    );
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('GET /api/ums/terms – flat array contract', () => {
  it('returns 200 + { success: true, data: array }', async () => {
    const res = await handleListTerms(makeReq('/api/ums/terms'), env);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ─── Enrollments ──────────────────────────────────────────────────────────────

describe('GET /api/ums/enrollments – flat array contract', () => {
  it('returns 200 + { success: true, data: array }', async () => {
    const res = await handleListEnrollments(makeReq('/api/ums/enrollments'), env);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/ums/enrollments – creation contract', () => {
  it('returns 400 when student_id or course_id is missing', async () => {
    const req = makeReq('/api/ums/enrollments', 'POST', { student_id: 'stu-1' });
    const res = await handleCreateEnrollment(req, env);
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
  });
});

// ─── Global shape regression guard ───────────────────────────────────────────

describe('All course endpoints – global shape contract', () => {
  const endpoints: Array<{ name: string; fn: () => Promise<Response> }> = [
    { name: 'courses', fn: () => handleListUmsCourses(makeReq('/api/ums/courses'), env) },
    { name: 'programs', fn: () => handleListPrograms(makeReq('/api/ums/programs'), env) },
    { name: 'faculties', fn: () => handleListFaculties(makeReq('/api/ums/faculties'), env) },
    { name: 'departments', fn: () => handleListDepartments(makeReq('/api/ums/departments'), env) },
    { name: 'terms', fn: () => handleListTerms(makeReq('/api/ums/terms'), env) },
    { name: 'enrollments', fn: () => handleListEnrollments(makeReq('/api/ums/enrollments'), env) },
  ];

  for (const { name, fn } of endpoints) {
    it(`${name}: every response has top-level "success" boolean`, async () => {
      const body = await (await fn()).json() as Record<string, unknown>;
      expect(typeof body.success).toBe('boolean');
    });

    it(`${name}: response Content-Type is application/json`, async () => {
      const res = await fn();
      expect(res.headers.get('Content-Type')).toContain('application/json');
    });
  }
});
