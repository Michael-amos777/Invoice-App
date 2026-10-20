import { BusinessProfile, Client, DashboardStats, Invoice } from '../types';

const BASE_URL = '/api';

export const api = {
  // Profile
  getProfile: async (): Promise<BusinessProfile> => {
    const res = await fetch(`${BASE_URL}/profile`);
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json();
  },

  updateProfile: async (profile: Partial<BusinessProfile>): Promise<BusinessProfile> => {
    const res = await fetch(`${BASE_URL}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  uploadLogo: async (file: File): Promise<{ logo_url: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch(`${BASE_URL}/profile/logo`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload logo');
    return res.json();
  },

  removeLogo: async (): Promise<void> => {
    const res = await fetch(`${BASE_URL}/profile/logo`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove logo');
  },

  // Clients
  getClients: async (search?: string): Promise<Client[]> => {
    const url = search ? `${BASE_URL}/clients?search=${encodeURIComponent(search)}` : `${BASE_URL}/clients`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch clients');
    return res.json();
  },

  getClient: async (id: string): Promise<Client> => {
    const res = await fetch(`${BASE_URL}/clients/${id}`);
    if (!res.ok) throw new Error('Failed to fetch client details');
    return res.json();
  },

  createClient: async (client: Partial<Client>): Promise<Client> => {
    const res = await fetch(`${BASE_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    });
    if (!res.ok) throw new Error('Failed to create client');
    return res.json();
  },

  updateClient: async (id: string, client: Partial<Client>): Promise<Client> => {
    const res = await fetch(`${BASE_URL}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    });
    if (!res.ok) throw new Error('Failed to update client');
    return res.json();
  },

  deleteClient: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete client');
  },

  // Invoices
  getInvoices: async (params?: { search?: string; status?: string; client_id?: string; from_date?: string; to_date?: string }): Promise<Invoice[]> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.client_id) searchParams.set('client_id', params.client_id);
    if (params?.from_date) searchParams.set('from_date', params.from_date);
    if (params?.to_date) searchParams.set('to_date', params.to_date);

    const queryStr = searchParams.toString();
    const url = queryStr ? `${BASE_URL}/invoices?${queryStr}` : `${BASE_URL}/invoices`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const res = await fetch(`${BASE_URL}/invoices/${id}`);
    if (!res.ok) throw new Error('Failed to fetch invoice');
    return res.json();
  },

  createInvoice: async (invoice: any): Promise<Invoice> => {
    const res = await fetch(`${BASE_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create invoice' }));
      throw new Error(err.error || 'Failed to create invoice');
    }
    return res.json();
  },

  updateInvoice: async (id: string, invoice: any): Promise<Invoice> => {
    const res = await fetch(`${BASE_URL}/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update invoice' }));
      throw new Error(err.error || 'Failed to update invoice');
    }
    return res.json();
  },

  duplicateInvoice: async (id: string): Promise<Invoice> => {
    const res = await fetch(`${BASE_URL}/invoices/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to duplicate invoice');
    return res.json();
  },

  recordPayment: async (id: string, payment: { amount: number; payment_date?: string; payment_method?: string; reference_note?: string }): Promise<any> => {
    const res = await fetch(`${BASE_URL}/invoices/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to record payment' }));
      throw new Error(err.error || 'Failed to record payment');
    }
    return res.json();
  },

  updateInvoiceStatus: async (id: string, status: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/invoices/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  deleteInvoice: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/invoices/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete invoice');
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${BASE_URL}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to load dashboard statistics');
    return res.json();
  },

  // PDF Download URL
  getPdfUrl: (id: string, pageSize: string = 'A4') => `${BASE_URL}/invoices/${id}/pdf?pageSize=${pageSize}`,
  getHtmlUrl: (id: string, pageSize: string = 'A4') => `${BASE_URL}/invoices/${id}/html?pageSize=${pageSize}`,

  // Reset & Workspace Management
  resetWorkspace: async (mode: 'all' | 'data_only' | 'seed' = 'all'): Promise<{ success: boolean; mode: string; message: string }> => {
    const res = await fetch(`${BASE_URL}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to reset workspace' }));
      throw new Error(err.error || 'Failed to reset workspace');
    }
    return res.json();
  },

  getResetStatus: async (): Promise<{ isSampleData: boolean; invoiceCount: number }> => {
    const res = await fetch(`${BASE_URL}/reset/status`);
    if (!res.ok) return { isSampleData: false, invoiceCount: 0 };
    return res.json();
  }
};
