import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader2, ShieldCheck, UserCheck, KeyRound, Scroll, CreditCard, Users, ClipboardList } from 'lucide-react';
import { User, AuthResponse } from '../services/authService';
import { API_URL } from '../services/config';
import { useAuthStore } from '../stores/authStore';
import ForgotPasswordModal from './ForgotPasswordModal';
import ActivateAccountModal from './ActivateAccountModal';
import MfaModal from './MfaModal';

interface LoginProps {
  onLogin: (token: string, user: User) => void;
  logo?: string;
}

const DEMO_CREDENTIALS = [
  {
    role: 'Executive Admin',
    email: 'admin@bmi.edu',
    password: 'TestAdmin2024!!',
    icon: ShieldCheck,
    scope: 'Full Unrestricted Access',
    color: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-500/20',
  },
  {
    role: 'Academic Registrar',
    email: 'registrar@bmi.edu',
    password: 'TestRegistrar2024!!',
    icon: Scroll,
    scope: 'Programs, Grades, Transcripts',
    color: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-500/20',
  },
  {
    role: 'Finance Bursar',
    email: 'finance@bmi.edu',
    password: 'TestFinance2024!!',
    icon: CreditCard,
    scope: 'Student Ledger & Payroll',
    color: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-500/20',
  },
  {
    role: 'Faculty Chair',
    email: 'faculty@bmi.edu',
    password: 'TestFaculty2024!!',
    icon: UserCheck,
    scope: 'Classes, Grading & Attendance',
    color: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-500/20',
  },
  {
    role: 'HR Director',
    email: 'hr@bmi.edu',
    password: 'TestHR2024!!',
    icon: Users,
    scope: 'Staff Directory & Payroll',
    color: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:bg-rose-500/20',
  },
  {
    role: 'Admissions Officer',
    email: 'admissions@bmi.edu',
    password: 'TestAdmissions2024!!',
    icon: ClipboardList,
    scope: 'Applications & Enrollment',
    color: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700 hover:bg-cyan-500/20',
  },
];

