// src/api/generation.api.ts

import { Hono } from 'hono';
import { execute, query, queryOne } from '../database/connection';
import { aiService } from '../services/ai.service';
import { CampaignLead } from '../types';

export const generationApi = new Hono();

// Get generation status for all leads in a campaign
generationApi.get('/:campaignId/status', async (c) => {
  const { campaignId } = c.req.param();
  
  const leads = query<{ id: string; generation_status: string }>(
    `SELECT id, generation_status FROM campaign_leads WHERE campaign_id = ?`,
    [campaignId]
  );
  
  return c.json({ leads });
});

// Get generated content for a specific lead
generationApi.get('/lead/:leadId', async (c) => {
  const { leadId } = c.req.param();
  
  const lead = queryOne<CampaignLead>(
    `SELECT * FROM campaign_leads WHERE id = ?`,
    [leadId]
  );

  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  return c.json({ 
    lead: {
      id: lead.id,
      generated_subject: lead.generated_subject,
      generated_body: lead.generated_body,
      generated_follow_up_subject: lead.generated_follow_up_subject,
      generated_follow_up_body: lead.generated_follow_up_body,
      generation_status: lead.generation_status,
      last_error: lead.last_error
    }
  });
});

// Update generated content (User Edit)
generationApi.put('/lead/:leadId', async (c) => {
  const { leadId } = c.req.param();
  const body = await c.req.json();
  
  const { generated_subject, generated_body, generated_follow_up_subject, generated_follow_up_body } = body;

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
      generated_subject,
      generated_body,
      generated_follow_up_subject, 
      generated_follow_up_body,
      leadId
    ]
  );

  return c.json({ success: true });
});

// Regenerate content for a specific lead
generationApi.post('/lead/:leadId/regenerate', async (c) => {
  const { leadId } = c.req.param();

  // Reset status to pending so the background job picks it up
  execute(
    `UPDATE campaign_leads SET 
       generation_status = 'pending',
       generated_body = NULL,
       updated_at = datetime('now')
     WHERE id = ?`,
    [leadId]
  );

  return c.json({ success: true, message: 'Queued for regeneration' });
});
