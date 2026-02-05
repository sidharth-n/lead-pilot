// src/api/campaigns.api.ts

import { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { query, queryOne, execute, atomicUpdate } from '../database/connection';
import { validateCampaignInput, validateContactIds } from '../utils/validation';
import { CommonErrors, ErrorCodes, createError } from '../utils/errors';
import type { Campaign, CampaignLead, CreateCampaignInput } from '../types';

const campaignsApi = new Hono();
const TEST_USER_ID = 'test-user-001';

// GET /api/campaigns - List campaigns
campaignsApi.get('/', (c) => {
  try {
    const campaigns = query<Campaign>(
      'SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC',
      [TEST_USER_ID]
    );
    return c.json({ campaigns, count: campaigns.length });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// GET /api/campaigns/:id - Get campaign with stats
campaignsApi.get('/:id', (c) => {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json(createError('Campaign ID is required', ErrorCodes.MISSING_FIELD), 400);
    }
    
    const campaign = queryOne<Campaign>(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [id, TEST_USER_ID]
    );
    
    if (!campaign) {
      return c.json(CommonErrors.campaignNotFound(), 404);
    }
    
    // Get stats
    const stats = queryOne<{
      total: number;
      pending: number;
      sending: number;
      sent: number;
      waiting_follow_up: number;
      sending_follow_up: number;
      follow_up_sent: number;
      completed: number;
      replied: number;
      bounced: number;
      failed: number;
    }>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'sending' THEN 1 ELSE 0 END) as sending,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
         SUM(CASE WHEN status = 'waiting_follow_up' THEN 1 ELSE 0 END) as waiting_follow_up,
         SUM(CASE WHEN status = 'sending_follow_up' THEN 1 ELSE 0 END) as sending_follow_up,
         SUM(CASE WHEN status = 'follow_up_sent' THEN 1 ELSE 0 END) as follow_up_sent,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
         SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM campaign_leads WHERE campaign_id = ?`,
      [campaign.id]
    );
    
    return c.json({ campaign, stats });
  } catch (error) {
    console.error('Error getting campaign:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// POST /api/campaigns - Create campaign
campaignsApi.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateCampaignInput>();
    
    // Validate input
    const validation = validateCampaignInput(body);
    if (!validation.valid) {
      return c.json(CommonErrors.validationFailed(validation.errors), 400);
    }
    
    const id = uuid();
    
    execute(
      `INSERT INTO campaigns (
         id, user_id, name, from_name, from_email, subject_template, body_template, ai_prompt,
         follow_up_enabled, follow_up_delay_minutes, follow_up_subject, follow_up_body, follow_up_ai_prompt,
         daily_limit
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        TEST_USER_ID,
        body.name.trim(),
        body.from_name.trim(),
        body.from_email.trim().toLowerCase(),
        body.subject_template.trim(),
        body.body_template.trim(),
        body.ai_prompt?.trim() || null,
        body.follow_up_enabled !== false ? 1 : 0,
        body.follow_up_delay_minutes ?? 2880,
        body.follow_up_subject?.trim() || null,
        body.follow_up_body?.trim() || null,
        body.follow_up_ai_prompt?.trim() || null,
        body.daily_limit ?? 50,
      ]
    );
    
    const campaign = queryOne<Campaign>('SELECT * FROM campaigns WHERE id = ?', [id]);
    return c.json({ campaign }, 201);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// PUT /api/campaigns/:id - Update campaign
campaignsApi.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<Partial<CreateCampaignInput>>();
    
    // Check campaign exists
    const campaign = queryOne<Campaign>(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [id, TEST_USER_ID]
    );
    
    if (!campaign) {
      return c.json(CommonErrors.campaignNotFound(), 404);
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    
    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name.trim());
    }
    if (body.from_name !== undefined) {
      updates.push('from_name = ?');
      values.push(body.from_name.trim());
    }
    if (body.from_email !== undefined) {
      updates.push('from_email = ?');
      values.push(body.from_email.trim().toLowerCase());
    }
    if (body.subject_template !== undefined) {
      updates.push('subject_template = ?');
      values.push(body.subject_template.trim());
    }
    if (body.body_template !== undefined) {
      updates.push('body_template = ?');
      values.push(body.body_template.trim());
    }
    if (body.ai_prompt !== undefined) {
      updates.push('ai_prompt = ?');
      values.push(body.ai_prompt?.trim() || null);
    }
    if (body.follow_up_delay_minutes !== undefined) {
      updates.push('follow_up_delay_minutes = ?');
      values.push(body.follow_up_delay_minutes);
    }
    if (body.follow_up_subject !== undefined) {
      updates.push('follow_up_subject = ?');
      values.push(body.follow_up_subject?.trim() || null);
    }
    if (body.follow_up_body !== undefined) {
      updates.push('follow_up_body = ?');
      values.push(body.follow_up_body?.trim() || null);
    }
    
    if (updates.length === 0) {
      return c.json(createError('No fields to update', ErrorCodes.VALIDATION_ERROR), 400);
    }
    
    updates.push("updated_at = datetime('now')");
    
    const query = `UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`;
    const params = [...values, id];
    console.log('🔍 UPDATE SQL:', query);
    console.log('🔍 UPDATE VALUES:', params);
    
    execute(query, params);
    
    const updatedCampaign = queryOne<Campaign>('SELECT * FROM campaigns WHERE id = ?', [id]);
    console.log(`📝 Campaign "${updatedCampaign?.name}" updated`);
    
    return c.json({ campaign: updatedCampaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return c.json(CommonErrors.internalError(), 500);
  }
});

// POST /api/campaigns/:id/start - Start campaign
campaignsApi.post('/:id/start', (c) => {
  try {
    const id = c.req.param('id');
    
    // Check campaign exists
    const campaign = queryOne<Campaign>(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [id, TEST_USER_ID]
    );
    
    if (!campaign) {
      return c.json(CommonErrors.campaignNotFound(), 404);
    }
    
    // Check if already active
    if (campaign.status === 'active') {
      return c.json({ success: true, message: 'Campaign is already active' });
    }
    
    // Check if completed
    if (campaign.status === 'completed') {
      return c.json(
        createError('Cannot start a completed campaign', ErrorCodes.INVALID_STATE),
        409
      );
    }
    
    // Check if has leads
    const leadCount = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM campaign_leads WHERE campaign_id = ?',
      [id]
    );
    
    if (!leadCount || leadCount.count === 0) {
      return c.json(
        createError('Cannot start campaign with no leads', ErrorCodes.INVALID_STATE),
        409
      );
    }
    
    // Start (from draft or paused)
    execute(
      `UPDATE campaigns SET status = 'active', updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
    
    console.log(`🚀 Campaign "${campaign.name}" started with ${leadCount.count} leads`);
    
    return c.json({ success: true, message: 'Campaign started', leadCount: leadCount.count });
  } catch (error) {
    console.error('Error starting campaign:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// POST /api/campaigns/:id/pause - Pause campaign
campaignsApi.post('/:id/pause', (c) => {
  try {
    const id = c.req.param('id');
    
    const campaign = queryOne<Campaign>(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [id, TEST_USER_ID]
    );
    
    if (!campaign) {
      return c.json(CommonErrors.campaignNotFound(), 404);
    }
    
    if (campaign.status === 'paused') {
      return c.json({ success: true, message: 'Campaign is already paused' });
    }
    
    if (campaign.status !== 'active') {
      return c.json(
        createError('Can only pause active campaigns', ErrorCodes.INVALID_STATE),
        409
      );
    }
    
    execute(
      `UPDATE campaigns SET status = 'paused', updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
    
    console.log(`⏸️ Campaign "${campaign.name}" paused`);
    
    return c.json({ success: true, message: 'Campaign paused' });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// POST /api/campaigns/:id/leads - Add leads to campaign
campaignsApi.post('/:id/leads', async (c) => {
  try {
    const campaignId = c.req.param('id');
    const body = await c.req.json<{ contact_ids: string[] }>();
    
    // Validate input
    const validation = validateContactIds(body);
    if (!validation.valid) {
      return c.json(CommonErrors.validationFailed(validation.errors), 400);
    }
    
    // Verify campaign exists
    const campaign = queryOne<Campaign>(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [campaignId, TEST_USER_ID]
    );
    
    if (!campaign) {
      return c.json(CommonErrors.campaignNotFound(), 404);
    }
    
    // Check if campaign is completed
    if (campaign.status === 'completed') {
      return c.json(
        createError('Cannot add leads to a completed campaign', ErrorCodes.INVALID_STATE),
        409
      );
    }
    
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const contactId of body.contact_ids) {
      // Verify contact exists
      const contact = queryOne<{ id: string }>(
        'SELECT id FROM contacts WHERE id = ? AND user_id = ?',
        [contactId, TEST_USER_ID]
      );
      
      if (!contact) {
        skipped++;
        errors.push(`Contact ${contactId} not found`);
        continue;
      }
      
      try {
        execute(
          `INSERT INTO campaign_leads (id, campaign_id, contact_id) VALUES (?, ?, ?)`,
          [uuid(), campaignId, contactId]
        );
        added++;
      } catch (error: any) {
        skipped++;
        if (error.message?.includes('UNIQUE constraint')) {
          errors.push(`Contact ${contactId} already in campaign`);
        } else {
          errors.push(`Contact ${contactId}: ${error.message || 'Unknown error'}`);
        }
      }
    }
    
    return c.json({ 
      success: true,
      added, 
      skipped,
      total: body.contact_ids.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error adding leads:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// GET /api/campaigns/:id/leads - Get campaign leads with status
campaignsApi.get('/:id/leads', (c) => {
  try {
    const campaignId = c.req.param('id');
    
    // Verify campaign exists
    const campaign = queryOne<Campaign>(
      'SELECT id FROM campaigns WHERE id = ? AND user_id = ?',
      [campaignId, TEST_USER_ID]
    );
    
    if (!campaign) {
      return c.json(CommonErrors.campaignNotFound(), 404);
    }
    
    const leads = query<CampaignLead & { email: string; first_name: string | null; company: string | null }>(
      `SELECT cl.*, c.email, c.first_name, c.company
       FROM campaign_leads cl
       JOIN contacts c ON cl.contact_id = c.id
       WHERE cl.campaign_id = ?
       ORDER BY cl.created_at DESC`,
      [campaignId]
    );
    
    return c.json({ leads, count: leads.length });
  } catch (error) {
    console.error('Error getting leads:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// POST /api/campaigns/leads/:id/simulate-reply - IMPORTANT: For testing!
campaignsApi.post('/leads/:id/simulate-reply', (c) => {
  try {
    const leadId = c.req.param('id');
    
    if (!leadId) {
      return c.json(createError('Lead ID is required', ErrorCodes.MISSING_FIELD), 400);
    }
    
    // Check lead exists
    const lead = queryOne<CampaignLead>(
      'SELECT * FROM campaign_leads WHERE id = ?',
      [leadId]
    );
    
    if (!lead) {
      return c.json(CommonErrors.leadNotFound(), 404);
    }
    
    // Check if already in terminal state
    if (['replied', 'bounced', 'failed'].includes(lead.status)) {
      return c.json({ 
        success: true, 
        message: `Lead already in terminal state: ${lead.status}`,
        alreadyReplied: lead.status === 'replied'
      });
    }
    
    // Check if initial email was sent
    if (lead.status === 'pending' || lead.status === 'sending') {
      return c.json(
        createError('Cannot mark as replied before initial email is sent', ErrorCodes.INVALID_STATE),
        409
      );
    }
    
    const result = execute(
      `UPDATE campaign_leads SET
         status = 'replied',
         replied_at = datetime('now'),
         updated_at = datetime('now')
       WHERE id = ?`,
      [leadId]
    );
    
    // Log the reply
    execute(
      `INSERT INTO email_logs (id, campaign_lead_id, action_type, status)
       VALUES (?, ?, 'reply_detected', 'delivered')`,
      [uuid(), leadId]
    );
    
    console.log(`📨 Lead ${leadId} marked as REPLIED`);
    
    return c.json({ success: true, message: 'Lead marked as replied' });
  } catch (error) {
    console.error('Error simulating reply:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// DELETE /api/campaigns/:id - Delete campaign
campaignsApi.delete('/:id', (c) => {
  try {
    const id = c.req.param('id');
    
    const campaign = queryOne<Campaign>(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [id, TEST_USER_ID]
    );
    
    if (!campaign) {
      return c.json(CommonErrors.campaignNotFound(), 404);
    }
    
    // Don't allow deleting active campaigns
    if (campaign.status === 'active') {
      return c.json(
        createError('Cannot delete an active campaign. Pause it first.', ErrorCodes.INVALID_STATE),
        409
      );
    }
    
    // Delete campaign (cascade will delete leads)
    execute('DELETE FROM campaigns WHERE id = ?', [id]);
    
    console.log(`🗑️ Campaign "${campaign.name}" deleted`);
    
    return c.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

export { campaignsApi };
