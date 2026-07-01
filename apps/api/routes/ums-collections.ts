/**
 * BMI UMS – Study Centers, Library, Hostels, Medical, Inventory, Visitors, Attendance Routes
 * Implements all remaining UMS collection endpoints backed by D1.
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';

function paginate(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '50'));
  return { page, perPage, offset: (page - 1) * perPage };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDY CENTERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleListStudyCenters(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  const search = url.searchParams.get('search');
  const filters: string[] = ['1=1'];
  const bindings: unknown[] = [];
  if (search) { filters.push(`(sc.name LIKE ? OR sc.code LIKE ? OR sc.location LIKE ?)`); const q = `%${search}%`; bindings.push(q, q, q); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const total = ((await env.DB.prepare(`SELECT COUNT(*) as c FROM study_centers sc ${where}`).bind(...bindings).first<{c:number}>())?.c) || 0;
  const { results } = await env.DB.prepare(
    `SELECT sc.*, u.first_name || ' ' || u.last_name as director_name
     FROM study_centers sc LEFT JOIN users u ON sc.director_id = u.id
     ${where} ORDER BY sc.name LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();
  return json({ success: true, data: results, total, page, perPage, totalPages: Math.ceil(total / perPage) });
}

export async function handleGetStudyCenter(request: Request, env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare(`SELECT * FROM study_centers WHERE id = ?`).bind(id).first();
  if (!row) return error('Study center not found', 404);
  return ok(row);
}

export async function handleGetStudyCenterStats(request: Request, env: Env, id: string): Promise<Response> {
  const center = await env.DB.prepare(`SELECT * FROM study_centers WHERE id = ?`).bind(id).first();
  if (!center) return error('Study center not found', 404);
  const studentCount = (await env.DB.prepare(`SELECT COUNT(*) as c FROM students WHERE study_center_id = ?`).bind(id).first<{c:number}>())?.c || 0;
  return ok({ center, studentCount });
}

export async function handleCreateStudyCenter(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO study_centers (id,name,code,location,address,phone,email,capacity,is_active) VALUES (?,?,?,?,?,?,?,?,1)`
  ).bind(id, body.name, body.code||null, body.location||null, body.address||null, body.phone||null, body.email||null, body.capacity||0).run();
  const row = await env.DB.prepare(`SELECT * FROM study_centers WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleUpdateStudyCenter(request: Request, env: Env, id: string): Promise<Response> {
  const body: any = await request.json();
  await env.DB.prepare(
    `UPDATE study_centers SET name=COALESCE(?,name), code=COALESCE(?,code), location=COALESCE(?,location), is_active=COALESCE(?,is_active), updated_at=datetime('now') WHERE id=?`
  ).bind(body.name||null, body.code||null, body.location||null, body.is_active??null, id).run();
  const row = await env.DB.prepare(`SELECT * FROM study_centers WHERE id = ?`).bind(id).first();
  return ok(row);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleListLibraryBooks(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  const search = url.searchParams.get('search');
  const category = url.searchParams.get('category');
  const type = url.searchParams.get('type');
  const filters: string[] = ['1=1'];
  const bindings: unknown[] = [];
  if (search) { filters.push(`(title LIKE ? OR author LIKE ? OR isbn LIKE ?)`); const q = `%${search}%`; bindings.push(q, q, q); }
  if (category) { filters.push(`category = ?`); bindings.push(category); }
  if (type) { filters.push(`type = ?`); bindings.push(type); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const total = ((await env.DB.prepare(`SELECT COUNT(*) as c FROM library_books ${where}`).bind(...bindings).first<{c:number}>())?.c) || 0;
  const { results } = await env.DB.prepare(`SELECT * FROM library_books ${where} ORDER BY title LIMIT ? OFFSET ?`).bind(...bindings, perPage, offset).all();
  // Map to frontend LibraryItem interface
  const items = results.map((b: any) => ({
    id: b.id, title: b.title, author: b.author, category: b.category, type: b.type,
    status: b.status, year: b.year, description: b.description, downloadUrl: b.download_url,
    location: b.location, isbn: b.isbn, created: b.created_at, updated: b.updated_at
  }));
  return json({ success: true, data: items, total, page, perPage });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOSTELS
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleListHostels(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  const total = ((await env.DB.prepare(`SELECT COUNT(*) as c FROM hostels`).first<{c:number}>())?.c) || 0;
  const { results } = await env.DB.prepare(`SELECT * FROM hostels ORDER BY name LIMIT ? OFFSET ?`).bind(perPage, offset).all();
  return json({ success: true, data: results, total, page, perPage });
}

export async function handleCreateHostel(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO hostels (id,name,type,capacity,location,status) VALUES (?,?,?,?,?,?)`).bind(id, body.name, body.type||'Male', body.capacity||0, body.location||null, 'Available').run();
  const row = await env.DB.prepare(`SELECT * FROM hostels WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleListRoomAssignments(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  const hostelId = url.searchParams.get('hostelId');
  const filters: string[] = ['1=1'];
  const bindings: unknown[] = [];
  if (hostelId) { filters.push(`ra.hostel_id = ?`); bindings.push(hostelId); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const total = ((await env.DB.prepare(`SELECT COUNT(*) as c FROM hostel_room_assignments ra ${where}`).bind(...bindings).first<{c:number}>())?.c) || 0;
  const { results } = await env.DB.prepare(
    `SELECT ra.*, u.first_name || ' ' || u.last_name as student_name, h.name as hostel_name
     FROM hostel_room_assignments ra
     LEFT JOIN users u ON ra.student_id = u.id
     LEFT JOIN hostels h ON ra.hostel_id = h.id
     ${where} ORDER BY ra.check_in_date DESC LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();
  const items = results.map((r: any) => ({
    id: r.id, student_id: r.student_id, studentName: r.student_name,
    hostelId: r.hostel_id, hostelName: r.hostel_name, roomNumber: r.room_number,
    checkInDate: r.check_in_date, status: r.status
  }));
  return json({ success: true, data: items, total, page, perPage });
}

export async function handleCreateRoomAssignment(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO hostel_room_assignments (id,student_id,hostel_id,room_number,check_in_date,status) VALUES (?,?,?,?,?,?)`).bind(id, body.student_id, body.hostelId||body.hostel_id, body.roomNumber||body.room_number, body.checkInDate||body.check_in_date||new Date().toISOString(), 'Active').run();
  const row = await env.DB.prepare(`SELECT * FROM hostel_room_assignments WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleDeleteRoomAssignment(request: Request, env: Env, id: string): Promise<Response> {
  await env.DB.prepare(`UPDATE hostel_room_assignments SET status='Revoked', updated_at=datetime('now') WHERE id=?`).bind(id).run();
  return ok({ id, deleted: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleListMedicalRecords(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  const total = ((await env.DB.prepare(`SELECT COUNT(*) as c FROM medical_records`).first<{c:number}>())?.c) || 0;
  const { results } = await env.DB.prepare(
    `SELECT mr.*, u.first_name || ' ' || u.last_name as student_name
     FROM medical_records mr LEFT JOIN users u ON mr.student_id = u.id
     ORDER BY mr.visit_date DESC LIMIT ? OFFSET ?`
  ).bind(perPage, offset).all();
  const items = results.map((r: any) => ({
    id: r.id, student_id: r.student_id, studentId: r.student_id,
    studentName: r.student_name, condition: r.condition_name, bloodType: r.blood_type,
    date: r.visit_date, attendingStaff: r.attending_staff, status: r.status,
    vitals: (() => { try { return JSON.parse(r.vitals || '{}'); } catch { return {}; } })(),
    notes: r.notes
  }));
  return json({ success: true, data: items, total, page, perPage });
}

export async function handleCreateMedicalRecord(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO medical_records (id,student_id,condition_name,blood_type,visit_date,attending_staff,status,vitals,notes) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, body.student_id||body.studentId, body.condition, body.bloodType||null, body.date||new Date().toISOString(), body.attendingStaff||null, body.status||'Normal', JSON.stringify(body.vitals||{}), body.notes||null).run();
  const row = await env.DB.prepare(`SELECT * FROM medical_records WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleDeleteMedicalRecord(request: Request, env: Env, id: string): Promise<Response> {
  await env.DB.prepare(`DELETE FROM medical_records WHERE id = ?`).bind(id).run();
  return ok({ id, deleted: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleListInventory(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  const search = url.searchParams.get('search');
  const filters: string[] = ['1=1'];
  const bindings: unknown[] = [];
  if (search) { filters.push(`(name LIKE ? OR category LIKE ?)`); const q = `%${search}%`; bindings.push(q, q); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const total = ((await env.DB.prepare(`SELECT COUNT(*) as c FROM inventory_items ${where}`).bind(...bindings).first<{c:number}>())?.c) || 0;
  const { results } = await env.DB.prepare(`SELECT * FROM inventory_items ${where} ORDER BY name LIMIT ? OFFSET ?`).bind(...bindings, perPage, offset).all();
  return json({ success: true, data: results, total, page, perPage });
}

export async function handleCreateInventoryItem(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO inventory_items (id,name,category,quantity,unit,location,status,cost_per_unit,supplier) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, body.name, body.category||null, body.quantity||0, body.unit||'pcs', body.location||null, body.status||'In Stock', body.cost_per_unit||0, body.supplier||null).run();
  const row = await env.DB.prepare(`SELECT * FROM inventory_items WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleUpdateInventoryItem(request: Request, env: Env, id: string): Promise<Response> {
  const body: any = await request.json();
  await env.DB.prepare(`UPDATE inventory_items SET name=COALESCE(?,name), quantity=COALESCE(?,quantity), status=COALESCE(?,status), updated_at=datetime('now') WHERE id=?`).bind(body.name||null, body.quantity??null, body.status||null, id).run();
  const row = await env.DB.prepare(`SELECT * FROM inventory_items WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleDeleteInventoryItem(request: Request, env: Env, id: string): Promise<Response> {
  await env.DB.prepare(`DELETE FROM inventory_items WHERE id = ?`).bind(id).run();
  return ok({ id, deleted: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISITORS
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleListVisitors(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  const total = ((await env.DB.prepare(`SELECT COUNT(*) as c FROM visitors`).first<{c:number}>())?.c) || 0;
  const { results } = await env.DB.prepare(`SELECT * FROM visitors ORDER BY check_in DESC LIMIT ? OFFSET ?`).bind(perPage, offset).all();
  return json({ success: true, data: results, total, page, perPage });
}

export async function handleCreateVisitor(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO visitors (id,full_name,phone,email,id_type,id_number,purpose,host_name,host_department,check_in,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id, body.full_name||body.fullName, body.phone||null, body.email||null, body.id_type||'National ID', body.id_number||null, body.purpose, body.host_name||body.hostName||null, body.host_department||body.hostDepartment||null, new Date().toISOString(), 'Checked In').run();
  const row = await env.DB.prepare(`SELECT * FROM visitors WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleUpdateVisitor(request: Request, env: Env, id: string): Promise<Response> {
  const body: any = await request.json();
  const checkOut = body.status === 'Checked Out' ? new Date().toISOString() : null;
  await env.DB.prepare(`UPDATE visitors SET status=COALESCE(?,status), check_out=COALESCE(?,check_out) WHERE id=?`).bind(body.status||null, checkOut, id).run();
  const row = await env.DB.prepare(`SELECT * FROM visitors WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleDeleteVisitor(request: Request, env: Env, id: string): Promise<Response> {
  await env.DB.prepare(`DELETE FROM visitors WHERE id = ?`).bind(id).run();
  return ok({ id, deleted: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleListAttendance(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  const courseId = url.searchParams.get('courseId');
  const studentId = url.searchParams.get('studentId');
  const filters: string[] = ['1=1'];
  const bindings: unknown[] = [];
  if (courseId) { filters.push(`ar.course_id = ?`); bindings.push(courseId); }
  if (studentId) { filters.push(`ar.student_id = ?`); bindings.push(studentId); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const total = ((await env.DB.prepare(`SELECT COUNT(*) as c FROM attendance_records ar ${where}`).bind(...bindings).first<{c:number}>())?.c) || 0;
  const { results } = await env.DB.prepare(
    `SELECT ar.*, u.first_name || ' ' || u.last_name as student_name, c.title as course_title, c.code as course_code
     FROM attendance_records ar
     LEFT JOIN users u ON ar.student_id = u.id
     LEFT JOIN courses c ON ar.course_id = c.id
     ${where} ORDER BY ar.date DESC LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();
  return json({ success: true, data: results, total, page, perPage });
}

export async function handleCreateAttendanceRecord(request: Request, env: Env): Promise<Response> {
  const body: any = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO attendance_records (id,student_id,course_id,term_id,date,status,remarks) VALUES (?,?,?,?,?,?,?)`).bind(id, body.student_id||body.studentId, body.course_id||body.courseId||null, body.term_id||body.termId||null, body.date||new Date().toISOString().split('T')[0], body.status||'Present', body.remarks||null).run();
  const row = await env.DB.prepare(`SELECT * FROM attendance_records WHERE id = ?`).bind(id).first();
  return ok(row);
}

export async function handleUpdateAttendanceRecord(request: Request, env: Env, id: string): Promise<Response> {
  const body: any = await request.json();
  await env.DB.prepare(`UPDATE attendance_records SET status=COALESCE(?,status), remarks=COALESCE(?,remarks), updated_at=datetime('now') WHERE id=?`).bind(body.status||null, body.remarks||null, id).run();
  const row = await env.DB.prepare(`SELECT * FROM attendance_records WHERE id = ?`).bind(id).first();
  return ok(row);
}
