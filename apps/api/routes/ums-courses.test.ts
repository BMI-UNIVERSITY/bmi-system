import { describe, it, expect, vi } from 'vitest';
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
} from './ums-courses';

function makeChainDB(firstVal: any = null, allVal: any[] = [], runVal: any = { meta: { changes: 1 } }) {
  const firstMock = vi.fn().mockResolvedValue(firstVal);
  const allMock = vi.fn().mockResolvedValue({ results: allVal });
  const runMock = vi.fn().mockResolvedValue(runVal);
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: firstMock, all: allMock, run: runMock }),
      first: firstMock,
      all: allMock,
    }),
  };
}

describe('ums-courses routes', () => {
  it('handleListUmsCourses returns paginated courses', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ total: 1 }),
          all: vi.fn().mockResolvedValue({ results: [{ id: 'c1', code: 'CS101' }] }),
        }),
      }),
    };
    const req = new Request('http://localhost/api/courses');
    const res = await handleListUmsCourses(req, { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data.items[0].code).toBe('CS101');
  });

  it('handleListUmsCourses applies search filter', async () => {
    const bindMock = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ total: 0 }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
    const req = new Request('http://localhost/api/courses?search=math');
    await handleListUmsCourses(req, { DB: db as any } as any);
    const firstCallArgs = bindMock.mock.calls[0];
    expect(firstCallArgs).toContain('%math%');
  });

  it('handleCreateCourse returns 400 if required fields missing', async () => {
    const db = makeChainDB();
    const req = new Request('http://localhost/api/courses', {
      method: 'POST',
      body: JSON.stringify({ code: 'CS101' }), // missing title, credits, term, capacity
    });
    const res = await handleCreateCourse(req, { DB: db as any } as any);
    expect(res.status).toBe(400);
  });

  it('handleCreateCourse creates new course and returns 201', async () => {
    const newCourse = { id: 'c-new', code: 'CS201', title: 'Advanced' };
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({}),
          first: vi.fn().mockResolvedValue(newCourse),
        }),
      })
    };
    const req = new Request('http://localhost/api/courses', {
      method: 'POST',
      body: JSON.stringify({ code: 'CS201', title: 'Advanced', credits: 3, term: 'Fall', capacity: 30 }),
    });
    const res = await handleCreateCourse(req, { DB: db as any } as any);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.data.code).toBe('CS201');
  });

  it('handleUpdateCourse returns 404 for missing course', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({}),
          first: vi.fn().mockResolvedValue(null),
        }),
      })
    };
    const req = new Request('http://localhost/api/courses/c-bad', {
      method: 'PUT',
      body: JSON.stringify({ title: 'New Title' }),
    });
    const res = await handleUpdateCourse(req, { DB: db as any } as any, 'c-bad');
    expect(res.status).toBe(404);
  });

  it('handleUpdateCourse returns 400 if no valid fields', async () => {
    const db = makeChainDB();
    const req = new Request('http://localhost/api/courses/c1', {
      method: 'PUT',
      body: JSON.stringify({ unknown_field: 'x' }),
    });
    const res = await handleUpdateCourse(req, { DB: db as any } as any, 'c1');
    expect(res.status).toBe(400);
  });

  it('handleDeleteCourse returns 404 when no rows affected', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }) })
      })
    };
    const req = new Request('http://localhost/api/courses/c-gone', { method: 'DELETE' });
    const res = await handleDeleteCourse(req, { DB: db as any } as any, 'c-gone');
    expect(res.status).toBe(404);
  });

  it('handleDeleteCourse succeeds', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }) })
      })
    };
    const req = new Request('http://localhost/api/courses/c1', { method: 'DELETE' });
    const res = await handleDeleteCourse(req, { DB: db as any } as any, 'c1');
    expect(res.status).toBe(200);
  });

  it('handleListPrograms returns programs with pagination', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue({ results: [] }) }),
        first: vi.fn().mockResolvedValue({ total: 0 }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      })
    };
    const req = new Request('http://localhost/api/programs');
    const res = await handleListPrograms(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleListFaculties returns all faculties', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [{ id: 'f1', name: 'Engineering' }] })
      })
    };
    const res = await handleListFaculties(new Request('http://localhost'), { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].name).toBe('Engineering');
  });

  it('handleListDepartments returns all departments when no filter', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [{ id: 'd1' }] })
      })
    };
    const res = await handleListDepartments(new Request('http://localhost/api/depts'), { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleListDepartments filters by faculty_id', async () => {
    const bindMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [] })
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock, all: vi.fn() }) };
    const req = new Request('http://localhost/api/depts?faculty_id=f1');
    await handleListDepartments(req, { DB: db as any } as any);
    expect(bindMock).toHaveBeenCalledWith('f1');
  });

  it('handleListTerms returns academic terms', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [{ id: 't1', name: 'Fall 2026' }] })
      })
    };
    const res = await handleListTerms(new Request('http://localhost'), { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].name).toBe('Fall 2026');
  });

  it('handleListEnrollments returns enrollments (no filter)', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue({ results: [] }) }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      })
    };
    const req = new Request('http://localhost/api/enrollments');
    const res = await handleListEnrollments(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });
});
