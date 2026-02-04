// src/services/openai.service.ts

import OpenAI from 'openai';
import { config } from '../config';
import { AIGenerateRequest, AIGenerateResult, IAIService } from '../types';

export class OpenAIService implements IAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.ai.openaiApiKey,
    });
  }

  async generateEmail(request: AIGenerateRequest): Promise<AIGenerateResult> {
    const { system_prompt, contact_data, template } = request;

    // Build the user prompt with contact data
    const contactInfo = `
Contact Information:
- Email: ${contact_data.email}
- First Name: ${contact_data.first_name || 'Unknown'}
- Last Name: ${contact_data.last_name || 'Unknown'}
- Company: ${contact_data.company || 'Unknown'}
- Job Title: ${contact_data.job_title || 'Unknown'}
`;

    const userPrompt = `
${contactInfo}

Email Template/Instructions:
${template}

Generate a personalized email based on the template and contact information above.
Return ONLY the email body content, no subject line, no explanations.
`;

    try {
      console.log(`🤖 [OpenAI] Generating email for: ${contact_data.email}`);

      const response = await this.client.chat.completions.create({
        model: config.ai.model,
        messages: [
          { role: 'system', content: system_prompt || 'You are a professional email writer. Write personalized, engaging emails.' },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content?.trim() || null;

      if (!content) {
        return {
          success: false,
          content: null,
          error: 'No content generated',
        };
      }

      console.log(`✅ [OpenAI] Generated ${content.length} chars for: ${contact_data.email}`);

      return {
        success: true,
        content,
        error: null,
      };
    } catch (error: any) {
      console.error(`❌ [OpenAI] Error:`, error.message);
      return {
        success: false,
        content: null,
        error: error.message || 'OpenAI API error',
      };
    }
  }
}

// Export singleton
export const openaiService = new OpenAIService();
