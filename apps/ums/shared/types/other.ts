export interface StaffMember {
  id: string;
  staff_number: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  category: "Academic" | "Administrative" | "Management";
  status: "Full-time" | "Part-time" | "On Leave";
  specialization?: string;
  office?: string;
  officeHours?: string;
  avatarColor?: string;
  photo?: string;
  joinDate?: string;
  study_center_id?: string;
  expand?: {
    study_center_id?: { name: string; location?: string };
  };
  created?: string;
  updated?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  name?: string; // UI alias
  faculty: string;
  department: string;
  level: "Undergraduate" | "Postgraduate" | "Diploma" | "Certificate";
  credits?: number; // UI alias
  credit_hours: number;
  status: "Published" | "Draft" | "Archived";
  description: string;
  syllabus: string;
  module_id?: string;
  study_center_id?: string;
  created?: string;
  updated?: string;
}

export interface Transaction {
  id: string;
  ref: string;
  name: string;
  desc: string;
  amt: number;
  status: "Paid" | "Pending" | "Failed";
  date: string;
  student_id?: string;
  created: string;
  updated: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  author: string;
  category: "Theology" | "ICT" | "Business" | "Education" | "General";
  type: "PDF" | "E-Book" | "Hardcopy" | "Journal" | "Video";
  status: "Digital" | "Available" | "Borrowed" | "Reserved";
  year: string;
  description: string;
  downloadUrl: string;
  location?: string;
  isbn?: string;
  created: string;
  updated: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "registrar" | "faculty" | "student" | "staff" | "viewer";
  department?: string;
  studentId?: string;
  staffId?: string;
  isActive: boolean;
  lastLogin?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  mfaRecoveryCodes?: string[];
  created: string;
  updated: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  message?: string;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalItems?: number;
    totalPages?: number;
  };
}

export interface StudyCenter {
  id: string;
  name: string;
  location?: string;
  code?: string;
}

export interface Hostel {
  id: string;
  name: string;
  type: "Male" | "Female";
  capacity: number;
  location: string;
  status: "Available" | "Near Capacity" | "Full";
  created?: string;
  updated?: string;
}

export interface RoomAssignment {
  id: string;
  studentId: string;
  studentName: string;
  hostelId: string;
  roomNumber: string;
  checkInDate: string;
  status: "Active" | "Revoked";
  created?: string;
  updated?: string;
}

export interface MedicalVisit {
  id: string;
  studentId: string;
  studentName: string;
  condition: string;
  bloodType: string;
  date: string;
  attendingStaff: string;
  status: "Normal" | "Urgent" | "Follow-up";
  vitals: {
    temp: string;
    bp: string;
    pulse: string;
  };
  notes: string;
  created?: string;
  updated?: string;
}

export interface AuditLog {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "LOGIN" | "LOGOUT" | "VERIFY";
  resource: string;
  resourceId?: string;
  userId: string;
  userEmail: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
}
