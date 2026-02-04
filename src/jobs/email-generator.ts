// src/jobs/email-generator.ts

import { query, queryOne, execute, atomicUpdate } from '../database/connection';
import { aiService } from '../services/ai.service';
import type { Campaign, CampaignLead } from '../types';

interface GeneratorConfig {
  batchSize: number;
  intervalMs: number;
}

interface CampaignLeadWithDetails extends CampaignLead {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  headline: string | null;
  custom_data: string;
  
  // Campaign details
  campaign_name: string;
  subject_template: string;
  body_template: string;
  ai_prompt: string | null;
  follow_up_enabled: number;
  follow_up_subject: string | null;
  follow_up_body: string | null;
  follow_up_ai_prompt: string | null;
}

export class EmailGenerator {
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: GeneratorConfig;

  constructor(config: Partial<GeneratorConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 5, // Lower batch size for AI generation (rate limits)
      intervalMs: config.intervalMs || 5000, // Check every 5 seconds
    };
  }

  start(): void {
    if (this.intervalId) return;

    console.log(`🤖 Generator starting (interval: ${this.config.intervalMs}ms)`);

    // Run immediately, then on interval
    this.generateAll();
    this.intervalId = setInterval(() => this.generateAll(), this.config.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🤖 Generator stopped');
    }
  }

  async generateAll(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.processPendingLeads();
    } catch (error) {
      console.error('❌ Generator error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processPendingLeads(): Promise<void> {
    // Find leads needing generation
    const leads = query<CampaignLeadWithDetails>(
      `SELECT cl.*, 
              c.email, c.first_name, c.last_name, c.company, c.job_title, c.headline, c.custom_data,
              ca.name as campaign_name, ca.subject_template, ca.body_template, ca.ai_prompt,
              ca.follow_up_enabled, ca.follow_up_subject, ca.follow_up_body, ca.follow_up_ai_prompt
       FROM campaign_leads cl
       JOIN contacts c ON cl.contact_id = c.id
       JOIN campaigns ca ON cl.campaign_id = ca.id
       WHERE cl.generation_status = 'pending'
         AND ca.status IN ('draft', 'active') 
       LIMIT ?`,
      [this.config.batchSize]
    );

    for (const lead of leads) {
      await this.generateForLead(lead);
    }
  }

  private async generateForLead(lead: CampaignLeadWithDetails): Promise<void> {
    // 1. Atomic claim
    const claimed = atomicUpdate(
      'campaign_leads',
      { generation_status: 'generating' },
      { id: lead.id, generation_status: 'pending' }
    );

    if (!claimed) return;

    try {
      console.log(`🤖 Generating emails for ${lead.email}...`);

      const contactData = {
        email: lead.email,
        first_name: lead.first_name || undefined,
        last_name: lead.last_name || undefined,
        company: lead.company || undefined,
        job_title: lead.job_title || undefined,
        headline: lead.headline || undefined,
      };

      // 2. Generate Initial Email
      let generatedSubject = lead.subject_template;
      let generatedBody = lead.body_template;

      if (lead.ai_prompt) {
        // AI Generation
        const result = await aiService.generateEmail({
          system_prompt: lead.ai_prompt,
          contact_data: contactData,
          template: lead.body_template,
        });

        if (result.success && result.content) {
          generatedBody = result.content;
        } else {
          throw new Error(result.error || 'Failed to generate initial email');
        }
      } else {
        // Template Replacement
        generatedBody = this.replaceTemplateVars(generatedBody, lead);
      }
      
      // Always replace vars in subject
      generatedSubject = this.replaceTemplateVars(generatedSubject, lead);


      // 3. Generate Follow-up (if enabled)
      let generatedFollowUpSubject = lead.follow_up_subject;
      let generatedFollowUpBody = lead.follow_up_body;

      if (lead.follow_up_enabled) {
        if (lead.follow_up_ai_prompt) {
           // AI Generation for Follow-up (Context: previously sent email)
           const result = await aiService.generateEmail({
            system_prompt: lead.follow_up_ai_prompt,
            contact_data: contactData,
            template: lead.follow_up_body || 'Just following up...',
          });
  
          if (result.success && result.content) {
            generatedFollowUpBody = result.content;
          }
        } else if (generatedFollowUpBody) {
          // Template Replacement
          generatedFollowUpBody = this.replaceTemplateVars(generatedFollowUpBody, lead);
        }

        if (generatedFollowUpSubject) {
           generatedFollowUpSubject = this.replaceTemplateVars(generatedFollowUpSubject, lead);
        } else {
           generatedFollowUpSubject = `Re: ${generatedSubject}`;
        }
      }

      // 4. Save results
      execute(
        `UPDATE campaign_leads SET
           generated_subject = ?,
           generated_body = ?,
           generated_follow_up_subject = ?,
           generated_follow_up_body = ?,
           generation_status = 'ready',
           updated_at = datetime('now')
         WHERE id = ?`,
        [
          generatedSubject, 
          generatedBody, 
          generatedFollowUpSubject, 
          generatedFollowUpBody, 
          lead.id
        ]
      );

      console.log(`✅ Generated emails for ${lead.email}`);

    } catch (error: any) {
      console.error(`❌ Generation failed for ${lead.email}:`, error);
      
      execute(
        `UPDATE campaign_leads SET
           generation_status = 'failed',
           last_error = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
        [String(error), lead.id]
      );
    }
  }

  private replaceTemplateVars(template: string, lead: CampaignLeadWithDetails): string {
    return template
      .replace(/\{\{first_name\}\}/g, lead.first_name || 'there')
      .replace(/\{\{last_name\}\}/g, lead.last_name || '')
      .replace(/\{\{company\}\}/g, lead.company || 'your company')
      .replace(/\{\{job_title\}\}/g, lead.job_title || '')
      .replace(/\{\{headline\}\}/g, lead.headline || '')
      .replace(/\{\{email\}\}/g, lead.email);
  }
}

export const emailGenerator = new EmailGenerator();
