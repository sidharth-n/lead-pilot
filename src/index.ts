import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initializeDatabase } from './database/init';
import { emailGenerator } from './jobs/email-generator';
import { processor } from './jobs/processor';
import { api } from './api/routes';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:5173', // Local dev
    'https://lead-pilot-nu.vercel.app', // Production frontend
    'https://leadpilot.vercel.app', // Alternative domain
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-Session'],
  credentials: true,
}));

// Mount API Routes
app.route('/api', api);

// Root endpoint check
app.get('/', (c) => c.text('LeadPilot API is running 🚀'));

// Initialize Services
console.log('🚀 Starting Cadence...');
initializeDatabase();
emailGenerator.start();

// Start processor (auto-runs every 30 seconds to send emails and follow-ups)
processor.start();

const port = parseInt(process.env.PORT || '3000', 10);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🌐 Server running at http://localhost:${info.port}`);
});
