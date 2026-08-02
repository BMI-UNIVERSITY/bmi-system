import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useStudents } from '../../hooks/api';
import { UserRole, ThemeMode } from '../../types';
import { BmiLogo } from './BmiLogo';
import { 
  ShieldCheck, 
  Search, 
  Bell, 
  FileText, 
  UserCheck, 
  Sparkles, 
  ChevronDown,
  RotateCcw,
  Globe,
  ExternalLink,
  Palette,
  Check,
  Radio,
  CheckCheck,
  Clock,
  CreditCard,
  GraduationCap
} from 'lucide-react';

interface HeaderProps {
  onOpenAuditLog: () => void;
  onOpenSearch: () => void;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuditLog, onOpenSearch, onOpenLogin }) => {
  const { activeRole, setActiveRole, authToken, authUser } = useAuthStore();
  const { 
    auditLogs,
    resetDemoData,
    theme,
    setTheme
  } = useApp();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const themeOptions: { id: ThemeMode; label: string; bgClass: string; borderClass: string; desc: string }[] = [
    { id: 'emerald', label: 'BMI Emerald & Gold', bgClass: 'bg-emerald-600', borderClass: 'border-amber-400', desc: 'Classic University Heritage' },
    { id: 'indigo', label: 'Indigo BMI Executive', bgClass: 'bg-indigo-600', borderClass: 'border-blue-400', desc: 'Official Administrative Theme' },
    { id: 'cyber', label: 'Neon Cyber Strategy', bgClass: 'bg-teal-500', borderClass: 'border-cyan-400', desc: 'Modern High Contrast Tech' },
    { id: 'royal', label: 'Royal Sapphire', bgClass: 'bg-blue-700', borderClass: 'border-yellow-400', desc: 'Chancellor Navy & Gold' },
    { id: 'midnight', label: 'Midnight Obsidian', bgClass: 'bg-slate-800', borderClass: 'border-emerald-400', desc: 'Ultra Dark Mode' },
  ];

  const staffRoles: { role: UserRole; title: string; category: string }[] = [
    { role: 'president', title: 'President / Vice-Chancellor', category: 'Executive' },
    { role: 'registrar', title: 'Registrar', category: 'Academic Admin' },
    { role: 'lecturer', title: 'Lecturer / Faculty', category: 'Academic Staff' },
    { role: 'admissions', title: 'Admissions Officer', category: 'Student Intake' },
    { role: 'finance', title: 'Finance Officer / Bursar', category: 'Financial Services' },
    { role: 'exam_officer', title: 'Examination Officer', category: 'Academic Admin' },
    { role: 'hr_manager', title: 'HR Manager', category: 'Operations' },
    { role: 'advisor', title: 'Student Affairs / Advisor', category: 'Student Life' },
    { role: 'librarian', title: 'Librarian', category: 'Campus Resources' },
    { role: 'alumni_officer', title: 'Alumni Relations Officer', category: 'External Relations' },
    { role: 'it_admin', title: 'IT / System Admin', category: 'System Operations' },
  ];

  const getRoleLabel = (r: UserRole) => {
    const found = staffRoles.find(item => item.role === r);
    return found ? found.title : r.toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer">
            <BmiLogo size="md" />
          </div>

          {/* Center: UMS Admin Console Badge */}
          <div className="hidden md:flex items-center bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700/60 shadow-inner">
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-white">BMI Admin Portal</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Link to Separate Public University Website */}
            <a
              href="https://www.bmi.edu"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                alert('Redirecting to the separate Public University Website (https://www.bmi.edu).\n\nThe Public Website operates on a separate domain/URL and connects to this UMS via secure API integration.');
              }}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800/60 text-xs font-semibold transition"
              title="Open Separate Public University Website (www.bmi.edu)"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Public Website</span>
              <ExternalLink className="w-3 h-3 text-emerald-400 opacity-75" />
            </a>
            
            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-2 text-xs"
              title="Global Search"
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <span className="hidden lg:inline text-slate-400">Search... (Ctrl+K)</span>
            </button>

            {/* Security Login Trigger */}
            <button
              onClick={onOpenLogin}
              className={`p-2 rounded-lg border transition flex items-center space-x-1.5 text-xs ${
                authToken
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-700/60 text-emerald-300'
                  : 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/60 text-indigo-300'
              }`}
              title={authToken ? `Authenticated as ${authUser?.name}` : 'Login & Issue JWT Token'}
            >
              <ShieldCheck className={`w-4 h-4 ${authToken ? 'text-emerald-400' : 'text-indigo-400'}`} />
              <span className="hidden sm:inline font-semibold">
                {authToken ? (authUser?.role || 'Auth Active') : 'Login'}
              </span>
            </button>

            {/* Audit Trail Badge Trigger */}
            <button
              onClick={onOpenAuditLog}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1.5 text-xs relative"
              title="View Security & Audit Trail"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline font-mono text-[11px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                Audit ({auditLogs.length})
              </span>
            </button>

            {/* Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-medium text-xs shadow-md ring-1 ring-blue-400/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Role: {getRoleLabel(activeRole)}</span>
                <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 p-2 z-50 text-xs max-h-96 overflow-y-auto">
                  <p className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 tracking-wider">
                    Switch Staff View (11 Roles)
                  </p>
                  <div className="space-y-1 mt-1">
                    {staffRoles.map(item => (
                      <button
                        key={item.role}
                        onClick={() => {
                          setActiveRole(item.role);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                          activeRole === item.role
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{item.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Color Theme Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1.5 text-xs"
                title="Change UI Theme Palette"
              >
                <Palette className="w-4 h-4 text-amber-400" />
                <span className="hidden xl:inline text-xs font-semibold capitalize">{theme}</span>
              </button>

              {showThemeDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 p-2.5 z-50 text-xs space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Select System Color Theme
                    </span>
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {themeOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTheme(opt.id);
                          setShowThemeDropdown(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition border ${
                          theme === opt.id
                            ? 'bg-slate-800 border-amber-500/60 text-white font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-3.5 h-3.5 rounded-full ${opt.bgClass} border ${opt.borderClass} shrink-0`} />
                          <div>
                            <p className="text-xs font-semibold">{opt.label}</p>
                            <p className="text-[10px] text-slate-400">{opt.desc}</p>
                          </div>
                        </div>
                        {theme === opt.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reset Demo Data Button */}
            <button
              onClick={() => {
                if (confirm('Reset all demo data back to initial seed state?')) {
                  resetDemoData();
                }
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
