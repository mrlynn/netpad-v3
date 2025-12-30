/**
 * AI Response Insights API Endpoint
 *
 * Analyzes form responses to surface patterns, anomalies, and actionable insights.
 *
 * POST /api/ai/response-insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { createResponseInsightsAgent } from '@/lib/ai/responseInsightsAgent';
import { ResponseInsightsRequest } from '@/lib/ai/types';
import { validateAIRequest, recordAIUsage } from '@/lib/ai/aiRequestGuard';
import { incrementAIUsage } from '@/lib/platform/billing';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    // This is an agent feature, so we check for the agent feature and use agent sessions
    const guard = await validateAIRequest('agent_response_insights', false);
    if (!guard.success) return guard.response;

    // Parse request body
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

    if (!Array.isArray(body.responses)) {
      return NextResponse.json(
        { success: false, error: 'responses array is required' },
        { status: 400 }
      );
    }

    if (body.responses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one response is required for analysis' },
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

    // Create agent and build request
    const agent = createResponseInsightsAgent(apiKey);
    const insightsRequest: ResponseInsightsRequest = {
      formId: body.formId,
      form: body.form,
      responses: body.responses,
      timeRange: body.timeRange,
      focusAreas: body.focusAreas,
    };

    // Perform analysis
    const result = await agent.analyze(insightsRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Record agent session usage (different from regular AI generations)
    await incrementAIUsage(guard.context.orgId, 'agentSessions', 1);

    return NextResponse.json({
      success: true,
      summary: result.summary,
      patterns: result.patterns,
      anomalies: result.anomalies,
      trends: result.trends,
      qualityScore: result.qualityScore,
      recommendations: result.recommendations,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Response insights API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
