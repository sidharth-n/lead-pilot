// src/jobs/processor.ts

import { v4 as uuid } from 'uuid';
import { query, queryOne, execute, atomicUpdate } from '../database/connection';
import { MockEmailService } from '../services/email.service';
import { ResendEmailService } from '../services/resend.service';
import { aiService } from '../services/ai.service';
import { config } from '../config';
import type { Campaign, CampaignLead, IEmailService } from '../types';

// Email service factory - toggles between real and mock
function getEmailService(): IEmailService {
  if (config.email.useReal) {
    console.log('📧 Using REAL email service (Resend)');
    return new ResendEmailService();
  }
  console.log('📧 Using MOCK email service');
  return new MockEmailService();
}

const emailService = getEmailService();

interface CampaignLeadWithContact extends CampaignLead {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  custom_data: string;
}

interface ProcessorConfig {
  batchSize: number;
  intervalMs: number;
}

export class CampaignProcessor {
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: ProcessorConfig;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 10,
      intervalMs: config.intervalMs || 30000, // 30 seconds
    };
  }

  start(): void {
    if (this.intervalId) return;

    console.log(`⏰ Processor starting (interval: ${this.config.intervalMs}ms)`);

    // Run immediately, then on interval
    this.processAll();
    this.intervalId = setInterval(() => this.processAll(), this.config.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏰ Processor stopped');
    }
  }

  async processAll(): Promise<void> {
    if (this.isRunning) {
      console.log('⏭️ Processor already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      await this.processInitialEmails();
      await this.processFollowUps();
    } catch (error) {
      console.error('❌ Processor error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // ============ INITIAL EMAILS ============

  private async processInitialEmails(): Promise<void> {
    // Get active campaigns
    const campaigns = query<Campaign>(
      `SELECT * FROM campaigns WHERE status = 'active'`
    );

    for (const campaign of campaigns) {
      await this.processCampaignInitialEmails(campaign);
    }
  }

  private async processCampaignInitialEmails(campaign: Campaign): Promise<void> {
    // Check daily limit
    const sentToday = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM email_logs el
       JOIN campaign_leads cl ON el.campaign_lead_id = cl.id
       WHERE cl.campaign_id = ?
         AND el.action_type = 'initial_email'
         AND date(el.created_at) = date('now')`,
      [campaign.id]
    );

    const remaining = campaign.daily_limit - (sentToday?.count || 0);
    if (remaining <= 0) {
      console.log(`📊 Campaign ${campaign.name}: Daily limit reached`);
      return;
    }

    // Get pending leads
    const leads = query<CampaignLeadWithContact>(
      `SELECT cl.*, c.email, c.first_name, c.last_name, c.company, c.job_title, c.custom_data
       FROM campaign_leads cl
       JOIN contacts c ON cl.contact_id = c.id
       WHERE cl.campaign_id = ?
         AND cl.status = 'pending'
       LIMIT ?`,
      [campaign.id, Math.min(remaining, this.config.batchSize)]
    );

    for (const lead of leads) {
      await this.sendInitialEmail(campaign, lead);
    }
  }

  private async sendInitialEmail(
    campaign: Campaign,
    lead: CampaignLeadWithContact
  ): Promise<void> {
    // ATOMIC CLAIM - prevents double-send
    const claimed = atomicUpdate(
      'campaign_leads',
      { status: 'sending' },
      { id: lead.id, status: 'pending' }
    );

    if (!claimed) {
      console.log(`⏭️ Lead ${lead.id} already claimed, skipping`);
      return;
    }

    try {
      // Generate content
      let subject = campaign.subject_template;
      let body = campaign.body_template;

      // USE PRE-GENERATED CONTENT (Option C Architecture)
      if (lead.generated_body && lead.generation_status === 'ready') {
        body = lead.generated_body;
        subject = lead.generated_subject || subject;
        console.log(`✨ Using pre-generated email for ${lead.email}`);
      } 
      // FALLBACK: On-the-fly generation (Option B / Mock)
      else if (campaign.ai_prompt) {
        console.log(`⚠️ No pre-generated email for ${lead.email}, generating now...`);
        const aiResult = await aiService.generateEmail({
          system_prompt: campaign.ai_prompt,
          contact_data: {
            email: lead.email,
            first_name: lead.first_name || undefined,
            last_name: lead.last_name || undefined,
            company: lead.company || undefined,
            job_title: lead.job_title || undefined,
          },
          template: body,
        });

        if (aiResult.success && aiResult.content) {
          body = aiResult.content;
        }
      } else {
        // Basic template replacement
        body = this.replaceTemplateVars(body, lead);
        subject = this.replaceTemplateVars(subject, lead);
      }

      // Send email
      const result = await emailService.send({
        to: lead.email,
        from_name: campaign.from_name,
        from_email: campaign.from_email,
        subject,
        body_html: body,
      });

      if (result.success) {
        // Calculate follow-up time
        const nextStatus = campaign.follow_up_enabled ? 'waiting_follow_up' : 'completed';

        execute(
          `UPDATE campaign_leads SET
             status = ?,
             email_sent_at = datetime('now'),
             follow_up_scheduled_for = ${campaign.follow_up_enabled ? `datetime('now', '+${campaign.follow_up_delay_minutes} minutes')` : 'NULL'},
             generated_subject = ?,
             generated_body = ?,
             updated_at = datetime('now')
           WHERE id = ?`,
          [nextStatus, subject, body, lead.id]
        );

        // Log success
        execute(
          `INSERT INTO email_logs (id, campaign_lead_id, action_type, status, provider_message_id)
           VALUES (?, ?, 'initial_email', 'sent', ?)`,
          [uuid(), lead.id, result.message_id]
        );

        console.log(`✅ Initial email sent to ${lead.email}`);
      } else {
        await this.handleFailure(lead.id, result.error || 'Unknown error', 'initial_email');
      }
    } catch (error) {
      await this.handleFailure(lead.id, String(error), 'initial_email');
    }
  }

  // ============ FOLLOW-UPS ============

  private async processFollowUps(): Promise<void> {
    // Find leads due for follow-up
    // CRITICAL: Check replied_at IS NULL to prevent race condition!
    const dueLeads = query<CampaignLeadWithContact & { from_name: string; from_email: string; follow_up_subject: string | null; follow_up_body: string | null }>(
      `SELECT cl.*, c.email, c.first_name, c.last_name, c.company, c.job_title, c.custom_data,
              ca.from_name, ca.from_email, ca.follow_up_subject, ca.follow_up_body, ca.follow_up_ai_prompt
       FROM campaign_leads cl
       JOIN contacts c ON cl.contact_id = c.id
       JOIN campaigns ca ON cl.campaign_id = ca.id
       WHERE cl.status = 'waiting_follow_up'
         AND cl.follow_up_scheduled_for <= datetime('now')
         AND cl.replied_at IS NULL
         AND ca.status = 'active'
       LIMIT ?`,
      [this.config.batchSize]
    );

    for (const lead of dueLeads) {
      await this.sendFollowUp(lead);
    }
  }

  private async sendFollowUp(lead: any): Promise<void> {
    // ATOMIC CLAIM - THIS PREVENTS THE RACE CONDITION!
    // Only updates if status is still 'waiting_follow_up' AND replied_at is still NULL
    const claimed = atomicUpdate(
      'campaign_leads',
      { status: 'sending_follow_up' },
      {
        id: lead.id,
        status: 'waiting_follow_up',
        replied_at: null, // CRITICAL: Only if not replied!
      }
    );

    if (!claimed) {
      // Lead either:
      // 1. Already being processed
      // 2. Already replied (RACE CONDITION CAUGHT!)
      // 3. Status changed
      console.log(`⏭️ Lead ${lead.id} cannot be claimed for follow-up (may have replied)`);
      return;
    }

    try {
      // Generate follow-up content
      let subject = lead.follow_up_subject || `Re: ${lead.generated_subject}`;
      let body = lead.follow_up_body || 'Just following up on my previous email. Would love to connect!';

      body = this.replaceTemplateVars(body, lead);
      subject = this.replaceTemplateVars(subject, lead);

      // Send
      const result = await emailService.send({
        to: lead.email,
        from_name: lead.from_name,
        from_email: lead.from_email,
        subject,
        body_html: body,
      });

      if (result.success) {
        execute(
          `UPDATE campaign_leads SET
             status = 'follow_up_sent',
             follow_up_sent_at = datetime('now'),
             generated_follow_up_subject = ?,
             generated_follow_up_body = ?,
             updated_at = datetime('now')
           WHERE id = ?`,
          [subject, body, lead.id]
        );

        execute(
          `INSERT INTO email_logs (id, campaign_lead_id, action_type, status, provider_message_id)
           VALUES (?, ?, 'follow_up', 'sent', ?)`,
          [uuid(), lead.id, result.message_id]
        );

        console.log(`✅ Follow-up sent to ${lead.email}`);
      } else {
        await this.handleFailure(lead.id, result.error || 'Unknown error', 'follow_up');
      }
    } catch (error) {
      await this.handleFailure(lead.id, String(error), 'follow_up');
    }
  }

  // ============ HELPERS ============

  private replaceTemplateVars(template: string, lead: CampaignLeadWithContact): string {
    return template
      .replace(/\{\{first_name\}\}/g, lead.first_name || 'there')
      .replace(/\{\{last_name\}\}/g, lead.last_name || '')
      .replace(/\{\{company\}\}/g, lead.company || 'your company')
      .replace(/\{\{job_title\}\}/g, lead.job_title || '')
      .replace(/\{\{email\}\}/g, lead.email);
  }

  private async handleFailure(
    leadId: string,
    error: string,
    actionType: 'initial_email' | 'follow_up'
  ): Promise<void> {
    const lead = queryOne<CampaignLead>(
      'SELECT * FROM campaign_leads WHERE id = ?',
      [leadId]
    );

    if (!lead) return;

    const newRetryCount = lead.retry_count + 1;
    const maxRetries = 3;

    if (newRetryCount >= maxRetries) {
      // Mark as failed
      execute(
        `UPDATE campaign_leads SET
           status = 'failed',
           last_error = ?,
           retry_count = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
        [error, newRetryCount, leadId]
      );
    } else {
      // Reset to previous status for retry
      const resetStatus = actionType === 'initial_email' ? 'pending' : 'waiting_follow_up';
      execute(
        `UPDATE campaign_leads SET
           status = ?,
           last_error = ?,
           retry_count = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
        [resetStatus, error, newRetryCount, leadId]
      );
    }

    // Log failure
    execute(
      `INSERT INTO email_logs (id, campaign_lead_id, action_type, status, error_message)
       VALUES (?, ?, ?, 'failed', ?)`,
      [uuid(), leadId, actionType, error]
    );

    console.log(`❌ Failed to send ${actionType} to lead ${leadId}: ${error}`);
  }
}

// Singleton
export const processor = new CampaignProcessor();
