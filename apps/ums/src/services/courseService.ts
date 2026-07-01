/* eslint-disable */
/* eslint-disable */
/**
 * BMI UMS - Course Service
 */

import { authFetch } from './authService';
import { Course } from '../types';
import { API_URL } from './config';
import { parseJsonSafe } from './apiClient';
import type { PaginatedData } from '@bmi/shared';

export interface CourseResponse {
  success: boolean;
  data?: Course;
  error?: string;
}

export interface CourseListResponse {
  success: boolean;
  data?: PaginatedData<Course>;
  error?: string;
}

export async function getCourses(filters?: {
  page?: number;
  perPage?: number;
  search?: string;
  campusId?: string;
  status?: string;
  moduleId?: string;
}): Promise<CourseListResponse> {
  try {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.perPage) params.append('perPage', filters.perPage.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.campusId) params.append('study_center_id', filters.campusId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.moduleId) params.append('module_id', filters.moduleId);

    const queryString = params.toString();
    const url = `${API_URL}/courses${queryString ? `?${queryString}` : ''}`;
    const response = await authFetch(url);
    let data = await parseJsonSafe<any>(response);
    if (data?.success && !data.data?.items && data.data?.items !== []) {
      // Make sure data has the paginated structure
      if (!data.data) {
        data.data = { items: [], page: 1, perPage: 20, total: 0 };
      } else if (Array.isArray(data.data)) {
        data.data = { items: data.data, page: 1, perPage: data.data.length, total: data.data.length };
      } else if (!data.data.items) {
        data.data.items = [];
      }
    }
    return data ?? { success: false, error: 'Failed to parse courses response' };
  } catch (error) { return { success: false, error: 'Failed to fetch courses'  };
  }
}

export async function createCourse(data: Partial<Course>): Promise<CourseResponse> {
  try {
    const response = await authFetch(`${API_URL}/courses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafe<CourseResponse>(response);
    return result ?? { success: false, error: 'Failed to parse create course response' };
  } catch (error) { return { success: false, error: 'Failed to create course'  };
  }
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<CourseResponse> {
  try {
    const response = await authFetch(`${API_URL}/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafe<CourseResponse>(response);
    return result ?? { success: false, error: 'Failed to parse update course response' };
  } catch (error) { return { success: false, error: 'Failed to update course'  };
  }
}

export async function deleteCourse(id: string): Promise<CourseResponse> {
  try {
    const response = await authFetch(`${API_URL}/courses/${id}`, { method: 'DELETE' });
    const result = await parseJsonSafe<CourseResponse>(response);
    return result ?? { success: false, error: 'Failed to parse delete course response' };
  } catch (error) { return { success: false, error: 'Failed to delete course'  };
  }
}

export async function getCourseStats(): Promise<any> {
  try {
    const response = await authFetch(`${API_URL}/courses/stats/overview`);
    const data = await parseJsonSafe<any>(response);
    return data ?? { success: false, error: 'Failed to parse course statistics response' };
  } catch (error) { return { success: false, error: 'Failed to fetch course statistics'  };
  }
}









