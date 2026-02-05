import { getSessionId } from './lib/userSession';

export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const sessionId = getSessionId();
  
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'X-User-Session': sessionId } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// Define specific API calls
export const contactsApi = {
  list: () => api<{ contacts: any[] }>('/contacts'),
  create: (data: any) => api('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  bulkImport: (contacts: any[]) => api('/contacts/bulk', { method: 'POST', body: JSON.stringify({ contacts }) }),
  bulkDelete: (ids: string[]) => api('/contacts/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
};

export const campaignsApi = {
  list: () => api<{ campaigns: any[] }>('/campaigns'),
  get: (id: string) => api<{ campaign: any; stats: any }>(`/campaigns/${id}`),
  getStats: () => api<{ active_campaigns: number; total_leads: number; emails_sent_today: number; total_replies: number }>('/campaigns/stats'),
  create: (data: any) => api('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => api(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/campaigns/${id}`, { method: 'DELETE' }),
  start: (id: string) => api(`/campaigns/${id}/start`, { method: 'POST' }),
  pause: (id: string) => api(`/campaigns/${id}/pause`, { method: 'POST' }),
  addLeads: (id: string, contactIds: string[]) => 
    api(`/campaigns/${id}/leads`, { method: 'POST', body: JSON.stringify({ contact_ids: contactIds }) }),
  getLeads: (id: string) => api<{ leads: any[] }>(`/campaigns/${id}/leads`),
  removeLeads: (id: string, leadIds: string[]) =>
    api(`/campaigns/${id}/leads`, { method: 'DELETE', body: JSON.stringify({ lead_ids: leadIds }) }),
  simulateReply: (leadId: string) => 
    api(`/campaigns/leads/${leadId}/simulate-reply`, { method: 'POST' }),
};

export const processorApi = {
  run: () => api('/processor/run', { method: 'POST' }),
};

export const generationApi = {
  getStatus: (campaignId: string) => api<{ leads: { id: string; generation_status: string }[] }>(`/generation/${campaignId}/status`),
  getLead: (leadId: string) => api<{ lead: any }>(`/generation/lead/${leadId}`),
  update: (leadId: string, data: any) => api(`/generation/lead/${leadId}`, { method: 'PUT', body: JSON.stringify(data) }),
  regenerate: (leadId: string) => api(`/generation/lead/${leadId}/regenerate`, { method: 'POST' }),
  // Bulk generate for selected leads
  bulkGenerate: (leadIds: string[]) => api(`/generation/bulk`, { method: 'POST', body: JSON.stringify({ lead_ids: leadIds }) }),
  // Retry all failed generation in a campaign
  retryFailed: (campaignId: string) => api<{ success: boolean; retried: number }>(`/generation/retry-failed/${campaignId}`, { method: 'POST' }),
};

export const researchApi = {
  // Research selected leads
  researchLeads: (leadIds: string[]) => api(`/research/leads`, { method: 'POST', body: JSON.stringify({ lead_ids: leadIds }) }),
  // Get research for a single lead
  getLead: (leadId: string) => api<{ research_status: string; research_data: any }>(`/research/leads/${leadId}`),
  // Retry all failed research in a campaign
  retryFailed: (campaignId: string) => api<{ success: boolean; retried: number }>(`/research/retry-failed/${campaignId}`, { method: 'POST' }),
};
