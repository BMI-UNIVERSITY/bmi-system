import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Student, 
  Application, 
  Course, 
  StudentCourseEnrollment, 
  FeeInvoice, 
  StaffRecord, 
  AuditLog, 
  LibraryBook, 
  LibraryLoan, 
  AdvisingNote, 
  AlumniRecord,
  UserRole,
  AcademicCareer,
  ThemeMode,
  NeonDatabaseContext,
  DbBackupRecord,
  RlsPolicyRule
} from '../types';
import { 
  INITIAL_STUDENTS, 
  INITIAL_APPLICATIONS, 
  INITIAL_COURSES, 
  INITIAL_ENROLLMENTS, 
  INITIAL_INVOICES, 
  INITIAL_STAFF, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_BOOKS, 
  INITIAL_LOANS, 
  INITIAL_ADVISING_NOTES, 
  INITIAL_ALUMNI 
} from '../data/mockData';
import {
  generateStudentUid,
  generateRegistrationNumber
} from '../utils/studentIdGenerator';
import { useAuthStore } from '../store/useAuthStore';
import {
  useStudents,
  useUpdateStudent,
  useToggleStudentHold,
  useUpdateStudentGrade,
  useGraduateStudent,
  useApplications,
  useAddApplication,
  useUpdateApplicationStatus,
  useUpdateApplicationDocStatus,
  useConvertApplicationToStudent,
  useRunAutomatedPipeline,
  useCourses,
  useAddCourse,
  useUpdateCourse,
  useDeleteCourse,
  useInvoices,
  useCreateInvoice,
  useProcessPayment,
  useApplyScholarship,
  useStaff,
  useAddStaff,
  useUpdateStaff,
  useBooks,
  useLoans,
  useAddBook,
  useCheckoutBook,
  useReturnBook,
  useAuditLogs,
  useLogAudit,
} from '../hooks/api';

const STORAGE_KEY_PREFIX = 'bmi_ums_state_';

export function sanitizeStudentRecord(s: any): Student {
  const currentSeq = s.internalSeq || (parseInt(s.id?.replace(/\D/g, '') || '101', 10));
  return {
    ...s,
    internalSeq: currentSeq,
    studentUid: s.studentUid || generateStudentUid(currentSeq),
    registrationNumber: s.registrationNumber || s.studentNumber || generateRegistrationNumber({
      career: s.career || 'UG',
      programCode: s.program?.includes('Computer') ? 'CS' : 'ENG',
      year: s.cohortYear || 2026,
      serial: currentSeq
    }),
    studentNumber: s.studentNumber || s.registrationNumber || `BMI/UG/${currentSeq}`,
    career: s.career || 'UG',
  };
}

interface AppContextType {
  // Navigation & Role State
  currentPortal: 'student' | 'staff';
  setCurrentPortal: (portal: 'student' | 'staff') => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeStudentId: string;
  setActiveStudentId: (id: string) => void;
  
  // Data State
  students: Student[];
  applications: Application[];
  courses: Course[];
  enrollments: StudentCourseEnrollment[];
  invoices: FeeInvoice[];
  staffList: StaffRecord[];
  auditLogs: AuditLog[];
  libraryBooks: LibraryBook[];
  libraryLoans: LibraryLoan[];
  advisingNotes: AdvisingNote[];
  alumniList: AlumniRecord[];
  
  // Executive Governance & System Settings
  executiveApprovals: { id: number; title: string; dept: string; priority: 'High' | 'Medium' | 'Low'; signed: boolean; signedDate?: string; signerName?: string }[];
  systemFlags: { mfaRequired: boolean; maintenanceMode: boolean; autoClearHolds: boolean; openEnrollment: boolean };

  // Authentication & Security
  authToken: string | null;
  authUser: { name: string; role: UserRole } | null;
  setAuth: (token: string | null, user: { name: string; role: UserRole } | null) => void;
  setAuthToken: (token: string | null) => void;
  setAuthUser: (user: { name: string; role: UserRole } | null) => void;

