/**
 * AI Service Status
 * 
 * GET /api/ai/status - Check if AI features are available
 * 
 * Used by CLI and other clients to determine if AI interpretation is possible.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_MODE, isCloudMode } from '@/lib/platform/mode';

export const dynamic = 'force-dynamic';

interface AIStatusResponse {
  available: boolean;
  provider?: string;
  model?: string;
  mode: 'cloud' | 'self-hosted';
  message?: string;
  setupInstructions?: string;
}

/**
 * Check if AI is configured and available
 */
function checkAIAvailability(): AIStatusResponse {
  const mode = PLATFORM_MODE;
  const isCloud = isCloudMode();

  // Check for any supported AI provider
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOllama = !!process.env.OLLAMA_BASE_URL;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  const available = hasOpenAI || hasAnthropic || hasOllama || hasOpenRouter;

  // Determine which provider is active
  let provider: string | undefined;
  let model: string | undefined;

  if (hasOllama) {
    provider = 'ollama';
    model = process.env.OLLAMA_MODEL || 'llama2';
  } else if (hasOpenAI) {
    provider = 'openai';
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  } else if (hasAnthropic) {
    provider = 'anthropic';
    model = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
  } else if (hasOpenRouter) {
    provider = 'openrouter';
    model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';
  }

  if (!available) {
    return {
      available: false,
      mode,
      message: isCloud 
        ? 'AI service temporarily unavailable. Please try again later.'
        : 'AI features require configuration. Set up an AI provider to enable smart command interpretation.',
      setupInstructions: isCloud ? undefined : `
To enable AI features in self-hosted mode, set one of:

1. OpenAI (recommended):
   OPENAI_API_KEY=sk-...

2. Ollama (local, free):
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3

3. Anthropic:
   ANTHROPIC_API_KEY=sk-ant-...

4. OpenRouter (multiple models):
   OPENROUTER_API_KEY=sk-or-...

Add to your .env.local file and restart the server.
      `.trim(),
    };
  }

  return {
    available: true,
    provider,
    model,
    mode,
  };
}

export async function GET(request: NextRequest) {
  const status = checkAIAvailability();
  return NextResponse.json(status);
}
