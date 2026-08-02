import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../types';
import { PresidentView } from './PresidentView';
import { RegistrarView } from './RegistrarView';
import { LecturerView } from './LecturerView';
import { AdmissionsView } from './AdmissionsView';
import { FinanceView } from './FinanceView';
import { ExamView } from './ExamView';
import { HRView } from './HRView';
import { AdvisorView } from './AdvisorView';
import { LibrarianView } from './LibrarianView';
import { AlumniView } from './AlumniView';
import { AdminITView } from './AdminITView';
import { 
  Building2, 
  BookOpen, 
  Users, 
  FileCheck, 
  CreditCard, 
  Calendar, 
  Briefcase, 
  UserCheck, 
  Book, 
  GraduationCap, 
  Server,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { activeRole, setActiveRole } = useAuthStore();

  const roleNavItems: { role: UserRole; label: string; icon: any; category: string }[] = [
    { role: 'president', label: 'President / VC', icon: Building2, category: 'Executive' },
    { role: 'registrar', label: 'Registrar', icon: BookOpen, category: 'Academic Admin' },
    { role: 'lecturer', label: 'Lecturer / Faculty', icon: Users, category: 'Faculty' },
    { role: 'admissions', label: 'Admissions Officer', icon: FileCheck, category: 'Student Intake' },
    { role: 'finance', label: 'Finance / Bursar', icon: CreditCard, category: 'Financials' },
    { role: 'exam_officer', label: 'Exam Officer', icon: Calendar, category: 'Academic Admin' },
    { role: 'hr_manager', label: 'HR Manager', icon: Briefcase, category: 'Operations' },
    { role: 'advisor', label: 'Student Affairs', icon: UserCheck, category: 'Student Life' },
    { role: 'librarian', label: 'Librarian', icon: Book, category: 'Resources' },
    { role: 'alumni_officer', label: 'Alumni Officer', icon: GraduationCap, category: 'Advancement' },
    { role: 'it_admin', label: 'IT System Admin', icon: Server, category: 'System Operations' },
  ];

  const activeRoleItem = roleNavItems.find(item => item.role === activeRole) || roleNavItems[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Mobile Top Role Navigation Bar */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-3 space-y-2 sticky top-16 z-20 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active Staff View: <span className="text-indigo-400">{activeRoleItem.label}</span></span>
          </p>
          <span className="text-[10px] text-slate-400 font-mono">11 Roles</span>
        </div>
        
        {/* Mobile Horizontal Pill Scroll */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none">
          {roleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeRole === item.role;

            return (
              <button
                key={item.role}
                onClick={() => setActiveRole(item.role)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Left Sidebar Role Navigation */}
      <aside className="hidden md:block w-64 bg-slate-900/90 border-r border-slate-800 p-4 space-y-4 shrink-0">
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Role-Based Access Control</p>
          <p className="text-xs font-bold text-white mt-0.5 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Staff Shell Application</span>
          </p>
        </div>

        {/* Roles List */}
        <div className="space-y-1">
          {roleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeRole === item.role;

            return (
              <button
                key={item.role}
                onClick={() => setActiveRole(item.role)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
          🔒 RBAC server-side policy enforced. Selecting a role instantly adjusts navigation & permissions.
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
        {activeRole === 'president' && <PresidentView />}
        {activeRole === 'registrar' && <RegistrarView />}
        {activeRole === 'lecturer' && <LecturerView />}
        {activeRole === 'admissions' && <AdmissionsView />}
        {activeRole === 'finance' && <FinanceView />}
        {activeRole === 'exam_officer' && <ExamView />}
        {activeRole === 'hr_manager' && <HRView />}
        {activeRole === 'advisor' && <AdvisorView />}
        {activeRole === 'librarian' && <LibrarianView />}
        {activeRole === 'alumni_officer' && <AlumniView />}
        {activeRole === 'it_admin' && <AdminITView />}
      </main>

    </div>
  );
};
