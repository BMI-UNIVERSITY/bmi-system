import { withSentry } from '@sentry/cloudflare';
import { requireAuth, rateLimit, withCors, getCorsHeaders, createLogger, requestLogger } from '@bmi/api-middleware';
import { trackResponseTime } from './performance';
import { error, validateCsrfToken } from './types';
import type { Env } from './types';
import backupWorker from '../backup';
import { runArchivalJob } from '../archival';
import { bootstrap } from '@bmi/bootstrap';

const log = createLogger('bmi-api');

export interface AuthResult {
  user: { sub: string; email: string; role: string; sv: number };
  token?: string;
}

export type RouteHandler = (
  req: Request,
  env: Env,
  p: string[],
  auth: AuthResult | undefined,
  ctx: ExecutionContext
) => Promise<Response> | Response;

export type Route = {
  method: string | string[];
  path: RegExp;
  roles?: string[];
  cacheTTL?: number;
  handler: RouteHandler;
};

export function createWorker(routes: Route[]) {
  return withSentry(
    (env: Env) => ({
      dsn: env.SENTRY_DSN || '',
      tracesSampleRate: 0.1, // Adjusted from 1.0 based on audit findings
    }),
    {
      async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const startTime = performance.now();
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: getCorsHeaders(request, env.ALLOWED_ORIGINS_OVERRIDE) });
        }

        const context = bootstrap(env);
        env.PLATFORM_CONTEXT = context;

        if (path === '/' || path === '/api/' || path === '/api') {
          return new Response(JSON.stringify({ name: 'BMI API Worker', version: '1.3.0', status: 'ok' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (!path.startsWith('/api/')) {
          return new Response('Not found', { status: 404 });
        }

        try {
          const rateLimitResult = await rateLimit(request, context.rateLimiter);
          if (rateLimitResult) {
            const duration = performance.now() - startTime;
            trackResponseTime(path, method, duration, rateLimitResult.status, request);
            return withCors(rateLimitResult, request, env.ALLOWED_ORIGINS_OVERRIDE);
          }

          const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
          const csrfExemptPaths = new Set([
            '/api/auth/login',
            '/api/auth/logout',
            '/api/auth/register',
            '/api/auth/claim',
            '/api/auth/forgot-password',
            '/api/auth/reset-password',
            '/api/auth/resend-verification',
            '/api/admin/setup',
          ]);
          const isCsrfExempt = csrfExemptPaths.has(path) || path.startsWith('/api/recommendations/');
          if (stateChangingMethods.includes(method) && !isCsrfExempt) {
            if (!validateCsrfToken(request)) {
              const duration = performance.now() - startTime;
              const errorResponse = error('Invalid CSRF token', 403);
              trackResponseTime(path, method, duration, 403, request);
              return withCors(errorResponse, request, env.ALLOWED_ORIGINS_OVERRIDE);
            }
          }

          for (const route of routes) {
            const methods = Array.isArray(route.method) ? route.method : [route.method];
            if (!methods.includes(method)) continue;

            const match = path.match(route.path);
            if (!match) continue;

            let auth: AuthResult | undefined;
            if (route.roles !== undefined) {
              const authResult = await requireAuth(request, context.db, env.JWT_SECRET, route.roles.length > 0 ? route.roles : undefined);
              if (authResult instanceof Response) {
                const duration = performance.now() - startTime;
                trackResponseTime(path, method, duration, authResult.status, request);
                return withCors(authResult, request, env.ALLOWED_ORIGINS_OVERRIDE);
              }
              auth = authResult as AuthResult;
            }

            let response = await route.handler(request, env, match, auth, ctx);
            
            if (route.cacheTTL && response.status === 200) {
              response = new Response(response.body, response);
              response.headers.set('Cache-Control', `public, max-age=${route.cacheTTL}, s-maxage=${route.cacheTTL}`);
            }

            const duration = performance.now() - startTime;
            trackResponseTime(path, method, duration, response.status, request);

            return withCors(response, request, env.ALLOWED_ORIGINS_OVERRIDE);
          }

          const duration = performance.now() - startTime;
          const notFoundResponse = error('Route not found', 404);
          trackResponseTime(path, method, duration, 404, request);
          return withCors(notFoundResponse, request, env.ALLOWED_ORIGINS_OVERRIDE);
        } catch (e: unknown) {
          const duration = performance.now() - startTime;
          trackResponseTime(path, method, duration, 500, request);
          
          const err = e as { message?: string; stack?: string } | null;
          requestLogger(log, request).error('Worker error', {
            err: err?.message ?? String(e),
            stack: err?.stack?.split('\n')[1]?.trim(),
          });
          return withCors(error('Internal server error', 500), request, env.ALLOWED_ORIGINS_OVERRIDE);
        }
      },
      async scheduled(controller: any, env: Env, ctx: ExecutionContext) {
        const context = bootstrap(env);
        env.PLATFORM_CONTEXT = context;
        await backupWorker.scheduled(controller, env, ctx);
        await runArchivalJob(env);
      },
      async queue(batch: any, env: Env, _ctx: ExecutionContext) {
        const context = bootstrap(env);
        env.PLATFORM_CONTEXT = context;
        const { processEmailDelivery } = await import('./email');
        for (const msg of batch.messages) {
          type EmailPayload = { to: string; subject: string; html: string; logId?: string; [key: string]: unknown };
          const payload = msg.body as EmailPayload;
          let status = 'failed';
          let errorMessage = '';
          try {
            const success = await processEmailDelivery(payload, context);
            if (success) {
              status = 'sent';
              msg.ack();
            } else {
              errorMessage = 'Email provider returned failure';
              msg.retry();
            }
          } catch (err: unknown) {
            errorMessage = err instanceof Error ? err.message : 'Unknown error';
            msg.retry();
          }
          if (payload.logId) {
            try {
              await env.PLATFORM_CONTEXT!.db.query(
                `UPDATE email_logs SET status = ?, error_message = ?, attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?`,
                [status, errorMessage || null, payload.logId]
              );
            } catch (e) {
              console.error('Failed to update email_logs:', e);
            }
          }
        }
      },
    }
  );
}
