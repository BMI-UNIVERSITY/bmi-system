import { withSentry } from '@sentry/cloudflare';
import { handleRegister, handleLogin, handleRefresh, handleLogout, handleMe, handleVerifyEmail, handleResendVerification, handleForgotPassword, handleResetPassword, handleMfaSetup, handleMfaEnable, handleMfaDisable, handleOAuthLogin, handleOAuthCallback } from './routes/auth';
import { handleSubmitApplication, handleGetMyApplication, handleListApplications, handleGetApplication, handleUpdateStatus, handleGetStatusLogs, handleGetLifecycle } from './routes/apply';
import { handleUploadDocument, handleDownloadDocument, handleDeleteDocument } from './routes/documents';
import { handleRequestRecommendation, handleGetRecommendationInfo, handleUploadRecommendation, handleListRecommendations } from './routes/recommendations';
import { requireAuth, rateLimit } from './middleware/auth';
import { handleGetDashboard, handleGetCourses, handleEnroll, handleGetFinances, handlePayInvoice, handleDropCourse, handleGetTranscript, handleGetSettings, handleUpdateSettings, handleGetTickets, handleCreateTicket } from './routes/student';
import { handleAdminSetup, handleListUsers, handleUpdateUserRole, handleDeleteUser, handleAdminResetPassword, handleGetAuditLogs } from './routes/admin';
import { handleListTimetabling, handleCreateTimetabling } from './routes/ums-timetabling';
import { handleListRubrics, handleCreateRubric, handleDeleteRubric } from './routes/ums-rubrics';
import { error, getCorsHeaders, validateCsrfToken } from './lib/types';
import type { Env } from './lib/types';
import backupWorker from './backup';
import { WriteQueue } from './lib/WriteQueue';
// Integration routes
import { handlePublicPrograms, handlePublicStats, handlePublicListPosts, handlePublicGetPost, handlePublicGetPage } from './routes/public';
import { handleListPosts, handleCreatePost, handleUpdatePost, handleDeletePost, handleListPages, handleCreatePage, handleDeletePage } from './routes/cms';
import { handleInboundWebhook, handleListEvents, handleListDeadLetters, handleRetryDeadLetter } from './routes/webhooks';
// UMS routes
import { handleListStudents, handleGetStudent, handleCreateStudent, handleUpdateStudent, handleDeleteStudent } from './routes/ums-students';
import { handleListGrades, handleCreateGrade, handleUpdateGrade } from './routes/ums-grades';
import { handleListUmsCourses, handleCreateCourse, handleUpdateCourse, handleDeleteCourse, handleListPrograms, handleListFaculties, handleListDepartments, handleListTerms, handleListEnrollments, handleCreateEnrollment } from './routes/ums-courses';
import { handleListStaff, handleGetStaff, handleCreateStaff, handleUpdateStaff } from './routes/ums-staff';
import { handleGetStudentProgrammes, handleProgrammeTransfer } from './routes/programmes';
import { handleListTransactions } from './routes/ums-finance';
import { handleGetRevenueTrend } from './routes/ums-dashboard';
import {
  handleListStudyCenters, handleGetStudyCenter, handleGetStudyCenterStats,
  handleCreateStudyCenter, handleUpdateStudyCenter,
  handleListLibraryBooks,
  handleListHostels, handleCreateHostel,
  handleListRoomAssignments, handleCreateRoomAssignment, handleDeleteRoomAssignment,
  handleListMedicalRecords, handleCreateMedicalRecord, handleDeleteMedicalRecord,
  handleListInventory, handleCreateInventoryItem, handleUpdateInventoryItem, handleDeleteInventoryItem,
  handleListVisitors, handleCreateVisitor, handleUpdateVisitor, handleDeleteVisitor,
  handleListAttendance, handleCreateAttendanceRecord, handleUpdateAttendanceRecord,
} from './routes/ums-collections';
import {
  handleCatalogFaculties, handleCatalogDepartments, handleCatalogPrograms, handleCatalogTerms,
  handleStudentStatsOverview, handleStaffStatsOverview, handleCourseStatsOverview, handleFinanceStats,
  handleVerifyCertificate, handleCertificateVerificationStats,
} from './routes/ums-stats';

