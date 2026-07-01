/**
 * BMI API – Students Contract Tests
 *
 * Validates that every response from the students endpoints conforms to the
 * agreed contract expected by the UMS frontend:
 *
 *   LIST  GET /api/ums/students
 *     → { success: true, data: { items: Student[], page, perPage, total } }
 *
 *   GET   GET /api/ums/students/:id
 *     → { success: true, data: Student }
 *
 *   POST  POST /api/ums/students
 *     → { success: true, data: Student }  (201)
 *
 *   PATCH PATCH /api/ums/students/:id
 *     → { success: true, data: Student }
 *
 *   DELETE DELETE /api/ums/students/:id
 *     → { success: true, data: { deleted: true } }
 *
 *   ERROR responses
 *     → { success: false, error: string }
 *
 * Field naming contract: all fields use snake_case (reg_no, first_name, …).
 * No camelCase fields should appear in the top-level data envelope.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  handleListStudents,
  handleGetStudent,
  handleCreateStudent,
  handleUpdateStudent,
  handleDeleteStudent,
} from './ums-students';

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

// ─── seed data ───────────────────────────────────────────────────────────────

const TEST_EMAIL = `contract-test-${Date.now()}@bmi.test`;
const TEST_REG_NO = `REG-CT-${Date.now()}`;

let createdStudentId = '';

beforeAll(async () => {
  // Seed a student so GET / PATCH / DELETE tests have something to work with
  const req = makeReq('/api/ums/students', 'POST', {
    email: TEST_EMAIL,
    first_name: 'Contract',
    last_name: 'Tester',
    reg_no: TEST_REG_NO,
    admission_date: '2024-01-01',
    programme: 'BSc Computer Science',
  });
  const res = await handleCreateStudent(req, env);
  if (res.status === 201) {
    const body = await parseJson(res);
    createdStudentId = (body.data as Record<string, unknown>)?.user_id as string ?? '';
  }
});

// ─── LIST students ────────────────────────────────────────────────────────────

describe('GET /api/ums/students – pagination contract', () => {
  it('returns HTTP 200', async () => {
    const res = await handleListStudents(makeReq('/api/ums/students'), env);
    expect(res.status).toBe(200);
  });

  it('response envelope: { success: true, data: {...} }', async () => {
    const res = await handleListStudents(makeReq('/api/ums/students'), env);
    const body = await parseJson(res);

    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');
  });

  it('data contains required pagination fields: items, page, perPage, total', async () => {
    const res = await handleListStudents(makeReq('/api/ums/students'), env);
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
    const res = await handleListStudents(makeReq('/api/ums/students'), env);
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;

    expect(data).not.toHaveProperty('totalItems');
  });

  it('respects ?page and ?perPage query params', async () => {
    const res = await handleListStudents(
      makeReq('/api/ums/students?page=1&perPage=5'),
      env,
    );
    const body = await parseJson(res);
    const data = body.data as Record<string, unknown>;

    expect(data.page).toBe(1);
    expect(data.perPage).toBe(5);
    expect((data.items as unknown[]).length).toBeLessThanOrEqual(5);
  });

  it('student items use snake_case field names, not camelCase', async () => {
    const res = await handleListStudents(makeReq('/api/ums/students'), env);
    const body = await parseJson(res);
    const items = (body.data as Record<string, unknown>).items as Record<string, unknown>[];

    if (items.length === 0) return; // no seed data yet — skip field check

    const firstItem = items[0];
    // Required snake_case fields
    expect(firstItem).toHaveProperty('reg_no');
    expect(firstItem).toHaveProperty('first_name');
    expect(firstItem).toHaveProperty('last_name');
    // Must NOT expose camelCase variants
    expect(firstItem).not.toHaveProperty('regNo');
    expect(firstItem).not.toHaveProperty('firstName');
    expect(firstItem).not.toHaveProperty('lastName');
  });
});

// ─── GET single student ───────────────────────────────────────────────────────

describe('GET /api/ums/students/:id – single record contract', () => {
  it('returns 404 for unknown id', async () => {
    const res = await handleGetStudent(
      makeReq('/api/ums/students/UNKNOWN-ID'),
      env,
      'UNKNOWN-ID',
    );
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  it('returns 200 + { success, data: Student } for a known id', async () => {
    if (!createdStudentId) return;
    const res = await handleGetStudent(
      makeReq(`/api/ums/students/${createdStudentId}`),
      env,
      createdStudentId,
    );
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');
  });
});

// ─── CREATE student ───────────────────────────────────────────────────────────

describe('POST /api/ums/students – creation contract', () => {
  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('/api/ums/students', 'POST', { email: 'incomplete@bmi.test' });
    const res = await handleCreateStudent(req, env);
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error');
  });

  it('returns 201 + { success: true, data: Student } on success', async () => {
    const req = makeReq('/api/ums/students', 'POST', {
      email: `new-contract-${Date.now()}@bmi.test`,
      first_name: 'New',
      last_name: 'Student',
      reg_no: `REG-NEW-${Date.now()}`,
      admission_date: '2025-01-01',
      programme: 'BA Theology',
    });
    const res = await handleCreateStudent(req, env);
    expect(res.status).toBe(201);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');
  });
});

// ─── UPDATE student ───────────────────────────────────────────────────────────

describe('PATCH /api/ums/students/:id – update contract', () => {
  it('returns 404 for unknown id', async () => {
    const res = await handleUpdateStudent(
      makeReq('/api/ums/students/NO-SUCH-ID', 'PATCH', { status: 'Inactive' }),
      env,
      'NO-SUCH-ID',
    );
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
  });

  it('returns 200 + updated student on success', async () => {
    if (!createdStudentId) return;
    const res = await handleUpdateStudent(
      makeReq(`/api/ums/students/${createdStudentId}`, 'PATCH', { status: 'Inactive' }),
      env,
      createdStudentId,
    );
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
  });
});

// ─── DELETE student ───────────────────────────────────────────────────────────

describe('DELETE /api/ums/students/:id – delete contract', () => {
  it('returns 404 for unknown id', async () => {
    const res = await handleDeleteStudent(
      makeReq('/api/ums/students/NO-SUCH-ID', 'DELETE'),
      env,
      'NO-SUCH-ID',
    );
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', false);
  });

  it('returns 200 + { deleted: true } on success', async () => {
    if (!createdStudentId) return;
    const res = await handleDeleteStudent(
      makeReq(`/api/ums/students/${createdStudentId}`, 'DELETE'),
      env,
      createdStudentId,
    );
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveProperty('success', true);
    expect((body.data as Record<string, unknown>)).toHaveProperty('deleted', true);
  });
});
