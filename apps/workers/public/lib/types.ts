/**
 * bmi-public Worker — Env type
 *
 * Scoped to only the bindings this Worker needs.
 * No JWT_SECRET, no DOCUMENTS, no R2 — zero blast radius.
 */

import { ALLOWED_ORIGINS as BASE_ALLOWED_ORIGINS } from '@bmi/shared';

export interface Env {
  /** Cloudflare D1 — only accessed by the scheduled cron, never per-request */
  DB: D1Database;
  /** KV namespace for pre-computed public data snapshots */
  CF_CACHE: KVNamespace;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS_OVERRIDE?: string;
}

export function getAllowedOrigins(env: Env): string[] {
  const extras = env.ALLOWED_ORIGINS_OVERRIDE
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
  return [...BASE_ALLOWED_ORIGINS, ...extras];
}

export function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = getAllowedOrigins(env);
  const allowedOrigin = allowed.includes(origin) ? origin : BASE_ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export function ok<T>(data: T, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function notFound(message = 'Not found'): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
