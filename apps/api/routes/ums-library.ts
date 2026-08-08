/**
 * BMI UMS — Library Module Routes (extended)
 * Adds borrowings and fines endpoints to complement the existing
 * handleListLibraryBooks in ums-collections.ts.
 */
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';

// ── Borrowings ────────────────────────────────────────────────────────────────

export async function handleListBorrowings(req: Request, env: Env): Promise<Response> {
  const url     = new URL(req.url);
  const status  = url.searchParams.get('status');
  const studentId = url.searchParams.get('student_id');
  const page    = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset  = (page - 1) * perPage;

  const filters: string[] = [];
  const bindings: unknown[] = [];
  if (status)    { filters.push('lb.status = ?');     bindings.push(status); }
  if (studentId) { filters.push('lb.student_id = ?'); bindings.push(studentId); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM library_borrowings lb ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT lb.*,
            bk.title as book_title, bk.author as book_author, bk.isbn,
            u.first_name, u.last_name, u.email
     FROM library_borrowings lb
     JOIN library_books bk ON lb.book_id = bk.id
     JOIN users u ON lb.student_id = u.id
     ${where}
     ORDER BY lb.borrow_date DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({ data: rows.results, meta: { total: countRow?.total ?? 0, page, perPage } });
}

export async function handleCreateBorrowing(req: Request, env: Env, _userId: string): Promise<Response> {
  const body = await req.json() as any;
  const { book_id, student_id, due_date } = body;

  if (!book_id || !student_id || !due_date) {
    return error('book_id, student_id, and due_date are required', 400);
  }

  // Check book availability
  const book = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, copies, status FROM library_books WHERE id = ?`
  ).bind(book_id).first<{ id: string; copies: number; status: string }>();

  if (!book) return error('Book not found', 404);
  if (book.copies <= 0 || book.status === 'Borrowed') {
    return error('No copies available', 409);
  }

  const id = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.batch([
    env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO library_borrowings (id, book_id, student_id, due_date)
       VALUES (?, ?, ?, ?)`
    ).bind(id, book_id, student_id, due_date),
    env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE library_books SET copies = copies - 1,
        status = CASE WHEN copies - 1 <= 0 THEN 'Borrowed' ELSE status END,
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(book_id),
  ]);

  return ok({ id, message: 'Book borrowed successfully' }, 201);
}

export async function handleReturnBook(_req: Request, env: Env, id: string): Promise<Response> {
  const borrowing = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, book_id, status FROM library_borrowings WHERE id = ?`
  ).bind(id).first<{ id: string; book_id: string; status: string }>();

  if (!borrowing) return error('Borrowing record not found', 404);
  if (borrowing.status === 'returned') return error('Book already returned', 409);

  const today = new Date().toISOString().split('T')[0];

  await env.PLATFORM_CONTEXT!.db.batch([
    env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE library_borrowings
       SET status = 'returned', return_date = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(today, id),
    env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE library_books
       SET copies = copies + 1, status = 'Available', updated_at = datetime('now')
       WHERE id = ?`
    ).bind(borrowing.book_id),
  ]);

  return ok({ id, message: 'Book returned successfully' });
}

// ── Fines ─────────────────────────────────────────────────────────────────────

export async function handleListFines(req: Request, env: Env): Promise<Response> {
  const url     = new URL(req.url);
  const paid    = url.searchParams.get('paid');
  const studentId = url.searchParams.get('student_id');
  const page    = Math.max(1, parseInt(url.searchParams.get('page')    || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  const offset  = (page - 1) * perPage;

  const filters: string[] = [];
  const bindings: unknown[] = [];
  if (paid != null) { filters.push('lf.paid = ?');       bindings.push(paid === 'true' ? 1 : 0); }
  if (studentId)    { filters.push('lf.student_id = ?'); bindings.push(studentId); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM library_fines lf ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const rows = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT lf.*,
            u.first_name, u.last_name,
            bk.title as book_title
     FROM library_fines lf
     JOIN users u ON lf.student_id = u.id
     JOIN library_borrowings lb ON lf.borrowing_id = lb.id
     JOIN library_books bk ON lb.book_id = bk.id
     ${where}
     ORDER BY lf.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({ data: rows.results, meta: { total: countRow?.total ?? 0, page, perPage } });
}

export async function handleMarkFinePaid(_req: Request, env: Env, id: string): Promise<Response> {
  const fine = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, paid FROM library_fines WHERE id = ?`
  ).bind(id).first<{ id: string; paid: number }>();

  if (!fine) return error('Fine not found', 404);
  if (fine.paid) return error('Fine already paid', 409);

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE library_fines SET paid = 1, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).bind(id).run();

  return ok({ id, message: 'Fine marked as paid' });
}
