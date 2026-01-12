/**
 * RAG Integration for Conversational Forms
 *
 * Integrates RAG retrieval with the conversation engine to provide
 * knowledge-guided responses. This module bridges the RAG subsystem
 * with the conversational form orchestration.
 */

import {
  ConversationalFormConfig,
  ConversationState,
} from '@/types/conversational';
import { Message } from '@/lib/ai/providers/base';
import {
  RAGConfig,
  RetrievedChunk,
  RAGTelemetry,
} from '@/types/rag';
import {
  retrieveRelevantChunks,
} from '@/lib/rag/retrieval';
import {
  enhancePromptWithContext,
  buildContextualQuery,
  shouldTriggerRetrieval,
  combineTopicAndRAGGuidance,
  createEmptyTurnContext,
  createTurnContext,
  RAGTurnContext,
  RAGSource,
} from '@/lib/rag/promptEnhancement';

// Re-export types for convenience
export type { RAGTurnContext, RAGSource };

// ============================================
// Types
// ============================================

/**
 * RAG-enhanced processing result
 */
export interface RAGProcessingResult {
  /** Enhanced guidance with RAG context */
  enhancedGuidance: string;
  /** RAG context for this turn */
  turnContext: RAGTurnContext;
  /** Sources for citation display */
  sources: RAGSource[];
  /** Whether RAG was triggered */
  ragTriggered: boolean;
  /** Updated RAG telemetry */
  telemetry: RAGTelemetry;
}

/**
 * Options for RAG processing
 */
export interface RAGProcessingOptions {
  /** Organization ID (required for retrieval) */
  organizationId: string;
  /** Force retrieval even if heuristics say no */
  forceRetrieval?: boolean;
  /** Skip retrieval even if RAG is enabled */
  skipRetrieval?: boolean;
}

// ============================================
// Core Integration Functions
// ============================================

/**
 * Process a user message with RAG enhancement
 *
 * This is the main entry point for RAG integration. It:
 * 1. Determines if retrieval should be triggered
 * 2. Retrieves relevant chunks from the knowledge base
 * 3. Enhances the guidance prompt with context
 * 4. Updates telemetry
 *
 * @param userMessage - The user's message
 * @param state - Current conversation state
 * @param config - Form configuration with RAG settings
 * @param baseGuidance - Original guidance from prompt strategy
 * @param options - Processing options
 * @returns RAG-enhanced processing result
 */
export async function processWithRAG(
  userMessage: string,
  state: ConversationState,
  config: ConversationalFormConfig,
  baseGuidance: string,
  options: RAGProcessingOptions
): Promise<RAGProcessingResult> {
  const ragConfig = config.rag;

  // Initialize telemetry from state or create new
  const telemetry: RAGTelemetry = state.ragTelemetry || createEmptyTelemetry();

  // Check if RAG should be triggered
  if (!ragConfig?.enabled || options.skipRetrieval) {
    return {
      enhancedGuidance: baseGuidance,
      turnContext: createEmptyTurnContext(),
      sources: [],
      ragTriggered: false,
      telemetry,
    };
  }

  // Determine if we should retrieve for this message
  const shouldRetrieve =
    options.forceRetrieval || shouldTriggerRetrieval(userMessage, state, ragConfig);

  if (!shouldRetrieve) {
    return {
      enhancedGuidance: baseGuidance,
      turnContext: createEmptyTurnContext(),
      sources: [],
      ragTriggered: false,
      telemetry,
    };
  }

  try {
    // Build contextual query
    const query = buildContextualQuery(userMessage, state);

    // Perform retrieval
    const startTime = Date.now();
    const chunks = await retrieveRelevantChunks(
      query,
      state.formId,
      options.organizationId,
      {
        maxChunks: ragConfig.retrievalConfig?.maxChunks ?? 5,
        minScore: ragConfig.retrievalConfig?.minScore ?? 0.7,
        documentIds: ragConfig.documents,
      }
    );
    const latencyMs = Date.now() - startTime;

    // Create turn context
    const turnContext = createTurnContext(query, chunks, latencyMs);

    // Update telemetry
    updateTelemetry(telemetry, chunks, latencyMs);

    // If no relevant chunks found, return base guidance with note
    if (chunks.length === 0) {
      const noContextGuidance = combineTopicAndRAGGuidance(baseGuidance, {
        hasContext: false,
        chunkCount: 0,
        topSources: [],
      });

      return {
        enhancedGuidance: noContextGuidance,
        turnContext,
        sources: [],
        ragTriggered: true,
        telemetry,
      };
    }

    // Enhance guidance with RAG context
    const enhanced = enhancePromptWithContext(baseGuidance, chunks, {
      maxContextLength: 6000, // Leave room for conversation
      includeCitationInstructions: true,
      formatStyle: 'detailed',
    });

    // Combine with topic guidance awareness
    const finalGuidance = combineTopicAndRAGGuidance(enhanced.prompt, {
      hasContext: true,
      chunkCount: enhanced.chunksIncluded,
      topSources: enhanced.sources.slice(0, 3),
    });

    return {
      enhancedGuidance: finalGuidance,
      turnContext,
      sources: enhanced.sources,
      ragTriggered: true,
      telemetry,
    };
  } catch (error) {
    // Log error but don't fail the conversation
    console.error('[RAG Integration] Retrieval error:', error);

    return {
      enhancedGuidance: baseGuidance,
      turnContext: createEmptyTurnContext(),
      sources: [],
      ragTriggered: false,
      telemetry,
    };
  }
}

/**
 * Enhance system prompt with RAG context for initial message
 *
 * Used when starting a conversation to inject relevant context
 * based on form configuration and any initial context.
 *
 * @param systemPrompt - Base system prompt
 * @param config - Form configuration
 * @param options - Processing options
 * @returns Enhanced system prompt
 */
