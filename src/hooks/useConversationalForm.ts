/**
 * Conversational Form Hook
 *
 * React hook for managing conversational form interactions with SSE streaming.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ConversationState, ConversationalFormConfig, TopicCoverage } from '@/types/conversational';
// Import directly from state to avoid pulling in server-side dependencies (persistence uses MongoDB)
import { createConversationState } from '@/lib/conversational/state';

/**
 * SSE event types from the streaming endpoint
 */
type SSEEventType = 'chunk' | 'state_update' | 'extraction_update' | 'completion_check' | 'complete' | 'error';

interface SSEChunkEvent {
  type: 'chunk';
  content: string;
}

interface SSEStateUpdateEvent {
  type: 'state_update';
  state: {
    conversationId?: string;
    turnCount: number;
    confidence: number;
    topics: Array<{
      topicId: string;
      name: string;
      covered: boolean;
      depth: number;
    }>;
    partialExtractions?: Record<string, any>;
    messages?: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: string | Date;
    }>;
  };
}

interface SSEExtractionUpdateEvent {
  type: 'extraction_update';
  data: Record<string, any>;
  confidence: Record<string, number>;
  overallConfidence: number;
}

interface SSECompletionCheckEvent {
  type: 'completion_check';
  shouldComplete: boolean;
  reason?: string;
}

interface SSECompleteEvent {
  type: 'complete';
}

interface SSEErrorEvent {
  type: 'error';
  error: string;
  code?: string;
}

type SSEEvent = SSEChunkEvent | SSEStateUpdateEvent | SSEExtractionUpdateEvent | SSECompletionCheckEvent | SSECompleteEvent | SSEErrorEvent;

/**
 * Message in the conversation
 */
export interface ConversationalMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

/**
 * Hook state
 */
export interface UseConversationalFormState {
  /** Current messages in the conversation */
  messages: ConversationalMessage[];
  /** Whether AI is currently streaming a response */
  isStreaming: boolean;
  /** Current error, if any */
  error: string | null;
  /** Whether conversation has completed */
  isComplete: boolean;
  /** Completion reason */
  completionReason?: string;
  /** Topic coverage status */
  topics: TopicCoverage[];
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Current turn count */
  turnCount: number;
  /** Conversation ID */
  conversationId: string | null;
  /** Extracted data from conversation */
  extractedData: Record<string, any>;
}

/**
 * Hook return type
 */
export interface UseConversationalFormReturn extends UseConversationalFormState {
  /** Send a message to the conversation */
  sendMessage: (message: string) => Promise<void>;
  /** Start a new conversation */
  startConversation: () => void;
  /** Reset the conversation */
  reset: () => void;
  /** Confirm completion and submit */
  confirmCompletion: () => Promise<void>;
  /** Dismiss completion suggestion */
  dismissCompletion: () => void;
}

/**
 * Hook options
 */
