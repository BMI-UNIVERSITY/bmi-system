import { describe, it, expect, vi } from 'vitest';
import {
  handleListTimetabling,
  handleCreateTimetabling,
} from './ums-timetabling';

function makeDB(results: any[] = []) {
  const allMock = vi.fn().mockResolvedValue({ results });
  const runMock = vi.fn().mockResolvedValue({});
  return {
    prepare: vi.fn().mockReturnValue({
      all: allMock,
      bind: vi.fn().mockReturnValue({ run: runMock, all: allMock }),
    }),
  };
}

describe('ums-timetabling routes', () => {
  it('handleListTimetabling returns formatted timetable entries', async () => {
    const rows = [
      {
        id: 'tt1',
        day_of_week: 'Monday',
        start_time: '09:00',
        end_time: '11:00',
        course_id: 'c1',
        instructor_id: 'u1',
        classroom_id: 'room-A',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        course_code: 'CS101',
        course_name: 'Intro to CS',
        first_name: 'Dr',
        last_name: 'Smith',
      },
    ];
    const db = makeDB(rows);
    const req = new Request('http://localhost/api/timetabling');
    const res = await handleListTimetabling(req, { DB: db as any } as any);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].expand.course_id.code).toBe('CS101');
    expect(body.data[0].expand.instructor_id.name).toBe('Dr Smith');
    expect(body.data[0].expand.classroom_id.name).toBe('room-A');
  });

  it('handleListTimetabling handles null instructor name gracefully', async () => {
    const rows = [
      {
        id: 'tt2',
        day_of_week: 'Tuesday',
        start_time: '10:00',
        end_time: '12:00',
        course_id: 'c2',
        instructor_id: null,
        classroom_id: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        course_code: 'MATH101',
        course_name: 'Algebra',
        first_name: null,
        last_name: null,
      },
    ];
    const db = makeDB(rows);
    const res = await handleListTimetabling(new Request('http://localhost'), { DB: db as any } as any);
    const body = await res.json() as any;

    expect(body.data[0].expand.instructor_id.name).toBe('');
    expect(body.data[0].expand.classroom_id.name).toBe('TBD');
  });

  it('handleListTimetabling returns empty array when no entries', async () => {
    const db = makeDB([]);
    const res = await handleListTimetabling(new Request('http://localhost'), { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data).toHaveLength(0);
  });

  it('handleCreateTimetabling inserts and returns list', async () => {
    const rows = [
      {
        id: 'tt-new',
        day_of_week: 'Wednesday',
        start_time: '14:00',
        end_time: '16:00',
        course_id: 'c1',
        instructor_id: 'u1',
        classroom_id: 'lab-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        course_code: 'CS201',
        course_name: 'Advanced CS',
        first_name: 'Prof',
        last_name: 'Jones',
      },
    ];
    const allMock = vi.fn().mockResolvedValue({ results: rows });
    const runMock = vi.fn().mockResolvedValue({});
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: allMock,
        bind: vi.fn().mockReturnValue({ run: runMock, all: allMock }),
      }),
    };

    const req = new Request('http://localhost/api/timetabling', {
      method: 'POST',
      body: JSON.stringify({
        course_id: 'c1',
        instructor_id: 'u1',
        classroom_id: 'lab-1',
        day_of_week: 'Wednesday',
        start_time: '14:00',
        end_time: '16:00',
      }),
    });
    const res = await handleCreateTimetabling(req, { DB: db as any } as any);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(runMock).toHaveBeenCalled();
    expect(body.data[0].expand.course_id.code).toBe('CS201');
  });
});
