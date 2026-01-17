/**
 * Demo Conversational Stream API
 *
 * POST /api/demo/conversational-stream
 * A simplified streaming endpoint for the conversational forms demo.
 * Allows guest access with rate limiting.
 */

import { NextRequest } from 'next/server';
import { createDefaultProvider, Message } from '@/lib/ai/providers';
import { ConversationalFormConfig, ConversationState } from '@/types/conversational';

// Simple in-memory rate limiting for demo
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const DEMO_RATE_LIMIT = 20; // 20 requests per hour for demo
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: DEMO_RATE_LIMIT - 1 };
  }

  if (entry.count >= DEMO_RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: DEMO_RATE_LIMIT - entry.count };
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Build system prompt for the demo
 */
function buildSystemPrompt(config: ConversationalFormConfig): string {
  const fieldsToCollect = config.extractionSchema
    .map((f) => `- ${f.description}${f.required ? ' (required)' : ' (optional)'}`)
    .join('\n');

  return `You are a friendly assistant helping to collect contact information through natural conversation.

Your goal: ${config.objective}

Information to collect:
${fieldsToCollect}

Guidelines:
- Be warm, friendly, and conversational
- Ask for ONE piece of information at a time
- Confirm information back to the user naturally
- Keep responses brief (1-2 sentences)
- If someone provides multiple pieces of info at once, acknowledge all of them
- Don't be robotic - have a natural conversation
- When you have all required info (name and email), let them know you have what you need

Example flow:
User: "Hi"
You: "Hi there! I'd love to get to know you a bit. What's your name?"

User: "I'm Sarah"
You: "Nice to meet you, Sarah! What's the best email to reach you at?"

User: "sarah@example.com"
You: "Got it, sarah@example.com. And what company are you with?"`;
}

/**
 * Create SSE stream from async generator
 */
function createSSEStream(
  generator: AsyncGenerator<string, void, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          const event = `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`;
          controller.enqueue(encoder.encode(event));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`));
      } catch (error: any) {
        const errorEvent = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Rate limit exceeded. Please try again later.', code: 'RATE_LIMIT' })}\n\n`,
      {
        status: 429,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { message, state, config } = body as {
      message: string;
      state: ConversationState;
      config: ConversationalFormConfig;
    };

    // Validate required fields
    if (!message || !config) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get AI provider
    const provider = createDefaultProvider();
    if (!provider) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'AI service not configured', code: 'NO_PROVIDER' })}\n\n`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        }
      );
    }

    // Build conversation messages
    const systemPrompt = buildSystemPrompt(config);
    const conversationHistory: Message[] = state?.messages
      ?.filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })) || [];

    // Add current user message
    conversationHistory.push({ role: 'user', content: message });

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // Stream response - don't specify model, let provider use its default
    const stream = provider.streamChat(messages, {
      temperature: 0.7,
      maxTokens: 500,
    });

    // Collect full response for extraction
    let fullResponse = '';

    async function* processStream() {
      for await (const chunk of stream) {
        fullResponse += chunk;
        yield chunk;
      }
    }

    const sseStream = createSSEStream(processStream());

    // Create a TransformStream to add extraction after completion
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = sseStream.getReader();
    const encoder = new TextEncoder();

    // Process stream and add extraction at the end
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }

        // After stream completes, do extraction
        if (fullResponse) {
          const allMessages = [
            ...(state?.messages || []).map((m) => m.content),
            message,
            fullResponse,
          ].join('\n');

          // Simple extraction using patterns
          const extraction = await extractFromConversation(allMessages, config);

          // Send extraction update
          const extractionEvent = `data: ${JSON.stringify({
            type: 'extraction_update',
            data: extraction.data,
            confidence: extraction.confidence,
            overallConfidence: extraction.confidence.overall || 0.5,
          })}\n\n`;
          await writer.write(encoder.encode(extractionEvent));

          // Send state update with new turn count
          const stateUpdate = `data: ${JSON.stringify({
            type: 'state_update',
            state: {
              turnCount: (state?.turnCount || 0) + 1,
              confidence: extraction.confidence.overall || 0.5,
              topics: config.topics.map((t) => ({
                topicId: t.id,
                name: t.name,
                covered: !!extraction.data[t.extractionField || t.id],
                depth: extraction.data[t.extractionField || t.id] ? 1 : 0,
              })),
              partialExtractions: extraction.data,
              messages: [
                ...(state?.messages || []),
                { role: 'user', content: message, timestamp: new Date().toISOString() },
                { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
              ],
            },
          })}\n\n`;
          await writer.write(encoder.encode(stateUpdate));

          // Check if we should suggest completion
          const requiredFields = config.extractionSchema.filter((f) => f.required);
          const filledRequired = requiredFields.filter((f) => extraction.data[f.field]);

          if (filledRequired.length === requiredFields.length) {
            const completionEvent = `data: ${JSON.stringify({
              type: 'completion_check',
              shouldComplete: true,
              reason: 'All required information has been collected.',
            })}\n\n`;
            await writer.write(encoder.encode(completionEvent));
          }
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (error: any) {
    console.error('[Demo Stream] Error:', error);
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: error.message || 'Internal error' })}\n\n`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      }
    );
  }
}

/**
 * Extract structured data from conversation using simple pattern matching
 * For demo purposes - production uses AI extraction
 */
async function extractFromConversation(
  conversation: string,
  config: ConversationalFormConfig
): Promise<{ data: Record<string, any>; confidence: Record<string, number> }> {
  const data: Record<string, any> = {};
  const confidence: Record<string, number> = {};

  // Email pattern
  const emailMatch = conversation.match(/[\w.-]+@[\w.-]+\.\w+/i);
  if (emailMatch) {
    data.email = emailMatch[0].toLowerCase();
    confidence.email = 0.95;
  }

  // Name extraction - look for patterns like "I'm [Name]", "My name is [Name]", "name is [Name]"
  const namePatterns = [
    /(?:my name is|i'm|i am|call me|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m,
  ];
  for (const pattern of namePatterns) {
    const match = conversation.match(pattern);
    if (match && match[1] && match[1].length > 1) {
      data.fullName = match[1].trim();
      confidence.fullName = 0.85;
      break;
    }
  }

  // Company extraction
  const companyPatterns = [
    /(?:work(?:ing)?\s+(?:at|for)|company is|from|with)\s+([A-Z][A-Za-z0-9\s&.-]+?)(?:\.|,|$|\n)/i,
    /(?:at|for)\s+([A-Z][A-Za-z0-9\s&.-]+?)\s+(?:as|doing)/i,
  ];
  for (const pattern of companyPatterns) {
    const match = conversation.match(pattern);
    if (match && match[1] && match[1].length > 1) {
      data.company = match[1].trim();
      confidence.company = 0.8;
      break;
    }
  }

  // Interest extraction - look for what they're interested in
  const interestPatterns = [
    /(?:interested in|looking (?:for|into)|want to|curious about|need help with)\s+(.+?)(?:\.|$|\n)/i,
    /(?:here (?:to|for)|checking out)\s+(.+?)(?:\.|$|\n)/i,
  ];
  for (const pattern of interestPatterns) {
    const match = conversation.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      data.interest = match[1].trim();
      confidence.interest = 0.7;
      break;
    }
  }

  // Calculate overall confidence
  const filledFields = Object.keys(data).length;
  const totalFields = config.extractionSchema.length;
  confidence.overall = filledFields / totalFields;

  return { data, confidence };
}
