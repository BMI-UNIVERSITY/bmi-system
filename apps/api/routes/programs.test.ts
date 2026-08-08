import { makeEnv, makeDrizzleMock } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleGetStudentPrograms,
  handleProgramTransfer,
} from './programs';

vi.mock('../lib/db', () => ({ createCoreDb: vi.fn() }));

import { createCoreDb } from '../lib/db';

describe('programs routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('handleGetStudentPrograms', () => {
    it('returns 404 if student not found', async () => {
      const drizzle = makeDrizzleMock([null]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const res = await handleGetStudentPrograms(new Request('http://localhost'), makeEnv(), 'u-none');
      expect(res.status).toBe(404);
    });

    it('returns 422 if student has no UID', async () => {
      const drizzle = makeDrizzleMock([{ user_id: 'u1', uid: null }]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const res = await handleGetStudentPrograms(new Request('http://localhost'), makeEnv(), 'u1');
      expect(res.status).toBe(422);
    });

    it('returns program history for student with UID', async () => {
      const history = [{ id: 'sp1', program_id: 'prog1', program_name: 'CS', current_flag: 1 }];
      const drizzle = makeDrizzleMock([{ user_id: 'u1', uid: 'BMI000000001' }], [history]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const res = await handleGetStudentPrograms(new Request('http://localhost'), makeEnv(), 'u1');
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data[0].program_name).toBe('CS');
    });
  });

  describe('handleProgramTransfer', () => {
    it('returns 400 for invalid JSON body', async () => {
      const drizzle = makeDrizzleMock();
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'text/plain' },
      });
      const res = await handleProgramTransfer(req, makeEnv(), 'u1', 'admin1');
      expect(res.status).toBe(400);
    });

    it('returns 400 if new_program_id is missing', async () => {
      const drizzle = makeDrizzleMock();
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ notes: 'transfer' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(), 'u1', 'admin1');
      expect(res.status).toBe(400);
    });

    it('returns 404 if target program not found', async () => {
      const drizzle = makeDrizzleMock([null]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog-x' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(), 'u1', 'admin1');
      expect(res.status).toBe(404);
    });

    it('returns 404 if student not found', async () => {
      const drizzle = makeDrizzleMock([
        { id: 'prog1', code: 'CS', name: 'Computer Science' }, // program found
        null,                                                    // student not found
      ]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog1' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(), 'u-none', 'admin1');
      expect(res.status).toBe(404);
    });

    it('returns 422 if student has no UID', async () => {
      const drizzle = makeDrizzleMock([
        { id: 'prog1', code: 'CS', name: 'Computer Science' },
        { user_id: 'u1', program_id: 'prog0', uid: null },
      ]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog1' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(), 'u1', 'admin1');
      expect(res.status).toBe(422);
    });

    it('returns 409 if student already in target program', async () => {
      const drizzle = makeDrizzleMock([
        { id: 'prog1', code: 'CS', name: 'Computer Science' },
        { user_id: 'u1', program_id: 'prog1', uid: 'BMI000000001' },
      ]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog1' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(), 'u1', 'admin1');
      expect(res.status).toBe(409);
    });

    it('successfully transfers program and returns result', async () => {
      const drizzle = makeDrizzleMock([
        { id: 'prog2', code: 'MBA', name: 'Business' },
        { user_id: 'u1', program_id: 'prog1', uid: 'BMI000000001' },
      ]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ new_program_id: 'prog2', notes: 'Transfer approved' }),
      });
      const res = await handleProgramTransfer(req, makeEnv(), 'u1', 'admin1');
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data.new_program_code).toBe('MBA');
      expect(body.data.uid).toBe('BMI000000001');
    });
  });
});
