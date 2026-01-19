/**
 * AI Service Status Endpoint
 *
 * GET /api/ai
 * Returns the status of AI services and available endpoints.
 */

import { NextResponse } from 'next/server';
import { getProviderConfigFromEnv } from '@/lib/ai/providers';

export async function GET() {
  const providerConfig = getProviderConfigFromEnv();
  const hasProvider = !!providerConfig;

  return NextResponse.json({
    status: hasProvider ? 'available' : 'unconfigured',
    message: hasProvider
      ? 'AI services are available and ready to use.'
      : 'AI services require OLLAMA_BASE_URL, OPENAI_API_KEY, or OPENROUTER_API_KEY to be configured.',
    endpoints: {
      'POST /api/ai/generate-form': {
        description: 'Generate a form from natural language description',
        body: {
          prompt: 'string (required) - Natural language description of the form',
          context: {
            industry: 'string (optional) - Industry or domain',
            audience: 'string (optional) - Target audience',
            schema: 'object (optional) - MongoDB collection schema',
          },
          options: {
            maxFields: 'number (optional) - Maximum fields to generate',
            includeConditionalLogic: 'boolean (optional)',
            includeValidation: 'boolean (optional)',
          },
        },
      },
      'POST /api/ai/suggest-fields': {
        description: 'Suggest additional fields for an existing form',
        body: {
          currentForm: 'object (required) - Current form configuration',
          context: 'string (optional) - Additional context',
          limit: 'number (optional, default: 5) - Number of suggestions',
        },
      },
      'POST /api/ai/generate-formula': {
        description: 'Generate a formula from natural language',
        body: {
          description: 'string (required) - Description of the calculation',
          availableFields: 'array (required) - Array of field definitions',
          outputType: 'string (optional) - Expected output type',
        },
      },
      'POST /api/ai/explain-formula': {
        description: 'Explain a formula in plain language',
        body: {
          formula: 'string (required) - The formula to explain',
          availableFields: 'array (required) - Array of field definitions',
        },
      },
      'GET /api/ai/generate-validation': {
        description: 'Get list of common validation patterns',
      },
      'POST /api/ai/generate-validation': {
        description: 'Generate validation rules from description',
        body: {
          field: {
            path: 'string (required) - Field path',
            label: 'string (required) - Field label',
            type: 'string (optional) - Field type',
          },
          description: 'string (required) - Validation requirements',
        },
      },
      'POST /api/ai/generate-conditional-logic': {
        description: 'Generate conditional logic rules',
        body: {
          description: 'string (required) - Condition description',
          availableFields: 'array (required) - Fields that can be referenced',
          action: 'string (optional, default: show) - "show" or "hide"',
        },
      },
    },
    version: '1.0.0',
  });
}
