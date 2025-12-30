/**
 * AI Translation API Endpoint
 *
 * Translates form content to multiple languages.
 *
 * POST /api/ai/translate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTranslationAgent } from '@/lib/ai/translationAgent';
import { TranslateFormRequest } from '@/lib/ai/types';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { incrementAIUsage } from '@/lib/platform/billing';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    const guard = await validateAIRequest('agent_auto_translation', false);
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

    if (!Array.isArray(body.targetLanguages) || body.targetLanguages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'at least one target language is required' },
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

    const agent = createTranslationAgent(apiKey);
    const translateRequest: TranslateFormRequest = {
      formId: body.formId,
      form: body.form,
      sourceLanguage: body.sourceLanguage,
      targetLanguages: body.targetLanguages,
      includeValidationMessages: body.includeValidationMessages,
    };

    const result = await agent.translate(translateRequest);

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
      sourceLanguage: result.sourceLanguage,
      translations: result.translations,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Translation API error:', error);
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
 * GET /api/ai/translate - Get supported languages
 */
export async function GET() {
  try {
    const agent = createTranslationAgent(process.env.OPENAI_API_KEY || 'dummy');
    const languages = agent.getSupportedLanguages();

    return NextResponse.json({
      success: true,
      languages,
    });
  } catch (error) {
    console.error('Get languages error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
