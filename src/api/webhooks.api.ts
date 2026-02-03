// src/api/webhooks.api.ts

import { Hono } from 'hono';

const webhooksApi = new Hono();

// Placeholder for future webhook endpoints (e.g., Resend webhooks)
webhooksApi.post('/email/events', async (c) => {
  const body = await c.req.json();
  console.log('📩 Webhook received:', body);
  return c.json({ received: true });
});

export { webhooksApi };
