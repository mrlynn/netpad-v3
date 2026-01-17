/**
 * AI Conditional Logic Generation API Endpoint
 *
 * POST /api/ai/generate-conditional-logic
 * Generates conditional logic rules from natural language description.
 *
 * Uses centralized aiService for token tracking and analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createConditionalLogicGeneratorWithContext } from '@/lib/ai/conditionalLogicGenerator';
import { GenerateConditionalLogicRequest } from '@/lib/ai/types';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication, feature access, and usage limits
    const guard = await validateAIRequest('ai_conditional_logic');
    if (!guard.success) {
      return guard.response;
    }

    const body = await request.json();

    // Validate request
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Description is required and must be a string' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.availableFields) || body.availableFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'availableFields array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (body.action && !['show', 'hide'].includes(body.action)) {
      return NextResponse.json(
        { success: false, error: 'action must be "show" or "hide"' },
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
    const generator = createConditionalLogicGeneratorWithContext(
      guard.context.userId,
      guard.context.orgId,
      guard.context.isGuest || false
    );

    const logicRequest: GenerateConditionalLogicRequest = {
      description: body.description,
      availableFields: body.availableFields,
      action: body.action || 'show',
    };

    const result = await generator.generateConditionalLogic(logicRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Token usage is automatically tracked by aiService - no need to call recordAIUsage

    return NextResponse.json(result);
  } catch (error) {
    console.error('Conditional logic generation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
