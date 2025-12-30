/**
 * AI Form Optimization API Endpoint
 *
 * Analyzes form configurations and suggests improvements.
 *
 * POST /api/ai/form-optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFormOptimizationAgent } from '@/lib/ai/formOptimizationAgent';
import { FormOptimizationRequest } from '@/lib/ai/types';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { incrementAIUsage } from '@/lib/platform/billing';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    const guard = await validateAIRequest('agent_form_optimization', false);
    if (!guard.success) return guard.response;

    const body = await request.json();

    // Validate required fields
    if (!body.formId || typeof body.formId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'formId is required' },
        { status: 400 }
      );
    }

    if (!body.form || typeof body.form !== 'object') {
      return NextResponse.json(
        { success: false, error: 'form configuration is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 503 }
      );
    }

    const agent = createFormOptimizationAgent(apiKey);
    const optimizationRequest: FormOptimizationRequest = {
      formId: body.formId,
      form: body.form,
      includeResponseData: body.includeResponseData,
      responseStats: body.responseStats,
    };

    const result = await agent.analyze(optimizationRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Record agent session usage
    await incrementAIUsage(guard.context.orgId, 'agentSessions', 1);

    return NextResponse.json({
      success: true,
      score: result.score,
      issues: result.issues,
      quickWins: result.quickWins,
      reorderSuggestions: result.reorderSuggestions,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Form optimization API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
