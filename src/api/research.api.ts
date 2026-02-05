// src/api/research.api.ts

import { Hono } from 'hono';
import { query, queryOne, execute } from '../database/connection';
import { perplexityService } from '../services/perplexity.service';
import type { CampaignLead } from '../types';

const researchApi = new Hono();

interface LeadWithContact extends CampaignLead {
  email: string;
  first_name: string | null;
  company: string | null;
  job_title: string | null;
}

// POST /api/research/leads - Research selected leads
researchApi.post('/leads', async (c) => {
  try {
    const body = await c.req.json<{ lead_ids: string[] }>();
    
    if (!body.lead_ids || body.lead_ids.length === 0) {
      return c.json({ error: 'No lead IDs provided' }, 400);
    }

    // Check if Perplexity is configured
    if (!perplexityService.isConfigured()) {
      return c.json({ 
        error: 'Perplexity API key not configured. Add PERPLEXITY_API_KEY to .env' 
      }, 400);
    }

    // Mark leads as researching
    const placeholders = body.lead_ids.map(() => '?').join(',');
    execute(
      `UPDATE campaign_leads 
       SET research_status = 'researching', updated_at = datetime('now')
       WHERE id IN (${placeholders}) AND research_status = 'not_started'`,
      body.lead_ids
    );

    // Get leads with contact info
    const leads = query<LeadWithContact>(
      `SELECT cl.*, c.email, c.first_name, c.company, c.job_title
       FROM campaign_leads cl
       JOIN contacts c ON cl.contact_id = c.id
       WHERE cl.id IN (${placeholders})`,
      body.lead_ids
    );

    // Process each lead (async but respond immediately)
    processResearchQueue(leads);

    return c.json({ 
      success: true, 
      message: `Research started for ${leads.length} leads`,
      queued: leads.length
    });

  } catch (error: any) {
    console.error('Error starting research:', error);
    return c.json({ error: error.message || 'Failed to start research' }, 500);
  }
});

// GET /api/research/leads/:id - Get research status for a lead
researchApi.get('/leads/:id', (c) => {
  try {
    const leadId = c.req.param('id');
    
    const lead = queryOne<CampaignLead>(
      `SELECT research_status, research_data, research_error, researched_at 
       FROM campaign_leads WHERE id = ?`,
      [leadId]
    );

    if (!lead) {
      return c.json({ error: 'Lead not found' }, 404);
    }

    return c.json({
      research_status: lead.research_status,
      research_data: lead.research_data ? JSON.parse(lead.research_data) : null,
      research_error: lead.research_error,
      researched_at: lead.researched_at,
    });

  } catch (error: any) {
    console.error('Error getting research:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/research/retry-failed/:campaignId - Retry all failed research in a campaign
researchApi.post('/retry-failed/:campaignId', async (c) => {
  try {
    const campaignId = c.req.param('campaignId');
    
    // Find all failed leads in this campaign
    const failedLeads = query<LeadWithContact>(
      `SELECT cl.*, c.email, c.first_name, c.company, c.job_title
       FROM campaign_leads cl
       JOIN contacts c ON cl.contact_id = c.id
       WHERE cl.campaign_id = ? AND cl.research_status = 'failed'`,
      [campaignId]
    );
    
    if (failedLeads.length === 0) {
      return c.json({ success: true, message: 'No failed leads to retry', retried: 0 });
    }
    
    // Mark them as researching
    const leadIds = failedLeads.map(l => l.id);
    const placeholders = leadIds.map(() => '?').join(',');
    execute(
      `UPDATE campaign_leads 
       SET research_status = 'researching', research_error = NULL, updated_at = datetime('now')
       WHERE id IN (${placeholders})`,
      leadIds
    );
    
    // Process in background
    processResearchQueue(failedLeads);
    
    return c.json({ 
      success: true, 
      message: `Retrying research for ${failedLeads.length} failed leads`,
      retried: failedLeads.length
    });
    
  } catch (error: any) {
    console.error('Error retrying failed research:', error);
    return c.json({ error: error.message || 'Failed to retry' }, 500);
  }
});

// Background processor for research queue with rate limiting
async function processResearchQueue(leads: LeadWithContact[]) {
  console.log(`🔍 Starting research queue for ${leads.length} leads (sequential with 2s delay)`);
  
  const DELAY_BETWEEN_REQUESTS_MS = 2000; // 2 seconds between requests
  const MAX_RETRIES = 3;
  
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    
    try {
      // Skip if no company
      if (!lead.company) {
        execute(
          `UPDATE campaign_leads SET 
             research_status = 'skipped',
             research_error = 'No company name available',
             updated_at = datetime('now')
           WHERE id = ?`,
          [lead.id]
        );
        console.log(`⏭️ [${i + 1}/${leads.length}] Skipped ${lead.email} (no company)`);
        continue;
      }

      console.log(`🔍 [${i + 1}/${leads.length}] Researching ${lead.company} for ${lead.email}...`);

      let result = null;
      let retryCount = 0;
      
      while (retryCount <= MAX_RETRIES) {
        result = await perplexityService.researchCompany({
          company: lead.company,
          job_title: lead.job_title || undefined,
          first_name: lead.first_name || undefined,
        });

        if (result.success && result.summary) {
          break; // Success!
        }
        
        // Check if we should retry
        if (result.error?.includes('429') || result.error?.includes('Rate limit')) {
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            const delayMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            console.log(`⏳ [${i + 1}/${leads.length}] Rate limited, retrying in ${Math.round(delayMs)}ms (attempt ${retryCount}/${MAX_RETRIES})...`);
            await delay(delayMs);
          }
        } else {
          // Non-retryable error
          break;
        }
      }

      if (result?.success && result?.summary) {
        execute(
          `UPDATE campaign_leads SET 
             research_status = 'complete',
             research_data = ?,
             research_error = NULL,
             researched_at = datetime('now'),
             updated_at = datetime('now')
           WHERE id = ?`,
          [JSON.stringify({ summary: result.summary, source: result.source }), lead.id]
        );
        console.log(`✅ [${i + 1}/${leads.length}] Research complete for ${lead.email}`);
      } else {
        execute(
          `UPDATE campaign_leads SET 
             research_status = 'failed',
             research_error = ?,
             updated_at = datetime('now')
           WHERE id = ?`,
          [result?.error || 'Unknown error', lead.id]
        );
        console.log(`❌ [${i + 1}/${leads.length}] Research failed for ${lead.email}: ${result?.error}`);
      }

    } catch (error: any) {
      console.error(`❌ [${i + 1}/${leads.length}] Error researching ${lead.email}:`, error);
      execute(
        `UPDATE campaign_leads SET 
           research_status = 'failed',
           research_error = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
        [error.message || 'Unknown error', lead.id]
      );
    }
    
    // Add delay between leads to avoid rate limiting (except for last one)
    if (i < leads.length - 1) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS_MS}ms before next request...`);
      await delay(DELAY_BETWEEN_REQUESTS_MS);
    }
  }
  
  console.log(`✅ Research queue complete: ${leads.length} leads processed`);
}

// Helper delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { researchApi };
