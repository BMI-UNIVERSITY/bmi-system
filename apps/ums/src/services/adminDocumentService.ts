/* eslint-disable */
/* eslint-disable */
import { authFetch } from './authService';
import { API_URL } from './config';

export interface Document {
  id: string;
  application_id: string;
  user_id: string;
  doc_type: string;
  file_name: string;
  r2_key: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_at: string;
  user_email: string;
  first_name: string;
  last_name: string;
}

export interface PaginatedDocumentsResponse {
  success: boolean;
  data?: {
    items: Document[];
    page: number;
    perPage: number;
    total: number;
  };
  error?: string;
}

export async function listDocuments(params?: {
  page?: number;
  perPage?: number;
  user_id?: string;
  application_id?: string;
  doc_type?: string;
}): Promise<PaginatedDocumentsResponse> {
  try {
    const urlParams = new URLSearchParams();
    if (params?.page) urlParams.set('page', params.page.toString());
    if (params?.perPage) urlParams.set('perPage', params.perPage.toString());
    if (params?.user_id) urlParams.set('user_id', params.user_id);
    if (params?.application_id) urlParams.set('application_id', params.application_id);
    if (params?.doc_type) urlParams.set('doc_type', params.doc_type);

    const queryString = urlParams.toString();
    const url = `${API_URL.replace('/v1', '')}/admin/documents${queryString ? `?${queryString}` : ''}`;

    const response = await authFetch(url, {}, 8000);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch documents',
    };
  }
}

export async function downloadDocument(docId: string): Promise<void> {
  try {
    const url = `${API_URL.replace('/v1', '')}/documents/${docId}/download`;
    const response = await authFetch(url, {}, 10000);
    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = 'download';
    if (contentDisposition) {
      const matches = /filename="([^"]+)"/.exec(contentDisposition);
      if (matches) fileName = matches[1];
    }
    const urlObject = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObject;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(urlObject);
  } catch (error) {
    console.error('Download failed:', error);
  }
}
