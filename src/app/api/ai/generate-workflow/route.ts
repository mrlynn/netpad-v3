/**
 * AI Workflow Generation API Endpoint
 *
 * POST /api/ai/generate-workflow
 * Generates a workflow configuration from a natural language description.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWorkflowGenerator } from '@/lib/ai/workflowGenerator';
import { GenerateWorkflowRequest } from '@/lib/ai/types';
import { validateAIRequest, recordAIUsage } from '@/lib/ai/aiRequestGuard';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication, feature access, and usage limits
    const guard = await validateAIRequest('ai_form_generator'); // Reuse form generator feature for now
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

    const generator = createWorkflowGenerator(apiKey);

    const generationRequest: GenerateWorkflowRequest = {
      prompt: body.prompt,
      context: body.context,
      options: body.options,
    };

    const result = await generator.generateWorkflow(generationRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Increment usage counter on successful generation
    await recordAIUsage(guard.context.orgId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Workflow generation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
