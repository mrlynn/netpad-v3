/**
 * AI Formula Explanation API Endpoint
 *
 * POST /api/ai/explain-formula
 * Explains an existing formula in plain language.
 *
 * Uses centralized aiService for token tracking and analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFormulaAssistantWithContext } from '@/lib/ai/formulaAssistant';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication, feature access, and usage limits
    const guard = await validateAIRequest('ai_formula_assistant');
    if (!guard.success) {
      return guard.response;
    }

    const body = await request.json();

    // Validate request
    if (!body.formula || typeof body.formula !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Formula is required and must be a string' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.availableFields)) {
      return NextResponse.json(
        { success: false, error: 'availableFields array is required' },
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

    // Use context-aware assistant for centralized analytics tracking
    const assistant = createFormulaAssistantWithContext(
      guard.context.userId,
      guard.context.orgId,
      guard.context.isGuest || false
    );

    const result = await assistant.explainFormula(body.formula, body.availableFields);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Token usage is automatically tracked by aiService - no need to call recordAIUsage

    return NextResponse.json(result);
  } catch (error) {
    console.error('Formula explanation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
