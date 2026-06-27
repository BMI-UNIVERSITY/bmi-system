import { withSentry } from '@sentry/cloudflare';
import { handleRegister, handleLogin, handleLogout, handleMe, handleVerifyEmail, handleResendVerification, handleForgotPassword, handleResetPassword, handleMfaSetup, handleMfaEnable, handleMfaDisable, handleOAuthLogin, handleOAuthCallback } from './routes/auth';
import { handleSubmitApplication, handleGetMyApplication, handleListApplications, handleGetApplication, handleUpdateStatus, handleGetStatusLogs } from './routes/apply';
import { handleUploadDocument, handleDownloadDocument, handleDeleteDocument } from './routes/documents';
import { handleRequestRecommendation, handleGetRecommendationInfo, handleUploadRecommendation, handleListRecommendations } from './routes/recommendations';
import { requireAuth, rateLimit } from './middleware/auth';
import { handleGetDashboard, handleGetCourses, handleEnroll, handleGetFinances, handlePayInvoice, handleDropCourse, handleGetTranscript, handleGetSettings, handleUpdateSettings, handleGetTickets, handleCreateTicket } from './routes/student';
import { handleAdminSetup, handleListUsers, handleUpdateUserRole, handleDeleteUser, handleAdminResetPassword, handleGetAuditLogs } from './routes/admin';
import { error, getCorsHeaders, validateCsrfToken } from './lib/types';
import type { Env } from './lib/types';
import backupWorker from './backup';
// Integration routes
import { handlePublicPrograms, handlePublicStats, handlePublicListPosts, handlePublicGetPost, handlePublicGetPage } from './routes/public';
import { handleListPosts, handleCreatePost, handleUpdatePost, handleDeletePost, handleListPages, handleCreatePage, handleDeletePage } from './routes/cms';
import { handleInboundWebhook, handleListEvents, handleListDeadLetters, handleRetryDeadLetter } from './routes/webhooks';
// UMS routes
import { handleListStudents, handleGetStudent, handleCreateStudent, handleUpdateStudent, handleDeleteStudent } from './routes/ums-students';
import { handleListGrades, handleCreateGrade, handleUpdateGrade } from './routes/ums-grades';
import { handleListUmsCourses, handleCreateCourse, handleUpdateCourse, handleDeleteCourse, handleListPrograms, handleListFaculties, handleListDepartments, handleListTerms, handleListEnrollments, handleCreateEnrollment } from './routes/ums-courses';
import { handleListStaff, handleGetStaff, handleCreateStaff, handleUpdateStaff } from './routes/ums-staff';

function withCors(response: Response, request: Request): Response {
  const corsHeaders = getCorsHeaders(request);
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://api.resend.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  return new Response(response.body, { status: response.status, headers: newHeaders });
}

const PUBLIC_ROUTES = ['/api/auth/register', '/api/auth/login', '/api/health'];

