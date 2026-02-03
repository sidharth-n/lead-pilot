// src/services/email.service.ts

import { EmailSendRequest, EmailSendResult, IEmailService } from '../types';

export class MockEmailService implements IEmailService {
  private sentEmails: EmailSendRequest[] = [];
  private shouldFail = false;
  private failureRate = 0;

  async send(request: EmailSendRequest): Promise<EmailSendResult> {
    // Simulate network delay
    await this.delay(50 + Math.random() * 100);

    // Simulate failures for testing
    if (this.shouldFail || Math.random() < this.failureRate) {
      return {
        success: false,
        message_id: null,
        error: 'Simulated email failure',
      };
    }

    // Store for testing inspection
    this.sentEmails.push({ ...request });

    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    console.log(`📧 [MOCK EMAIL] To: ${request.to} | Subject: ${request.subject}`);

    return {
      success: true,
      message_id: messageId,
      error: null,
    };
  }

  // Test helpers
  getSentEmails(): EmailSendRequest[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const emailService = new MockEmailService();
