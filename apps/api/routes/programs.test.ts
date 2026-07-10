import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import {
  handleGetStudentPrograms,
  handleProgramTransfer,
} from './programs';

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

describe('programs routes', () => {
  describe('handleGetStudentPrograms', () => {
    it('returns 404 if student not found', async () => {
      const db = makeDB([null]);
      const res = await handleGetStudentPrograms(new Request('http://localhost'), makeEnv(db), 'u-none');
      expect(res.status).toBe(404);
    });

    it('returns 422 if student has no UID', async () => {
      const db = makeDB([{ user_id: 'u1', person_id: 'p1', uid: null }]);
      const res = await handleGetStudentPrograms(new Request('http://localhost'), makeEnv(db), 'u1');
      expect(res.status).toBe(422);
    });

    it('returns program history for student with UID', async () => {
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
                results: [{ id: 'sp1', program_id: 'prog1', program_name: 'CS', current_flag: 1 }],
              }),
            }),
          }),
      };
      const res = await handleGetStudentPrograms(new Request('http://localhost'), makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data[0].program_name).toBe('CS');
    });
  });

  describe('handleProgramTransfer', () => {
    it('returns 400 for invalid JSON body', async () => {
      const db = makeDB([]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'text/plain' },
      });
      const res = await handleProgramTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(400);
    });

    it('returns 400 if new_program_id is missing', async () => {
      const db = makeDB([]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ notes: 'transfer' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(400);
    });

    it('returns 404 if target program not found', async () => {
      const db = makeDB([null]); // program lookup returns null
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog-x' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(404);
    });

    it('returns 404 if student not found', async () => {
      const db = makeDB([
        { id: 'prog1', code: 'CS', name: 'Computer Science' }, // program found
        null,                                                    // student not found
      ]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog1' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(db), 'u-none', 'admin1');
      expect(res.status).toBe(404);
    });

    it('returns 422 if student has no UID', async () => {
      const db = makeDB([
        { id: 'prog1', code: 'CS', name: 'Computer Science' },
        { user_id: 'u1', current_program_id: 'prog0', person_id: 'p1', uid: null },
      ]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog1' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(422);
    });

    it('returns 409 if student already in target program', async () => {
      const db = makeDB([
        { id: 'prog1', code: 'CS', name: 'Computer Science' },
        { user_id: 'u1', current_program_id: 'prog1', person_id: 'p1', uid: 'BMI000000001' },
      ]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog1' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(db), 'u1', 'admin1');
      expect(res.status).toBe(409);
    });

    it('successfully transfers program and returns result', async () => {
      const db = makeDB([
        { id: 'prog2', code: 'MBA', name: 'Business' }, // program
        { user_id: 'u1', current_program_id: 'prog1', person_id: 'p1', uid: 'BMI000000001' }, // student
      ]);
      db._batchMock.mockResolvedValue([]);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog2', notes: 'Transfer approved' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(db), 'u1', 'admin1');
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data.new_program_code).toBe('MBA');
      expect(body.data.uid).toBe('BMI000000001');
    });
  });
});
