export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('bmi_ums_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch (_) {}
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: async <T>(url: string): Promise<T> => {
    const res = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse<T>(res);
  },

  post: async <T>(url: string, body: unknown): Promise<T> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  put: async <T>(url: string, body: unknown): Promise<T> => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  delete: async <T>(url: string): Promise<T> => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(res);
  },
};
