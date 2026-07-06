import { requireAuth, rateLimit, withCors, getCorsHeaders, createLogger, requestLogger } from '@bmi/api-middleware';
import type { Env } from './lib/types';
import { handleInboundWebhook, handleListEvents, handleListDeadLetters, handleRetryDeadLetter } from './routes/webhooks';

type RouteHandler = (
  req: Request,
  env: Env,
  p: string[],
  ctx: ExecutionContext
) => Promise<Response> | Response;

const log = createLogger('bmi-webhooks');

type Route = {
  method: string | string[];
  path: RegExp;
  roles?: string[];
  handler: RouteHandler;
};

const ROUTES: Route[] = [
  { method: 'POST', path: /^\/api\/webhooks\/inbound$/, handler: (req, env) => handleInboundWebhook(req, env) },
  { method: 'GET', path: /^\/api\/webhooks\/events$/, roles: ['admin'], handler: (req, env) => handleListEvents(req, env) },
  { method: 'GET', path: /^\/api\/webhooks\/dead-letters$/, roles: ['admin'], handler: (req, env) => handleListDeadLetters(req, env) },
  { method: 'POST', path: /^\/api\/webhooks\/retry\/([^/]+)$/, roles: ['admin'], handler: (req, env, p, ctx) => handleRetryDeadLetter(req, env, p[1], ctx) },
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    if (!path.startsWith('/api/webhooks/')) {
      return new Response('Not found', { status: 404 });
    }

    try {
      const rateLimitResult = await rateLimit(request, env.DB);
      if (rateLimitResult) return withCors(rateLimitResult, request);

      for (const route of ROUTES) {
        const methods = Array.isArray(route.method) ? route.method : [route.method];
        if (methods.includes(method)) {
          const match = path.match(route.path);
          if (match) {
            // Check auth if roles are defined
            if (route.roles) {
              const authResult = await requireAuth(request, env.DB, env.JWT_SECRET, route.roles);
              if (authResult instanceof Response) {
                return withCors(authResult, request);
              }
            }

            const response = await route.handler(request, env, match, ctx);
            return withCors(response, request);
          }
        }
      }

      return withCors(new Response('Method not allowed or endpoint not found', { status: 404 }), request);
    } catch (err: any) {
      requestLogger(log, request).error('Unhandled worker error', {
        err: err?.message ?? String(err),
        stack: err?.stack?.split('\n')[1]?.trim(),
      });
      return withCors(
        new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
        request
      );
    }
  },
};
