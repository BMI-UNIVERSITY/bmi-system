export interface Certificate {
  id: string;
  serial_number: string;
  student_id: string;
  student_name: string;
  degree: string;
  graduation_class?: string;
  faculty: string;
  department: string;
  issue_date: string;
  graduation_date: string;
  gpa: number;
  status: "ISSUED" | "REVOKED" | "SUSPENDED";
  content_hash: string;
  verification_count: number;
  created: string;
  updated: string;
  // Specific properties required by tests and guides
  courseCode?: string;
  courseName?: string;
  grade?: string;
  issuedAt?: string;
  verificationHash?: string;
  qrData?: string;
}

export interface CertificateVerificationRequest {
  serial: string;
  hash?: string;
  method: "online" | "offline" | "qr_scan";
}

export interface CertificateVerificationResult {
  valid: boolean;
  certificate?: {
    serial_number: string;
    student_name: string;
    degree_title: string;
    graduation_class?: string;
    faculty: string;
    department: string;
    issue_date: string;
    graduation_date: string;
    gpa: number;
    status: "active" | "revoked" | "suspended" | "ISSUED" | "REVOKED" | "SUSPENDED";
  };
  verification?: {
    timestamp: string;
    method: string;
    hash_verified: boolean;
    verification_count: number;
  };
  error?: string;
  code?: string;
}
