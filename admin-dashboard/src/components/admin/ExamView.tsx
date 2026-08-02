import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useCourses, useStaff, useStudents } from '../../hooks/api';
import { 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  MapPin, 
  Search, 
  Filter, 
  Plus, 
  X, 
  AlertTriangle, 
  FileText, 
  Award, 
  Users, 
  Clock, 
  Printer, 
  Download, 
  Edit2, 
  Eye, 
  Check, 
  BarChart2, 
  Sparkles, 
  Building2, 
  Sliders, 
  UserCheck, 
  AlertCircle, 
  ChevronRight, 
  BookOpen, 
  FileCheck,
  Scale,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Course, StaffRecord, Student } from '../../types';

export const ExamView: React.FC = () => {
  const { data: _coursesList } = useCourses();
  const coursesList = _coursesList || [];
  const { data: _staffList } = useStaff();
  const staffList = _staffList || [];
  const { data: _studentList } = useStudents();
  const studentList = _studentList || [];
  const { logAudit } = useApp();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'timetable' | 'moderation' | 'appeals' | 'malpractice' | 'invigilators'>('timetable');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedVenue, setSelectedVenue] = useState('all');

  // Official Release Banner State
  const [officialResultsPublished, setOfficialResultsPublished] = useState(false);

  // --- STATE 1: EXAM SCHEDULE & SEATING MATRIX ---
  const [examSchedules, setExamSchedules] = useState<Array<{
    id: string;
    courseCode: string;
    courseTitle: string;
    department: string;
    examDate: string;
    timeSlot: string;
    venue: string;
    capacity: number;
    candidatesCount: number;
    chiefInvigilator: string;
    status: 'Scheduled' | 'In Progress' | 'Concluded' | 'Grades Submitted';
    paperCode: string;
  }>>([
    { id: 'exm-101', courseCode: 'CS101', courseTitle: 'Introduction to Computer Science & Python', department: 'School of Computing & Engineering', examDate: '2026-08-10', timeSlot: '09:00 AM - 12:00 PM', venue: 'Great Hall Auditorium A', capacity: 150, candidatesCount: 120, chiefInvigilator: 'Dr. Alan Vance', status: 'Scheduled', paperCode: 'CS101-F26-A' },
    { id: 'exm-102', courseCode: 'ENG201', courseTitle: 'Advanced Circuit Theory & Microcontrollers', department: 'School of Computing & Engineering', examDate: '2026-08-11', timeSlot: '01:30 PM - 04:30 PM', venue: 'Engineering Lab Complex 3', capacity: 80, candidatesCount: 65, chiefInvigilator: 'Prof. Helen Ross', status: 'Scheduled', paperCode: 'ENG201-F26-B' },
    { id: 'exm-103', courseCode: 'BUS301', courseTitle: 'Corporate Financial Strategy & Accounting', department: 'School of Business & Governance', examDate: '2026-08-12', timeSlot: '09:00 AM - 12:00 PM', venue: 'Business Hall Lecture Theatre', capacity: 200, candidatesCount: 180, chiefInvigilator: 'Marcus Sterling', status: 'Concluded', paperCode: 'BUS301-F26-A' },
    { id: 'exm-104', courseCode: 'LAW110', courseTitle: 'Constitutional Law & Jurisprudence', department: 'School of Law & Humanities', examDate: '2026-08-13', timeSlot: '09:00 AM - 12:00 PM', venue: 'Moot Court Auditorium', capacity: 100, candidatesCount: 92, chiefInvigilator: 'Dr. Alan Vance', status: 'Grades Submitted', paperCode: 'LAW110-F26-C' }
  ]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newExamData, setNewExamData] = useState({
    courseCode: coursesList[0]?.code || 'CS101',
    courseTitle: coursesList[0]?.title || 'Introduction to Computer Science',
    department: 'School of Computing & Engineering',
    examDate: '2026-08-15',
    timeSlot: '09:00 AM - 12:00 PM',
    venue: 'Great Hall Auditorium A',
    chiefInvigilator: staffList[0]?.name || 'Dr. Alan Vance'
  });

  // --- STATE 2: GRADE MODERATION & SENATE RATIFICATION ---
  const [gradeSheets, setGradeSheets] = useState<Array<{
    id: string;
    courseCode: string;
    courseTitle: string;
    lecturerName: string;
    department: string;
    totalStudents: number;
    passRate: number; // percentage
    classAverage: number; // percentage
    aGradeCount: number;
    bGradeCount: number;
    cGradeCount: number;
    fGradeCount: number;
    status: 'Pending Moderation' | 'Senate Approved' | 'Returned for Revision';
    submissionDate: string;
  }>>([
    { id: 'grd-201', courseCode: 'CS101', courseTitle: 'Intro to Computer Science', lecturerName: 'Dr. Alan Vance', department: 'School of Computing & Engineering', totalStudents: 45, passRate: 91.1, classAverage: 78.4, aGradeCount: 14, bGradeCount: 18, cGradeCount: 9, fGradeCount: 4, status: 'Pending Moderation', submissionDate: '2026-07-22' },
    { id: 'grd-202', courseCode: 'BUS301', courseTitle: 'Corporate Financial Strategy', lecturerName: 'Marcus Sterling', department: 'School of Business & Governance', totalStudents: 38, passRate: 86.8, classAverage: 72.1, aGradeCount: 8, bGradeCount: 16, cGradeCount: 9, fGradeCount: 5, status: 'Senate Approved', submissionDate: '2026-07-20' },
    { id: 'grd-203', courseCode: 'ENG201', courseTitle: 'Advanced Circuit Theory', lecturerName: 'Prof. Helen Ross', department: 'School of Computing & Engineering', totalStudents: 30, passRate: 93.3, classAverage: 81.5, aGradeCount: 11, bGradeCount: 12, cGradeCount: 5, fGradeCount: 2, status: 'Senate Approved', submissionDate: '2026-07-19' }
  ]);

  // --- STATE 3: GRADE APPEALS & RE-EVALUATION DESK ---
  const [gradeAppeals, setGradeAppeals] = useState<Array<{
    id: string;
    appealUid: string;
    studentName: string;
    studentNumber: string;
    courseCode: string;
    originalGrade: string;
    claimedGrade: string;
    reasonCategory: 'Summation Error' | 'Unmarked Script Question' | 'Biased Evaluation' | 'Medical Extenuating Grounds';
    reviewerName: string;
    status: 'Under Review' | 'Grade Adjusted' | 'Appeal Dismissed';
    submissionDate: string;
    details: string;
  }>>([
    { id: 'apl-301', appealUid: 'APL-2026-001', studentName: 'Alex Mercer', studentNumber: 'BMI/UG/101', courseCode: 'CS101', originalGrade: 'B-', claimedGrade: 'A-', reasonCategory: 'Summation Error', reviewerName: 'Prof. Helen Ross', status: 'Under Review', submissionDate: '2026-07-24', details: 'Question 4b (15 marks) was scored correctly on paper but excluded from final LMS sum.' },
    { id: 'apl-302', appealUid: 'APL-2026-002', studentName: 'Sophia Chen', studentNumber: 'BMI/UG/102', courseCode: 'BUS301', originalGrade: 'C+', claimedGrade: 'B+', reasonCategory: 'Unmarked Script Question', reviewerName: 'Dr. Alan Vance', status: 'Grade Adjusted', submissionDate: '2026-07-21', details: 'Section C essay sheet was misplaced during initial scan and subsequently re-verified.' },
    { id: 'apl-303', appealUid: 'APL-2026-003', studentName: 'Michael Brown', studentNumber: 'BMI/UG/103', courseCode: 'LAW110', originalGrade: 'F', claimedGrade: 'C', reasonCategory: 'Medical Extenuating Grounds', reviewerName: 'Academic Disciplinary Board', status: 'Appeal Dismissed', submissionDate: '2026-07-18', details: 'Medical note submitted 14 days after official exam deadline without prior deferral request.' }
  ]);

  const [showNewAppealModal, setShowNewAppealModal] = useState(false);
  const [newAppealData, setNewAppealData] = useState({
    studentNumber: studentList[0]?.studentNumber || 'BMI/UG/101',
    courseCode: 'CS101',
    originalGrade: 'B',
    claimedGrade: 'A',
    reasonCategory: 'Summation Error' as const,
    details: ''
  });

  // --- STATE 4: EXAM MISCONDUCT & MALPRACTICE DESK ---
  const [malpracticeIncidents, setMalpracticeIncidents] = useState<Array<{
    id: string;
    incidentNumber: string;
    studentName: string;
    studentNumber: string;
    courseCode: string;
    venue: string;
    offenseType: 'Unauthorized Notes / Cheat Sheet' | 'Mobile Device Violation' | 'Impersonation' | 'Whispering / Communication';
    invigilatorName: string;
    evidenceSeized: string;
    status: 'Pending Hearing' | 'Sanction Upheld (Course Failed)' | 'Exonerated / Case Closed';
    dateReported: string;
  }>>([
    { id: 'mal-401', incidentNumber: 'MAL-2026-08', studentName: 'Jordan Taylor', studentNumber: 'BMI/UG/104', courseCode: 'BUS301', venue: 'Business Hall Lecture Theatre', offenseType: 'Mobile Device Violation', invigilatorName: 'Marcus Sterling', evidenceSeized: 'Smartwatch storing PDF formulas retrieved under desk.', status: 'Pending Hearing', dateReported: '2026-07-22' },
    { id: 'mal-402', incidentNumber: 'MAL-2026-05', studentName: 'David Miller', studentNumber: 'BMI/UG/105', courseCode: 'ENG201', venue: 'Engineering Lab Complex 3', offenseType: 'Unauthorized Notes / Cheat Sheet', invigilatorName: 'Prof. Helen Ross', evidenceSeized: 'Handwritten circuit diagram cards inside formula booklet.', status: 'Sanction Upheld (Course Failed)', dateReported: '2026-07-15' }
  ]);

  const [showMalpracticeModal, setShowMalpracticeModal] = useState(false);
  const [newMalpracticeData, setNewMalpracticeData] = useState({
    studentNumber: studentList[0]?.studentNumber || 'BMI/UG/101',
    courseCode: 'CS101',
    venue: 'Great Hall Auditorium A',
    offenseType: 'Unauthorized Notes / Cheat Sheet' as const,
    evidenceSeized: '',
    invigilatorName: staffList[0]?.name || 'Dr. Alan Vance'
  });

  // --- STATE 5: INVIGILATOR DUTY ROSTER ---
  const [invigilatorRoster, setInvigilatorRoster] = useState<Array<{
    id: string;
    staffName: string;
    staffNumber: string;
    assignedVenue: string;
    examDate: string;
    shiftTime: string;
    checkInStatus: 'Checked In' | 'Pending' | 'Substitute Assigned';
    roleTitle: 'Chief Invigilator' | 'Assistant Proctor' | 'Hall Floor Supervisor';
  }>>([
    { id: 'inv-501', staffName: 'Dr. Alan Vance', staffNumber: 'STAFF-102', assignedVenue: 'Great Hall Auditorium A', examDate: '2026-08-10', shiftTime: '08:30 AM - 12:30 PM', checkInStatus: 'Checked In', roleTitle: 'Chief Invigilator' },
    { id: 'inv-502', staffName: 'Prof. Helen Ross', staffNumber: 'STAFF-105', assignedVenue: 'Engineering Lab Complex 3', examDate: '2026-08-11', shiftTime: '01:00 PM - 05:00 PM', checkInStatus: 'Pending', roleTitle: 'Chief Invigilator' },
    { id: 'inv-503', staffName: 'Sarah Jenkins', staffNumber: 'STAFF-109', assignedVenue: 'Great Hall Auditorium A', examDate: '2026-08-10', shiftTime: '08:30 AM - 12:30 PM', checkInStatus: 'Checked In', roleTitle: 'Assistant Proctor' }
  ]);

  // Handler: Schedule New Exam
  const handleScheduleExam = (e: React.FormEvent) => {
    e.preventDefault();
    const newExam = {
      id: `exm-${Date.now()}`,
      courseCode: newExamData.courseCode,
      courseTitle: newExamData.courseTitle,
      department: newExamData.department,
      examDate: newExamData.examDate,
      timeSlot: newExamData.timeSlot,
      venue: newExamData.venue,
      capacity: 150,
      candidatesCount: 85,
      chiefInvigilator: newExamData.chiefInvigilator,
      status: 'Scheduled' as const,
      paperCode: `${newExamData.courseCode}-F26-X`
    };

    setExamSchedules([newExam, ...examSchedules]);
    setShowScheduleModal(false);
    logAudit('Exam Scheduled', `Scheduled exam for ${newExam.courseCode} on ${newExam.examDate} at ${newExam.venue}.`);
  };

  // Handler: Senate Ratification
  const handleRatifyGradeSheet = (sheetId: string, status: 'Senate Approved' | 'Returned for Revision') => {
    setGradeSheets(prev => prev.map(g => g.id === sheetId ? { ...g, status } : g));
    logAudit('Grade Moderation Ratified', `Exam Office updated grade sheet ${sheetId} to '${status}'.`);
  };

  // Handler: Grade Appeal Resolution
  const handleAppealDecision = (appealId: string, decision: 'Grade Adjusted' | 'Appeal Dismissed') => {
    setGradeAppeals(prev => prev.map(a => a.id === appealId ? { ...a, status: decision } : a));
    logAudit('Grade Appeal Decision', `Exam Office resolved appeal ${appealId} as '${decision}'.`);
  };

  // Handler: Log Malpractice
  const handleLogMalpractice = (e: React.FormEvent) => {
    e.preventDefault();
    const stf = studentList.find(s => s.studentNumber === newMalpracticeData.studentNumber) || studentList[0];
    const newInc = {
      id: `mal-${Date.now()}`,
      incidentNumber: `MAL-2026-${Math.floor(10 + Math.random() * 90)}`,
      studentName: stf ? `${stf.firstName} ${stf.lastName}` : 'Unknown Student',
      studentNumber: newMalpracticeData.studentNumber,
      courseCode: newMalpracticeData.courseCode,
      venue: newMalpracticeData.venue,
      offenseType: newMalpracticeData.offenseType,
      invigilatorName: newMalpracticeData.invigilatorName,
      evidenceSeized: newMalpracticeData.evidenceSeized || 'Confiscated contraband during exam session.',
      status: 'Pending Hearing' as const,
      dateReported: new Date().toISOString().split('T')[0]
    };

    setMalpracticeIncidents([newInc, ...malpracticeIncidents]);
    setShowMalpracticeModal(false);
    logAudit('Exam Malpractice Logged', `Logged exam misconduct report ${newInc.incidentNumber} for student ${newInc.studentNumber}.`);
  };

  // Handler: Release Official Results
  const handlePublishResults = () => {
    setOfficialResultsPublished(true);
    logAudit('Official Exam Results Published', 'Exam Office published Fall 2026 Senate-approved examination results to all Student Portals.');
    alert('Official examination results published! Grade notifications dispatched to student portals.');
  };

  // Unique Venues
  const venuesList = Array.from(new Set(examSchedules.map(e => e.venue)));

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 text-slate-100">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
              Division of Academic Governance & Senate Affairs
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
              Central Examination Office
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2 flex items-center space-x-3">
            <Calendar className="w-7 h-7 text-indigo-400" />
            <span>Examination Operations, Seating & Grade Verification</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Examination timetable coordination, invigilator duty rosters, grade sheet moderation, student re-marking appeal desk, and official Senate transcripts publishing.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Exam Session</span>
          </button>

          <button
            onClick={() => setShowMalpracticeModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs border border-rose-500/30 transition flex items-center space-x-2"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Report Malpractice</span>
          </button>

          <button
            onClick={handlePublishResults}
            disabled={officialResultsPublished}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center space-x-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{officialResultsPublished ? 'Results Published' : 'Publish Semester Results'}</span>
          </button>
        </div>
      </div>

      {/* Official Results Published Notification */}
      {officialResultsPublished && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between space-x-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white font-bold">Fall 2026 Examination Results Officially Published!</strong>
              <p className="text-emerald-300/80 text-[11px]">Senate-ratified grades and GPA metrics are now live on all student portals and official transcript portals.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[10px]">
            SENATE RATIFIED
          </span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Exam Sessions</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Fall 2026</span>
          </div>
          <div className="text-2xl font-black text-white">{examSchedules.length}</div>
          <p className="text-[10px] text-slate-400">Scheduled course exams.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Exam Venues</span>
            </span>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Capacity</span>
          </div>
          <div className="text-2xl font-black text-cyan-300">{venuesList.length} <span className="text-xs text-slate-400 font-normal">Halls</span></div>
          <p className="text-[10px] text-slate-400">Active seating auditoriums.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <BarChart2 className="w-4 h-4 text-amber-400" />
              <span>Pending Moderation</span>
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Senate</span>
          </div>
          <div className="text-2xl font-black text-amber-300">{gradeSheets.filter(g => g.status === 'Pending Moderation').length}</div>
          <p className="text-[10px] text-slate-400">Awaiting grade ratification.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Scale className="w-4 h-4 text-purple-400" />
              <span>Grade Appeals</span>
            </span>
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Grievances</span>
          </div>
          <div className="text-2xl font-black text-purple-300">{gradeAppeals.filter(a => a.status === 'Under Review').length}</div>
          <p className="text-[10px] text-slate-400">Active student re-mark cases.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Malpractice Reports</span>
            </span>
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Hearings</span>
          </div>
          <div className="text-2xl font-black text-rose-300">{malpracticeIncidents.length}</div>
          <p className="text-[10px] text-slate-400">Incidents under review.</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'timetable' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Exam Timetable & Seating Matrix ({examSchedules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'moderation' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Grade Sheet Senate Moderation ({gradeSheets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appeals')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'appeals' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Grade Appeals & Re-Marking Desk ({gradeAppeals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('malpractice')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'malpractice' 
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Exam Misconduct & Malpractice ({malpracticeIncidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invigilators')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'invigilators' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Invigilator & Proctor Roster ({invigilatorRoster.length})</span>
        </button>
      </div>

      {/* --- TAB 1: EXAM TIMETABLE & SEATING MATRIX --- */}
      {activeTab === 'timetable' && (
        <div className="space-y-4 text-xs">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search course, code, invigilator..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedVenue}
                onChange={e => setSelectedVenue(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Exam Auditoriums</option>
                {venuesList.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Session</span>
              </button>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examSchedules
              .filter(ex => {
                const matchesSearch = !searchQuery || 
                  ex.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ex.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ex.chiefInvigilator.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesVenue = selectedVenue === 'all' || ex.venue === selectedVenue;
                return matchesSearch && matchesVenue;
              })
              .map(ex => (
                <div key={ex.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[11px] border border-indigo-500/30">
                        {ex.courseCode}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        ex.status === 'Concluded' || ex.status === 'Grades Submitted'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {ex.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base">{ex.courseTitle}</h3>
                    <p className="text-slate-400 text-xs">{ex.department}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Date & Time:</span>
                      </span>
                      <strong className="text-white font-mono">{ex.examDate} ({ex.timeSlot})</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Auditorium:</span>
                      </span>
                      <strong className="text-cyan-300">{ex.venue}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Candidates / Capacity:</span>
                      </span>
                      <strong className="text-amber-300 font-mono">{ex.candidatesCount} / {ex.capacity} Seats</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-700/50">
                      <span className="flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Chief Invigilator:</span>
                      </span>
                      <span className="text-emerald-300 font-semibold">{ex.chiefInvigilator}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="font-mono text-slate-500">Paper ID: {ex.paperCode}</span>
                    <button
                      onClick={() => alert(`Printing official candidate seating matrix for ${ex.courseCode} (${ex.venue})...`)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold rounded-lg border border-slate-700 transition flex items-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Seating Matrix</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* --- TAB 2: GRADE MODERATION & SENATE RATIFICATION --- */}
      {activeTab === 'moderation' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-amber-400" />
                <span>Course Grade Sheet Senate Moderation & Verification</span>
              </h3>
              <p className="text-slate-400 text-xs">Verify lecturer grade submissions, grade distribution standard deviations, and ratify official result sheets before public release.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3">Course Code & Title</th>
                    <th className="p-3">Instructor / Lecturer</th>
                    <th className="p-3">Class Size</th>
                    <th className="p-3">Pass Rate</th>
                    <th className="p-3">Class Average</th>
                    <th className="p-3">Grade Distribution (A / B / C / F)</th>
                    <th className="p-3">Senate Status</th>
                    <th className="p-3 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {gradeSheets.map(grd => (
                    <tr key={grd.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <div className="font-bold text-white text-sm">{grd.courseTitle}</div>
                        <span className="font-mono text-indigo-300 text-[10px]">{grd.courseCode} • {grd.department}</span>
                      </td>
                      <td className="p-3 text-slate-300 font-semibold">{grd.lecturerName}</td>
                      <td className="p-3 font-mono font-bold text-slate-200">{grd.totalStudents} Students</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{grd.passRate}%</td>
                      <td className="p-3 font-mono font-bold text-cyan-300">{grd.classAverage}%</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">A: {grd.aGradeCount}</span>
                          <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">B: {grd.bGradeCount}</span>
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">C: {grd.cGradeCount}</span>
                          <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded">F: {grd.fGradeCount}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          grd.status === 'Senate Approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : grd.status === 'Returned for Revision'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {grd.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        {grd.status === 'Pending Moderation' && (
                          <>
                            <button
                              onClick={() => handleRatifyGradeSheet(grd.id, 'Senate Approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-[10px]"
                            >
                              Ratify & Approve
                            </button>
                            <button
                              onClick={() => handleRatifyGradeSheet(grd.id, 'Returned for Revision')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition text-[10px]"
                            >
                              Return
                            </button>
                          </>
                        )}
                        {grd.status === 'Senate Approved' && (
                          <span className="text-emerald-400 font-bold text-[10px] flex items-center justify-end space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Signed Off</span>
                          </span>
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

      {/* --- TAB 3: GRADE APPEALS & RE-EVALUATION DESK --- */}
      {activeTab === 'appeals' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-purple-400" />
                  <span>Student Grade Appeals & Script Re-Marking Grievance Desk</span>
                </h3>
                <p className="text-slate-400 text-xs">Manage formal student grade appeal submissions, assign independent academic reviewers, and issue grade adjustments.</p>
              </div>

              <button
                onClick={() => setShowNewAppealModal(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>File Grade Appeal</span>
              </button>
            </div>

            <div className="space-y-3">
              {gradeAppeals.map(apl => (
                <div key={apl.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-sm">{apl.studentName}</h4>
                        <span className="text-slate-400 font-mono text-[11px]">({apl.studentNumber})</span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] border border-purple-500/30">
                          {apl.courseCode}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          apl.status === 'Grade Adjusted'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : apl.status === 'Appeal Dismissed'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {apl.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Category: <strong className="text-slate-200">{apl.reasonCategory}</strong> • Assigned Reviewer: <strong className="text-indigo-300">{apl.reviewerName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-slate-400 text-[10px]">Grade Shift: </span>
                        <span className="text-rose-400 font-bold">{apl.originalGrade}</span> → <span className="text-emerald-400 font-bold">{apl.claimedGrade}</span>
                      </div>

                      {apl.status === 'Under Review' && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleAppealDecision(apl.id, 'Grade Adjusted')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-[10px]"
                          >
                            Adjust Grade
                          </button>
                          <button
                            onClick={() => handleAppealDecision(apl.id, 'Appeal Dismissed')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition text-[10px]"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="p-3 rounded-xl bg-slate-900/80 text-slate-300 text-xs italic">
                    "{apl.details}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: EXAM MISCONDUCT & MALPRACTICE DESK --- */}
      {activeTab === 'malpractice' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>Exam Misconduct, Cheating & Disciplinary Hearing Desk</span>
                </h3>
                <p className="text-slate-400 text-xs">Official malpractice logs filed by chief invigilators, evidence inventory, and Senate disciplinary hearing rulings.</p>
              </div>

              <button
                onClick={() => setShowMalpracticeModal(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Log Incident Report</span>
              </button>
            </div>

            <div className="space-y-3">
              {malpracticeIncidents.map(inc => (
                <div key={inc.id} className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-rose-400 text-xs">{inc.incidentNumber}</span>
                        <h4 className="font-bold text-white text-sm">{inc.studentName}</h4>
                        <span className="text-slate-400 font-mono text-[11px]">({inc.studentNumber})</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px] border border-rose-500/30">
                          {inc.courseCode}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Offense: <strong className="text-rose-300">{inc.offenseType}</strong> • Venue: <strong className="text-slate-200">{inc.venue}</strong> • Reporting Proctor: <strong className="text-indigo-300">{inc.invigilatorName}</strong>
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold border shrink-0 ${
                      inc.status === 'Sanction Upheld (Course Failed)'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : inc.status === 'Exonerated / Case Closed'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {inc.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 text-slate-300 text-xs">
                    <strong className="text-slate-400 uppercase text-[10px]">Evidence Confiscated: </strong>
                    <span>{inc.evidenceSeized}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: INVIGILATOR DUTY ROSTER --- */}
      {activeTab === 'invigilators' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <span>Invigilator & Chief Proctor Duty Roster</span>
              </h3>
              <p className="text-slate-400 text-xs">Faculty invigilator venue assignments, shift attendance check-ins, and proctor duty coverage.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3">Faculty / Invigilator</th>
                    <th className="p-3">Assigned Role</th>
                    <th className="p-3">Exam Venue</th>
                    <th className="p-3">Date & Shift Time</th>
                    <th className="p-3">Check-In Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invigilatorRoster.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <strong className="text-white text-sm">{inv.staffName}</strong>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.staffNumber}</div>
                      </td>
                      <td className="p-3 text-cyan-300 font-semibold">{inv.roleTitle}</td>
                      <td className="p-3 text-slate-300 font-medium">{inv.assignedVenue}</td>
                      <td className="p-3 font-mono text-indigo-300">{inv.examDate} ({inv.shiftTime})</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          inv.checkInStatus === 'Checked In'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {inv.checkInStatus}
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

      {/* --- MODAL 1: SCHEDULE EXAM SESSION --- */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span>Schedule New Examination Session</span>
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleExam} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newExamData.courseCode}
                    onChange={e => setNewExamData({ ...newExamData, courseCode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={newExamData.examDate}
                    onChange={e => setNewExamData({ ...newExamData, examDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={newExamData.courseTitle}
                  onChange={e => setNewExamData({ ...newExamData, courseTitle: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Time Slot</label>
                  <select
                    value={newExamData.timeSlot}
                    onChange={e => setNewExamData({ ...newExamData, timeSlot: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM (Morning)</option>
                    <option value="01:30 PM - 04:30 PM">01:30 PM - 04:30 PM (Afternoon)</option>
                    <option value="05:30 PM - 08:30 PM">05:30 PM - 08:30 PM (Evening)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Exam Venue</label>
                  <select
                    value={newExamData.venue}
                    onChange={e => setNewExamData({ ...newExamData, venue: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Great Hall Auditorium A">Great Hall Auditorium A</option>
                    <option value="Engineering Lab Complex 3">Engineering Lab Complex 3</option>
                    <option value="Business Hall Lecture Theatre">Business Hall Lecture Theatre</option>
                    <option value="Moot Court Auditorium">Moot Court Auditorium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Chief Invigilator</label>
                <select
                  value={newExamData.chiefInvigilator}
                  onChange={e => setNewExamData({ ...newExamData, chiefInvigilator: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {staffList.map(stf => (
                    <option key={stf.id} value={stf.name}>{stf.name} ({stf.title})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Schedule Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: FILE GRADE APPEAL --- */}
      {showNewAppealModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Scale className="w-5 h-5 text-purple-400" />
                <span>Submit Student Grade Appeal</span>
              </h3>
              <button onClick={() => setShowNewAppealModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const stf = studentList.find(s => s.studentNumber === newAppealData.studentNumber) || studentList[0];
              const newApl = {
                id: `apl-${Date.now()}`,
                appealUid: `APL-2026-${Math.floor(100 + Math.random() * 900)}`,
                studentName: stf ? `${stf.firstName} ${stf.lastName}` : 'Alex Mercer',
                studentNumber: newAppealData.studentNumber,
                courseCode: newAppealData.courseCode,
                originalGrade: newAppealData.originalGrade,
                claimedGrade: newAppealData.claimedGrade,
                reasonCategory: newAppealData.reasonCategory,
                reviewerName: 'Academic Disciplinary Board',
                status: 'Under Review' as const,
                submissionDate: new Date().toISOString().split('T')[0],
                details: newAppealData.details || 'Formal student petition submitted.'
              };
              setGradeAppeals([newApl, ...gradeAppeals]);
              setShowNewAppealModal(false);
              logAudit('Grade Appeal Filed', `Filed appeal ${newApl.appealUid} for ${newApl.studentNumber}.`);
            }} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Student Number</label>
                  <select
                    value={newAppealData.studentNumber}
                    onChange={e => setNewAppealData({ ...newAppealData, studentNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {studentList.map(s => (
                      <option key={s.id} value={s.studentNumber}>{s.firstName} {s.lastName} ({s.studentNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newAppealData.courseCode}
                    onChange={e => setNewAppealData({ ...newAppealData, courseCode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Original Grade</label>
                  <input
                    type="text"
                    required
                    value={newAppealData.originalGrade}
                    onChange={e => setNewAppealData({ ...newAppealData, originalGrade: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Claimed Grade</label>
                  <input
                    type="text"
                    required
                    value={newAppealData.claimedGrade}
                    onChange={e => setNewAppealData({ ...newAppealData, claimedGrade: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Grounds for Appeal</label>
                <select
                  value={newAppealData.reasonCategory}
                  onChange={e => setNewAppealData({ ...newAppealData, reasonCategory: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Summation Error">Summation / Calculation Error</option>
                  <option value="Unmarked Script Question">Unmarked Script Question</option>
                  <option value="Biased Evaluation">Biased Evaluation Claim</option>
                  <option value="Medical Extenuating Grounds">Medical / Extenuating Circumstance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Appeal Justification / Remarks</label>
                <textarea
                  rows={3}
                  value={newAppealData.details}
                  onChange={e => setNewAppealData({ ...newAppealData, details: e.target.value })}
                  placeholder="Describe specific grounds, question numbers, or errors..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewAppealModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg"
                >
                  File Appeal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: LOG MALPRACTICE INCIDENT --- */}
      {showMalpracticeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Log Exam Malpractice Incident Report</span>
              </h3>
              <button onClick={() => setShowMalpracticeModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogMalpractice} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Student Number</label>
                  <select
                    value={newMalpracticeData.studentNumber}
                    onChange={e => setNewMalpracticeData({ ...newMalpracticeData, studentNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {studentList.map(s => (
                      <option key={s.id} value={s.studentNumber}>{s.firstName} {s.lastName} ({s.studentNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newMalpracticeData.courseCode}
                    onChange={e => setNewMalpracticeData({ ...newMalpracticeData, courseCode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Exam Venue</label>
                  <select
                    value={newMalpracticeData.venue}
                    onChange={e => setNewMalpracticeData({ ...newMalpracticeData, venue: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Great Hall Auditorium A">Great Hall Auditorium A</option>
                    <option value="Engineering Lab Complex 3">Engineering Lab Complex 3</option>
                    <option value="Business Hall Lecture Theatre">Business Hall Lecture Theatre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Offense Category</label>
                  <select
                    value={newMalpracticeData.offenseType}
                    onChange={e => setNewMalpracticeData({ ...newMalpracticeData, offenseType: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Unauthorized Notes / Cheat Sheet">Unauthorized Cheat Sheet</option>
                    <option value="Mobile Device Violation">Mobile / Smartwatch Device</option>
                    <option value="Impersonation">Candidate Impersonation</option>
                    <option value="Whispering / Communication">Unauthorized Communication</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Evidence Confiscated & Incident Details</label>
                <textarea
                  rows={3}
                  required
                  value={newMalpracticeData.evidenceSeized}
                  onChange={e => setNewMalpracticeData({ ...newMalpracticeData, evidenceSeized: e.target.value })}
                  placeholder="Describe seized contraband, location retrieved, or invigilator observation..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMalpracticeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Submit Misconduct Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
