/**
 * BMI UMS — Notifications Routes
 * Implements the polling-based notification bell (Step 6 of the strategy plan).
 * Both portals poll GET /api/v1/notifications every 20-30 seconds.
 * No WebSockets or Durable Objects needed — simple D1 table is sufficient.
 */
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';

// ── List notifications for the current user ───────────────────────────────────

export async function handleListNotifications(req: Request, env: Env, userId: string): Promise<Response> {
  const url     = new URL(req.url);
  const unread  = url.searchParams.get('unread');
  const page    = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage = Math.min(50, parseInt(url.searchParams.get('perPage') || '20'));
  const offset  = (page - 1) * perPage;

  const filters: string[] = ['user_id = ?'];
  const bindings: unknown[] = [userId];

  if (unread === 'true') { filters.push('is_read = 0'); }

  const where = `WHERE ${filters.join(' AND ')}`;

  const [countRow, rows] = await Promise.all([
    env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count
       FROM notifications ${where}`
    ).bind(...bindings).first<{ total: number; unread_count: number }>(),

    env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT * FROM notifications ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...bindings, perPage, offset).all(),
  ]);

  return ok({
    data: rows.results,
    meta: {
      total: countRow?.total ?? 0,
      unread_count: countRow?.unread_count ?? 0,
      page,
      perPage,
    },
  });
}

// ── Mark notification(s) as read ──────────────────────────────────────────────

export async function handleMarkNotificationsRead(req: Request, env: Env, userId: string): Promise<Response> {
  const body = await req.json().catch(() => ({})) as any;
  const ids: string[] | undefined = body?.ids;

  if (ids && ids.length > 0) {
    // Mark specific notifications as read
    const placeholders = ids.map(() => '?').join(',');
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE notifications SET is_read = 1
       WHERE user_id = ? AND id IN (${placeholders})`
    ).bind(userId, ...ids).run();
  } else {
    // Mark all as read
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`
    ).bind(userId).run();
  }

  return ok({ message: 'Notifications marked as read' });
}

// ── Create a notification (admin/system internal use) ─────────────────────────

export async function handleCreateNotification(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as any;
  const { user_id, type, title, body: notifBody, link } = body;

  if (!user_id || !title) {
    return error('user_id and title are required', 400);
  }

  const id = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, link)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, user_id, type || 'info', title, notifBody || null, link || null).run();

  return ok({ id, message: 'Notification created' }, 201);
}

// ── Bulk create notifications for multiple users ──────────────────────────────
// e.g. "New semester grades published" sent to all students in a cohort

export async function handleBroadcastNotification(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as any;
  const { user_ids, type, title, body: notifBody, link } = body;

  if (!user_ids || !Array.isArray(user_ids) || !title) {
    return error('user_ids (array) and title are required', 400);
  }

  const db = env.PLATFORM_CONTEXT!.db;
  const stmts = user_ids.map((uid: string) => {
    const id = crypto.randomUUID();
    return db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, uid, type || 'info', title, notifBody || null, link || null);
  });

  // D1 batch — sends all inserts in a single round-trip
  await db.batch(stmts);

  return ok({ message: `Notification sent to ${user_ids.length} users` });
}

// ── Delete old notifications (called from nightly cron) ───────────────────────
// Keeps the notifications table lean per the schema discipline guidelines

export async function pruneOldNotifications(db: any): Promise<void> {
  await db.prepare(
    `DELETE FROM notifications WHERE is_read = 1 AND created_at < datetime('now', '-30 days')`
  ).run();
}