function withCors(response: Response, request: Request, env: Env): Response {
  const corsHeaders = getCorsHeaders(request, env);
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
  cacheTTL?: number;
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
  { method: 'POST', path: /^\/api\/applications$/, roles: ['applicant', 'student', 'staff', 'admin'], handler: async (req, env, p, auth, ctx) => handleSubmitApplication(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/applications\/me$/, roles: [], handler: async (req, env, p, auth, ctx) => handleGetMyApplication(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/logs$/, roles: [], handler: async (req, env, p, auth, ctx) => handleGetStatusLogs(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/documents\/upload$/, roles: [], handler: async (req, env, p, auth, ctx) => handleUploadDocument(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/documents\/([^/]+)\/download$/, roles: [], handler: async (req, env, p, auth, ctx) => handleDownloadDocument(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/applications\/([^/]+)\/recommendations$/, roles: [], handler: async (req, env, p, auth, ctx) => handleRequestRecommendation(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/recommendations$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListRecommendations(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/recommendations\/([^/]+)$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleGetRecommendationInfo(req, env, p[1]) },
  { method: 'POST', path: /^\/api\/recommendations\/([^/]+)\/upload$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleUploadRecommendation(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/student\/dashboard$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetDashboard(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/courses$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetCourses(req, env) },
  { method: 'POST', path: /^\/api\/student\/enroll$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleEnroll(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/courses\/([^/]+)\/drop$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleDropCourse(req, env, auth!.user.sub, p[1]) },
  { method: 'GET', path: /^\/api\/student\/transcript$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetTranscript(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/settings$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetSettings(req, env, auth!.user.sub) },
  { method: 'PUT', path: /^\/api\/student\/settings$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleUpdateSettings(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/support$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetTickets(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/support$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleCreateTicket(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/finances$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetFinances(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/invoices\/([^/]+)\/pay$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handlePayInvoice(req, env, auth!.user.sub, p[1]) },
  { method: 'POST', path: /^\/api\/admin\/setup$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleAdminSetup(req, env) },
  { method: 'GET', path: /^\/api\/admin\/users$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleListUsers(req, env) },
  { method: 'PUT', path: /^\/api\/admin\/users\/([^/]+)\/role$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleUpdateUserRole(req, env, auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/admin\/users\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteUser(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/admin\/users\/([^/]+)\/reset-password$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleAdminResetPassword(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/admin\/audit-logs$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleGetAuditLogs(req, env) },
  { method: 'GET', path: /^\/api\/admin\/applications$/, roles: ['staff', 'admin'], handler: async (req, env, p, auth, ctx) => handleListApplications(req, env) },
  { method: 'GET', path: /^\/api\/admin\/applications\/([^/]+)$/, roles: ['staff', 'admin'], handler: async (req, env, p, auth, ctx) => handleGetApplication(req, env) },
  { method: 'PUT', path: /^\/api\/admin\/applications\/([^/]+)\/status$/, roles: ['staff', 'admin'], handler: async (req, env, p, auth, ctx) => handleUpdateStatus(req, env, p[1], auth!.user.sub, ctx) },
  { method: 'DELETE', path: /^\/api\/admin\/documents\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteDocument(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/auth\/oauth\/(google|github|microsoft)$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleOAuthLogin(req, env, p[1] as 'google' | 'github' | 'microsoft') },
  { method: 'GET', path: /^\/api\/auth\/oauth\/(google|github|microsoft)\/callback$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleOAuthCallback(req, env, p[1] as 'google' | 'github' | 'microsoft') },
  { method: 'GET', path: /^\/api\/health$/, roles: undefined, handler: async (req, env, p, auth, ctx) => new Response(JSON.stringify({ status: 'ok', version: '1.3.0' }), { headers: { 'Content-Type': 'application/json' } }) },
  { method: 'GET', path: /^\/api\/public\/programs$/, cacheTTL: 300, roles: undefined, handler: async (req, env, p, auth, ctx) => handlePublicPrograms(req, env) },
  { method: 'GET', path: /^\/api\/public\/stats$/, cacheTTL: 300, roles: undefined, handler: async (req, env, p, auth, ctx) => handlePublicStats(req, env) },
  { method: 'GET', path: /^\/api\/public\/cms\/posts$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handlePublicListPosts(req, env) },
  { method: 'GET', path: /^\/api\/public\/cms\/posts\/([^/]+)$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handlePublicGetPost(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/public\/cms\/pages\/([^/]+)$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handlePublicGetPage(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/cms\/posts$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListPosts(req, env) },
  { method: 'POST', path: /^\/api\/cms\/posts$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreatePost(req, env, auth!.user.sub) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/cms\/posts\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdatePost(req, env, p[1], auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/cms\/posts\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeletePost(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/cms\/pages$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListPages(req, env) },
  { method: 'POST', path: /^\/api\/cms\/pages$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreatePage(req, env, auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/cms\/pages\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeletePage(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/v1\/timetabling$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListTimetabling(req, env) },
  { method: 'POST', path: /^\/api\/v1\/timetabling$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateTimetabling(req, env) },
  { method: 'POST', path: /^\/api\/webhooks\/inbound$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleInboundWebhook(req, env) },
  { method: 'GET', path: /^\/api\/webhooks\/events$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleListEvents(req, env) },
  { method: 'GET', path: /^\/api\/webhooks\/dead-letters$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleListDeadLetters(req, env) },
  { method: 'POST', path: /^\/api\/webhooks\/retry\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleRetryDeadLetter(req, env, p[1], ctx) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/lifecycle$/, roles: [], handler: async (req, env, p, auth, ctx) => handleGetLifecycle(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/v1\/auth\/login$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleLogin(req, env) },
  { method: ['POST', 'DELETE'], path: /^\/api\/v1\/auth\/logout$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleLogout(req, env) },
  { method: 'GET', path: /^\/api\/v1\/auth\/me$/, roles: [], handler: async (req, env, p, auth, ctx) => handleMe(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/v1\/auth\/refresh$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleRefresh(req, env) },
  { method: 'GET', path: /^\/api\/v1\/students$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListStudents(req, env) },
  { method: 'POST', path: /^\/api\/v1\/students$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateStudent(req, env) },
  { method: 'GET', path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleGetStudent(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdateStudent(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteStudent(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/students\/([^/]+)\/programmes$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleGetStudentProgrammes(req, env, p[1]) },
  { method: 'POST', path: /^\/api\/v1\/students\/([^/]+)\/transfer$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleProgrammeTransfer(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/v1\/grades$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleListGrades(req, env, auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/v1\/grades$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateGrade(req, env, auth!.user.sub) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/grades\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdateGrade(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/courses$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListUmsCourses(req, env) },
  { method: 'POST', path: /^\/api\/v1\/courses$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateCourse(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/courses\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdateCourse(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/courses\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteCourse(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/rubrics$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListRubrics(req, env) },
  { method: 'POST', path: /^\/api\/v1\/rubrics$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateRubric(req, env) },
  { method: 'DELETE', path: /^\/api\/v1\/rubrics\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleDeleteRubric(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/programs$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListPrograms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/faculties$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListFaculties(req, env) },
  { method: 'GET', path: /^\/api\/v1\/departments$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListDepartments(req, env) },
  { method: 'GET', path: /^\/api\/v1\/terms$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListTerms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/enrollments$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleListEnrollments(req, env) },
  { method: 'POST', path: /^\/api\/v1\/enrollments$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateEnrollment(req, env) },
  { method: 'GET', path: /^\/api\/v1\/staff$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListStaff(req, env) },
  { method: 'POST', path: /^\/api\/v1\/staff$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleCreateStaff(req, env) },
  { method: 'GET', path: /^\/api\/v1\/staff\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleGetStaff(req, env, p[1]) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/staff\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleUpdateStaff(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/finance\/transactions$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListTransactions(req, env) },
  { method: 'GET', path: /^\/api\/v1\/dashboard\/revenue-trend$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleGetRevenueTrend(req, env) },
  { method: 'GET', path: /^\/api\/v1\/study-centers\/all$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListStudyCenters(req, env) },
  { method: 'GET', path: /^\/api\/v1\/study-centers$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListStudyCenters(req, env) },
  { method: 'POST', path: /^\/api\/v1\/study-centers$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleCreateStudyCenter(req, env) },
  { method: 'GET', path: /^\/api\/v1\/study-centers\/([^/]+)\/stats$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleGetStudyCenterStats(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/study-centers\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleGetStudyCenter(req, env, p[1]) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/study-centers\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleUpdateStudyCenter(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/library$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleListLibraryBooks(req, env) },
  { method: 'GET', path: /^\/api\/v1\/hostels$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListHostels(req, env) },
  { method: 'POST', path: /^\/api\/v1\/hostels$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleCreateHostel(req, env) },
  { method: 'GET', path: /^\/api\/v1\/hostels\/assignments$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListRoomAssignments(req, env) },
  { method: 'POST', path: /^\/api\/v1\/hostels\/assignments$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateRoomAssignment(req, env) },
  { method: 'DELETE', path: /^\/api\/v1\/hostels\/assignments\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteRoomAssignment(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/medical$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListMedicalRecords(req, env) },
  { method: 'POST', path: /^\/api\/v1\/medical$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateMedicalRecord(req, env) },
  { method: 'DELETE', path: /^\/api\/v1\/medical\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteMedicalRecord(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/inventory$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListInventory(req, env) },
  { method: 'POST', path: /^\/api\/v1\/inventory$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleCreateInventoryItem(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/inventory\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleUpdateInventoryItem(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/inventory\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteInventoryItem(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/visitors$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListVisitors(req, env) },
  { method: 'POST', path: /^\/api\/v1\/visitors$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateVisitor(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/visitors\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdateVisitor(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/visitors\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteVisitor(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/attendance$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListAttendance(req, env) },
  { method: 'POST', path: /^\/api\/v1\/attendance$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateAttendanceRecord(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/attendance\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdateAttendanceRecord(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/catalog\/faculties$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleCatalogFaculties(req, env) },
  { method: 'GET', path: /^\/api\/v1\/catalog\/departments$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleCatalogDepartments(req, env) },
  { method: 'GET', path: /^\/api\/v1\/catalog\/programs$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleCatalogPrograms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/catalog\/terms$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleCatalogTerms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/students\/stats\/overview$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleStudentStatsOverview(req, env) },
  { method: 'GET', path: /^\/api\/v1\/staff\/stats\/overview$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleStaffStatsOverview(req, env) },
  { method: 'GET', path: /^\/api\/v1\/courses\/stats\/overview$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCourseStatsOverview(req, env) },
  { method: 'GET', path: /^\/api\/v1\/finance\/stats$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleFinanceStats(req, env) },
  { method: 'POST', path: /^\/api\/v1\/documents\/verify$/, roles: undefined, handler: async (req, env, p, auth, ctx) => handleVerifyCertificate(req, env) },
  { method: 'GET', path: /^\/api\/v1\/certificates\/verification\/stats$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCertificateVerificationStats(req, env) },
];

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
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
    }

    if (!path.startsWith('/api/')) {
      return new Response('Not found', { status: 404 });
    }

    // ── Phase 2 Migration Proxy ──────────────────────────────────────────────
    // Forward /api/public/* to bmi-public Worker once it is deployed.
    // If PUBLIC_WORKER binding is not yet present, traffic falls through to
    // the existing monolith handlers below — zero-downtime progressive migration.
    if (path.startsWith('/api/public/') && env.PUBLIC_WORKER) {
      return env.PUBLIC_WORKER.fetch(request);
    }

    try {
      const rateLimitResult = await rateLimit(request, env);
      if (rateLimitResult) return withCors(rateLimitResult, request, env);

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
          return withCors(error('Invalid CSRF token', 403), request, env);
        }
      }

      for (const route of ROUTES) {
        const methods = Array.isArray(route.method) ? route.method : [route.method];
        if (!methods.includes(method)) continue;

        const match = path.match(route.path);
        if (!match) continue;

        let auth: any = undefined;
        if (route.roles !== undefined) {
          const authResult = await requireAuth(request, env, route.roles.length > 0 ? route.roles : undefined);
          if (authResult instanceof Response) return withCors(authResult, request, env);
          auth = authResult;
        }

        let response = await route.handler(request, env, match, auth, ctx);
        
        if (route.cacheTTL && response.status === 200) {
          response = new Response(response.body, response);
          response.headers.set('Cache-Control', `public, max-age=${route.cacheTTL}, s-maxage=${route.cacheTTL}`);
        }

        return withCors(response, request, env);
      }

      return withCors(error('Route not found', 404), request, env);
    } catch (e) {
      console.error('Worker error:', e);
      return withCors(error('Internal server error', 500), request, env);
    }
  },
  async scheduled(controller, env, ctx) {
    await backupWorker.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<Env>);

// Durable Object export — required for Cloudflare to discover and deploy the class.
// The WriteQueue DO serializes all D1 writes to prevent SQLITE_BUSY under concurrent load.
export { WriteQueue };
