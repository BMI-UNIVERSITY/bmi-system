import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useApplications } from '../../hooks/api';
import { exportToCsv, triggerPrint } from '../../utils/exportUtils';
import { 
  FileCheck, 
  UserPlus, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  FileText,
  X,
  Check,
  XCircle,
  ShieldCheck,
  Printer,
  Search,
  Filter,
  Users,
  Award,
  Clock,
  ArrowUpDown,
  BookOpen,
  Send,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  GraduationCap,
  Download
} from 'lucide-react';
import { Application } from '../../types';
import { 
  SecurityWatermark, 
  GuillochePattern, 
  MicrotextBorder, 
  SecuritySealBadge 
} from '../common/DocumentSecurityComponents';

export const AdmissionsView: React.FC = () => {
  const { data: _applications } = useApplications();
  const applications = _applications || [];
  const { 
    convertApplicationToStudent, 
    runAutomatedApplicationPipeline,
    addApplication, 
    updateApplicationStatus, 
    updateApplicationDocumentStatus 
  } = useApp();

  // Selection & Modal States
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [offerModalApp, setOfferModalApp] = useState<Application | null>(null);
  const [conversionSuccessMsg, setConversionSuccessMsg] = useState<string | null>(null);

  // Reviewer Note Edit State in Modal
  const [reviewerNoteText, setReviewerNoteText] = useState('');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [programFilter, setProgramFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'gpa' | 'name'>('newest');

  // New Application Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApplicantName, setNewApplicantName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newProgram, setNewProgram] = useState('B.Sc. Computer Science');
  const [newCareer, setNewCareer] = useState<'UG' | 'PG' | 'DR'>('UG');
  const [newDepartment, setNewDepartment] = useState('School of Computing & Engineering');
  const [newGPA, setNewGPA] = useState<number>(3.85);
  const [newTestScore, setNewTestScore] = useState('SAT 1420');
  const [newNotes, setNewNotes] = useState('');

  // Open Document Review Modal and initialize reviewer notes
  const handleOpenReviewModal = (app: Application) => {
    setSelectedApp(app);
    setReviewerNoteText(app.reviewerNotes || '');
  };

  const handleRunPipeline = (appId: string) => {
    try {
      const res = runAutomatedApplicationPipeline(appId);
      setConversionSuccessMsg(
        `⚡ AUTOMATED ADMISSIONS PIPELINE EXECUTED! Student ${res.student.firstName} ${res.student.lastName} enrolled! Permanent UID: ${res.student.studentUid} | Reg No: ${res.student.registrationNumber} | Tuition Invoice Settled ($3,800) | Enrolled in ${res.autoEnrolledCoursesCount} core courses!`
      );
      setSelectedApp(null);
      setTimeout(() => setConversionSuccessMsg(null), 9000);
    } catch (e: any) {
      alert(e.message || 'Pipeline execution failed.');
    }
  };

  const handleConvert = (appId: string) => {
    try {
      const createdStudent = convertApplicationToStudent(appId);
      setConversionSuccessMsg(
        `SUCCESS! Applicant converted into SIS Record: ${createdStudent.firstName} ${createdStudent.lastName} (UID: ${createdStudent.studentUid} | Reg No: ${createdStudent.registrationNumber}). Student Portal account activated!`
      );
      setSelectedApp(null);
      setTimeout(() => setConversionSuccessMsg(null), 8000);
    } catch (e: any) {
      alert(e.message || 'Conversion failed.');
    }
  };

  const handleAddApplicant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApplicantName || !newEmail) return;

    addApplication({
      applicantName: newApplicantName,
      email: newEmail,
      phone: newPhone || '+1 (555) 012-3456',
      programApplied: newProgram,
      career: newCareer,
      department: newDepartment,
      highSchoolGPA: newGPA,
      testScore: newTestScore || 'SAT 1380',
      reviewerNotes: newNotes || 'Direct submission by Admissions Officer'
    });

    setShowAddModal(false);
    setNewApplicantName('');
    setNewEmail('');
    setNewPhone('');
    setNewNotes('');
    setConversionSuccessMsg(`New prospect application for "${newApplicantName}" created successfully!`);
    setTimeout(() => setConversionSuccessMsg(null), 5000);
  };

  const handleSaveReviewerNotes = () => {
    if (!selectedApp) return;
    updateApplicationStatus(selectedApp.id, selectedApp.status, reviewerNoteText);
    setSelectedApp({
      ...selectedApp,
      reviewerNotes: reviewerNoteText
    });
    setConversionSuccessMsg(`Updated reviewer notes for #${selectedApp.applicationNumber}`);
    setTimeout(() => setConversionSuccessMsg(null), 4000);
  };

  const handleApproveAllDocs = (app: Application) => {
    app.documents.forEach((_, idx) => {
      updateApplicationDocumentStatus(app.id, idx, 'Verified');
    });
    const updatedDocs = app.documents.map(d => ({ ...d, status: 'Verified' as const }));
    if (selectedApp && selectedApp.id === app.id) {
      setSelectedApp({ ...selectedApp, documents: updatedDocs });
    }
    updateApplicationStatus(app.id, 'Document Verified', app.reviewerNotes);
    setConversionSuccessMsg(`All verification documents approved for #${app.applicationNumber}`);
    setTimeout(() => setConversionSuccessMsg(null), 4000);
  };

  // Unique list of programs for filtering
  const availablePrograms = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => { if (a.programApplied) set.add(a.programApplied); });
    return Array.from(set);
  }, [applications]);

  // Filter & Sort Applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter(app => {
        const matchesSearch = 
          app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.programApplied.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (app.testScore && app.testScore.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStage = stageFilter === 'ALL' || app.status === stageFilter;
        const matchesProgram = programFilter === 'ALL' || app.programApplied === programFilter;

        return matchesSearch && matchesStage && matchesProgram;
      })
      .sort((a, b) => {
        if (sortBy === 'gpa') return (b.highSchoolGPA || 0) - (a.highSchoolGPA || 0);
        if (sortBy === 'name') return a.applicantName.localeCompare(b.applicantName);
        return b.id.localeCompare(a.id); // Default newest
      });
  }, [applications, searchTerm, stageFilter, programFilter, sortBy]);

  // Analytics & Metrics
  const metrics = useMemo(() => {
    const total = applications.length;
    const underReview = applications.filter(a => a.status === 'Under Review' || a.status === 'Submitted').length;
    const interviewOrVerified = applications.filter(a => (a.status as string) === 'Interview Scheduled' || a.status === 'Document Verified').length;
    const offersExtended = applications.filter(a => (a.status as string) === 'Offer Extended' || a.status === 'Offer Issued' || (a.status as string) === 'Accepted').length;
    const enrolled = applications.filter(a => a.status === 'Enrolled').length;
    const highGpaCount = applications.filter(a => (a.highSchoolGPA || 0) >= 3.8).length;
    const conversionRate = total > 0 ? Math.round((enrolled / total) * 100) : 0;

    return { total, underReview, interviewOrVerified, offersExtended, enrolled, highGpaCount, conversionRate };
  }, [applications]);

  // Helper for Status Badge styling
  const getStatusBadge = (status: Application['status'] | string) => {
    switch (status) {
      case 'Under Review':
      case 'Submitted':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Interview Scheduled':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'Document Verified':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'Offer Extended':
      case 'Offer Issued':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Accepted':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      case 'Enrolled':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Rejected':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const handleExportApplicationsCsv = () => {
    const headers = ['Application ID', 'Applicant Name', 'Email', 'Phone', 'Program Applied', 'HS GPA', 'SAT/ACT', 'Status', 'Submitted Date'];
    const rows = applications.map(a => [
      a.id,
      a.applicantName,
      a.email,
      a.phone,
      a.programApplied,
      a.highSchoolGPA ?? 'N/A',
      a.testScore || 'N/A',
      a.status,
      a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : 'N/A'
    ]);
    exportToCsv('BMI_University_Admissions_Applications.csv', headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Admissions & Enrollment Operations Center</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  LIVE CRM
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage candidate prospects, document verification, offer letters, and 1-click automated SIS enrollment.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleExportApplicationsCsv}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Roster CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Prospect Application</span>
          </button>
        </div>
      </div>

      {/* Global Success / Action Notification Banner */}
      {conversionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="font-semibold leading-relaxed">{conversionSuccessMsg}</span>
          </div>
          <button onClick={() => setConversionSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Analytics & Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Total Applicants</span>
            <Users className="w-4 h-4 text-slate-500" />
          </p>
          <p className="text-2xl font-bold text-white font-mono">{metrics.total}</p>
          <p className="text-[10px] text-slate-500">Active Pipeline</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-amber-400 flex items-center justify-between">
            <span>Under Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </p>
          <p className="text-2xl font-bold text-amber-300 font-mono">{metrics.underReview}</p>
          <p className="text-[10px] text-slate-500">Awaiting Decision</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-sky-400 flex items-center justify-between">
            <span>Verified / Interview</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </p>
          <p className="text-2xl font-bold text-sky-300 font-mono">{metrics.interviewOrVerified}</p>
          <p className="text-[10px] text-slate-500">Docs Approved</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-purple-400 flex items-center justify-between">
            <span>Offers Extended</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </p>
          <p className="text-2xl font-bold text-purple-300 font-mono">{metrics.offersExtended}</p>
          <p className="text-[10px] text-slate-500">Certificates Issued</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
            <span>Matriculated</span>
            <GraduationCap className="w-4 h-4 text-emerald-400" />
          </p>
          <p className="text-2xl font-bold text-emerald-300 font-mono">{metrics.enrolled}</p>
          <p className="text-[10px] text-emerald-500/80 font-bold">{metrics.conversionRate}% Conv. Rate</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-indigo-400 flex items-center justify-between">
            <span>High Potential</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </p>
          <p className="text-2xl font-bold text-indigo-300 font-mono">{metrics.highGpaCount}</p>
          <p className="text-[10px] text-slate-500">GPA 3.8+ / Honors</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-md">
        
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate name, email, app #, program, SAT score..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Program Filter & Sort Options */}
          <div className="flex flex-wrap items-center gap-2">
            
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none font-medium cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All Academic Programs</option>
                {availablePrograms.map(p => (
                  <option key={p} value={p} className="bg-slate-900">{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-200 focus:outline-none font-medium cursor-pointer"
              >
                <option value="newest" className="bg-slate-900">Newest Submissions</option>
                <option value="gpa" className="bg-slate-900">Highest GPA First</option>
                <option value="name" className="bg-slate-900">Applicant Name A-Z</option>
              </select>
            </div>

          </div>

        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs no-scrollbar border-t border-slate-800 pt-3">
          <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider shrink-0 mr-1">Stage:</span>
          {[
            { id: 'ALL', label: 'All Candidates' },
            { id: 'Under Review', label: 'Under Review' },
            { id: 'Interview Scheduled', label: 'Interview' },
            { id: 'Document Verified', label: 'Docs Verified' },
            { id: 'Offer Extended', label: 'Offer Extended' },
            { id: 'Accepted', label: 'Accepted' },
            { id: 'Enrolled', label: 'Matriculated' },
            { id: 'Rejected', label: 'Rejected' },
          ].map(stage => {
            const count = stage.id === 'ALL' 
              ? applications.length 
              : applications.filter(a => a.status === stage.id || (stage.id === 'Under Review' && a.status === 'Submitted')).length;
            
            const active = stageFilter === stage.id;

            return (
              <button
                key={stage.id}
                onClick={() => setStageFilter(stage.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 shrink-0 ${
                  active 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <span>{stage.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* CRM Application Pipeline Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
        
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-white text-sm flex items-center space-x-2">
            <span>Candidate Application Roster</span>
            <span className="text-xs text-slate-400 font-normal">
              (Showing {filteredApplications.length} of {applications.length} records)
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <th className="p-3.5">App Number</th>
                <th className="p-3.5">Applicant Candidate</th>
                <th className="p-3.5">Applied Program</th>
                <th className="p-3.5">Academic Standing</th>
                <th className="p-3.5">Documents</th>
                <th className="p-3.5">Pipeline Stage</th>
                <th className="p-3.5 text-right">Admissions Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No candidate applications match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map(app => {
                  const verifiedDocs = app.documents.filter(d => d.status === 'Verified').length;
                  const totalDocs = app.documents.length;
                  const isFullyVerified = totalDocs > 0 && verifiedDocs === totalDocs;

                  return (
                    <tr key={app.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* App Number */}
                      <td className="p-3.5 font-mono font-bold text-emerald-300 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span>{app.applicationNumber}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {app.career || 'UG'}
                          </span>
                        </div>
                      </td>

                      {/* Applicant Name & Contacts */}
                      <td className="p-3.5">
                        <div className="font-semibold text-white text-xs">{app.applicantName}</div>
                        <div className="text-[11px] text-slate-400">{app.email}</div>
                        {app.phone && <div className="text-[10px] text-slate-500 font-mono">{app.phone}</div>}
                      </td>

                      {/* Program & Dept */}
                      <td className="p-3.5">
                        <div className="text-slate-200 font-medium">{app.programApplied}</div>
                        <div className="text-[10px] text-slate-400">{app.department}</div>
                      </td>

                      {/* Academic Score (GPA & SAT) */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                            (app.highSchoolGPA || 0) >= 3.8 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : (app.highSchoolGPA || 0) >= 3.0 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            GPA: {app.highSchoolGPA ?? 'N/A'}
                          </span>
                          {app.testScore && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {app.testScore}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Documents Status */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isFullyVerified 
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            {verifiedDocs}/{totalDocs} Verified
                          </span>
                        </div>
                      </td>

                      {/* Pipeline Stage Select */}
                      <td className="p-3.5">
                        <select
                          value={app.status}
                          onChange={(e) => updateApplicationStatus(app.id, e.target.value as any, app.reviewerNotes)}
                          className={`border rounded-lg text-xs px-2.5 py-1 font-bold focus:outline-none cursor-pointer ${getStatusBadge(app.status)}`}
                        >
                          <option value="Under Review" className="bg-slate-900 text-amber-300">Under Review</option>
                          <option value="Interview Scheduled" className="bg-slate-900 text-sky-300">Interview Scheduled</option>
                          <option value="Document Verified" className="bg-slate-900 text-indigo-300">Document Verified</option>
                          <option value="Offer Extended" className="bg-slate-900 text-purple-300">Offer Extended</option>
                          <option value="Accepted" className="bg-slate-900 text-teal-300">Accepted</option>
                          <option value="Enrolled" className="bg-slate-900 text-emerald-300">Enrolled (SIS)</option>
                          <option value="Rejected" className="bg-slate-900 text-rose-300">Rejected</option>
                        </select>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          
                          <button
                            onClick={() => handleOpenReviewModal(app)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition flex items-center space-x-1"
                            title="Verify documents and reviewer notes"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Verify Docs</span>
                          </button>

                          <button
                            onClick={() => setOfferModalApp(app)}
                            className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 rounded-lg font-medium transition flex items-center space-x-1"
                            title="Generate and print official offer letter"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-400" />
                            <span>Offer Certificate</span>
                          </button>

                          {app.status !== 'Enrolled' ? (
                            <button
                              onClick={() => handleConvert(app.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center space-x-1 shadow-md"
                              title="Convert to canonical SIS Student Record"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>1-Click SIS</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-[10px] font-bold">
                              ✓ Enrolled
                            </span>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Verification & Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">Application Verification Station</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Reference ID: <span className="text-emerald-400 font-bold">{selectedApp.applicationNumber}</span>
                  </p>
                </div>
              </div>

              <button onClick={() => setSelectedApp(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Candidate Info Overview Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-semibold">Applicant Name</p>
                  <p className="font-bold text-white text-sm">{selectedApp.applicantName}</p>
                  <p className="text-slate-400">{selectedApp.email} • {selectedApp.phone}</p>
                </div>

                <div>
                  <p className="text-slate-500 font-semibold">Applied Program</p>
                  <p className="font-bold text-indigo-300">{selectedApp.programApplied}</p>
                  <p className="text-slate-400">{selectedApp.department}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-slate-500 font-semibold">Academic Score</p>
                  <p className="font-mono text-emerald-300 font-bold">High School GPA: {selectedApp.highSchoolGPA}</p>
                  <p className="text-slate-400 font-mono">{selectedApp.testScore || 'SAT 1380'}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-slate-500 font-semibold">Pipeline Status</p>
                  <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-md font-bold border ${getStatusBadge(selectedApp.status)}`}>
                    {selectedApp.status}
                  </span>
                </div>
              </div>

              {/* Uploaded Verification Documents Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Uploaded Documents Verification</span>
                  </h3>

                  <button
                    onClick={() => handleApproveAllDocs(selectedApp)}
                    className="px-3 py-1 bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-lg text-xs font-bold transition"
                  >
                    Approve All Documents
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedApp.documents.length === 0 ? (
                    <p className="text-slate-500 italic p-3 bg-slate-950 rounded-xl">No uploaded documents on file.</p>
                  ) : (
                    selectedApp.documents.map((doc, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white text-xs">{doc.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Verification Status:{' '}
                            <span className={`font-bold ${
                              doc.status === 'Verified' ? 'text-emerald-400' : doc.status === 'Rejected' ? 'text-rose-400' : 'text-amber-400'
                            }`}>
                              {doc.status}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              updateApplicationDocumentStatus(selectedApp.id, idx, 'Verified');
                              setSelectedApp({
                                ...selectedApp,
                                documents: selectedApp.documents.map((d, i) => i === idx ? { ...d, status: 'Verified' } : d)
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 text-[11px] font-bold transition ${
                              doc.status === 'Verified'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-slate-800 text-slate-300 hover:bg-emerald-900/60 hover:text-emerald-300'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => {
                              updateApplicationDocumentStatus(selectedApp.id, idx, 'Rejected');
                              setSelectedApp({
                                ...selectedApp,
                                documents: selectedApp.documents.map((d, i) => i === idx ? { ...d, status: 'Rejected' } : d)
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 text-[11px] font-bold transition ${
                              doc.status === 'Rejected'
                                ? 'bg-rose-600 text-white shadow-md'
                                : 'bg-slate-800 text-slate-300 hover:bg-rose-900/60 hover:text-rose-300'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reviewer Notes Editor */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold text-xs">Admissions Officer Evaluation Notes</label>
                <textarea
                  value={reviewerNoteText}
                  onChange={(e) => setReviewerNoteText(e.target.value)}
                  placeholder="Record evaluation comments, interview feedback, or academic conditions..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveReviewerNotes}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold rounded-lg text-xs transition"
                  >
                    Save Notes
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setOfferModalApp(selectedApp)}
                className="px-3.5 py-2 bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Preview Offer Certificate</span>
              </button>

              <div className="flex items-center space-x-2">
                {selectedApp.status !== 'Enrolled' && (
                  <>
                    <button
                      onClick={() => handleRunPipeline(selectedApp.id)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Run 100% Automated Pipeline</span>
                    </button>

                    <button
                      onClick={() => handleConvert(selectedApp.id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Manual Convert to SIS</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium"
                >
                  Close Station
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add New Prospect Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-white text-base">New Prospect Candidate Application</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddApplicant} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Applicant Full Name *</label>
                <input
                  type="text"
                  value={newApplicantName}
                  onChange={(e) => setNewApplicantName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. maya.lin@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 012-3456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Academic Career</label>
                  <select
                    value={newCareer}
                    onChange={(e) => setNewCareer(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="DR">Doctoral (DR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Program Applied</label>
                  <select
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="B.Sc. Computer Science">B.Sc. Computer Science</option>
                    <option value="B.Sc. Data Science & AI">B.Sc. Data Science & AI</option>
                    <option value="B.A. Business Administration">B.A. Business Administration</option>
                    <option value="M.Sc. Cybersecurity">M.Sc. Cybersecurity</option>
                    <option value="Ph.D. Computer Engineering">Ph.D. Computer Engineering</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">High School GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    value={newGPA}
                    onChange={(e) => setNewGPA(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Standardized Test Score</label>
                  <input
                    type="text"
                    value={newTestScore}
                    onChange={(e) => setNewTestScore(e.target.value)}
                    placeholder="e.g. SAT 1420 or GRE 325"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Initial Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional notes or background information..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 text-xs"
                >
                  Submit Prospect Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Secured Admission Offer Letter & Certificate Modal */}
      {offerModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Official University Admission Offer Certificate</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setOfferModalApp(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Offer Document Body */}
            <div className="printable-document p-8 overflow-y-auto space-y-6 text-xs bg-slate-50 relative border-4 border-indigo-900/10">
              
              {/* Security Background Overlay */}
              <GuillochePattern />
              <SecurityWatermark text="BMI OFFICIAL OFFER" subtext="CANONICAL ADMISSIONS RECORD" />
              <MicrotextBorder text="• BETHEL MINISTRIES INTERNATIONAL OFFICE OF ADMISSIONS • OFFICIAL PROVISIONAL OFFER SEC-2026 • DO NOT DUPLICATE " />

              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between relative z-10">
                <div>
                  <h1 className="text-xl font-black text-slate-900">BETHEL MINISTRIES INTERNATIONAL</h1>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">OFFICE OF ADMISSIONS</p>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <p className="font-bold text-indigo-900">OFFER ID: {offerModalApp.applicationNumber}</p>
                  <p className="text-slate-500">DATE: {offerModalApp.appliedDate || '2026-07-28'}</p>
                </div>
              </div>

              {/* Offer Body */}
              <div className="space-y-3 relative z-10 leading-relaxed text-slate-800">
                <p className="font-bold text-sm text-slate-900">Dear {offerModalApp.applicantName},</p>
                <p>
                  On behalf of the Admissions Board at <strong>Bethel Ministries International (BMI)</strong>, it is our great pleasure to offer you official admission to the <strong>{offerModalApp.programApplied}</strong> program for the upcoming academic session.
                </p>
                <p>
                  Your exceptional academic credentials (GPA: <span className="font-mono font-bold">{offerModalApp.highSchoolGPA}</span> {offerModalApp.testScore ? `| ${offerModalApp.testScore}` : ''}) and accomplishments demonstrate the high potential for excellence that we foster across our institution.
                </p>
              </div>

              {/* Offer Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/90 border border-slate-200 shadow-sm relative z-10 font-mono">
                <div>
                  <p><strong className="text-slate-700">Applicant:</strong> {offerModalApp.applicantName}</p>
                  <p><strong className="text-slate-700">Email:</strong> {offerModalApp.email}</p>
                </div>
                <div>
                  <p><strong className="text-slate-700">Program:</strong> {offerModalApp.programApplied}</p>
                  <p><strong className="text-slate-700">Status:</strong> <span className="font-bold text-emerald-700">{offerModalApp.status}</span></p>
                </div>
              </div>

              {/* Holographic Security Seal */}
              <div className="relative z-10">
                <SecuritySealBadge
                  docType="Official Offer Letter & Certificate"
                  docId={offerModalApp.applicationNumber}
                  securityHash={`ADM-HASH-${offerModalApp.applicationNumber}-${offerModalApp.applicantName}`}
                />
              </div>

              <MicrotextBorder text="• CANONICAL ADMISSIONS OFFER • IMMUTABLE SHA-256 REGISTRAR ATTESTATION " />

              {/* Signatures */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600 relative z-10">
                <div>
                  <p className="font-bold text-slate-900">Dr. Marcus Vance</p>
                  <p>Dean of Admissions, Bethel Ministries International</p>
                </div>
                <div className="p-2 border-2 border-indigo-900 rounded-xl text-center text-indigo-900 font-bold text-[9px] uppercase tracking-wider bg-indigo-50/80">
                  OFFICIAL ADMISSIONS SEAL<br />VERIFIED ATTESTATION
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
