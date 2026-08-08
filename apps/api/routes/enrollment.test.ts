import { makeEnv, makeDrizzleMock } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleGetMyHolds,
  handleGetProgramCurriculum,
  handleAutoEnrollMandatory,
  handleGetElectiveGroups,
  handleSubmitElectives,
  handleGetRegistrationProgress,
  handleCompleteOrientation,
  handleGenerateProgramInvoice,
} from './enrollment';

vi.mock('../lib/db', () => ({ createCoreDb: vi.fn() }));

import { createCoreDb } from '../lib/db';

describe('Enrollment Flow', () => {
  const userId = 'student-1';

  beforeEach(() => vi.clearAllMocks());

  describe('handleGetMyHolds', () => {
    it('returns active holds for a student', async () => {
      const holds = [
        { id: 'h1', hold_type: 'document', reason: 'Upload ID', is_active: 1, created_at: '2026-01-01', resolved_at: null },
        { id: 'h2', hold_type: 'payment', reason: 'Pay fees', is_active: 1, created_at: '2026-01-01', resolved_at: null },
      ];
      const drizzle = makeDrizzleMock([], [holds]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/holds');
      const res = await handleGetMyHolds(req, makeEnv(), userId);
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.data.active_count).toBe(2);
      expect(body.data.is_all_cleared).toBe(false);
    });

    it('marks all holds as cleared when none active', async () => {
      const holds = [
        { id: 'h1', hold_type: 'document', reason: 'Upload ID', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
      ];
      const drizzle = makeDrizzleMock([], [holds]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/holds');
      const res = await handleGetMyHolds(req, makeEnv(), userId);
      const body = await res.json() as any;

      expect(body.data.is_all_cleared).toBe(true);
      expect(body.data.active_count).toBe(0);
    });
  });

  describe('handleGetRegistrationProgress', () => {
    it('returns progress tasks with locked states', async () => {
      const allHolds = [
        { id: 'h1', hold_type: 'document', reason: 'Upload ID', is_active: 1, created_at: '2026-01-01', resolved_at: null },
        { id: 'h2', hold_type: 'orientation', reason: 'Orientation', is_active: 1, created_at: '2026-01-01', resolved_at: null },
        { id: 'h3', hold_type: 'course_selection', reason: 'Course reg', is_active: 1, created_at: '2026-01-01', resolved_at: null },
        { id: 'h4', hold_type: 'payment', reason: 'Payment', is_active: 1, created_at: '2026-01-01', resolved_at: null },
      ];
      // getVals: holds all .get() calls (idDoc, activeTerm, mandatory cnt, elective cnt, total cnt, invoice)
      // allVals: first call returns holds list
      const drizzle = makeDrizzleMock(
        [null, null, { cnt: 5 }, { cnt: 2 }, { cnt: 7 }, null],
        [allHolds]
      );
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/registration-progress');
      const res = await handleGetRegistrationProgress(req, makeEnv(), userId);
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.data.tasks).toHaveLength(4);
      expect(body.data.tasks[0].id).toBe('upload_id');
      expect(body.data.tasks[1].locked).toBe(true); // Locked because ID not uploaded
    });

    it('shows 100% progress when all tasks completed', async () => {
      const allHolds = [
        { id: 'h1', hold_type: 'document', reason: 'Upload ID', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
        { id: 'h2', hold_type: 'orientation', reason: 'Orientation', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
        { id: 'h3', hold_type: 'course_selection', reason: 'Course reg', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
        { id: 'h4', hold_type: 'payment', reason: 'Payment', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
      ];
      const drizzle = makeDrizzleMock(
        [{ id: 'doc-1' }, { id: 'term-1', name: 'Spring 2026', academic_year: '2026' }, { cnt: 3 }, { cnt: 1 }, { cnt: 4 }, { id: 'inv-1' }],
        [allHolds]
      );
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/registration-progress');
      const res = await handleGetRegistrationProgress(req, makeEnv(), userId);
      const body = await res.json() as any;

      expect(body.data.progress).toBe(100);
      expect(body.data.is_complete).toBe(true);
    });
  });

  describe('handleCompleteOrientation', () => {
    it('resolves the orientation hold', async () => {
      const drizzle = makeDrizzleMock([{ id: 'hold-1' }]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/orientation/complete', { method: 'POST' });
      const res = await handleCompleteOrientation(req, makeEnv(), userId);
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.data.message).toContain('Orientation completed');
    });

    it('returns 404 when no active orientation hold', async () => {
      const drizzle = makeDrizzleMock([null]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/orientation/complete', { method: 'POST' });
      const res = await handleCompleteOrientation(req, makeEnv(), userId);

      expect(res.status).toBe(404);
    });
  });

  describe('handleAutoEnrollMandatory', () => {
    it('requires active course_selection hold', async () => {
      const drizzle = makeDrizzleMock([null]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/enroll/mandatory', { method: 'POST' });
      const res = await handleAutoEnrollMandatory(req, makeEnv(), userId);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toContain('already resolved');
    });

    it('enrolls in mandatory courses when hold exists', async () => {
      const mandatoryCourses = [
        { course_id: 'c1', code: 'CS101', title: 'Intro to CS' },
        { course_id: 'c2', code: 'MATH101', title: 'Calculus' },
      ];
      const drizzle = makeDrizzleMock(
        [
          { id: 'hold-1' },
          { program_id: 'prog-1' },
          { id: 'term-1', name: 'Spring 2026' },
          { id: 'curr-1' },
        ],
        [mandatoryCourses, []]  // mandatory courses, existing regs (empty)
      );
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/enroll/mandatory', { method: 'POST' });
      const res = await handleAutoEnrollMandatory(req, makeEnv(), userId);
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.data.enrolled_count).toBeGreaterThanOrEqual(1);
      expect(body.data.courses).toHaveLength(2);
    });
  });

  describe('handleSubmitElectives', () => {
    it('rejects missing course ids', async () => {
      const drizzle = makeDrizzleMock();
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/electives/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await handleSubmitElectives(req, makeEnv(), userId);
      expect(res.status).toBe(400);
    });

    it('requires active course_selection hold before submission', async () => {
      const drizzle = makeDrizzleMock([null]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/electives/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_course_ids: ['c1'] }),
      });
      const res = await handleSubmitElectives(req, makeEnv(), userId);
      expect(res.status).toBe(400);
    });
  });

  describe('handleGetProgramCurriculum', () => {
    it('returns 404 when student has no program', async () => {
      const drizzle = makeDrizzleMock([null]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/curriculum');
      const res = await handleGetProgramCurriculum(req, makeEnv(), userId);
      expect(res.status).toBe(404);
    });
  });

  describe('handleGenerateProgramInvoice', () => {
    it('returns error when no payment hold found', async () => {
      const drizzle = makeDrizzleMock([null]);
      vi.mocked(createCoreDb).mockReturnValue(drizzle);
      const req = new Request('http://localhost/api/student/invoice/generate', { method: 'POST' });
      const res = await handleGenerateProgramInvoice(req, makeEnv(), userId);
      expect(res.status).toBe(400);
    });
  });
});
