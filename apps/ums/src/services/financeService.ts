/**
 * BMI UMS - Finance Service
 */

import { authFetch } from './authService';
import { Transaction } from '../types';
import { API_URL } from './config';
import { parseJsonSafe } from './apiClient';

export interface TransactionResponse {
  success: boolean;
  data?: Transaction;
  error?: string;
}

export interface TransactionListResponse {
  success: boolean;
  data?: Transaction[];
  meta?: {
    page: number;
    perPage: number;
    total: number;
  };
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTransactions(filters?: any): Promise<TransactionListResponse> {
  try {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.perPage) params.append('perPage', filters.perPage.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `${API_URL}/finance/transactions${queryString ? `?${queryString}` : ''}`;
    const response = await authFetch(url);
    const data = await parseJsonSafe<TransactionListResponse>(response);
    return data ?? { success: false, error: 'Failed to parse transactions response' };
  } catch { return { success: false, error: 'Failed to fetch transactions'  };
  }
}

export async function createTransaction(data: Partial<Transaction>): Promise<TransactionResponse> {
  try {
    const response = await authFetch(`${API_URL}/finance/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafe<TransactionResponse>(response);
    return result ?? { success: false, error: 'Failed to parse create transaction response' };
  } catch { return { success: false, error: 'Failed to create transaction'  };
  }
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<TransactionResponse> {
  try {
    const response = await authFetch(`${API_URL}/finance/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const result = await parseJsonSafe<TransactionResponse>(response);
    return result ?? { success: false, error: 'Failed to parse update transaction response' };
  } catch { return { success: false, error: 'Failed to update transaction'  };
  }
}

export async function deleteTransaction(id: string): Promise<TransactionResponse> {
  try {
    const response = await authFetch(`${API_URL}/finance/transactions/${id}`, { method: 'DELETE' });
    const result = await parseJsonSafe<TransactionResponse>(response);
    return result ?? { success: false, error: 'Failed to parse delete transaction response' };
  } catch { return { success: false, error: 'Failed to delete transaction'  };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFinanceStats(): Promise<any> {
  try {
    const response = await authFetch(`${API_URL}/finance/stats`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await parseJsonSafe<any>(response);
    return data ?? { success: false, error: 'Failed to parse finance statistics response' };
  } catch { return { success: false, error: 'Failed to fetch finance statistics'  };
  }
}










