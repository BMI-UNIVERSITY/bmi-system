// BMI UMS - Audit Logging Middleware
import type { Context, Next } from 'hono';
import { auditLogger, logger } from '../utils/logger.js';
import { errorMessage } from '../utils/helpers.js';
import { getUser } from './auth.js';
import type { AuditLog } from '../types/index.js';

import { getPocketBase } from '../services/pocketbase.js';

/**
 * Audit Logging Middleware
 * Logs all requests to the audit log
 */
export async function auditMiddleware(c: Context, next: Next) {
  const start = Date.now();
  const user = getUser(c) ?? (c.get('user') as { sub: string; email: string } | undefined);
  const method = c.req.method;
  const path = c.req.path;

  // Clone body if it's a mutation for logging
  let requestBody = null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const cloned = await c.req.raw.clone().json();
      // Mask sensitive fields
      if (cloned.password) cloned.password = '********';
      if (cloned.token) cloned.token = '********';
      requestBody = cloned;
    } catch (error) {
      // Body might not be JSON or already consumed
    }
  }

  auditLogger.info({
    method,
    path,
    userId: user?.sub || 'anonymous',
    userEmail: user?.email || 'anonymous',
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    userAgent: c.req.header('user-agent'),
    timestamp: new Date().toISOString(),
  }, 'Request started');

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  auditLogger.info({
    method,
    path,
    status,
    duration: `${duration}ms`,
    userId: user?.sub || 'anonymous',
    timestamp: new Date().toISOString(),
  }, 'Request completed');

  // Persist mutation audits to PocketBase for history/restore
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && status >= 200 && status < 300) {
    try {
      const pb = getPocketBase();
      // Check if audit_logs collection exists (optional, create will fail if not)
      await pb.collection('audit_logs').create({
        user_id: user?.sub || 'anonymous',
        user_email: user?.email || 'anonymous',
        action: method,
        resource: path,
        payload: JSON.stringify(requestBody),
        status_code: status,
        duration,
        ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Don't block the request if audit logging fails
      logger.warn(`Failed to persist audit log to DB: ${errorMessage(error)}`);
    }
  }
}

/**
 * Log a specific action to the audit log
 */
export function logAction(
  action: AuditLog['action'],
  resource: string,
  details?: Record<string, unknown>
) {
  return async (c: Context, next: Next) => {
    await next();

    // Only log successful operations
    if (c.res.status >= 200 && c.res.status < 300) {
      const user = getUser(c) ?? (c.get('user') as { sub: string; email: string } | undefined);
      auditLogger.info({
        action,
        resource,
        userId: user?.sub || 'anonymous',
        userEmail: user?.email || 'anonymous',
        details,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        timestamp: new Date().toISOString(),
      }, 'Action performed');
    }
  };
}






