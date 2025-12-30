/**
 * AI Completion Hints API Endpoint
 *
 * Generates intelligent autocomplete suggestions as users type in form fields.
 *
 * POST /api/ai/completion-hints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCompletionHintsGenerator } from '@/lib/ai/completionHints';
import { CompletionHintsRequest } from '@/lib/ai/types';
import { validateAIRequest, recordAIUsage } from '@/lib/ai/aiRequestGuard';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    const guard = await validateAIRequest('ai_completion_hints');
    if (!guard.success) return guard.response;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.fieldType || typeof body.fieldType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'fieldType is required' },
        { status: 400 }
      );
    }

    if (typeof body.partialValue !== 'string') {
      return NextResponse.json(
        { success: false, error: 'partialValue is required' },
        { status: 400 }
      );
    }

    if (!body.fieldLabel || typeof body.fieldLabel !== 'string') {
      return NextResponse.json(
        { success: false, error: 'fieldLabel is required' },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // Create generator and build request
    const generator = createCompletionHintsGenerator(apiKey);
    const hintsRequest: CompletionHintsRequest = {
      fieldType: body.fieldType,
      partialValue: body.partialValue,
      fieldLabel: body.fieldLabel,
      formContext: body.formContext,
      limit: body.limit || 5,
    };

    // For very short inputs, return local hints only (no AI call)
    if (body.partialValue.length < 2) {
      const localHints = generator.getLocalHints(
        body.fieldType,
        body.partialValue,
        body.fieldLabel
      );
      return NextResponse.json({
        success: true,
        hints: localHints,
      });
    }

    // Try local hints first, supplement with AI if needed
    const localHints = generator.getLocalHints(
      body.fieldType,
      body.partialValue,
      body.fieldLabel
    );

    // If we have good local hints, return them without AI call
    if (localHints.length >= 3) {
      return NextResponse.json({
        success: true,
        hints: localHints,
      });
    }

    // Generate AI hints
    const result = await generator.generateHints(hintsRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Merge local and AI hints, deduplicate by value
    const allHints = [...localHints, ...result.hints];
    const seenValues = new Set<string>();
    const uniqueHints = allHints.filter(hint => {
      const key = hint.value.toLowerCase();
      if (seenValues.has(key)) return false;
      seenValues.add(key);
      return true;
    }).slice(0, hintsRequest.limit || 5);

    // Record usage (for billing)
    await recordAIUsage(guard.context.orgId);

    return NextResponse.json({
      success: true,
      hints: uniqueHints,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Completion hints API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
