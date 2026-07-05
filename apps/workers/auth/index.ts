import { requireAuth, rateLimit, withCors, getCorsHeaders } from '@bmi/api-middleware';
import type { Env } from './lib/types';
import { WriteQueue } from './lib/WriteQueue';
import {
  handleRegister, handleLogin, handleRefresh, handleLogout,
  handleVerifyEmail, handleResendVerification,
  handleForgotPassword, handleResetPassword,
  handleMe,
  handleMfaSetup, handleMfaEnable, handleMfaDisable,
  handleOAuthLogin, handleOAuthCallback
} from './routes/auth';

type RouteHandler = (
  req: Request,
  env: Env,
  p: string[],
  auth: any,
  ctx: ExecutionContext
) => Promise<Response> | Response;

type Route = {
  method: string | string[];
  path: RegExp;
  roles?: string[];
  handler: RouteHandler;
};

const ROUTES: Route[] = [
  { method: 'POST', path: /^\/api\/auth\/register$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleRegister(req, env) },
  { method: 'POST', path: /^\/api\/auth\/login$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleLogin(req, env) },
  { method: 'POST', path: /^\/api\/auth\/refresh$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleRefresh(req, env) },
  { method: 'DELETE', path: /^\/api\/auth\/logout$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleLogout(req, env) },
  { method: 'GET', path: /^\/api\/auth\/verify$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleVerifyEmail(req, env) },
  { method: 'POST', path: /^\/api\/auth\/resend-verification$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleResendVerification(req, env) },
  { method: 'POST', path: /^\/api\/auth\/forgot-password$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleForgotPassword(req, env) },
  { method: 'POST', path: /^\/api\/auth\/reset-password$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleResetPassword(req, env) },
  { method: 'GET', path: /^\/api\/auth\/me$/, roles: [], handler: async (req, env, p, auth, ctx) => handleMe(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/setup$/, roles: [], handler: async (req, env, p, auth, ctx) => handleMfaSetup(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/enable$/, roles: [], handler: async (req, env, p, auth, ctx) => handleMfaEnable(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/disable$/, roles: [], handler: async (req, env, p, auth, ctx) => handleMfaDisable(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/auth\/oauth\/(google|github|microsoft)$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleOAuthLogin(req, env, p[1] as 'google' | 'github' | 'microsoft') },
  { method: 'GET', path: /^\/api\/auth\/oauth\/(google|github|microsoft)\/callback$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleOAuthCallback(req, env, p[1] as 'google' | 'github' | 'microsoft') },
  
  // v1 aliases (used by older clients)
  { method: 'POST', path: /^\/api\/v1\/auth\/login$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleLogin(req, env) },
  { method: ['POST', 'DELETE'], path: /^\/api\/v1\/auth\/logout$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleLogout(req, env) },
  { method: 'GET', path: /^\/api\/v1\/auth\/me$/, roles: [], handler: async (req, env, p, auth, ctx) => handleMe(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/v1\/auth\/refresh$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleRefresh(req, env) },
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env.ALLOWED_ORIGINS_OVERRIDE) });
    }

    if (!path.startsWith('/api/auth/') && !path.startsWith('/api/v1/auth/')) {
      return new Response('Not found', { status: 404 });
    }

    try {
      const rateLimitResult = await rateLimit(request, env.DB);
      if (rateLimitResult) return withCors(rateLimitResult, request, env.ALLOWED_ORIGINS_OVERRIDE);

      for (const route of ROUTES) {
        const methods = Array.isArray(route.method) ? route.method : [route.method];
        if (methods.includes(method)) {
          const match = path.match(route.path);
          if (match) {
            let authData = null;
            if (route.roles) {
              const authResult = await requireAuth(request, env.DB, env.JWT_SECRET, route.roles.length > 0 ? route.roles : undefined);
              if (authResult instanceof Response) {
                return withCors(authResult, request, env.ALLOWED_ORIGINS_OVERRIDE);
              }
              authData = authResult;
            }

            const response = await route.handler(request, env, match, authData, ctx);
            return withCors(response, request, env.ALLOWED_ORIGINS_OVERRIDE);
          }
        }
      }

      return withCors(new Response('Method not allowed or endpoint not found', { status: 404 }), request, env.ALLOWED_ORIGINS_OVERRIDE);
    } catch (err: any) {
      console.error(`[Worker Error] ${method} ${path}`, err);
      return withCors(
        new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
        request,
        env.ALLOWED_ORIGINS_OVERRIDE
      );
    }
  },
};

export { WriteQueue };
