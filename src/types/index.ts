// src/types/index.ts

// ============ Database Entities ============

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  location: string | null;
  linkedin_url: string | null;
  custom_data: string; // JSON string
  email_valid: number; // 0 or 1
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  status: CampaignStatus;
  from_name: string;
  from_email: string;
  subject_template: string;
  body_template: string;
  ai_prompt: string | null;
  follow_up_enabled: number; // 0 or 1
  follow_up_delay_minutes: number;
  follow_up_subject: string | null;
  follow_up_body: string | null;
  follow_up_ai_prompt: string | null;
  daily_limit: number;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface CampaignLead {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: CampaignLeadStatus;
  email_sent_at: string | null;
  email_opened_at: string | null;
  follow_up_scheduled_for: string | null;
  follow_up_sent_at: string | null;
  replied_at: string | null;
  generated_subject: string | null;
  generated_body: string | null;
  generated_follow_up_subject: string | null;
  generated_follow_up_body: string | null;
  last_error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export type CampaignLeadStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'waiting_follow_up'
  | 'sending_follow_up'
  | 'follow_up_sent'
  | 'completed'
  | 'replied'
  | 'bounced'
  | 'failed';

export interface EmailLog {
  id: string;
  campaign_lead_id: string;
  action_type: 'initial_email' | 'follow_up' | 'reply_detected';
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  provider_message_id: string | null;
  error_message: string | null;
  metadata: string; // JSON string
  created_at: string;
}

// ============ API Input Types ============

export interface CreateContactInput {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  location?: string;
  linkedin_url?: string;
  custom_data?: Record<string, unknown>;
}

export interface CreateCampaignInput {
  name: string;
  from_name: string;
  from_email: string;
  subject_template: string;
  body_template: string;
  ai_prompt?: string;
  follow_up_enabled?: boolean;
  follow_up_delay_minutes?: number;
  follow_up_subject?: string;
  follow_up_body?: string;
  follow_up_ai_prompt?: string;
  daily_limit?: number;
}

// ============ Service Interfaces ============

export interface EmailSendRequest {
  to: string;
  from_name: string;
  from_email: string;
  subject: string;
  body_html: string;
}

export interface EmailSendResult {
  success: boolean;
  message_id: string | null;
  error: string | null;
}

export interface IEmailService {
  send(request: EmailSendRequest): Promise<EmailSendResult>;
}

export interface AIGenerateRequest {
  system_prompt: string;
  contact_data: {
    email: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    job_title?: string;
  };
  template: string;
}

export interface AIGenerateResult {
  success: boolean;
  content: string | null;
  error: string | null;
}

export interface IAIService {
  generateEmail(request: AIGenerateRequest): Promise<AIGenerateResult>;
}
