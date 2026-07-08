import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import {
  handleGetDashboard,
  handleGetCourses,
  handleEnroll,
  handleGetFinances,
  handlePayInvoice,
  handleDropCourse,
  handleGetTranscript,
  handleGetSettings,
  handleUpdateSettings,
  handleGetTickets,
  handleCreateTicket,
} from './student';

function makeDB(firstVal: any = null, allResults: any[] = []) {
  const firstMock = vi.fn().mockResolvedValue(firstVal);
  const allMock = vi.fn().mockResolvedValue({ results: allResults });
  const runMock = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: firstMock, all: allMock, run: runMock }),
    }),
  };
}

describe('student routes', () => {
  describe('handleGetDashboard', () => {
    it('returns dashboard with balance, invoices, courses, announcements', async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [{ id: 'inv1', amount: 500 }, { id: 'inv2', amount: 750 }] }),
          }),
        }),
      };
      const req = new Request('http://localhost/api/student/dashboard');
      const res = await handleGetDashboard(req, makeEnv(db), 'u1');
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.data.balance).toBe(1250);
      expect(body.data.announcements).toHaveLength(2);
    });
  });

  describe('handleGetCourses', () => {
    it('returns courses for given term', async () => {
      const courses = [{ id: 'c1', code: 'CS101', title: 'Intro', term: 'Fall 2026' }];
      const db = makeDB(null, courses);
      const req = new Request('http://localhost/api/student/courses?term=Fall+2026');
      const res = await handleGetCourses(req, makeEnv(db));
      const body = await res.json() as any;
      expect(body.data[0].code).toBe('CS101');
    });

    it('defaults to Fall 2026 term if not specified', async () => {
      const bindMock = vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue({ results: [] }) });
      const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock }) };
      const req = new Request('http://localhost/api/student/courses');
      await handleGetCourses(req, makeEnv(db));
      expect(bindMock.mock.calls[0][0]).toBe('Fall 2026');
    });
  });

  describe('handleEnroll', () => {
    it('returns 400 if course_id missing', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await handleEnroll(req, {} as any, 'u1');
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid JSON', async () => {
      const req = new Request('http://localhost', { method: 'POST', body: 'not-json' });
      const res = await handleEnroll(req, {} as any, 'u1');
      expect(res.status).toBe(400);
    });

    it('enrolls student successfully', async () => {
      const db = makeDB();
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ course_id: 'c1' }),
      });
      const res = await handleEnroll(req, makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data.success).toBe(true);
    });

    it('returns 400 if already enrolled (UNIQUE constraint)', async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed')),
          }),
        }),
      };
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ course_id: 'c1' }),
      });
      const res = await handleEnroll(req, makeEnv(db), 'u1');
      expect(res.status).toBe(400);
    });
  });

  describe('handleGetFinances', () => {
    it('returns invoices and balance', async () => {
      const invoices = [
        { id: 'i1', amount: 500, status: 'unpaid', due_date: '2026-09-01', created_at: '2026-07-01' },
        { id: 'i2', amount: 300, status: 'paid',   due_date: '2026-09-01', created_at: '2026-07-01' },
      ];
      const db = makeDB(null, invoices);
      const res = await handleGetFinances(new Request('http://localhost'), makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(body.data.balance).toBe(500); // only unpaid
      expect(body.data.invoices).toHaveLength(2);
    });
  });

  describe('handlePayInvoice', () => {
    it('returns 404 if invoice not found', async () => {
      const db = makeDB(null);
      const res = await handlePayInvoice(new Request('http://localhost'), makeEnv(db), 'u1', 'inv-none');
      expect(res.status).toBe(404);
    });

    it('returns 400 if invoice already paid', async () => {
      const db = makeDB({ status: 'paid' });
      const res = await handlePayInvoice(new Request('http://localhost'), makeEnv(db), 'u1', 'inv1');
      expect(res.status).toBe(400);
    });

    it('pays invoice and returns sandbox flag', async () => {

      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ status: 'unpaid' }),
            run: vi.fn().mockResolvedValue({}),
          }),
        }),
      };
      const res = await handlePayInvoice(new Request('http://localhost'), makeEnv(db), 'u1', 'inv1');
      const body = await res.json() as any;
      expect(body.data.sandbox).toBe(true);
    });
  });

  describe('handleDropCourse', () => {
    it('returns 400 if course not found or not enrolled', async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }) }),
        }),
      };
      const res = await handleDropCourse(new Request('http://localhost'), makeEnv(db), 'u1', 'c-none');
      expect(res.status).toBe(400);
    });

    it('drops course successfully', async () => {
      const db = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }) }),
        }),
      };
      const res = await handleDropCourse(new Request('http://localhost'), makeEnv(db), 'u1', 'c1');
      expect(res.status).toBe(200);
    });
  });

  describe('handleGetTranscript', () => {
    it('returns transcript with GPA calculation', async () => {
      const classes = [
        { code: 'CS101', title: 'Intro', credits: 3, term: 'Fall', enrollment_id: 'e1', status: 'enrolled', avg_pct: 85, letter_grade: 'A', grade_point: 4.0 },
        { code: 'CS102', title: 'Data', credits: 4, term: 'Fall', enrollment_id: 'e2', status: 'enrolled', avg_pct: null, letter_grade: 'N/A', grade_point: 0 },
      ];
      const db = makeDB(null, classes);
      const res = await handleGetTranscript(new Request('http://localhost'), makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(body.data.classes).toHaveLength(2);
      expect(body.data.gpa).not.toBeNull();
    });

    it('returns null GPA when no graded courses', async () => {
      const classes = [
        { code: 'CS101', title: 'Intro', credits: 3, term: 'Fall', enrollment_id: 'e1', status: 'enrolled', avg_pct: null },
      ];
      const db = makeDB(null, classes);
      const res = await handleGetTranscript(new Request('http://localhost'), makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(body.data.gpa).toBeNull();
    });
  });

  describe('handleGetSettings', () => {
    it('returns existing settings', async () => {
      const db = makeDB({ directory_release: 1, communications_opt_in: 0 });
      const res = await handleGetSettings(new Request('http://localhost'), makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(body.data.directory_release).toBe(1);
    });

    it('returns default settings if none exist', async () => {
      const db = makeDB(null);
      const res = await handleGetSettings(new Request('http://localhost'), makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(body.data.directory_release).toBe(1);
      expect(body.data.communications_opt_in).toBe(1);
    });
  });

  describe('handleUpdateSettings', () => {
    it('returns 400 for invalid JSON', async () => {
      const req = new Request('http://localhost', { method: 'PUT', body: 'bad' });
      const res = await handleUpdateSettings(req, {} as any, 'u1');
      expect(res.status).toBe(400);
    });

    it('upserts settings', async () => {
      const db = makeDB();
      const req = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ directory_release: false, communications_opt_in: true }),
      });
      const res = await handleUpdateSettings(req, makeEnv(db), 'u1');
      expect(res.status).toBe(200);
    });
  });

  describe('handleGetTickets / handleCreateTicket', () => {
    it('returns support tickets list', async () => {
      const tickets = [{ id: 't1', subject: 'Help', status: 'open', created_at: '2026-01-01' }];
      const db = makeDB(null, tickets);
      const res = await handleGetTickets(new Request('http://localhost'), makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(body.data[0].subject).toBe('Help');
    });

    it('handleCreateTicket returns 400 if subject or description missing', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ subject: 'Help' }), // missing description
      });
      const res = await handleCreateTicket(req, {} as any, 'u1');
      expect(res.status).toBe(400);
    });

    it('handleCreateTicket creates ticket successfully', async () => {
      const db = makeDB();
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ subject: 'Login issue', description: 'Cannot log in' }),
      });
      const res = await handleCreateTicket(req, makeEnv(db), 'u1');
      const body = await res.json() as any;
      expect(body.data.success).toBe(true);
      expect(body.data).toHaveProperty('ticket_id');
    });
  });
});
