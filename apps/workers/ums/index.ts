import { requireAuth, rateLimit, withCors, getCorsHeaders } from '@bmi/api-middleware';
import type { Env } from './lib/types';

import { handleGetDashboard, handleGetCourses, handleEnroll, handleGetFinances, handlePayInvoice, handleDropCourse, handleGetTranscript, handleGetSettings, handleUpdateSettings, handleGetTickets, handleCreateTicket } from './routes/student';
import { handleListTimetabling, handleCreateTimetabling } from './routes/ums-timetabling';
import { handleListRubrics, handleCreateRubric, handleDeleteRubric } from './routes/ums-rubrics';
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
  // Student Portal Routes
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

  // Timetabling
  { method: 'GET', path: /^\/api\/v1\/timetabling$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListTimetabling(req, env) },
  { method: 'POST', path: /^\/api\/v1\/timetabling$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateTimetabling(req, env) },

  // Students
  { method: 'GET', path: /^\/api\/v1\/students$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListStudents(req, env) },
  { method: 'POST', path: /^\/api\/v1\/students$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateStudent(req, env) },
  { method: 'GET', path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleGetStudent(req, env, p[1], auth!.user.sub, auth!.user.role) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdateStudent(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/students\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteStudent(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/students\/([^/]+)\/programmes$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleGetStudentProgrammes(req, env, p[1]) },
  { method: 'POST', path: /^\/api\/v1\/students\/([^/]+)\/transfer$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleProgrammeTransfer(req, env, p[1], auth!.user.sub) },

  // Grades
  { method: 'GET', path: /^\/api\/v1\/grades$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleListGrades(req, env, auth!.user.sub, auth!.user.role) },
  { method: 'POST', path: /^\/api\/v1\/grades$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateGrade(req, env, auth!.user.sub) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/grades\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdateGrade(req, env, p[1]) },

  // Courses & Academic Structure
  { method: 'GET', path: /^\/api\/v1\/courses$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListUmsCourses(req, env) },
  { method: 'POST', path: /^\/api\/v1\/courses$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateCourse(req, env) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/courses\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleUpdateCourse(req, env, p[1]) },
  { method: 'DELETE', path: /^\/api\/v1\/courses\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleDeleteCourse(req, env, p[1]) },
  { method: 'GET', path: /^\/api\/v1\/programs$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListPrograms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/faculties$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListFaculties(req, env) },
  { method: 'GET', path: /^\/api\/v1\/departments$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListDepartments(req, env) },
  { method: 'GET', path: /^\/api\/v1\/terms$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListTerms(req, env) },
  { method: 'GET', path: /^\/api\/v1\/enrollments$/, roles: ['admin', 'staff', 'student'], handler: async (req, env, p, auth, ctx) => handleListEnrollments(req, env) },
  { method: 'POST', path: /^\/api\/v1\/enrollments$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateEnrollment(req, env) },

  // Rubrics
  { method: 'GET', path: /^\/api\/v1\/rubrics$/, roles: [], handler: async (req, env, p, auth, ctx) => handleListRubrics(req, env) },
  { method: 'POST', path: /^\/api\/v1\/rubrics$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleCreateRubric(req, env) },
  { method: 'DELETE', path: /^\/api\/v1\/rubrics\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleDeleteRubric(req, env, p[1]) },

  // Staff
  { method: 'GET', path: /^\/api\/v1\/staff$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListStaff(req, env) },
  { method: 'POST', path: /^\/api\/v1\/staff$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleCreateStaff(req, env) },
  { method: 'GET', path: /^\/api\/v1\/staff\/([^/]+)$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleGetStaff(req, env, p[1]) },
  { method: ['PUT', 'PATCH'], path: /^\/api\/v1\/staff\/([^/]+)$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleUpdateStaff(req, env, p[1]) },

  // Finance & Dashboard
  { method: 'GET', path: /^\/api\/v1\/finance\/transactions$/, roles: ['admin', 'staff'], handler: async (req, env, p, auth, ctx) => handleListTransactions(req, env) },
  { method: 'GET', path: /^\/api\/v1\/dashboard\/revenue-trend$/, roles: ['admin'], handler: async (req, env, p, auth, ctx) => handleGetRevenueTrend(req, env) },

  // Collections (Campus Facilities & Records)
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

  // Stats & Catalog
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env.ALLOWED_ORIGINS_OVERRIDE) });
    }

    if (!path.startsWith('/api/student/') && !path.startsWith('/api/v1/')) {
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
