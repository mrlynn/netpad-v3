/**
 * Landing Page Form Generation Stream API
 *
 * POST /api/landing/generate-form-stream
 * Streams form generation for the landing page instant form builder.
 * Allows guest access with rate limiting (5/day per IP).
 *
 * Analytics: Uses aiService for token tracking under 'landing_guest' organization.
 */

import { NextRequest } from 'next/server';
import { Message } from '@/lib/ai/providers';
import { aiService, createAIContext } from '@/lib/ai/aiService';
import { FieldConfig } from '@/types/form';
import { ConversationalFormConfig } from '@/types/conversational';

// Rate limiting for guest access
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const GUEST_DAILY_LIMIT = 5;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    return { allowed: true, remaining: GUEST_DAILY_LIMIT };
  }

  const remaining = GUEST_DAILY_LIMIT - entry.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

function incrementRateLimit(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + DAY_IN_MS });
  } else {
    entry.count++;
  }
}

// Optimized system prompt - condensed for faster token processing
const FORM_GENERATION_PROMPT = `Generate a conversational form JSON. Output ONLY valid JSON, no markdown.

Schema:
{"name":"string","description":"string","collection":"form_submissions","fieldConfigs":[{"path":"snake_case","label":"string","type":"field_type","required":bool,"placeholder":"string","included":true,"source":"custom","includeInDocument":true,"validation":{}}],"conversational":{"objective":"string","persona":{"style":"friendly","tone":"warm and helpful"},"topics":[{"id":"string","name":"string","description":"string","priority":"required|important|optional","extractionField":"path"}]}}

Field types: short_text, long_text, number, email, phone, multiple_choice, checkboxes, dropdown, yes_no, rating, scale, date, file_upload

For choice fields add: "validation":{"options":[{"label":"Label","value":"value"}]}

Rules: 5-8 fields max, contact fields first, only essential fields required, friendly objective`;

