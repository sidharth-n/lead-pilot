// src/api/webhooks.api.ts

import { Hono } from 'hono';
import { execute, query } from '../database/connection';

const webhooksApi = new Hono();

// Resend webhook events
// See: https://resend.com/docs/dashboard/webhooks/event-types
webhooksApi.post('/email/events', async (c) => {
  try {
    const body = await c.req.json();
    const { type, data } = body;
    
    console.log(`📩 Resend Webhook: ${type}`, data?.email_id);

    // Find the email log by provider_message_id
    if (!data?.email_id) {
      return c.json({ received: true, processed: false, reason: 'No email_id' });
    }

    const emailLog = query<{ id: string; campaign_lead_id: string }>(
      `SELECT id, campaign_lead_id FROM email_logs WHERE provider_message_id = ?`,
      [data.email_id]
    )[0];

    if (!emailLog) {
      console.log(`⚠️ No email log found for message ID: ${data.email_id}`);
      return c.json({ received: true, processed: false, reason: 'Email not found' });
    }

    // Process different event types
    switch (type) {
      case 'email.delivered':
        // Mark as delivered
        execute(
          `UPDATE email_logs SET status = 'delivered', metadata = json_set(COALESCE(metadata, '{}'), '$.delivered_at', ?) WHERE id = ?`,
          [new Date().toISOString(), emailLog.id]
        );
        console.log(`✅ Email delivered: ${data.email_id}`);
        break;

      case 'email.bounced':
        // Mark as bounced - this is critical for list hygiene
        execute(
          `UPDATE email_logs SET status = 'bounced', error_message = ?, metadata = json_set(COALESCE(metadata, '{}'), '$.bounce_type', ?) WHERE id = ?`,
          [data.bounce?.message || 'Bounced', data.bounce?.type || 'unknown', emailLog.id]
        );
        // Also mark the lead as failed
        execute(
          `UPDATE campaign_leads SET status = 'failed', last_error = 'Email bounced' WHERE id = ?`,
          [emailLog.campaign_lead_id]
        );
        console.log(`⚠️ Email bounced: ${data.email_id}`);
        break;

      case 'email.complained':
        // User marked as spam - stop all future emails
        execute(
          `UPDATE email_logs SET status = 'complained', metadata = json_set(COALESCE(metadata, '{}'), '$.complained_at', ?) WHERE id = ?`,
          [new Date().toISOString(), emailLog.id]
        );
        execute(
          `UPDATE campaign_leads SET status = 'failed', last_error = 'Marked as spam' WHERE id = ?`,
          [emailLog.campaign_lead_id]
        );
        console.log(`🚫 Email complained (spam): ${data.email_id}`);
        break;

      case 'email.opened':
        // Track opens for analytics
        execute(
          `UPDATE email_logs SET metadata = json_set(COALESCE(metadata, '{}'), '$.opened_at', ?, '$.open_count', COALESCE(json_extract(metadata, '$.open_count'), 0) + 1) WHERE id = ?`,
          [new Date().toISOString(), emailLog.id]
        );
        console.log(`👁️ Email opened: ${data.email_id}`);
        break;

      case 'email.clicked':
        // Track clicks
        execute(
          `UPDATE email_logs SET metadata = json_set(COALESCE(metadata, '{}'), '$.clicked_at', ?) WHERE id = ?`,
          [new Date().toISOString(), emailLog.id]
        );
        console.log(`🔗 Email clicked: ${data.email_id}`);
        break;

      default:
        console.log(`📬 Unhandled event type: ${type}`);
    }

    return c.json({ received: true, processed: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return c.json({ received: true, error: error.message }, 500);
  }
});

export { webhooksApi };
