// src/services/perplexity.service.ts

import { config } from '../config';

export interface ResearchResult {
  success: boolean;
  summary: string | null;
  source: 'perplexity' | 'manual';
  error: string | null;
}

export interface ResearchRequest {
  company: string;
  job_title?: string;
  first_name?: string;
}

class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';
  private lastRequestTime = 0;
  private minDelayMs = 1000; // Rate limit: 1 request per second

  constructor() {
    this.apiKey = config.perplexity?.apiKey || '';
  }

  private async rateLimitWait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelayMs) {
      await new Promise(resolve => setTimeout(resolve, this.minDelayMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async researchCompany(request: ResearchRequest): Promise<ResearchResult> {
    if (!this.apiKey) {
      return {
        success: false,
        summary: null,
        source: 'perplexity',
        error: 'Perplexity API key not configured',
      };
    }

    const query = this.buildQuery(request);
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.rateLimitWait();

        console.log(`🔍 [Perplexity] Researching: ${request.company} (attempt ${attempt})`);

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar', // Fast, cheap model for research
            messages: [
              {
                role: 'system',
                content: 'You are a business research assistant. Provide brief, factual summaries about companies. Focus on recent news, funding, product launches, and notable achievements. Keep responses under 150 words.',
              },
              {
                role: 'user',
                content: query,
              },
            ],
            max_tokens: 300,
            temperature: 0.2, // Lower for factual responses
          }),
        });

        if (response.status === 429) {
          // Rate limited - exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ [Perplexity] Rate limited, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content) {
          return {
            success: false,
            summary: null,
            source: 'perplexity',
            error: 'No content in response',
          };
        }

        console.log(`✅ [Perplexity] Found intel for: ${request.company}`);

        return {
          success: true,
          summary: content,
          source: 'perplexity',
          error: null,
        };

      } catch (error: any) {
        console.error(`❌ [Perplexity] Error (attempt ${attempt}):`, error.message);

        if (attempt === MAX_RETRIES) {
          return {
            success: false,
            summary: null,
            source: 'perplexity',
            error: error.message || 'Unknown error',
          };
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }

    return {
      success: false,
      summary: null,
      source: 'perplexity',
      error: 'Max retries exceeded',
    };
  }

  private buildQuery(request: ResearchRequest): string {
    let query = `What is the latest news about ${request.company}?`;
    
    if (request.job_title) {
      query += ` The company has a ${request.job_title}.`;
    }
    
    query += ' Include any recent funding, product launches, partnerships, or notable achievements. Be specific and factual.';
    
    return query;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const perplexityService = new PerplexityService();
