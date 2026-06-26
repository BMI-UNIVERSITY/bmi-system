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

  const sessionValid = await env.SESSIONS.get(`session:${user.sub}`);
  if (!sessionValid) {
    return error('Session expired. Please log in again.', 401);
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
  const now = getNow();
  const windowStart = now - (RATE_LIMIT_WINDOW * 1000);
  const key = `${ip}:${endpoint}`;

  // Lazily evict stale entries
  if (rateLimitMap.size > 10000) {
    for (const [k, entry] of rateLimitMap) {
      if (entry.timestamp < windowStart) {
        rateLimitMap.delete(k);
      }
    }
  }

  const entry = rateLimitMap.get(key);
  if (entry) {
    if (entry.timestamp < windowStart) {
      // Window expired, reset
      rateLimitMap.set(key, { count: 1, timestamp: now });
    } else if (entry.count >= maxRequests) {
      return error('Rate limit exceeded. Please try again later.', 429);
    } else {
      entry.count++;
    }
  } else {
    rateLimitMap.set(key, { count: 1, timestamp: now });
  }

  return null;
}
