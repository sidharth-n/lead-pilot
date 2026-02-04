// src/database/init.ts

import { getDatabase } from './connection';

const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Contacts table (Prosp.ai compatible)
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  job_title TEXT,
  headline TEXT,
  phone_number TEXT,
  website_url TEXT,
  location TEXT,
  linkedin_url TEXT,
  custom_data TEXT DEFAULT '{}',
  email_valid INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, email)
);


-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'paused', 'completed')),
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  ai_prompt TEXT,
  follow_up_enabled INTEGER DEFAULT 1,
  follow_up_delay_minutes INTEGER DEFAULT 2880,
  follow_up_subject TEXT,
  follow_up_body TEXT,
  follow_up_ai_prompt TEXT,
  daily_limit INTEGER DEFAULT 50,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Campaign Leads table
CREATE TABLE IF NOT EXISTS campaign_leads (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending', 'sending', 'sent', 'waiting_follow_up',
    'sending_follow_up', 'follow_up_sent', 'completed',
    'replied', 'bounced', 'failed'
  )),
  email_sent_at TEXT,
  email_opened_at TEXT,
  follow_up_scheduled_for TEXT,
  follow_up_sent_at TEXT,
  replied_at TEXT,
  generated_subject TEXT,
  generated_body TEXT,
  generated_follow_up_subject TEXT,
  generated_follow_up_body TEXT,
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(campaign_id, contact_id)
);

-- Email Logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  campaign_lead_id TEXT NOT NULL REFERENCES campaign_leads(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK(action_type IN ('initial_email', 'follow_up', 'reply_detected')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_follow_up ON campaign_leads(follow_up_scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_lead_id ON email_logs(campaign_lead_id);

-- Create test user
INSERT OR IGNORE INTO users (id, email, name) VALUES ('test-user-001', 'test@example.com', 'Test User');
`;

export function initializeDatabase(): void {
  const db = getDatabase();
  db.exec(SCHEMA);
  console.log('✅ Database initialized');
}
