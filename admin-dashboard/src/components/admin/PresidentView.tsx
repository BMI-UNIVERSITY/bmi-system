import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { exportToCsv, triggerPrint } from '../../utils/exportUtils';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  DollarSign, 
  CheckCircle2, 
  ShieldCheck,
  Award,
  Plus,
  FileCheck,
  X,
  Megaphone,
  Rocket,
  Search,
  Filter,
  Send,
  Printer,
  Download,
  Sparkles,
  Clock,
  AlertTriangle,
  FileText,
  Lock,
  PieChart,
  Layers,
  Briefcase,
  Mail,
  UserCheck,
  BarChart3,
  Check,
  Eye,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  CartesianGrid,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { generateDocumentHash } from '../../utils/documentSecurity';
import { 
  SecurityWatermark, 
  GuillochePattern, 
  MicrotextBorder, 
  SecuritySealBadge 
} from '../common/DocumentSecurityComponents';

interface StrategicInitiative {
  id: string;
  title: string;
  leadDept: string;
  budget: number;
  spent: number;
  progressPct: number;
  status: 'Planning' | 'Underway' | 'Near Completion' | 'Completed';
  targetDate: string;
  description: string;
}

interface PresidentialEdict {
  id: string;
  title: string;
  category: 'Policy' | 'Academic' | 'Emergency' | 'Budget';
  targetAudience: string;
  publishedDate: string;
  content: string;
  pinned: boolean;
  author: string;
}

interface ExecutiveCabinetMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  kpiScore: number;
  status: 'Active' | 'On Leave';
  avatar: string;
}

