/**
 * AI Response Processing API Endpoint
 *
 * Processes form responses with AI for categorization, extraction, sentiment, etc.
 *
 * POST /api/ai/process-response
 */

import { NextRequest, NextResponse } from 'next/server';
import { createResponseProcessingAgent } from '@/lib/ai/responseProcessingAgent';
import { ProcessResponseRequest } from '@/lib/ai/types';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { incrementAIUsage } from '@/lib/platform/billing';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    const guard = await validateAIRequest('agent_response_processing', false);
    if (!guard.success) return guard.response;

    const body = await request.json();

    // Validate required fields
    if (!body.response || typeof body.response !== 'object') {
      return NextResponse.json(
        { success: false, error: 'response data is required' },
        { status: 400 }
      );
    }

    if (!body.form || typeof body.form !== 'object') {
      return NextResponse.json(
        { success: false, error: 'form configuration is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.actions) || body.actions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'at least one action is required' },
        { status: 400 }
      );
    }

    const validActions = ['categorize', 'extract', 'sentiment', 'summarize', 'route'];
    const invalidActions = body.actions.filter((a: string) => !validActions.includes(a));
    if (invalidActions.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid actions: ${invalidActions.join(', ')}` },
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

    const agent = createResponseProcessingAgent(apiKey);
    const processRequest: ProcessResponseRequest = {
      response: body.response,
      form: body.form,
      actions: body.actions,
      rules: body.rules,
    };

    const result = await agent.process(processRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Record usage
    await incrementAIUsage(guard.context.orgId, 'processingRuns', 1);

    return NextResponse.json({
      success: true,
      category: result.category,
      extracted: result.extracted,
      sentiment: result.sentiment,
      summary: result.summary,
      routing: result.routing,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Response processing API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
