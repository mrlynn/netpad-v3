/**
 * Demo Conversational Stream API
 *
 * POST /api/demo/conversational-stream
 * A simplified streaming endpoint for the conversational forms demo.
 * Allows guest access with rate limiting.
 *
 * Analytics: Uses aiService for token tracking under 'demo_guest' organization.
 */

import { NextRequest } from 'next/server';
import { Message } from '@/lib/ai/providers';
import { aiService, createAIContext } from '@/lib/ai/aiService';
import { ConversationalFormConfig, ConversationState } from '@/types/conversational';
import { TokenUsage } from '@/types/ai-analytics';

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
- When you have all required info, let them know you have what you need and thank them
- IMPORTANT: If someone wants to correct or change information they previously gave (e.g., "Actually my email is...", "I meant to say...", "Can I change my..."), acknowledge the correction warmly and confirm the updated value

Example flow:
User: "Hi"
You: "Hi there! I'd love to get to know you a bit. What's your name?"

User: "I'm Sarah"
You: "Nice to meet you, Sarah! What's the best email to reach you at?"

User: "sarah@example.com"
You: "Got it, sarah@example.com. And what company are you with?"

Example correction:
User: "Actually, my email is sarah.jones@example.com"
You: "No problem! I've updated your email to sarah.jones@example.com. Thanks for the correction!"`;
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

    // Check if AI service is available
    const isAvailable = await aiService.isAvailable();
    if (!isAvailable) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'AI service not configured', code: 'NO_PROVIDER' })}\n\n`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        }
      );
    }

    // Create AI context for analytics tracking
    const aiContext = createAIContext(
      `guest_${ip.replace(/\./g, '_')}`, // anonymized user ID based on IP
      'demo_guest',                       // dedicated org ID for demo analytics
      'rag_conversational_forms',         // conversational forms feature
      '/api/demo/conversational-stream',
      true                                // isGuest = true
    );

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

    // Stream response using aiService for analytics tracking
    const streamResult = await aiService.streamChat(aiContext, messages, {
      temperature: 0.7,
      maxTokens: 500,
    });

    // Collect full response for extraction
    let fullResponse = '';
    let getUsage: (() => Promise<TokenUsage | null>) | null = streamResult.getUsage;

    async function* processStream() {
      for await (const chunk of streamResult.stream) {
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
          // IMPORTANT: Only extract from USER messages to avoid false positives
          // from AI's conversational text like "I'm excited to help!"
          const userMessages = [
            ...(state?.messages || []).filter((m) => m.role === 'user').map((m) => m.content),
            message, // Current user message
          ].join('\n');

          // Simple extraction using patterns
          const extraction = await extractFromConversation(userMessages, config);

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
        // Log token usage to analytics (this triggers the aiService logging)
        if (getUsage) {
          try {
            const usage = await getUsage();
            if (usage) {
              console.log('[Demo Stream] Token usage:', {
                prompt: usage.prompt,
                completion: usage.completion,
                total: usage.total,
              });
            }
          } catch (usageError) {
            console.error('[Demo Stream] Failed to log usage:', usageError);
          }
        }
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
 *
 * IMPORTANT: This should only be called with USER messages, not assistant messages,
 * to avoid false positives from AI's conversational phrases.
 *
 * Messages are processed in order, with later corrections overriding earlier values.
 */
async function extractFromConversation(
  userMessagesText: string,
  config: ConversationalFormConfig
): Promise<{ data: Record<string, any>; confidence: Record<string, number> }> {
  const data: Record<string, any> = {};
  const confidence: Record<string, number> = {};

  // Common words to filter out - these are NOT names or companies
  const commonWords = new Set([
    'ok', 'okay', 'sure', 'yes', 'no', 'hi', 'hello', 'hey', 'thanks', 'thank',
    'please', 'help', 'need', 'want', 'get', 'started', 'begin', 'simple',
    'excited', 'great', 'good', 'fine', 'well', 'what', 'information', 'you',
    'the', 'and', 'for', 'that', 'this', 'with', 'have', 'are', 'was', 'were',
    'not', 'actually', 'meant', 'should', 'it', 'is', 'was', 'be', 'let',
  ]);

  const isCommonWord = (word: string) => commonWords.has(word.toLowerCase());

  // Split into individual messages for ordered processing
  const messages = userMessagesText.split('\n').filter(m => m.trim());

  // Process each message in order - later messages can override earlier ones
  for (const message of messages) {
    const msg = message.trim();

    // Check for CORRECTIONS first - these have highest priority
    // Patterns like: "actually it's X", "not X - Y", "name was Y not X", "should be X"
    // Note: Use case-insensitive patterns since users may type names in lowercase
    const correctionPatterns = [
      // "actually my name is X" / "actually it's X"
      /actually\s+(?:my\s+)?(?:name\s+)?(?:is|it's|its)\s+([a-z]+)/i,
      // "the name was X" / "name was X not Y" / "the victim's name was X"
      /(?:the\s+)?(?:\w+'s\s+)?name\s+(?:was|is|should be)\s+([a-z]+)(?:\s*[-,]\s*not)?/i,
      // "it was X not Y"
      /it\s+(?:was|is|should be)\s+([a-z]+)(?:\s*[-,]\s*not)?/i,
      // "not X - Y" or "not X, Y" for name correction (captures the SECOND name)
      /not\s+[a-z]+\s*[-,.]\s*([a-z]+)/i,
      // "should be X"
      /should\s+be\s+([a-z]+)/i,
      // "I meant X"
      /i\s+meant\s+([a-z]+)/i,
    ];

    for (const pattern of correctionPatterns) {
      const match = msg.match(pattern);
      if (match && match[1]) {
        const correctedName = match[1].trim();
        // Capitalize the first letter for proper name formatting
        const formattedName = correctedName.charAt(0).toUpperCase() + correctedName.slice(1).toLowerCase();
        if (formattedName.length > 2 && !isCommonWord(formattedName.toLowerCase())) {
          data.fullName = formattedName;
          confidence.fullName = 0.95; // Higher confidence for explicit corrections
        }
      }
    }

    // Email correction patterns
    const emailCorrectionMatch = msg.match(/(?:actually|correct|should be|it's|its)\s+[\w.-]+@[\w.-]+\.\w{2,}/i);
    if (emailCorrectionMatch) {
      const emailMatch = msg.match(/[\w.-]+@[\w.-]+\.\w{2,}/i);
      if (emailMatch) {
        data.email = emailMatch[0].toLowerCase();
        confidence.email = 0.95;
      }
    }

    // Standard email extraction (if no correction found yet)
    if (!data.email) {
      const emailMatch = msg.match(/[\w.-]+@[\w.-]+\.\w{2,}/i);
      if (emailMatch) {
        data.email = emailMatch[0].toLowerCase();
        confidence.email = 0.95;
      }
    }

    // Name extraction - standard patterns (only if no correction set it)
    if (!data.fullName) {
      const namePatterns = [
        /(?:my name is|i'm|i am|call me|name's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        // Single word that's just a capitalized name (likely answering "what's your name?")
        /^([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)$/,
      ];
      for (const pattern of namePatterns) {
        const match = msg.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          const firstWord = name.split(' ')[0].toLowerCase();
          if (name.length > 2 && !isCommonWord(firstWord)) {
            data.fullName = name;
            confidence.fullName = 0.85;
            break;
          }
        }
      }
    }
  }

  // Company extraction - scan full text
  const companyPatterns = [
    /(?:work(?:ing)?\s+(?:at|for)|company is|from|with)\s+([A-Z][A-Za-z0-9\s&.-]{2,}?)(?:\.|,|$|\n)/i,
    /(?:at|for)\s+([A-Z][A-Za-z0-9\s&.-]{2,}?)\s+(?:as|doing)/i,
  ];
  for (const pattern of companyPatterns) {
    const match = userMessagesText.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      const firstWord = company.split(' ')[0].toLowerCase();
      if (company.length > 2 && !isCommonWord(firstWord)) {
        data.company = company;
        confidence.company = 0.8;
        break;
      }
    }
  }

  // Phone number extraction
  const phoneMatch = userMessagesText.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
  if (phoneMatch) {
    data.phone = phoneMatch[0].replace(/[^\d+]/g, '');
    confidence.phone = 0.9;
  }

  // Interest/reason extraction
  const interestPatterns = [
    /(?:interested in|looking (?:for|into)|want to learn about|curious about|need help with)\s+(.{5,}?)(?:\.|$|\n)/i,
    /(?:here (?:to|for)|checking out)\s+(.{5,}?)(?:\.|$|\n)/i,
  ];
  for (const pattern of interestPatterns) {
    const match = userMessagesText.match(pattern);
    if (match && match[1]) {
      const interest = match[1].trim();
      if (interest.length > 5 && !isCommonWord(interest.split(' ')[0])) {
        data.interest = interest;
        confidence.interest = 0.7;
        break;
      }
    }
  }

  // Calculate overall confidence
  const filledFields = Object.keys(data).length;
  const totalFields = config.extractionSchema.length;
  confidence.overall = filledFields / totalFields;

  return { data, confidence };
}
