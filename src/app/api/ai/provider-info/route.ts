/**
 * AI Provider Info Endpoint
 *
 * GET /api/ai/provider-info - Get current AI provider information
 *
 * Returns which LLM provider is currently configured and active.
 */

import { NextResponse } from 'next/server';
import { getProviderConfigFromEnv } from '@/lib/ai/providers';

export async function GET() {
  const providerConfig = getProviderConfigFromEnv();

  if (!providerConfig) {
    return NextResponse.json({
      provider: null,
      configured: false,
      message: 'No AI provider is configured',
    });
  }

  return NextResponse.json({
    provider: {
      type: providerConfig.type,
      name: providerConfig.type === 'openai' 
        ? 'OpenAI' 
        : providerConfig.type === 'ollama' 
        ? 'Ollama' 
        : 'OpenRouter',
      model: providerConfig.defaultModel,
      baseURL: providerConfig.baseURL,
    },
    configured: true,
  });
}