/**
 * AI Completion Hints Generator
 *
 * Provides intelligent autocomplete suggestions as users type in form fields.
 */

import OpenAI from 'openai';
import {
  CompletionHintsRequest,
  CompletionHintsResponse,
  CompletionHint,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildCompletionHintsPrompt } from './prompts';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.3, // Lower for more predictable completions
  maxTokens: 500,
};

// ============================================
// Completion Hints Generator Class
// ============================================

export class CompletionHintsGenerator {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Generate completion hints for a partial field value
   */
  async generateHints(request: CompletionHintsRequest): Promise<CompletionHintsResponse> {
    try {
      // Don't generate hints for very short inputs (let user type more first)
      if (request.partialValue.length < 2) {
        return {
          success: true,
          hints: [],
        };
      }

      const prompt = buildCompletionHintsPrompt(
        request.fieldType,
        request.partialValue,
        request.fieldLabel,
        request.formContext,
        request.limit || 5
      );

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.completionHints },
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
          hints: [],
          error: 'No response from AI model',
        };
      }

      // Parse the response
      const parsed = JSON.parse(responseText);

      // Normalize and validate hints
      const hints: CompletionHint[] = this.normalizeHints(
        parsed.hints || [],
        request.partialValue
      );

      return {
        success: true,
        hints,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Completion hints generation error:', error);
      return {
        success: false,
        hints: [],
        error: error instanceof Error ? error.message : 'Unknown error during hint generation',
      };
    }
  }

  /**
   * Get quick local hints without AI (for common patterns)
   */
  getLocalHints(
    fieldType: string,
    partialValue: string,
    fieldLabel: string
  ): CompletionHint[] {
    const hints: CompletionHint[] = [];
    const lowerValue = partialValue.toLowerCase();

    // Email domain completions
    if (fieldType === 'email' && partialValue.includes('@')) {
      const [local, domainPart] = partialValue.split('@');
      const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

      for (const domain of commonDomains) {
        if (domain.startsWith(domainPart.toLowerCase())) {
          hints.push({
            value: `${local}@${domain}`,
            displayText: `${local}@${domain}`,
            confidence: 0.8,
          });
        }
      }
    }

    // Common name prefixes
    if (fieldType === 'short_text' && fieldLabel.toLowerCase().includes('name')) {
      const commonPrefixes: Record<string, string[]> = {
        'mr': ['Mr.', 'Mrs.', 'Ms.'],
        'dr': ['Dr.'],
        'prof': ['Prof.'],
      };

      for (const [prefix, values] of Object.entries(commonPrefixes)) {
        if (prefix.startsWith(lowerValue)) {
          for (const value of values) {
            hints.push({
              value,
              displayText: value,
              confidence: 0.7,
            });
          }
        }
      }
    }

    // Country code prefixes for phone
    if (fieldType === 'phone' && partialValue.startsWith('+')) {
      const countryCodes: Record<string, string> = {
        '+1': '+1 (US/Canada)',
        '+44': '+44 (UK)',
        '+91': '+91 (India)',
        '+86': '+86 (China)',
        '+49': '+49 (Germany)',
        '+33': '+33 (France)',
        '+81': '+81 (Japan)',
      };

      for (const [code, display] of Object.entries(countryCodes)) {
        if (code.startsWith(partialValue)) {
          hints.push({
            value: code + ' ',
            displayText: display,
            confidence: 0.9,
          });
        }
      }
    }

    return hints.slice(0, 5);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Normalize and validate hints from AI response
   */
  private normalizeHints(rawHints: any[], partialValue: string): CompletionHint[] {
    const hints: CompletionHint[] = [];
    const seenValues = new Set<string>();

    for (const raw of rawHints) {
      if (!raw || typeof raw !== 'object') continue;

      const value = String(raw.value || '').trim();
      const displayText = String(raw.displayText || value).trim();
      const confidence = typeof raw.confidence === 'number'
        ? Math.min(Math.max(raw.confidence, 0), 1)
        : 0.5;

      // Skip empty values or duplicates
      if (!value || seenValues.has(value.toLowerCase())) continue;
      seenValues.add(value.toLowerCase());

      // Validate that the hint actually extends the partial value
      if (!this.isValidCompletion(partialValue, value)) continue;

      hints.push({
        value,
        displayText,
        confidence,
      });
    }

    // Sort by confidence descending
    return hints.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Check if a completion is valid (extends the partial value)
   */
  private isValidCompletion(partial: string, completion: string): boolean {
    const lowerPartial = partial.toLowerCase();
    const lowerCompletion = completion.toLowerCase();

    // Completion should start with or contain the partial value
    return (
      lowerCompletion.startsWith(lowerPartial) ||
      lowerCompletion.includes(lowerPartial)
    );
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a CompletionHintsGenerator instance
 */
export function createCompletionHintsGenerator(apiKey?: string): CompletionHintsGenerator {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new CompletionHintsGenerator({ apiKey: key });
}
