/**
 * AI Provider Exports (Standalone Version)
 */

export * from './base';
export * from './openai';

import { LLMProvider } from './base';
import { createOpenAIProvider } from './openai';

/**
 * Create default provider from environment variables
 *
 * Uses OPENAI_API_KEY for OpenAI (recommended for standalone deployments)
 */
export function createDefaultProvider(): LLMProvider | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return createOpenAIProvider({
      apiKey: openaiKey,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }

  return null;
}

/**
 * Check if AI is configured and available
 */
export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
