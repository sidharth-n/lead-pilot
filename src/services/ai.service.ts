// src/services/ai.service.ts

import { AIGenerateRequest, AIGenerateResult, IAIService } from '../types';

export class MockAIService implements IAIService {
  async generateEmail(request: AIGenerateRequest): Promise<AIGenerateResult> {
    // Simulate API delay
    await this.delay(100 + Math.random() * 200);

    const { contact_data, template } = request;

    // Simple template variable replacement
    let content = template
      .replace(/\{\{first_name\}\}/g, contact_data.first_name || 'there')
      .replace(/\{\{last_name\}\}/g, contact_data.last_name || '')
      .replace(/\{\{company\}\}/g, contact_data.company || 'your company')
      .replace(/\{\{job_title\}\}/g, contact_data.job_title || 'professional')
      .replace(/\{\{email\}\}/g, contact_data.email);

    // Add mock "AI personalization"
    if (contact_data.company && contact_data.first_name) {
      content += `\n\nP.S. I've been following ${contact_data.company}'s journey - impressive work, ${contact_data.first_name}!`;
    }

    console.log(`🤖 [MOCK AI] Generated email for: ${contact_data.email}`);

    return {
      success: true,
      content,
      error: null,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const aiService = new MockAIService();
