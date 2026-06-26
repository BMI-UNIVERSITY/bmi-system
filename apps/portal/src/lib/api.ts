const BASE = ((import.meta as any).env.VITE_API_URL || '') + '/api';

function getCsrfToken(): string | null {
  return localStorage.getItem('csrf_token');
}

function setCsrfToken(token: string) {
  localStorage.setItem('csrf_token', token);
}

function clearCsrfToken() {
  localStorage.removeItem('csrf_token');
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ApiError(res.status, `Server returned status ${res.status}`);
    }

    if (!res.ok || (data && data.success === false)) {
      if (res.status === 401) {
        clearCsrfToken();
      }
      throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
    }
    return data.data ?? data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out. Please try again.');
    }
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error. Please check your connection.');
  }
}

export const api = {
  auth: {
    register: (body: { email: string; password: string; first_name: string; last_name: string; phone?: string }) =>
      request<{ message: string; user_id: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

    login: (email: string, password: string, mfa_token?: string) =>
      request<{ csrf_token?: string; user?: User; requires_mfa?: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, mfa_token }) })
        .then(res => { if (res.csrf_token) setCsrfToken(res.csrf_token); return res; }),

    logout: () =>
      request<void>('/auth/logout', { method: 'DELETE' })
        .then(res => { clearCsrfToken(); return res; }),

    me: () =>
      request<User>('/auth/me'),

    verifyEmail: (token: string) =>
      request<{ message: string }>(`/auth/verify?token=${encodeURIComponent(token)}`),

    resendVerification: (email: string) =>
      request<{ message: string }>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

    forgotPassword: (email: string) =>
      request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

    resetPassword: (token: string, new_password: string) =>
      request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),

    mfaSetup: () =>
      request<{ secret: string; otp_auth_url: string }>('/auth/mfa/setup', { method: 'POST' }),

    mfaEnable: (token: string) =>
      request<{ message: string }>('/auth/mfa/enable', { method: 'POST', body: JSON.stringify({ token }) }),
  },

  applications: {
    submit: (body: { program: string; degree_level: string; personal_statement?: string; prior_education?: string }) =>
      request<{ application_id: string; status: string }>('/applications', { method: 'POST', body: JSON.stringify(body) }),

    getMyApplication: () =>
      request<Application>('/applications/me'),

    getStatusLogs: (appId: string) =>
      request<StatusLogEntry[]>(`/applications/${appId}/logs`),
  },

  admin: {
    listApplications: (params?: { status?: string; limit?: number; offset?: number }) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
      ).toString() : '';
      return request<Application[]>(`/admin/applications${qs}`);
    },
    getApplication: (appId: string) =>
      request<Application>(`/admin/applications/${appId}`),
    updateStatus: (appId: string, status: string, notes?: string) =>
      request<{ application_id: string; new_status: string }>(`/admin/applications/${appId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes }),
      }),
    listUsers: () =>
      request<{ users: any[] }>('/admin/users'),
    updateUserRole: (userId: string, role: string) =>
      request<{ message: string }>(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    deleteUser: (userId: string) =>
      request<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),
    resetUserPassword: (userId: string) =>
      request<{ message: string }>(`/admin/users/${userId}/reset-password`, { method: 'POST' }),
    getAuditLogs: (params?: { action?: string; limit?: number; offset?: number }) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
      ).toString() : '';
      return request<{ logs: AuditLog[]; total: number }>(`/admin/audit-logs${qs}`);
    },
  },

  documents: {
    upload: (applicationId: string, docType: string, file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      return fetch(`${BASE}/documents/upload?application_id=${encodeURIComponent(applicationId)}&doc_type=${encodeURIComponent(docType)}`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: fd,
      }).then(r => r.json());
    },
    downloadUrl: (docId: string) => `${BASE}/documents/${docId}/download`,
  },

  recommendations: {
    request: (applicationId: string, referee_name: string, referee_email: string) =>
      request<{ id: string; status: string }>(`/applications/${applicationId}/recommendations`, {
        method: 'POST',
        body: JSON.stringify({ referee_name, referee_email })
      }),
    list: (applicationId: string) =>
      request<RecommendationRequest[]>(`/applications/${applicationId}/recommendations`),
    getInfo: (token: string) =>
      request<RecommendationInfo>(`/recommendations/${token}`),
    upload: (token: string, file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return fetch(`${BASE}/recommendations/${token}/upload`, {
        method: 'POST',
        body: fd
      }).then(r => r.json());
    }
  },

  student: {
    getDashboard: () => request<any>('/student/dashboard'),
    getCourses: (term?: string) => {
      const qs = term ? `?term=${encodeURIComponent(term)}` : '';
      return request<Course[]>(`/student/courses${qs}`);
    },
    enroll: (course_id: string) => request<{ success: boolean; message: string }>('/student/enroll', {
      method: 'POST',
      body: JSON.stringify({ course_id })
    }),
    getFinances: () => request<any>('/student/finances'),
    payInvoice: (invoiceId: string) => request<{ success: boolean }>(`/student/invoices/${invoiceId}/pay`, { method: 'POST' }),
    dropCourse: (course_id: string) => request<{ success: boolean; message: string }>(`/student/courses/${course_id}/drop`, { method: 'POST' }),
    getTranscript: () => request<{ classes: any[]; gpa: string | null }>('/student/transcript'),
    getSettings: () => request<{ directory_release: number; communications_opt_in: number }>('/student/settings'),
    updateSettings: (settings: { directory_release: boolean; communications_opt_in: boolean }) => 
      request<{ success: boolean; message: string }>('/student/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      }),
    getSupportTickets: () => request<any[]>('/student/support'),
    createSupportTicket: (subject: string, description: string) => 
      request<{ success: boolean; message: string; ticket_id: string }>('/student/support', {
        method: 'POST',
        body: JSON.stringify({ subject, description })
      }),
  },
};

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'applicant' | 'student' | 'staff' | 'admin';
  is_verified?: number;
}

export interface Application {
  id: string;
  user_id: string;
  program: string;
  degree_level: string;
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'waitlisted';
  personal_statement: string | null;
  submitted_at: string | null;
  created_at: string;
  documents?: DocumentMeta[];
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface DocumentMeta {
  id: string;
  doc_type: string;
  file_name: string;
  uploaded_at: string;
}

export interface RecommendationRequest {
  id: string;
  referee_name: string;
  referee_email: string;
  status: 'requested' | 'submitted';
  requested_at: string;
  completed_at: string | null;
}

export interface RecommendationInfo {
  id: string;
  referee_name: string;
  status: 'requested' | 'submitted';
  first_name: string;
  last_name: string;
  program: string;
}

export interface StatusLogEntry {
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_at: string;
  changed_by_name: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  credits: number;
  term: string;
  capacity: number;
}

export interface AuditLog {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
}

export interface SupportTicket {
  id: string;
  student_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}
