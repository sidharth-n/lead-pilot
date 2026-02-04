// src/services/resend.service.ts

import { Resend } from 'resend';
import { EmailSendRequest, EmailSendResult, IEmailService } from '../types';
import { config } from '../config';

export class ResendEmailService implements IEmailService {
  private client: Resend;

  constructor() {
    if (!config.email.resendApiKey) {
      throw new Error('RESEND_API_KEY is required when USE_REAL_EMAIL=true');
    }
    this.client = new Resend(config.email.resendApiKey);
  }

  async send(request: EmailSendRequest): Promise<EmailSendResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: `${request.from_name || config.email.fromName} <${request.from_email || config.email.fromEmail}>`,
        to: request.to,
        subject: request.subject,
        html: request.body_html.replace(/\n/g, '<br>'), // Convert newlines to HTML
      });

      if (error) {
        console.error(`❌ [RESEND] Failed to send to ${request.to}:`, error.message);
        return {
          success: false,
          message_id: null,
          error: error.message,
        };
      }

      console.log(`✅ [RESEND] Email sent to ${request.to} | ID: ${data?.id}`);

      return {
        success: true,
        message_id: data?.id || null,
        error: null,
      };
    } catch (err: any) {
      console.error(`❌ [RESEND] Exception sending to ${request.to}:`, err.message);
      return {
        success: false,
        message_id: null,
        error: err.message || 'Unknown error',
      };
    }
  }
}