export default withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN || '',
    tracesSampleRate: 1.0,
  }),
  {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    if (!path.startsWith('/api/')) {
      return new Response('Not found', { status: 404 });
    }

    try {
      const rateLimitResult = await rateLimit(request, env);
      if (rateLimitResult) return withCors(rateLimitResult, request);

      // Validate CSRF token for state-changing requests
      const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      const csrfExemptPaths = [
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/auth/resend-verification',
        '/api/admin/setup',
      ];
      const isCsrfExempt = csrfExemptPaths.some(p => path.startsWith(p)) || path.startsWith('/api/recommendations/');
      if (stateChangingMethods.includes(method) && !isCsrfExempt) {
        if (!validateCsrfToken(request)) {
          return withCors(error('Invalid CSRF token', 403), request);
        }
      }

      let response: Response;

      if (path === '/api/auth/register' && method === 'POST') {
        response = await handleRegister(request, env);
      } else if (path === '/api/auth/login' && method === 'POST') {
        response = await handleLogin(request, env);
      } else if (path === '/api/auth/logout' && method === 'DELETE') {
        response = await handleLogout(request, env);
      } else if (path === '/api/auth/verify' && method === 'GET') {
        response = await handleVerifyEmail(request, env);
      } else if (path === '/api/auth/resend-verification' && method === 'POST') {
        response = await handleResendVerification(request, env);
      } else if (path === '/api/auth/forgot-password' && method === 'POST') {
        response = await handleForgotPassword(request, env);
      } else if (path === '/api/auth/reset-password' && method === 'POST') {
        response = await handleResetPassword(request, env);
      } else if (path === '/api/auth/me' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleMe(request, env, auth.user.sub);
      } else if (path === '/api/auth/mfa/setup' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleMfaSetup(request, env, auth.user.sub);
      } else if (path === '/api/auth/mfa/enable' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleMfaEnable(request, env, auth.user.sub);
      } else if (path === '/api/auth/mfa/disable' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleMfaDisable(request, env, auth.user.sub);
      } else if (path === '/api/applications' && method === 'POST') {
        const auth = await requireAuth(request, env, ['applicant', 'student', 'staff', 'admin']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleSubmitApplication(request, env, auth.user.sub);
      } else if (path === '/api/applications/me' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetMyApplication(request, env, auth.user.sub);
      } else if (path.match(/^\/api\/applications\/[^/]+\/logs$/) && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        const appId = path.split('/')[3];
        response = await handleGetStatusLogs(request, env, appId, auth.user.sub, auth.user.role);
      } else if (path === '/api/documents/upload' && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleUploadDocument(request, env, auth.user.sub);
      } else if (path.match(/^\/api\/documents\/[^/]+\/download$/) && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        const docId = path.split('/')[3];
        response = await handleDownloadDocument(request, env, docId, auth.user.sub, auth.user.role);
      } else if (path.match(/^\/api\/applications\/[^/]+\/recommendations$/) && method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleRequestRecommendation(request, env, path.split('/')[3], auth.user.sub);
      } else if (path.match(/^\/api\/applications\/[^/]+\/recommendations$/) && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleListRecommendations(request, env, path.split('/')[3], auth.user.sub);
      } else if (path.match(/^\/api\/recommendations\/[^/]+$/) && method === 'GET') {
        response = await handleGetRecommendationInfo(request, env, path.split('/')[3]);
      } else if (path.match(/^\/api\/recommendations\/[^/]+\/upload$/) && method === 'POST') {
        response = await handleUploadRecommendation(request, env, path.split('/')[3]);

      // ─── Student Only Routes ───────────────────────────────────────
      } else if (path === '/api/student/dashboard' && method === 'GET') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetDashboard(request, env, auth.user.sub);
      } else if (path === '/api/student/courses' && method === 'GET') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetCourses(request, env);
      } else if (path === '/api/student/enroll' && method === 'POST') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleEnroll(request, env, auth.user.sub);
      } else if (path.match(/^\/api\/student\/courses\/[^/]+\/drop$/) && method === 'POST') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        const courseId = path.split('/')[4];
        response = await handleDropCourse(request, env, auth.user.sub, courseId);
      } else if (path === '/api/student/transcript' && method === 'GET') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetTranscript(request, env, auth.user.sub);
      } else if (path === '/api/student/settings' && method === 'GET') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetSettings(request, env, auth.user.sub);
      } else if (path === '/api/student/settings' && method === 'PUT') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleUpdateSettings(request, env, auth.user.sub);
      } else if (path === '/api/student/support' && method === 'GET') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetTickets(request, env, auth.user.sub);
      } else if (path === '/api/student/support' && method === 'POST') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleCreateTicket(request, env, auth.user.sub);
      } else if (path === '/api/student/finances' && method === 'GET') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetFinances(request, env, auth.user.sub);
      } else if (path.match(/^\/api\/student\/invoices\/[^/]+\/pay$/) && method === 'POST') {
        const auth = await requireAuth(request, env, ['student']);
        if (auth instanceof Response) return withCors(auth, request);
        const invoiceId = path.split('/')[4];
        response = await handlePayInvoice(request, env, auth.user.sub, invoiceId);

      // ─── Admin/Staff Only Routes ──────────────────────────────────
      } else if (path === '/api/admin/setup' && method === 'POST') {
        response = await handleAdminSetup(request, env);
      } else if (path === '/api/admin/users' && method === 'GET') {
        const auth = await requireAuth(request, env, ['admin']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleListUsers(request, env);
      } else if (path.match(/^\/api\/admin\/users\/[^/]+\/role$/) && method === 'PUT') {
        const auth = await requireAuth(request, env, ['admin']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleUpdateUserRole(request, env, auth.user.sub);
      } else if (path.match(/^\/api\/admin\/users\/[^/]+$/) && method === 'DELETE') {
        const auth = await requireAuth(request, env, ['admin']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleDeleteUser(request, env, auth.user.sub);
      } else if (path.match(/^\/api\/admin\/users\/[^/]+\/reset-password$/) && method === 'POST') {
        const auth = await requireAuth(request, env, ['admin']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleAdminResetPassword(request, env, auth.user.sub);
      } else if (path === '/api/admin/audit-logs' && method === 'GET') {
        const auth = await requireAuth(request, env, ['admin']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetAuditLogs(request, env);
      } else if (path === '/api/admin/applications' && method === 'GET') {
        const auth = await requireAuth(request, env, ['staff', 'admin']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleListApplications(request, env);
      } else if (path.match(/^\/api\/admin\/applications\/[^/]+$/) && method === 'GET') {
        const auth = await requireAuth(request, env, ['staff', 'admin']);
        if (auth instanceof Response) return withCors(auth, request);
        response = await handleGetApplication(request, env);
      } else if (path.match(/^\/api\/admin\/applications\/[^/]+\/status$/) && method === 'PUT') {
        const auth = await requireAuth(request, env, ['staff', 'admin']);
        if (auth instanceof Response) return withCors(auth, request);
        const appId = path.split('/')[4];
        response = await handleUpdateStatus(request, env, appId, auth.user.sub, ctx);
      } else if (path.match(/^\/api\/admin\/documents\/[^/]+$/) && method === 'DELETE') {
        const auth = await requireAuth(request, env, ['admin']);
        if (auth instanceof Response) return withCors(auth, request);
        const docId = path.split('/')[4];
        response = await handleDeleteDocument(request, env, docId, auth.user.sub);
      } else if (path.match(/^\/api\/auth\/oauth\/(google|github|microsoft)$/) && method === 'GET') {
    const provider = path.split('/').pop() as 'google' | 'github' | 'microsoft';
    response = await handleOAuthLogin(request, env, provider);
  } else if (path.match(/^\/api\/auth\/oauth\/(google|github|microsoft)\/callback$/) && method === 'GET') {
    const provider = path.split('/')[4] as 'google' | 'github' | 'microsoft';
    response = await handleOAuthCallback(request, env, provider);
  } else if (path === '/api/health') {
    response = new Response(JSON.stringify({ status: 'ok', version: '1.3.0' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  // ─── Public Routes (no auth) ──────────────────────────────────────
  } else if (path === '/api/public/programs' && method === 'GET') {
    response = await handlePublicPrograms(request, env);
  } else if (path === '/api/public/stats' && method === 'GET') {
    response = await handlePublicStats(request, env);
  } else if (path === '/api/public/cms/posts' && method === 'GET') {
    response = await handlePublicListPosts(request, env);
  } else if (path.match(/^\/api\/public\/cms\/posts\/[^/]+$/) && method === 'GET') {
    const slug = path.split('/').pop()!;
    response = await handlePublicGetPost(request, env, slug);
  } else if (path.match(/^\/api\/public\/cms\/pages\/[^/]+$/) && method === 'GET') {
    const slug = path.split('/').pop()!;
    response = await handlePublicGetPage(request, env, slug);

  // ─── CMS Routes (admin/staff) ─────────────────────────────────────
  } else if (path === '/api/cms/posts' && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListPosts(request, env);
  } else if (path === '/api/cms/posts' && method === 'POST') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleCreatePost(request, env, auth.user.sub);
  } else if (path.match(/^\/api\/cms\/posts\/[^/]+$/) && method === 'PUT') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleUpdatePost(request, env, path.split('/')[4], auth.user.sub);
  } else if (path.match(/^\/api\/cms\/posts\/[^/]+$/) && method === 'DELETE') {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleDeletePost(request, env, path.split('/')[4], auth.user.sub);
  } else if (path === '/api/cms/pages' && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListPages(request, env);
  } else if (path === '/api/cms/pages' && method === 'POST') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleCreatePage(request, env, auth.user.sub);
  } else if (path.match(/^\/api\/cms\/pages\/[^/]+$/) && method === 'DELETE') {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleDeletePage(request, env, path.split('/')[4], auth.user.sub);

  // ─── Webhook Routes ───────────────────────────────────────────────
  } else if (path === '/api/webhooks/inbound' && method === 'POST') {
    response = await handleInboundWebhook(request, env);
  } else if (path === '/api/webhooks/events' && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListEvents(request, env);
  } else if (path === '/api/webhooks/dead-letters' && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListDeadLetters(request, env);
  } else if (path.match(/^\/api\/webhooks\/retry\/[^/]+$/) && method === 'POST') {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleRetryDeadLetter(request, env, path.split('/')[4], ctx);

  // ─── UMS Routes (v1 prefix — used by UMS frontend) ─────────────────
  // Auth bridge: UMS uses /api/v1/auth/* which maps to the same handlers
  } else if (path === '/api/v1/auth/login' && method === 'POST') {
    response = await handleLogin(request, env);
  } else if (path === '/api/v1/auth/logout' && (method === 'POST' || method === 'DELETE')) {
    response = await handleLogout(request, env);
  } else if (path === '/api/v1/auth/me' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleMe(request, env, auth.user.sub);
  } else if (path === '/api/v1/auth/refresh' && method === 'POST') {
    response = await handleLogin(request, env); // Handled by re-auth

  // Students
  } else if (path === '/api/v1/students' && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListStudents(request, env);
  } else if (path === '/api/v1/students' && method === 'POST') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleCreateStudent(request, env);
  } else if (path.match(/^\/api\/v1\/students\/[^/]+$/) && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin', 'staff', 'student']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleGetStudent(request, env, path.split('/')[4]);
  } else if (path.match(/^\/api\/v1\/students\/[^/]+$/) && method === 'PUT') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleUpdateStudent(request, env, path.split('/')[4]);
  } else if (path.match(/^\/api\/v1\/students\/[^/]+$/) && method === 'DELETE') {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleDeleteStudent(request, env, path.split('/')[4]);

  // Grades
  } else if (path === '/api/v1/grades' && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin', 'staff', 'student']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListGrades(request, env);
  } else if (path === '/api/v1/grades' && method === 'POST') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleCreateGrade(request, env, auth.user.sub);
  } else if (path.match(/^\/api\/v1\/grades\/[^/]+$/) && (method === 'PUT' || method === 'PATCH')) {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleUpdateGrade(request, env, path.split('/')[4]);

  // Courses
  } else if (path === '/api/v1/courses' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListUmsCourses(request, env);
  } else if (path === '/api/v1/courses' && method === 'POST') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleCreateCourse(request, env);
  } else if (path.match(/^\/api\/v1\/courses\/[^/]+$/) && method === 'PUT') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleUpdateCourse(request, env, path.split('/')[4]);
  } else if (path.match(/^\/api\/v1\/courses\/[^/]+$/) && method === 'DELETE') {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleDeleteCourse(request, env, path.split('/')[4]);

  // Programs, Faculties, Departments, Terms
  } else if (path === '/api/v1/programs' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListPrograms(request, env);
  } else if (path === '/api/v1/faculties' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListFaculties(request, env);
  } else if (path === '/api/v1/departments' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListDepartments(request, env);
  } else if (path === '/api/v1/terms' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListTerms(request, env);

  // Enrollments
  } else if (path === '/api/v1/enrollments' && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin', 'staff', 'student']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListEnrollments(request, env);
  } else if (path === '/api/v1/enrollments' && method === 'POST') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleCreateEnrollment(request, env);

  // Staff
  } else if (path === '/api/v1/staff' && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleListStaff(request, env);
  } else if (path === '/api/v1/staff' && method === 'POST') {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleCreateStaff(request, env);
  } else if (path.match(/^\/api\/v1\/staff\/[^/]+$/) && method === 'GET') {
    const auth = await requireAuth(request, env, ['admin', 'staff']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleGetStaff(request, env, path.split('/')[4]);
  } else if (path.match(/^\/api\/v1\/staff\/[^/]+$/) && (method === 'PUT' || method === 'PATCH')) {
    const auth = await requireAuth(request, env, ['admin']);
    if (auth instanceof Response) return withCors(auth, request);
    response = await handleUpdateStaff(request, env, path.split('/')[4]);

  } else {
    response = error('Route not found', 404);
  }

      return withCors(response, request);
    } catch (e) {
      console.error('Worker error:', e);
      return withCors(error('Internal server error', 500), request);
    }
  },
  async scheduled(controller, env, ctx) {
    await backupWorker.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<Env>);
