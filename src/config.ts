// src/config.ts

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    path: process.env.DATABASE_PATH || './data/cadence.db',
  },
  processor: {
    batchSize: parseInt(process.env.PROCESSOR_BATCH_SIZE || '10', 10),
    intervalMs: parseInt(process.env.PROCESSOR_INTERVAL_MS || '30000', 10),
  },
  email: {
    useReal: process.env.USE_REAL_EMAIL === 'true',
    resendApiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    fromName: process.env.EMAIL_FROM_NAME || 'LeadPilot',
  },
};
