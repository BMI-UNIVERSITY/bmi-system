import { authFetch } from './authService';
import { LibraryItem } from '../types';

import { API_URL } from './config';

export interface LibraryListResponse {
  success: boolean;
  data?: LibraryItem[];
  meta?: { page: number; perPage: number; total: number };
  error?: string;
}

export async function getLibraryItems(filters?: { page?: number; perPage?: number; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.perPage) params.append('perPage', String(filters.perPage));
  if (filters?.search) params.append('search', filters.search);
  const q = params.toString();
  const res = await authFetch(`${API_URL}/library${q ? `?${q}` : ''}`);
  return (await res.json()) as LibraryListResponse;
}









