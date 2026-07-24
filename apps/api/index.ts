import { withSentry } from '@sentry/cloudflare';
import { handleRegister, handleLogin, handleRefresh, handleLogout, handleMe, handleVerifyEmail, handleResendVerification, handleForgotPassword, handleResetPassword, handleMfaSetup, handleMfaEnable, handleMfaDisable, handleOAuthLogin, handleOAuthCallback } from './routes/auth';
import { handleSubmitApplication, handleGetMyApplication, handleListApplications, handleGetApplication, handleUpdateStatus, handleGetStatusLogs, handleGetLifecycle, handleSaveDraft } from './routes/apply';
import { handleUploadDocument, handleDownloadDocument, handleDeleteDocument, handleListDocuments } from './routes/documents';
import { handleRequestRecommendation, handleGetRecommendationInfo, handleUploadRecommendation, handleListRecommendations } from './routes/recommendations';
import { requireAuth, rateLimit, withCors, getCorsHeaders, createLogger, requestLogger } from '@bmi/api-middleware';
import { handleGetDashboard, handleGetCourses, handleEnroll, handleGetFinances, handlePayInvoice, handleDropCourse, handleGetTranscript, handleGetSettings, handleUpdateSettings, handleGetTickets, handleCreateTicket } from './routes/student';
import { handleAdminSetup, handleListUsers, handleUpdateUserRole, handleDeleteUser, handleAdminResetPassword, handleGetAuditLogs, handleBulkEmails, handleListContactSubmissions, handleListNewsletterSubscribers } from './routes/admin';
import { handleListTimetabling, handleCreateTimetabling } from './routes/ums-timetabling';
import { handleListRubrics, handleCreateRubric, handleDeleteRubric } from './routes/ums-rubrics';
import { handleGetPerformanceMetrics, handleGetQueryAnalysis, handleRunMaintenance, handleGetSystemHealth, handleClearMetrics } from './routes/performance';
import { trackResponseTime } from './lib/performance';
import { error, validateCsrfToken } from './lib/types';
import type { Env } from './lib/types';
import backupWorker from './backup';
import { runArchivalJob } from './archival';
// Integration routes
import { handlePublicPrograms, handlePublicStats, handlePublicListPosts, handlePublicGetPost, handlePublicGetPage, handlePublicContact, handlePublicNewsletter } from './routes/public';
import { handleListPosts, handleCreatePost, handleUpdatePost, handleDeletePost, handleListPages, handleCreatePage, handleDeletePage } from './routes/cms';
import { handleInboundWebhook, handleListEvents, handleListDeadLetters, handleRetryDeadLetter } from './routes/webhooks';
// UMS routes
import { handleListStudents, handleGetStudent, handleCreateStudent, handleUpdateStudent, handleDeleteStudent } from './routes/ums-students';
import { handleListGrades, handleCreateGrade, handleUpdateGrade } from './routes/ums-grades';
import { handleListUmsCourses, handleCreateCourse, handleUpdateCourse, handleDeleteCourse, handleListPrograms, handleListFaculties, handleListDepartments, handleListTerms, handleListEnrollments, handleCreateEnrollment } from './routes/ums-courses';
import { handleListStaff, handleGetStaff, handleCreateStaff, handleUpdateStaff } from './routes/ums-staff';
import { handleGetStudentPrograms, handleProgramTransfer } from './routes/programs';
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
import { handleClaimAccount } from './routes/claim';
import { handleGetOnboardingStatus, handleUploadStudentDocument } from './routes/onboarding';
import { handleLmsCourses, handleLmsGrades } from './routes/lms';
import { handleCreatePaymentIntent, handlePaymentWebhook } from './routes/payment';
import { handleSaveRegistrationStep, handleGetRegistrationStatus, handleCompleteRegistration, handleGetAvailableModules } from './routes/registration';
import {
  handleGetMyHolds,
  handleGetProgramCurriculum,
  handleAutoEnrollMandatory,
  handleGetElectiveGroups,
  handleSubmitElectives,
  handleGetRegistrationProgress,
  handleCompleteOrientation,
  handleGenerateProgramInvoice,
  handleAdminSyncCurriculum,
  handleAdminSetProgramFee,
  handleAdminResolveHold,
} from './routes/enrollment';
import { handleTransitionToAlumni } from './routes/alumni';
import {
  handleGetStudentStanding,
  handleGetCurrentStanding,
  handleAdminListStanding,
  handleComputeStanding,
  handleListStandingRules,
} from './routes/academic_standing';

