/**
 * AI Form Generation API Endpoint
 *
 * POST /api/ai/generate-form
 * Generates a form configuration from a natural language description.
 *
 * Uses centralized aiService for token tracking and analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFormGeneratorWithContext } from '@/lib/ai/formGenerator';
import { GenerateFormRequest } from '@/lib/ai/types';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication, feature access, and usage limits
    const guard = await validateAIRequest('ai_form_generator');
    if (!guard.success) {
      return guard.response;
    }

    const body = await request.json();

    // Validate request
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI service is not configured. Please set OPENAI_API_KEY.' },
        { status: 503 }
      );
    }

    // Use context-aware generator for centralized analytics tracking
    const generator = createFormGeneratorWithContext(
      guard.context.userId,
      guard.context.orgId,
      guard.context.isGuest || false,
      'ai_form_generator'
    );

    const generationRequest: GenerateFormRequest = {
      prompt: body.prompt,
      context: body.context,
      options: body.options,
    };

    const result = await generator.generateForm(generationRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Token usage is automatically tracked by aiService - no need to call recordAIUsage

    return NextResponse.json(result);
  } catch (error) {
    console.error('Form generation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
