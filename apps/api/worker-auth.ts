import { createWorker, Route } from './lib/worker-factory';
import { 
  handleRegister, handleLogin, handleRefresh, handleLogout, handleMe, 
  handleVerifyEmail, handleResendVerification, handleForgotPassword, 
  handleResetPassword, handleMfaSetup, handleMfaEnable, handleMfaDisable, 
  handleOAuthLogin, handleOAuthCallback 
} from './routes/auth';

const authRoutes: Route[] = [
  { method: 'POST', path: /^\/api\/auth\/register$/, roles: undefined, handler: async (req, env, _p, _auth, ctx) => handleRegister(req, env, ctx) },
  { method: 'POST', path: /^\/api\/auth\/login$/, roles: undefined, handler: async (req, env) => handleLogin(req, env) },
  { method: 'POST', path: /^\/api\/auth\/refresh$/, roles: undefined, handler: async (req, env) => handleRefresh(req, env) },
  { method: 'DELETE', path: /^\/api\/auth\/logout$/, roles: undefined, handler: async (req, env) => handleLogout(req, env) },
  { method: 'GET', path: /^\/api\/auth\/verify$/, roles: undefined, handler: async (req, env) => handleVerifyEmail(req, env) },
  { method: 'POST', path: /^\/api\/auth\/resend-verification$/, roles: undefined, handler: async (req, env) => handleResendVerification(req, env) },
  { method: 'POST', path: /^\/api\/auth\/forgot-password$/, roles: undefined, handler: async (req, env) => handleForgotPassword(req, env) },
  { method: 'POST', path: /^\/api\/auth\/reset-password$/, roles: undefined, handler: async (req, env) => handleResetPassword(req, env) },
  { method: 'GET', path: /^\/api\/auth\/me$/, roles: [], handler: async (req, env, _p, auth) => handleMe(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/setup$/, roles: [], handler: async (req, env, _p, auth) => handleMfaSetup(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/enable$/, roles: [], handler: async (req, env, _p, auth) => handleMfaEnable(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/auth\/mfa\/disable$/, roles: [], handler: async (req, env, _p, auth) => handleMfaDisable(req, env, auth!.user.sub) },
  { method: 'GET', path: /^\/api\/auth\/oauth\/(google|github|microsoft)$/, roles: undefined, handler: async (req, env, p) => handleOAuthLogin(req, env, p[1] as 'google' | 'github' | 'microsoft') },
  { method: 'GET', path: /^\/api\/auth\/oauth\/(google|github|microsoft)\/callback$/, roles: undefined, handler: async (req, env, p) => handleOAuthCallback(req, env, p[1] as 'google' | 'github' | 'microsoft') },
  // v1 aliases
  { method: 'POST', path: /^\/api\/v1\/auth\/login$/, roles: undefined, handler: async (req, env) => handleLogin(req, env) },
  { method: ['POST', 'DELETE'], path: /^\/api\/v1\/auth\/logout$/, roles: undefined, handler: async (req, env) => handleLogout(req, env) },
  { method: 'GET', path: /^\/api\/v1\/auth\/me$/, roles: [], handler: async (req, env, _p, auth) => handleMe(req, env, auth!.user.sub) },
  { method: 'POST', path: /^\/api\/v1\/auth\/refresh$/, roles: undefined, handler: async (req, env) => handleRefresh(req, env) },
  // Claim
  { method: 'POST', path: /^\/api\/auth\/claim$/, roles: undefined, handler: async (req, env, _p, _auth, ctx) => {
      const { handleClaimAccount } = await import('./routes/claim');
      return handleClaimAccount(req, env, ctx);
  } },
];

export default createWorker(authRoutes);
