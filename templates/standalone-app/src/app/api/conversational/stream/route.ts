/**
 * Conversational Form Streaming API (Standalone Version)
 *
 * Handles streaming AI responses for conversational forms.
 */

import { NextRequest } from 'next/server';
import { createDefaultProvider, isAIConfigured } from '@/lib/ai/providers';
import { createConversationEngine, ConversationEngine } from '@/lib/conversational/engine';
import { ConversationalFormConfig, ConversationState } from '@/types/conversational';
import { Message } from '@/lib/ai/providers/base';
import { getFormBySlug } from '@/lib/bundle';

export const dynamic = 'force-dynamic';

interface StreamRequest {
  formSlug: string;
  message: string;
  conversationState?: ConversationState;
}

/**
 * POST /api/conversational/stream
 *
 * Stream AI responses for a conversational form session.
 */
export async function POST(request: NextRequest) {
  // Check if AI is configured
  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'AI is not configured',
        message:
          'To use conversational forms, please set the OPENAI_API_KEY environment variable.',
        code: 'AI_NOT_CONFIGURED',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = (await request.json()) as StreamRequest;
    const { formSlug, message, conversationState } = body;

    if (!formSlug) {
      return new Response(JSON.stringify({ error: 'Form slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get form configuration
    const form = await getFormBySlug(formSlug);
    if (!form) {
      return new Response(JSON.stringify({ error: 'Form not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if form has conversational config
    const conversationalConfig = form.conversationalConfig as ConversationalFormConfig | undefined;
    if (!conversationalConfig) {
      return new Response(
        JSON.stringify({ error: 'Form is not configured for conversational mode' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create or restore conversation engine
    const formSlugValue = form.slug || formSlug;
    const engine = createConversationEngine(formSlugValue, conversationalConfig);
    if (conversationState) {
      engine.restoreState(conversationState);
    }

    // Add user message
    engine.addUserMessage(message);

    // Create provider
    const provider = createDefaultProvider();
    if (!provider) {
      return new Response(
        JSON.stringify({
          error: 'AI provider not available',
          message: 'Please check your OPENAI_API_KEY configuration.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Build messages for LLM
    const systemPrompt = engine.buildSystemPrompt();
    const state = engine.getState();

    const llmMessages: Message[] = [{ role: 'system', content: systemPrompt }, ...state.messages];

    // Add guidance for next topic if conversation is ongoing
    const nextTopic = engine.getNextTopic();
    if (nextTopic && state.turnCount > 0) {
      const topicDescription =
        conversationalConfig.topics.find((t) => t.id === nextTopic.topicId)?.description || '';
      const guidancePrompt = `
[Internal guidance - do not mention this to the user]
Next topic to explore: ${nextTopic.name}
Description: ${topicDescription}
Priority: ${nextTopic.priority}
`;
      llmMessages.push({ role: 'system', content: guidancePrompt });
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          // Stream the response
          for await (const chunk of provider.streamChat(llmMessages, {
            temperature: 0.7,
            maxTokens: 1000,
          })) {
            fullResponse += chunk;

            // Send chunk as SSE
            const data = JSON.stringify({ type: 'chunk', content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Add assistant message to engine
          engine.addAssistantMessage(fullResponse);

          // Extract data from conversation
          try {
            const extraction = await provider.extractStructuredData(
              engine.getState().messages,
              conversationalConfig.extractionSchema
            );

            engine.updateExtractions(extraction.data, extraction.overallConfidence);

            // Analyze topic coverage (simple keyword matching)
            const coveredTopics = analyzeToverage(
              message + ' ' + fullResponse,
              conversationalConfig.topics
            );
            engine.updateTopicCoverage(coveredTopics);
          } catch (extractionError) {
            console.error('[Conversational API] Extraction error:', extractionError);
          }

          // Check for completion
          const completionCheck = engine.shouldComplete();
          if (completionCheck.complete) {
            engine.complete();
          }

          // Send final state
          const finalState = engine.getState();
          const stateData = JSON.stringify({
            type: 'state',
            conversationState: finalState,
            isComplete: finalState.status === 'completed',
            completionReason: completionCheck.reason,
          });
          controller.enqueue(encoder.encode(`data: ${stateData}\n\n`));

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          console.error('[Conversational API] Stream error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Stream error',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Conversational API] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Simple topic coverage analysis based on keyword matching
 */
function analyzeToverage(
  text: string,
  topics: ConversationalFormConfig['topics']
): string[] {
  const lowerText = text.toLowerCase();
  const coveredTopics: string[] = [];

  for (const topic of topics) {
    // Check if topic name or description keywords appear in text
    const keywords = [
      topic.name.toLowerCase(),
      ...topic.description.toLowerCase().split(' ').filter((w) => w.length > 4),
    ];

    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        coveredTopics.push(topic.id);
        break;
      }
    }
  }

  return coveredTopics;
}
