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

// Background processor for research queue
async function processResearchQueue(leads: LeadWithContact[]) {
  for (const lead of leads) {
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
        continue;
      }

      console.log(`🔍 Researching ${lead.company} for ${lead.email}...`);

      const result = await perplexityService.researchCompany({
        company: lead.company,
        job_title: lead.job_title || undefined,
        first_name: lead.first_name || undefined,
      });

      if (result.success && result.summary) {
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
        console.log(`✅ Research complete for ${lead.email}`);
      } else {
        execute(
          `UPDATE campaign_leads SET 
             research_status = 'failed',
             research_error = ?,
             updated_at = datetime('now')
           WHERE id = ?`,
          [result.error || 'Unknown error', lead.id]
        );
        console.log(`❌ Research failed for ${lead.email}: ${result.error}`);
      }

    } catch (error: any) {
      console.error(`Error researching ${lead.email}:`, error);
      execute(
        `UPDATE campaign_leads SET 
           research_status = 'failed',
           research_error = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
        [error.message || 'Unknown error', lead.id]
      );
    }
  }
}

export { researchApi };
