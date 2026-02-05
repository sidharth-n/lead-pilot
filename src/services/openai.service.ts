// src/services/openai.service.ts

import OpenAI from 'openai';
import { config } from '../config';
import { AIGenerateRequest, AIGenerateResult, IAIService } from '../types';

export class OpenAIService implements IAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.ai.openaiApiKey,
      timeout: 30000, // 30 second timeout to prevent hanging
      maxRetries: 2,  // Built-in retries for transient errors
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
    const systemMessage = `You are an expert cold email copywriter. Your task is to write a personalized, engaging cold email with a catchy subject line.

CRITICAL: You MUST respond in this EXACT JSON format (no markdown, no code blocks):
{"subject": "Your catchy subject line here", "body": "Your email body here"}

SUBJECT LINE GUIDELINES:
1. Keep it SHORT (3-7 words)
2. Make it PERSONAL - use their name or company
3. Be INTRIGUING - create curiosity
4. Avoid spam words like "free", "urgent", "limited"
5. Make it feel human, not robotic

EMAIL BODY GUIDELINES:
1. Write 3-5 sentences
2. Personalize based on their company, role, and any research provided
3. Be conversational and genuine, not salesy
4. Reference something specific about their company if research is provided
5. Include a soft call-to-action
6. Do NOT include signature or sign-off

${system_prompt ? `USER'S INSTRUCTIONS:\n${system_prompt}` : ''}`;

    const userMessage = `CONTACT INFORMATION:
${contactContext}

${hasResearchData ? '' : `TEMPLATE FOR REFERENCE (use as inspiration):
${template}
`}
Write a personalized cold email with subject line. Respond ONLY with valid JSON in this format: {"subject": "...", "body": "..."}`;

    try {
      console.log(`🤖 [OpenAI] Generating personalized email for: ${contact_data.email}`);

      const response = await this.client.chat.completions.create({
        model: config.ai.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 600,
      });

      const rawContent = response.choices[0]?.message?.content?.trim() || null;

      if (!rawContent) {
        return {
          success: false,
          subject: null,
          content: null,
          error: 'No content generated',
        };
      }

      // Parse JSON response
      try {
        // Clean up any markdown code blocks
        let jsonStr = rawContent;
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }
        
        const parsed = JSON.parse(jsonStr);
        
        console.log(`✅ [OpenAI] Generated subject: "${parsed.subject}" + ${parsed.body?.length || 0} chars body`);

        return {
          success: true,
          subject: parsed.subject || null,
          content: parsed.body || null,
          error: null,
        };
      } catch (parseError) {
        // If JSON parsing fails, treat entire response as body
        console.warn('⚠️ [OpenAI] Failed to parse JSON, using raw content as body');
        return {
          success: true,
          subject: null,
          content: rawContent,
          error: null,
        };
      }
    } catch (error: any) {
      console.error(`❌ [OpenAI] Error:`, error.message);
      
      // Handle rate limits specially
      if (error.status === 429) {
        return {
          success: false,
          subject: null,
          content: null,
          error: 'Rate limited - will retry',
        };
      }
      
      return {
        success: false,
        subject: null,
        content: null,
        error: error.message || 'OpenAI API error',
      };
    }
  }
}

// Export singleton
export const openaiService = new OpenAIService();
