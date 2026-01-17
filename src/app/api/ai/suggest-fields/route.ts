/**
 * AI Field Suggestion API Endpoint
 *
 * POST /api/ai/suggest-fields
 * Suggests additional fields for an existing form.
 *
 * Uses centralized aiService for token tracking and analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFormGeneratorWithContext } from '@/lib/ai/formGenerator';
import { FieldSuggestionRequest } from '@/lib/ai/types';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication, feature access, and usage limits
    const guard = await validateAIRequest('ai_inline_suggestions');
    if (!guard.success) {
      return guard.response;
    }

    const body = await request.json();

    // Validate request
    if (!body.currentForm) {
      return NextResponse.json(
        { success: false, error: 'currentForm is required' },
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
      'ai_inline_suggestions'
    );

    const suggestionRequest: FieldSuggestionRequest = {
      currentForm: body.currentForm,
      context: body.context,
      limit: body.limit || 5,
    };

    const result = await generator.suggestFields(suggestionRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Token usage is automatically tracked by aiService - no need to call recordAIUsage

    return NextResponse.json(result);
  } catch (error) {
    console.error('Field suggestion API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
