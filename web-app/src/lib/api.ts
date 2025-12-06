const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async getAuthUrl(): Promise<{ url: string }> {
    return this.request('/auth/google');
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  // Gmail endpoints
  async syncEmails(maxResults?: number, year?: number): Promise<SyncResult> {
    return this.request('/gmail/sync', {
      method: 'POST',
      body: JSON.stringify({ maxResults, year }),
    });
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return this.request('/gmail/status');
  }

  // Transaction endpoints
  async getTransactions(params?: TransactionParams): Promise<TransactionResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.taxReliefCategory) searchParams.set('taxReliefCategory', params.taxReliefCategory);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.year) searchParams.set('year', params.year.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return this.request(`/transactions${query ? `?${query}` : ''}`);
  }

  async getTransaction(id: string): Promise<{ transaction: Transaction }> {
    return this.request(`/transactions/${id}`);
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<{ transaction: Transaction }> {
    return this.request(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.request(`/transactions/${id}`, { method: 'DELETE' });
  }

  async getTransactionSummary(params?: { startDate?: string; endDate?: string; year?: number }): Promise<TransactionSummary> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.year) searchParams.set('year', params.year.toString());

    const query = searchParams.toString();
    return this.request(`/transactions/stats/summary${query ? `?${query}` : ''}`);
  }

  async getTaxCategories(): Promise<{ categories: Record<string, TaxReliefCategoryInfo> }> {
    return this.request('/transactions/tax-categories');
  }
}

// Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  email_id: string;
  merchant: string | null;
  amount: number | null;
  currency: string;
  category: string | null;
  tax_relief_category: string | null;
  transaction_date: string | null;
  email_subject: string | null;
  email_snippet: string | null;
  email_date: string | null;
  description: string | null;
  confidence_score: number | null;
  created_at: string;
}

export interface SyncResult {
  message: string;
  processed: number;
  transactions: number;
  totalEmails?: number;
  year?: number;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  gmailConnected: boolean;
}

export interface TransactionParams {
  category?: string;
  taxReliefCategory?: string;
  startDate?: string;
  endDate?: string;
  year?: number;
  limit?: number;
  offset?: number;
}

export interface TransactionResponse {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaxReliefCategoryInfo {
  name: string;
  limit: number;
  description: string;
}

export interface TaxReliefSummary {
  amount: number;
  limit: number;
  name: string;
  remaining: number;
}

export interface TransactionSummary {
  total: number;
  count: number;
  average: number;
  byCategory: Record<string, number>;
  byTaxRelief: Record<string, TaxReliefSummary>;
  byMonth: Record<string, number>;
  totalTaxRelief: number;
  taxCategories: Record<string, TaxReliefCategoryInfo>;
  year: number;
  filingDeadline: string;
}

export const api = new ApiClient();