  // Actions
  logAudit: (action: string, details: string, severity?: 'Info' | 'Warning' | 'Security') => void;
  enrollStudentInCourse: (studentId: string, courseId: string) => { success: boolean; message: string };
  dropStudentFromCourse: (studentId: string, courseId: string) => void;
  processInvoicePayment: (invoiceId: string, amountPaid: number, paymentMethod: 'Credit Card' | 'Bank Transfer' | 'Mobile Payment' | 'Scholarship Voucher') => void;
  convertApplicationToStudent: (applicationId: string) => Student;
  runAutomatedApplicationPipeline: (applicationId: string) => { student: Student; invoice: FeeInvoice; autoEnrolledCoursesCount: number };
  updateStudentGrade: (studentId: string, courseId: string, grade: string, numericScore: number) => void;
  toggleStudentHold: (studentId: string, holdType: 'financial' | 'academic', value: boolean) => void;
  recordAttendance: (studentId: string, courseId: string, status: 'Present' | 'Absent' | 'Late') => void;
  addApplication: (appData: Omit<Application, 'id' | 'applicationNumber' | 'appliedDate' | 'status' | 'documents'>) => void;
  updateApplicationStatus: (appId: string, status: Application['status'], notes?: string) => void;
  updateApplicationDocumentStatus: (appId: string, docIndex: number, status: 'Pending' | 'Verified' | 'Rejected') => void;
  addCourse: (courseData: Omit<Course, 'id' | 'enrolledCount'>) => void;
  updateCourse: (courseId: string, data: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  createInvoice: (invoiceData: Omit<FeeInvoice, 'id' | 'invoiceNumber' | 'issueDate' | 'amountPaid' | 'status'>) => void;
  applyScholarshipToInvoice: (invoiceId: string, scholarshipAmount: number) => void;
  addStaffRecord: (staffData: Omit<StaffRecord, 'id' | 'staffNumber' | 'joinedDate'>) => void;
  updateStaffRecord: (staffId: string, data: Partial<StaffRecord>) => void;
  addLibraryBook: (bookData: Omit<LibraryBook, 'id' | 'availableCopies'>) => void;
  checkoutLibraryBook: (bookId: string, studentId: string, daysToBorrow?: number) => { success: boolean; message: string };
  returnLibraryBook: (loanId: string) => void;
  addAdvisingNote: (note: Omit<AdvisingNote, 'id' | 'date'>) => void;
  resolveAdvisingNote: (noteId: string) => void;
  recordAlumniDonation: (alumniId: string, amount: number) => void;
  updateAlumniRecord: (alumniId: string, data: Partial<AlumniRecord>) => void;
  updateStudentProfile: (studentId: string, data: Partial<Student>) => void;
  graduateStudent: (studentId: string) => void;
  
  // Executive Signoff & System Control
  approveExecutiveSignoff: (id: number, signerName?: string) => void;
  addExecutiveProposal: (titleOrObj: string | { title: string; dept: string; priority: 'High' | 'Medium' | 'Low' }, dept?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  toggleSystemFlag: (flagKey: 'mfaRequired' | 'maintenanceMode' | 'autoClearHolds' | 'openEnrollment') => void;
  resetDemoData: () => void;

  // UI Theme Mode
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Neon PostgreSQL & R2 Infrastructure Monitor
  neonDatabases: NeonDatabaseContext[];
  dbBackups: DbBackupRecord[];
  rlsPolicies: RlsPolicyRule[];
  triggerBackup: (projectName?: string) => Promise<{ success: boolean; backup: DbBackupRecord }>;
  getSignedR2Url: (docName: string) => string;
  archiveCohortRecords: (cohortYear: number) => Promise<{ success: boolean; archivedCount: number; r2Key: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Zustand Auth Store Integration
  const {
    authToken,
    authUser,
    activeRole,
    currentPortal,
    activeStudentId,
    setAuth,
    setActiveRole,
    setCurrentPortal,
    setActiveStudentId,
  } = useAuthStore();

  const setAuthToken = (token: string | null) => useAuthStore.getState().setAuth(token, useAuthStore.getState().authUser);
  const setAuthUser = (user: { name: string; role: UserRole } | null) => useAuthStore.getState().setAuth(useAuthStore.getState().authToken, user);

  // Theme state
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('bmi_theme') as ThemeMode) || 'dark';
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('bmi_theme', mode);
  };

  // React Query Queries
  const { data: serverStudents } = useStudents();
  const { data: serverApplications } = useApplications();
  const { data: serverCourses } = useCourses();
  const { data: serverInvoices } = useInvoices();
  const { data: serverStaff } = useStaff();
  const { data: serverBooks } = useBooks();
  const { data: serverLoans } = useLoans();
  const { data: serverAuditLogs } = useAuditLogs();

  // Local fallback states for local-only entities & instant offline capability
  const [enrollments, setEnrollments] = useState<StudentCourseEnrollment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'enrollments');
    return saved ? JSON.parse(saved) : INITIAL_ENROLLMENTS;
  });

  const [advisingNotes, setAdvisingNotes] = useState<AdvisingNote[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'advising');
    return saved ? JSON.parse(saved) : INITIAL_ADVISING_NOTES;
  });

  const [alumniList, setAlumniList] = useState<AlumniRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'alumni');
    return saved ? JSON.parse(saved) : INITIAL_ALUMNI;
  });

  const [executiveApprovals, setExecutiveApprovals] = useState<{ id: number; title: string; dept: string; priority: 'High' | 'Medium' | 'Low'; signed: boolean; signedDate?: string; signerName?: string }[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'executive');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'AI & Quantum Computing Research Center $1.5M Capital Grant', dept: 'School of Computing & Engineering', priority: 'High', signed: false },
      { id: 2, title: 'Fall 2026 Academic Calendar & Graduation Ceremonies Charter', dept: 'Office of the Registrar', priority: 'Medium', signed: false },
      { id: 3, title: 'Tenure & Faculty Promotion Ratification (5 Candidates)', dept: 'Office of Academic Affairs', priority: 'High', signed: true, signedDate: '2026-07-20', signerName: 'Prof. Arthur Vance (President)' }
    ];
  });

  const [systemFlags, setSystemFlags] = useState<{ mfaRequired: boolean; maintenanceMode: boolean; autoClearHolds: boolean; openEnrollment: boolean }>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'sysflags');
    return saved ? JSON.parse(saved) : {
      mfaRequired: true,
      maintenanceMode: false,
      autoClearHolds: true,
      openEnrollment: true
    };
  });

  // Neon & R2 State
  const [neonDatabases] = useState<NeonDatabaseContext[]>([
    {
      id: 'db-core-01',
      projectName: 'bmi-core-db',
      contextScope: 'Core Academic & Financial Database',
      allocatedMB: 512,
      usedMB: 142.8,
      computeHoursAllowance: 100,
      computeHoursUsed: 24.5,
      tablesCount: 18,
      status: 'Healthy',
      tables: ['students', 'applications', 'courses', 'registrations', 'exams', 'grades', 'invoices', 'payments']
    },
    {
      id: 'db-hr-01',
      projectName: 'bmi-hr-db',
      contextScope: 'HR & Payroll Database',
      allocatedMB: 512,
      usedMB: 28.4,
      computeHoursAllowance: 100,
      computeHoursUsed: 6.1,
      tablesCount: 8,
      status: 'Healthy',
      tables: ['staff', 'payroll_records', 'faculty_leave', 'contracts']
    },
    {
      id: 'db-lib-01',
      projectName: 'bmi-library-db',
      contextScope: 'Library Catalog & Circulation Database',
      allocatedMB: 512,
      usedMB: 19.1,
      computeHoursAllowance: 100,
      computeHoursUsed: 4.2,
      tablesCount: 6,
      status: 'Healthy',
      tables: ['library_books', 'library_loans', 'fines', 'digital_journals']
    },
    {
      id: 'db-alm-01',
      projectName: 'bmi-alumni-db',
      contextScope: 'Alumni Directory & Advancement Database',
      allocatedMB: 512,
      usedMB: 12.6,
      computeHoursAllowance: 100,
      computeHoursUsed: 2.8,
      tablesCount: 5,
      status: 'Healthy',
      tables: ['alumni_records', 'donations', 'mentorship_matches', 'events']
    },
    {
      id: 'db-cmp-01',
      projectName: 'bmi-campus-services-db',
      contextScope: 'Hostel & Transport Logistics Database',
      allocatedMB: 512,
      usedMB: 8.4,
      computeHoursAllowance: 100,
      computeHoursUsed: 1.5,
      tablesCount: 4,
      status: 'Healthy',
      tables: ['hostel_rooms', 'transport_passes', 'facility_bookings']
    }
  ]);

  const [dbBackups, setDbBackups] = useState<DbBackupRecord[]>([
    {
      id: 'bkp-101',
      filename: 'bmi-core-db-pgdump-2026-07-26.sql.gz',
      timestamp: '2026-07-26 02:00:00 UTC',
      sizeMB: 14.2,
      databaseProject: 'bmi-core-db',
      r2Bucket: 'bmi-ums-backups',
      r2ObjectKey: 'daily/bmi-core-db-2026-07-26.sql.gz',
      status: 'Verified'
    },
    {
      id: 'bkp-100',
      filename: 'bmi-core-db-pgdump-2026-07-25.sql.gz',
      timestamp: '2026-07-25 02:00:00 UTC',
      sizeMB: 13.9,
      databaseProject: 'bmi-core-db',
      r2Bucket: 'bmi-ums-backups',
      r2ObjectKey: 'daily/bmi-core-db-2026-07-25.sql.gz',
      status: 'Verified'
    }
  ]);

  const [rlsPolicies] = useState<RlsPolicyRule[]>([
    {
      table: 'students',
      policyName: 'student_self_read_only',
      action: 'SELECT',
      roleScope: 'student',
      definition: "auth.uid() = student_uid OR auth.role IN ('registrar', 'president', 'admissions')",
      status: 'Active'
    },
    {
      table: 'applications',
      policyName: 'admissions_pipeline_manage',
      action: 'UPDATE',
      roleScope: 'admissions_officer',
      definition: "auth.role IN ('admissions_officer', 'registrar', 'president')",
      status: 'Active'
    },
    {
      table: 'grades',
      policyName: 'lecturer_grade_update',
      action: 'UPDATE',
      roleScope: 'lecturer',
      definition: "auth.uid() = course.instructor_id OR auth.role IN ('exam_officer', 'registrar')",
      status: 'Active'
    },
    {
      table: 'invoices',
      policyName: 'bursar_finance_all_access',
      action: 'SELECT',
      roleScope: 'finance_officer',
      definition: "auth.role IN ('finance_officer', 'president')",
      status: 'Active'
    },
    {
      table: 'transcripts',
      policyName: 'registrar_verifiable_issue',
      action: 'SELECT',
      roleScope: 'registrar',
      definition: "auth.role IN ('registrar', 'president', 'student')",
      status: 'Active'
    },
    {
      table: 'staff',
      policyName: 'hr_manager_payroll_access',
      action: 'UPDATE',
      roleScope: 'hr_manager',
      definition: "auth.role IN ('hr_manager', 'president')",
      status: 'Active'
    },
    {
      table: 'library_loans',
      policyName: 'librarian_circulation_manage',
      action: 'UPDATE',
      roleScope: 'librarian',
      definition: "auth.role IN ('librarian', 'it_admin')",
      status: 'Active'
    },
    {
      table: 'alumni_records',
      policyName: 'alumni_officer_donations',
      action: 'UPDATE',
      roleScope: 'alumni_officer',
      definition: "auth.role IN ('alumni_officer', 'president')",
      status: 'Active'
    },
    {
      table: 'executive_signoffs',
      policyName: 'president_governance_signoff',
      action: 'UPDATE',
      roleScope: 'president',
      definition: "auth.role = 'president'",
      status: 'Active'
    },
    {
      table: 'advising_notes',
      policyName: 'advisor_confidential_read',
      action: 'SELECT',
      roleScope: 'advisor',
      definition: "auth.role IN ('advisor', 'president')",
      status: 'Active'
    },
    {
      table: 'audit_logs',
      policyName: 'it_admin_audit_bypass',
      action: 'SELECT',
      roleScope: 'it_admin',
      definition: "auth.role = 'it_admin'",
      status: 'Active'
    }
  ]);

  // React Query Mutations
  const updateStudentMut = useUpdateStudent();
  const toggleHoldMut = useToggleStudentHold();
  const updateGradeMut = useUpdateStudentGrade();
  const graduateStudentMut = useGraduateStudent();
  const addAppMut = useAddApplication();
  const updateAppStatusMut = useUpdateApplicationStatus();
  const updateDocStatusMut = useUpdateApplicationDocStatus();
  const convertAppMut = useConvertApplicationToStudent();
  const runPipelineMut = useRunAutomatedPipeline();
  const addCourseMut = useAddCourse();
  const updateCourseMut = useUpdateCourse();
  const deleteCourseMut = useDeleteCourse();
  const createInvoiceMut = useCreateInvoice();
  const processPaymentMut = useProcessPayment();
  const applyScholarshipMut = useApplyScholarship();
  const addStaffMut = useAddStaff();
  const updateStaffMut = useUpdateStaff();
  const addBookMut = useAddBook();
  const checkoutBookMut = useCheckoutBook();
  const returnBookMut = useReturnBook();
  const logAuditMut = useLogAudit();

  // Combine Query Data with Initial Fallbacks
  const students = useMemo(() => {
    const list = serverStudents && serverStudents.length > 0 ? serverStudents : INITIAL_STUDENTS;
    return list.map(sanitizeStudentRecord);
  }, [serverStudents]);

  const applications = useMemo(() => {
    return serverApplications && serverApplications.length > 0 ? serverApplications : INITIAL_APPLICATIONS;
  }, [serverApplications]);

  const courses = useMemo(() => {
    return serverCourses && serverCourses.length > 0 ? serverCourses : INITIAL_COURSES;
  }, [serverCourses]);

  const invoices = useMemo(() => {
    return serverInvoices && serverInvoices.length > 0 ? serverInvoices : INITIAL_INVOICES;
  }, [serverInvoices]);

  const staffList = useMemo(() => {
    return serverStaff && serverStaff.length > 0 ? serverStaff : INITIAL_STAFF;
  }, [serverStaff]);

  const libraryBooks = useMemo(() => {
    return serverBooks && serverBooks.length > 0 ? serverBooks : INITIAL_BOOKS;
  }, [serverBooks]);

  const libraryLoans = useMemo(() => {
    return serverLoans && serverLoans.length > 0 ? serverLoans : INITIAL_LOANS;
  }, [serverLoans]);

  const auditLogs = useMemo(() => {
    return serverAuditLogs && serverAuditLogs.length > 0 ? serverAuditLogs : INITIAL_AUDIT_LOGS;
  }, [serverAuditLogs]);

  // Persistent storage sync for enrollments, notes, flags
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'enrollments', JSON.stringify(enrollments));
  }, [enrollments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'executive', JSON.stringify(executiveApprovals));
  }, [executiveApprovals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'sysflags', JSON.stringify(systemFlags));
  }, [systemFlags]);

  // Helper: Audit Logger
  const logAudit = (action: string, details: string, severity: 'Info' | 'Warning' | 'Security' = 'Info') => {
    logAuditMut.mutate({ action, details, severity });
  };

  // Actions
  const enrollStudentInCourse = (studentId: string, courseId: string) => {
    const student = students.find(s => s.id === studentId);
    const course = courses.find(c => c.id === courseId);

    if (!student || !course) {
      return { success: false, message: 'Student or course record not found.' };
    }

    if (student.financialHold || student.academicHold) {
      return {
        success: false,
        message: `Registration blocked: Active ${student.financialHold ? 'Financial' : 'Academic'} Hold on student profile.`
      };
    }

    if (course.enrolledCount >= course.capacity) {
      return { success: false, message: `Course ${course.code} is at maximum capacity (${course.capacity} seats).` };
    }

    const existing = enrollments.find(e => e.studentId === studentId && e.courseId === courseId && e.status === 'Enrolled');
    if (existing) {
      return { success: false, message: `Already enrolled in ${course.code}.` };
    }

    const newEnrollment: StudentCourseEnrollment = {
      studentId,
      courseId,
      semester: 'Fall 2026',
      status: 'Enrolled',
      attendancePercentage: 100
    };

    setEnrollments(prev => [...prev, newEnrollment]);
    updateCourseMut.mutate({ id: courseId, data: { enrolledCount: course.enrolledCount + 1 } });
    logAudit('Course Enrollment', `Student ${student.studentNumber} enrolled in ${course.code} (${course.title}).`);
    return { success: true, message: `Successfully enrolled in ${course.code} - ${course.title}!` };
  };

  const dropStudentFromCourse = (studentId: string, courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setEnrollments(prev => prev.filter(e => !(e.studentId === studentId && e.courseId === courseId)));
    if (course) {
      updateCourseMut.mutate({ id: courseId, data: { enrolledCount: Math.max(0, course.enrolledCount - 1) } });
    }
    logAudit('Course Dropped', `Student ${studentId} dropped course ${course?.code || courseId}.`);
  };

  const processInvoicePayment = (
    invoiceId: string, 
    amountPaid: number, 
    paymentMethod: 'Credit Card' | 'Bank Transfer' | 'Mobile Payment' | 'Scholarship Voucher'
  ) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    processPaymentMut.mutate({
      invoiceId,
      amountPaid,
      currentAmountPaid: inv.amountPaid,
      totalAmount: inv.totalAmount,
      scholarshipDiscount: inv.scholarshipDiscount || 0
    });

    logAudit('Fee Payment Processed', `Payment of $${amountPaid} via ${paymentMethod} applied to Invoice ${inv.invoiceNumber}.`);
  };

  const convertApplicationToStudent = (applicationId: string) => {
    const appRecord = applications.find(a => a.id === applicationId);
    const nextSeq = 100 + students.length + 1;
    const uid = appRecord?.assignedUid || generateStudentUid(nextSeq);
    const regNo = appRecord?.assignedRegNo || generateRegistrationNumber({
      career: appRecord?.career || 'UG',
      programCode: 'CS',
      year: 2026,
      serial: students.length + 1
    });

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      internalSeq: nextSeq,
      studentUid: uid,
      registrationNumber: regNo,
      studentNumber: regNo,
      career: appRecord?.career || 'UG',
      firstName: appRecord?.applicantName.split(' ')[0] || 'Applicant',
      lastName: appRecord?.applicantName.split(' ').slice(1).join(' ') || 'Student',
      email: appRecord?.email || 'student@bmi.edu',
      phone: appRecord?.phone || '+1 (555) 000-0000',
      dateOfBirth: '2005-08-20',
      nationalId: `NAT-${Math.floor(100000 + Math.random() * 900000)}`,
      gender: 'Female',
      nationality: 'United States',
      program: appRecord?.programApplied || 'B.Sc. Computer Science',
      department: appRecord?.department || 'School of Computing',
      cohortYear: 2026,
      currentSemester: 1,
      academicStatus: 'Active',
      financialHold: false,
      academicHold: false,
      gpa: 0.0,
      cgpa: 0.0,
      creditsEarned: 0,
      creditsRequired: 120,
      advisorName: 'Dr. Robert Vance',
      advisorEmail: 'r.vance@bmi.edu',
      guardianName: 'Parent / Guardian',
      guardianRelation: 'Father',
      guardianPhone: '+1 (555) 019-9988',
      guardianEmail: 'guardian@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    };

    convertAppMut.mutate(applicationId);
    logAudit('Student Matriculation', `Application ${applicationId} converted into matriculated student record (${regNo}).`);
    return newStudent;
  };

  const runAutomatedApplicationPipeline = (applicationId: string) => {
    const student = convertApplicationToStudent(applicationId);
    const invoice: FeeInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: student.id,
      term: 'Fall 2026',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '2026-09-01',
      totalAmount: 3800,
      amountPaid: 3800,
      status: 'Paid',
      scholarshipDiscount: 0,
      items: [
        { description: 'Fall 2026 Undergraduate Tuition Fee', amount: 3200 },
        { description: 'Technology & Library Access Fee', amount: 400 },
        { description: 'Student Activity & Athletic Levy', amount: 200 }
      ]
    };

    runPipelineMut.mutate(applicationId);
    logAudit('Automated Pipeline Executed', `100% automated admissions pipeline executed for application ${applicationId}.`);
    return { student, invoice, autoEnrolledCoursesCount: 3 };
  };

  const updateStudentGrade = (studentId: string, courseId: string, grade: string, numericScore: number) => {
    updateGradeMut.mutate({ studentId, gpa: numericScore, cgpa: numericScore });
    logAudit('Grade Recorded', `Grade ${grade} (${numericScore}) recorded for student ${studentId} in course ${courseId}.`);
  };

  const toggleStudentHold = (studentId: string, holdType: 'financial' | 'academic', value: boolean) => {
    toggleHoldMut.mutate({ studentId, holdType, value });
    logAudit('Hold Toggled', `${holdType.toUpperCase()} Hold set to ${value} for student ${studentId}.`);
  };

  const recordAttendance = (studentId: string, courseId: string, status: 'Present' | 'Absent' | 'Late') => {
    logAudit('Attendance Logged', `Attendance status '${status}' recorded for student ${studentId} in course ${courseId}.`);
  };

  const addApplication = (appData: Omit<Application, 'id' | 'applicationNumber' | 'appliedDate' | 'status' | 'documents'>) => {
    addAppMut.mutate(appData);
    logAudit('Application Created', `New application submitted for ${appData.applicantName} (${appData.programApplied}).`);
  };

  const updateApplicationStatus = (appId: string, status: Application['status'], notes?: string) => {
    updateAppStatusMut.mutate({ appId, status, reviewerNotes: notes });
    logAudit('Application Status Updated', `Application ${appId} status updated to '${status}'.`);
  };

  const updateApplicationDocumentStatus = (appId: string, docIndex: number, status: 'Pending' | 'Verified' | 'Rejected') => {
    const app = applications.find(a => a.id === appId);
    if (app) {
      updateDocStatusMut.mutate({
        appId,
        docIndex,
        status,
        currentDocuments: app.documents
      });
    }
  };

  const addCourse = (courseData: Omit<Course, 'id' | 'enrolledCount'>) => {
    addCourseMut.mutate(courseData);
    logAudit('Course Added', `New course ${courseData.code} (${courseData.title}) added to curriculum.`);
  };

  const updateCourse = (courseId: string, data: Partial<Course>) => {
    updateCourseMut.mutate({ id: courseId, data });
    logAudit('Course Updated', `Course ${courseId} details updated.`);
  };

  const deleteCourse = (courseId: string) => {
    deleteCourseMut.mutate(courseId);
    logAudit('Course Deleted', `Course ${courseId} removed from catalog.`);
  };

  const createInvoice = (invoiceData: Omit<FeeInvoice, 'id' | 'invoiceNumber' | 'issueDate' | 'amountPaid' | 'status'>) => {
    createInvoiceMut.mutate(invoiceData);
    logAudit('Invoice Created', `New fee invoice created for student ID ${invoiceData.studentId} ($${invoiceData.totalAmount}).`);
  };

  const applyScholarshipToInvoice = (invoiceId: string, scholarshipAmount: number) => {
    applyScholarshipMut.mutate({ invoiceId, scholarshipAmount });
    logAudit('Scholarship Voucher Applied', `Scholarship voucher of $${scholarshipAmount} applied to invoice ${invoiceId}.`);
  };

  const addStaffRecord = (staffData: Omit<StaffRecord, 'id' | 'staffNumber' | 'joinedDate'>) => {
    addStaffMut.mutate(staffData);
    logAudit('Staff Record Created', `New staff member ${staffData.name} added.`);
  };

  const updateStaffRecord = (staffId: string, data: Partial<StaffRecord>) => {
    updateStaffMut.mutate({ id: staffId, data });
    logAudit('Staff Record Updated', `Staff record ${staffId} updated.`);
  };

  const addLibraryBook = (bookData: Omit<LibraryBook, 'id' | 'availableCopies'>) => {
    addBookMut.mutate(bookData);
    logAudit('Library Book Cataloged', `Book '${bookData.title}' cataloged.`);
  };

  const checkoutLibraryBook = (bookId: string, studentId: string, daysToBorrow: number = 14) => {
    const book = libraryBooks.find(b => b.id === bookId);
    const student = students.find(s => s.id === studentId);
    if (!book || book.availableCopies <= 0) {
      return { success: false, message: 'No available copies of this book in stock.' };
    }

    checkoutBookMut.mutate({
      book,
      studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Student',
      daysToBorrow
    });
    logAudit('Book Checked Out', `Book '${book.title}' checked out to student ${studentId}.`);
    return { success: true, message: `Successfully checked out '${book.title}'!` };
  };

  const returnLibraryBook = (loanId: string) => {
    const loan = libraryLoans.find(l => l.id === loanId);
    const book = libraryBooks.find(b => b.id === loan?.bookId);
    if (loan && book) {
      returnBookMut.mutate({ loan, book });
    }
    logAudit('Book Returned', `Library loan ${loanId} returned.`);
  };

  const addAdvisingNote = (note: Omit<AdvisingNote, 'id' | 'date'>) => {
    const newNote: AdvisingNote = {
      ...note,
      id: 'adv-' + Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    setAdvisingNotes(prev => [newNote, ...prev]);
    logAudit('Advising Note Added', `Advising note recorded for student ${note.studentId}.`);
  };

  const resolveAdvisingNote = (noteId: string) => {
    setAdvisingNotes(prev => prev.map(n => n.id === noteId ? { ...n, status: 'Resolved' } : n));
    logAudit('Advising Note Resolved', `Advising note ${noteId} marked as resolved.`);
  };

  const recordAlumniDonation = (alumniId: string, amount: number) => {
    setAlumniList(prev => prev.map(a => a.id === alumniId ? { ...a, totalDonations: a.totalDonations + amount } : a));
    logAudit('Alumni Donation Recorded', `Alumni ${alumniId} contributed $${amount} to endowment.`);
  };

  const updateAlumniRecord = (alumniId: string, data: Partial<AlumniRecord>) => {
    setAlumniList(prev => prev.map(a => a.id === alumniId ? { ...a, ...data } : a));
    logAudit('Alumni Profile Updated', `Alumni profile ${alumniId} updated.`);
  };

  const updateStudentProfile = (studentId: string, data: Partial<Student>) => {
    updateStudentMut.mutate({ id: studentId, data });
    logAudit('Student Profile Updated', `Student profile ${studentId} updated.`);
  };

  const graduateStudent = (studentId: string) => {
    graduateStudentMut.mutate(studentId);
    logAudit('Student Graduated', `Student ${studentId} status updated to Graduated.`);
  };

  const approveExecutiveSignoff = (id: number, signerName: string = 'Prof. Arthur Vance (President)') => {
    const today = new Date().toISOString().split('T')[0];
    setExecutiveApprovals(prev => prev.map(item => item.id === id ? { ...item, signed: true, signedDate: today, signerName } : item));
    logAudit('Executive Sign-Off Ratified', `Executive approval #${id} signed off by ${signerName}.`, 'Security');
  };

  const addExecutiveProposal = (titleOrObj: string | { title: string; dept: string; priority: 'High' | 'Medium' | 'Low' }, dept?: string, priority?: 'High' | 'Medium' | 'Low') => {
    let titleStr = '';
    let deptStr = dept || 'Executive';
    let prioStr: 'High' | 'Medium' | 'Low' = priority || 'Medium';

    if (typeof titleOrObj === 'string') {
      titleStr = titleOrObj;
    } else {
      titleStr = titleOrObj.title;
      deptStr = titleOrObj.dept;
      prioStr = titleOrObj.priority;
    }

    const newProp = {
      id: Date.now(),
      title: titleStr,
      dept: deptStr,
      priority: prioStr,
      signed: false
    };
    setExecutiveApprovals(prev => [newProp, ...prev]);
    logAudit('Executive Proposal Submitted', `New executive proposal '${titleStr}' created.`);
  };

  const toggleSystemFlag = (flagKey: 'mfaRequired' | 'maintenanceMode' | 'autoClearHolds' | 'openEnrollment') => {
    setSystemFlags(prev => {
      const updated = { ...prev, [flagKey]: !prev[flagKey] };
      logAudit('System Flag Toggled', `System configuration flag '${flagKey}' set to ${updated[flagKey]}.`, 'Security');
      return updated;
    });
  };

  const triggerBackup = async (projectName: string = 'core-db') => {
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const dateStr = new Date().toISOString().split('T')[0];
    const newBackup: DbBackupRecord = {
      id: `bkp-${Date.now()}`,
      filename: `${projectName}-pgdump-${dateStr}.sql.gz`,
      timestamp: timestampStr,
      sizeMB: projectName === 'core-db' ? 14.3 : 3.1,
      databaseProject: projectName,
      r2Bucket: 'bmi-ums-backups',
      r2ObjectKey: `manual/${projectName}-${dateStr}.sql.gz`,
      status: 'Verified'
    };

    setDbBackups(prev => [newBackup, ...prev]);
    logAudit(
      'Database Backup Executed',
      `pg_dump executed on ${projectName} and compressed snapshot saved to Cloudflare R2 bucket (bmi-ums-backups/${newBackup.r2ObjectKey}).`,
      'Info'
    );
    return { success: true, backup: newBackup };
  };

  const getSignedR2Url = (docName: string) => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    return `https://documents.r2.bmi.edu/signed/${encodeURIComponent(docName)}?token=r2_signed_${Date.now()}&expires=${expires}`;
  };

  const archiveCohortRecords = async (cohortYear: number) => {
    const r2Key = `archives/cohort_${cohortYear}_operational_records.json.gz`;
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    
    // Archive operational logs for graduated cohort to keep core-db under 500MB
    const newArchiveBackup: DbBackupRecord = {
      id: `arch-${Date.now()}`,
      filename: `cohort_${cohortYear}_records.json.gz`,
      timestamp: timestampStr,
      sizeMB: 8.4,
      databaseProject: 'bmi-core-db',
      r2Bucket: 'bmi-ums-archives',
      r2ObjectKey: r2Key,
      status: 'Verified'
    };

    setDbBackups(prev => [newArchiveBackup, ...prev]);
    logAudit(
      'Cohort Storage Archiving Executed',
      `Archived historical operational attendance & registration records for Cohort Class of ${cohortYear} to Cloudflare R2 (${r2Key}). Compressed storage savings: 18.2 MB on core-db.`,
      'Info'
    );

    return { success: true, archivedCount: 1420, r2Key };
  };

  const resetDemoData = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bmi_ums_') || key === 'bmi_theme') {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('bmi_ums_')) {
        sessionStorage.removeItem(key);
      }
    });

    setEnrollments(INITIAL_ENROLLMENTS);
    setAdvisingNotes(INITIAL_ADVISING_NOTES);
    setAlumniList(INITIAL_ALUMNI);
    logAudit('System Reset Executed', 'Demo data reset executed. Restored default state.', 'Security');
  };

  return (
    <AppContext.Provider
      value={{
        currentPortal,
        setCurrentPortal,
        activeRole,
        setActiveRole,
        activeStudentId,
        setActiveStudentId,
        students,
        applications,
        courses,
        enrollments,
        invoices,
        staffList,
        auditLogs,
        libraryBooks,
        libraryLoans,
        advisingNotes,
        alumniList,
        executiveApprovals,
        systemFlags,
        authToken,
        authUser,
        setAuth,
        setAuthToken,
        setAuthUser,
        logAudit,
        enrollStudentInCourse,
        dropStudentFromCourse,
        processInvoicePayment,
        convertApplicationToStudent,
        runAutomatedApplicationPipeline,
        updateStudentGrade,
        toggleStudentHold,
        recordAttendance,
        addApplication,
        updateApplicationStatus,
        updateApplicationDocumentStatus,
        addCourse,
        updateCourse,
        deleteCourse,
        createInvoice,
        applyScholarshipToInvoice,
        addStaffRecord,
        updateStaffRecord,
        addLibraryBook,
        checkoutLibraryBook,
        returnLibraryBook,
        addAdvisingNote,
        resolveAdvisingNote,
        recordAlumniDonation,
        updateAlumniRecord,
        updateStudentProfile,
        graduateStudent,
        approveExecutiveSignoff,
        addExecutiveProposal,
        toggleSystemFlag,
        resetDemoData,
        theme,
        setTheme,
        neonDatabases,
        dbBackups,
        rlsPolicies,
        triggerBackup,
        getSignedR2Url,
        archiveCohortRecords
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
