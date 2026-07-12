import { makeEnv, makeChainDB } from './test-helpers';
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

type MockDB = ReturnType<typeof makeChainDB>;

describe('Enrollment Flow', () => {
  const userId = 'student-1';

  describe('handleGetMyHolds', () => {
    it('returns active holds for a student', async () => {
      const db = makeChainDB([], [
        [
          { id: 'h1', hold_type: 'document', reason: 'Upload ID', is_active: 1, created_at: '2026-01-01', resolved_at: null },
          { id: 'h2', hold_type: 'payment', reason: 'Pay fees', is_active: 1, created_at: '2026-01-01', resolved_at: null },
        ]
      ]);
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/holds');
      const res = await handleGetMyHolds(req, env, userId);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.active_count).toBe(2);
      expect(body.data.is_all_cleared).toBe(false);
    });

    it('marks all holds as cleared when none active', async () => {
      const db = makeChainDB([], [
        [
          { id: 'h1', hold_type: 'document', reason: 'Upload ID', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
        ]
      ]);
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/holds');
      const res = await handleGetMyHolds(req, env, userId);
      const body = await res.json();

      expect(body.data.is_all_cleared).toBe(true);
      expect(body.data.active_count).toBe(0);
    });
  });

  describe('handleGetRegistrationProgress', () => {
    it('returns progress tasks with locked states', async () => {
      const db = makeChainDB(
        [null, null, { cnt: 5 }, { cnt: 2 }, { cnt: 7 }, null],
        [[
          { id: 'h1', hold_type: 'document', reason: 'Upload ID', is_active: 1, created_at: '2026-01-01', resolved_at: null },
          { id: 'h2', hold_type: 'orientation', reason: 'Orientation', is_active: 1, created_at: '2026-01-01', resolved_at: null },
          { id: 'h3', hold_type: 'course_selection', reason: 'Course reg', is_active: 1, created_at: '2026-01-01', resolved_at: null },
          { id: 'h4', hold_type: 'payment', reason: 'Payment', is_active: 1, created_at: '2026-01-01', resolved_at: null },
        ]]
      );
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/registration-progress');
      const res = await handleGetRegistrationProgress(req, env, userId);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.tasks).toHaveLength(4);
      expect(body.data.tasks[0].id).toBe('upload_id');
      expect(body.data.tasks[1].locked).toBe(true); // Locked because ID not uploaded
      expect(body.data.tasks[2].locked).toBe(true);
    });

    it('shows 100% progress when all tasks completed', async () => {
      const db = makeChainDB(
        [{ id: 'doc-1' }, null, { cnt: 3 }, { cnt: 1 }, { cnt: 4 }, { id: 'inv-1' }],
        [[
          { id: 'h1', hold_type: 'document', reason: 'Upload ID', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
          { id: 'h2', hold_type: 'orientation', reason: 'Orientation', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
          { id: 'h3', hold_type: 'course_selection', reason: 'Course reg', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
          { id: 'h4', hold_type: 'payment', reason: 'Payment', is_active: 0, created_at: '2026-01-01', resolved_at: '2026-01-02' },
        ]]
      );
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/registration-progress');
      const res = await handleGetRegistrationProgress(req, env, userId);
      const body = await res.json();

      expect(body.data.progress).toBe(100);
      expect(body.data.is_complete).toBe(true);
    });
  });

  describe('handleCompleteOrientation', () => {
    it('resolves the orientation hold', async () => {
      const db = makeChainDB([{ id: 'hold-1' }]);
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/orientation/complete', { method: 'POST' });
      const res = await handleCompleteOrientation(req, env, userId);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.message).toContain('Orientation completed');
    });

    it('returns 404 when no active orientation hold', async () => {
      const db = makeChainDB([null]);
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/orientation/complete', { method: 'POST' });
      const res = await handleCompleteOrientation(req, env, userId);

      expect(res.status).toBe(404);
    });
  });

  describe('handleAutoEnrollMandatory', () => {
    it('requires active course_selection hold', async () => {
      const db = makeChainDB([null]);
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/enroll/mandatory', { method: 'POST' });
      const res = await handleAutoEnrollMandatory(req, env, userId);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('already resolved');
    });

    it('enrolls in mandatory courses when hold exists', async () => {
      const db = makeChainDB(
        [
          { id: 'hold-1' },
          { program_id: 'prog-1' },
          { id: 'curr-1' },
        ],
        [
          [
            { course_id: 'c1', code: 'CS101', title: 'Intro to CS' },
            { course_id: 'c2', code: 'MATH101', title: 'Calculus' },
          ],
          [],
        ]
      );
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/enroll/mandatory', { method: 'POST' });
      const res = await handleAutoEnrollMandatory(req, env, userId);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.enrolled_count).toBeGreaterThanOrEqual(1);
      expect(body.data.courses).toHaveLength(2);
    });
  });

  describe('handleSubmitElectives', () => {
    it('rejects missing course ids', async () => {
      const db = makeChainDB();
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/electives/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await handleSubmitElectives(req, env, userId);
      expect(res.status).toBe(400);
    });

    it('requires active course_selection hold before submission', async () => {
      const db = makeChainDB([null]);
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/electives/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_course_ids: ['c1'] }),
      });
      const res = await handleSubmitElectives(req, env, userId);
      expect(res.status).toBe(400);
    });
  });

  describe('handleGetProgramCurriculum', () => {
    it('returns 404 when student has no program', async () => {
      const db = makeChainDB([null]);
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/curriculum');
      const res = await handleGetProgramCurriculum(req, env, userId);
      expect(res.status).toBe(404);
    });
  });

  describe('handleGenerateProgramInvoice', () => {
    it('returns error when no payment hold found (already resolved or invoice exists)', async () => {
      const db = makeChainDB([null]);
      const env = makeEnv(db);
      const req = new Request('http://localhost/api/student/invoice/generate', { method: 'POST' });
      const res = await handleGenerateProgramInvoice(req, env, userId);
      expect(res.status).toBe(400);
    });
  });
});
