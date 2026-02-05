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
    const systemMessage = `You are an expert cold email copywriter. Write genuine, personal emails that land in Primary inbox.

CRITICAL: Respond in this EXACT JSON format (no markdown):
{"subject": "Your subject line here", "body": "Your email body here"}

SUBJECT LINE RULES:
1. Keep it 3-6 words
2. Use their name or company
3. Sound like a friend, not a marketer
4. NEVER use: "opportunity", "boost", "exciting", "limited", "free", "urgent"

EMAIL BODY RULES:
1. Write 3-4 SHORT sentences maximum
2. IMPORTANT: Separate paragraphs with \\n\\n (double newline)
3. Start with "Hi [FirstName]," on its own line
4. Use plain, casual language like texting a work friend
5. Make one genuine observation about their work
6. Ask a simple question - don't pitch
7. End with: "Best,\\n\\n[SenderFirstName]"
8. AVOID spam words: "opportunity", "boost", "engagement", "innovative", "exciting", "leverage", "synergy", "unlock", "revolutionize", "transform"

GOOD EXAMPLE:
"Hi Sarah,\\n\\nLoved the new feature you shipped at Acme. How did you approach the UX decisions?\\n\\nWould be great to chat sometime.\\n\\nBest,\\n\\nSid"

${system_prompt ? `USER'S INSTRUCTIONS:\\n${system_prompt}` : ''}`;

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
