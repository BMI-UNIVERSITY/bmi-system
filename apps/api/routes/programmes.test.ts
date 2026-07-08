import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import {
  handleGetStudentProgrammes,
  handleProgrammeTransfer,
} from './programmes';

function makeDB(sequence: Array<any>) {
  let callIndex = 0;
  const batchMock = vi.fn().mockResolvedValue([]);
  return {
    prepare: vi.fn().mockImplementation(() => {
      const val = sequence[callIndex++ % sequence.length];
      return {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(val),
          all: vi.fn().mockResolvedValue({ results: Array.isArray(val) ? val : [] }),
          run: vi.fn().mockResolvedValue({}),
        }),
        first: vi.fn().mockResolvedValue(val),
      };
    }),
    batch: batchMock,
    _batchMock: batchMock,
  };
}

describe('programmes routes', () => {
  describe('handleGetStudentProgrammes', () => {
    it('returns 404 if student not found', async () => {
      const db = makeDB([null]);
      const res = await handleGetStudentProgrammes(new Request('http://localhost'), makeEnv(db), 'u-none');
      expect(res.status).toBe(404);
    });

    it('returns 422 if student has no UID', async () => {
      const db = makeDB([{ user_id: 'u1', person_id: 'p1', uid: null }]);
      const res = await handleGetStudentProgrammes(new Request('http://localhost'), makeEnv(db), 'u1');
      expect(res.status).toBe(422);
    });

    it('returns programme history for student with UID', async () => {
      const db = {
        prepare: vi.fn()
          .mockReturnValueOnce({
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue({ user_id: 'u1', person_id: 'p1', uid: 'BMI000000001' }),
            }),
          })
          .mockReturnValueOnce({
            bind: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue({
                results: [{ id: 'sp1', programme_id: 'prog1', programme_name: 'CS', current_flag: 1 }],
              }),
            }),
          }),
      };
      const res = await handleGetStudentProgrammes(new Request('http://localhost'), makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data[0].programme_name).toBe('CS');
    });
  });

  describe('handleProgrammeTransfer', () => {
    it('returns 400 for invalid JSON body', async () => {
      const db = makeDB([]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'text/plain' },
      });
      const res = await handleProgrammeTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(400);
    });

    it('returns 400 if new_programme_id is missing', async () => {
      const db = makeDB([]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ notes: 'transfer' }),
      });
      const res = await handleProgrammeTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(400);
    });

    it('returns 404 if target programme not found', async () => {
      const db = makeDB([null]); // programme lookup returns null
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_programme_id: 'prog-x' }),
      });
      const res = await handleProgrammeTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(404);
    });

    it('returns 404 if student not found', async () => {
      const db = makeDB([
        { id: 'prog1', code: 'CS', name: 'Computer Science' }, // programme found
        null,                                                    // student not found
      ]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_programme_id: 'prog1' }),
      });
      const res = await handleProgrammeTransfer(req, makeEnv(db), 'u-none', 'admin1');
      expect(res.status).toBe(404);
    });

    it('returns 422 if student has no UID', async () => {
      const db = makeDB([
        { id: 'prog1', code: 'CS', name: 'Computer Science' },
        { user_id: 'u1', current_programme_id: 'prog0', person_id: 'p1', uid: null },
      ]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_programme_id: 'prog1' }),
      });
      const res = await handleProgrammeTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(422);
    });

    it('returns 409 if student already in target programme', async () => {
      const db = makeDB([
        { id: 'prog1', code: 'CS', name: 'Computer Science' },
        { user_id: 'u1', current_programme_id: 'prog1', person_id: 'p1', uid: 'BMI000000001' },
      ]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_programme_id: 'prog1' }),
      });
      const res = await handleProgrammeTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(409);
    });

    it('successfully transfers programme and returns result', async () => {
      const db = makeDB([
        { id: 'prog2', code: 'MBA', name: 'Business' }, // programme
        { user_id: 'u1', current_programme_id: 'prog1', person_id: 'p1', uid: 'BMI000000001' }, // student
      ]);
      db._batchMock.mockResolvedValue([]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_programme_id: 'prog2', notes: 'Transfer approved' }),
      });
      const res = await handleProgrammeTransfer(req, makeEnv(db), 'u1', 'admin1');
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data.new_programme_code).toBe('MBA');
      expect(body.data.uid).toBe('BMI000000001');
    });
  });
});
