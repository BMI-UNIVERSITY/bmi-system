import { describe, it, expect, vi } from 'vitest';
import {
  handleListStudyCenters,
  handleGetStudyCenter,
  handleGetStudyCenterStats,
  handleCreateStudyCenter,
  handleUpdateStudyCenter,
  handleListLibraryBooks,
  handleListHostels,
  handleCreateHostel,
  handleListRoomAssignments,
  handleCreateRoomAssignment,
  handleDeleteRoomAssignment,
  handleListMedicalRecords,
  handleCreateMedicalRecord,
  handleDeleteMedicalRecord,
  handleListInventory,
  handleCreateInventoryItem,
  handleUpdateInventoryItem,
  handleDeleteInventoryItem,
  handleListVisitors,
  handleCreateVisitor,
  handleUpdateVisitor,
  handleDeleteVisitor,
  handleListAttendance,
  handleCreateAttendanceRecord,
  handleUpdateAttendanceRecord,
} from './ums-collections';

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

describe('ums-collections study centers', () => {
  it('handleListStudyCenters returns paginated list', async () => {
    const db = makeDB({ c: 1 }, [{ id: 'sc1', name: 'Central' }]);
    const req = new Request('http://localhost/api/study-centers');
    const res = await handleListStudyCenters(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleGetStudyCenter returns 404 when not found', async () => {
    const db = makeDB(null);
    const res = await handleGetStudyCenter(new Request('http://localhost'), { DB: db as any } as any, 'sc-none');
    expect(res.status).toBe(404);
  });

  it('handleGetStudyCenter returns center', async () => {
    const db = makeDB({ id: 'sc1', name: 'Central' });
    const res = await handleGetStudyCenter(new Request('http://localhost'), { DB: db as any } as any, 'sc1');
    const body = await res.json() as any;
    expect(body.data.name).toBe('Central');
  });

  it('handleGetStudyCenterStats returns 404 if not found', async () => {
    const db = makeDB(null);
    const res = await handleGetStudyCenterStats(new Request('http://localhost'), { DB: db as any } as any, 'sc-none');
    expect(res.status).toBe(404);
  });

  it('handleGetStudyCenterStats returns center with student count', async () => {
    let call = 0;
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => call++ === 0
            ? Promise.resolve({ id: 'sc1' })
            : Promise.resolve({ c: 42 })),
        }),
      })
    };
    const res = await handleGetStudyCenterStats(new Request('http://localhost'), { DB: db as any } as any, 'sc1');
    const body = await res.json() as any;
    expect(body.data.studentCount).toBe(42);
  });

  it('handleCreateStudyCenter creates and returns center', async () => {
    const db = makeDB({ id: 'sc-new', name: 'New Center' });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'New Center', capacity: 100 }) });
    const res = await handleCreateStudyCenter(req, { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data.name).toBe('New Center');
  });

  it('handleUpdateStudyCenter updates center', async () => {
    const db = makeDB({ id: 'sc1', name: 'Updated' });
    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ name: 'Updated' }) });
    const res = await handleUpdateStudyCenter(req, { DB: db as any } as any, 'sc1');
    expect(res.status).toBe(200);
  });
});

describe('ums-collections library', () => {
  it('handleListLibraryBooks returns mapped items', async () => {
    const db = makeDB({ c: 1 }, [{ id: 'b1', title: 'Clean Code', author: 'Martin', category: 'CS', type: 'Book', status: 'Available', year: 2008, description: 'Great', download_url: null, location: 'A1', isbn: '123', created_at: '2026-01-01', updated_at: '2026-01-01' }]);
    const req = new Request('http://localhost/api/library');
    const res = await handleListLibraryBooks(req, { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].title).toBe('Clean Code');
    expect(body.data[0]).toHaveProperty('downloadUrl');
  });
});

describe('ums-collections hostels', () => {
  it('handleListHostels returns paginated hostels', async () => {
    const db = makeDB({ c: 2 }, [{ id: 'h1', name: 'Block A' }]);
    const req = new Request('http://localhost/api/hostels');
    const res = await handleListHostels(req, { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].name).toBe('Block A');
  });

  it('handleCreateHostel creates hostel', async () => {
    const db = makeDB({ id: 'h-new', name: 'Block B' });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Block B', type: 'Female', capacity: 50 }) });
    const res = await handleCreateHostel(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleListRoomAssignments returns mapped assignments', async () => {
    const db = makeDB({ c: 1 }, [{ id: 'ra1', student_id: 'u1', student_name: 'Alice', hostel_id: 'h1', hostel_name: 'Block A', room_number: '101', check_in_date: '2026-09-01', status: 'Active' }]);
    const req = new Request('http://localhost/api/hostels/rooms');
    const res = await handleListRoomAssignments(req, { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].roomNumber).toBe('101');
  });

  it('handleCreateRoomAssignment creates assignment', async () => {
    const db = makeDB({ id: 'ra-new' });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ student_id: 'u1', hostelId: 'h1', roomNumber: '102' }) });
    const res = await handleCreateRoomAssignment(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleDeleteRoomAssignment revokes assignment', async () => {
    const db = makeDB();
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await handleDeleteRoomAssignment(req, { DB: db as any } as any, 'ra1');
    const body = await res.json() as any;
    expect(body.data.deleted).toBe(true);
  });
});

