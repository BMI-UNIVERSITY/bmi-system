export type UserRole = 
  | 'student'
  | 'president'
  | 'registrar'
  | 'lecturer'
  | 'admissions'
  | 'finance'
  | 'exam_officer'
  | 'hr_manager'
  | 'advisor'
  | 'librarian'
  | 'alumni_officer'
  | 'housing_officer'
  | 'transport_manager'
  | 'it_admin';

export type AcademicCareer = 'UG' | 'PG' | 'DR' | 'CE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  title?: string;
}

export interface Student {
  id: string;
  internalSeq: number; // Internal database sequence number (e.g. 55646 or 101)
  studentUid: string; // Permanent Lifetime Student UID (e.g. BMI0016UQ) - Never changes
  registrationNumber: string; // Primary Career Registration Number (e.g. BMI/UG-CS/226/001) - Career path based
  studentNumber: string; // Alias synced with registrationNumber
  career: AcademicCareer; // UG, PG, DR, CE
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationalId: string;
  gender: string;
  nationality: string;
  program: string; // e.g. B.Sc. Computer Science
  department: string; // e.g. School of Computing & Engineering
  cohortYear: number;
  currentSemester: number;
  academicStatus: 'Active' | 'Probation' | 'Suspended' | 'Graduated' | 'Deferred';
  financialHold: boolean;
  academicHold: boolean;
  gpa: number;
  cgpa: number;
  creditsEarned: number;
  creditsRequired: number;
  advisorName: string;
  advisorEmail: string;
  avatarUrl: string;
  
  // Guardian / Emergency
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;

  // Additional details
  hostelRoom?: string;
  transportPass?: string;
}

export interface Application {
  id: string;
  applicationNumber: string; // e.g. ADM-2026-901
  applicantName: string;
  email: string;
  phone: string;
  programApplied: string;
  career?: AcademicCareer;
  department: string;
  appliedDate: string;
  status: 'Submitted' | 'Under Review' | 'Document Verified' | 'Offer Issued' | 'Enrolled' | 'Rejected';
  highSchoolGPA: number;
  testScore?: string;
  documents: { name: string; status: 'Pending' | 'Verified' | 'Rejected' }[];
  reviewerNotes?: string;
  
  // Automated Pipeline Meta
  assignedUid?: string; // Provisioned Lifetime Student UID (e.g. BMI0016UQ)
  assignedRegNo?: string; // Provisioned Career Reg Number (e.g. BMI/UG-CS/226/001)
  automatedCheckPassed?: boolean;
  eligibilityScore?: number;
  autoAdmittedAt?: string;
}

export interface Course {
  id: string;
  code: string; // e.g., CSC301
  title: string;
  credits: number;
  department: string;
  instructorName: string;
  instructorId: string;
  schedule: string; // e.g. Mon, Wed 10:00 - 11:30 AM
  room: string;
  capacity: number;
  enrolledCount: number;
  prerequisites: string[]; // e.g., ['CSC201']
  description: string;
  syllabus: string[];
}

export interface StudentCourseEnrollment {
  studentId: string;
  courseId: string;
  semester: string; // e.g. Fall 2026
  status: 'Enrolled' | 'Completed' | 'Dropped' | 'Withdrawn';
  grade?: string; // 'A', 'B+', 'A-', etc.
  numericScore?: number; // 0-100
  attendancePercentage: number;
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  studentId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  sessionTopic?: string;
}

export interface GradeEntry {
  id: string;
  courseId: string;
  studentId: string;
  itemTitle: string; // e.g., Midterm Exam, Quiz 1, Final Project
  scoreObtained: number;
  maxScore: number;
  weight: number; // percentage e.g. 30%
  submittedDate: string;
}

export interface FeeInvoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  term: string; // e.g., Fall 2026
  dueDate: string;
  issueDate: string;
  items: { description: string; amount: number }[];
  totalAmount: number;
  amountPaid: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
  scholarshipDiscount: number;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  paymentMethod: 'Credit Card' | 'Bank Transfer' | 'Mobile Payment' | 'Scholarship Voucher';
  transactionReference: string;
  timestamp: string;
  status: 'Successful' | 'Pending' | 'Failed';
}

export interface StaffRecord {
  id: string;
  staffNumber: string; // e.g. STAFF-104
  name: string;
  email: string;
  department: string;
  title: string;
  role: UserRole;
  teachingLoadCredits: number;
  status: 'Active' | 'On Leave' | 'Sabbatical';
  salaryCategory: string;
  joinedDate: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  performedBy: string;
  role: string;
  action: string;
  details: string;
  ipAddress: string;
  severity: 'Info' | 'Warning' | 'Security';
}

export interface LibraryBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  locationShelf: string;
}

export interface LibraryLoan {
  id: string;
  bookId: string;
  studentId: string;
  studentName: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'Active' | 'Returned' | 'Overdue';
  fineAmount: number;
}

export interface AdvisingNote {
  id: string;
  studentId: string;
  advisorName: string;
  date: string;
  topic: string;
  content: string;
  isConfidential: boolean;
  atRiskFlag: boolean;
  resolved?: boolean;
}

export interface AlumniRecord {
  id: string;
  studentId: string;
  studentNumber: string;
  name: string;
  graduationYear: number;
  degree: string;
  currentCompany?: string;
  currentRole?: string;
  email: string;
  phone: string;
  totalDonations: number;
  mentorshipStatus: 'Available' | 'Active Mentor' | 'Not Opted';
}

export type ThemeMode = 'emerald' | 'indigo' | 'cyber' | 'royal' | 'midnight';

export interface NeonDatabaseContext {
  id: string;
  projectName: string;
  contextScope: string;
  allocatedMB: number;
  usedMB: number;
  computeHoursAllowance: number;
  computeHoursUsed: number;
  tablesCount: number;
  status: 'Healthy' | 'Warning' | 'Archiving';
  tables: string[];
}

export interface DbBackupRecord {
  id: string;
  filename: string;
  timestamp: string;
  sizeMB: number;
  databaseProject: string;
  r2Bucket: string;
  r2ObjectKey: string;
  status: 'Completed' | 'In Progress' | 'Verified';
}

export interface RlsPolicyRule {
  table: string;
  policyName: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  roleScope: string;
  definition: string;
  status: 'Active';
}
