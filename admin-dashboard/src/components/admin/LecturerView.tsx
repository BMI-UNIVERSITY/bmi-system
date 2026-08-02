import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useCourses, useStudents } from '../../hooks/api';
import { exportToCsv, exportToText, triggerPrint } from '../../utils/exportUtils';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Edit3, 
  Award,
  Save,
  Megaphone,
  FileText,
  Send,
  Download,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Printer,
  Paperclip,
  Check,
  Eye,
  UserCheck,
  MessageSquare,
  FolderPlus,
  UploadCloud,
  Sparkles,
  X,
  ChevronRight,
  BarChart3,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';
import { Course, Student } from '../../types';
import { 
  SecurityWatermark, 
  GuillochePattern, 
  MicrotextBorder, 
  SecuritySealBadge 
} from '../common/DocumentSecurityComponents';

interface AssignmentItem {
  id: string;
  courseId: string;
  title: string;
  dueDate: string;
  totalPoints: number;
  weightagePercentage: number;
  submittedCount: number;
}

interface CourseMaterial {
  id: string;
  courseId: string;
  title: string;
  fileType: string;
  uploadDate: string;
  fileSize: string;
}

interface ConsultationSlot {
  id: string;
  studentName: string;
  studentNumber: string;
  date: string;
  timeSlot: string;
  topic: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
}

