/**
 * BMI UMS – Dashboard Analytics Routes
 */
import { ok, error, json } from '../lib/types';
import type { Env } from '../lib/types';

export async function handleGetRevenueTrend(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const monthsStr = url.searchParams.get('months') || '6';
  const months = parseInt(monthsStr, 10);

  // We want to return an array of { month: 'Jan', revenue: 1000 }
  // We'll calculate the last N months, including current month.

  const result = [];
  const now = new Date();
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = monthNames[d.getMonth()];
    
    // SQLite formatting: strftime('%Y-%m', created_at)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    // Sum amount where status = 'paid' for this month
    const query = `
      SELECT SUM(amount) as revenue 
      FROM invoices 
      WHERE status = 'paid' 
      AND strftime('%Y-%m', created_at) = ?
    `;
    
    const row = await env.DB.prepare(query).bind(yearMonth).first<{ revenue: number }>();
    const revenue = row?.revenue || 0;
    
    result.push({
      month: monthName,
      revenue
    });
  }

  // ok(result) produces { success: true, data: result }
  // Dashboard checks Array.isArray(d.data) so data must be the array itself
  return ok(result);
}