export const PresidentView: React.FC = () => {
  const { 
    students, 
    staffList, 
    invoices, 
    auditLogs, 
    executiveApprovals, 
    approveExecutiveSignoff, 
    addExecutiveProposal,
    logAudit 
  } = useApp();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'analytics' | 'governance' | 'edicts' | 'initiatives' | 'cabinet' | 'audit'>('analytics');

  // Modals State
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showEdictModal, setShowEdictModal] = useState(false);
  const [showInitiativeModal, setShowInitiativeModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState<ExecutiveCabinetMember | null>(null);
  const [showSenateReportModal, setShowSenateReportModal] = useState(false);

  // Form States - New Proposal
  const [propTitle, setPropTitle] = useState('');
  const [propDept, setPropDept] = useState('Academic Affairs');
  const [propPriority, setPropPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [propBudgetImpact, setPropBudgetImpact] = useState('$500,000');

  // Form States - New Edict
  const [edictTitle, setEdictTitle] = useState('');
  const [edictCategory, setEdictCategory] = useState<'Policy' | 'Academic' | 'Emergency' | 'Budget'>('Policy');
  const [edictAudience, setEdictAudience] = useState('All Faculty, Students & Staff');
  const [edictContent, setEdictContent] = useState('');

  // Form States - New Initiative
  const [initTitle, setInitTitle] = useState('');
  const [initDept, setInitDept] = useState('School of Computing & Engineering');
  const [initBudget, setInitBudget] = useState(1200000);
  const [initDesc, setInitDesc] = useState('');

  // Form States - Executive Memo
  const [memoSubject, setMemoSubject] = useState('');
  const [memoBody, setMemoBody] = useState('');

  // Local State - Presidential Edicts
  const [edicts, setEdicts] = useState<PresidentialEdict[]>([
    {
      id: 'edict-01',
      title: 'Mandatory Institutional AI & Cybersecurity Standards 2026',
      category: 'Policy',
      targetAudience: 'All Faculty & Administrative Staff',
      publishedDate: '2026-07-15',
      content: 'All academic departments must complete digital credentialing and MFA compliance checks by August 15, 2026. Data governance guidelines now strictly enforce server-side AI processing.',
      pinned: true,
      author: 'Prof. Arthur Vance (President & VC)'
    },
    {
      id: 'edict-02',
      title: 'Net-Zero Carbon Campus Infrastructure Charter',
      category: 'Budget',
      targetAudience: 'Facilities, Deans & Operations Council',
      publishedDate: '2026-06-20',
      content: 'Authorizing Phase II solar grid array deployment across Engineering and Science complexes. Target energy self-sufficiency set at 65% by end of Q4 2026.',
      pinned: false,
      author: 'Prof. Arthur Vance (President & VC)'
    },
    {
      id: 'edict-03',
      title: 'Fall 2026 Academic Research Grant Endowment Directive',
      category: 'Academic',
      targetAudience: 'Academic Senate & Research Chairs',
      publishedDate: '2026-05-10',
      content: 'Allocating $2.5M in seed funding for interdisciplinary research proposals in Quantum AI, Biotechnology, and Sustainable Energy Economics.',
      pinned: false,
      author: 'Prof. Arthur Vance (President & VC)'
    }
  ]);

  // Local State - Strategic Initiatives
  const [initiatives, setInitiatives] = useState<StrategicInitiative[]>([
    {
      id: 'init-01',
      title: 'Center for Quantum & AI Supercomputing Infrastructure',
      leadDept: 'School of Computing & Engineering',
      budget: 1500000,
      spent: 1125000,
      progressPct: 75,
      status: 'Underway',
      targetDate: '2026-11-30',
      description: 'High-performance GPU cluster deployment for AI model training and quantum simulation algorithms.'
    },
    {
      id: 'init-02',
      title: 'Solar Campus Microgrid & Net-Zero Transition',
      leadDept: 'Facilities & Campus Planning',
      budget: 850000,
      spent: 340000,
      progressPct: 40,
      status: 'Underway',
      targetDate: '2027-03-15',
      description: 'Rooftop photovoltaic arrays and battery storage storage systems across 6 major campus buildings.'
    },
    {
      id: 'init-03',
      title: 'Bio-Engineering & Medical Sciences Research Annex',
      leadDept: 'School of Medicine & Bio Sciences',
      budget: 2200000,
      spent: 1980000,
      progressPct: 90,
      status: 'Near Completion',
      targetDate: '2026-09-01',
      description: 'Advanced genomics laboratory with Level-3 biosafety containment protocols.'
    },
    {
      id: 'init-04',
      title: 'Student Wellness & Holistic Support Pavilion',
      leadDept: 'Office of Student Affairs',
      budget: 600000,
      spent: 90000,
      progressPct: 15,
      status: 'Planning',
      targetDate: '2027-06-30',
      description: 'Dedicated mental health counseling suites, mindfulness gardens, and 24/7 student care center.'
    }
  ]);

  // Executive Cabinet Directory
  const cabinetMembers: ExecutiveCabinetMember[] = [
    {
      id: 'cab-01',
      name: 'Prof. Arthur Vance',
      role: 'President & Vice-Chancellor',
      department: 'Executive Office',
      email: 'a.vance@university.edu',
      kpiScore: 98,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'cab-02',
      name: 'Dr. Evelyn Reed',
      role: 'Provost & Vice President of Academic Affairs',
      department: 'Academic Affairs',
      email: 'e.reed@university.edu',
      kpiScore: 95,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'cab-03',
      name: 'Dr. Marcus Vance',
      role: 'Dean of Computing & Artificial Intelligence',
      department: 'School of Computing',
      email: 'm.vance@university.edu',
      kpiScore: 96,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'cab-04',
      name: 'Prof. Sarah Jenkins',
      role: 'Dean of Business & Economics',
      department: 'School of Business',
      email: 's.jenkins@university.edu',
      kpiScore: 92,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'cab-05',
      name: 'Dr. Robert Hayes',
      role: 'Chief Financial Officer & VP Administration',
      department: 'Finance & Operations',
      email: 'r.hayes@university.edu',
      kpiScore: 94,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'cab-06',
      name: 'Dr. Helen Zhang',
      role: 'University Registrar General',
      department: 'Office of the Registrar',
      email: 'h.zhang@university.edu',
      kpiScore: 97,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
    }
  ];

  // Action Toast Notice State
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Senate Report Hash State
  const [senateReportHash, setSenateReportHash] = useState<string>('');

  useEffect(() => {
    generateDocumentHash({
      documentId: `BMI-SENATE-EXEC-2026-Q3`,
      documentType: 'Official Academic Transcript', // standard map
      studentId: 'PRESIDENT-OFFICE',
      studentName: 'Prof. Arthur Vance',
      issueDate: new Date().toISOString().slice(0, 10),
      payload: {
        totalStudents: students.length + 1420,
        activeInitiatives: initiatives.length,
        decreesCount: executiveApprovals.length
      }
    }).then(h => setSenateReportHash(h));
  }, [students, initiatives, executiveApprovals]);

  // Aggregated Institutional Metrics
  const totalStudents = students.length + 1420;
  const totalFaculty = staffList.length + 180;
  const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0) + 14200000;
  const researchGrantFund = 8450000;
  const endowmentFund = 42500000;

  // Chart Datasets
  const trendData = [
    { year: '2022', enrollment: 1120, revenue: 9.8, research: 4.2 },
    { year: '2023', enrollment: 1250, revenue: 11.2, research: 5.5 },
    { year: '2024', enrollment: 1380, revenue: 12.6, research: 6.8 },
    { year: '2025', enrollment: 1450, revenue: 13.9, research: 7.6 },
    { year: '2026', enrollment: totalStudents, revenue: Number((totalRevenue / 1000000).toFixed(1)), research: 8.5 },
  ];

  const departmentData = [
    { name: 'Computing & AI', students: 580, satisfaction: 94, budget: 4.5 },
    { name: 'Business & Econ', students: 420, satisfaction: 89, budget: 3.2 },
    { name: 'Medicine & Bio', students: 340, satisfaction: 96, budget: 5.1 },
    { name: 'Engineering', students: 310, satisfaction: 95, budget: 3.8 },
    { name: 'Mathematics', students: 210, satisfaction: 91, budget: 1.9 },
    { name: 'Humanities', students: 180, satisfaction: 88, budget: 1.5 },
  ];

  const pieColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Handlers
  const handleCreateProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propTitle.trim()) return;

    addExecutiveProposal({
      title: `${propTitle.trim()} [Impact: ${propBudgetImpact}]`,
      dept: propDept,
      priority: propPriority
    });

    logAudit('Executive Decree Proposed', `Presidential decree '${propTitle.trim()}' submitted for governance clearance.`);
    setShowProposalModal(false);
    setPropTitle('');
    setActionNotice(`New Executive Decree '${propTitle.trim()}' logged in governance register.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handlePublishEdictSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edictTitle.trim() || !edictContent.trim()) return;

    const newEdict: PresidentialEdict = {
      id: 'edict-' + Date.now(),
      title: edictTitle.trim(),
      category: edictCategory,
      targetAudience: edictAudience,
      publishedDate: new Date().toISOString().slice(0, 10),
      content: edictContent.trim(),
      pinned: true,
      author: 'Prof. Arthur Vance (President & VC)'
    };

    setEdicts(prev => [newEdict, ...prev]);
    logAudit('Presidential Edict Published', `Presidential edict '${edictTitle.trim()}' broadcast to ${edictAudience}.`, 'Security');

    setShowEdictModal(false);
    setEdictTitle('');
    setEdictContent('');
    setActionNotice(`Presidential Edict successfully broadcast to ${edictAudience}.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleCreateInitiativeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initTitle.trim()) return;

    const newInit: StrategicInitiative = {
      id: 'init-' + Date.now(),
      title: initTitle.trim(),
      leadDept: initDept,
      budget: Number(initBudget),
      spent: 0,
      progressPct: 5,
      status: 'Planning',
      targetDate: '2027-12-31',
      description: initDesc.trim() || 'Strategic campus enhancement initiative.'
    };

    setInitiatives(prev => [newInit, ...prev]);
    logAudit('Strategic Initiative Launched', `Capital initiative '${initTitle.trim()}' launched with budget $${initBudget.toLocaleString()}.`);

    setShowInitiativeModal(false);
    setInitTitle('');
    setInitDesc('');
    setActionNotice(`Strategic initiative '${initTitle.trim()}' added to master plan.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleSendMemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMemoModal || !memoSubject.trim()) return;

    logAudit('Executive Memo Dispatched', `Presidential memo sent to ${showMemoModal.name} (${showMemoModal.role}): '${memoSubject.trim()}'.`);

    setActionNotice(`Executive Memo successfully dispatched to ${showMemoModal.name}.`);
    setShowMemoModal(null);
    setMemoSubject('');
    setMemoBody('');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleExportExecutiveKpiCsv = () => {
    const totalEnrolled = students.length || 1050;
    const averageCgpa = students.length > 0 ? (students.reduce((acc, s) => acc + (s.cgpa || 3.5), 0) / students.length).toFixed(2) : '3.50';
    const facultyCount = staffList.length || 82;
    const admissionsYield = 68;
    const headers = ['KPI Category', 'Metric Indicator', 'Current Value', 'Target Target', 'Status Benchmark'];
    const rows = [
      ['Student Enrollment', 'Total Active Matriculated Students', totalEnrolled, 1200, 'On Track (+8%)'],
      ['Academic Excellence', 'University Mean CGPA', averageCgpa, 3.50, 'Above Target'],
      ['Financial Health', 'Gross Tuition & Grants Revenue', `$${totalRevenue.toLocaleString()}`, '$3,500,000', '103% Budget Realization'],
      ['Faculty Ratio', 'Full-Time Academic Faculty', facultyCount, 85, 'Optimal 1:14 Ratio'],
      ['Admissions Yield', 'Verified Enrollment Rate', `${admissionsYield}%`, '65%', 'Exceeds Benchmark']
    ];
    exportToCsv('BMI_University_Executive_KPI_Report.csv', headers, rows);
  };

  const handlePrintSenateReport = () => {
    triggerPrint();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center space-x-2">
              <span>Office of the President & Vice-Chancellor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono tracking-wider">
                CANONICAL EXECUTIVE SUITE
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Institutional governance, multi-departmental benchmarks, presidential directives, capital master planning, and executive decrees.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportExecutiveKpiCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Executive KPI CSV</span>
          </button>

          <button
            onClick={() => setShowProposalModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Executive Decree</span>
          </button>

          <button
            onClick={() => setShowEdictModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition flex items-center space-x-1.5"
          >
            <Megaphone className="w-4 h-4" />
            <span>Publish Edict</span>
          </button>

          <button
            onClick={() => setShowInitiativeModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center space-x-1.5"
          >
            <Rocket className="w-4 h-4" />
            <span>Capital Project</span>
          </button>

          <button
            onClick={() => setShowSenateReportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Senate Report</span>
          </button>
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-4 rounded-xl bg-indigo-950/90 border border-indigo-500/60 text-indigo-100 text-xs flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-indigo-300 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Institutional Core KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Campus Enrollment</span>
          <span className="text-2xl font-black text-white font-mono">{totalStudents.toLocaleString()}</span>
          <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>+4.8% YoY Growth</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faculty & Staff</span>
          <span className="text-2xl font-black text-indigo-400 font-mono">{totalFaculty}</span>
          <div className="text-[10px] text-slate-400">14:1 Student-Faculty Ratio</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Annual Revenue</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">${(totalRevenue / 1000000).toFixed(2)}M</span>
          <div className="text-[10px] text-emerald-300 font-semibold">98.2% Collection Rate</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Research Portfolio</span>
          <span className="text-2xl font-black text-amber-400 font-mono">${(researchGrantFund / 1000000).toFixed(2)}M</span>
          <div className="text-[10px] text-amber-300 font-mono">34 Patents Active</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Endowment Fund</span>
          <span className="text-2xl font-black text-indigo-300 font-mono">${(endowmentFund / 1000000).toFixed(1)}M</span>
          <div className="text-[10px] text-indigo-400 font-semibold">+8.2% Capital Reserve</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Institutional Rating</span>
          <span className="text-2xl font-black text-amber-400 font-mono">A+ Class</span>
          <div className="text-[10px] text-emerald-400 font-semibold">100% Audit Verified</div>
        </div>

      </div>

      {/* Tab Navigation Controls */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center space-x-2 overflow-x-auto text-xs font-semibold no-scrollbar">
        {[
          { id: 'analytics', label: 'Strategic Analytics & Benchmarks', icon: BarChart3 },
          { id: 'governance', label: 'Decrees & Executive Sign-Offs', icon: ShieldCheck, count: executiveApprovals.length },
          { id: 'edicts', label: 'Presidential Edicts & Directives', icon: Megaphone, count: edicts.length },
          { id: 'initiatives', label: 'Capital Projects & Master Plan', icon: Rocket, count: initiatives.length },
          { id: 'cabinet', label: 'Council of Deans & Cabinet', icon: Users, count: cabinetMembers.length },
          { id: 'audit', label: 'Institutional Compliance & Audit', icon: FileCheck }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-indigo-800 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STRATEGIC ANALYTICS & BENCHMARKS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Area Chart: 5-Year Revenue & Research Growth */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="font-bold text-white text-base">5-Year Institutional Revenue & Research Funding ($ Millions)</h2>
                  <p className="text-[11px] text-slate-400">Operating tuition revenue vs research grant capitalization.</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                  +12.4% Compound Growth
                </span>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="researchGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="year" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Area type="monotone" name="Tuition Revenue ($M)" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#revenueGrad)" />
                    <Area type="monotone" name="Research Grants ($M)" dataKey="research" stroke="#10b981" fillOpacity={1} fill="url(#researchGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: School Enrollment & Satisfaction */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="font-bold text-white text-base">Academic School Distribution & Satisfaction Score</h2>
                  <p className="text-[11px] text-slate-400">Headcount vs student quality evaluation rating.</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                  Avg 92.1% Satisfaction
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar name="Students Enrolled" dataKey="students" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar name="Satisfaction Score (%)" dataKey="satisfaction" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Institutional Quality Scorecard & Key Metrics Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Institutional Accreditation & Quality Scorecard</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">First-Year Retention Rate</span>
                <div className="text-xl font-black text-emerald-400 font-mono">94.2%</div>
                <p className="text-[10px] text-slate-400">+1.8% above national university benchmark</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">4-Year Graduation Rate</span>
                <div className="text-xl font-black text-indigo-400 font-mono">88.5%</div>
                <p className="text-[10px] text-slate-400">92% cumulative degree completion</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Graduate Employment Rate</span>
                <div className="text-xl font-black text-amber-400 font-mono">96.1%</div>
                <p className="text-[10px] text-slate-400">Within 6 months of graduation</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Research Output Index</span>
                <div className="text-xl font-black text-emerald-300 font-mono">92 / 100</div>
                <p className="text-[10px] text-slate-400">Tier 1 Research Excellence Rating</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: GOVERNANCE, DECREES & EXECUTIVE APPROVALS */}
      {activeTab === 'governance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Executive Sign-Offs & Governance Decrees</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ratify major capital grants, tenure appointments, curriculum charters, and institutional policies with cryptographic seal.
              </p>
            </div>

            <button
              onClick={() => setShowProposalModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New Decree</span>
            </button>
          </div>

          <div className="space-y-3">
            {executiveApprovals.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-white text-sm">{item.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.priority === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {item.priority} Priority
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Originating Department: {item.dept}</p>
                  {item.signed ? (
                    <p className="text-emerald-400 text-[10px] flex items-center space-x-1 font-mono">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Ratified & Cryptographically Sealed on {item.signedDate} by {item.signerName}</span>
                    </p>
                  ) : (
                    <p className="text-amber-400 text-[10px] flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Awaiting Presidential Sign-Off & Official Governance Seal</span>
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {item.signed ? (
                    <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Approved & Sealed</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => approveExecutiveSignoff(item.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sign & Approve Decree</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 3: PRESIDENTIAL EDICTS & DIRECTIVES */}
      {activeTab === 'edicts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <span>Presidential Edicts & Campus Broadcast Directives</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official institutional decrees broadcast across university student portals, faculty dashboards, and administrative systems.
              </p>
            </div>

            <button
              onClick={() => setShowEdictModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center space-x-1.5 shrink-0"
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast New Edict</span>
            </button>
          </div>

          <div className="space-y-4">
            {edicts.map(edict => (
              <div key={edict.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 relative overflow-hidden">
                {edict.pinned && (
                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                    PINNED DIRECTIVE
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    edict.category === 'Emergency' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    edict.category === 'Policy' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                    'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {edict.category} Edict
                  </span>
                  <span className="text-slate-500 text-[10px] font-mono">Date: {edict.publishedDate}</span>
                  <span className="text-slate-400 text-[10px]">Target: <strong className="text-slate-200">{edict.targetAudience}</strong></span>
                </div>

                <h3 className="text-sm font-bold text-white">{edict.title}</h3>
                <p className="text-slate-300 leading-relaxed text-xs">{edict.content}</p>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Issued by: <strong className="text-indigo-300">{edict.author}</strong></span>
                  <button
                    onClick={() => {
                      setEdicts(prev => prev.filter(e => e.id !== edict.id));
                      logAudit('Presidential Edict Retracted', `Retracted edict ${edict.id}.`);
                      setActionNotice(`Edict '${edict.title}' retracted.`);
                      setTimeout(() => setActionNotice(null), 3000);
                    }}
                    className="text-rose-400 hover:text-rose-300 transition text-[10px] font-semibold"
                  >
                    Retract Edict
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 4: CAPITAL PROJECTS & MASTER PLAN */}
      {activeTab === 'initiatives' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Rocket className="w-5 h-5 text-emerald-400" />
                <span>Capital Projects & Strategic Campus Master Plan</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Major campus infrastructure projects, research facilities, and strategic development milestones.
              </p>
            </div>

            <button
              onClick={() => setShowInitiativeModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Launch Initiative</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initiatives.map(init => {
              const spentPct = Math.min(100, Math.round((init.spent / init.budget) * 100));

              return (
                <div key={init.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        init.status === 'Completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        init.status === 'Near Completion' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {init.status}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">Target: {init.targetDate}</span>
                    </div>

                    <h3 className="font-bold text-white text-sm">{init.title}</h3>
                    <p className="text-slate-400 text-xs">{init.description}</p>
                    <p className="text-[11px] text-indigo-300 font-medium">Lead: {init.leadDept}</p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Budget Progress:</span>
                      <span className="text-emerald-400 font-bold">${init.spent.toLocaleString()} / ${init.budget.toLocaleString()}</span>
                    </div>

                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${spentPct}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Milestone Completion: <strong className="text-white font-mono">{init.progressPct}%</strong></span>
                      <button
                        onClick={() => {
                          const next = Math.min(100, init.progressPct + 10);
                          setInitiatives(prev => prev.map(i => i.id === init.id ? { ...i, progressPct: next, spent: Math.round((next / 100) * i.budget) } : i));
                          setActionNotice(`Updated ${init.title} progress to ${next}%.`);
                          setTimeout(() => setActionNotice(null), 2500);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold"
                      >
                        + Advance Milestone
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 5: COUNCIL OF DEANS & EXECUTIVE CABINET DIRECTORY */}
      {activeTab === 'cabinet' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-5">
          
          <div className="border-b border-slate-800 pb-4">
            <h2 className="font-bold text-white text-base flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Council of Deans & Executive Cabinet Leadership</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Institutional leadership council overseeing academic schools, administrative divisions, and campus operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cabinetMembers.map(member => (
              <div key={member.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center space-x-3">
                  <img src={member.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40" />
                  <div>
                    <h3 className="font-bold text-white text-sm">{member.name}</h3>
                    <p className="text-[11px] text-indigo-300 font-medium">{member.role}</p>
                    <p className="text-[10px] text-slate-400">{member.department}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Executive KPI Rating</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{member.kpiScore} / 100</span>
                  </div>

                  <button
                    onClick={() => setShowMemoModal(member)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold transition flex items-center space-x-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Memo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 6: INSTITUTIONAL COMPLIANCE & AUDIT LOG STREAM */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-5">
          
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <span>Executive Governance & Institutional System Audit Stream</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time security log, registrar overrides, financial approvals, and governance ratifications.
              </p>
            </div>

            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold rounded-lg">
              SYSTEM INTEGRITY OK
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Audit Details</th>
                  <th className="p-3">Security Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.slice(0, 12).map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono text-slate-400 text-[10px]">
                      {log.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="p-3 font-bold text-indigo-300">{log.action}</td>
                    <td className="p-3 text-slate-200">{log.details}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        log.severity === 'Warning' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {log.severity || 'Info'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* MODAL 1: SUBMIT NEW EXECUTIVE PROPOSAL / DECREE */}
      {showProposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-xs text-slate-200 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>Submit Executive Governance Decree</span>
              </h3>
              <button onClick={() => setShowProposalModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProposalSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Decree Title & Scope</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Center for Quantum AI Infrastructure Grant"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Originating Department</label>
                  <select
                    value={propDept}
                    onChange={(e) => setPropDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Academic Affairs">Academic Affairs</option>
                    <option value="Facilities & Planning">Facilities & Planning</option>
                    <option value="School of Computing & Engineering">School of Computing</option>
                    <option value="School of Business">School of Business</option>
                    <option value="Finance & Operations">Finance & Operations</option>
                    <option value="Office of the Registrar">Office of the Registrar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Priority Level</label>
                  <select
                    value={propPriority}
                    onChange={(e) => setPropPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Estimated Budget Impact</label>
                <input
                  type="text"
                  value={propBudgetImpact}
                  onChange={(e) => setPropBudgetImpact(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowProposalModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg"
                >
                  Log Decree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BROADCAST PRESIDENTIAL EDICT */}
      {showEdictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-xs text-slate-200 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <span>Broadcast Presidential Edict</span>
              </h3>
              <button onClick={() => setShowEdictModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishEdictSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Edict Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandatory Cybersecurity Compliance Directive 2026"
                  value={edictTitle}
                  onChange={(e) => setEdictTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Edict Category</label>
                  <select
                    value={edictCategory}
                    onChange={(e) => setEdictCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Policy">Policy Directive</option>
                    <option value="Academic">Academic Charter</option>
                    <option value="Emergency">Emergency Protocol</option>
                    <option value="Budget">Budget Allocation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Target Audience</label>
                  <select
                    value={edictAudience}
                    onChange={(e) => setEdictAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="All Faculty, Students & Staff">All Campus Members</option>
                    <option value="Academic Senate & Deans">Academic Senate & Deans</option>
                    <option value="All Students">All Enrolled Students</option>
                    <option value="Faculty & Staff Only">Faculty & Staff Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Directive Content / Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed text of the presidential edict..."
                  value={edictContent}
                  onChange={(e) => setEdictContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEdictModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-lg"
                >
                  Broadcast Edict
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LAUNCH CAPITAL INITIATIVE */}
      {showInitiativeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-xs text-slate-200 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Rocket className="w-5 h-5 text-emerald-400" />
                <span>Launch Capital Master Project</span>
              </h3>
              <button onClick={() => setShowInitiativeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInitiativeSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robotics & Automation Learning Annex"
                  value={initTitle}
                  onChange={(e) => setInitTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Lead Department</label>
                  <input
                    type="text"
                    required
                    value={initDept}
                    onChange={(e) => setInitDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Total Budget ($)</label>
                  <input
                    type="number"
                    required
                    value={initBudget}
                    onChange={(e) => setInitBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Project Scope Summary</label>
                <textarea
                  rows={3}
                  value={initDesc}
                  onChange={(e) => setInitDesc(e.target.value)}
                  placeholder="Summary of construction, equipment acquisition, or program launch..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInitiativeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg"
                >
                  Add to Master Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EXECUTIVE MEMO DISPATCHER */}
      {showMemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-xs text-slate-200 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>Executive Memo to {showMemoModal.name}</span>
              </h3>
              <button onClick={() => setShowMemoModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMemoSubmit} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-3">
                <img src={showMemoModal.avatar} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-white">{showMemoModal.name}</p>
                  <p className="text-[10px] text-indigo-300">{showMemoModal.role}</p>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Memo Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Budget Alignment & Research Center Allocation"
                  value={memoSubject}
                  onChange={(e) => setMemoSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Memo Instructions</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write direct confidential directive..."
                  value={memoBody}
                  onChange={(e) => setMemoBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowMemoModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Confidential Memo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: OFFICIAL SENATE EXECUTIVE REPORT (PRINTABLE & CRYPTOGRAPHICALLY SEALED) */}
      {showSenateReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 text-slate-200 shadow-2xl relative space-y-6 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Official Academic Senate & Executive Report</h3>
                  <p className="text-xs text-slate-400">Canonical University Performance Charter for Board of Trustees</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrintSenateReport}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Export Document</span>
                </button>
                <button onClick={() => setShowSenateReportModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Printable Document Canvas */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl relative overflow-hidden space-y-6 border border-slate-300 font-serif print:border-none print:shadow-none print:p-0">
              
              <GuillochePattern />
              <SecurityWatermark text="BMI SENATE OFFICIAL" subtext="CANONICAL EXECUTIVE REPORT 2026" />
              <MicrotextBorder text="• BMI UNIVERSITY ACADEMIC SENATE EXECUTIVE REPORT 2026 • OFFICIAL CANONICAL GOVERNANCE CHARTER • VERIFIED " />

              {/* Document Header */}
              <div className="text-center space-y-2 pt-2 relative z-10 border-b border-slate-300 pb-4">
                <div className="flex justify-center">
                  <Building2 className="w-12 h-12 text-indigo-900" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">BMI UNIVERSITY EXECUTIVE SENATE</h2>
                <p className="text-xs font-sans text-slate-600 font-bold uppercase tracking-widest">Office of the President & Vice-Chancellor</p>
                <p className="text-[11px] font-mono text-slate-500">Document Reference: BMI-SENATE-EXEC-2026-Q3</p>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-4 font-sans text-xs relative z-10 border-b border-slate-200 pb-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Campus Enrollment</span>
                  <span className="text-lg font-bold text-indigo-950 font-mono">{totalStudents.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Annual Revenue</span>
                  <span className="text-lg font-bold text-emerald-800 font-mono">${(totalRevenue / 1000000).toFixed(2)}M</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Endowment Fund</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">${(endowmentFund / 1000000).toFixed(1)}M</span>
                </div>
              </div>

              {/* Active Governance Decrees */}
              <div className="space-y-3 font-sans relative z-10">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ratified Presidential Decrees & Charters</h4>
                <div className="space-y-2 text-xs">
                  {executiveApprovals.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="text-[10px] text-slate-600">Dept: {item.dept}</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                        {item.signed ? 'SEALED & RATIFIED' : 'PENDING'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptographic Seal Badge */}
              <div className="pt-4 relative z-10">
                <SecuritySealBadge
                  docType="Official Academic Senate & Executive Report"
                  docId="BMI-SENATE-EXEC-2026-Q3"
                  securityHash={senateReportHash || 'SEC-OFFICIAL-SENATE-REPORT-2026'}
                  issueDate={new Date().toISOString().slice(0, 10)}
                />
              </div>

              <MicrotextBorder text="• BMI UNIVERSITY ACADEMIC SENATE EXECUTIVE REPORT 2026 • OFFICIAL CANONICAL GOVERNANCE CHARTER • VERIFIED " />

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
