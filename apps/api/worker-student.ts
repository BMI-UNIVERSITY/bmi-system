// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { createWorker, Route } from './lib/worker-factory';
import { handleGetDashboard, handleGetCourses, handleEnroll, handleGetFinances, handlePayInvoice, handleDropCourse, handleGetTranscript, handleGetSettings, handleUpdateSettings, handleUpdatePhoto, handleGetTickets, handleCreateTicket } from './routes/student';
import { handleGetOnboardingStatus, handleUploadStudentDocument } from './routes/onboarding';
import { handleGetMyHolds, handleGetProgramCurriculum, handleAutoEnrollMandatory, handleGetElectiveGroups, handleSubmitElectives, handleGetRegistrationProgress, handleCompleteOrientation, handleGenerateProgramInvoice } from './routes/enrollment';

const routes: Route[] = [
  { method: 'GET', path: /^\/api\/student\/dashboard$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetDashboard(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/courses$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetCourses(req, env) },
  { method: 'POST', path: /^\/api\/student\/enroll$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleEnroll(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/courses\/([^/]+)\/drop$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleDropCourse(req, env, auth!.user.sub, p[1]) },
  { method: 'GET', path: /^\/api\/student\/transcript$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetTranscript(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/settings$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetSettings(req, env, auth!.user.sub) },
  { method: 'PUT', path: /^\/api\/student\/settings$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleUpdateSettings(req, env, auth!.user.sub) },
  { method: 'PUT', path: /^\/api\/student\/photo$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleUpdatePhoto(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/support$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetTickets(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/support$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleCreateTicket(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/finances$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetFinances(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/invoices\/([^/]+)\/pay$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handlePayInvoice(req, env, auth!.user.sub, p[1]) },
  { method: 'GET', path: /^\/api\/student\/onboarding$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetOnboardingStatus(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/documents\/upload$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleUploadStudentDocument(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/holds$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetMyHolds(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/registration-progress$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetRegistrationProgress(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/curriculum$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetProgramCurriculum(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/enroll\/mandatory$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleAutoEnrollMandatory(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/student\/electives$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGetElectiveGroups(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/electives\/submit$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleSubmitElectives(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/orientation\/complete$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleCompleteOrientation(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/student\/invoice\/generate$/, roles: ['student'], handler: async (req, env, p, auth, ctx) => handleGenerateProgramInvoice(req, env, auth!.user.sub) },
];

export default createWorker(routes);
