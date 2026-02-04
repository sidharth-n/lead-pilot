export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  bulkCreate: (data: any) => api('/contacts/bulk', { method: 'POST', body: JSON.stringify(data) }),
};

export const campaignsApi = {
  list: () => api<{ campaigns: any[] }>('/campaigns'),
  get: (id: string) => api<{ campaign: any; stats: any }>(`/campaigns/${id}`),
  create: (data: any) => api('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  start: (id: string) => api(`/campaigns/${id}/start`, { method: 'POST' }),
  pause: (id: string) => api(`/campaigns/${id}/pause`, { method: 'POST' }),
  addLeads: (id: string, contactIds: string[]) => 
    api(`/campaigns/${id}/leads`, { method: 'POST', body: JSON.stringify({ contact_ids: contactIds }) }),
  getLeads: (id: string) => api<{ leads: any[] }>(`/campaigns/${id}/leads`),
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
};