const Login: React.FC<LoginProps> = ({ onLogin, logo }) => {
  const isLocalDev = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' || 
     window.location.hostname.startsWith('192.168.'));

  const [email, setEmail] = useState(isLocalDev ? 'admin@bmi.edu' : '');
  const [password, setPassword] = useState(isLocalDev ? 'TestAdmin2024!!' : '');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showActivateAccount, setShowActivateAccount] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string | null>(isLocalDev ? 'Executive Admin' : null);


  // MFA state
  const [showMfa, setShowMfa] = useState(false);
  const [mfaData] = useState<{
    mfaToken: string;
    setupRequired: boolean;
  } | null>(null);

  const performLogin = async (targetEmail: string, targetPass: string) => {
    setLoading(true);
    setError('');

    const result = await useAuthStore.getState().login(targetEmail, targetPass, rememberMe);

    if (!result.success) {
      let errorMsg = result.error || 'Login failed';
      if (typeof errorMsg === 'string' && (errorMsg.includes('Network error') || errorMsg.includes('Failed to fetch'))) {
        // The auth API is unreachable. State the exact endpoint being hit and
        // point at the likely cause per environment instead of implying a
        // local demo session (no such fallback exists).
        const hint = API_URL.startsWith('/')
          ? 'If you are running locally, the API must be running too: start it with `npm run dev` in apps/api (it serves on http://127.0.0.1:8787), then sign in again.'
          : 'The API is not reachable from the browser. Check your network and that VITE_API_URL points at the API Worker at build time (see apps/ums/DEPLOY.md).';
        setError(`Unable to reach the authentication server (${API_URL}). ${hint}`);
      } else {
        setError(errorMsg);
      }
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  /**
   * Clicking a controlled profile card only pre-fills the email/password
   * fields — it does NOT automatically submit the form.
   *
   * Why: The login page is a security console for privileged executive
   * accounts. Auto-submitting on card click would bypass the intentional
   * "review before sign-in" step, making it trivial for a passerby to
   * log in by a single click. The user must explicitly press "Sign In".
   */
  const handleProfileSelect = (demoEmail: string, demoPass: string, role: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setActiveProfile(role);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#1e0836] to-[#2d004d] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Lighting */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] bg-[#FFD700] rounded-full mix-blend-screen blur-[140px] opacity-15 animate-pulse"></div>
        <div className="absolute top-[50%] -right-[10%] w-[45%] h-[45%] bg-[#7c3aed] rounded-full mix-blend-screen blur-[120px] opacity-30"></div>
      </div>

      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-[520px] p-6 md:p-8 relative z-10 border border-white/20 dark:border-gray-800 transition-all">
        {/* Header Accent Pill */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#4B0082] via-[#FFD700] to-[#4B0082] h-1.5 w-32 rounded-full shadow-md"></div>

        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 mb-2 relative drop-shadow-xl flex items-center justify-center">
            <img
              src={logo || "/BMI.svg"}
              alt="BMI University Logo"
              className="w-full h-full object-contain rounded-2xl border-2 border-[#FFD700]/80 bg-white p-1"
            />
          </div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight text-center">BMI University</h1>
          <p className="text-[11px] font-bold text-[#6b21a8] dark:text-[#FFD700] uppercase tracking-wider mt-0.5">Administrative & Executive Console</p>
        </div>

        {/* Quick Demo Access Bar */}
        {isLocalDev && (
          <div className="mb-5 bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-3 border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-extrabold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[#FFD700]" />
                Controlled Admin Profiles
              </span>
              <span className="text-[10px] font-semibold text-gray-400">Select Role to Sign In</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_CREDENTIALS.map((demo) => {
                const Icon = demo.icon;
                const isSelected = activeProfile === demo.role;
                return (
                  <button
                    key={demo.role}
                    type="button"
                    // Pre-fills credentials into the form — does NOT auto-submit.
                    // The user must click "Sign In" to authenticate.
                    onClick={() => handleProfileSelect(demo.email, demo.password, demo.role)}
                    disabled={loading}
                    title={`Fill credentials for ${demo.role}`}
                    aria-pressed={isSelected}
                    className={`flex flex-col items-start p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? demo.color + ' ring-2 ring-offset-1 ring-current scale-[1.02]'
                        : demo.color + ' opacity-80 hover:opacity-100'
                    } shadow-xs text-left cursor-pointer active:scale-95 disabled:opacity-50 group`}
                  >
                    <div className="flex items-center gap-1.5 w-full mb-1">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-[10px] font-extrabold leading-tight truncate">{demo.role}</span>
                      {isSelected && (
                        <span className="ml-auto text-[8px] font-black uppercase tracking-wider opacity-70">✓ Ready</span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium leading-tight line-clamp-1">{demo.scope}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}


        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl p-3 flex items-start space-x-2.5 mb-5">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-red-800 dark:text-red-200">Notice</p>
              <p className="text-red-600 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 ml-1">
              Work Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400 group-focus-within:text-[#6b21a8] dark:group-focus-within:text-[#FFD700] transition-colors" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b21a8] dark:focus:ring-[#FFD700] text-gray-900 dark:text-white text-sm font-medium transition-all shadow-sm"
                placeholder="admin@bmi.edu"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 ml-1">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-[#6b21a8] dark:group-focus-within:text-[#FFD700] transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b21a8] dark:focus:ring-[#FFD700] text-gray-900 dark:text-white text-sm transition-all shadow-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center text-gray-600 dark:text-gray-400 cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 text-[#6b21a8] focus:ring-[#FFD700] border-gray-300 rounded cursor-pointer" 
              />
              <span className="ml-2 font-medium">Keep me signed in</span>
            </label>
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-bold text-[#6b21a8] dark:text-[#FFD700] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-black text-[#2e004f] bg-gradient-to-r from-[#FFD700] to-[#f59e0b] hover:from-[#ffe033] hover:to-[#fbbf24] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In to UMS Dashboard'
            )}
          </button>
        </form>

        {/* Credential Reference Footer */}
        <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">BMI University Management System • Controlled Executive Access © 2026</p>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={email}
      />

      <ActivateAccountModal
        isOpen={showActivateAccount}
        onClose={() => setShowActivateAccount(false)}
      />

      {mfaData && (
        <MfaModal
          isOpen={showMfa}
          onClose={() => setShowMfa(false)}
          mfaToken={mfaData.mfaToken}
          setupRequired={mfaData.setupRequired}
          onSuccess={(result: AuthResponse) => {
            if (result.success && result.data) {
              onLogin(result.data.token || '', result.data.user);
            }
          }}
        />
      )}
    </div>
  );
};

export default Login;










