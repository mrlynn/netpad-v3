/**
 * Response Processing Agent
 *
 * Processes form responses with AI for categorization, entity extraction,
 * sentiment analysis, summarization, and routing.
 */

import OpenAI from 'openai';
import {
  ProcessResponseRequest,
  ProcessResponseResponse,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildProcessResponsePrompt } from './prompts';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 2000,
};

// ============================================
// Response Processing Agent Class
// ============================================

export class ResponseProcessingAgent {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Process a form response with specified actions
   */
  async process(request: ProcessResponseRequest): Promise<ProcessResponseResponse> {
    try {
      // Validate request
      if (!request.response || typeof request.response !== 'object') {
        return {
          success: false,
          error: 'Response data is required',
        };
      }

      if (!request.actions || request.actions.length === 0) {
        return {
          success: false,
          error: 'At least one processing action is required',
        };
      }

      const prompt = buildProcessResponsePrompt(
        request.response,
        request.form,
        request.actions,
        request.rules
      );

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.responseProcessing },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return {
          success: false,
          error: 'No response from AI model',
        };
      }

      // Parse and normalize the response
      const parsed = JSON.parse(responseText);
      const result = this.normalizeResult(parsed, request.actions);

      return {
        success: true,
        ...result,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Response processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during processing',
      };
    }
  }

  /**
   * Simple local sentiment analysis without AI
   */
  getSimpleSentiment(text: string): {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  } {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'satisfied', 'thanks', 'thank', 'helpful', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed', 'worst', 'poor', 'horrible'];

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) {
      return { score: 0, label: 'neutral', confidence: 0.5 };
    }

    const score = (positiveCount - negativeCount) / total;
    const label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
    const confidence = Math.min(total / 10, 0.9);

    return { score, label, confidence };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private normalizeResult(
    raw: any,
    actions: ProcessResponseRequest['actions']
  ): Omit<ProcessResponseResponse, 'success' | 'error' | 'usage'> {
    const result: Omit<ProcessResponseResponse, 'success' | 'error' | 'usage'> = {};

    if (actions.includes('categorize') && raw.category) {
      result.category = this.normalizeCategory(raw.category);
    }

    if (actions.includes('extract') && raw.extracted) {
      result.extracted = typeof raw.extracted === 'object' ? raw.extracted : undefined;
    }

    if (actions.includes('sentiment') && raw.sentiment) {
      result.sentiment = this.normalizeSentiment(raw.sentiment);
    }

    if (actions.includes('summarize') && raw.summary) {
      result.summary = typeof raw.summary === 'string' ? raw.summary : undefined;
    }

    if (actions.includes('route') && raw.routing) {
      result.routing = this.normalizeRouting(raw.routing);
    }

    return result;
  }

  private normalizeCategory(category: any): ProcessResponseResponse['category'] {
    if (!category || typeof category !== 'object') return undefined;
    return {
      primary: String(category.primary || ''),
      secondary: category.secondary ? String(category.secondary) : undefined,
      confidence: typeof category.confidence === 'number'
        ? Math.min(Math.max(category.confidence, 0), 1)
        : 0.5,
    };
  }

  private normalizeSentiment(sentiment: any): ProcessResponseResponse['sentiment'] {
    if (!sentiment || typeof sentiment !== 'object') return undefined;

    const score = typeof sentiment.score === 'number'
      ? Math.min(Math.max(sentiment.score, -1), 1)
      : 0;

    const validLabels: Array<'positive' | 'neutral' | 'negative'> = ['positive', 'neutral', 'negative'];
    const label = validLabels.includes(sentiment.label) ? sentiment.label : 'neutral';

    return {
      score,
      label,
      confidence: typeof sentiment.confidence === 'number'
        ? Math.min(Math.max(sentiment.confidence, 0), 1)
        : 0.5,
    };
  }

  private normalizeRouting(routing: any): ProcessResponseResponse['routing'] {
    if (!routing || typeof routing !== 'object') return undefined;
    return {
      destination: String(routing.destination || ''),
      reason: String(routing.reason || ''),
    };
  }
}

// ============================================
// Factory Function
// ============================================

export function createResponseProcessingAgent(apiKey?: string): ResponseProcessingAgent {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new ResponseProcessingAgent({ apiKey: key });
}