export interface UseConversationalFormOptions {
  /** Form ID */
  formId: string;
  /** Form configuration */
  config: ConversationalFormConfig;
  /** Callback when conversation completes */
  onComplete?: (state: ConversationState) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * useConversationalForm hook
 *
 * Manages conversational form state and SSE streaming.
 */
export function useConversationalForm(
  options: UseConversationalFormOptions
): UseConversationalFormReturn {
  const { formId, config, onComplete, onError } = options;

  // State
  const [messages, setMessages] = useState<ConversationalMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [completionReason, setCompletionReason] = useState<string | undefined>();
  const [topics, setTopics] = useState<TopicCoverage[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Record<string, any>>({});

  // Refs for SSE
  const abortControllerRef = useRef<AbortController | null>(null);
  const stateRef = useRef<ConversationState | null>(null);

  // Initialize conversation state when starting
  const initializeState = useCallback(() => {
    const state = createConversationState(formId, config);
    stateRef.current = state;
    setConversationId(state.conversationId);
    setTopics(state.topics);
    setTurnCount(0);
    setConfidence(0);
    setMessages([]);
    setError(null);
    setIsComplete(false);
    setCompletionReason(undefined);
    setExtractedData({});
    return state;
  }, [formId, config]);

  // Start a new conversation
  const startConversation = useCallback(() => {
    const state = initializeState();

    // Add initial welcome message from assistant
    const welcomeMessage: ConversationalMessage = {
      id: generateId(),
      role: 'assistant',
      content: getWelcomeMessage(config),
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [initializeState, config]);

  // Reset conversation
  const reset = useCallback(() => {
    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    startConversation();
  }, [startConversation]);

  // Send a message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isStreaming || !stateRef.current) {
      return;
    }

    setError(null);

    // Add user message
    const userMessage: ConversationalMessage = {
      id: generateId(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for assistant response
    const assistantMessageId = generateId();
    const assistantMessage: ConversationalMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(true);

    // Abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Make SSE request
      const response = await fetch('/api/conversational/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: stateRef.current.conversationId,
          formId,
          message: message.trim(),
          state: stateRef.current,
          config,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              handleSSEEvent(event, assistantMessageId);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const event: SSEEvent = JSON.parse(buffer.slice(6));
          handleSSEEvent(event, assistantMessageId);
        } catch {
          // Ignore parse errors
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }

      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      onError?.(errorMessage);

      // Remove the streaming message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, formId, config, onError]);

  // Handle SSE events
  const handleSSEEvent = useCallback((event: SSEEvent, messageId: string) => {
    switch (event.type) {
      case 'chunk':
        // Append content to streaming message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: m.content + event.content }
              : m
          )
        );
        break;

      case 'state_update':
        // Update state from server
        setTurnCount(event.state.turnCount);
        setConfidence(event.state.confidence);
        setTopics((prev) =>
          prev.map((t) => {
            const updated = event.state.topics.find((ut) => ut.topicId === t.topicId);
            return updated ? { ...t, covered: updated.covered, depth: updated.depth } : t;
          })
        );
        // Update ref state with full state including messages
        if (stateRef.current && event.state.messages) {
          stateRef.current = {
            ...stateRef.current,
            turnCount: event.state.turnCount,
            confidence: event.state.confidence,
            topics: event.state.topics.map((t: any) => ({
              topicId: t.topicId,
              name: t.name,
              covered: t.covered,
              depth: t.depth,
              priority: stateRef.current!.topics.find(ot => ot.topicId === t.topicId)?.priority || 'optional',
              turnCount: stateRef.current!.topics.find(ot => ot.topicId === t.topicId)?.turnCount || 0,
            })),
            partialExtractions: event.state.partialExtractions || stateRef.current.partialExtractions,
            messages: event.state.messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            })),
          };
        }
        break;

      case 'extraction_update':
        // Update extracted data from server
        setExtractedData((prev) => ({
          ...prev,
          ...event.data,
        }));
        if (event.overallConfidence > 0) {
          setConfidence(event.overallConfidence);
        }
        // Update ref state
        if (stateRef.current) {
          stateRef.current = {
            ...stateRef.current,
            partialExtractions: {
              ...stateRef.current.partialExtractions,
              ...event.data,
            },
            confidence: event.overallConfidence || stateRef.current.confidence,
          };
        }
        break;

      case 'completion_check':
        if (event.shouldComplete) {
          setIsComplete(true);
          setCompletionReason(event.reason);
        }
        break;

      case 'complete':
        // Mark message as no longer streaming
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, isStreaming: false } : m
          )
        );
        break;

      case 'error':
        setError(event.error);
        onError?.(event.error);
        // Mark message as no longer streaming
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, isStreaming: false } : m
          )
        );
        break;
    }
  }, [onError]);

  // Confirm completion
  const confirmCompletion = useCallback(async () => {
    if (!stateRef.current) return;

    // Mark state as completed
    stateRef.current = {
      ...stateRef.current,
      status: 'completed',
      completedAt: new Date(),
    };

    onComplete?.(stateRef.current);
  }, [onComplete]);

  // Dismiss completion suggestion
  const dismissCompletion = useCallback(() => {
    setIsComplete(false);
    setCompletionReason(undefined);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isStreaming,
    error,
    isComplete,
    completionReason,
    topics,
    confidence,
    turnCount,
    conversationId,
    extractedData,
    sendMessage,
    startConversation,
    reset,
    confirmCompletion,
    dismissCompletion,
  };
}

/**
 * Generate welcome message based on config
 */
function getWelcomeMessage(config: ConversationalFormConfig): string {
  const { persona, objective } = config;

  const greetings: Record<string, string> = {
    professional: 'Hello! I\'m here to help you today.',
    friendly: 'Hi there! Great to meet you.',
    casual: 'Hey! Let\'s chat.',
    empathetic: 'Hello, I\'m here to help and listen.',
    custom: 'Hello!',
  };

  const greeting = greetings[persona.style] || greetings.friendly;

  return `${greeting} ${objective} Let's get started - what brings you here today?`;
}

export default useConversationalForm;
