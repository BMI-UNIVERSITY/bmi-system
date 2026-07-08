/* eslint-disable */
/**
 * BMI UMS - Admissions Service
 * Handles application lifecycle management for admins
 */

import { authFetch } from './authService';
import { API_URL } from './config';
import { parseJsonSafe } from './apiClient';

export interface Application {
  id: string;
  applicant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  program: string;
  degree_level: string;
  status: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  // Personal Info
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  // Academic History
  high_school?: string;
  graduation_year?: number;
  gpa?: number;
}

export interface StatusLogEntry {
  id: string;
  application_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_by_name: string;
  notes?: string;
  changed_at: string;
}

export const admissionsService = {
  /**
   * Get all applications with optional filtering
   */
  async listApplications(params?: { status?: string; limit?: number; offset?: number }) {
    const stringParams = Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>);
    const qs = params && Object.keys(stringParams).length > 0 ? '?' + new URLSearchParams(stringParams).toString() : '';
    const response = await authFetch(`${API_URL.replace('/v1', '')}/admin/applications${qs}`);
    if (!response.ok) {
      throw new Error('Failed to load applications');
    }
    const result = await response.json() as { success: boolean; data: Application[] };
    return result.data || [];
  },

  /**
   * Get a single application by ID
   */
  async getApplication(id: string) {
    const response = await authFetch(`${API_URL.replace('/v1', '')}/admin/applications/${id}`);
    if (!response.ok) {
      throw new Error('Failed to load application details');
    }
    const result = await response.json() as { success: boolean; data: Application };
    return result.data;
  },

  /**
   * Update application status (New -> Under Review -> Accepted/Rejected)
   */
  async updateStatus(id: string, status: string, notes?: string) {
    const response = await authFetch(`${API_URL.replace('/v1', '')}/admin/applications/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, notes }),
    });
    
    if (!response.ok) {
      const error = (await parseJsonSafe(response)) as { error?: string };
      throw new Error(error?.error || 'Failed to update application status');
    }
    return response.json();
  },

  /**
   * Get audit log of status changes for an application
   */
  async getStatusLogs(id: string) {
    const response = await authFetch(`${API_URL.replace('/v1', '')}/applications/${id}/lifecycle`);
    if (!response.ok) {
      throw new Error('Failed to load application audit logs');
    }
    const result = await response.json() as { success: boolean; data: StatusLogEntry[] };
    return result.data || [];
  }
};
