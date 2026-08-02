/**
 * BMI UMS — Alumni Module Routes
 * Endpoints: /api/v1/alumni/profiles, /api/v1/alumni/events, /api/v1/alumni/donations
 */
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';

// ── Alumni Profiles ───────────────────────────────────────────────────────────

export async function handleListAlumniProfiles(req: Request, env: Env): Promise<Response> {
  const url     = new URL(req.url);
  const search  = url.searchParams.get('search');
  const year    = url.searchParams.get('graduation_year');
  const page    = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset  = (page - 1) * perPage;

  const filters: string[] = [];
  const bindings: unknown[] = [];

  if (search) {
    filters.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR ap.current_employer LIKE ?)');
    const q = `%${search}%`;
    bindings.push(q, q, q);
  }
  if (year) { filters.push('ap.graduation_year = ?'); bindings.push(parseInt(year)); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM alumni_profiles ap JOIN users u ON ap.user_id = u.id ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT ap.*, u.first_name, u.last_name, u.email
     FROM alumni_profiles ap
     JOIN users u ON ap.user_id = u.id
     ${where}
     ORDER BY ap.graduation_year DESC, u.last_name ASC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({ data: rows.results, meta: { total: countRow?.total ?? 0, page, perPage } });
}

export async function handleUpsertAlumniProfile(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await req.json() as any;
  const { graduation_year, program, current_employer, current_role, linkedin_url, location, bio } = body;

  const existing = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM alumni_profiles WHERE user_id = ?`
  ).bind(userId).first<{ id: string }>();

  if (existing) {
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE alumni_profiles SET graduation_year=?, program=?, current_employer=?,
        current_role=?, linkedin_url=?, location=?, bio=?, updated_at=datetime('now')
       WHERE user_id=?`
    ).bind(graduation_year, program, current_employer, current_role, linkedin_url, location, bio, userId).run();
    return ok({ id: existing.id, message: 'Alumni profile updated' });
  }

  const id = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO alumni_profiles (id, user_id, graduation_year, program, current_employer, current_role, linkedin_url, location, bio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, graduation_year, program, current_employer, current_role, linkedin_url, location, bio).run();

  return ok({ id, message: 'Alumni profile created' }, 201);
}

// ── Alumni Events ─────────────────────────────────────────────────────────────

export async function handleListAlumniEvents(req: Request, env: Env): Promise<Response> {
  const url     = new URL(req.url);
  const status  = url.searchParams.get('status');
  const page    = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset  = (page - 1) * perPage;

  const filters: string[] = [];
  const bindings: unknown[] = [];
  if (status) { filters.push('status = ?'); bindings.push(status); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM alumni_events ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT * FROM alumni_events ${where} ORDER BY event_date DESC LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({ data: rows.results, meta: { total: countRow?.total ?? 0, page, perPage } });
}

export async function handleCreateAlumniEvent(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await req.json() as any;
  const { title, description, event_date, location, is_virtual, meet_link, capacity } = body;

  if (!title || !event_date) return error('title and event_date are required', 400);

  const id = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO alumni_events (id, title, description, event_date, location, is_virtual, meet_link, capacity, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, title, description || null, event_date, location || null, is_virtual ? 1 : 0, meet_link || null, capacity || null, userId).run();

  return ok({ id, message: 'Event created' }, 201);
}

// ── Alumni Donations ──────────────────────────────────────────────────────────

export async function handleListDonations(req: Request, env: Env): Promise<Response> {
  const url     = new URL(req.url);
  const page    = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset  = (page - 1) * perPage;

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM alumni_donations`
  ).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT ad.*, u.first_name, u.last_name, ap.program
     FROM alumni_donations ad
     JOIN alumni_profiles ap ON ad.alumni_id = ap.id
     JOIN users u ON ap.user_id = u.id
     ORDER BY ad.donated_at DESC
     LIMIT ? OFFSET ?`
  ).bind(perPage, offset).all();

  return ok({ data: rows.results, meta: { total: countRow?.total ?? 0, page, perPage } });
}

export async function handleRecordDonation(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as any;
  const { alumni_id, amount, currency, purpose, reference } = body;

  if (!alumni_id || !amount) return error('alumni_id and amount are required', 400);

  const profile = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM alumni_profiles WHERE id = ?`
  ).bind(alumni_id).first();
  if (!profile) return error('Alumni profile not found', 404);

  const id = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO alumni_donations (id, alumni_id, amount, currency, purpose, reference)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, alumni_id, amount, currency || 'GHS', purpose || 'General', reference || null).run();

  return ok({ id, message: 'Donation recorded' }, 201);
}
