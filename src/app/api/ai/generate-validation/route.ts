/**
 * AI Validation Generation API Endpoint
 *
 * POST /api/ai/generate-validation
 * Generates validation rules from natural language description.
 *
 * Uses centralized aiService for token tracking and analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createValidationGeneratorWithContext, COMMON_PATTERNS } from '@/lib/ai/validationGenerator';
import { GenerateValidationRequest } from '@/lib/ai/types';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication, feature access, and usage limits
    const guard = await validateAIRequest('ai_validation_patterns');
    if (!guard.success) {
      return guard.response;
    }

    const body = await request.json();

    // Validate request
    if (!body.field || !body.field.path || !body.field.label) {
      return NextResponse.json(
        { success: false, error: 'Field with path and label is required' },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Description is required and must be a string' },
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
    const generator = createValidationGeneratorWithContext(
      guard.context.userId,
      guard.context.orgId,
      guard.context.isGuest || false
    );

    const validationRequest: GenerateValidationRequest = {
      field: body.field,
      description: body.description,
    };

    const result = await generator.generateValidation(validationRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Token usage is automatically tracked by aiService - no need to call recordAIUsage

    return NextResponse.json(result);
  } catch (error) {
    console.error('Validation generation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/generate-validation
 * Returns the list of common validation patterns.
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      patterns: COMMON_PATTERNS,
    });
  } catch (error) {
    console.error('Common patterns API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
