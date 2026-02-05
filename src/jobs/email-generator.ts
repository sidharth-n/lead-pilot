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
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 2000;
  private readonly DELAY_BETWEEN_LEADS_MS = 3000; // 3 seconds between leads

  constructor(config: Partial<GeneratorConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 2, // Process 2 leads at a time max
      intervalMs: config.intervalMs || 5000,
    };
  }

  start(): void {
    if (this.intervalId) return;

    console.log(`🤖 Generator starting (batch: ${this.config.batchSize}, interval: ${this.config.intervalMs}ms)`);

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
    // First, check for and reset any stuck leads (generating for >2 minutes)
    const STUCK_TIMEOUT_MINUTES = 2;
    try {
      execute(
        `UPDATE campaign_leads 
         SET generation_status = 'failed', 
             last_error = 'Timeout: Generation took too long. Please try again.',
             updated_at = datetime('now')
         WHERE generation_status = 'generating' 
           AND updated_at < datetime('now', '-' || ? || ' minutes')`,
        [STUCK_TIMEOUT_MINUTES]
      );
    } catch (err) {
      console.error('Error resetting stuck leads:', err);
    }

    // Find leads needing generation (status = 'generating' means user triggered it)
    const leads = query<CampaignLeadWithDetails>(
      `SELECT cl.*, 
              c.email, c.first_name, c.last_name, c.company, c.job_title, c.headline, c.custom_data,
              ca.name as campaign_name, ca.subject_template, ca.body_template, ca.ai_prompt,
              ca.follow_up_enabled, ca.follow_up_subject, ca.follow_up_body, ca.follow_up_ai_prompt
       FROM campaign_leads cl
       JOIN contacts c ON cl.contact_id = c.id
       JOIN campaigns ca ON cl.campaign_id = ca.id
       WHERE cl.generation_status = 'generating'
         AND ca.status IN ('draft', 'active') 
       ORDER BY cl.updated_at ASC
       LIMIT ?`,
      [this.config.batchSize]
    );

    if (leads.length > 0) {
      console.log(`\n📧 Found ${leads.length} leads needing generation`);
    }

    for (let i = 0; i < leads.length; i++) {
      try {
        await this.generateForLead(leads[i]);
      } catch (err: any) {
        console.error(`❌ Unexpected error for ${leads[i].email}:`, err);
        // Mark as failed to prevent infinite loop
        execute(
          `UPDATE campaign_leads SET generation_status = 'failed', last_error = ?, updated_at = datetime('now') WHERE id = ?`,
          [`Unexpected error: ${err.message || err}`, leads[i].id]
        );
      }
      
      // Add delay between leads to avoid rate limiting (except for last one)
      if (i < leads.length - 1) {
        console.log(`⏳ Waiting ${this.DELAY_BETWEEN_LEADS_MS}ms before next lead...`);
        await this.delay(this.DELAY_BETWEEN_LEADS_MS);
      }
    }
    
    if (leads.length > 0) {
      console.log(`✅ Generation batch complete: ${leads.length} leads processed`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  private async generateForLead(lead: CampaignLeadWithDetails): Promise<void> {
    try {
      console.log(`\n🤖 ========== Generating emails for ${lead.email} ==========`);

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

      // Build enhanced prompt with research data if available
      let enhancedPrompt = lead.ai_prompt || 'Write a personalized cold email.';
      
      // Add research intel if available
      if (lead.research_data) {
        try {
          const research = JSON.parse(lead.research_data);
          if (research.summary) {
            enhancedPrompt += `\n\nRecent company intel:\n${research.summary}`;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // AI Generation with retry logic
      console.log('📝 Calling AI service...');
      console.log('📝 Prompt preview:', enhancedPrompt.slice(0, 150) + '...');
      
      let result = null;
      let retryCount = 0;
      
      while (retryCount <= this.MAX_RETRIES) {
        result = await aiService.generateEmail({
          system_prompt: enhancedPrompt,
          contact_data: contactData,
          template: lead.body_template,
        });

        if (result.success && result.content) {
          break; // Success!
        }
        
        // Check if we should retry (rate limit or transient error)
        const isRetryable = result.error?.includes('Rate limited') || 
                           result.error?.includes('429') ||
                           result.error?.includes('timeout') ||
                           result.error?.includes('ECONNRESET');
        
        if (isRetryable) {
          retryCount++;
          if (retryCount <= this.MAX_RETRIES) {
            const delayMs = this.BASE_DELAY_MS * Math.pow(2, retryCount - 1) + Math.random() * 1000; // Exponential backoff with jitter
            console.log(`⏳ Retrying in ${Math.round(delayMs)}ms (attempt ${retryCount}/${this.MAX_RETRIES})...`);
            await this.delay(delayMs);
          }
        } else {
          // Non-retryable error
          break;
        }
      }

      console.log('📝 AI Result:', { success: result?.success, subject: result?.subject, contentLength: result?.content?.length, error: result?.error });

      if (result?.success && result?.content) {
        generatedBody = result.content;
        // Use AI-generated subject if available, otherwise fall back to template replacement
        if (result.subject) {
          generatedSubject = result.subject;
          console.log('✅ Using AI subject:', generatedSubject);
        } else {
          generatedSubject = this.replaceTemplateVars(generatedSubject, lead);
        }
        console.log('✅ Using AI-generated body:', generatedBody.slice(0, 100) + '...');
      } else {
        throw new Error(result?.error || 'Failed to generate initial email');
      }


      // 3. Generate Follow-up (if enabled)
      let generatedFollowUpSubject = lead.follow_up_subject;
      let generatedFollowUpBody = lead.follow_up_body;

      if (lead.follow_up_enabled) {
        // Build follow-up prompt with context of initial email
        const followUpPrompt = lead.follow_up_ai_prompt 
          ? `${lead.follow_up_ai_prompt}\n\nContext: This is a follow-up to an initial email that was already sent.`
          : 'Write a gentle follow-up email. Keep it short, friendly, and reference that you reached out before.';
        
        // AI Generation for Follow-up 
        const followUpResult = await aiService.generateEmail({
          system_prompt: followUpPrompt,
          contact_data: contactData,
          template: lead.follow_up_body || 'Just following up on my previous email...',
        });

        if (followUpResult.success && followUpResult.content) {
          generatedFollowUpBody = followUpResult.content;
          if (followUpResult.subject) {
            generatedFollowUpSubject = followUpResult.subject;
          } else if (generatedFollowUpSubject) {
            generatedFollowUpSubject = this.replaceTemplateVars(generatedFollowUpSubject, lead);
          }
        } else if (generatedFollowUpBody) {
          // Fall back to template replacement if AI fails
          generatedFollowUpBody = this.replaceTemplateVars(generatedFollowUpBody, lead);
          if (generatedFollowUpSubject) {
            generatedFollowUpSubject = this.replaceTemplateVars(generatedFollowUpSubject, lead);
          }
        }

        // Default follow-up subject if still empty
        if (!generatedFollowUpSubject) {
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
