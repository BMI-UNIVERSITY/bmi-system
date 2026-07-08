import type { IDatabase } from '@bmi/ports';
import { ALLOWED_ORIGINS as BASE_ALLOWED_ORIGINS } from '@bmi/shared';
import type { PaginatedData } from '@bmi/shared';

// Re-export PaginatedData so route files can import it from one place
export type { PaginatedData };

import type { PlatformContext } from '@bmi/bootstrap';

declare global {
  interface Request {
    context: PlatformContext;
  }
}

export interface Env {
  PLATFORM_CONTEXT?: PlatformContext;
  DB: IDatabase;
  DOCUMENTS: R2Bucket;
  BACKUP_BUCKET: R2Bucket;
  JWT_SECRET: string;
  PASSWORD_PEPPER: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL: string;
  ADMIN_SETUP_KEY?: string;
  ENVIRONMENT: string;
  BACKUP_ENCRYPTION_KEY?: string;
  ASSETS: Fetcher;
  /** Comma-separated list of additional CORS origins to allow (no code change needed for new subdomains). */
  ALLOWED_ORIGINS_OVERRIDE?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  /** Outbound webhook target URL (set via wrangler secret put WEBHOOK_URL). */
  WEBHOOK_URL?: string;
  /** HMAC-SHA256 signing key for outbound webhooks. */
  WEBHOOK_SECRET?: string;
  /** Email address for critical ops alerts via Resend. */
  OPS_ALERT_EMAIL?: string;
  /** WriteQueue Durable Object — serializes D1 writes to prevent concurrency exhaustion */
  WRITE_QUEUE: DurableObjectNamespace;
  SENTRY_DSN?: string;
  EMAIL_QUEUE: Queue;
}

export type Role = 'applicant' | 'student' | 'staff' | 'admin' | 'verifier';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_verified: number;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  program: string;
  degree_level: 'undergraduate' | 'graduate' | 'doctorate' | 'certificate';
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'waitlisted';
  personal_statement: string | null;
  prior_education: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  user_id: string;
  doc_type: 'transcript' | 'id_document' | 'personal_statement' | 'recommendation' | 'other';
  file_name: string;
  r2_key: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_at: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  /** Session version — incremented on logout/password-reset to immediately invalidate all prior tokens */
  sv: number;
  iat: number;
  exp: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function error(message: string, status = 400): Response {
  return json({ success: false, error: message }, status);
}

export function ok<T>(data: T): Response {
  return json({ success: true, data });
}

/**
 * Build the CORS allowed-origin list.
 * Base origins come from @bmi/shared (G-3 fix — single source of truth).
 * Additional origins can be injected via the ALLOWED_ORIGINS_OVERRIDE Worker env var
 * (G-9 fix — CORS list as config, not code).
 */
function getAllowedOrigins(env?: Env): string[] {
  const extras = env?.ALLOWED_ORIGINS_OVERRIDE
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
  return [...BASE_ALLOWED_ORIGINS, ...extras];
}

export function getCorsHeaders(request: Request, env?: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = getAllowedOrigins(env);
  
  const isAllowed = allowed.includes(origin);
  const allowedOrigin = isAllowed ? origin : BASE_ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export async function logAdminAction(
  env: Env,
  userId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>,
  request?: Request
): Promise<void> {
  const ip = request?.headers.get('CF-Connecting-IP') || null;
  const userAgent = request?.headers.get('User-Agent') || null;
  const detailsStr = details ? JSON.stringify(details) : null;

  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO admin_audit_logs (id, user_id, action, target_type, target_id, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    userId,
    action,
    targetType || null,
    targetId || null,
    detailsStr,
    ip,
    userAgent
  ).run();
}

export function generateCsrfToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCsrfToken(request: Request): boolean {
  const cookieHeader = request.headers.get('Cookie');
  const csrfCookie = cookieHeader?.match(/csrf_token=([^;]+)/)?.[1];
  const csrfHeader = request.headers.get('X-CSRF-Token');
  return !!csrfCookie && !!csrfHeader && csrfCookie === csrfHeader;
}
