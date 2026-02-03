// src/api/routes.ts

import { Hono } from 'hono';
import { contactsApi } from './contacts.api';
import { campaignsApi } from './campaigns.api';
import { webhooksApi } from './webhooks.api';
import { processor } from '../jobs/processor';

const api = new Hono();

// Mount sub-routes
api.route('/contacts', contactsApi);
api.route('/campaigns', campaignsApi);
api.route('/webhooks', webhooksApi);

// Health check
api.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Processor controls (for testing)
api.post('/processor/run', async (c) => {
  await processor.processAll();
  return c.json({ success: true, message: 'Processor run complete' });
});

api.post('/processor/start', (c) => {
  processor.start();
  return c.json({ success: true, message: 'Processor started' });
});

api.post('/processor/stop', (c) => {
  processor.stop();
  return c.json({ success: true, message: 'Processor stopped' });
});

export { api };
