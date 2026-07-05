import { verifyJWT } from '../lib/jwt';
import { error } from '../lib/types';
import type { Env, JWTPayload } from '../lib/types';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX_REQUESTS = 30;

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

// In-memory rate limit store — avoids costly KV writes on every request.
// Per-isolate state is acceptable for rate limiting at the edge.
// Entries are lazily evicted during the rate limit check.
const rateLimitMap = new Map<string, RateLimitEntry>();

function getNow(): number {
  return Date.now();
}

export async function requireAuth(
  request: Request,
  env: Env,
  requiredRoles?: string[]
): Promise<{ user: JWTPayload } | Response> {
  const authHeader = request.headers.get('Authorization');
  const cookieHeader = request.headers.get('Cookie');

  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (cookieHeader) {
    const match = cookieHeader.match(/bmi_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return error('Authentication required', 401);
  }

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) {
    return error('Invalid or expired token', 401);
  }

  const user = payload as unknown as JWTPayload;

  // Validate session_version against the DB.
  // This is instant and globally consistent: incrementing session_version on
  // logout/password-reset immediately invalidates ALL existing tokens for that
  // user — no eventual consistency lag, no sessions table required.
  const dbUser = await env.DB.prepare(
    `SELECT session_version FROM users WHERE id = ?`
  ).bind(user.sub).first<{ session_version: number }>();

  if (!dbUser) {
    return error('User not found', 401);
  }

  if (dbUser.session_version !== user.sv) {
    return error('Session has been invalidated. Please log in again.', 401);
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return error('Insufficient permissions', 403);
  }

  return { user };
}

export async function rateLimit(request: Request, env: Env, maxRequests = RATE_LIMIT_MAX_REQUESTS): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const url = new URL(request.url);
  const endpoint = url.pathname;
  
  // Use a fixed window string representation
  const windowStart = Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000)).toString();

  const res = await env.DB.prepare(
    `INSERT INTO rate_limits (ip_address, endpoint, window_start, request_count) 
     VALUES (?, ?, ?, 1) 
     ON CONFLICT(ip_address, endpoint, window_start) 
     DO UPDATE SET request_count = request_count + 1 
     RETURNING request_count`
  ).bind(ip, endpoint, windowStart).first<{ request_count: number }>();

  // Occasionally evict stale entries to keep table small
  if (Math.random() < 0.05) {
    const oldWindow = (Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000)) - 1).toString();
    env.DB.prepare(`DELETE FROM rate_limits WHERE window_start < ?`).bind(oldWindow).run().catch(() => {});
  }

  if (res && res.request_count > maxRequests) {
    return error('Rate limit exceeded. Please try again later.', 429);
  }

  return null;
}
