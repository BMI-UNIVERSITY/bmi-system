/**
 * Shared API client for the Admin Dashboard.
 * Mirrors student-portal/src/lib/api.ts but includes admin-specific endpoints
 * and all auxiliary module endpoints (HR, Library, Alumni, Campus).
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('bmi_token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? 'API error');
  }
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  enrollmentStatus: string;
  programId: number | null;
  createdAt: string;
}

export interface CourseOffering {
  id: number;
  term: string;
  capacity: number;
  courseCode: string;
  courseTitle: string;
  courseCredits: number;
}

export interface FinancialHold {
  id: number;
  studentId: number;
  reason: string;
  amountDue: string;
  isActive: boolean;
  createdAt: string;
}

export interface StaffMember {
  id: number;
  userId: string;
  department: string;
  jobTitle: string;
  hireDate: string;
}

export interface LeaveRequest {
  id: number;
  staffId: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  copiesTotal: number;
  copiesAvailable: number;
}

// ── Admin API helpers ──────────────────────────────────────────────────────

export const adminApi = {
  // ── Core ──
  getCourseOfferings: () => request<CourseOffering[]>('/api/v1/academics/offerings'),
  getFinancialHolds:  () => request<FinancialHold[]>('/api/v1/finance/holds'),

  // ── HR ──
  getStaff:           () => request<StaffMember[]>('/api/v1/hr/staff'),
  getLeaveRequests:   () => request<LeaveRequest[]>('/api/v1/hr/leave-requests'),
  updateLeaveRequest: (id: number, status: 'approved' | 'rejected') =>
    request<LeaveRequest>(`/api/v1/hr/leave-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getPayroll: () => request<any[]>('/api/v1/hr/payroll'),

  // ── Library ──
  getBooks:      () => request<Book[]>('/api/v1/library/books'),
  getBorrowings: () => request<any[]>('/api/v1/library/borrowing'),
  getFines:      () => request<any[]>('/api/v1/library/fines'),
  returnBook:    (id: number) =>
    request<any>(`/api/v1/library/borrowing/${id}/return`, { method: 'PATCH' }),

  // ── Alumni ──
  getAlumniProfiles: () => request<any[]>('/api/v1/alumni/profiles'),
  getAlumniEvents:   () => request<any[]>('/api/v1/alumni/events'),
  getDonations:      () => request<any[]>('/api/v1/alumni/donations'),

  // ── Campus ──
  getHostels:         () => request<any[]>('/api/v1/campus/hostels'),
  getTransportRoutes: () => request<any[]>('/api/v1/campus/transport'),
  getTransportPasses: () => request<any[]>('/api/v1/campus/transport/passes'),
};
