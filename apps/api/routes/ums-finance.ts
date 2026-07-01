/**
 * BMI UMS – Finance & Transactions Routes
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';

function paginate(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '50'));
  return { page, perPage, offset: (page - 1) * perPage };
}

// ─── list transactions (invoices) ─────────────────────────────────────────────

export async function handleListTransactions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);
  
  const statusFilter = url.searchParams.get('status');
  
  const filters: string[] = [];
  const bindings: unknown[] = [];
  
  if (statusFilter) {
    if (statusFilter.toLowerCase() === 'paid') {
      filters.push(`i.status = 'paid'`);
    } else if (statusFilter.toLowerCase() === 'pending') {
      filters.push(`i.status = 'unpaid'`);
    } else {
      filters.push(`i.status = ?`);
      bindings.push(statusFilter.toLowerCase());
    }
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  
  const countQuery = `SELECT COUNT(*) as count FROM invoices i ${whereClause}`;
  const countResult = await env.DB.prepare(countQuery).bind(...bindings).first<{ count: number }>();
  const total = countResult?.count || 0;

  const dataQuery = `
    SELECT i.*, u.first_name, u.last_name
    FROM invoices i
    LEFT JOIN users u ON i.student_id = u.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const { results } = await env.DB.prepare(dataQuery).bind(...bindings, perPage, offset).all();

  const items = results.map((inv: any) => ({
    id: inv.id,
    studentId: inv.student_id,
    studentName: `${inv.first_name || ''} ${inv.last_name || ''}`.trim() || 'Unknown Student',
    amount: inv.amount,
    amt: inv.amount, // Provide amt for UI compatibility
    type: 'Tuition', // Defaulting since D1 doesn't store type yet
    status: inv.status === 'paid' ? 'Paid' : (inv.status === 'unpaid' ? 'Pending' : 'Failed'),
    date: inv.created_at,
    reference: inv.id.substring(0, 8).toUpperCase()
  }));

  return ok({
    data: items,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage)
  });
}
