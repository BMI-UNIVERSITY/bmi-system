import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudents } from '../../hooks/api';
import { exportToCsv, triggerPrint } from '../../utils/exportUtils';
import { 
  UserCheck, 
  AlertCircle, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  Plus, 
  Search, 
  Filter, 
  GraduationCap, 
  Users, 
  Award, 
  HeartPulse, 
  Calendar, 
  DollarSign, 
  Building2, 
  Sparkles, 
  Clock, 
  X, 
  Printer, 
  Download, 
  Send, 
  Scale, 
  BookOpen, 
  ShieldCheck, 
  Check, 
  ChevronRight, 
  Eye, 
  Activity, 
  FileCheck,
  Phone,
  Mail,
  Sliders,
  UserPlus,
  RefreshCw,
  FolderPlus
} from 'lucide-react';
import { Student } from '../../types';

export const AdvisorView: React.FC = () => {
  const { data: _students } = useStudents();
  const students = _students || [];
  const { advisingNotes, addAdvisingNote, resolveAdvisingNote, updateStudentProfile, logAudit } = useApp();

  // Active Tab Navigation
  const [activeTab, setActiveTab] = useState<
    'at-risk' | 'counseling' | 'organizations' | 'discipline' | 'accommodations'
  >('at-risk');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'probation' | 'financial' | 'lowGpa'>('all');

  // Counseling Note Form Modal / Drawer State
  const [counselingModalOpen, setCounselingModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [sessionCategory, setSessionCategory] = useState<
    'Academic Guidance' | 'Mental Health & Wellbeing' | 'Career & Internship' | 'Personal Emergency' | 'Financial Hardship'
  >('Academic Guidance');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [followUpDate, setFollowUpDate] = useState('2026-08-15');
  const [isConfidential, setIsConfidential] = useState(true);
  const [atRisk, setAtRisk] = useState(false);

  // Intervention Plan Modal State
  const [interventionModalStudent, setInterventionModalStudent] = useState<Student | null>(null);
  const [interventionType, setInterventionType] = useState<'Peer Tutoring' | 'Financial Hold Waiver' | 'Academic Contract' | 'Counseling Schedule'>('Academic Contract');
  const [interventionNotes, setInterventionNotes] = useState('');

  // Student Clubs & Organizations State
  const [studentClubs, setStudentClubs] = useState<Array<{
    id: string;
    name: string;
    category: 'STEM & Robotics' | 'Business & Finance' | 'Arts & Culture' | 'Social & Governance' | 'Athletics';
    president: string;
    advisor: string;
    membersCount: number;
    allocatedBudget: number;
    spentBudget: number;
    status: 'Active' | 'Renewal Pending' | 'Funding Requested';
    foundedYear: number;
  }>>([
    { id: 'clb-101', name: 'BMI Robotics & Artificial Intelligence Guild', category: 'STEM & Robotics', president: 'Alex Mercer (M.Sc. CS)', advisor: 'Dr. Alan Vance', membersCount: 142, allocatedBudget: 12500, spentBudget: 8400, status: 'Active', foundedYear: 2021 },
    { id: 'clb-102', name: 'BMI Debate & Parliamentary Union', category: 'Social & Governance', president: 'Sophia Martinez (LL.B.)', advisor: 'Prof. Helen Ross', membersCount: 88, allocatedBudget: 6000, spentBudget: 4200, status: 'Active', foundedYear: 2018 },
    { id: 'clb-103', name: 'FinTech & Quantum Computing Society', category: 'Business & Finance', president: 'Chloe Bennett (B.Sc. Finance)', advisor: 'Dr. Marcus Sterling', membersCount: 110, allocatedBudget: 9500, spentBudget: 9200, status: 'Funding Requested', foundedYear: 2023 },
    { id: 'clb-104', name: 'International Cultural Diversity Council', category: 'Arts & Culture', president: 'Devon Vance (B.A. Int Relations)', advisor: 'Dr. Sarah Jenkins', membersCount: 205, allocatedBudget: 8000, spentBudget: 5100, status: 'Active', foundedYear: 2019 }
  ]);

  const [newClubModalOpen, setNewClubModalOpen] = useState(false);
  const [newClubData, setNewClubData] = useState({
    name: '',
    category: 'STEM & Robotics' as const,
    president: '',
    advisor: '',
    allocatedBudget: 5000
  });

  // Disciplinary & Grievance Governance State
  const [conductCases, setConductCases] = useState<Array<{
    id: string;
    studentName: string;
    studentUid: string;
    offenseCategory: 'Academic Integrity / Plagiarism' | 'Honor Code Review' | 'Campus Noise Grievance' | 'Property Damage' | 'Dispute Appeal';
    dateLogged: string;
    investigator: string;
    hearingStatus: 'Under Review' | 'Hearing Scheduled' | 'Sanction Imposed' | 'Cleared';
    sanctionType?: 'Official Reprimand' | 'Academic Probation' | 'Community Service' | 'Suspension' | 'Case Dismissed';
    summary: string;
  }>>([
    { id: 'cnd-201', studentName: 'Michael Chang', studentUid: '2023-CS-088', offenseCategory: 'Academic Integrity / Plagiarism', dateLogged: '2026-07-20', investigator: 'Disciplinary Board', hearingStatus: 'Hearing Scheduled', summary: 'Alleged unauthorized AI assistance on CS-401 Final Exam submission.' },
    { id: 'cnd-202', studentName: 'Sarah Connor', studentUid: '2022-ENG-012', offenseCategory: 'Honor Code Review', dateLogged: '2026-07-15', investigator: 'Dean of Student Affairs', hearingStatus: 'Sanction Imposed', sanctionType: 'Official Reprimand', summary: 'Failure to register campus event amplification equipment prior to quiet hours.' },
    { id: 'cnd-203', studentName: 'Jordan Hayes', studentUid: '2024-FIN-045', offenseCategory: 'Dispute Appeal', dateLogged: '2026-07-10', investigator: 'Student Welfare Ombudsman', hearingStatus: 'Cleared', sanctionType: 'Case Dismissed', summary: 'Grievance regarding dormitory room allocation resolved amicably.' }
  ]);

  const [newConductModalOpen, setNewConductModalOpen] = useState(false);
  const [newConductData, setNewConductData] = useState({
    studentId: students[0]?.id || '',
    offenseCategory: 'Academic Integrity / Plagiarism' as const,
    investigator: 'Disciplinary Board',
    summary: ''
  });

  // Health, Disability & Accessibility Services State
  const [accommodationRequests, setAccommodationRequests] = useState<Array<{
    id: string;
    studentName: string;
    studentUid: string;
    accommodationType: '50% Extended Exam Duration' | 'Ergonomic Testing Room' | 'Screen Reader / Assistive Software' | 'Mobility Access Pass' | 'Medical Absence Waiver';
    requestedDate: string;
    medicalDocumentationVerified: boolean;
    status: 'Pending Verification' | 'Approved & Active' | 'Needs Medical Review';
    approvedBy?: string;
  }>>([
    { id: 'acc-301', studentName: 'Alex Mercer', studentUid: '2023-CS-101', accommodationType: '50% Extended Exam Duration', requestedDate: '2026-07-22', medicalDocumentationVerified: true, status: 'Approved & Active', approvedBy: 'Student Accessibility Services' },
    { id: 'acc-302', studentName: 'Elena Rostova', studentUid: '2022-LAW-012', accommodationType: 'Screen Reader / Assistive Software', requestedDate: '2026-07-25', medicalDocumentationVerified: true, status: 'Approved & Active', approvedBy: 'Accessibility Desk' },
    { id: 'acc-303', studentName: 'Devon Vance', studentUid: '2024-BIO-033', accommodationType: 'Medical Absence Waiver', requestedDate: '2026-07-27', medicalDocumentationVerified: false, status: 'Pending Verification' }
  ]);

  // Counseling Session Summary Report Modal Data
  const [counselingReportModalData, setCounselingReportModalData] = useState<any | null>(null);

  // Filter At-Risk Students
  const atRiskStudents = students.filter(s => {
    const isProbation = s.academicStatus === 'Probation';
    const isHold = s.financialHold;
    const isLowGpa = s.cgpa < 2.5;

    if (riskFilter === 'probation') return isProbation;
    if (riskFilter === 'financial') return isHold;
    if (riskFilter === 'lowGpa') return isLowGpa;
    return isProbation || isHold || isLowGpa;
  }).filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.studentUid.toLowerCase().includes(q) ||
      s.program.toLowerCase().includes(q);
  });

  // Save Advising Note Handler
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !content) return;

    addAdvisingNote({
      studentId: selectedStudentId,
      advisorName: 'Dr. Marcus Vance (Dean of Student Affairs)',
      topic: `[${sessionCategory}] ${topic}`,
      content: `${content}\n\nAction Plan: ${actionItems || 'Follow up scheduled.'}\nFollow-Up Date: ${followUpDate}`,
      isConfidential,
      atRiskFlag: atRisk
    });

    setCounselingModalOpen(false);
    setTopic('');
    setContent('');
    setActionItems('');
    setAtRisk(false);

    logAudit('Advising Session Logged', `Logged counseling session for student ${selectedStudentId} under topic '${topic}'.`);
    alert('Confidential advising session successfully saved to student file.');
  };

  // Launch Intervention Plan Handler
  const handleApplyIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interventionModalStudent) return;

    // Update student profile if tutoring or contract applied
    updateStudentProfile(interventionModalStudent.id, {
      academicStatus: 'Active'
    });

    logAudit('Intervention Applied', `Applied '${interventionType}' intervention for student ${interventionModalStudent.firstName} ${interventionModalStudent.lastName}.`);
    alert(`Intervention Plan '${interventionType}' successfully initiated for ${interventionModalStudent.firstName} ${interventionModalStudent.lastName}. Status updated.`);
    setInterventionModalStudent(null);
  };

  // Register New Club Handler
  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubData.name || !newClubData.president) return;

    const newClub = {
      id: `clb-${Date.now()}`,
      name: newClubData.name,
      category: newClubData.category,
      president: newClubData.president,
      advisor: newClubData.advisor || 'Faculty Board',
      membersCount: 1,
      allocatedBudget: Number(newClubData.allocatedBudget),
      spentBudget: 0,
      status: 'Active' as const,
      foundedYear: 2026
    };

    setStudentClubs([newClub, ...studentClubs]);
    setNewClubModalOpen(false);
    setNewClubData({
      name: '',
      category: 'STEM & Robotics',
      president: '',
      advisor: '',
      allocatedBudget: 5000
    });

    logAudit('Student Club Registered', `Registered new student organization '${newClub.name}' with budget $${newClub.allocatedBudget}.`);
  };

  const handleExportAdvisingRosterCsv = () => {
    const headers = ['Student ID', 'Student Name', 'Email', 'Program', 'CGPA', 'Academic Status', 'At-Risk Indicator'];
    const rows = students.map(s => [
      s.studentNumber,
      `${s.firstName} ${s.lastName}`,
      s.email,
      s.program,
      s.cgpa,
      s.academicStatus,
      s.cgpa < 2.5 || s.academicHold ? 'AT RISK' : 'NORMAL'
    ]);
    exportToCsv('BMI_University_Advising_Student_Roster.csv', headers, rows);
  };

  // Create Conduct Case Handler
  const handleCreateConductCase = (e: React.FormEvent) => {
    e.preventDefault();
    const std = students.find(s => s.id === newConductData.studentId);
    if (!std || !newConductData.summary) return;

    const newCase = {
      id: `cnd-${Date.now()}`,
      studentName: `${std.firstName} ${std.lastName}`,
      studentUid: std.studentUid,
      offenseCategory: newConductData.offenseCategory,
      dateLogged: new Date().toISOString().split('T')[0],
      investigator: newConductData.investigator,
      hearingStatus: 'Under Review' as const,
      summary: newConductData.summary
    };

    setConductCases([newCase, ...conductCases]);
    setNewConductModalOpen(false);
    setNewConductData({
      studentId: students[0]?.id || '',
      offenseCategory: 'Academic Integrity / Plagiarism',
      investigator: 'Disciplinary Board',
      summary: ''
    });

    logAudit('Conduct Case Logged', `Opened conduct case '${newCase.id}' for student ${newCase.studentName}.`);
  };

  // Approve Accommodation Request Handler
  const handleApproveAccommodation = (reqId: string) => {
    setAccommodationRequests(prev => prev.map(a => a.id === reqId ? {
      ...a,
      status: 'Approved & Active',
      approvedBy: 'Dr. Marcus Vance (Student Affairs Dean)'
    } : a));

    logAudit('Accommodation Approved', `Approved disability/accessibility accommodation request ${reqId}.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 text-slate-100">
      
      {/* Page Title & Global Metrics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
              Division of Student Life & Academic Support
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              24/7 Wellness & Governance Desk
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2 flex items-center space-x-3">
            <UserCheck className="w-7 h-7 text-indigo-400" />
            <span>Student Affairs & Academic Advising Console</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Early warning academic interventions, confidential counseling logs, student organizations budget oversight, grievance hearings, and accessibility accommodations.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportAdvisingRosterCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Roster CSV</span>
          </button>

          <button
            onClick={() => setCounselingModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Log Counseling Session</span>
          </button>

          <button
            onClick={() => setNewClubModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center space-x-2"
          >
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Register Club</span>
          </button>

          <button
            onClick={() => setNewConductModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center space-x-2"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>Conduct Hearing</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Students Guided</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="text-2xl font-black text-white">{students.length}</div>
          <p className="text-[10px] text-slate-400">Enrolled across all faculties.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>At-Risk Cases</span>
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Action Needed</span>
          </div>
          <div className="text-2xl font-black text-amber-300">{atRiskStudents.length}</div>
          <p className="text-[10px] text-slate-400">Probation, hold, or CGPA &lt; 2.5.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Counseling Sessions</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Confidential</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{advisingNotes.length}</div>
          <p className="text-[10px] text-slate-400">Logged in security vault.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Student Clubs</span>
            </span>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Societies</span>
          </div>
          <div className="text-2xl font-black text-cyan-300">{studentClubs.length}</div>
          <p className="text-[10px] text-slate-400">Total $35.5k budget allocated.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <HeartPulse className="w-4 h-4 text-purple-400" />
              <span>Accommodations</span>
            </span>
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Accessibility</span>
          </div>
          <div className="text-2xl font-black text-purple-300">{accommodationRequests.length}</div>
          <p className="text-[10px] text-slate-400">Active accessibility passes.</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('at-risk')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'at-risk' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>At-Risk Early Warning ({atRiskStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('counseling')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'counseling' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Counseling & Advising Logs ({advisingNotes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('organizations')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'organizations' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Student Clubs & Organizations ({studentClubs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discipline')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'discipline' 
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Conduct & Grievances ({conductCases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('accommodations')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'accommodations' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Accessibility & Disability Desk ({accommodationRequests.length})</span>
        </button>
      </div>

      {/* --- TAB 1: AT-RISK EARLY WARNING DASHBOARD --- */}
      {activeTab === 'at-risk' && (
        <div className="space-y-4 text-xs">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search at-risk student name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
              <span className="text-slate-400 font-semibold shrink-0">Filter Trigger:</span>
              <button
                onClick={() => setRiskFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${riskFilter === 'all' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                All Flags ({students.filter(s => s.academicStatus === 'Probation' || s.financialHold || s.cgpa < 2.5).length})
              </button>
              <button
                onClick={() => setRiskFilter('probation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${riskFilter === 'probation' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                Academic Probation ({students.filter(s => s.academicStatus === 'Probation').length})
              </button>
              <button
                onClick={() => setRiskFilter('financial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${riskFilter === 'financial' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                Financial Hold ({students.filter(s => s.financialHold).length})
              </button>
              <button
                onClick={() => setRiskFilter('lowGpa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${riskFilter === 'lowGpa' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                CGPA &lt; 2.5 ({students.filter(s => s.cgpa < 2.5).length})
              </button>
            </div>
          </div>

          {/* At-Risk Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {atRiskStudents.map(std => {
              const isProbation = std.academicStatus === 'Probation';
              const isHold = std.financialHold;

              return (
                <div key={std.id} className="p-5 rounded-2xl bg-slate-900 border border-amber-800/40 hover:border-amber-700 transition shadow-md flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white text-base">{std.firstName} {std.lastName}</h3>
                        <p className="text-slate-400 text-xs font-mono">{std.studentUid} • Semester {std.currentSemester} (Cohort {std.cohortYear})</p>
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        {isProbation && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                            Academic Probation
                          </span>
                        )}
                        {isHold && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            Financial Hold
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 text-[11px]">
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">Program:</span>
                        <strong className="text-indigo-300">{std.program}</strong>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">Current CGPA:</span>
                        <strong className={`font-mono ${std.cgpa < 2.5 ? 'text-rose-400' : 'text-emerald-400'}`}>{std.cgpa.toFixed(2)} / 4.00</strong>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">Contact Email:</span>
                        <span className="text-slate-300">{std.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedStudentId(std.id);
                        setCounselingModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold rounded-lg transition text-[11px] flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Counseling Session</span>
                    </button>

                    <button
                      onClick={() => setInterventionModalStudent(std)}
                      className="px-3 py-1.5 bg-amber-600/90 hover:bg-amber-500 text-white font-bold rounded-lg transition text-[11px] flex items-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Intervention Plan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {atRiskStudents.length === 0 && (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">No at-risk students match the current filter.</p>
              <p className="text-xs mt-1">All enrolled students are currently maintaining satisfactory academic progress.</p>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: CONFIDENTIAL COUNSELING & ADVISING LOGS --- */}
      {activeTab === 'counseling' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span>Confidential Counseling Session Vault</span>
                </h3>
                <p className="text-slate-400 text-xs">Encrypted log of official student advising, academic recovery contracts, and mental health consultations.</p>
              </div>

              <button
                onClick={() => setCounselingModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Log New Session</span>
              </button>
            </div>

            {/* Session Notes List */}
            <div className="space-y-3">
              {advisingNotes.map(note => {
                const std = students.find(s => s.id === note.studentId);

                return (
                  <div key={note.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-white text-sm">{note.topic}</h4>
                          {note.isConfidential && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                              Confidential Vault
                            </span>
                          )}
                          {note.atRiskFlag && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              At-Risk
                            </span>
                          )}
                          {note.resolved ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              Resolved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                              In Progress
                            </span>
                          )}
                        </div>

                        <p className="text-indigo-300 font-semibold text-xs mt-1">
                          Student: <strong>{std ? `${std.firstName} ${std.lastName}` : 'Enrolled Student'}</strong> ({std?.studentUid || note.studentId}) • Counselor: {note.advisorName} • Date: {note.date}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => setCounselingReportModalData({ note, student: std })}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 transition text-[10px] flex items-center space-x-1"
                        >
                          <Printer className="w-3 h-3 text-cyan-400" />
                          <span>Report</span>
                        </button>

                        {!note.resolved && (
                          <button
                            onClick={() => {
                              resolveAdvisingNote(note.id);
                              logAudit('Advising Note Resolved', `Marked note ${note.id} as resolved.`);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-[10px] flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </div>
                  </div>
                );
              })}

              {advisingNotes.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-white text-sm">No advising notes logged yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: STUDENT CLUBS & ORGANIZATIONS --- */}
      {activeTab === 'organizations' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  <span>Student Clubs, Societies & Extracurricular Guilds</span>
                </h3>
                <p className="text-slate-400 text-xs">Official registration, executive leadership charters, and annual activity budget grants.</p>
              </div>

              <button
                onClick={() => setNewClubModalOpen(true)}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Student Society</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentClubs.map(clb => (
                <div key={clb.id} className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                        {clb.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${clb.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                        {clb.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base">{clb.name}</h4>

                    <div className="pt-2 space-y-1.5 text-[11px] text-slate-300">
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">President:</span>
                        <strong className="text-white">{clb.president}</strong>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">Faculty Advisor:</span>
                        <span className="text-indigo-300 font-semibold">{clb.advisor}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">Active Membership:</span>
                        <strong className="text-white">{clb.membersCount} Scholars</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Annual Budget Granted:</span>
                      <strong className="text-emerald-400 font-mono">${clb.allocatedBudget.toLocaleString()}</strong>
                    </div>

                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-full rounded-full" 
                        style={{ width: `${Math.min(100, Math.round((clb.spentBudget / clb.allocatedBudget) * 100))}%` }} 
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Spent: ${clb.spentBudget.toLocaleString()}</span>
                      <button
                        onClick={() => {
                          setStudentClubs(prev => prev.map(c => c.id === clb.id ? { ...c, allocatedBudget: c.allocatedBudget + 2500, status: 'Active' } : c));
                          logAudit('Club Grant Approved', `Disbursed $2,500 supplemental grant to club '${clb.name}'.`);
                          alert(`Supplemental grant of $2,500 disbursed to ${clb.name}.`);
                        }}
                        className="text-cyan-400 hover:underline font-bold"
                      >
                        + Grant Supplemental Funds
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: STUDENT CONDUCT & GRIEVANCE GOVERNANCE --- */}
      {activeTab === 'discipline' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-rose-400" />
                  <span>Student Conduct Board & Grievance Governance</span>
                </h3>
                <p className="text-slate-400 text-xs">Academic integrity hearings, honor code reviews, dispute appeals, and formal sanction records.</p>
              </div>

              <button
                onClick={() => setNewConductModalOpen(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Log Conduct Hearing</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">Case ID</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Offense / Grievance Category</th>
                    <th className="py-2.5 px-3">Date Logged</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">SanctionVerdict</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {conductCases.map(cnd => (
                    <tr key={cnd.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono text-indigo-300 font-bold">{cnd.id}</td>
                      <td className="py-3 px-3 font-bold text-white">
                        {cnd.studentName} <span className="text-slate-500 font-mono text-[10px]">({cnd.studentUid})</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{cnd.offenseCategory}</td>
                      <td className="py-3 px-3 text-slate-400">{cnd.dateLogged}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${cnd.hearingStatus === 'Cleared' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                          {cnd.hearingStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-semibold">{cnd.sanctionType || 'Pending Hearing'}</td>
                      <td className="py-3 px-3 text-right">
                        {cnd.hearingStatus !== 'Cleared' && (
                          <button
                            onClick={() => {
                              setConductCases(prev => prev.map(c => c.id === cnd.id ? { ...c, hearingStatus: 'Cleared', sanctionType: 'Case Dismissed' } : c));
                              logAudit('Conduct Case Cleared', `Cleared conduct case ${cnd.id}.`);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px]"
                          >
                            Resolve / Clear
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: ACCESSIBILITY & DISABILITY ACCOMMODATIONS --- */}
      {activeTab === 'accommodations' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <HeartPulse className="w-5 h-5 text-purple-400" />
                <span>Student Accessibility & Disability Accommodations Desk</span>
              </h3>
              <p className="text-slate-400 text-xs">Official exam extensions, ergonomic workspace assignments, and medical waiver certificates.</p>
            </div>

            <div className="space-y-3">
              {accommodationRequests.map(acc => (
                <div key={acc.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <strong className="text-white text-sm">{acc.studentName}</strong>
                      <span className="text-slate-400 font-mono">({acc.studentUid})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${acc.status === 'Approved & Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                        {acc.status}
                      </span>
                    </div>

                    <p className="text-indigo-300 font-bold">{acc.accommodationType}</p>
                    <p className="text-slate-400 text-[10px]">Requested Date: {acc.requestedDate} • Medical Docs Verified: {acc.medicalDocumentationVerified ? 'YES (Verified by Health Center)' : 'PENDING REVIEW'}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {acc.status !== 'Approved & Active' && (
                      <button
                        onClick={() => handleApproveAccommodation(acc.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Pass</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: CONFIDENTIAL COUNSELING LOG FORM --- */}
      {counselingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Log Confidential Advising & Counseling Session</span>
              </h2>
              <button onClick={() => setCounselingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.studentUid}) - CGPA {s.cgpa.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Counseling Category</label>
                  <select
                    value={sessionCategory}
                    onChange={e => setSessionCategory(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Academic Guidance">Academic Guidance</option>
                    <option value="Mental Health & Wellbeing">Mental Health & Wellbeing</option>
                    <option value="Career & Internship">Career & Internship</option>
                    <option value="Personal Emergency">Personal Emergency</option>
                    <option value="Financial Hardship">Financial Hardship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Session Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Midterm Recovery & Tutoring Agreement"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Counseling Session Details</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={3}
                  placeholder="Record confidential session observations and discussion points..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Agreed Action Items & Milestones</label>
                <input
                  type="text"
                  value={actionItems}
                  onChange={e => setActionItems(e.target.value)}
                  placeholder="e.g. Attend CS-201 tutoring 2x weekly; submit financial aid waiver by Friday."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isConfidential"
                    checked={isConfidential}
                    onChange={e => setIsConfidential(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="isConfidential" className="text-slate-300 font-semibold">Mark as Confidential Vault</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="atRisk"
                    checked={atRisk}
                    onChange={e => setAtRisk(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-amber-600 focus:ring-0"
                  />
                  <label htmlFor="atRisk" className="text-slate-300 font-semibold">Flag Student as At-Risk</label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCounselingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Save to Confidential Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: INTERVENTION PLAN MODAL --- */}
      {interventionModalStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Launch Early Intervention Plan</span>
              </h2>
              <button onClick={() => setInterventionModalStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200">
              <p className="font-bold text-white">{interventionModalStudent.firstName} {interventionModalStudent.lastName} ({interventionModalStudent.studentUid})</p>
              <p className="text-[11px] mt-0.5">Program: {interventionModalStudent.program} • CGPA: {interventionModalStudent.cgpa.toFixed(2)}</p>
            </div>

            <form onSubmit={handleApplyIntervention} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Intervention Package</label>
                <select
                  value={interventionType}
                  onChange={e => setInterventionType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Academic Contract">Academic Recovery Contract & Tutoring</option>
                  <option value="Peer Tutoring">Assign Peer Mentor & Study Group</option>
                  <option value="Financial Hold Waiver">Emergency Financial Hold Waiver Request</option>
                  <option value="Counseling Schedule">Mandatory Weekly Counseling Schedule</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Intervention Directives & Notes</label>
                <textarea
                  value={interventionNotes}
                  onChange={e => setInterventionNotes(e.target.value)}
                  rows={3}
                  placeholder="Specify conditions for restoring student to good academic standing..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInterventionModalStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Initiate Intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: NEW STUDENT CLUB MODAL --- */}
      {newClubModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <span>Register New Student Organization</span>
              </h2>
              <button onClick={() => setNewClubModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClub} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Society / Club Name</label>
                <input
                  type="text"
                  value={newClubData.name}
                  onChange={e => setNewClubData({ ...newClubData, name: e.target.value })}
                  placeholder="e.g. BMI Quantum Computing Society"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select
                    value={newClubData.category}
                    onChange={e => setNewClubData({ ...newClubData, category: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="STEM & Robotics">STEM & Robotics</option>
                    <option value="Business & Finance">Business & Finance</option>
                    <option value="Arts & Culture">Arts & Culture</option>
                    <option value="Social & Governance">Social & Governance</option>
                    <option value="Athletics">Athletics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Initial Budget Request ($)</label>
                  <input
                    type="number"
                    value={newClubData.allocatedBudget}
                    onChange={e => setNewClubData({ ...newClubData, allocatedBudget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Executive President (Student)</label>
                <input
                  type="text"
                  value={newClubData.president}
                  onChange={e => setNewClubData({ ...newClubData, president: e.target.value })}
                  placeholder="e.g. Alex Mercer (Class of 2026)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Faculty Advisor</label>
                <input
                  type="text"
                  value={newClubData.advisor}
                  onChange={e => setNewClubData({ ...newClubData, advisor: e.target.value })}
                  placeholder="e.g. Dr. Alan Vance"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewClubModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  Register Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: NEW CONDUCT CASE MODAL --- */}
      {newConductModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Scale className="w-5 h-5 text-rose-400" />
                <span>Open Disciplinary / Conduct Case</span>
              </h2>
              <button onClick={() => setNewConductModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateConductCase} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Student</label>
                <select
                  value={newConductData.studentId}
                  onChange={e => setNewConductData({ ...newConductData, studentId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.studentUid})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Offense / Grievance Category</label>
                <select
                  value={newConductData.offenseCategory}
                  onChange={e => setNewConductData({ ...newConductData, offenseCategory: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Academic Integrity / Plagiarism">Academic Integrity / Plagiarism</option>
                  <option value="Honor Code Review">Honor Code Review</option>
                  <option value="Campus Noise Grievance">Campus Noise Grievance</option>
                  <option value="Property Damage">Property Damage</option>
                  <option value="Dispute Appeal">Dispute Appeal</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Case Summary & Findings</label>
                <textarea
                  value={newConductData.summary}
                  onChange={e => setNewConductData({ ...newConductData, summary: e.target.value })}
                  rows={3}
                  placeholder="Summarize the incident or grievance logged..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewConductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Open Case File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: COUNSELING REPORT PREVIEW MODAL --- */}
      {counselingReportModalData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in text-xs text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <span>Advising Vault Report & Summary Certificate</span>
              </h2>
              <button onClick={() => setCounselingReportModalData(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-white text-slate-900 font-sans space-y-4 border border-slate-300 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                <div>
                  <h3 className="font-black text-lg text-indigo-950">BMI UNIVERSITY MANAGEMENT SYSTEM</h3>
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Office of Student Affairs & Academic Advising</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 text-[9px] font-bold rounded uppercase">OFFICIAL RECORD</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase">Student Name:</span>
                  <strong className="text-slate-900">{counselingReportModalData.student?.firstName} {counselingReportModalData.student?.lastName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase">Registration UID:</span>
                  <strong className="text-indigo-900 font-mono">{counselingReportModalData.student?.studentUid}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase">Counselor:</span>
                  <span className="text-slate-800">{counselingReportModalData.note.advisorName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase">Date Logged:</span>
                  <span className="text-slate-800">{counselingReportModalData.note.date}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Session Topic:</span>
                <p className="font-bold text-slate-900 text-xs">{counselingReportModalData.note.topic}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Counseling Summary Notes:</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {counselingReportModalData.note.content}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span>Security Stamp: SEC-ADV-2026-ENCRYPTED</span>
                <span>Dean of Student Affairs Signoff: Dr. Marcus Vance</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  triggerPrint();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center space-x-1"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Summary</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
