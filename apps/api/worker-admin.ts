// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { createWorker, Route } from './lib/worker-factory';
import { handleAdminSetup, handleListUsers, handleUpdateUserRole, handleDeleteUser, handleAdminResetPassword, handleGetAuditLogs, handleBulkEmails, handleListContactSubmissions, handleListNewsletterSubscribers } from './routes/admin';
import { handleAdminSyncCurriculum, handleAdminSetProgramFee, handleAdminResolveHold } from './routes/enrollment';

const routes: Route[] = [
  { method: 'POST', path: /^\/api\/admin\/setup$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleAdminSetup(req, env) },
  { method: 'GET', path: /^\/api\/admin\/users$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleListUsers(req, env) },
  { method: 'PUT', path: /^\/api\/admin\/users\/([^/]+)\/role$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleUpdateUserRole(req, env, auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/admin\/users\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteUser(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/admin\/users\/([^/]+)\/reset-password$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleAdminResetPassword(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/admin\/emails\/bulk$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleBulkEmails(req, env) },
  { method: 'GET', path: /^\/api\/admin\/audit-logs$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleGetAuditLogs(req, env) },
  { method: 'GET', path: /^\/api\/admin\/contact-submissions$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListContactSubmissions(req, env) },
  { method: 'GET', path: /^\/api\/admin\/newsletter-subscribers$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListNewsletterSubscribers(req, env) },
  { method: 'POST', path: /^\/api\/admin\/curriculum\/sync$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleAdminSyncCurriculum(req, env) },
  { method: 'POST', path: /^\/api\/admin\/program-fee$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleAdminSetProgramFee(req, env) },
  { method: 'POST', path: /^\/api\/admin\/students\/([^/]+)\/resolve-hold$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleAdminResolveHold(req, env, p[1]) },
];

export default createWorker(routes);
