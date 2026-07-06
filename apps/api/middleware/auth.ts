import { verifyJWT } from '../lib/jwt';
import { error } from '../lib/types';
import type { Env, JWTPayload } from '../lib/types';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX_REQUESTS = 50; // Increased from 30 for better UX
const RATE_LIMIT_CLEANUP_PROBABILITY = 0.02; // Reduced cleanup frequency

// Enhanced rate limiting with performance optimizations
export async function rateLimit(request: Request, env: Env, maxRequests = RATE_LIMIT_MAX_REQUESTS): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const url = new URL(request.url);
  const endpoint = url.pathname;
  
  // Use shorter window strings for better performance
  const windowStart = Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000));
  const windowKey = `${windowStart}`;

  try {
    // Use single query with INSERT OR UPDATE pattern for better performance
    const result = await env.DB.prepare(
      `INSERT INTO rate_limits (ip_address, endpoint, window_start, request_count, last_request) 
       VALUES (?, ?, ?, 1, datetime('now')) 
       ON CONFLICT(ip_address, endpoint, window_start) 
       DO UPDATE SET 
         request_count = request_count + 1,
         last_request = datetime('now')
       RETURNING request_count`
    ).bind(ip, endpoint, windowKey).first<{ request_count: number }>();

    // Background cleanup with reduced frequency
    if (Math.random() < RATE_LIMIT_CLEANUP_PROBABILITY) {
      const staleWindow = windowStart - 2; // Keep 2 windows for overlap
      env.DB.prepare(`DELETE FROM rate_limits WHERE window_start < ?`)
        .bind(staleWindow.toString())
        .run()
        .catch(() => {}); // Silent failure for background cleanup
    }

    if (result && result.request_count > maxRequests) {
      // Enhanced rate limit response with retry information
      const retryAfter = RATE_LIMIT_WINDOW - (Date.now() / 1000 % RATE_LIMIT_WINDOW);
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retry_after_seconds: Math.ceil(retryAfter),
          limit: maxRequests,
          window_seconds: RATE_LIMIT_WINDOW
        }), 
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(retryAfter).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, maxRequests - result.request_count).toString(),
            'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + retryAfter).toString()
          }
        }
      );
    }

    return null;
  } catch (e) {
    // Rate limiting failure shouldn't break the request - log and allow
    console.error('Rate limiting failed:', e);
    return null;
  }
}

// Optimized auth with session version caching potential
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

  // Optimized session validation with minimal DB query
  // Only fetch session_version, not full user record
  const dbUser = await env.DB.prepare(
    `SELECT session_version FROM users WHERE id = ? LIMIT 1`
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
