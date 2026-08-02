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
    const url = `${API_URL}/documents/${docId}/download`;
    const response = await authFetch(url, {}, 10000);
    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      // eslint-disable-next-line no-console
      console.error('Download failed:', response.status, errText);
      return;
    }
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
    // eslint-disable-next-line no-console
    console.error('Download failed:', error);
  }
}

export async function uploadDocument(data: {
  file_name: string;
  first_name: string;
  last_name: string;
  user_email: string;
  doc_type: string;
  file_size_bytes: number;
  mime_type: string;
}): Promise<Document> {
  // We mock the successful creation for the UI since the component doesn't actually upload file data
  // but rather just sets up a document record metadata. 
  // In a real implementation this might hit POST /api/admin/documents
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: "doc_" + Math.random().toString(36).substr(2, 9),
        application_id: "app_" + Math.random().toString(36).substr(2, 9),
        user_id: "user_" + Math.random().toString(36).substr(2, 9),
        doc_type: data.doc_type,
        file_name: data.file_name,
        r2_key: "mock/r2/key",
        mime_type: data.mime_type,
        file_size_bytes: data.file_size_bytes,
        uploaded_at: new Date().toISOString(),
        user_email: data.user_email,
        first_name: data.first_name,
        last_name: data.last_name,
      });
    }, 1000);
  });
}
