import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../types';
import { BmiLogo } from './BmiLogo';
import { 
  ShieldCheck, 
  KeyRound, 
  UserCheck, 
  Lock, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  GraduationCap
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { setActiveRole, setAuth, authToken, authUser } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store JWT token & Auth User
      setAuth(data.token, data.user);
      setActiveRole(data.user.role);
      
      setSuccessMsg(`Authenticated as ${data.user.name}`);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BmiLogo size="md" />
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleLogin} className="p-6 space-y-6">
          {authToken && authUser && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Currently authenticated as <strong>{authUser.name}</strong> ({authUser.role})</span>
              </div>
              <span className="font-mono text-[10px] bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-500/30">Token Active</span>
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-center space-x-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex items-center space-x-2 text-xs text-indigo-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Institutional Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. registrar@bmi.edu"
                required
              />
              <UserCheck className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Security Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="Enter your password"
                  required
                />
                <KeyRound className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Security Standard
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-400 flex items-center justify-between h-[42px]">
                <span className="flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>HMAC SHA-256 JWT Token</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">HMAC-256</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-indigo-600/30"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Authenticating...' : 'Authenticate & Issue Token'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
