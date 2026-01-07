/**
 * Conversational Forms Streaming API
 * 
 * POST /api/conversational/stream
 * Streams AI responses for conversational forms using Server-Sent Events (SSE)
 */

import { NextRequest } from 'next/server';
import { createDefaultProvider, LLMProvider, Message } from '@/lib/ai/providers';
import { withRetryStream } from '@/lib/ai/providers/retry';
import { ProviderError } from '@/lib/ai/providers/base';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import {
  updatePartialExtractions,
  shouldCompleteConversation,
  createConversationEngine,
} from '@/lib/conversational';
import {
  extractDataFromState,
  mergeExtractions,
} from '@/lib/conversational/extraction';
import { getExtractionSchemaForConfig } from '@/lib/conversational/schemas';
import { saveConversationState, loadConversationState } from '@/lib/conversational/persistence';
import { ConversationState, ConversationalFormConfig } from '@/types/conversational';

/**
 * Create SSE response for streaming
 */
function createSSEStream(
  stream: AsyncIterable<string>,
  onError?: (error: Error) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // Format as SSE: data: <content>\n\n
          const sseData = `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        }

        // Send completion event
        const completionEvent = `data: ${JSON.stringify({ type: 'complete' })}\n\n`;
        controller.enqueue(encoder.encode(completionEvent));
        controller.close();
      } catch (error: any) {
        // Send error event
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: error.message || 'Streaming error',
          code: error instanceof ProviderError ? error.code : 'UNKNOWN',
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();

        if (onError) {
          onError(error);
        }
      }
    },
  });
}

/**
 * POST /api/conversational/stream
 * 
 * Request body:
 * {
 *   conversationId: string;
 *   formId: string;
 *   message: string;
 *   state?: ConversationState;
 *   config: ConversationalFormConfig;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    // Note: Using 'ai_form_generator' feature for now - may need dedicated feature later
    const guard = await validateAIRequest('ai_form_generator', true);
    if (!guard.success) {
      // Convert JSON error to SSE format
      const errorData = await guard.response.json();
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        error: errorData.error || 'Authentication required',
        code: 'AUTH_ERROR',
      })}\n\n`;
      return new Response(errorEvent, {
        status: guard.response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.conversationId || typeof body.conversationId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'conversationId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.formId || typeof body.formId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'formId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.config) {
      return new Response(
        JSON.stringify({ error: 'config is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate config has required fields
    if (!body.config.topics || !Array.isArray(body.config.topics) || body.config.topics.length === 0) {
      return new Response(
        JSON.stringify({ error: 'config.topics is required and must be a non-empty array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.config.conversationLimits) {
      return new Response(
        JSON.stringify({ error: 'config.conversationLimits is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create provider
    const provider = createDefaultProvider();
    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'AI service is not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if provider is available
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      return new Response(
        JSON.stringify({ error: 'AI service is currently unavailable' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    /**
     * Normalize conversation state - convert date strings to Date objects
     * This is needed because JSON serialization converts Date objects to strings
     */
    const normalizeState = (state: any): ConversationState => {
      return {
        ...state,
        startedAt: state.startedAt instanceof Date ? state.startedAt : new Date(state.startedAt),
        updatedAt: state.updatedAt instanceof Date ? state.updatedAt : new Date(state.updatedAt),
        completedAt: state.completedAt 
          ? (state.completedAt instanceof Date ? state.completedAt : new Date(state.completedAt))
          : undefined,
        messages: state.messages?.map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp ? new Date(msg.timestamp) : undefined),
        })) || [],
      };
    };

    // Load or initialize conversation state
    let state: ConversationState | null = body.state || null;
    if (!state) {
      // Try to load from database
      state = await loadConversationState(guard.context.orgId, body.conversationId, body.formId);
      if (!state) {
        // If no state exists, create a new one (first message in conversation)
        // Use the conversationId from the request (frontend generates it)
        const { createConversationState } = await import('@/lib/conversational/state');
        state = createConversationState(body.formId, body.config);
        // Override the generated conversationId with the one from the request
        state.conversationId = body.conversationId;
        // Save the initial state
        try {
          await saveConversationState(guard.context.orgId, state);
        } catch (saveError: any) {
          console.warn('[Conversational Stream] Failed to save initial state:', saveError);
          // Continue anyway - state will be saved after first message
        }
      }
    } else {
      // Normalize state from frontend (dates may be strings)
      state = normalizeState(state);
    }

    // Check turn limit BEFORE processing (prevent going over)
    if (state.turnCount >= state.maxTurns) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        error: "We've covered a lot! Let's wrap up and submit what we have.",
        code: 'TURN_LIMIT_REACHED',
        userFriendly: true,
      })}\n\n`;
      return new Response(errorEvent, {
        status: 200, // Return 200 so SSE stream can display the error
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Check max duration (in minutes)
    const durationMinutes = (Date.now() - state.startedAt.getTime()) / (1000 * 60);
    if (durationMinutes >= body.config.conversationLimits.maxDuration) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        error: "Thanks for your time! Let's save your responses now.",
        code: 'DURATION_EXCEEDED',
        userFriendly: true,
      })}\n\n`;
      return new Response(errorEvent, {
        status: 200, // Return 200 so SSE stream can display the error
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Create conversation engine
    const engine = createConversationEngine(body.config);
    
    // Restore state and messages from existing conversation
    engine.setState(state);
    
    // If this is the first message (only system message exists), initialize the conversation
    // Otherwise, the messages are already restored from state
    if (state.messages.length === 0 || state.messages.every(m => m.role === 'system')) {
      engine.initialize();
    } else {
      // Ensure messages are restored from state (setState should handle this, but double-check)
      const stateMessages = state.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp ? new Date(msg.timestamp) : new Date()),
      }));
      engine.setMessages(stateMessages);
    }

    // Check if we're approaching limits for graceful wrap-up
    const turnsRemaining = state.maxTurns - state.turnCount;
    const minutesRemaining = body.config.conversationLimits.maxDuration - durationMinutes;
    const isApproachingLimit = turnsRemaining <= 2 || minutesRemaining <= 2;

    // Process user message and get guidance
    const { messages: engineMessages, state: updatedState, guidance, shouldComplete } = 
      engine.processUserMessage(body.message);
    
    state = updatedState;

    // Enhance guidance with graceful wrap-up if approaching limits
    let enhancedGuidance = guidance;
    if (isApproachingLimit && !shouldComplete) {
      enhancedGuidance += `\n\nIMPORTANT: You are approaching the conversation limit (${turnsRemaining} turns remaining, ${Math.round(minutesRemaining)} minutes remaining). Begin wrapping up the conversation gracefully. Summarize what has been collected and ask for any final critical information. Do not start new topics.`;
    }

    // Build messages for LLM with guidance
    const systemMessage = engineMessages.find(m => m.role === 'system');
    const conversationMessages = engineMessages.filter(m => m.role !== 'system');
    
    // Debug: Log message count to verify memory is working
    console.log('[Conversational Stream] Message count:', {
      total: engineMessages.length,
      system: systemMessage ? 1 : 0,
      conversation: conversationMessages.length,
      userMessages: conversationMessages.filter(m => m.role === 'user').length,
      assistantMessages: conversationMessages.filter(m => m.role === 'assistant').length,
    });
    
    // Add guidance as a system message before the assistant response
    const messagesForLLM: Message[] = [
      ...(systemMessage ? [{
        role: 'system' as const,
        content: `${systemMessage.content}\n\n${enhancedGuidance}`,
      }] : []),
      ...conversationMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];
    
    // Debug: Log what we're sending to LLM
    console.log('[Conversational Stream] Sending to LLM:', {
      messageCount: messagesForLLM.length,
      lastUserMessage: conversationMessages.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 50),
      lastAssistantMessage: conversationMessages.filter(m => m.role === 'assistant').slice(-1)[0]?.content?.substring(0, 50),
    });

    // Stream AI response with retry
    // Note: streamChat returns AsyncIterable<string> directly, not a Promise
    const stream = await withRetryStream(
      async () => {
        const chatStream = provider.streamChat(messagesForLLM, {
          model: 'gpt-4o-mini', // Fast and cost-effective
          temperature: 0.7,
          maxTokens: 1000,
        });
        return chatStream;
      },
      {
        maxRetries: 2,
        retryOnRateLimit: true,
      }
    );

    // Create SSE stream
    let fullResponse = '';
    const sseStream = createSSEStream(stream, (error) => {
      console.error('[Conversational Stream] Error:', error);
    });

    // Process stream and update state
    const reader = sseStream.getReader();
    const decoder = new TextDecoder();

    // Create a new stream that processes chunks and updates state
    const processedStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode and forward SSE data
            const text = decoder.decode(value);
            controller.enqueue(value);

            // Extract chunk content from SSE format
            const lines = text.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'chunk') {
                    fullResponse += data.content;
                  }
                } catch {
                  // Ignore parse errors for non-JSON lines
                }
              }
            }
          }

          // After stream completes, add assistant message to state
          if (fullResponse) {
            engine.addAssistantResponse(fullResponse);
            state = engine.getState();

            // Note: Topic coverage is already updated by the engine in processUserMessage
            // The engine analyzes the conversation and updates topics automatically

            // Get extraction schema (use IT Helpdesk schema if template is enabled)
            const extractionSchema = getExtractionSchemaForConfig(body.config);
            
            // Perform AI-based extraction if we have an extraction schema
            if (extractionSchema && extractionSchema.length > 0) {
              try {
                // Extract structured data from the full conversation
                const extracted = await extractDataFromState(state, extractionSchema);
                
                // Validate extracted data
                const { validateExtractedData } = await import('@/lib/conversational/extraction');
                const validation = validateExtractedData(extracted, extractionSchema);
                
                // Log validation issues but don't fail
                if (!validation.isValid) {
                  console.warn('[Conversational Stream] Extraction validation errors:', validation.errors);
                }
                if (validation.warnings.length > 0) {
                  console.warn('[Conversational Stream] Extraction validation warnings:', validation.warnings);
                }
                
                // Merge with existing partial extractions
                const merged = mergeExtractions(state.partialExtractions, extracted);
                
                // Update state with merged extractions
                state = updatePartialExtractions(
                  state,
                  merged.data,
                  merged.overallConfidence
                );
                
                // Update confidence from extraction
                state.confidence = merged.overallConfidence;
                
                // Update topic coverage based on extraction results
                // This is more reliable than keyword-based analysis
                const { updateTopicCoverageFromExtractions } = await import('@/lib/conversational/state');
                state = updateTopicCoverageFromExtractions(
                  state,
                  merged.data,
                  extractionSchema
                );
                
                // Add validation warnings to state if needed
                if (validation.warnings.length > 0) {
                  // Store warnings in state for later reference
                  // (could be added to ConversationState type if needed)
                }
              } catch (extractionError: any) {
                console.error('[Conversational Stream] Extraction error:', extractionError);
                
                // Send user-friendly error message for extraction failures
                const extractionErrorEvent = `data: ${JSON.stringify({
                  type: 'error',
                  error: "I had trouble understanding that. Could you rephrase?",
                  code: 'EXTRACTION_FAILED',
                  userFriendly: true,
                  retryable: true,
                })}\n\n`;
                controller.enqueue(new TextEncoder().encode(extractionErrorEvent));
                
                // If extraction fails, try to continue with existing partial extractions
                // Don't fail the conversation - we'll retry on completion
                // Log the error for debugging
                if (extractionError.message) {
                  console.error('[Conversational Stream] Extraction error details:', {
                    message: extractionError.message,
                    stack: extractionError.stack,
                    conversationId: state.conversationId,
                    turnCount: state.turnCount,
                  });
                }
                
                // If this is a critical error (not just a validation issue), we might want to
                // mark the state with a warning but continue
                if (extractionError.code === 'PROVIDER_ERROR' || extractionError.code === 'RATE_LIMIT') {
                  // These are retryable errors - we'll try again on completion
                  console.warn('[Conversational Stream] Retryable extraction error, will retry on completion');
                }
              }
            }

            // Check completion
            const completionCheck = shouldCompleteConversation(state, body.config);
            if (completionCheck.shouldComplete) {
              state.status = 'completed';
              state.completedAt = new Date();
              
              // Send completion event
              const completionEvent = `data: ${JSON.stringify({
                type: 'completion_check',
                shouldComplete: true,
                reason: completionCheck.reason,
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(completionEvent));
            }

            // Save updated state to database
            try {
              await saveConversationState(guard.context.orgId, state);
            } catch (saveError) {
              console.error('[Conversational Stream] Failed to save state:', saveError);
              // Don't fail the request if state save fails
            }

            // Send state update event with full state including messages
            const stateUpdate = `data: ${JSON.stringify({
              type: 'state_update',
              state: {
                conversationId: state.conversationId,
                turnCount: state.turnCount,
                confidence: state.confidence,
                topics: state.topics.map((t) => ({
                  topicId: t.topicId,
                  name: t.name,
                  covered: t.covered,
                  depth: t.depth,
                })),
                partialExtractions: state.partialExtractions,
                messages: state.messages.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
                })),
              },
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(stateUpdate));
          }

          controller.close();
        } catch (error: any) {
          console.error('[Conversational Stream] Processing error:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            error: error.message || 'Processing error',
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(processedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error: any) {
    console.error('[Conversational Stream] API error:', error);
    console.error('[Conversational Stream] Error stack:', error.stack);
    console.error('[Conversational Stream] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });

    // Return error as SSE event
    const errorEvent = `data: ${JSON.stringify({
      type: 'error',
      error: error.message || 'Internal server error',
      code: error instanceof ProviderError ? error.code : 'UNKNOWN',
      userFriendly: true,
    })}\n\n`;

    return new Response(errorEvent, {
      status: 200, // Return 200 so SSE stream can display the error
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
