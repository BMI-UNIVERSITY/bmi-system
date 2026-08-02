import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useStaff } from '../../hooks/api';
import { 
  Users, 
  Briefcase, 
  CheckCircle2, 
  Plus, 
  X, 
  Edit2, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Check, 
  Printer, 
  Download, 
  UserPlus, 
  FileCheck, 
  Building2, 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  ChevronRight, 
  Sliders, 
  RefreshCw, 
  Eye, 
  Mail, 
  Phone, 
  UserCheck, 
  GraduationCap, 
  Scale, 
  Star, 
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import { StaffRecord, UserRole } from '../../types';

export const HRView: React.FC = () => {
  const { data: _staffList } = useStaff();
  const staffList = _staffList || [];
  const { addStaffRecord, updateStaffRecord, logAudit } = useApp();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'roster' | 'workload' | 'leave' | 'recruitment' | 'performance' | 'payroll'
  >('roster');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [viewingStaffProfile, setViewingStaffProfile] = useState<StaffRecord | null>(null);

  // New Staff Onboarding Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [role, setRole] = useState<'lecturer' | 'registrar' | 'finance' | 'admissions' | 'hr' | 'librarian' | 'advisor' | 'alumni' | 'it'>('lecturer');
  const [title, setTitle] = useState('Senior Lecturer');
  const [department, setDepartment] = useState('School of Computing & Engineering');
  const [teachingLoad, setTeachingLoad] = useState(12);
  const [salaryCategory, setSalaryCategory] = useState('Grade 1 - Senior Academic');
  const [employmentType, setEmploymentType] = useState<'Full-Time Tenure' | 'Full-Time Contract' | 'Part-Time Adjunct' | 'Visiting Scholar'>('Full-Time Tenure');

  // Leave & Sabbatical Management State
  const [leaveRequests, setLeaveRequests] = useState<Array<{
    id: string;
    staffId: string;
    staffName: string;
    department: string;
    category: 'Academic Research Sabbatical' | 'Annual Vacation' | 'Medical / Sick Leave' | 'Conference & Travel' | 'Maternity / Paternity Leave';
    startDate: string;
    endDate: string;
    daysCount: number;
    status: 'Pending HR Review' | 'Approved' | 'Rejected';
    reason: string;
  }>>([
    { id: 'lve-101', staffId: 'STAFF-102', staffName: 'Dr. Alan Vance', department: 'School of Computing & Engineering', category: 'Academic Research Sabbatical', startDate: '2026-09-01', endDate: '2026-12-20', daysCount: 110, status: 'Pending HR Review', reason: 'Quantum computing research fellowship at ETH Zürich.' },
    { id: 'lve-102', staffId: 'STAFF-105', staffName: 'Prof. Helen Ross', department: 'School of Humanities & Law', category: 'Conference & Travel', startDate: '2026-08-10', endDate: '2026-08-18', daysCount: 8, status: 'Approved', reason: 'Keynote presentation at Oxford International Law Symposium.' },
    { id: 'lve-103', staffId: 'STAFF-108', staffName: 'Marcus Sterling', department: 'Division of Business & Finance', category: 'Annual Vacation', startDate: '2026-08-01', endDate: '2026-08-14', daysCount: 14, status: 'Approved', reason: 'Annual leave accrual utilization.' }
  ]);

  const [newLeaveModalOpen, setNewLeaveModalOpen] = useState(false);
  const [newLeaveData, setNewLeaveData] = useState({
    staffId: staffList[0]?.id || '',
    category: 'Academic Research Sabbatical' as const,
    startDate: '2026-09-01',
    endDate: '2026-09-15',
    reason: ''
  });

  // Academic Recruitment & Talent Pipeline State
  const [jobRequisitions, setJobRequisitions] = useState<Array<{
    id: string;
    title: string;
    department: string;
    employmentType: 'Full-Time Tenure' | 'Full-Time Contract' | 'Part-Time Adjunct';
    applicantsCount: number;
    stage: 'Screening' | 'Faculty Seminar' | 'Board Interview' | 'Offer Extended' | 'Filled';
    priority: 'High' | 'Medium' | 'Low';
    postedDate: string;
  }>>([
    { id: 'req-201', title: 'Chair Professor of Quantum Artificial Intelligence', department: 'School of Computing & Engineering', employmentType: 'Full-Time Tenure', applicantsCount: 18, stage: 'Board Interview', priority: 'High', postedDate: '2026-05-10' },
    { id: 'req-202', title: 'Associate Dean of Student Admissions', department: 'Division of Enrollment & Admissions', employmentType: 'Full-Time Contract', applicantsCount: 32, stage: 'Screening', priority: 'Medium', postedDate: '2026-06-01' },
    { id: 'req-203', title: 'Assistant Lecturer in Corporate Finance & Fintech', department: 'School of Business & Finance', employmentType: 'Part-Time Adjunct', applicantsCount: 14, stage: 'Faculty Seminar', priority: 'Low', postedDate: '2026-06-15' }
  ]);

  const [newReqModalOpen, setNewReqModalOpen] = useState(false);
  const [newReqData, setNewReqData] = useState({
    title: '',
    department: 'School of Computing & Engineering',
    employmentType: 'Full-Time Tenure' as const,
    priority: 'High' as const
  });

  // Performance Appraisal & Tenure Review Matrix State
  const [performanceReviews, setPerformanceReviews] = useState<Array<{
    id: string;
    staffName: string;
    staffNumber: string;
    department: string;
    tenureStatus: 'Tenured Professor' | 'Tenure-Track Year 4' | 'Tenure-Track Year 2' | 'Contractual Faculty' | 'Administrative Staff';
    peerEvaluationScore: number; // 1-5
    studentEvaluationScore: number; // 1-5
    researchOutputScore: number; // 1-5
    overallRating: number; // 1-5
    reviewYear: number;
    promotability: 'Recommended for Promotion' | 'Satisfactory On Track' | 'Needs Performance Plan';
  }>>([
    { id: 'prf-301', staffName: 'Dr. Alan Vance', staffNumber: 'STAFF-102', department: 'School of Computing & Engineering', tenureStatus: 'Tenure-Track Year 4', peerEvaluationScore: 4.8, studentEvaluationScore: 4.6, researchOutputScore: 4.9, overallRating: 4.8, reviewYear: 2026, promotability: 'Recommended for Promotion' },
    { id: 'prf-302', staffName: 'Prof. Helen Ross', staffNumber: 'STAFF-105', department: 'School of Humanities & Law', tenureStatus: 'Tenured Professor', peerEvaluationScore: 4.9, studentEvaluationScore: 4.7, researchOutputScore: 4.8, overallRating: 4.8, reviewYear: 2026, promotability: 'Satisfactory On Track' },
    { id: 'prf-303', staffName: 'Sarah Jenkins', staffNumber: 'STAFF-109', department: 'Division of Student Affairs', tenureStatus: 'Administrative Staff', peerEvaluationScore: 4.2, studentEvaluationScore: 4.1, researchOutputScore: 3.8, overallRating: 4.0, reviewYear: 2026, promotability: 'Satisfactory On Track' }
  ]);

  // Payroll & Compensation State
  const [payrollRunning, setPayrollRunning] = useState(false);
  const [lastPayrollDate, setLastPayrollDate] = useState('2026-07-25');

  // Filtered Staff Roster
  const filteredStaff = staffList.filter(stf => {
    const matchesSearch = !searchQuery || 
      stf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stf.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stf.staffNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stf.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === 'all' || stf.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || stf.status === statusFilter;
    const matchesRole = roleFilter === 'all' || stf.role === roleFilter;

    return matchesSearch && matchesDept && matchesStatus && matchesRole;
  });

  // Unique Departments
  const departments = Array.from(new Set(staffList.map(s => s.department))).filter(Boolean);

  // Stats Calculations
  const totalHeadcount = staffList.length;
  const activeStaffCount = staffList.filter(s => s.status === 'Active').length;
  const onLeaveCount = staffList.filter(s => s.status === 'On Leave' || s.status === 'Sabbatical').length;
  const totalTeachingCredits = staffList.reduce((acc, curr) => acc + (curr.teachingLoadCredits || 0), 0);
  const pendingLeaveCount = leaveRequests.filter(l => l.status === 'Pending HR Review').length;

  // Role Mapping Helper
  const mapRoleToUserRole = (inputRole: string): UserRole => {
    switch (inputRole) {
      case 'hr': return 'hr_manager';
      case 'advisor': return 'advisor';
      case 'alumni': return 'alumni_officer';
      case 'it': return 'it_admin';
      default: return inputRole as UserRole;
    }
  };

  // Handle Staff Onboarding
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const userRole = mapRoleToUserRole(role);

    addStaffRecord({
      name,
      email,
      role: userRole,
      title,
      department,
      teachingLoadCredits: teachingLoad,
      status: 'Active',
      salaryCategory
    });

    setShowAddModal(false);
    setName('');
    setEmail('');
    setPhone('+1 (555) 019-2834');
    
    logAudit('Staff Onboarded', `Onboarded new staff member '${name}' as '${title}' in '${department}'.`);
    alert(`Staff member ${name} successfully onboarded and system credentials generated.`);
  };

  // Handle Staff Update
  const handleUpdateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    updateStaffRecord(editingStaff.id, editingStaff);
    logAudit('Staff Profile Updated', `Updated staff record for '${editingStaff.name}' (${editingStaff.staffNumber}).`);
    setEditingStaff(null);
    alert('Staff record successfully updated.');
  };

  // Handle Approve / Reject Leave
  const handleLeaveDecision = (leaveId: string, decision: 'Approved' | 'Rejected') => {
    setLeaveRequests(prev => prev.map(l => {
      if (l.id === leaveId) {
        // Also update staff status if sabbatical/leave approved
        if (decision === 'Approved') {
          const stf = staffList.find(s => s.id === l.staffId || s.staffNumber === l.staffId);
          if (stf) {
            updateStaffRecord(stf.id, {
              status: l.category.includes('Sabbatical') ? 'Sabbatical' : 'On Leave'
            });
          }
        }
        return { ...l, status: decision };
      }
      return l;
    }));

    logAudit('Leave Decision Recorded', `HR ${decision} leave request ${leaveId}.`);
  };

  // Handle Request Leave
  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const stf = staffList.find(s => s.id === newLeaveData.staffId || s.staffNumber === newLeaveData.staffId) || staffList[0];
    if (!stf) return;

    const newLeave = {
      id: `lve-${Date.now()}`,
      staffId: stf.staffNumber,
      staffName: stf.name,
      department: stf.department,
      category: newLeaveData.category,
      startDate: newLeaveData.startDate,
      endDate: newLeaveData.endDate,
      daysCount: 14,
      status: 'Pending HR Review' as const,
      reason: newLeaveData.reason || 'Official academic request.'
    };

    setLeaveRequests([newLeave, ...leaveRequests]);
    setNewLeaveModalOpen(false);
    setNewLeaveData({
      staffId: staffList[0]?.id || '',
      category: 'Academic Research Sabbatical',
      startDate: '2026-09-01',
      endDate: '2026-09-15',
      reason: ''
    });

    logAudit('Leave Request Submitted', `Submitted leave request for ${stf.name}.`);
  };

  // Handle Job Requisition Creation
  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqData.title) return;

    const newReq = {
      id: `req-${Date.now()}`,
      title: newReqData.title,
      department: newReqData.department,
      employmentType: newReqData.employmentType,
      applicantsCount: 0,
      stage: 'Screening' as const,
      priority: newReqData.priority,
      postedDate: new Date().toISOString().split('T')[0]
    };

    setJobRequisitions([newReq, ...jobRequisitions]);
    setNewReqModalOpen(false);
    setNewReqData({
      title: '',
      department: 'School of Computing & Engineering',
      employmentType: 'Full-Time Tenure',
      priority: 'High'
    });

    logAudit('Job Requisition Posted', `Posted job requisition '${newReq.title}'.`);
  };

  // Trigger Bulk Payroll Execution
  const handleRunPayroll = () => {
    setPayrollRunning(true);
    setTimeout(() => {
      setPayrollRunning(false);
      const today = new Date().toISOString().split('T')[0];
      setLastPayrollDate(today);
      logAudit('Monthly Payroll Disbursed', `Executed monthly staff payroll disbursement for ${staffList.length} personnel on ${today}.`);
      alert(`Payroll disbursement completed successfully! Direct deposit statements generated for ${staffList.length} staff members.`);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 text-slate-100">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
              Division of Human Resources & Faculty Governance
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              Academic Personnel Desk
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2 flex items-center space-x-3">
            <Briefcase className="w-7 h-7 text-indigo-400" />
            <span>Human Resources & Academic Personnel Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Faculty onboarding, teaching workload credit analysis, sabbatical leave governance, talent recruitment pipelines, performance reviews, and monthly payroll operations.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard New Staff</span>
          </button>

          <button
            onClick={() => setNewLeaveModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>Request Leave</span>
          </button>

          <button
            onClick={() => setNewReqModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center space-x-2"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Post Job Opening</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Total Personnel</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Roster</span>
          </div>
          <div className="text-2xl font-black text-white">{totalHeadcount}</div>
          <p className="text-[10px] text-slate-400">Faculty & Administrative Staff.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Active Duty</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">On Duty</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeStaffCount}</div>
          <p className="text-[10px] text-slate-400">Currently serving on campus.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>On Leave / Sabbatical</span>
            </span>
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Sabbaticals</span>
          </div>
          <div className="text-2xl font-black text-purple-300">{onLeaveCount}</div>
          <p className="text-[10px] text-slate-400">Research or vacation leaves.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Teaching Load</span>
            </span>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Weekly</span>
          </div>
          <div className="text-2xl font-black text-cyan-300">{totalTeachingCredits} <span className="text-xs text-slate-400 font-normal">Credits</span></div>
          <p className="text-[10px] text-slate-400">Total instructional credit load.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Pending Leaves</span>
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">HR Review</span>
          </div>
          <div className="text-2xl font-black text-amber-300">{pendingLeaveCount}</div>
          <p className="text-[10px] text-slate-400">Awaiting HR decision.</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'roster' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Faculty Roster ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('workload')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'workload' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Faculty Teaching Workload</span>
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'leave' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Leave & Sabbatical Governance ({leaveRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recruitment')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'recruitment' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Recruitment Pipeline ({jobRequisitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'performance' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Performance & Tenure Reviews</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'payroll' 
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Compensation & Payroll</span>
        </button>
      </div>

      {/* --- TAB 1: STAFF & FACULTY ROSTER --- */}
      {activeTab === 'roster' && (
        <div className="space-y-4 text-xs">
          {/* Controls & Search Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff name, ID, title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Duty</option>
                <option value="On Leave">On Leave</option>
                <option value="Sabbatical">Sabbatical</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white capitalize focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All System Roles</option>
                <option value="lecturer">Lecturer / Faculty</option>
                <option value="registrar">Registrar</option>
                <option value="finance">Finance Officer</option>
                <option value="admissions">Admissions</option>
                <option value="hr_manager">HR Manager</option>
                <option value="librarian">Librarian</option>
                <option value="academic_advisor">Academic Advisor</option>
                <option value="it_admin">IT Admin</option>
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Academic & Administrative Personnel Roster</h3>
                <p className="text-slate-400 text-xs">Showing {filteredStaff.length} of {staffList.length} registered personnel</p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard Staff</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3">Staff ID</th>
                    <th className="p-3">Full Name & Role</th>
                    <th className="p-3">Title & Designation</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Teaching Load</th>
                    <th className="p-3">Salary Tier</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStaff.map(stf => (
                    <tr key={stf.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-indigo-300">{stf.staffNumber}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{stf.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{stf.email} • <span className="capitalize text-indigo-400">{stf.role.replace('_', ' ')}</span></div>
                      </td>
                      <td className="p-3 text-slate-300 font-semibold">{stf.title}</td>
                      <td className="p-3 text-slate-400">{stf.department}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {stf.teachingLoadCredits || 0} Credits/wk
                      </td>
                      <td className="p-3 text-slate-300 font-medium">{stf.salaryCategory || 'Standard Grade'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          stf.status === 'Active' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : stf.status === 'Sabbatical'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {stf.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => setViewingStaffProfile(stf)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition"
                          title="View Full Personnel File"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingStaff(stf)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg transition"
                          title="Edit Staff Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStaff.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-white text-sm">No staff records match the current filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: FACULTY TEACHING WORKLOAD ANALYZER --- */}
      {activeTab === 'workload' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <span>Faculty Instructional Workload & Credit Balancing</span>
              </h3>
              <p className="text-slate-400 text-xs">Analysis of weekly teaching credits per faculty member vs maximum academic capacity (Target: 12-15 credits/wk).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.filter(s => s.role === 'lecturer' || s.title.toLowerCase().includes('professor') || s.title.toLowerCase().includes('lecturer')).map(stf => {
                const credits = stf.teachingLoadCredits || 0;
                const isOverload = credits > 15;
                const isUnderload = credits < 9;

                return (
                  <div key={stf.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{stf.name}</h4>
                        <p className="text-slate-400 text-[11px]">{stf.title} • {stf.department}</p>
                      </div>

                      {isOverload && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          Overload Risk
                        </span>
                      )}
                      {isUnderload && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          Under Capacity
                        </span>
                      )}
                      {!isOverload && !isUnderload && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          Optimal Load
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Assigned Credits:</span>
                        <strong className="text-cyan-300 font-mono">{credits} / 18 Credits Max</strong>
                      </div>

                      <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isOverload ? 'bg-rose-500' : isUnderload ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (credits / 18) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Overload Stipend: {isOverload ? '+$850/mo' : 'Standard'}</span>
                      <button
                        onClick={() => setEditingStaff(stf)}
                        className="text-indigo-400 hover:underline font-bold"
                      >
                        Adjust Credits
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: LEAVE & SABBATICAL GOVERNANCE --- */}
      {activeTab === 'leave' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <span>Faculty & Staff Leave & Sabbatical Governance</span>
                </h3>
                <p className="text-slate-400 text-xs">Review sabbatical proposals, research leave requests, and vacation accrual approvals.</p>
              </div>

              <button
                onClick={() => setNewLeaveModalOpen(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Leave Request</span>
              </button>
            </div>

            <div className="space-y-3">
              {leaveRequests.map(lve => (
                <div key={lve.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-sm">{lve.staffName}</h4>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                          {lve.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          lve.status === 'Approved' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : lve.status === 'Rejected'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {lve.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">Department: {lve.department} • Duration: {lve.startDate} to {lve.endDate} ({lve.daysCount} Days)</p>
                    </div>

                    {lve.status === 'Pending HR Review' && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleLeaveDecision(lve.id, 'Approved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(lve.id, 'Rejected')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center space-x-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="p-3 rounded-xl bg-slate-900/80 text-slate-300 text-xs italic">
                    "{lve.reason}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: ACADEMIC RECRUITMENT & TALENT PIPELINE --- */}
      {activeTab === 'recruitment' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Academic Recruitment & Faculty Position Requisitions</span>
                </h3>
                <p className="text-slate-400 text-xs">Open position requisitions, faculty search committee stages, and applicant pipeline.</p>
              </div>

              <button
                onClick={() => setNewReqModalOpen(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Post Requisition</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobRequisitions.map(req => (
                <div key={req.id} className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        {req.priority} Priority
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono">Posted: {req.postedDate}</span>
                    </div>

                    <h4 className="font-bold text-white text-base">{req.title}</h4>
                    <p className="text-indigo-300 font-semibold">{req.department}</p>
                    <p className="text-slate-400">{req.employmentType}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Applicant Pipeline:</span>
                      <strong className="text-cyan-300 font-mono">{req.applicantsCount} Candidates</strong>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Current Stage:</span>
                      <span className="text-emerald-400 font-bold">{req.stage}</span>
                    </div>

                    <button
                      onClick={() => {
                        const stages: Array<typeof req.stage> = ['Screening', 'Faculty Seminar', 'Board Interview', 'Offer Extended', 'Filled'];
                        const currIdx = stages.indexOf(req.stage);
                        const nextStage = stages[Math.min(stages.length - 1, currIdx + 1)];
                        setJobRequisitions(prev => prev.map(r => r.id === req.id ? { ...r, stage: nextStage } : r));
                        logAudit('Job Requisition Stage Updated', `Advanced '${req.title}' to stage '${nextStage}'.`);
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition text-[11px] flex items-center justify-center space-x-1"
                    >
                      <span>Advance Search Stage</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: PERFORMANCE APPRAISALS & TENURE MATRIX --- */}
      {activeTab === 'performance' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Star className="w-5 h-5 text-emerald-400" />
                <span>Annual Faculty Performance Appraisals & Tenure Review Matrix</span>
              </h3>
              <p className="text-slate-400 text-xs">Peer evaluation, student feedback scores, research publishing metrics, and tenure promotion recommendations.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Tenure Track Status</th>
                    <th className="p-3">Peer Score</th>
                    <th className="p-3">Student Score</th>
                    <th className="p-3">Research Score</th>
                    <th className="p-3">Overall Rating</th>
                    <th className="p-3">Promotability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {performanceReviews.map(prf => (
                    <tr key={prf.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <strong className="text-white text-sm">{prf.staffName}</strong>
                        <div className="text-[10px] text-slate-400 font-mono">{prf.staffNumber} • {prf.department}</div>
                      </td>
                      <td className="p-3 text-indigo-300 font-semibold">{prf.tenureStatus}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">{prf.peerEvaluationScore} / 5.0</td>
                      <td className="p-3 font-mono text-cyan-400 font-bold">{prf.studentEvaluationScore} / 5.0</td>
                      <td className="p-3 font-mono text-purple-400 font-bold">{prf.researchOutputScore} / 5.0</td>
                      <td className="p-3 font-mono text-amber-300 font-black text-sm">{prf.overallRating} / 5.0</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          {prf.promotability}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 6: COMPENSATION & PAYROLL OVERSIGHT --- */}
      {activeTab === 'payroll' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-teal-400" />
                  <span>Compensation Tiers & Monthly Payroll Operations</span>
                </h3>
                <p className="text-slate-400 text-xs">Faculty salary categories, research stipends, health benefits status, and monthly payroll disbursement.</p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-slate-400 text-xs">Last Payroll: <strong className="text-white font-mono">{lastPayrollDate}</strong></span>
                <button
                  onClick={handleRunPayroll}
                  disabled={payrollRunning}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition shadow-lg shadow-teal-600/30 flex items-center space-x-2 disabled:opacity-50"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{payrollRunning ? 'Processing Payroll...' : 'Execute Monthly Payroll'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <span className="text-slate-400 font-semibold">Professor Grade I</span>
                <div className="text-xl font-bold text-white font-mono">$11,500 <span className="text-xs font-normal text-slate-400">/ mo</span></div>
                <p className="text-[10px] text-slate-400">Tenured Department Chairs & Senior Research Fellows.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <span className="text-slate-400 font-semibold">Senior Lecturer Grade II</span>
                <div className="text-xl font-bold text-white font-mono">$8,200 <span className="text-xs font-normal text-slate-400">/ mo</span></div>
                <p className="text-[10px] text-slate-400">Full-time instructional faculty & lab directors.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <span className="text-slate-400 font-semibold">Executive Administrative</span>
                <div className="text-xl font-bold text-white font-mono">$6,800 <span className="text-xs font-normal text-slate-400">/ mo</span></div>
                <p className="text-[10px] text-slate-400">Registrars, Finance directors, HR Specialists.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <span className="text-slate-400 font-semibold">Adjunct Faculty Scale</span>
                <div className="text-xl font-bold text-white font-mono">$120 <span className="text-xs font-normal text-slate-400">/ hr</span></div>
                <p className="text-[10px] text-slate-400">Part-time visiting scholars and industry experts.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: ONBOARD NEW STAFF MEMBER --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Onboard New Academic / Administrative Personnel</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Name & Honorific</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Arthur Pendelton"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. arthur@brighthorizon.edu"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white capitalize"
                  >
                    {['lecturer', 'registrar', 'finance', 'admissions', 'hr', 'librarian', 'advisor', 'alumni', 'it'].map(r => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Title & Designation</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Weekly Teaching Credits</label>
                  <input
                    type="number"
                    value={teachingLoad}
                    onChange={(e) => setTeachingLoad(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Compensation Scale Tier</label>
                <select
                  value={salaryCategory}
                  onChange={(e) => setSalaryCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Grade 1 - Senior Academic">Grade 1 - Senior Academic ($11,500/mo)</option>
                  <option value="Grade 2 - Instructional Faculty">Grade 2 - Instructional Faculty ($8,200/mo)</option>
                  <option value="Grade 3 - Executive Administrative">Grade 3 - Executive Administrative ($6,800/mo)</option>
                  <option value="Grade 4 - Technical Specialist">Grade 4 - Technical Specialist ($5,500/mo)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
              >
                Create Staff Record & Issue Credentials
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT STAFF RECORD --- */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base">Edit Personnel File — {editingStaff.staffNumber}</h2>
              <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Title & Designation</label>
                <input
                  type="text"
                  value={editingStaff.title}
                  onChange={(e) => setEditingStaff({ ...editingStaff, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department</label>
                <input
                  type="text"
                  value={editingStaff.department}
                  onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Teaching Load (Credits/wk)</label>
                  <input
                    type="number"
                    value={editingStaff.teachingLoadCredits || 0}
                    onChange={(e) => setEditingStaff({ ...editingStaff, teachingLoadCredits: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status</label>
                  <select
                    value={editingStaff.status}
                    onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Sabbatical">Sabbatical</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
              >
                Save Profile Updates
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: VIEW COMPLETE PERSONNEL FILE --- */}
      {viewingStaffProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-white text-base">Personnel File — {viewingStaffProfile.name}</h2>
              </div>
              <button onClick={() => setViewingStaffProfile(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{viewingStaffProfile.name}</h3>
                  <p className="text-indigo-300 font-semibold">{viewingStaffProfile.title}</p>
                  <p className="text-slate-400 text-xs">{viewingStaffProfile.department}</p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {viewingStaffProfile.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-400">Staff ID:</span>
                  <p className="text-white font-mono font-bold">{viewingStaffProfile.staffNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <p className="text-white font-mono">{viewingStaffProfile.email}</p>
                </div>
                <div>
                  <span className="text-slate-400">Joined Date:</span>
                  <p className="text-white font-mono">{viewingStaffProfile.joinedDate || '2023-01-15'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Weekly Credits:</span>
                  <p className="text-emerald-400 font-mono font-bold">{viewingStaffProfile.teachingLoadCredits} Credits/wk</p>
                </div>
                <div>
                  <span className="text-slate-400">Salary Grade:</span>
                  <p className="text-cyan-300 font-semibold">{viewingStaffProfile.salaryCategory || 'Grade 2 - Senior Academic'}</p>
                </div>
                <div>
                  <span className="text-slate-400">System Role:</span>
                  <p className="text-indigo-300 font-mono capitalize">{viewingStaffProfile.role.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingStaffProfile(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: REQUEST LEAVE --- */}
      {newLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span>Submit Staff Leave Request</span>
              </h2>
              <button onClick={() => setNewLeaveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Staff Member</label>
                <select
                  value={newLeaveData.staffId}
                  onChange={e => setNewLeaveData({ ...newLeaveData, staffId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.staffNumber}) - {s.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Leave Category</label>
                <select
                  value={newLeaveData.category}
                  onChange={e => setNewLeaveData({ ...newLeaveData, category: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Academic Research Sabbatical">Academic Research Sabbatical</option>
                  <option value="Annual Vacation">Annual Vacation</option>
                  <option value="Medical / Sick Leave">Medical / Sick Leave</option>
                  <option value="Conference & Travel">Conference & Travel</option>
                  <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newLeaveData.startDate}
                    onChange={e => setNewLeaveData({ ...newLeaveData, startDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={newLeaveData.endDate}
                    onChange={e => setNewLeaveData({ ...newLeaveData, endDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Justification & Academic Details</label>
                <textarea
                  value={newLeaveData.reason}
                  onChange={e => setNewLeaveData({ ...newLeaveData, reason: e.target.value })}
                  rows={3}
                  placeholder="Provide research proposal or vacation details..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition"
              >
                Submit Request to HR
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: POST JOB REQUISITION --- */}
      {newReqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Post Open Academic Requisition</span>
              </h2>
              <button onClick={() => setNewReqModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Position Title</label>
                <input
                  type="text"
                  value={newReqData.title}
                  onChange={e => setNewReqData({ ...newReqData, title: e.target.value })}
                  placeholder="e.g. Chair Professor in Cybersecurity"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department</label>
                <input
                  type="text"
                  value={newReqData.department}
                  onChange={e => setNewReqData({ ...newReqData, department: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Employment Type</label>
                  <select
                    value={newReqData.employmentType}
                    onChange={e => setNewReqData({ ...newReqData, employmentType: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Full-Time Tenure">Full-Time Tenure</option>
                    <option value="Full-Time Contract">Full-Time Contract</option>
                    <option value="Part-Time Adjunct">Part-Time Adjunct</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Priority Level</label>
                  <select
                    value={newReqData.priority}
                    onChange={e => setNewReqData({ ...newReqData, priority: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition"
              >
                Publish Job Requisition
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