export const LecturerView: React.FC = () => {
  const { data: _courses } = useCourses();
  const courses = _courses || [];
  const { data: _students } = useStudents();
  const students = _students || [];
  const { enrollments, updateStudentGrade, recordAttendance, logAudit } = useApp();

  // Active Selected Course State
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || 'crs-301');
  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0] || {
    id: 'crs-301',
    code: 'CS301',
    title: 'Data Structures & Algorithms',
    department: 'School of Computing & Engineering',
    credits: 4,
    instructor: 'Dr. Alan Turing',
    schedule: 'Mon / Wed 10:00 AM - 11:30 AM',
    room: 'Lab 304',
    capacity: 40,
    enrolledCount: 32
  };

  const courseEnrollments = enrollments.filter(e => e.courseId === activeCourse?.id);

  // View Mode Tabs
  const [activeTab, setActiveTab] = useState<'roster' | 'gradebook' | 'materials' | 'announcements' | 'consultations'>('roster');

  // Search & Filters inside Roster/Gradebook
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'CRITICAL' | 'GOOD'>('ALL');

  // Local Attendance Tracking State override
  const [attendanceLog, setAttendanceLog] = useState<Record<string, Record<string, 'Present' | 'Late' | 'Absent'>>>({
    'crs-301': {}
  });

  // Announcements State
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'Normal' | 'Exam Notice' | 'Urgent'>('Normal');
  const [announcements, setAnnouncements] = useState<Record<string, Array<{ id: string; text: string; date: string; priority: string }>>>({
    'crs-301': [
      { id: 'ann-1', text: 'Midterm Examination will cover Weeks 1-4 topics. Bring scientific calculator and student ID.', date: '2026-07-25', priority: 'Exam Notice' },
      { id: 'ann-2', text: 'Lab Assignment 2 submission deadline extended to Friday 11:59 PM.', date: '2026-07-20', priority: 'Normal' }
    ]
  });

  // Grade Edit State
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [midtermInput, setMidtermInput] = useState<number>(85);
  const [assignmentInput, setAssignmentInput] = useState<number>(90);
  const [finalExamInput, setFinalExamInput] = useState<number>(88);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Direct Warning Message Modal State
  const [warningStudent, setWarningStudent] = useState<Student | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  // Assignments & Materials State
  const [assignments, setAssignments] = useState<AssignmentItem[]>([
    { id: 'asgn-1', courseId: 'crs-301', title: 'Binary Search Trees & AVL Balancing', dueDate: '2026-08-05', totalPoints: 100, weightagePercentage: 15, submittedCount: 28 },
    { id: 'asgn-2', courseId: 'crs-301', title: 'Graph Traversal Algorithms & Dijkstra', dueDate: '2026-08-18', totalPoints: 100, weightagePercentage: 15, submittedCount: 14 }
  ]);

  const [materials, setMaterials] = useState<CourseMaterial[]>([
    { id: 'mat-1', courseId: 'crs-301', title: 'Lecture Notes: Week 1 - Complexity Analysis & Big O', fileType: 'PDF Document', uploadDate: '2026-07-10', fileSize: '2.4 MB' },
    { id: 'mat-2', courseId: 'crs-301', title: 'Syllabus & Grading Criteria Fall 2026', fileType: 'PDF Document', uploadDate: '2026-07-01', fileSize: '1.1 MB' }
  ]);

  // New Material Form Modal
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatType, setNewMatType] = useState('PDF Document');

  // New Assignment Modal
  const [showAddAsgnModal, setShowAddAsgnModal] = useState(false);
  const [newAsgnTitle, setNewAsgnTitle] = useState('');
  const [newAsgnDueDate, setNewAsgnDueDate] = useState('2026-08-25');
  const [newAsgnPoints, setNewAsgnPoints] = useState(100);
  const [newAsgnWeight, setNewAsgnWeight] = useState(15);

  // Office Hours / Consultations State
  const [consultations, setConsultations] = useState<ConsultationSlot[]>([
    { id: 'con-1', studentName: 'Sarah Jenkins', studentNumber: 'BMI-2026-UG-CS-0101', date: '2026-07-29', timeSlot: '02:30 PM - 03:00 PM', topic: 'Midterm Exam Review & Algorithm Efficiency', status: 'Pending' },
    { id: 'con-2', studentName: 'David Chen', studentNumber: 'BMI-2026-UG-CS-0102', date: '2026-07-30', timeSlot: '03:00 PM - 03:30 PM', topic: 'Final Year Project Guidance', status: 'Confirmed' }
  ]);

  // Printable Gradebook Modal
  const [showPrintableGradebook, setShowPrintableGradebook] = useState(false);

  // Handler for Attendance Override
  const handleMarkAttendance = (studentId: string, status: 'Present' | 'Late' | 'Absent') => {
    setAttendanceLog(prev => ({
      ...prev,
      [activeCourse.id]: {
        ...(prev[activeCourse.id] || {}),
        [studentId]: status
      }
    }));
    recordAttendance(studentId, activeCourse.id, status);
    setSavedNotice(`Attendance status '${status}' recorded for student.`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleMarkAllPresent = () => {
    const updatedMap: Record<string, 'Present' | 'Late' | 'Absent'> = {};
    courseEnrollments.forEach(e => {
      updatedMap[e.studentId] = 'Present';
      recordAttendance(e.studentId, activeCourse.id, 'Present');
    });
    setAttendanceLog(prev => ({
      ...prev,
      [activeCourse.id]: updatedMap
    }));
    setSavedNotice(`All ${courseEnrollments.length} enrolled students marked PRESENT for today's session.`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // Handler for Save Grade
  const handleSaveGradeBreakdown = (studentId: string) => {
    // Weighted Average Calculation
    const weightedScore = Math.round((midtermInput * 0.30) + (assignmentInput * 0.30) + (finalExamInput * 0.40));
    
    let letterGrade = 'A';
    if (weightedScore >= 93) letterGrade = 'A';
    else if (weightedScore >= 90) letterGrade = 'A-';
    else if (weightedScore >= 87) letterGrade = 'B+';
    else if (weightedScore >= 83) letterGrade = 'B';
    else if (weightedScore >= 80) letterGrade = 'B-';
    else if (weightedScore >= 77) letterGrade = 'C+';
    else if (weightedScore >= 70) letterGrade = 'C';
    else if (weightedScore >= 60) letterGrade = 'D';
    else letterGrade = 'F';

    updateStudentGrade(studentId, activeCourse.id, letterGrade, weightedScore);
    setEditingStudentId(null);
    setSavedNotice(`Composite score calculated (${weightedScore}%) -> Grade ${letterGrade} assigned & synced with Registrar.`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // Handler for Posting Announcement
  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    const newAnn = {
      id: `ann-${Date.now()}`,
      text: announcementText.trim(),
      date: new Date().toISOString().split('T')[0],
      priority: announcementPriority
    };

    setAnnouncements(prev => ({
      ...prev,
      [activeCourse.id]: [newAnn, ...(prev[activeCourse.id] || [])]
    }));

    logAudit('Faculty Announcement Broadcast', `Broadcasted ${announcementPriority} notice for course ${activeCourse.code}: "${announcementText.trim()}"`);
    setAnnouncementText('');
    setSavedNotice(`Announcement broadcasted to all ${courseEnrollments.length} enrolled students.`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // Handler for Sending Academic Warning
  const handleSendWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningStudent || !warningMessage.trim()) return;

    logAudit(
      'Academic Warning Dispatched',
      `Direct faculty academic notice sent to ${warningStudent.firstName} ${warningStudent.lastName} (${warningStudent.studentNumber}): "${warningMessage}"`,
      'Warning'
    );

    setSavedNotice(`Academic alert dispatched to ${warningStudent.firstName} ${warningStudent.lastName} (${warningStudent.email})`);
    setWarningStudent(null);
    setWarningMessage('');
    setTimeout(() => setSavedNotice(null), 4000);
  };

  // Add Material Handler
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatTitle) return;

    const item: CourseMaterial = {
      id: `mat-${Date.now()}`,
      courseId: activeCourse.id,
      title: newMatTitle,
      fileType: newMatType,
      uploadDate: new Date().toISOString().split('T')[0],
      fileSize: '3.2 MB'
    };

    setMaterials(prev => [item, ...prev]);
    setShowAddMaterialModal(false);
    setNewMatTitle('');
    setSavedNotice(`Course material '${newMatTitle}' published to student portal.`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // Add Assignment Handler
  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgnTitle) return;

    const asgn: AssignmentItem = {
      id: `asgn-${Date.now()}`,
      courseId: activeCourse.id,
      title: newAsgnTitle,
      dueDate: newAsgnDueDate,
      totalPoints: newAsgnPoints,
      weightagePercentage: newAsgnWeight,
      submittedCount: 0
    };

    setAssignments(prev => [asgn, ...prev]);
    setShowAddAsgnModal(false);
    setNewAsgnTitle('');
    setSavedNotice(`New assignment '${newAsgnTitle}' added to gradebook.`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['Student Number', 'Student Name', 'Email', 'Attendance %', 'Current Grade', 'Score %'];
    const rows = courseEnrollments.map(enr => {
      const student = students.find(s => s.id === enr.studentId);
      return [
        student?.studentNumber || '',
        `"${student?.firstName || ''} ${student?.lastName || ''}"`,
        student?.email || '',
        `${enr.attendancePercentage || 100}%`,
        enr.grade || 'In Progress',
        `${enr.numericScore || 90}%`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeCourse.code}_Class_Roster_Gradebook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Roster Filtered Students
  const filteredRoster = useMemo(() => {
    return courseEnrollments.filter(enr => {
      const student = students.find(s => s.id === enr.studentId);
      if (!student) return false;

      const matchesSearch = 
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      const attPct = enr.attendancePercentage || 100;
      const matchesAtt = 
        attendanceFilter === 'ALL' ||
        (attendanceFilter === 'CRITICAL' && attPct < 80) ||
        (attendanceFilter === 'GOOD' && attPct >= 80);

      return matchesSearch && matchesAtt;
    });
  }, [courseEnrollments, students, searchTerm, attendanceFilter]);

  // Class Metrics
  const classMetrics = useMemo(() => {
    const total = courseEnrollments.length;
    if (total === 0) return { avgAtt: 100, avgScore: 90, criticalAttCount: 0, topScorers: 0 };

    let attSum = 0;
    let scoreSum = 0;
    let criticalAttCount = 0;
    let topScorers = 0;

    courseEnrollments.forEach(e => {
      const att = e.attendancePercentage || 100;
      const score = e.numericScore || 90;
      attSum += att;
      scoreSum += score;
      if (att < 80) criticalAttCount++;
      if (score >= 90) topScorers++;
    });

    return {
      avgAtt: Math.round(attSum / total),
      avgScore: Math.round(scoreSum / total),
      criticalAttCount,
      topScorers
    };
  }, [courseEnrollments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>Faculty & Instructor Academic Console</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                FACULTY PORTAL
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage course rosters, record live attendance, calculate weighted gradebook breakdowns, and dispatch academic notices.
            </p>
          </div>
        </div>

        {/* Global Faculty Quick Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition flex items-center space-x-1.5"
            title="Export current course gradebook and roster to CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Roster CSV</span>
          </button>

          <button
            onClick={() => setShowPrintableGradebook(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Gradebook</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{savedNotice}</span>
          </div>
          <button onClick={() => setSavedNotice(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Course Selection Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Select Active Teaching Section:</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">Term: Fall 2026 Academic Quarter</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {courses.map(crs => {
            const isSelected = crs.id === activeCourse.id;
            const crsEnrollments = enrollments.filter(e => e.courseId === crs.id);

            return (
              <button
                key={crs.id}
                onClick={() => setSelectedCourseId(crs.id)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-indigo-950/70 border-indigo-500/80 shadow-lg shadow-indigo-950/50 text-white' 
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {crs.code}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{crs.credits} Credits</span>
                  </div>
                  <p className="font-bold text-xs mt-1.5 line-clamp-1">{crs.title}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{crs.room || 'Lab 304'}</span>
                  <span className="font-bold text-emerald-400">{crsEnrollments.length} Enrolled</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Course Quick Stats & Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs">
                {activeCourse.code}
              </span>
              <h2 className="text-xl font-bold text-white">{activeCourse.title}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Instructor: <span className="text-slate-200 font-semibold">{activeCourse.instructorName || activeCourse.instructorId}</span> • Schedule: <span className="text-slate-200 font-semibold">{activeCourse.schedule}</span> • Location: <span className="text-slate-200 font-semibold">{activeCourse.room}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Enrolled</span>
              <span className="text-lg font-bold text-white font-mono">{courseEnrollments.length}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Avg Attendance</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{classMetrics.avgAtt}%</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Class Score Avg</span>
              <span className="text-lg font-bold text-indigo-400 font-mono">{classMetrics.avgScore}%</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-amber-400 block font-semibold uppercase">Attendance Alerts</span>
              <span className="text-lg font-bold text-amber-300 font-mono">{classMetrics.criticalAttCount}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center space-x-1 mt-4 overflow-x-auto text-xs font-semibold no-scrollbar">
          {[
            { id: 'roster', label: 'Class Roster & Attendance Grid', icon: Users, count: courseEnrollments.length },
            { id: 'gradebook', label: 'Gradebook & Assessment Weights', icon: Award },
            { id: 'materials', label: 'Course Syllabus & Materials', icon: FileText, count: materials.filter(m => m.courseId === activeCourse.id).length },
            { id: 'announcements', label: 'Class Broadcasts & Notices', icon: Megaphone, count: (announcements[activeCourse.id] || []).length },
            { id: 'consultations', label: 'Office Hours & Consultations', icon: Calendar, count: consultations.length },
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
      </div>

      {/* TAB 1: ROSTER & LIVE ATTENDANCE GRID */}
      {activeTab === 'roster' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden space-y-4 p-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student by name, UID, or email..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value as any)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">All Attendance Levels</option>
                  <option value="CRITICAL" className="bg-slate-900">At-Risk (&lt; 80%)</option>
                  <option value="GOOD" className="bg-slate-900">Good Standing (&ge; 80%)</option>
                </select>
              </div>

              <button
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md shrink-0"
              >
                <UserCheck className="w-4 h-4" />
                <span>Mark All Present Today</span>
              </button>
            </div>

          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Student Number</th>
                  <th className="p-3">Student Candidate</th>
                  <th className="p-3">Attendance %</th>
                  <th className="p-3">Today's Session Attendance</th>
                  <th className="p-3">Current Grade</th>
                  <th className="p-3 text-right">Faculty Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No student records found in this class section for the applied query.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map(enr => {
                    const student = students.find(s => s.id === enr.studentId);
                    if (!student) return null;

                    const attPct = enr.attendancePercentage || 100;
                    const isAtRisk = attPct < 80;
                    const todayStatus = attendanceLog[activeCourse.id]?.[student.id];

                    return (
                      <tr key={student.id} className="hover:bg-slate-800/40 transition">
                        
                        {/* Student Number */}
                        <td className="p-3 font-mono font-bold text-indigo-300 whitespace-nowrap">
                          {student.studentNumber}
                        </td>

                        {/* Name & Details */}
                        <td className="p-3">
                          <div className="flex items-center space-x-2.5">
                            <img src={student.avatarUrl} className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0" />
                            <div>
                              <div className="font-semibold text-white">{student.firstName} {student.lastName}</div>
                              <div className="text-[10px] text-slate-400">{student.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Attendance % */}
                        <td className="p-3 font-mono font-bold">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              isAtRisk 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-extrabold' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {attPct}%
                            </span>
                            {isAtRisk && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 font-bold border border-rose-800">
                                LOW
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Live Attendance Buttons */}
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleMarkAttendance(student.id, 'Present')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                todayStatus === 'Present'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'bg-slate-800 hover:bg-emerald-900/60 text-slate-300 hover:text-emerald-300'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(student.id, 'Late')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                todayStatus === 'Late'
                                  ? 'bg-amber-600 text-white shadow'
                                  : 'bg-slate-800 hover:bg-amber-900/60 text-slate-300 hover:text-amber-300'
                              }`}
                            >
                              Late
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(student.id, 'Absent')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                todayStatus === 'Absent'
                                  ? 'bg-rose-600 text-white shadow'
                                  : 'bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>

                        {/* Current Grade */}
                        <td className="p-3 font-mono font-bold">
                          <span className="px-2.5 py-1 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {enr.grade || 'In Progress'} ({enr.numericScore || 90}%)
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setWarningStudent(student);
                              setWarningMessage(`Dear ${student.firstName}, your attendance in ${activeCourse.code} is currently ${attPct}%. Please visit during office hours to review coursework.`);
                            }}
                            className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1 ml-auto"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Dispatch Notice</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 2: GRADEBOOK & ASSESSMENT BREAKDOWN */}
      {activeTab === 'gradebook' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span>Gradebook & Composite Assessment Weights</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated formula: <span className="text-indigo-300 font-mono">Midterm (30%) + Assignments (30%) + Final Exam (40%)</span>
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Class Grade Curve:</span>
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                A/B Average (88.4%)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Midterm Exam (30%)</th>
                  <th className="p-3">Assignments (30%)</th>
                  <th className="p-3">Final Exam (40%)</th>
                  <th className="p-3">Weighted Composite</th>
                  <th className="p-3">Letter Grade</th>
                  <th className="p-3 text-right">Gradebook Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {courseEnrollments.map(enr => {
                  const student = students.find(s => s.id === enr.studentId);
                  if (!student) return null;

                  const isEditing = editingStudentId === student.id;

                  return (
                    <tr key={student.id} className="hover:bg-slate-800/40 transition">
                      
                      <td className="p-3">
                        <div className="font-semibold text-white">{student.firstName} {student.lastName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{student.studentNumber}</div>
                      </td>

                      {/* Midterm */}
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            value={midtermInput}
                            onChange={(e) => setMidtermInput(Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                          />
                        ) : (
                          <span className="text-slate-200">85 / 100</span>
                        )}
                      </td>

                      {/* Assignments */}
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            value={assignmentInput}
                            onChange={(e) => setAssignmentInput(Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                          />
                        ) : (
                          <span className="text-slate-200">92 / 100</span>
                        )}
                      </td>

                      {/* Final Exam */}
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            value={finalExamInput}
                            onChange={(e) => setFinalExamInput(Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                          />
                        ) : (
                          <span className="text-slate-200">88 / 100</span>
                        )}
                      </td>

                      {/* Composite */}
                      <td className="p-3 font-mono font-bold text-indigo-300">
                        {enr.numericScore || 88}%
                      </td>

                      {/* Letter Grade */}
                      <td className="p-3 font-mono font-bold">
                        <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {enr.grade || 'A-'}
                        </span>
                      </td>

                      {/* Grade Action */}
                      <td className="p-3 text-right">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveGradeBreakdown(student.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center space-x-1 ml-auto"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Composite</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingStudentId(student.id);
                              setMidtermInput(85);
                              setAssignmentInput(90);
                              setFinalExamInput(enr.numericScore || 88);
                            }}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium rounded-lg transition"
                          >
                            Edit Score
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: COURSE SYLLABUS, MATERIALS & ASSIGNMENTS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          
          {/* Course Materials List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-white text-sm">Course Syllabus & Handout Documents</h2>
              </div>
              <button
                onClick={() => setShowAddMaterialModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Material</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {materials.filter(m => m.courseId === activeCourse.id).map(mat => (
                <div key={mat.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">{mat.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{mat.fileType} • {mat.fileSize} • Uploaded {mat.uploadDate}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const docBody = `BMI UNIVERSITY ACADEMIC RESOURCE
=======================================
Title:        ${mat.title}
Course:       ${activeCourse.code} - ${activeCourse.title}
Document Type: ${mat.fileType}
Uploaded Date: ${mat.uploadDate}

CONTENT PREVIEW & NOTES:
------------------------
Official lecture resource document provided for ${activeCourse.code}.
Contains lecture readings, slides notes, and lab instructions.
=======================================`;
                      exportToText(`${activeCourse.code}_${mat.title.replace(/\s+/g, '_')}.txt`, docBody);
                      setSavedNotice(`Downloaded material file '${mat.title}'`);
                      setTimeout(() => setSavedNotice(null), 2500);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                    title="Download document"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assignments Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-white text-sm">Course Lab Assignments & Homework Projects</h2>
              </div>
              <button
                onClick={() => setShowAddAsgnModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>New Assignment</span>
              </button>
            </div>

            <div className="space-y-3">
              {assignments.filter(a => a.courseId === activeCourse.id).map(asgn => (
                <div key={asgn.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h3 className="font-bold text-white text-sm">{asgn.title}</h3>
                    <p className="text-slate-400 mt-0.5">
                      Due Date: <span className="text-amber-300 font-mono font-bold">{asgn.dueDate}</span> • Total Points: <span className="font-mono text-indigo-300">{asgn.totalPoints} pts</span> • Course Weight: <span className="font-mono text-emerald-300">{asgn.weightagePercentage}%</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg font-mono text-[11px]">
                      Submissions: <strong className="text-emerald-400">{asgn.submittedCount} / {courseEnrollments.length}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setSavedNotice(`Opening submission review queue for '${asgn.title}'`);
                        setTimeout(() => setSavedNotice(null), 3000);
                      }}
                      className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg font-bold transition text-xs"
                    >
                      Review Submissions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: CLASS BROADCASTS & ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-5">
          
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Megaphone className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-sm">Class Announcements & Broadcast Channel</h2>
          </div>

          <form onSubmit={handlePostAnnouncement} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Broadcast Message Content</label>
              <textarea
                rows={3}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Type lecture updates, exam instructions, or schedule changes..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400 font-semibold">Priority Flag:</span>
                {(['Normal', 'Exam Notice', 'Urgent'] as const).map(prio => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setAnnouncementPriority(prio)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      announcementPriority === prio
                        ? prio === 'Urgent' ? 'bg-rose-600 text-white' : prio === 'Exam Notice' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {prio}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast Notice</span>
              </button>
            </div>
          </form>

          {/* Previous Announcements List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Posted Course Broadcast History</h3>
            {(announcements[activeCourse.id] || []).map(ann => (
              <div key={ann.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                    ann.priority === 'Urgent' 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                      : ann.priority === 'Exam Notice' 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {ann.priority}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">{ann.date}</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-medium">{ann.text}</p>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 5: OFFICE HOURS & CONSULTATIONS */}
      {activeTab === 'consultations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-5">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-white text-sm">Faculty Office Hours & Student Consultation Requests</h2>
            </div>

            <span className="text-xs text-indigo-300 font-mono bg-indigo-950/80 px-3 py-1 rounded-lg border border-indigo-800">
              Office Hours: Mon & Wed 02:00 PM - 04:00 PM (Room 304)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {consultations.map(con => (
              <div key={con.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">{con.studentName}</span>
                    <span className="text-[10px] text-indigo-300 font-mono">{con.studentNumber}</span>
                  </div>
                  <p className="text-slate-300 font-medium mt-1">Topic: "{con.topic}"</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Date: {con.date} • Time Slot: {con.timeSlot}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                    con.status === 'Confirmed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {con.status}
                  </span>

                  {con.status === 'Pending' && (
                    <button
                      onClick={() => {
                        setConsultations(prev => prev.map(c => c.id === con.id ? { ...c, status: 'Confirmed' } : c));
                        setSavedNotice(`Consultation approved for ${con.studentName}`);
                        setTimeout(() => setSavedNotice(null), 3000);
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-xs"
                    >
                      Approve Request
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Add New Material Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-sm flex items-center space-x-2">
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span>Upload Course Material</span>
              </h2>
              <button onClick={() => setShowAddMaterialModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Document Title *</label>
                <input
                  type="text"
                  value={newMatTitle}
                  onChange={(e) => setNewMatTitle(e.target.value)}
                  placeholder="e.g. Lecture Notes: Binary Search Trees"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">File Classification</label>
                <select
                  value={newMatType}
                  onChange={(e) => setNewMatType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                >
                  <option value="PDF Document">PDF Document</option>
                  <option value="Lecture Presentation Slides">Lecture Presentation Slides</option>
                  <option value="Lab Manual & Source Code">Lab Manual & Source Code</option>
                  <option value="Reference Textbook Chapter">Reference Textbook Chapter</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
                >
                  Publish to Student Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assignment Modal */}
      {showAddAsgnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-sm flex items-center space-x-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Create Lab Assignment / Homework</span>
              </h2>
              <button onClick={() => setShowAddAsgnModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAssignment} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Assignment Title *</label>
                <input
                  type="text"
                  value={newAsgnTitle}
                  onChange={(e) => setNewAsgnTitle(e.target.value)}
                  placeholder="e.g. Lab 4 - Graph Algorithms & Search"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Due Date</label>
                  <input
                    type="date"
                    value={newAsgnDueDate}
                    onChange={(e) => setNewAsgnDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Max Points</label>
                  <input
                    type="number"
                    value={newAsgnPoints}
                    onChange={(e) => setNewAsgnPoints(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Weight %</label>
                  <input
                    type="number"
                    value={newAsgnWeight}
                    onChange={(e) => setNewAsgnWeight(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
                >
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Academic Warning Modal */}
      {warningStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-white text-base">Send Direct Academic Notice</h2>
              </div>
              <button onClick={() => setWarningStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendWarning} className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-slate-400 font-semibold">Recipient Student</p>
                <p className="font-bold text-white text-sm">{warningStudent.firstName} {warningStudent.lastName}</p>
                <p className="text-slate-400 font-mono">{warningStudent.studentNumber} • {warningStudent.email}</p>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Academic Notice Message</label>
                <textarea
                  rows={4}
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setWarningStudent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow-lg flex items-center space-x-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable Class Gradebook Modal */}
      {showPrintableGradebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">Official University Class Gradebook & Roster Record</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Gradebook</span>
                </button>
                <button
                  onClick={() => setShowPrintableGradebook(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="printable-document p-8 overflow-y-auto space-y-6 text-xs bg-slate-50 relative border-4 border-indigo-900/10">
              
              <GuillochePattern />
              <SecurityWatermark text="BMI FACULTY GRADEBOOK" subtext="CANONICAL ROSTER RECORD" />
              <MicrotextBorder text="• BETHEL MINISTRIES INTERNATIONAL FACULTY RECORD • OFFICIAL CLASS GRADEBOOK SEC-2026 • CONFIDENTIAL " />

              {/* Title Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between relative z-10">
                <div>
                  <h1 className="text-xl font-black text-slate-900">BETHEL MINISTRIES INTERNATIONAL</h1>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">OFFICE OF THE REGISTRAR & FACULTY AFFAIRS</p>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <p className="font-bold text-indigo-900">COURSE: {activeCourse.code}</p>
                  <p className="text-slate-500">TERM: FALL 2026</p>
                </div>
              </div>

              {/* Course Meta Info */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm relative z-10 font-mono">
                <div>
                  <strong className="text-slate-700">Course Title:</strong>
                  <p className="font-bold text-slate-900">{activeCourse.title}</p>
                </div>
                <div>
                  <strong className="text-slate-700">Instructor:</strong>
                  <p className="font-bold text-slate-900">{activeCourse.instructorName || activeCourse.instructorId}</p>
                </div>
                <div>
                  <strong className="text-slate-700">Enrolled Roster:</strong>
                  <p className="font-bold text-emerald-700">{courseEnrollments.length} Students</p>
                </div>
              </div>

              {/* Gradebook Table */}
              <div className="relative z-10">
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 uppercase font-bold font-mono">
                      <th className="border border-slate-300 p-2">Student ID</th>
                      <th className="border border-slate-300 p-2">Student Name</th>
                      <th className="border border-slate-300 p-2 text-center">Attendance</th>
                      <th className="border border-slate-300 p-2 text-center">Final Score</th>
                      <th className="border border-slate-300 p-2 text-center">Letter Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseEnrollments.map(enr => {
                      const student = students.find(s => s.id === enr.studentId);
                      return (
                        <tr key={enr.studentId} className="hover:bg-slate-100">
                          <td className="border border-slate-300 p-2 font-mono font-bold">{student?.studentNumber}</td>
                          <td className="border border-slate-300 p-2 font-semibold">{student?.firstName} {student?.lastName}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{enr.attendancePercentage || 100}%</td>
                          <td className="border border-slate-300 p-2 text-center font-mono font-bold text-indigo-900">{enr.numericScore || 90}%</td>
                          <td className="border border-slate-300 p-2 text-center font-mono font-bold text-emerald-800">{enr.grade || 'A-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Security Seal & Signature */}
              <div className="flex items-end justify-between pt-6 border-t border-slate-300 relative z-10">
                <SecuritySealBadge docType="Official Gradebook" docId={activeCourse.code} securityHash={`FAC-GB-${activeCourse.code}-2026`} />

                <div className="text-center font-serif text-[11px] space-y-1">
                  <div className="w-48 border-b border-slate-900 mx-auto italic font-bold text-slate-800">
                    {activeCourse.instructorName || activeCourse.instructorId}
                  </div>
                  <p className="font-mono text-[10px] text-slate-600 uppercase">Faculty Instructor Signature</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
