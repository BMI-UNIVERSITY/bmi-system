/* eslint-disable */
/* eslint-disable */
/* eslint-disable */
/**
 * BMI UMS - Program & Enrollment Service
 */

import { authFetch } from './authService';
import { Program, Faculty, Department, AcademicTerm, Enrollment, ApiResponse } from '../types';
import { API_URL } from './config';
import { parseJsonSafe } from './apiClient';

// ── Programs ──────────────────────────────────────────────────────────────────

export async function getPrograms(filters?: {
  level?: string;
  department_id?: string;
  is_active?: boolean;
}): Promise<ApiResponse<Program[]>> {
  try {
    const params = new URLSearchParams();
    if (filters?.level) params.append('level', filters.level);
    if (filters?.department_id) params.append('department_id', filters.department_id);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

    const queryString = params.toString();
    const url = `${API_URL}/programs${queryString ? `?${queryString}` : ''}`;
    const response = await authFetch(url);
    const data = await parseJsonSafe<ApiResponse<Program[]>>(response);
    return data ?? { success: false, data: [], error: { code: 'PARSE_ERROR', message: 'Failed to parse programs response' } };
  } catch (error) { return { success: false, data: [], error: { code: 'FETCH_ERROR', message: 'Failed to fetch programs'  } };
  }
}

export async function getProgramById(id: string): Promise<ApiResponse<Program & { courses: any[] }>> {
  try {
    const response = await authFetch(`${API_URL}/programs/${id}`);
    const data = await parseJsonSafe<ApiResponse<Program & { courses: any[] }>>(response);
    return data ?? { success: false, data: {} as any, error: { code: 'PARSE_ERROR', message: 'Failed to parse program detail response' } };
  } catch (error) { return { success: false, data: {} as any, error: { code: 'FETCH_ERROR', message: 'Failed to fetch program details'  } };
  }
}

export async function createProgram(data: Partial<Program>): Promise<ApiResponse<Program>> {
  try {
    const response = await authFetch(`${API_URL}/programs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafe<ApiResponse<Program>>(response);
    return result ?? { success: false, data: {} as any, error: { code: 'PARSE_ERROR', message: 'Failed to parse create program response' } };
  } catch (error) { return { success: false, data: {} as any, error: { code: 'FETCH_ERROR', message: 'Failed to create program'  } };
  }
}

export async function updateProgram(id: string, data: Partial<Program>): Promise<ApiResponse<Program>> {
  try {
    const response = await authFetch(`${API_URL}/programs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafe<ApiResponse<Program>>(response);
    return result ?? { success: false, data: {} as any, error: { code: 'PARSE_ERROR', message: 'Failed to parse update program response' } };
  } catch (error) { return { success: false, data: {} as any, error: { code: 'FETCH_ERROR', message: 'Failed to update program'  } };
  }
}

// ── Catalog (Faculties & Departments) ─────────────────────────────────────────

export async function getFaculties(): Promise<ApiResponse<Faculty[]>> {
  try {
    const response = await authFetch(`${API_URL}/catalog/faculties`);
    const data = await parseJsonSafe<ApiResponse<Faculty[]>>(response);
    return data ?? { success: false, data: [] };
  } catch (error) { return { success: false, data: [] };
  }
}

export async function getDepartments(facultyId?: string): Promise<ApiResponse<Department[]>> {
  try {
    const params = new URLSearchParams();
    if (facultyId) params.append('facultyId', facultyId);
    
    const queryString = params.toString();
    const url = `${API_URL}/catalog/departments${queryString ? `?${queryString}` : ''}`;
    const response = await authFetch(url);
    const data = await parseJsonSafe<ApiResponse<Department[]>>(response);
    return data ?? { success: false, data: [] };
  } catch (error) {
    return { success: false, data: [] };
  }
}

export async function getAcademicTerms(): Promise<ApiResponse<AcademicTerm[]>> {
  try {
    const response = await authFetch(`${API_URL}/catalog/terms`);
    const data = await parseJsonSafe<ApiResponse<AcademicTerm[]>>(response);
    return data ?? { success: false, data: [] };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// ── Enrollments ──────────────────────────────────────────────────────────────

export async function getEnrollments(filters?: {
  student_id?: string;
  course_id?: string;
  term_id?: string;
}): Promise<ApiResponse<Enrollment[]>> {
  try {
    const params = new URLSearchParams();
    if (filters?.student_id) params.append('student_id', filters.student_id);
    if (filters?.course_id) params.append('course_id', filters.course_id);
    if (filters?.term_id) params.append('term_id', filters.term_id);

    const queryString = params.toString();
    const url = `${API_URL}/enrollments${queryString ? `?${queryString}` : ''}`;
    const response = await authFetch(url);
    const data = await parseJsonSafe<ApiResponse<Enrollment[]>>(response);
    return data ?? { success: false, data: [] };
  } catch (error) {
    return { success: false, data: [] };
  }
}

export async function createEnrollment(data: {
  student_id: string;
  course_id: string;
  program_id: string;
  term_id: string;
  academic_year?: string;
  semester_number?: number;
  status?: string;
}): Promise<ApiResponse<Enrollment>> {
  try {
    const response = await authFetch(`${API_URL}/enrollments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafe<ApiResponse<Enrollment>>(response);
    return result ?? { success: false, data: {} as any, error: { code: 'PARSE_ERROR', message: 'Failed to parse enrollment response'  } };
  } catch (error) { return { success: false, data: {} as any, error: { code: 'FETCH_ERROR', message: 'Failed to create enrollment'  } };
  }
}

export async function dropEnrollment(id: string): Promise<ApiResponse<Enrollment>> {
  try {
    const response = await authFetch(`${API_URL}/enrollments/${id}/drop`, {
      method: 'PATCH',
    });
    const result = await parseJsonSafe<ApiResponse<Enrollment>>(response);
    return result ?? { success: false, data: {} as any };
  } catch (error) {
    return { success: false, data: {} as any };
  }
}










