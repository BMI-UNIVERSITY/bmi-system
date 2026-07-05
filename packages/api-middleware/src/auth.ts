import { verifyJWT } from './jwt';
import { errorResponse, type JWTPayload } from './types';

export async function requireAuth(
  request: Request,
  db: D1Database,
  jwtSecret: string,
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
    return errorResponse('Authentication required', 401);
  }

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) {
    return errorResponse('Invalid or expired token', 401);
  }

  const user = payload as unknown as JWTPayload;

  const dbUser = await db.prepare(
    `SELECT session_version FROM users WHERE id = ?`
  ).bind(user.sub).first<{ session_version: number }>();

  if (!dbUser) {
    return errorResponse('User not found', 401);
  }

  if (dbUser.session_version !== user.sv) {
    return errorResponse('Session has been invalidated. Please log in again.', 401);
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return errorResponse('Insufficient permissions', 403);
  }

  return { user };
}