interface GeneratedForm {
  name: string;
  description: string;
  collection: string;
  fieldConfigs: FieldConfig[];
  conversational?: {
    objective: string;
    persona: { style: string; tone: string };
    topics: Array<{
      id: string;
      name: string;
      description: string;
      priority: string;
      extractionField: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        type: 'error',
        error: 'Daily limit reached. Sign up for unlimited form generation!',
        code: 'RATE_LIMIT',
        remaining: 0,
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    const { prompt } = body as { prompt: string };

    if (!prompt || prompt.trim().length < 3) {
      return new Response(
        JSON.stringify({ type: 'error', error: 'Please describe the form you want to create' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if AI service is available
    const isAvailable = await aiService.isAvailable();
    if (!isAvailable) {
      return new Response(
        JSON.stringify({ type: 'error', error: 'AI service not available', code: 'NO_PROVIDER' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Increment rate limit after validation passes
    incrementRateLimit(ip);

    const messages: Message[] = [
      { role: 'system', content: FORM_GENERATION_PROMPT },
      { role: 'user', content: `Create a conversational form for: ${prompt.trim()}` },
    ];

    // Create AI context for analytics tracking
    // Uses 'landing_guest' as organizationId to track all landing page usage together
    const aiContext = createAIContext(
      `guest_${ip.replace(/\./g, '_')}`, // anonymized user ID based on IP
      'landing_guest',                    // dedicated org ID for landing page analytics
      'ai_form_generator',                // same feature as authenticated form generation
      '/api/landing/generate-form-stream',
      true                                // isGuest = true
    );

    // Create SSE response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let getUsage: (() => Promise<import('@/types/ai-analytics').TokenUsage | null>) | null = null;

        try {
          // Send initial status
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'status', phase: 'analyzing', message: 'Analyzing your request...' })}\n\n`)
          );

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'status', phase: 'generating', message: 'Generating form fields...' })}\n\n`)
          );

          // Generate form with AI using aiService for analytics tracking
          // Optimized settings: lower temperature for consistency, reduced tokens for speed
          let completion = '';
          const streamResult = await aiService.streamChat(aiContext, messages, {
            temperature: 0.5,
            maxTokens: 1200,
          });

          // Store getUsage to call after streaming completes
          getUsage = streamResult.getUsage;

          for await (const chunk of streamResult.stream) {
            completion += chunk;
          }

          if (!completion) {
            throw new Error('No response from AI');
          }

          // Parse the generated form
          let generatedForm: GeneratedForm;
          try {
            // Clean up response - extract JSON from potential surrounding text
            let cleanJson = completion.trim();

            // Remove markdown code blocks if present
            if (cleanJson.includes('```')) {
              const codeBlockMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (codeBlockMatch) {
                cleanJson = codeBlockMatch[1].trim();
              }
            }

            // If response doesn't start with {, try to find the JSON object
            if (!cleanJson.startsWith('{')) {
              const jsonStart = cleanJson.indexOf('{');
              const jsonEnd = cleanJson.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                cleanJson = cleanJson.slice(jsonStart, jsonEnd + 1);
              }
            }

            generatedForm = JSON.parse(cleanJson);
          } catch (parseError) {
            console.error('[Landing Form Gen] JSON parse error:', parseError, 'Response:', completion);
            throw new Error('Failed to generate valid form configuration');
          }

          // Validate and normalize fields
          if (!generatedForm.fieldConfigs || !Array.isArray(generatedForm.fieldConfigs)) {
            throw new Error('Invalid form configuration');
          }

          // Stream each field
          for (let i = 0; i < generatedForm.fieldConfigs.length; i++) {
            const field = normalizeField(generatedForm.fieldConfigs[i]);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'field', field, index: i })}\n\n`)
            );
          }

          // Send conversational config if present
          if (generatedForm.conversational) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'status', phase: 'finalizing', message: 'Creating conversational config...' })}\n\n`)
            );

            const conversationalConfig: ConversationalFormConfig = {
              formType: 'conversational',
              objective: generatedForm.conversational.objective,
              context: generatedForm.description,
              persona: {
                style: (generatedForm.conversational.persona?.style || 'friendly') as 'friendly' | 'professional' | 'casual' | 'empathetic' | 'custom',
                tone: generatedForm.conversational.persona?.tone || 'warm and helpful',
                behaviors: ['Be concise and natural', 'Ask one question at a time'],
              },
              topics: generatedForm.conversational.topics.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                priority: t.priority as 'required' | 'important' | 'optional',
                depth: 'surface' as const,
                extractionField: t.extractionField,
              })),
              extractionSchema: generatedForm.fieldConfigs.map((f) => ({
                field: f.path,
                type: mapFieldTypeToExtraction(f.type) as 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object',
                required: f.required || false,
                description: f.label,
                topicId: generatedForm.conversational?.topics.find((t) => t.extractionField === f.path)?.id,
              })),
              conversationLimits: {
                maxTurns: 15,
                maxDuration: 15,
                minConfidence: 0.7,
              },
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'conversational', config: conversationalConfig })}\n\n`)
            );
          }

          // Send complete form
          const completeForm = {
            id: `generated_${Date.now()}`,
            name: generatedForm.name || 'Generated Form',
            description: generatedForm.description || '',
            collection: generatedForm.collection || 'form_submissions',
            database: 'formbuilder',
            fieldConfigs: generatedForm.fieldConfigs.map(normalizeField),
            formType: 'conversational' as const,
            theme: {
              preset: 'mongodb' as const,
              customizations: {},
            },
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete', form: completeForm, remaining: rateLimit.remaining - 1 })}\n\n`)
          );
        } catch (error: any) {
          console.error('[Landing Form Gen] Error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Failed to generate form' })}\n\n`)
          );
        } finally {
          // Log token usage to analytics (this triggers the aiService logging)
          if (getUsage) {
            try {
              const usage = await getUsage();
              if (usage) {
                console.log('[Landing Form Gen] Token usage:', {
                  prompt: usage.prompt,
                  completion: usage.completion,
                  total: usage.total,
                });
              }
            } catch (usageError) {
              console.error('[Landing Form Gen] Failed to log usage:', usageError);
            }
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': String(rateLimit.remaining - 1),
      },
    });
  } catch (error: any) {
    console.error('[Landing Form Gen] Error:', error);
    return new Response(
      JSON.stringify({ type: 'error', error: error.message || 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Normalize a field config to ensure all required properties are present
 */
function normalizeField(field: any): FieldConfig {
  const validTypes = [
    'short_text', 'long_text', 'number', 'email', 'phone', 'url',
    'multiple_choice', 'checkboxes', 'dropdown', 'yes_no', 'rating',
    'scale', 'slider', 'nps', 'date', 'time', 'datetime',
    'file_upload', 'image_upload', 'signature', 'address',
  ];

  let fieldType = field.type?.toLowerCase() || 'short_text';

  // Map common AI-generated type names
  const typeMapping: Record<string, string> = {
    text: 'short_text',
    string: 'short_text',
    textarea: 'long_text',
    paragraph: 'long_text',
    int: 'number',
    integer: 'number',
    float: 'number',
    boolean: 'yes_no',
    bool: 'yes_no',
    radio: 'multiple_choice',
    select: 'dropdown',
    multi_select: 'checkboxes',
    multiselect: 'checkboxes',
    stars: 'rating',
    star_rating: 'rating',
    file: 'file_upload',
    upload: 'file_upload',
  };

  if (typeMapping[fieldType]) {
    fieldType = typeMapping[fieldType];
  }

  if (!validTypes.includes(fieldType)) {
    fieldType = 'short_text';
  }

  return {
    path: field.path || field.name || generateFieldPath(field.label),
    label: field.label || field.name || 'Untitled Field',
    type: fieldType,
    included: true,
    required: field.required ?? false,
    placeholder: field.placeholder,
    defaultValue: field.defaultValue,
    source: 'custom',
    includeInDocument: true,
    validation: field.validation,
  };
}

/**
 * Generate a field path from a label
 */
function generateFieldPath(label: string): string {
  if (!label) return 'field';
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '') || 'field';
}

/**
 * Map field type to extraction schema type
 */
function mapFieldTypeToExtraction(fieldType: string): string {
  const typeMap: Record<string, string> = {
    email: 'email',
    phone: 'phone',
    number: 'number',
    date: 'date',
    datetime: 'datetime',
    yes_no: 'boolean',
    rating: 'number',
    scale: 'number',
    slider: 'number',
    nps: 'number',
    checkboxes: 'array',
  };
  return typeMap[fieldType] || 'string';
}
