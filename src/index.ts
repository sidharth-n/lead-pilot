// src/index.ts

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { api } from './api/routes';
import { initializeDatabase } from './database/init';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Mount API
app.route('/api', api);

// Root
app.get('/', (c) => c.json({ 
  name: 'Cadence API',
  version: '1.0.0',
  status: 'running'
}));

// Initialize
console.log('🚀 Starting Cadence...');
initializeDatabase();

// Start processor (comment out for manual control during testing)
// processor.start();

const port = parseInt(process.env.PORT || '3000', 10);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🌐 Server running at http://localhost:${info.port}`);
});