export async function enhanceSystemPromptWithRAG(
  systemPrompt: string,
  config: ConversationalFormConfig,
  options: RAGProcessingOptions
): Promise<{
  prompt: string;
  initialContext: RAGTurnContext | null;
}> {
  const ragConfig = config.rag;

  // If RAG not enabled, return original
  if (!ragConfig?.enabled || options.skipRetrieval) {
    return {
      prompt: systemPrompt,
      initialContext: null,
    };
  }

  // Add RAG awareness to system prompt
  const ragAwarePrompt = `${systemPrompt}

## Knowledge Base Integration

This form has a knowledge base with relevant documents attached. When users ask questions:
1. Check if the retrieved context contains relevant information
2. Base answers on documented information when available
3. Use [Source N] citations to reference specific sources
4. If information is not in the knowledge base, clearly state this

The knowledge base will be searched automatically when users ask questions, and relevant passages will be provided in the conversation context.`;

  return {
    prompt: ragAwarePrompt,
    initialContext: null,
  };
}

/**
 * Build a message with RAG context for the LLM
 *
 * Creates the messages array with system prompt, conversation history,
 * and RAG context injected at the appropriate position.
 *
 * @param messages - Current conversation messages
 * @param ragContext - RAG context to inject
 * @param guidance - Current turn guidance
 * @returns Messages array for LLM API
 */
export function buildMessagesWithRAGContext(
  messages: Message[],
  ragContext: RAGTurnContext | null,
  guidance: string
): Message[] {
  const result = [...messages];

  // If we have RAG context, add it as a system message before the guidance
  if (ragContext?.wasTriggered && ragContext.chunks.length > 0) {
    // The context is already included in the guidance via enhancePromptWithContext
    // Just ensure the guidance is added as a system message
  }

  // Add guidance as the final system message if not empty
  if (guidance.trim()) {
    result.push({
      role: 'system',
      content: guidance,
      timestamp: new Date(),
    });
  }

  return result;
}

// ============================================
// Telemetry Functions
// ============================================

/**
 * Create empty RAG telemetry
 */
export function createEmptyTelemetry(): RAGTelemetry {
  return {
    retrievalCount: 0,
    retrievedDocuments: [],
    suggestionsWithSources: [],
  };
}

/**
 * Update telemetry with retrieval results
 */
function updateTelemetry(
  telemetry: RAGTelemetry,
  chunks: RetrievedChunk[],
  latencyMs: number
): void {
  telemetry.retrievalCount++;

  // Group chunks by document
  const docChunks = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const existing = docChunks.get(chunk.documentId) || [];
    existing.push(chunk);
    docChunks.set(chunk.documentId, existing);
  }

  // Add document retrieval entries
  for (const [documentId, docChunkList] of docChunks) {
    const avgScore =
      docChunkList.reduce((sum, c) => sum + c.score, 0) / docChunkList.length;

    telemetry.retrievedDocuments.push({
      documentId,
      chunksRetrieved: docChunkList.length,
      avgScore,
      retrievedAt: new Date(),
    });
  }
}

/**
 * Record a suggestion that was made with source citations
 */
export function recordSuggestionWithSources(
  telemetry: RAGTelemetry,
  fieldName: string,
  suggestedValue: unknown,
  confidence: number,
  sources: Array<{
    documentId: string;
    chunkId: string;
    score: number;
    excerpt: string;
  }>,
  accepted: boolean
): void {
  telemetry.suggestionsWithSources.push({
    fieldName,
    suggestedValue,
    confidence,
    sources,
    accepted,
    timestamp: new Date(),
  });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if form has RAG enabled and configured
 */
export function isRAGEnabled(config: ConversationalFormConfig): boolean {
  return !!(config.rag?.enabled && config.rag.documents?.length > 0);
}

/**
 * Get RAG configuration with defaults
 */
export function getRAGConfigWithDefaults(
  config: ConversationalFormConfig
): RAGConfig {
  const defaultConfig: RAGConfig = {
    enabled: false,
    documents: [],
    retrievalConfig: {
      maxChunks: 5,
      minScore: 0.7,
      retrievalThreshold: 0.5,
    },
  };

  if (!config.rag) return defaultConfig;

  return {
    enabled: config.rag.enabled,
    documents: config.rag.documents || [],
    retrievalConfig: {
      maxChunks: config.rag.retrievalConfig?.maxChunks ?? 5,
      minScore: config.rag.retrievalConfig?.minScore ?? 0.7,
      retrievalThreshold: config.rag.retrievalConfig?.retrievalThreshold ?? 0.5,
    },
  };
}

/**
 * Merge RAG telemetry from multiple sources
 */
export function mergeRAGTelemetry(
  existing: RAGTelemetry | undefined,
  newTelemetry: RAGTelemetry
): RAGTelemetry {
  if (!existing) return newTelemetry;

  return {
    retrievalCount: existing.retrievalCount + newTelemetry.retrievalCount,
    retrievedDocuments: [
      ...existing.retrievedDocuments,
      ...newTelemetry.retrievedDocuments,
    ],
    suggestionsWithSources: [
      ...existing.suggestionsWithSources,
      ...newTelemetry.suggestionsWithSources,
    ],
  };
}

/**
 * Format sources for display in UI
 */
export function formatSourcesForDisplay(
  sources: RAGSource[]
): Array<{
  label: string;
  excerpt: string;
  confidence: string;
}> {
  return sources.map((source) => ({
    label: source.pageNumber
      ? `${source.title} (p.${source.pageNumber})`
      : source.title,
    excerpt: source.excerpt,
    confidence: `${Math.round(source.score * 100)}%`,
  }));
}
