import { requireAuth, rateLimit, withCors, getCorsHeaders } from '@bmi/api-middleware';
import type { Env } from './lib/types';

import { handleSubmitApplication, handleGetMyApplication, handleListApplications, handleGetApplication, handleUpdateStatus, handleGetStatusLogs, handleGetLifecycle } from './routes/apply';
import { handleUploadDocument, handleDownloadDocument, handleDeleteDocument } from './routes/documents';
import { handleRequestRecommendation, handleGetRecommendationInfo, handleUploadRecommendation, handleListRecommendations } from './routes/recommendations';
import { handleAdminSetup, handleListUsers, handleUpdateUserRole, handleDeleteUser, handleAdminResetPassword, handleGetAuditLogs } from './routes/admin';
import { handleListPosts, handleCreatePost, handleUpdatePost, handleDeletePost, handleListPages, handleCreatePage, handleDeletePage } from './routes/cms';

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
  // Applications
  { method: 'POST', path: /^\/api\/applications$/, roles: ['applicant', 'student', 'staff', 'admin'], handler: async (req, env, p, auth, ctx) => handleSubmitApplication(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/applications\/me$/, roles: [], handler: async (req, env, p, auth, ctx) => handleGetMyApplication(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/admin\/applications$/, roles: ['staff', 'admin'], handler: async (req, env, p, auth, ctx) => handleListApplications(req, env) },
  { method: 'GET', path: /^\/api\/admin\/applications\/([^/]+)$/, roles: ['staff', 'admin'], handler: async (req, env, p, auth, ctx) => handleGetApplication(req, env) },
  { method: 'PUT', path: /^\/api\/admin\/applications\/([^/]+)\/status$/, roles: ['staff', 'admin'], handler: async (req, env, p, auth, ctx) => handleUpdateStatus(req, env, p[1], auth!.user.sub, ctx) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/logs$/, roles: [], handler: async (req, env, p, auth, ctx) => handleGetStatusLogs(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/lifecycle$/, roles: [], handler: async (req, env, p, auth, ctx) => handleGetLifecycle(req, env, p[1], auth!.user.sub, auth!.user.role) },

  // Documents
  { method: 'POST', path: /^\/api\/documents\/upload$/, roles: [], handler: async (req, env, p, auth, ctx) => handleUploadDocument(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/documents\/([^/]+)\/download$/, roles: [], handler: async (req, env, p, auth, ctx) => handleDownloadDocument(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'DELETE', path: /^\/api\/admin\/documents\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteDocument(req, env, p[1], auth!.user.sub) },

  // Recommendations
  { method: 'POST', path: /^\/api\/applications\/([^/]+)\/recommendations$/, roles: [], handler: async (req, env, p, auth, ctx) => handleRequestRecommendation(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/recommendations\/([^/]+)$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleGetRecommendationInfo(req, env, p[1]) },
  { method: 'POST', path: /^\/api\/recommendations\/([^/]+)\/upload$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleUploadRecommendation(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/recommendations$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListRecommendations(req, env, p[1], auth!.user.sub) },

  // Admin
  { method: 'POST', path: /^\/api\/admin\/setup$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleAdminSetup(req, env) },
  { method: 'GET', path: /^\/api\/admin\/users$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleListUsers(req, env) },
  { method: 'PUT', path: /^\/api\/admin\/users\/([^/]+)\/role$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleUpdateUserRole(req, env, auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/admin\/users\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteUser(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/admin\/users\/([^/]+)\/reset-password$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleAdminResetPassword(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/admin\/audit-logs$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleGetAuditLogs(req, env) },

  // CMS
  { method: 'GET', path: /^\/api\/cms\/posts$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListPosts(req, env) },
  { method: 'POST', path: /^\/api\/cms\/posts$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreatePost(req, env, auth!.user.sub) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/cms\/posts\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdatePost(req, env, p[1], auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/cms\/posts\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeletePost(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/cms\/pages$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListPages(req, env) },
  { method: 'POST', path: /^\/api\/cms\/pages$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreatePage(req, env, auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/cms\/pages\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeletePage(req, env, p[1], auth!.user.sub) },
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env.ALLOWED_ORIGINS_OVERRIDE) });
    }

    if (!path.startsWith('/api/applications') && !path.startsWith('/api/admin') && !path.startsWith('/api/cms') && !path.startsWith('/api/documents') && !path.startsWith('/api/recommendations')) {
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