const log = createLogger('bmi-api');

interface AuthResult {
  user: { sub: string; email: string; role: string; sv: number };
  token?: string;
}

type RouteHandler = (
  req: Request,
  env: Env,
  p: string[],
  auth: AuthResult | undefined,
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
  { method: 'POST', path: /^\/api\/auth\/register$/, roles: undefined, handler: async (req, env, _p, _auth, ctx) =>handleRegister(req, env, ctx) },
  { method: 'POST', path: /^\/api\/auth\/login$/, roles: undefined, handler: async (req, env) =>handleLogin(req, env) },
  { method: 'POST', path: /^\/api\/auth\/refresh$/, roles: undefined, handler: async (req, env) =>handleRefresh(req, env) },
  { method: 'DELETE', path: /^\/api\/auth\/logout$/, roles: undefined, handler: async (req, env) =>handleLogout(req, env) },
  { method: 'GET', path: /^\/api\/auth\/verify$/, roles: undefined, handler: async (req, env) =>handleVerifyEmail(req, env) },
  { method: 'POST', path: /^\/api\/auth\/resend-verification$/, roles: undefined, handler: async (req, env) =>handleResendVerification(req, env) },
  { method: 'POST', path: /^\/api\/auth\/forgot-password$/, roles: undefined, handler: async (req, env) =>handleForgotPassword(req, env) },
  { method: 'POST', path: /^\/api\/auth\/reset-password$/, roles: undefined, handler: async (req, env) =>handleResetPassword(req, env) },
  { method: 'GET', path: /^\/api\/auth\/me$/, roles: [], handler: async (req, env, _p, auth) =>handleMe(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/setup$/, roles: [], handler: async (req, env, _p, auth) =>handleMfaSetup(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/enable$/, roles: [], handler: async (req, env, _p, auth) =>handleMfaEnable(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/disable$/, roles: [], handler: async (req, env, _p, auth) =>handleMfaDisable(req, env, auth!.user.sub) },
  { method: ['POST', 'PATCH'], path: /^\/api\/applications\/draft$/, roles: ['applicant', 'student'], handler: async (req, env, _p, auth) =>handleSaveDraft(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/applications$/, roles: ['applicant', 'student', 'staff', 'admin'], handler: async (req, env, _p, auth, ctx) =>handleSubmitApplication(req, env, auth!.user.sub, ctx) },
  { method: 'GET', path: /^\/api\/applications\/me$/, roles: [], handler: async (req, env, _p, auth) =>handleGetMyApplication(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/logs$/, roles: [], handler: async (req, env, p, auth) =>handleGetStatusLogs(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/documents\/upload$/, roles: [], handler: async (req, env, _p, auth) =>handleUploadDocument(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/documents\/([^/]+)\/download$/, roles: [], handler: async (req, env, p, auth) =>handleDownloadDocument(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/applications\/([^/]+)\/recommendations$/, roles: [], handler: async (req, env, p, auth) =>handleRequestRecommendation(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/recommendations$/, roles: [], handler: async (req, env, p, auth) =>handleListRecommendations(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/recommendations\/([^/]+)$/, roles: undefined, handler: async (req, env, p) =>handleGetRecommendationInfo(req, env, p[1]) },
  { method: 'POST', path: /^\/api\/recommendations\/([^/]+)\/upload$/, roles: undefined, handler: async (req, env, p) =>handleUploadRecommendation(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/student\/dashboard$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetDashboard(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/courses$/, roles: ['student'], handler: async (req, env) =>handleGetCourses(req, env) },
  { method: 'POST', path: /^\/api\/student\/enroll$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleEnroll(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/courses\/([^/]+)\/drop$/, roles: ['student'], handler: async (req, env, p, auth) =>handleDropCourse(req, env, auth!.user.sub, p[1]) },
  { method: 'GET', path: /^\/api\/student\/transcript$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetTranscript(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/settings$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetSettings(req, env, auth!.user.sub) },
  { method: 'PUT', path: /^\/api\/student\/settings$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleUpdateSettings(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/support$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetTickets(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/support$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleCreateTicket(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/finances$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetFinances(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/invoices\/([^/]+)\/pay$/, roles: ['student'], handler: async (req, env, p, auth) =>handlePayInvoice(req, env, auth!.user.sub, p[1]) },
  { method: 'POST', path: /^\/api\/admin\/setup$/, roles: undefined, handler: async (req, env) =>handleAdminSetup(req, env) },
  { method: 'GET', path: /^\/api\/admin\/users$/, roles: ['admin'], handler: async (req, env) =>handleListUsers(req, env) },
  { method: 'PUT', path: /^\/api\/admin\/users\/([^/]+)\/role$/, roles: ['admin'], handler: async (req, env, _p, auth) =>handleUpdateUserRole(req, env, auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/admin\/users\/([^/]+)$/, roles: ['admin'], handler: async (req, env, _p, auth) =>handleDeleteUser(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/admin\/users\/([^/]+)\/reset-password$/, roles: ['admin'], handler: async (req, env, _p, auth) =>handleAdminResetPassword(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/admin\/emails\/bulk$/, roles: ['admin'], handler: async (req, env) =>handleBulkEmails(req, env) },
  { method: 'GET', path: /^\/api\/admin\/audit-logs$/, roles: ['admin'], handler: async (req, env) =>handleGetAuditLogs(req, env) },
  { method: 'GET', path: /^\/api\/admin\/contact-submissions$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListContactSubmissions(req, env) },
  { method: 'GET', path: /^\/api\/admin\/newsletter-subscribers$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListNewsletterSubscribers(req, env) },
  { method: 'GET', path: /^\/api\/admin\/applications$/, roles: ['staff', 'admin'], handler: async (req, env) =>handleListApplications(req, env) },
  { method: 'GET', path: /^\/api\/admin\/applications\/([^/]+)$/, roles: ['staff', 'admin'], handler: async (req, env) =>handleGetApplication(req, env) },
  { method: 'PUT', path: /^\/api\/admin\/applications\/([^/]+)\/status$/, roles: ['staff', 'admin'], handler: async (req, env, p, auth, ctx) =>handleUpdateStatus(req, env, p[1], auth!.user.sub, ctx) },
  // v1 aliases for UMS frontend compatibility
  { method: 'GET', path: /^\/api\/v1\/admin\/applications$/, roles: ['staff', 'admin'], handler: async (req, env) =>handleListApplications(req, env) },
  { method: 'GET', path: /^\/api\/v1\/admin\/applications\/([^/]+)$/, roles: ['staff', 'admin'], handler: async (req, env) =>handleGetApplication(req, env) },
  { method: 'PUT', path: /^\/api\/v1\/admin\/applications\/([^/]+)\/status$/, roles: ['staff', 'admin'], handler: async (req, env, p, auth, ctx) =>handleUpdateStatus(req, env, p[1], auth!.user.sub, ctx) },
  { method: 'GET', path: /^\/api\/admin\/documents$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListDocuments(req, env) },
  { method: 'DELETE', path: /^\/api\/admin\/documents\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth) =>handleDeleteDocument(req, env, p[1], auth!.user.sub) },
  // v1 alias for document download
  { method: 'GET', path: /^\/api\/v1\/documents\/([^/]+)\/download$/, roles: [], handler: async (req, env, p, auth) =>handleDownloadDocument(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'GET', path: /^\/api\/auth\/oauth\/(google|github|microsoft)$/, roles: undefined, handler: async (req, env, p) =>handleOAuthLogin(req, env, p[1] as 'google' | 'github' | 'microsoft') },
  { method: 'GET', path: /^\/api\/auth\/oauth\/(google|github|microsoft)\/callback$/, roles: undefined, handler: async (req, env, p) =>handleOAuthCallback(req, env, p[1] as 'google' | 'github' | 'microsoft') },
  { method: 'GET', path: /^\/api\/health$/, roles: undefined, handler: async (_req, _env) =>new Response(JSON.stringify({ status: 'ok', version: '1.3.0' }), { headers: { 'Content-Type': 'application/json' } }) },
  // Performance monitoring endpoints
  { method: 'GET', path: /^\/api\/admin\/performance\/metrics$/, roles: ['admin'], handler: async (req, env) =>handleGetPerformanceMetrics(req, env) },
  { method: 'GET', path: /^\/api\/admin\/performance\/analysis$/, roles: ['admin'], handler: async (req, env) =>handleGetQueryAnalysis(req, env) },
  { method: 'POST', path: /^\/api\/admin\/performance\/maintenance$/, roles: ['admin'], handler: async (req, env) =>handleRunMaintenance(req, env) },
  { method: 'GET', path: /^\/api\/admin\/performance\/health$/, roles: ['admin'], handler: async (req, env) =>handleGetSystemHealth(req, env) },
  { method: 'DELETE', path: /^\/api\/admin\/performance\/metrics$/, roles: ['admin'], handler: async (req, env) =>handleClearMetrics(req, env) },
  { method: 'GET', path: /^\/api\/public\/programs$/, cacheTTL: 300, roles: undefined, handler: async (req, env, _p, _auth, ctx) =>handlePublicPrograms(req, env, ctx) },
  { method: 'GET', path: /^\/api\/public\/stats$/, cacheTTL: 300, roles: undefined, handler: async (req, env) =>handlePublicStats(req, env) },
  { method: 'GET', path: /^\/api\/public\/cms\/posts$/, roles: undefined, handler: async (req, env) =>handlePublicListPosts(req, env) },
  { method: 'GET', path: /^\/api\/public\/cms\/posts\/([^/]+)$/, roles: undefined, handler: async (req, env, p) =>handlePublicGetPost(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/public\/cms\/pages\/([^/]+)$/, roles: undefined, handler: async (req, env, p) =>handlePublicGetPage(req, env, p[1]) },
  { method: 'POST', path: /^\/api\/public\/contact$/, roles: undefined, handler: async (req, env) =>handlePublicContact(req, env) },
  { method: 'POST', path: /^\/api\/public\/newsletter$/, roles: undefined, handler: async (req, env) =>handlePublicNewsletter(req, env) },
  { method: 'GET', path: /^\/api\/cms\/posts$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListPosts(req, env) },
  { method: 'POST', path: /^\/api\/cms\/posts$/, roles: ['admin', 'staff'], handler: async (req, env, _p, auth) =>handleCreatePost(req, env, auth!.user.sub) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/cms\/posts\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth) =>handleUpdatePost(req, env, p[1], auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/cms\/posts\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth) =>handleDeletePost(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/cms\/pages$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListPages(req, env) },
  { method: 'POST', path: /^\/api\/cms\/pages$/, roles: ['admin', 'staff'], handler: async (req, env, _p, auth) =>handleCreatePage(req, env, auth!.user.sub) },
  { method: 'DELETE', path: /^\/api\/cms\/pages\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth) =>handleDeletePage(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/v1\/timetabling$/, roles: [], handler: async (req, env) =>handleListTimetabling(req, env) },
  { method: 'POST', path: /^\/api\/v1\/timetabling$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateTimetabling(req, env) },
  { method: 'POST', path: /^\/api\/webhooks\/inbound$/, roles: undefined, handler: async (req, env) =>handleInboundWebhook(req, env) },
  { method: 'GET', path: /^\/api\/webhooks\/events$/, roles: ['admin'], handler: async (req, env) =>handleListEvents(req, env) },
  { method: 'GET', path: /^\/api\/webhooks\/dead-letters$/, roles: ['admin'], handler: async (req, env) =>handleListDeadLetters(req, env) },
  { method: 'POST', path: /^\/api\/webhooks\/retry\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, _auth, ctx) =>handleRetryDeadLetter(req, env, p[1], ctx) },
  { method: 'GET', path: /^\/api\/applications\/([^/]+)\/lifecycle$/, roles: [], handler: async (req, env, p, auth) =>handleGetLifecycle(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/v1\/auth\/login$/, roles: undefined, handler: async (req, env) =>handleLogin(req, env) },
  { method: ['POST', 'DELETE'], path: /^\/api\/v1\/auth\/logout$/, roles: undefined, handler: async (req, env) =>handleLogout(req, env) },
  { method: 'GET', path: /^\/api\/v1\/auth\/me$/, roles: [], handler: async (req, env, _p, auth) =>handleMe(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/v1\/auth\/refresh$/, roles: undefined, handler: async (req, env) =>handleRefresh(req, env) },
  { method: 'GET', path: /^\/api\/v1\/students$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListStudents(req, env) },
  { method: 'POST', path: /^\/api\/v1\/students$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateStudent(req, env) },
  { method: 'GET', path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth) =>handleGetStudent(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleUpdateStudent(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleDeleteStudent(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/students\/([^/]+)\/programs$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleGetStudentPrograms(req, env, p[1]) },
  { method: 'POST', path: /^\/api\/v1\/students\/([^/]+)\/transfer$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth) =>handleProgramTransfer(req, env, p[1], auth!.user.sub) },
  { method: 'GET', path: /^\/api\/v1\/grades$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, _p, auth) =>handleListGrades(req, env, auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/v1\/grades$/, roles: ['admin', 'staff'], handler: async (req, env, _p, auth) =>handleCreateGrade(req, env, auth!.user.sub) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/grades\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleUpdateGrade(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/courses$/, roles: [], handler: async (req, env) =>handleListUmsCourses(req, env) },
  { method: 'POST', path: /^\/api\/v1\/courses$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateCourse(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/courses\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleUpdateCourse(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/courses\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleDeleteCourse(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/rubrics$/, roles: [], handler: async (req, env) =>handleListRubrics(req, env) },
  { method: 'POST', path: /^\/api\/v1\/rubrics$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateRubric(req, env) },
  { method: 'DELETE', path: /^\/api\/v1\/rubrics\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleDeleteRubric(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/programs$/, roles: [], handler: async (req, env) =>handleListPrograms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/faculties$/, roles: [], handler: async (req, env) =>handleListFaculties(req, env) },
  { method: 'GET', path: /^\/api\/v1\/departments$/, roles: [], handler: async (req, env) =>handleListDepartments(req, env) },
  { method: 'GET', path: /^\/api\/v1\/terms$/, roles: [], handler: async (req, env) =>handleListTerms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/enrollments$/, roles: ['admin', 'staff', 'student'], handler: async (req, env) =>handleListEnrollments(req, env) },
  { method: 'POST', path: /^\/api\/v1\/enrollments$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateEnrollment(req, env) },
  { method: 'GET', path: /^\/api\/v1\/staff$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListStaff(req, env) },
  { method: 'POST', path: /^\/api\/v1\/staff$/, roles: ['admin'], handler: async (req, env) =>handleCreateStaff(req, env) },
  { method: 'GET', path: /^\/api\/v1\/staff\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleGetStaff(req, env, p[1]) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/staff\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleUpdateStaff(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/finance\/transactions$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListTransactions(req, env) },
  { method: 'GET', path: /^\/api\/v1\/dashboard\/revenue-trend$/, roles: ['admin'], handler: async (req, env) =>handleGetRevenueTrend(req, env) },
  { method: 'GET', path: /^\/api\/v1\/study-centers\/all$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListStudyCenters(req, env) },
  { method: 'GET', path: /^\/api\/v1\/study-centers$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListStudyCenters(req, env) },
  { method: 'POST', path: /^\/api\/v1\/study-centers$/, roles: ['admin'], handler: async (req, env) =>handleCreateStudyCenter(req, env) },
  { method: 'GET', path: /^\/api\/v1\/study-centers\/([^/]+)\/stats$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleGetStudyCenterStats(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/study-centers\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleGetStudyCenter(req, env, p[1]) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/study-centers\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleUpdateStudyCenter(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/library$/, roles: ['admin', 'staff', 'student'], handler: async (req, env) =>handleListLibraryBooks(req, env) },
  { method: 'GET', path: /^\/api\/v1\/hostels$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListHostels(req, env) },
  { method: 'POST', path: /^\/api\/v1\/hostels$/, roles: ['admin'], handler: async (req, env) =>handleCreateHostel(req, env) },
  { method: 'GET', path: /^\/api\/v1\/hostels\/assignments$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListRoomAssignments(req, env) },
  { method: 'POST', path: /^\/api\/v1\/hostels\/assignments$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateRoomAssignment(req, env) },
  { method: 'DELETE', path: /^\/api\/v1\/hostels\/assignments\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleDeleteRoomAssignment(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/medical$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListMedicalRecords(req, env) },
  { method: 'POST', path: /^\/api\/v1\/medical$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateMedicalRecord(req, env) },
  { method: 'DELETE', path: /^\/api\/v1\/medical\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleDeleteMedicalRecord(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/inventory$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListInventory(req, env) },
  { method: 'POST', path: /^\/api\/v1\/inventory$/, roles: ['admin'], handler: async (req, env) =>handleCreateInventoryItem(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/inventory\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleUpdateInventoryItem(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/inventory\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleDeleteInventoryItem(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/visitors$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListVisitors(req, env) },
  { method: 'POST', path: /^\/api\/v1\/visitors$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateVisitor(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/visitors\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleUpdateVisitor(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/visitors\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p) =>handleDeleteVisitor(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/attendance$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListAttendance(req, env) },
  { method: 'POST', path: /^\/api\/v1\/attendance$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCreateAttendanceRecord(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/attendance\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleUpdateAttendanceRecord(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/catalog\/faculties$/, roles: ['admin', 'staff', 'student'], handler: async (req, env) =>handleCatalogFaculties(req, env) },
  { method: 'GET', path: /^\/api\/v1\/catalog\/departments$/, roles: ['admin', 'staff', 'student'], handler: async (req, env) =>handleCatalogDepartments(req, env) },
  { method: 'GET', path: /^\/api\/v1\/catalog\/programs$/, roles: ['admin', 'staff', 'student'], handler: async (req, env) =>handleCatalogPrograms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/catalog\/terms$/, roles: ['admin', 'staff', 'student'], handler: async (req, env) =>handleCatalogTerms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/students\/stats\/overview$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleStudentStatsOverview(req, env) },
  { method: 'GET', path: /^\/api\/v1\/staff\/stats\/overview$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleStaffStatsOverview(req, env) },
  { method: 'GET', path: /^\/api\/v1\/courses\/stats\/overview$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCourseStatsOverview(req, env) },
  { method: 'GET', path: /^\/api\/v1\/finance\/stats$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleFinanceStats(req, env) },
  { method: 'POST', path: /^\/api\/v1\/documents\/verify$/, roles: undefined, handler: async (req, env) =>handleVerifyCertificate(req, env) },
  { method: 'GET', path: /^\/api\/v1\/certificates\/verification\/stats$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleCertificateVerificationStats(req, env) },
  // Multi-Agent Implementation Routes
  { method: 'POST', path: /^\/api\/auth\/claim$/, roles: undefined, handler: async (req, env, _p, _auth, ctx) =>handleClaimAccount(req, env, ctx) },
  { method: 'GET', path: /^\/api\/student\/onboarding$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetOnboardingStatus(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/documents\/upload$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleUploadStudentDocument(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/lms\/courses$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleLmsCourses(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/lms\/grades$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleLmsGrades(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/payment\/create-intent$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleCreatePaymentIntent(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/payment\/webhook$/, roles: undefined, handler: async (req, env) =>handlePaymentWebhook(req, env) },
  { method: 'GET', path: /^\/api\/registration\/status$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetRegistrationStatus(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/registration\/complete$/, roles: ['student'], handler: async (req, env, _p, auth, ctx) =>handleCompleteRegistration(req, env, auth!.user.sub, ctx) },
  { method: 'GET', path: /^\/api\/registration\/modules$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetAvailableModules(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/registration\/([^/]+)$/, roles: ['student'], handler: async (req, env, p, auth) =>handleSaveRegistrationStep(req, env, auth!.user.sub, p[1]) },
  // Onboarding Flow Routes
  { method: 'GET', path: /^\/api\/student\/holds$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetMyHolds(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/registration-progress$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetRegistrationProgress(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/curriculum$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetProgramCurriculum(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/enroll\/mandatory$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleAutoEnrollMandatory(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/electives$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGetElectiveGroups(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/electives\/submit$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleSubmitElectives(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/orientation\/complete$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleCompleteOrientation(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/invoice\/generate$/, roles: ['student'], handler: async (req, env, _p, auth) =>handleGenerateProgramInvoice(req, env, auth!.user.sub) },
  // Admin curriculum & fee management
  { method: 'POST', path: /^\/api\/admin\/curriculum\/sync$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleAdminSyncCurriculum(req, env) },
  { method: 'POST', path: /^\/api\/admin\/program-fee$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleAdminSetProgramFee(req, env) },
  { method: 'POST', path: /^\/api\/admin\/students\/([^/]+)\/resolve-hold$/, roles: ['admin', 'staff'], handler: async (req, env, p) =>handleAdminResolveHold(req, env, p[1]) },
  // Alumni
  { method: 'POST', path: /^\/api\/alumni\/transition$/, roles: ['admin'], handler: async (req, env, _p, auth) =>handleTransitionToAlumni(req, env, auth!.user.sub) },
  // Academic Standing
  { method: 'GET', path: /^\/api\/v1\/students\/([^/]+)\/standing\/current$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth) =>handleGetCurrentStanding(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'GET', path: /^\/api\/v1\/students\/([^/]+)\/standing$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth) =>handleGetStudentStanding(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: 'GET', path: /^\/api\/v1\/admin\/standing\/rules$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleListStandingRules(req, env) },
  { method: 'GET', path: /^\/api\/v1\/admin\/standing$/, roles: ['admin', 'staff'], handler: async (req, env) =>handleAdminListStanding(req, env) },
  { method: 'POST', path: /^\/api\/v1\/admin\/standing\/compute$/, roles: ['admin'], handler: async (req, env) =>handleComputeStanding(req, env) },
];

import { bootstrap } from '@bmi/bootstrap';

export default withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN || '',
    tracesSampleRate: 1.0,
  }),
  {
  async fetch(request, env, ctx) {
    const startTime = performance.now();
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env.ALLOWED_ORIGINS_OVERRIDE) });
    }

    // Initialize context
    const context = bootstrap(env);
    env.PLATFORM_CONTEXT = context;

    if (!path.startsWith('/api/')) {
      if (path === '/') {
        return new Response(JSON.stringify({ name: 'BMI API', version: '1.3.0', status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
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
      const isCsrfExempt = csrfExemptPaths.has(path) || path === '/api/recommendations/' || path.startsWith('/api/recommendations/');
      if (stateChangingMethods.includes(method) && !isCsrfExempt) {
        if (!validateCsrfToken(request)) {
          const duration = performance.now() - startTime;
          const errorResponse = error('Invalid CSRF token', 403);
          trackResponseTime(path, method, duration, 403, request);
          return withCors(errorResponse, request, env.ALLOWED_ORIGINS_OVERRIDE);
        }
      }

      for (const route of ROUTES) {
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
          auth = authResult;
        }

        let response = await route.handler(request, env, match, auth, ctx);
        
        if (route.cacheTTL && response.status === 200) {
          response = new Response(response.body, response);
          response.headers.set('Cache-Control', `public, max-age=${route.cacheTTL}, s-maxage=${route.cacheTTL}`);
        }

        // Track response time for all requests
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
  async scheduled(controller, env, ctx) {
    const context = bootstrap(env);
    env.PLATFORM_CONTEXT = context;
    await backupWorker.scheduled(controller, env, ctx);
    await runArchivalJob(env);
  },
  async queue(batch, env, _ctx) {
    const context = bootstrap(env);
    env.PLATFORM_CONTEXT = context;
    const { processEmailDelivery } = await import('./lib/email');
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
          await env.PLATFORM_CONTEXT!.db.prepare(
            `UPDATE email_logs SET status = ?, error_message = ?, attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?`
          ).bind(status, errorMessage || null, payload.logId).run();
        } catch (e) {
          console.error('Failed to update email_logs:', e);
        }
      }
    }
  },
} satisfies ExportedHandler<Env>);
