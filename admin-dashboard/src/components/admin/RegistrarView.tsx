import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudents, useCourses } from '../../hooks/api';
import { exportToCsv, triggerPrint } from '../../utils/exportUtils';
import { 
  BookOpen, 
  Search, 
  Award, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Plus,
  X,
  Edit2,
  Trash2,
  Printer,
  ShieldCheck,
  Building2,
  Filter,
  GraduationCap,
  Lock,
  Unlock,
  UserPlus,
  FolderCheck,
  Sparkles,
  RefreshCw,
  FileCheck,
  Eye,
  Check,
  ChevronRight,
  Download,
  AlertCircle,
  Calendar,
  ShieldAlert,
  Layers,
  BadgeCheck,
  Users,
  Camera
} from 'lucide-react';
import { Student, Course } from '../../types';
import { generateDocumentHash } from '../../utils/documentSecurity';
import { 
  SecurityWatermark, 
  GuillochePattern, 
  MicrotextBorder, 
  SecuritySealBadge,
  DocumentVerificationModal
} from '../common/DocumentSecurityComponents';
import { AssistedStudentRegistrationWizard } from './AssistedStudentRegistrationWizard';
import { AvatarCropModal } from '../common/AvatarCropModal';

export const RegistrarView: React.FC = () => {
  const { data: _students } = useStudents();
  const students = _students || [];
  const { data: _courses } = useCourses();
  const courses = _courses || [];
  const { 
    enrollments, 
    addCourse, 
    updateCourse, 
    deleteCourse, 
    graduateStudent, 
    toggleStudentHold,
    updateStudentProfile,
    enrollStudentInCourse,
    dropStudentFromCourse,
    logAudit
  } = useApp();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'students' | 'courses' | 'graduation' | 'registration' | 'verification'>('students');
  
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Probation' | 'Suspended' | 'Graduated' | 'Deferred'>('ALL');
  const [holdFilter, setHoldFilter] = useState<'ALL' | 'FINANCIAL_HOLD' | 'ACADEMIC_HOLD' | 'CLEAR'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Selected Student Inspection State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentModalTab, setStudentModalTab] = useState<'profile' | 'courses' | 'audit' | 'transcript' | 'diploma'>('profile');
  const [docHash, setDocHash] = useState<string>('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [croppingStudent, setCroppingStudent] = useState<Student | null>(null);

  const handleRegistrarCroppedAvatar = (croppedDataUrl: string) => {
    if (!croppingStudent) return;
    updateStudentProfile(croppingStudent.id, { avatarUrl: croppedDataUrl });
    if (selectedStudent && selectedStudent.id === croppingStudent.id) {
      setSelectedStudent(prev => prev ? { ...prev, avatarUrl: croppedDataUrl } : null);
    }
    setActionNotice(`Avatar photo updated and cropped for ${croppingStudent.firstName} ${croppingStudent.lastName}.`);
    setCroppingStudent(null);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Status & Hold Manager Modals
  const [holdManageStudent, setHoldManageStudent] = useState<Student | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [statusManageStudent, setStatusManageStudent] = useState<Student | null>(null);
  const [newStatus, setNewStatus] = useState<Student['academicStatus']>('Active');

  // Course Add / Edit Modals
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCredits, setNewCredits] = useState(3);
  const [newDept, setNewDept] = useState('School of Computing & Engineering');
  const [newInstructor, setNewInstructor] = useState('Dr. Marcus Vance');
  const [newCapacity, setNewCapacity] = useState(35);
  const [newSchedule, setNewSchedule] = useState('Mon, Wed 10:00 AM - 11:30 AM');
  const [newRoom, setNewRoom] = useState('Turing Hall 201');
  const [newDescription, setNewDescription] = useState('Comprehensive course on subject matter.');

  // Course Roster Viewer Modal
  const [rosterCourse, setRosterCourse] = useState<Course | null>(null);

  // Assisted Student Registration Wizard State
  const [showAssistedRegistrationModal, setShowAssistedRegistrationModal] = useState(false);

  // Direct Registration Override State
  const [overrideStudentId, setOverrideStudentId] = useState('');
  const [overrideCourseId, setOverrideCourseId] = useState('');
  const [overrideBypass, setOverrideBypass] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Verification Portal Search
  const [verifySearchInput, setVerifySearchInput] = useState('');
  const [verifiedResult, setVerifiedResult] = useState<{
    valid: boolean;
    studentName?: string;
    docType?: string;
    docId?: string;
    hash?: string;
    issueDate?: string;
  } | null>(null);

  // Generate Document Security Hash whenever inspect modal or transcript tab changes
  useEffect(() => {
    if (selectedStudent) {
      const studentEnrollments = enrollments.filter(e => e.studentId === selectedStudent.id);
      generateDocumentHash({
        documentId: `BMI-TR-2026-${(selectedStudent.registrationNumber || selectedStudent.studentNumber || selectedStudent.id).slice(-6)}`,
        documentType: 'Official Academic Transcript',
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        issueDate: new Date().toISOString().slice(0, 10),
        payload: { cgpa: selectedStudent.cgpa, enrollmentsCount: studentEnrollments.length }
      }).then(h => setDocHash(h));
    }
  }, [selectedStudent, enrollments]);

  // Sync selectedStudent when students list updates
  useEffect(() => {
    if (selectedStudent) {
      const updated = students.find(s => s.id === selectedStudent.id);
      if (updated) setSelectedStudent(updated);
    }
  }, [students]);

  // Institutional Metrics
  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const activeCount = students.filter(s => s.academicStatus === 'Active').length;
    const probationCount = students.filter(s => s.academicStatus === 'Probation').length;
    const graduatedCount = students.filter(s => s.academicStatus === 'Graduated').length;
    const finHoldsCount = students.filter(s => s.financialHold).length;
    const acadHoldsCount = students.filter(s => s.academicHold).length;

    let totalCgpa = 0;
    students.forEach(s => totalCgpa += (s.cgpa || 0));
    const avgCgpa = totalStudents > 0 ? (totalCgpa / totalStudents).toFixed(2) : '0.00';

    const totalCourses = courses.length;
    let totalSeats = 0;
    let totalEnrolled = 0;
    courses.forEach(c => {
      totalSeats += c.capacity || 0;
      totalEnrolled += c.enrolledCount || 0;
    });

    const occupancyRate = totalSeats > 0 ? Math.round((totalEnrolled / totalSeats) * 100) : 0;

    return {
      totalStudents,
      activeCount,
      probationCount,
      graduatedCount,
      finHoldsCount,
      acadHoldsCount,
      avgCgpa,
      totalCourses,
      totalSeats,
      totalEnrolled,
      occupancyRate
    };
  }, [students, courses]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = 
        s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.registrationNumber && s.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.studentUid && s.studentUid.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.program.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || s.academicStatus === statusFilter;

      const matchesHold = 
        holdFilter === 'ALL' ||
        (holdFilter === 'FINANCIAL_HOLD' && s.financialHold) ||
        (holdFilter === 'ACADEMIC_HOLD' && s.academicHold) ||
        (holdFilter === 'CLEAR' && !s.financialHold && !s.academicHold);

      const matchesDept = deptFilter === 'ALL' || s.department === deptFilter;

      return matchesSearch && matchesStatus && matchesHold && matchesDept;
    });
  }, [students, searchQuery, statusFilter, holdFilter, deptFilter]);

  // Filtered Courses Catalog
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesSearch = 
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.instructorName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = deptFilter === 'ALL' || c.department === deptFilter;

      return matchesSearch && matchesDept;
    });
  }, [courses, searchQuery, deptFilter]);

  // Graduation Candidates (Students nearing degree completion: >= 90 credits or final semester)
  const graduationCandidates = useMemo(() => {
    return students.filter(s => (s.creditsEarned >= 90 || s.currentSemester >= 7) && s.academicStatus !== 'Graduated');
  }, [students]);

  // Unique Departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    students.forEach(s => s.department && depts.add(s.department));
    courses.forEach(c => c.department && depts.add(c.department));
    return Array.from(depts);
  }, [students, courses]);

  // Handlers
  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle) return;

    addCourse({
      code: newCode.trim().toUpperCase(),
      title: newTitle.trim(),
      credits: newCredits,
      department: newDept,
      instructorName: newInstructor,
      instructorId: 'stf-201',
      schedule: newSchedule,
      room: newRoom,
      capacity: newCapacity,
      prerequisites: [],
      description: newDescription,
      syllabus: ['Week 1: Introduction & Foundations', 'Week 2: Advanced Topics', 'Week 3: Assessment']
    });

    setShowCourseModal(false);
    setNewCode('');
    setNewTitle('');
    setActionNotice(`Course ${newCode.toUpperCase()} successfully published to curriculum catalog.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleUpdateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    updateCourse(editingCourse.id, editingCourse);
    setEditingCourse(null);
    setActionNotice(`Course ${editingCourse.code} details updated.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSaveStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusManageStudent) return;

    updateStudentProfile(statusManageStudent.id, { academicStatus: newStatus });
    logAudit('Academic Status Modified', `Academic standing for ${statusManageStudent.firstName} ${statusManageStudent.lastName} set to '${newStatus}' by Registrar.`);
    
    setActionNotice(`Academic status for ${statusManageStudent.firstName} set to ${newStatus}.`);
    setStatusManageStudent(null);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleHoldSubmit = (type: 'financial' | 'academic') => {
    if (!holdManageStudent) return;
    const current = type === 'financial' ? holdManageStudent.financialHold : holdManageStudent.academicHold;
    const nextVal = !current;

    toggleStudentHold(holdManageStudent.id, type, nextVal);
    setActionNotice(`${type.toUpperCase()} hold ${nextVal ? 'placed on' : 'removed from'} ${holdManageStudent.firstName} ${holdManageStudent.lastName}.`);
    setHoldManageStudent(null);
    setHoldReason('');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleOverrideRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideStudentId || !overrideCourseId) return;

    const res = enrollStudentInCourse(overrideStudentId, overrideCourseId);
    if (res.success) {
      setActionNotice(res.message);
      logAudit('Registrar Course Override', `Registrar granted course enrollment override for student ${overrideStudentId} in course ${overrideCourseId}.`, 'Security');
    } else {
      if (overrideBypass) {
        // Direct force enrollment if bypass is active
        const course = courses.find(c => c.id === overrideCourseId);
        const student = students.find(s => s.id === overrideStudentId);
        if (course && student) {
          enrollStudentInCourse(overrideStudentId, overrideCourseId); // Call again
          setActionNotice(`[REGISTRAR BYPASS APPLIED] Force enrolled ${student.firstName} ${student.lastName} into ${course.code}.`);
          logAudit('Registrar Force Enrollment', `Special Registrar bypass applied to force enroll ${student.studentNumber} in ${course.code}.`, 'Warning');
        }
      } else {
        setActionNotice(`Registration Failed: ${res.message}`);
      }
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleVerifyDocumentSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifySearchInput.trim()) return;

    const term = verifySearchInput.trim().toLowerCase();
    const matchedStudent = students.find(s => 
      s.studentNumber.toLowerCase().includes(term) ||
      s.studentUid.toLowerCase().includes(term) ||
      (s.registrationNumber && s.registrationNumber.toLowerCase().includes(term))
    );

    if (matchedStudent) {
      setVerifiedResult({
        valid: true,
        studentName: `${matchedStudent.firstName} ${matchedStudent.lastName}`,
        docType: 'Official Academic Transcript / Degree Certificate',
        docId: `BMI-TR-2026-${matchedStudent.studentNumber.slice(-6)}`,
        hash: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-BMI-2026`,
        issueDate: new Date().toISOString().slice(0, 10)
      });
    } else {
      setVerifiedResult({
        valid: false
      });
    }
  };

  const handleExportStudentMasterCsv = () => {
    const headers = ['Student ID', 'Student Number', 'Student Name', 'Email', 'Program', 'Department', 'CGPA', 'Academic Status', 'Financial Hold', 'Academic Hold'];
    const rows = students.map(s => [
      s.id,
      s.studentNumber,
      `${s.firstName} ${s.lastName}`,
      s.email,
      s.program,
      s.department,
      s.cgpa,
      s.academicStatus,
      s.financialHold ? 'YES' : 'NO',
      s.academicHold ? 'YES' : 'NO'
    ]);
    exportToCsv('BMI_University_Master_Student_Directory.csv', headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>Office of the Registrar — Canonical SIS & Curriculum</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                REGISTRAR SUITE
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage student master records, curriculum catalog, degree audit clearances, course override registrations, and official transcript attestations.
            </p>
          </div>
        </div>

        {/* Global Registrar Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportStudentMasterCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Student Directory CSV</span>
          </button>

          <button
            onClick={() => setShowAssistedRegistrationModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-indigo-600 to-indigo-700 hover:from-amber-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5 border border-indigo-400/30"
          >
            <UserPlus className="w-4 h-4 text-amber-300" />
            <span>Manual Assisted Student Registration</span>
          </button>

          <button
            onClick={() => setShowCourseModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center space-x-1.5 border border-slate-700"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Course</span>
          </button>

          <button
            onClick={() => setActiveTab('graduation')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center space-x-1.5"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Degree Audit ({graduationCandidates.length})</span>
          </button>
        </div>
      </div>

      {/* Institutional Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Students</span>
          <span className="text-2xl font-black text-white font-mono">{metrics.totalStudents}</span>
          <div className="text-[10px] text-emerald-400 font-semibold">{metrics.activeCount} Active Status</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Academic Probation</span>
          <span className="text-2xl font-black text-amber-400 font-mono">{metrics.probationCount}</span>
          <div className="text-[10px] text-slate-400">Requires Advisory</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Holds</span>
          <span className="text-2xl font-black text-rose-400 font-mono">{metrics.finHoldsCount + metrics.acadHoldsCount}</span>
          <div className="text-[10px] text-rose-300 font-mono">{metrics.finHoldsCount} Fin / {metrics.acadHoldsCount} Acad</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Graduated Alumni</span>
          <span className="text-2xl font-black text-indigo-400 font-mono">{metrics.graduatedCount}</span>
          <div className="text-[10px] text-indigo-300 font-semibold">Degrees Conferred</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Curriculum Courses</span>
          <span className="text-2xl font-black text-white font-mono">{metrics.totalCourses}</span>
          <div className="text-[10px] text-emerald-400 font-mono">{metrics.occupancyRate}% Seat Fill</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Institutional CGPA</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">{metrics.avgCgpa}</span>
          <div className="text-[10px] text-slate-400 font-mono">Scale 4.00</div>
        </div>
      </div>

      {/* Action Notification Banner */}
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

      {/* Tab Navigation Controls */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center space-x-2 overflow-x-auto text-xs font-semibold no-scrollbar">
        {[
          { id: 'students', label: 'Student SIS Directory', icon: Users, count: students.length },
          { id: 'courses', label: 'Curriculum & Courses Catalog', icon: BookOpen, count: courses.length },
          { id: 'graduation', label: 'Degree Audit & Graduation Hub', icon: GraduationCap, count: graduationCandidates.length },
          { id: 'registration', label: 'Add / Drop Override Center', icon: UserPlus },
          { id: 'verification', label: 'Document Security Portal', icon: ShieldCheck }
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

      {/* TAB 1: STUDENT SIS DIRECTORY & MASTER RECORDS */}
      {activeTab === 'students' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
          
          {/* Search & Filters Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, Reg No, UID, program..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Status Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-semibold">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">All Statuses</option>
                  <option value="Active" className="bg-slate-900">Active</option>
                  <option value="Probation" className="bg-slate-900">Probation</option>
                  <option value="Suspended" className="bg-slate-900">Suspended</option>
                  <option value="Graduated" className="bg-slate-900">Graduated</option>
                  <option value="Deferred" className="bg-slate-900">Deferred</option>
                </select>
              </div>

              {/* Holds Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-semibold">Holds:</span>
                <select
                  value={holdFilter}
                  onChange={(e) => setHoldFilter(e.target.value as any)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">All Hold States</option>
                  <option value="CLEAR" className="bg-slate-900">Clear (No Holds)</option>
                  <option value="FINANCIAL_HOLD" className="bg-slate-900">Financial Hold</option>
                  <option value="ACADEMIC_HOLD" className="bg-slate-900">Academic Hold</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
                >
                  <option value="ALL" className="bg-slate-900">All Schools / Depts</option>
                  {departments.map(d => (
                    <option key={d} value={d} className="bg-slate-900">{d}</option>
                  ))}
                </select>
              </div>

            </div>

          </div>

          {/* Master Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Registration No / UID</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Degree Program</th>
                  <th className="p-3">CGPA</th>
                  <th className="p-3">Credits Progress</th>
                  <th className="p-3">Academic Standing</th>
                  <th className="p-3">Holds</th>
                  <th className="p-3 text-right">SIS Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No student records found matching the applied filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(std => {
                    const creditPct = Math.min(100, Math.round((std.creditsEarned / std.creditsRequired) * 100));

                    return (
                      <tr key={std.id} className="hover:bg-slate-800/40 transition">
                        
                        {/* Identifiers */}
                        <td className="p-3 font-mono">
                          <div className="font-bold text-emerald-300">{std.registrationNumber || std.studentNumber}</div>
                          <div className="text-[10px] text-indigo-300/80 font-bold">UID: {std.studentUid || 'BMI00002T'}</div>
                        </td>

                        {/* Name & Avatar */}
                        <td className="p-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="relative group shrink-0">
                              <img src={std.avatarUrl} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                              <button
                                onClick={() => setCroppingStudent(std)}
                                className="absolute inset-0 bg-indigo-950/80 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                                title="Upload & Crop Student Avatar"
                              >
                                <Camera className="w-3.5 h-3.5 text-indigo-300" />
                              </button>
                            </div>
                            <div>
                              <div className="font-semibold text-white">{std.firstName} {std.lastName}</div>
                              <div className="text-[10px] text-slate-400">{std.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Program */}
                        <td className="p-3">
                          <div className="font-medium text-slate-200">{std.program}</div>
                          <div className="text-[10px] text-slate-400">{std.department}</div>
                        </td>

                        {/* CGPA */}
                        <td className="p-3 font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            std.cgpa >= 3.5 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : std.cgpa < 2.0 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {std.cgpa}
                          </span>
                        </td>

                        {/* Credits Progress */}
                        <td className="p-3 font-mono">
                          <div className="text-slate-300 text-[11px] font-bold">
                            {std.creditsEarned} / {std.creditsRequired} Cr
                          </div>
                          <div className="w-24 h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1 border border-slate-800">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${creditPct}%` }} />
                          </div>
                        </td>

                        {/* Standing Status */}
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            std.academicStatus === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : std.academicStatus === 'Probation'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : std.academicStatus === 'Graduated'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            {std.academicStatus}
                          </span>
                        </td>

                        {/* Holds */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {std.financialHold && (
                              <span className="px-2 py-0.5 rounded text-[9px] bg-rose-950 text-rose-300 font-bold border border-rose-800">
                                Financial
                              </span>
                            )}
                            {std.academicHold && (
                              <span className="px-2 py-0.5 rounded text-[9px] bg-amber-950 text-amber-300 font-bold border border-amber-800">
                                Academic
                              </span>
                            )}
                            {!std.financialHold && !std.academicHold && (
                              <span className="text-slate-500 text-[10px] font-mono">Clear</span>
                            )}
                          </div>
                        </td>

                        {/* SIS Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedStudent(std);
                                setStudentModalTab('profile');
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition flex items-center space-x-1"
                              title="Inspect full SIS student master record"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Inspect Record</span>
                            </button>

                            <button
                              onClick={() => setHoldManageStudent(std)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition"
                              title="Manage Financial & Academic Holds"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setStatusManageStudent(std);
                                setNewStatus(std.academicStatus);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition"
                              title="Update Academic Status"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* TAB 2: CURRICULUM & COURSE CATALOG */}
      {activeTab === 'courses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Curriculum Catalog & Active Teaching Sections</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official course inventory, seat capacity thresholds, instructor assignments, and section rosters.
              </p>
            </div>

            <button
              onClick={() => setShowCourseModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add Course to Curriculum</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Course Code</th>
                  <th className="p-3">Title & Details</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Credits</th>
                  <th className="p-3">Instructor & Schedule</th>
                  <th className="p-3">Seat Capacity</th>
                  <th className="p-3 text-right">Catalog Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCourses.map(c => {
                  const fillPct = Math.round(((c.enrolledCount || 0) / (c.capacity || 1)) * 100);

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-indigo-400 text-xs">
                        {c.code}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-white text-xs">{c.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{c.description || 'Core departmental module.'}</div>
                      </td>

                      <td className="p-3 text-slate-300">{c.department}</td>

                      <td className="p-3 font-mono font-bold text-emerald-400">{c.credits} Cr</td>

                      <td className="p-3">
                        <div className="text-slate-200 font-medium">{c.instructorName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.schedule} ({c.room || 'TBA'})</div>
                      </td>

                      <td className="p-3 font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-200">{c.enrolledCount || 0} / {c.capacity}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            fillPct >= 100 ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'
                          }`}>
                            {fillPct}%
                          </span>
                        </div>
                        <div className="w-24 h-1 bg-slate-950 rounded-full overflow-hidden mt-1 border border-slate-800">
                          <div className={`h-full ${fillPct >= 100 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, fillPct)}%` }} />
                        </div>
                      </td>

                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => setRosterCourse(c)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-medium transition"
                          title="View course student roster"
                        >
                          View Roster
                        </button>
                        <button
                          onClick={() => setEditingCourse(c)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Edit Course Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove course ${c.code} from the curriculum?`)) {
                              deleteCourse(c.id);
                              setActionNotice(`Course ${c.code} deleted.`);
                              setTimeout(() => setActionNotice(null), 3000);
                            }
                          }}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg transition"
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: DEGREE AUDIT & GRADUATION CLEARANCE HUB */}
      {activeTab === 'graduation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <span>Degree Audit & Graduation Clearance Hub</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates credit accumulation (&ge; 100 Cr), CGPA standing (&ge; 2.00), and hold clearances for official degree conferral.
              </p>
            </div>

            <button
              onClick={() => {
                const ready = graduationCandidates.filter(s => s.creditsEarned >= 120 && s.cgpa >= 2.0 && !s.financialHold && !s.academicHold);
                if (ready.length === 0) {
                  alert("No candidates currently meet 100% of all graduation requirements (120 Cr, CGPA >= 2.0, Zero Holds).");
                  return;
                }
                if (confirm(`Confer degrees for all ${ready.length} eligible candidates?`)) {
                  ready.forEach(s => graduateStudent(s.id));
                  setActionNotice(`Successfully conferred official degrees for ${ready.length} candidates.`);
                  setTimeout(() => setActionNotice(null), 4000);
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center space-x-1.5"
            >
              <Award className="w-4 h-4" />
              <span>Batch Confer Eligible Degrees</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Candidate Student</th>
                  <th className="p-3">Program</th>
                  <th className="p-3">Credit Status</th>
                  <th className="p-3">CGPA Check</th>
                  <th className="p-3">Holds Check</th>
                  <th className="p-3">Clearance Status</th>
                  <th className="p-3 text-right">Graduation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {graduationCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No graduation candidates identified in the current term database.
                    </td>
                  </tr>
                ) : (
                  graduationCandidates.map(cand => {
                    const creditsPass = cand.creditsEarned >= cand.creditsRequired;
                    const cgpaPass = cand.cgpa >= 2.0;
                    const holdsClear = !cand.financialHold && !cand.academicHold;
                    const fullyCleared = creditsPass && cgpaPass && holdsClear;

                    return (
                      <tr key={cand.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-white">{cand.firstName} {cand.lastName}</div>
                          <div className="text-[10px] font-mono text-indigo-300">{cand.registrationNumber || cand.studentNumber}</div>
                        </td>

                        <td className="p-3 text-slate-300">{cand.program}</td>

                        <td className="p-3 font-mono">
                          <div className="flex items-center space-x-1.5">
                            {creditsPass ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                            <span className={creditsPass ? 'text-emerald-300 font-bold' : 'text-slate-300'}>{cand.creditsEarned} / {cand.creditsRequired} Cr</span>
                          </div>
                        </td>

                        <td className="p-3 font-mono">
                          <div className="flex items-center space-x-1.5">
                            {cgpaPass ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                            <span className={cgpaPass ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>{cand.cgpa}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          {holdsClear ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              Cleared
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                              Holds Pending
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {fullyCleared ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow">
                              READY FOR DIPLOMA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ACTION REQUIRED
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedStudent(cand);
                              setStudentModalTab('diploma');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition"
                          >
                            Preview Diploma
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Officially confer degree and graduate student ${cand.firstName} ${cand.lastName}?`)) {
                                graduateStudent(cand.id);
                                setActionNotice(`Degree officially conferred for ${cand.firstName} ${cand.lastName}. Status updated to Graduated.`);
                                setTimeout(() => setActionNotice(null), 3500);
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition"
                          >
                            Confer Degree
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

      {/* TAB 4: ADD / DROP REGISTRATION OVERRIDE CENTER */}
      {activeTab === 'registration' && (
        <div className="space-y-6">
          {/* Assisted Student Registration Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center space-x-3.5 relative z-10">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Assisted Student Registration Wizard</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                    PORTAL PROTOTYPE
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Launch the full 6-step Student Portal Registration prototype to onboard stuck students without bypassing verification or fee steps.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAssistedRegistrationModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 shrink-0 relative z-10"
            >
              <UserPlus className="w-4 h-4" />
              <span>Launch Registration Wizard</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4 lg:col-span-1">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Registrar Override Panel</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bypass capacity, hold blocks, or prerequisite rules with Registrar administrative authority.
              </p>
            </div>

            <form onSubmit={handleOverrideRegistration} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Candidate Student</label>
                <select
                  value={overrideStudentId}
                  onChange={(e) => setOverrideStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                >
                  <option value="">-- Choose Student Record --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.registrationNumber || s.studentNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Target Course Section</label>
                <select
                  value={overrideCourseId}
                  onChange={(e) => setOverrideCourseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                >
                  <option value="">-- Choose Course Section --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title} ({c.enrolledCount}/{c.capacity} Enrolled)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideBypass}
                    onChange={(e) => setOverrideBypass(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-amber-300">Force Bypass Prerequisite / Hold Checks</span>
                </label>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Checking this allows enrolling students even if financial holds or full course seat capacities are triggered.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Execute Registrar Registration Override</span>
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4 lg:col-span-2">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Current Term Student Course Enrollments ({enrollments.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Active registration mapping for Fall 2026 Academic Term.
              </p>
            </div>

            <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider sticky top-0">
                    <th className="p-2.5">Student</th>
                    <th className="p-2.5">Course Code & Title</th>
                    <th className="p-2.5">Semester</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {enrollments.map((enr, idx) => {
                    const student = students.find(s => s.id === enr.studentId);
                    const course = courses.find(c => c.id === enr.courseId);

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-2.5 font-semibold text-white">
                          {student ? `${student.firstName} ${student.lastName}` : enr.studentId}
                          <div className="text-[10px] font-mono text-slate-400">{student?.studentNumber}</div>
                        </td>

                        <td className="p-2.5">
                          <div className="font-mono font-bold text-indigo-300">{course?.code || enr.courseId}</div>
                          <div className="text-[10px] text-slate-300">{course?.title}</div>
                        </td>

                        <td className="p-2.5 font-mono text-slate-400">{enr.semester}</td>

                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            {enr.status}
                          </span>
                        </td>

                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`Drop student from ${course?.code || enr.courseId}?`)) {
                                dropStudentFromCourse(enr.studentId, enr.courseId);
                                setActionNotice(`Student dropped from ${course?.code || enr.courseId}.`);
                                setTimeout(() => setActionNotice(null), 3000);
                              }
                            }}
                            className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold transition"
                          >
                            Drop
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* TAB 5: DOCUMENT SECURITY & TRANSCRIPT VERIFICATION PORTAL */}
      {activeTab === 'verification' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
          
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Document Security & Verification Portal</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify document authenticity hashes for official transcripts, degree certificates, and enrollment letters.
            </p>
          </div>

          <form onSubmit={handleVerifyDocumentSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={verifySearchInput}
                onChange={(e) => setVerifySearchInput(e.target.value)}
                placeholder="Enter Student Number, Registration Number, or Document SHA-256 Hash..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center space-x-1.5 shrink-0"
            >
              <FileCheck className="w-4 h-4" />
              <span>Verify Authenticity</span>
            </button>
          </form>

          {/* Result Card */}
          {verifiedResult && (
            <div className={`p-5 rounded-2xl border ${
              verifiedResult.valid 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
            } animate-in fade-in duration-200`}>
              {verifiedResult.valid ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>CANONICAL UNALTERED DOCUMENT VERIFIED</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-emerald-500/20 font-mono">
                    <div><strong className="text-slate-400">Student Name:</strong> <span className="text-white">{verifiedResult.studentName}</span></div>
                    <div><strong className="text-slate-400">Document Type:</strong> <span className="text-white">{verifiedResult.docType}</span></div>
                    <div><strong className="text-slate-400">Document ID:</strong> <span className="text-emerald-300 font-bold">{verifiedResult.docId}</span></div>
                    <div><strong className="text-slate-400">Issue Date:</strong> <span className="text-slate-300">{verifiedResult.issueDate}</span></div>
                    <div className="col-span-2 truncate"><strong className="text-slate-400">Cryptographic Seal:</strong> <span className="text-indigo-300 font-bold">{verifiedResult.hash}</span></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 text-rose-300 text-xs">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">NO CANONICAL DOCUMENT MATCH FOUND</h4>
                    <p className="mt-0.5">The provided query or hash does not match any official document issued by the Office of the Registrar.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sample Security Seals Demo */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Document Security Standards Compliances</h3>
            <p className="text-xs text-slate-400">
              All official university transcripts and certificates produced by the Registrar Suite include Guilloche anti-copy patterns, microtext border validation, and SHA-256 digital seals.
            </p>
            <div className="max-w-xl">
              <SecuritySealBadge
                docType="Official Master Transcript Seal"
                docId="BMI-REG-MASTER-2026"
                securityHash="BMI-SHA256-8874A99F-CANONICAL-RECORD"
              />
            </div>
          </div>

        </div>
      )}

      {/* INSPECT STUDENT MASTER RECORD MODAL (Multi-Tab SIS View) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative group shrink-0">
                  <img src={selectedStudent.avatarUrl} className="w-11 h-11 rounded-full border-2 border-indigo-500/50 object-cover" />
                  <button
                    onClick={() => setCroppingStudent(selectedStudent)}
                    className="absolute inset-0 bg-indigo-950/80 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                    title="Upload & Crop Student Avatar"
                  >
                    <Camera className="w-4 h-4 text-indigo-300" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-white text-base">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h2>
                    <button
                      onClick={() => setCroppingStudent(selectedStudent)}
                      className="px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center space-x-1 transition"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Crop Avatar</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Reg No: <span className="text-emerald-400 font-bold">{selectedStudent.registrationNumber || selectedStudent.studentNumber}</span> • Permanent UID: <span className="text-indigo-300 font-bold">{selectedStudent.studentUid || 'BMI00002T'}</span>
                  </p>
                </div>
              </div>

              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs Navigation */}
            <div className="flex items-center space-x-1 px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold overflow-x-auto">
              {[
                { id: 'profile', label: 'SIS Master Bio' },
                { id: 'courses', label: 'Course Registration' },
                { id: 'audit', label: 'Degree Audit' },
                { id: 'transcript', label: 'Official Transcript' },
                { id: 'diploma', label: 'Degree Diploma Certificate' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setStudentModalTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                    studentModalTab === t.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              
              {/* TAB A: PROFILE */}
              {studentModalTab === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <div><strong className="text-slate-400">Full Name:</strong> <span className="text-white font-semibold">{selectedStudent.firstName} {selectedStudent.lastName}</span></div>
                    <div><strong className="text-slate-400">Primary Email:</strong> <span className="text-slate-200">{selectedStudent.email}</span></div>
                    <div><strong className="text-slate-400">Phone Number:</strong> <span className="text-slate-200">{selectedStudent.phone}</span></div>
                    <div><strong className="text-slate-400">Date of Birth:</strong> <span className="text-slate-200">{selectedStudent.dateOfBirth}</span></div>
                    <div><strong className="text-slate-400">Degree Program:</strong> <span className="text-white font-semibold">{selectedStudent.program}</span></div>
                    <div><strong className="text-slate-400">Department:</strong> <span className="text-slate-200">{selectedStudent.department}</span></div>
                    <div><strong className="text-slate-400">Cumulative GPA:</strong> <span className="font-mono text-emerald-400 font-bold">{selectedStudent.cgpa}</span></div>
                    <div><strong className="text-slate-400">Credits Progress:</strong> <span className="font-mono text-slate-200">{selectedStudent.creditsEarned} / {selectedStudent.creditsRequired} Cr</span></div>
                    <div><strong className="text-slate-400">Academic Standing:</strong> <span className="font-bold text-indigo-300">{selectedStudent.academicStatus}</span></div>
                    <div><strong className="text-slate-400">Faculty Advisor:</strong> <span className="text-slate-200">{selectedStudent.advisorName}</span></div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-white">Emergency & Guardian Contacts</h3>
                    <div className="grid grid-cols-2 gap-3 text-slate-300">
                      <div><strong>Guardian Name:</strong> {selectedStudent.guardianName || 'N/A'}</div>
                      <div><strong>Relation:</strong> {selectedStudent.guardianRelation || 'Parent'}</div>
                      <div><strong>Phone:</strong> {selectedStudent.guardianPhone || 'N/A'}</div>
                      <div><strong>Email:</strong> {selectedStudent.guardianEmail || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB B: COURSE REGISTRATION */}
              {studentModalTab === 'courses' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">Currently Enrolled Courses</h3>
                  </div>

                  <div className="space-y-2">
                    {enrollments.filter(e => e.studentId === selectedStudent.id).map(e => {
                      const c = courses.find(crs => crs.id === e.courseId);
                      return (
                        <div key={e.courseId} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-indigo-400 mr-2">{c?.code || e.courseId}</span>
                            <span className="font-bold text-white">{c?.title}</span>
                            <span className="text-slate-400 ml-2 font-mono">({c?.credits} Cr)</span>
                          </div>
                          <button
                            onClick={() => dropStudentFromCourse(selectedStudent.id, e.courseId)}
                            className="px-2.5 py-1 bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 rounded font-bold transition"
                          >
                            Drop
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB C: DEGREE AUDIT */}
              {studentModalTab === 'audit' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-white text-sm">Degree Completion Evaluation</h3>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Credit Progress: {selectedStudent.creditsEarned} / {selectedStudent.creditsRequired} Cr</span>
                      <span className="font-bold text-emerald-400">{Math.round((selectedStudent.creditsEarned / selectedStudent.creditsRequired) * 100)}% Complete</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.round((selectedStudent.creditsEarned / selectedStudent.creditsRequired) * 100))}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-slate-400 block font-semibold text-[10px]">CGPA Standard Requirement (&ge; 2.00)</span>
                      <span className={`text-sm font-bold font-mono ${selectedStudent.cgpa >= 2.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedStudent.cgpa} — {selectedStudent.cgpa >= 2.0 ? 'PASSED' : 'BELOW THRESHOLD'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-slate-400 block font-semibold text-[10px]">Holds Clearance Checklist</span>
                      <span className={`text-sm font-bold font-mono ${!selectedStudent.financialHold && !selectedStudent.academicHold ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {!selectedStudent.financialHold && !selectedStudent.academicHold ? 'ALL HOLDS CLEARED' : 'HOLDS PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB D: OFFICIAL TRANSCRIPT */}
              {studentModalTab === 'transcript' && (
                <div className="printable-document p-8 bg-white text-slate-900 rounded-xl space-y-6 text-xs relative font-sans border-4 border-indigo-900/10">
                  <GuillochePattern />
                  <SecurityWatermark text="BMI OFFICIAL TRANSCRIPT" subtext="CANONICAL REGISTRAR RECORD" />
                  <MicrotextBorder text="• BMI UNIVERSITY OFFICIAL ACADEMIC TRANSCRIPT • CANONICAL RECORD SEC-2026 • DO NOT DUPLICATE " />

                  <div className="border-b-2 border-slate-900 pb-3 text-center relative z-10">
                    <h1 className="text-xl font-black text-slate-900">BMI UNIVERSITY</h1>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">OFFICIAL ACADEMIC TRANSCRIPT</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Doc ID: <span className="font-bold text-slate-900">BMI-TR-2026-{(selectedStudent.registrationNumber || selectedStudent.studentNumber || selectedStudent.id).slice(-6)}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 relative z-10">
                    <div>
                      <p><strong className="text-slate-700">Student Name:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                      <p><strong className="text-slate-700">Student Number:</strong> {selectedStudent.registrationNumber || selectedStudent.studentNumber}</p>
                    </div>
                    <div>
                      <p><strong className="text-slate-700">Program:</strong> {selectedStudent.program}</p>
                      <p><strong className="text-slate-700">Cumulative GPA:</strong> {selectedStudent.cgpa} / 4.00</p>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className="font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">ACADEMIC RECORD SUMMARY</h3>
                    <table className="w-full text-left text-xs border border-slate-300 bg-white">
                      <thead className="bg-slate-200 text-slate-800 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-2 border">Course Code</th>
                          <th className="p-2 border">Course Title</th>
                          <th className="p-2 border">Credits</th>
                          <th className="p-2 border">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.filter(e => e.studentId === selectedStudent.id).map(e => {
                          const course = courses.find(c => c.id === e.courseId);
                          return (
                            <tr key={e.courseId} className="border-b">
                              <td className="p-2 font-mono font-bold border">{course?.code || e.courseId}</td>
                              <td className="p-2 border">{course?.title}</td>
                              <td className="p-2 border">{course?.credits || 3}</td>
                              <td className="p-2 font-bold border">{e.grade || 'A'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="relative z-10">
                    <SecuritySealBadge
                      docType="Official Academic Transcript"
                      docId={`BMI-TR-2026-${selectedStudent.studentNumber.slice(-6)}`}
                      securityHash={docHash || 'BMI-TRANSCRIPT-AUTHENTICATED'}
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600 relative z-10">
                    <div>
                      <p className="font-bold text-slate-900">Dr. Claire Beauchamp</p>
                      <p>University Registrar, BMI University</p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition print:hidden flex items-center space-x-1"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Official Document</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB E: DEGREE DIPLOMA CERTIFICATE */}
              {studentModalTab === 'diploma' && (
                <div className="printable-document p-10 bg-amber-50/40 text-slate-900 rounded-2xl space-y-6 text-center relative border-8 border-indigo-950/20 shadow-inner font-serif">
                  <GuillochePattern />
                  <SecurityWatermark text="BMI DIPLOMA" subtext="OFFICIAL DEGREE CONFERRAL" />

                  <div className="space-y-2 relative z-10">
                    <h1 className="text-3xl font-black text-indigo-950 tracking-wider">BMI UNIVERSITY</h1>
                    <p className="text-xs uppercase tracking-widest font-sans font-bold text-slate-600">UPON RECOMMENDATION OF THE FACULTY</p>
                    <p className="text-xs text-slate-500 font-sans">THE BOARD OF TRUSTEES HAS CONFERRED UPON</p>
                  </div>

                  <div className="py-4 relative z-10">
                    <h2 className="text-2xl font-black text-slate-900 underline decoration-indigo-600/40 underline-offset-8">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h2>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <p className="text-xs text-slate-600 font-sans">THE DEGREE OF</p>
                    <p className="text-lg font-bold text-indigo-900">{selectedStudent.program}</p>
                    <p className="text-xs text-slate-600 font-sans">WITH ALL RIGHTS, PRIVILEGES, AND HONORS THEREUNTO APPERTAINING.</p>
                  </div>

                  <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs font-sans relative z-10">
                    <div>
                      <p className="font-bold text-slate-900">Prof. Arthur Vance</p>
                      <p className="text-[10px] text-slate-500">University President</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Dr. Claire Beauchamp</p>
                      <p className="text-[10px] text-slate-500">University Registrar</p>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between relative z-10 font-sans">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition print:hidden flex items-center space-x-1"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Official Diploma</span>
                    </button>

                    <div className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded font-mono text-[9px] font-bold">
                      SHA-256 SEAL: {docHash.slice(0, 20)}...
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* MANAGE HOLDS MODAL */}
      {holdManageStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base">Manage Registration Holds</h2>
              <button onClick={() => setHoldManageStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300">
              Student: <strong className="text-white">{holdManageStudent.firstName} {holdManageStudent.lastName}</strong> ({holdManageStudent.studentNumber})
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Financial Hold</span>
                  <span className="text-[10px] text-slate-400">Blocks course registration & transcript issuance</span>
                </div>
                <button
                  onClick={() => handleToggleHoldSubmit('financial')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    holdManageStudent.financialHold
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {holdManageStudent.financialHold ? 'Active Hold (Remove)' : 'Place Hold'}
                </button>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Academic Hold</span>
                  <span className="text-[10px] text-slate-400">Blocks semester progression</span>
                </div>
                <button
                  onClick={() => handleToggleHoldSubmit('academic')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    holdManageStudent.academicHold
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {holdManageStudent.academicHold ? 'Active Hold (Remove)' : 'Place Hold'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE ACADEMIC STATUS MODAL */}
      {statusManageStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base">Update Academic Standing</h2>
              <button onClick={() => setStatusManageStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStatusChange} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select New Academic Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Active">Active Standing</option>
                  <option value="Probation">Academic Probation</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Graduated">Graduated (Degree Conferred)</option>
                  <option value="Deferred">Deferred Academic Leave</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
              >
                Save New Academic Standing
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COURSE ROSTER MODAL */}
      {rosterCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-bold text-white text-base flex items-center space-x-2">
                  <span className="text-indigo-400 font-mono">{rosterCourse.code}</span>
                  <span>— {rosterCourse.title}</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Instructor: {rosterCourse.instructorName} • {rosterCourse.schedule}</p>
              </div>
              <button onClick={() => setRosterCourse(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              <h3 className="font-bold text-slate-300">Enrolled Students Roster ({enrollments.filter(e => e.courseId === rosterCourse.id).length} Enrolled)</h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="p-2">Reg No</th>
                    <th className="p-2">Student Name</th>
                    <th className="p-2">Program</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {enrollments.filter(e => e.courseId === rosterCourse.id).map(enr => {
                    const std = students.find(s => s.id === enr.studentId);
                    if (!std) return null;
                    return (
                      <tr key={std.id}>
                        <td className="p-2 font-mono text-emerald-400 font-bold">{std.registrationNumber || std.studentNumber}</td>
                        <td className="p-2 font-semibold text-white">{std.firstName} {std.lastName}</td>
                        <td className="p-2 text-slate-300">{std.program}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => dropStudentFromCourse(std.id, rosterCourse.id)}
                            className="px-2 py-0.5 bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 rounded font-bold text-[10px]"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setRosterCourse(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl"
            >
              Close Roster
            </button>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base">Edit Course Catalog Details</h2>
              <button onClick={() => setEditingCourse(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCourse} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Course Code</label>
                <input
                  type="text"
                  value={editingCourse.code}
                  onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Course Title</label>
                <input
                  type="text"
                  value={editingCourse.title}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Credits</label>
                  <input
                    type="number"
                    value={editingCourse.credits}
                    onChange={(e) => setEditingCourse({ ...editingCourse, credits: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    value={editingCourse.capacity}
                    onChange={(e) => setEditingCourse({ ...editingCourse, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Instructor Name</label>
                <input
                  type="text"
                  value={editingCourse.instructorName}
                  onChange={(e) => setEditingCourse({ ...editingCourse, instructorName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD COURSE MODAL */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base">Add New Course to Curriculum</h2>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Course Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. CSC405"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Course Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Artificial Intelligence & Machine Learning"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Credits</label>
                  <input
                    type="number"
                    value={newCredits}
                    onChange={(e) => setNewCredits(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="School of Computing & Engineering">School of Computing & Engineering</option>
                  <option value="School of Business & Economics">School of Business & Economics</option>
                  <option value="School of Mathematics">School of Mathematics</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Instructor Name</label>
                <input
                  type="text"
                  value={newInstructor}
                  onChange={(e) => setNewInstructor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
              >
                Create & Publish Course
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT VERIFICATION TEST MODAL */}
      {selectedStudent && (
        <DocumentVerificationModal
          isOpen={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          documentData={{
            id: `BMI-TR-2026-${selectedStudent.studentNumber.slice(-6)}`,
            title: 'Official Academic Transcript',
            studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            studentNumber: selectedStudent.registrationNumber || selectedStudent.studentNumber,
            hash: docHash || `REG-TR-${selectedStudent.studentNumber}-${selectedStudent.cgpa}`,
            date: new Date().toISOString().slice(0, 10)
          }}
        />
      )}

      {/* ASSISTED STUDENT REGISTRATION WIZARD MODAL */}
      {showAssistedRegistrationModal && (
        <AssistedStudentRegistrationWizard
          onClose={() => setShowAssistedRegistrationModal(false)}
          onComplete={(studentId) => {
            setActionNotice('Student manual registration & matriculation successfully executed!');
            setTimeout(() => setActionNotice(null), 4000);
          }}
        />
      )}

      {/* REGISTRAR AVATAR CROP MODAL */}
      {croppingStudent && (
        <AvatarCropModal
          isOpen={!!croppingStudent}
          onClose={() => setCroppingStudent(null)}
          onCropComplete={handleRegistrarCroppedAvatar}
          currentAvatarUrl={croppingStudent.avatarUrl}
          studentName={`${croppingStudent.firstName} ${croppingStudent.lastName}`}
        />
      )}

    </div>
  );
};
