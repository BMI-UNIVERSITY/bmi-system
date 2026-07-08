import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import {
  handleListRubrics,
  handleCreateRubric,
  handleDeleteRubric,
} from './ums-rubrics';

describe('ums-rubrics routes', () => {
  it('handleListRubrics returns formatted rubrics with parsed criteria', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [
            { id: 'r1', title: 'Rubric 1', course_id: 'c1', course_name: 'Math', criteria: JSON.stringify([{ name: 'accuracy', points: 10 }]), total_points: 100 },
            { id: 'r2', title: 'Rubric 2', course_id: null, course_name: null, criteria: 'invalid-json', total_points: 50 },
          ]
        })
      })
    };
    const req = new Request('http://localhost/api/rubrics');
    const res = await handleListRubrics(req, makeEnv(db));
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.data[0].criteria).toEqual([{ name: 'accuracy', points: 10 }]);
    expect(body.data[1].criteria).toEqual([]); // bad JSON → empty array
  });

  it('handleListRubrics returns error when DB fails', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockRejectedValue(new Error('DB error'))
      })
    };
    const req = new Request('http://localhost/api/rubrics');
    const res = await handleListRubrics(req, makeEnv(db));
    expect(res.status).toBe(400);
  });

  it('handleCreateRubric inserts and returns list', async () => {
    const allMock = vi.fn().mockResolvedValue({ results: [] });
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: allMock,
        bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}), all: allMock }),
      })
    };
    const req = new Request('http://localhost/api/rubrics', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Rubric', criteria: [{ name: 'q1', points: 5 }], total_points: 50 }),
      headers: { 'Content-Type': 'application/json' }
    });
    const res = await handleCreateRubric(req, makeEnv(db));
    expect(res.status).toBe(200);
  });

  it('handleDeleteRubric deletes and returns id', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) })
      })
    };
    const req = new Request('http://localhost/api/rubrics/r1', { method: 'DELETE' });
    const res = await handleDeleteRubric(req, makeEnv(db), 'r1');
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('r1');
  });
});