describe('ums-collections medical', () => {
  it('handleListMedicalRecords returns mapped records', async () => {
    const db = makeDB({ c: 1 }, [{ id: 'mr1', student_id: 'u1', student_name: 'Alice', condition_name: 'Fever', blood_type: 'O+', visit_date: '2026-01-01', attending_staff: 'Dr. John', status: 'Normal', vitals: '{"temp": 37.5}', notes: null }]);
    const req = new Request('http://localhost/api/medical');
    const res = await handleListMedicalRecords(req, { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].condition).toBe('Fever');
    expect(body.data[0].vitals).toEqual({ temp: 37.5 });
  });

  it('handleCreateMedicalRecord creates record', async () => {
    const db = makeDB({ id: 'mr-new' });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ studentId: 'u1', condition: 'Headache', vitals: {} }) });
    const res = await handleCreateMedicalRecord(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleDeleteMedicalRecord deletes record', async () => {
    const db = makeDB();
    const res = await handleDeleteMedicalRecord(new Request('http://localhost'), { DB: db as any } as any, 'mr1');
    const body = await res.json() as any;
    expect(body.data.deleted).toBe(true);
  });
});

describe('ums-collections inventory', () => {
  it('handleListInventory returns items', async () => {
    const db = makeDB({ c: 1 }, [{ id: 'inv1', name: 'Chair', category: 'Furniture' }]);
    const req = new Request('http://localhost/api/inventory');
    const res = await handleListInventory(req, { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].name).toBe('Chair');
  });

  it('handleCreateInventoryItem creates item', async () => {
    const db = makeDB({ id: 'inv-new', name: 'Desk' });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Desk', quantity: 10 }) });
    const res = await handleCreateInventoryItem(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleUpdateInventoryItem updates item', async () => {
    const db = makeDB({ id: 'inv1', name: 'Desk', quantity: 20 });
    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ quantity: 20 }) });
    const res = await handleUpdateInventoryItem(req, { DB: db as any } as any, 'inv1');
    expect(res.status).toBe(200);
  });

  it('handleDeleteInventoryItem deletes item', async () => {
    const db = makeDB();
    const res = await handleDeleteInventoryItem(new Request('http://localhost'), { DB: db as any } as any, 'inv1');
    const body = await res.json() as any;
    expect(body.data.deleted).toBe(true);
  });
});

describe('ums-collections visitors', () => {
  it('handleListVisitors returns visitors', async () => {
    const db = makeDB({ c: 1 }, [{ id: 'v1', full_name: 'John Doe' }]);
    const req = new Request('http://localhost/api/visitors');
    const res = await handleListVisitors(req, { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].full_name).toBe('John Doe');
  });

  it('handleCreateVisitor creates visitor', async () => {
    const db = makeDB({ id: 'v-new' });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ full_name: 'Jane Doe', purpose: 'Meeting' }) });
    const res = await handleCreateVisitor(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleUpdateVisitor updates visitor checkout', async () => {
    const db = makeDB({ id: 'v1', status: 'Checked Out' });
    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ status: 'Checked Out' }) });
    const res = await handleUpdateVisitor(req, { DB: db as any } as any, 'v1');
    expect(res.status).toBe(200);
  });

  it('handleDeleteVisitor deletes visitor', async () => {
    const db = makeDB();
    const res = await handleDeleteVisitor(new Request('http://localhost'), { DB: db as any } as any, 'v1');
    const body = await res.json() as any;
    expect(body.data.deleted).toBe(true);
  });
});

describe('ums-collections attendance', () => {
  it('handleListAttendance returns records', async () => {
    const db = makeDB({ c: 2 }, [{ id: 'ar1', student_name: 'Alice', course_title: 'CS101', date: '2026-01-10', status: 'Present' }]);
    const req = new Request('http://localhost/api/attendance');
    const res = await handleListAttendance(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleCreateAttendanceRecord creates record', async () => {
    const db = makeDB({ id: 'ar-new' });
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ studentId: 'u1', courseId: 'c1', status: 'Present' }) });
    const res = await handleCreateAttendanceRecord(req, { DB: db as any } as any);
    expect(res.status).toBe(200);
  });

  it('handleUpdateAttendanceRecord updates record', async () => {
    const db = makeDB({ id: 'ar1', status: 'Late' });
    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ status: 'Late' }) });
    const res = await handleUpdateAttendanceRecord(req, { DB: db as any } as any, 'ar1');
    expect(res.status).toBe(200);
  });
});
