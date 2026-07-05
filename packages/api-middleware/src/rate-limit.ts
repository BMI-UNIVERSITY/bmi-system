import { errorResponse } from './types';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX_REQUESTS = 30;

export async function rateLimit(
  request: Request,
  db: D1Database,
  maxRequests = RATE_LIMIT_MAX_REQUESTS
): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const url = new URL(request.url);
  const endpoint = url.pathname;
  
  const windowStart = Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000)).toString();

  const res = await db.prepare(
    `INSERT INTO rate_limits (ip_address, endpoint, window_start, request_count) 
     VALUES (?, ?, ?, 1) 
     ON CONFLICT(ip_address, endpoint, window_start) 
     DO UPDATE SET request_count = request_count + 1 
     RETURNING request_count`
  ).bind(ip, endpoint, windowStart).first<{ request_count: number }>();

  if (Math.random() < 0.05) {
    const oldWindow = (Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000)) - 1).toString();
    db.prepare(`DELETE FROM rate_limits WHERE window_start < ?`).bind(oldWindow).run().catch(() => {});
  }

  if (res && res.request_count > maxRequests) {
    return errorResponse('Rate limit exceeded. Please try again later.', 429);
  }

  return null;
}
