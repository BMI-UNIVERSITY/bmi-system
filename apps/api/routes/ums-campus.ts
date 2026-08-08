/**
 * BMI UMS — Campus Services Routes
 * Endpoints: /api/v1/campus/transport, /api/v1/campus/transport/passes
 */
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';

// ── Transport Routes ──────────────────────────────────────────────────────────

export async function handleListTransportRoutes(req: Request, env: Env): Promise<Response> {
  const url    = new URL(req.url);
  const status = url.searchParams.get('status') || 'active';

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT * FROM transport_routes WHERE status = ? ORDER BY name ASC`
  ).bind(status).all();

  return ok({ data: rows.results, meta: { total: rows.results.length } });
}

export async function handleCreateTransportRoute(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as any;
  const { name, origin, destination, departure_time, capacity, fare } = body;

  if (!name || !origin || !destination || !departure_time) {
    return error('name, origin, destination, and departure_time are required', 400);
  }

  const id = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO transport_routes (id, name, origin, destination, departure_time, capacity, fare)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, origin, destination, departure_time, capacity || 30, fare || 0).run();

  return ok({ id, message: 'Transport route created' }, 201);
}

export async function handleUpdateTransportRoute(req: Request, env: Env, id: string): Promise<Response> {
  const body = await req.json() as any;

  const existing = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM transport_routes WHERE id = ?`
  ).bind(id).first();
  if (!existing) return error('Transport route not found', 404);

  const fields: string[] = [];
  const bindings: unknown[] = [];

  if (body.name != null)           { fields.push('name = ?');           bindings.push(body.name); }
  if (body.origin != null)         { fields.push('origin = ?');         bindings.push(body.origin); }
  if (body.destination != null)    { fields.push('destination = ?');    bindings.push(body.destination); }
  if (body.departure_time != null) { fields.push('departure_time = ?'); bindings.push(body.departure_time); }
  if (body.capacity != null)       { fields.push('capacity = ?');       bindings.push(body.capacity); }
  if (body.fare != null)           { fields.push('fare = ?');           bindings.push(body.fare); }
  if (body.status != null)         { fields.push('status = ?');         bindings.push(body.status); }

  if (fields.length === 0) return error('No fields to update', 400);

  fields.push("updated_at = datetime('now')");
  bindings.push(id);

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE transport_routes SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...bindings).run();

  return ok({ id, message: 'Transport route updated' });
}

// ── Transport Passes ──────────────────────────────────────────────────────────

export async function handleListTransportPasses(req: Request, env: Env): Promise<Response> {
  const url       = new URL(req.url);
  const studentId = url.searchParams.get('student_id');
  const status    = url.searchParams.get('status');
  const page      = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage   = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset    = (page - 1) * perPage;

  const filters: string[] = [];
  const bindings: unknown[] = [];
  if (studentId) { filters.push('tp.student_id = ?'); bindings.push(studentId); }
  if (status)    { filters.push('tp.status = ?');     bindings.push(status); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM transport_passes tp ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT tp.*,
            u.first_name, u.last_name, u.email,
            tr.name as route_name, tr.origin, tr.destination, tr.departure_time
     FROM transport_passes tp
     JOIN users u ON tp.student_id = u.id
     JOIN transport_routes tr ON tp.route_id = tr.id
     ${where}
     ORDER BY tp.issued_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({ data: rows.results, meta: { total: countRow?.total ?? 0, page, perPage } });
}

export async function handleIssueTransportPass(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as any;
  const { student_id, route_id, valid_from, valid_to } = body;

  if (!student_id || !route_id || !valid_from || !valid_to) {
    return error('student_id, route_id, valid_from, and valid_to are required', 400);
  }

  const route = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM transport_routes WHERE id = ? AND status = 'active'`
  ).bind(route_id).first();
  if (!route) return error('Transport route not found or inactive', 404);

  const id = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO transport_passes (id, student_id, route_id, valid_from, valid_to)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, student_id, route_id, valid_from, valid_to).run();

  return ok({ id, message: 'Transport pass issued' }, 201);
}

export async function handleRevokeTransportPass(_req: Request, env: Env, id: string): Promise<Response> {
  const pass = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM transport_passes WHERE id = ?`
  ).bind(id).first();
  if (!pass) return error('Transport pass not found', 404);

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE transport_passes SET status = 'cancelled' WHERE id = ?`
  ).bind(id).run();

  return ok({ id, message: 'Transport pass revoked' });
}
