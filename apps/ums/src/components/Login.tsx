/* eslint-disable */
/* eslint-disable */
import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { login, User, AuthResponse } from '../services/authService';
import ForgotPasswordModal from './ForgotPasswordModal';
import ActivateAccountModal from './ActivateAccountModal';
import MfaModal from './MfaModal';

interface LoginProps {
  onLogin: (token: string, user: User) => void;
  logo?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, logo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showActivateAccount, setShowActivateAccount] = useState(false);
  
  // MFA state
  const [showMfa, setShowMfa] = useState(false);
  const [mfaData, setMfaData] = useState<{
    mfaToken: string;
    setupRequired: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password, rememberMe);

    if (result.success && result.data) {
      if (result.data.mfaRequired || result.data.mfaSetupRequired) {
        setMfaData({
          mfaToken: result.data.mfaToken || '',
          setupRequired: !!result.data.mfaSetupRequired
        });
        setShowMfa(true);
      } else {
        onLogin(result.data.token, result.data.user);
      }
    } else {
      // Safely extract string error message
      let errorMsg = 'Login failed';
      if (typeof result.error === 'string') {
        errorMsg = result.error;
      } else if (result.error && typeof result.error === 'object') {
        const errObj = result.error as any;
        // If it's a validation error object from the backend
        if ('issues' in errObj && Array.isArray(errObj.issues)) {
          errorMsg = errObj.issues.map((i: any) => i.message).join(', ');
        } else if ('message' in errObj) {
          errorMsg = String(errObj.message);
        } else {
          errorMsg = JSON.stringify(result.error);
        }
      }
      
      if (typeof errorMsg === 'string' && (errorMsg.includes('Network error') || errorMsg.includes('Failed to fetch'))) {
        setError('Unable to connect to the server. Please ensure the backend service is running (make start).');
      } else if (typeof errorMsg === 'string' && errorMsg.includes('timeout')) {
        setError('Server is not responding. Please try again or contact IT support.');
      } else {
        setError(errorMsg);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#4B0082] to-[#320064] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#FFD700] rounded-full mix-blend-overlay blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-[#6A0DAD] rounded-full mix-blend-overlay blur-[100px] opacity-40"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-[420px] p-8 md:p-12 relative z-10 border border-white/20">
        {/* Top Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#4B0082] via-[#FFD700] to-[#4B0082]"></div>

        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-28 h-28 mb-4 relative drop-shadow-xl">
            <img
              src={logo || "/BMI.svg"}
              alt="BMI University Logo"
              className="w-full h-full object-contain rounded-xl border-2 border-[#FFD700] bg-white"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#4B0082] text-center tracking-tight">BMI University</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">Faculty & Staff Portal</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Authentication Failed</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#4B0082] uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#FFD700] transition-colors" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent text-gray-700 text-sm transition-all shadow-inner"
                placeholder="name@university.edu"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#4B0082] uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#FFD700] transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent text-gray-700 text-sm transition-all shadow-inner"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input 
                id="remember-me" 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-[#4B0082] focus:ring-[#FFD700] border-gray-300 rounded cursor-pointer" 
              />
              <label htmlFor="remember-me" className="ml-2 block text-gray-600 cursor-pointer">Remember me (30 days)</label>
            </div>
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-semibold text-[#4B0082] hover:text-[#FFD700] transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-[#4B0082] bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:from-[#FFE033] hover:to-[#FFC44D] transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFD700] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 font-medium">
            New admitted student?{' '}
            <button
              type="button"
              onClick={() => setShowActivateAccount(true)}
              className="text-[#4B0082] font-bold hover:text-[#FFD700] transition-colors"
            >
              Activate your account
            </button>
          </p>
        </div>

        <div className="mt-6 text-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest">Powered by BMI Systems © 2024</span>
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
              onLogin(result.data.token, result.data.user);
            }
          }}
        />
      )}
    </div>
  );
};

export default Login;










