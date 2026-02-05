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

    // Build comprehensive contact context
    const contactContext = [
      contact_data.first_name ? `First Name: ${contact_data.first_name}` : null,
      contact_data.last_name ? `Last Name: ${contact_data.last_name}` : null,
      contact_data.email ? `Email: ${contact_data.email}` : null,
      contact_data.company ? `Company: ${contact_data.company}` : null,
      contact_data.job_title ? `Job Title: ${contact_data.job_title}` : null,
      contact_data.headline ? `Headline: ${contact_data.headline}` : null,
    ].filter(Boolean).join('\n');

    // Extract any research intel from system prompt
    const hasResearchData = system_prompt?.includes('company intel') || system_prompt?.includes('Recent');

    // Build a comprehensive prompt for email generation
    const systemMessage = `You are an expert cold email copywriter. Your task is to write a personalized, engaging cold email that feels human and genuine, not like a template.

IMPORTANT GUIDELINES:
1. Write a COMPLETE email body (3-5 sentences)
2. Personalize based on the contact's company, role, and any research provided
3. Be conversational and genuine, not salesy or pushy
4. Reference something specific about their company if research is provided
5. Include a clear but soft call-to-action
6. Keep it short and respect their time
7. Do NOT include subject line, just the email body
8. Do NOT include signature or sign-off

${system_prompt ? `USER'S INSTRUCTIONS:\n${system_prompt}` : ''}`;

    const userMessage = `CONTACT INFORMATION:
${contactContext}

${hasResearchData ? '' : `TEMPLATE FOR REFERENCE (use as inspiration, don't just copy):
${template}
`}
Write a personalized cold email for this contact. The email should feel personal and reference their company or role. Output ONLY the email body text, nothing else.`;

    try {
      console.log(`🤖 [OpenAI] Generating personalized email for: ${contact_data.email}`);

      const response = await this.client.chat.completions.create({
        model: config.ai.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
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
      
      // Handle rate limits specially
      if (error.status === 429) {
        return {
          success: false,
          content: null,
          error: 'Rate limited - will retry',
        };
      }
      
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
