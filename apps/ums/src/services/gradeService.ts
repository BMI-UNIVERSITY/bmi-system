import { authFetch } from './authService';

import { API_URL } from './config';

export interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  regNo: string;
  courseCode: string;
  courseName: string;
  numericGrade?: number;
  percentage?: number;
  grade?: number; // legacy
  midterm?: number; // legacy
  final?: number; // legacy
  total?: number; // legacy
  letterGrade?: string;
  gpa?: number;
  academicYear: string;
  semester: string;
  status?: string;
}

export interface GradeResponse {
  success: boolean;
  data?: Grade;
  error?: string;
}

export interface GradesListResponse {
  success: boolean;
  data?: {
    items: Grade[];
    page: number;
    perPage: number;
    total: number;
  };
  error?: string;
}

export async function getGrades(filters?: Record<string, unknown>): Promise<GradesListResponse> {   
  try {
    const params = new URLSearchParams();
    if (filters?.perPage) params.append('perPage', filters.perPage.toString()); 

    const response = await authFetch(`${API_URL}/grades?${params.toString()}`); 
    const raw = await response.json();
    if (raw?.success && raw.data && raw.data.totalItems != null && raw.data.total == null) {
      raw.data.total = raw.data.totalItems;
    }
    return raw;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch' };
  }
}

export async function createGrade(data: Partial<Grade>): Promise<GradeResponse> {
  try {
    const response = await authFetch(`${API_URL}/grades`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create' };
  }
}

export async function getStudentGrades(studentId: string): Promise<GradesListResponse> {
  try {
    const params = new URLSearchParams({ studentId });
    const response = await authFetch(`${API_URL}/grades?${params.toString()}`); 
    const raw = await response.json();
    if (raw?.success && raw.data && raw.data.totalItems != null && raw.data.total == null) {
      raw.data.total = raw.data.totalItems;
    }
    return raw;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch student grades' };
  }
}

export async function updateGrade(id: string, data: Partial<Grade>): Promise<GradeResponse> {
  try {
    const response = await authFetch(`${API_URL}/grades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update' };
  }
}
