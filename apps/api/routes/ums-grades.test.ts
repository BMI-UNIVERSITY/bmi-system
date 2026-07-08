import { describe, it, expect, vi } from 'vitest';
import {
  handleListGrades,
  handleCreateGrade,
  handleUpdateGrade,
} from './ums-grades';

function makeDB(firstVal: any = null, allResults: any[] = []) {
  const firstMock = vi.fn().mockResolvedValue(firstVal);
  const allMock = vi.fn().mockResolvedValue({ results: allResults });
  const runMock = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: firstMock, all: allMock, run: runMock }),
      first: firstMock,
      all: allMock,
    }),
  };
}

describe('ums-grades routes', () => {
  describe('handleListGrades', () => {
    it('returns paginated grades with calculated letter_grade', async () => {
      const grades = [
        { id: 'g1', score: 85, max_score: 100, assessment_type: 'exam', enrollment_id: 'e1',
          student_id: 'u1', course_id: 'c1', term_id: 't1', course_code: 'CS101',
          course_name: 'Intro CS', credits: 3, reg_no: 'BMI/UG-CS/226/001',
          first_name: 'Alice', last_name: 'Smith', created_at: '2026-01-01' },
      ];
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ total: 1 }),
            all: vi.fn().mockResolvedValue({ results: grades }),
          }),
        }),
      };
      const req = new Request('http://localhost/api/grades');
      const res = await handleListGrades(req, { DB: db as any } as any, 'staff1', 'staff');
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.data.items[0]).toHaveProperty('letter_grade');
      expect(body.data.items[0]).toHaveProperty('grade_point');
      expect(body.data.total).toBe(1);
    });

    it('student role is forced to see only own grades', async () => {
      const bindMock = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ total: 0 }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      });
      const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
      // studentId in URL is 'other-student', but caller is 'student-self'
      const req = new Request('http://localhost/api/grades?studentId=other-student');
      await handleListGrades(req, { DB: db as any } as any, 'student-self', 'student');
      // The callerId 'student-self' should override the URL param
      const firstBindArgs = bindMock.mock.calls[0];
      expect(firstBindArgs).toContain('student-self');
      expect(firstBindArgs).not.toContain('other-student');
    });

    it('applies courseId and termId filters', async () => {
      const bindMock = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ total: 0 }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      });
      const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
      const req = new Request('http://localhost/api/grades?courseId=c1&termId=t1');
      await handleListGrades(req, { DB: db as any } as any, 'staff1', 'staff');
      expect(bindMock.mock.calls.some((args: any[]) => args.includes('c1'))).toBe(true);
      expect(bindMock.mock.calls.some((args: any[]) => args.includes('t1'))).toBe(true);
    });
  });

  describe('handleCreateGrade', () => {
    it('returns 400 if required fields missing', async () => {
      const db = makeDB();
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ assessment_type: 'exam' }), // missing enrollment_id, score, max_score
      });
      const res = await handleCreateGrade(req, { DB: db as any } as any, 'staff1');
      expect(res.status).toBe(400);
    });

    it('returns 404 if enrollment not found', async () => {
      const db = makeDB(null); // enrollment lookup returns null
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ enrollment_id: 'e-none', assessment_type: 'exam', score: 80, max_score: 100 }),
      });
      const res = await handleCreateGrade(req, { DB: db as any } as any, 'staff1');
      expect(res.status).toBe(404);
    });

    it('creates grade successfully', async () => {
      const newGrade = { id: 'g-new', score: 90, max_score: 100, assessment_type: 'exam' };
      let call = 0;
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockImplementation(() =>
              call++ === 0
                ? Promise.resolve({ id: 'e1' })   // enrollment found
                : Promise.resolve(newGrade)          // SELECT after insert
            ),
            run: vi.fn().mockResolvedValue({}),
          }),
        }),
      };
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ enrollment_id: 'e1', assessment_type: 'exam', score: 90, max_score: 100 }),
      });
      const res = await handleCreateGrade(req, { DB: db as any } as any, 'staff1');
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.data.score).toBe(90);
    });
  });

  describe('handleUpdateGrade', () => {
    it('returns 400 if no valid fields provided', async () => {
      const db = makeDB();
      const req = new Request('http://localhost/api/grades/g1', {
        method: 'PUT',
        body: JSON.stringify({ unknown_field: 'x' }),
      });
      const res = await handleUpdateGrade(req, { DB: db as any } as any, 'g1');
      expect(res.status).toBe(400);
    });

    it('returns 404 if grade not found', async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
          }),
        }),
      };
      const req = new Request('http://localhost/api/grades/g-none', {
        method: 'PUT',
        body: JSON.stringify({ score: 75 }),
      });
      const res = await handleUpdateGrade(req, { DB: db as any } as any, 'g-none');
      expect(res.status).toBe(404);
    });

    it('updates grade fields successfully', async () => {
      const updated = { id: 'g1', score: 75, max_score: 100, assessment_type: 'quiz' };
      let call = 0;
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
            first: vi.fn().mockResolvedValue(updated),
          }),
        }),
      };
      const req = new Request('http://localhost/api/grades/g1', {
        method: 'PUT',
        body: JSON.stringify({ score: 75, max_score: 100, assessment_type: 'quiz' }),
      });
      const res = await handleUpdateGrade(req, { DB: db as any } as any, 'g1');
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data.score).toBe(75);
    });
  });
});
