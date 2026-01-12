/**
 * RAG Prompt Enhancement Utilities
 *
 * Utilities for enhancing conversational form prompts with retrieved context
 * from the RAG knowledge base. These utilities integrate with the PromptStrategy
 * system to inject relevant document context into AI conversations.
 */

import { RetrievedChunk, RAGConfig, RAGRetrievalConfig } from '@/types/rag';
import { ConversationState } from '@/types/conversational';

// ============================================
// Types
// ============================================

/**
 * Context injection options
 */
export interface RAGContextInjectionOptions {
  /** Maximum characters for context (to stay within token limits) */
  maxContextLength?: number;
  /** Whether to include citation instructions */
  includeCitationInstructions?: boolean;
  /** Whether to include source metadata */
  includeSourceMetadata?: boolean;
  /** Style of context formatting */
  formatStyle?: 'detailed' | 'compact' | 'inline';
}

/**
 * Enhanced prompt with RAG context
 */
export interface EnhancedPrompt {
  /** The enhanced prompt text */
  prompt: string;
  /** Number of chunks included */
  chunksIncluded: number;
  /** Sources used for potential citation display */
  sources: RAGSource[];
  /** Whether context was truncated */
  wasTruncated: boolean;
}

/**
 * Source information for citations
 */
export interface RAGSource {
  /** Reference number (1-based) */
  index: number;
  /** Document ID */
  documentId: string;
  /** Chunk ID */
  chunkId: string;
  /** Document title or filename */
  title: string;
  /** Page number if available */
  pageNumber?: number;
  /** Section if available */
  section?: string;
  /** Relevance score */
  score: number;
  /** Text excerpt for preview */
  excerpt: string;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_INJECTION_OPTIONS: Required<RAGContextInjectionOptions> = {
  maxContextLength: 8000, // ~2000 tokens
  includeCitationInstructions: true,
  includeSourceMetadata: true,
  formatStyle: 'detailed',
};

// ============================================
// Context Formatting Functions
// ============================================

/**
 * Format a single chunk for inclusion in prompt
 */
function formatChunk(
  chunk: RetrievedChunk,
  index: number,
  style: 'detailed' | 'compact' | 'inline'
): string {
  const sourceLabel = chunk.document?.title || chunk.document?.fileName || 'Document';
  const scorePercent = Math.round(chunk.score * 100);

  switch (style) {
    case 'detailed':
      let detailed = `### [Source ${index}] ${sourceLabel}`;
      if (chunk.metadata.pageNumber) {
        detailed += ` (Page ${chunk.metadata.pageNumber})`;
      }
      detailed += `\n**Relevance:** ${scorePercent}%`;
      if (chunk.metadata.section) {
        detailed += ` | **Section:** ${chunk.metadata.section}`;
      }
      detailed += `\n\n${chunk.text}\n`;
      return detailed;

    case 'compact':
      let compact = `[${index}] `;
      if (chunk.metadata.pageNumber) {
        compact += `(p.${chunk.metadata.pageNumber}) `;
      }
      compact += chunk.text;
      return compact;

    case 'inline':
      // For inline, just return the text with a marker
      return `${chunk.text} [Source ${index}]`;

    default:
      return chunk.text;
  }
}

/**
 * Build citation instructions for the AI
 */
function buildCitationInstructions(sourceCount: number): string {
  if (sourceCount === 0) return '';

  return `
## Citation Guidelines
When answering questions using the provided documentation:
- Reference sources using [Source N] notation (e.g., [Source 1], [Source 2])
- Cite the most relevant source(s) for each piece of information
- If multiple sources support an answer, cite all relevant ones
- If information is NOT found in the sources, clearly state that
- Do not make up information that isn't in the provided sources
- You may combine information from multiple sources when appropriate
`;
}

/**
 * Build the RAG knowledge base header
 */
function buildKnowledgeBaseHeader(
  chunkCount: number,
  documentCount: number
): string {
  return `## Knowledge Base Context

The following relevant information was retrieved from ${documentCount} document${documentCount !== 1 ? 's' : ''} in the knowledge base. Use this information to provide accurate, grounded responses.

---
`;
}

// ============================================
// Main Enhancement Functions
// ============================================

/**
 * Enhance a prompt with RAG context
 *
 * This is the primary function for injecting retrieved document context
 * into conversational form prompts.
 *
 * @param basePrompt - The original prompt (system or guidance)
 * @param chunks - Retrieved chunks from vector search
 * @param options - Context injection options
 * @returns Enhanced prompt with context and sources
 */
export function enhancePromptWithContext(
  basePrompt: string,
  chunks: RetrievedChunk[],
  options: RAGContextInjectionOptions = {}
): EnhancedPrompt {
  const opts = { ...DEFAULT_INJECTION_OPTIONS, ...options };

  // Handle empty chunks
  if (chunks.length === 0) {
    return {
      prompt: basePrompt,
      chunksIncluded: 0,
      sources: [],
      wasTruncated: false,
    };
  }

  // Build sources list
  const sources: RAGSource[] = chunks.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    title: chunk.document?.title || chunk.document?.fileName || 'Untitled',
    pageNumber: chunk.metadata.pageNumber,
    section: chunk.metadata.section,
    score: chunk.score,
    excerpt: truncateText(chunk.text, 150),
  }));

  // Count unique documents
  const uniqueDocIds = new Set(chunks.map((c) => c.documentId));
  const documentCount = uniqueDocIds.size;

  // Build context sections
  let contextSection = '';
  let wasTruncated = false;
  let chunksIncluded = 0;

  // Add header
  contextSection += buildKnowledgeBaseHeader(chunks.length, documentCount);

  // Add chunks, respecting max length
  for (let i = 0; i < chunks.length; i++) {
    const chunkFormatted = formatChunk(chunks[i], i + 1, opts.formatStyle);

    // Check if adding this chunk would exceed limit
    if (
      contextSection.length + chunkFormatted.length >
      opts.maxContextLength - 500 // Reserve space for instructions
    ) {
      wasTruncated = true;
      break;
    }

    contextSection += chunkFormatted + '\n';
    chunksIncluded++;
  }

  contextSection += '---\n';

  // Add citation instructions if enabled
  if (opts.includeCitationInstructions) {
    contextSection += buildCitationInstructions(chunksIncluded);
  }

  // Combine with base prompt
  // Place context after the base system prompt but before any conversation history
  const enhancedPrompt = `${basePrompt}

${contextSection}`;

  return {
    prompt: enhancedPrompt,
    chunksIncluded,
    sources,
    wasTruncated,
  };
}

/**
 * Build a contextual query from user message and conversation state
 *
 * Creates an enhanced query for vector search that incorporates
 * conversation context for better retrieval.
 *
 * @param userMessage - The current user message
 * @param state - Current conversation state
 * @returns Enhanced query string
 */
export function buildContextualQuery(
  userMessage: string,
  state: ConversationState
): string {
  // Start with the user message
  let query = userMessage;

  // If the message is very short, try to add context
  if (userMessage.length < 50 && state.messages.length > 0) {
    // Get the last few messages for context
    const recentMessages = state.messages
      .filter((m) => m.role !== 'system')
      .slice(-4) // Last 4 exchanges
      .map((m) => m.content)
      .join(' ');

    // Combine for richer context (but prioritize current message)
    if (recentMessages.length > 0) {
      query = `${userMessage}\n\nContext: ${recentMessages}`;
    }
  }

  // Truncate if too long (vector search works best with focused queries)
  return truncateText(query, 500);
}

/**
 * Determine if RAG retrieval should be triggered for a message
 *
 * Uses heuristics to decide if the user's message would benefit
 * from RAG context retrieval.
 *
 * @param userMessage - The user's message
 * @param state - Current conversation state
 * @param config - RAG configuration
 * @returns Whether to trigger retrieval
 */
export function shouldTriggerRetrieval(
  userMessage: string,
  state: ConversationState,
  config: RAGConfig
): boolean {
  // RAG must be enabled
  if (!config.enabled) return false;

  // Must have documents configured
  if (!config.documents || config.documents.length === 0) return false;

  const message = userMessage.toLowerCase();

  // Question indicators (high priority for retrieval)
  const questionIndicators = [
    '?',
    'what',
    'how',
    'why',
    'when',
    'where',
    'who',
    'which',
    'can you',
    'could you',
    'tell me',
    'explain',
    'describe',
  ];

  // Information seeking indicators
  const infoIndicators = [
    'policy',
    'procedure',
    'process',
    'guideline',
    'rule',
    'requirement',
    'document',
    'information',
    'detail',
    'specific',
    'according to',
    'based on',
  ];

  // Check for question patterns
  const hasQuestionIndicator = questionIndicators.some((ind) =>
    message.includes(ind)
  );

  // Check for information seeking patterns
  const hasInfoIndicator = infoIndicators.some((ind) =>
    message.includes(ind)
  );

  // Simple greeting or acknowledgment - probably don't need retrieval
  const simpleResponses = [
    'yes',
    'no',
    'ok',
    'okay',
    'thanks',
    'thank you',
    'sure',
    'got it',
    'hi',
    'hello',
  ];
  const isSimpleResponse =
    message.length < 20 && simpleResponses.some((r) => message.includes(r));

  if (isSimpleResponse) return false;

  // Trigger if it looks like a question or information request
  return hasQuestionIndicator || hasInfoIndicator || message.length > 50;
}

/**
 * Build guidance for RAG-enhanced responses
 *
 * Creates specific guidance for the AI about how to use
 * the retrieved context in its response.
 *
 * @param hasContext - Whether RAG context was provided
 * @param sources - Available sources
 * @returns Guidance string
 */
export function buildRAGResponseGuidance(
  hasContext: boolean,
  sources: RAGSource[]
): string {
  if (!hasContext || sources.length === 0) {
    return `Note: No relevant documentation was found for this query.
Respond based on the conversation context and general knowledge,
but note if the user is asking about something that might be in their documents.`;
  }

  const sourceList = sources
    .map((s) => `- [Source ${s.index}]: ${s.title}${s.pageNumber ? ` (p.${s.pageNumber})` : ''}`)
    .join('\n');

  return `## Available Sources
${sourceList}

**Instructions:**
1. Base your response primarily on the provided sources
2. Cite sources using [Source N] notation
3. If the sources don't fully answer the question, acknowledge this
4. Synthesize information from multiple sources when relevant
5. Maintain the conversational tone while being accurate`;
}

/**
 * Create a RAG-aware conversation guidance prompt
 *
 * Combines topic guidance with RAG context awareness.
 *
 * @param topicGuidance - Original topic guidance
 * @param ragContext - RAG context information
 * @returns Combined guidance
 */
export function combineTopicAndRAGGuidance(
  topicGuidance: string,
  ragContext: {
    hasContext: boolean;
    chunkCount: number;
    topSources: RAGSource[];
  }
): string {
  let combined = topicGuidance;

  if (ragContext.hasContext && ragContext.chunkCount > 0) {
    combined += `

## Knowledge Base Integration
${ragContext.chunkCount} relevant passage${ragContext.chunkCount !== 1 ? 's' : ''} from the knowledge base are available.
When gathering information or answering questions:
- Check if the knowledge base contains relevant information
- Cite sources when using documented information
- Use document context to provide more accurate, grounded responses

Top sources available:
${ragContext.topSources
  .slice(0, 3)
  .map((s) => `- ${s.title}: ${s.excerpt.substring(0, 80)}...`)
  .join('\n')}`;
  }

  return combined;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to break at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Estimate token count for a string
 * Rough approximation: 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if adding context would exceed token budget
 */
export function wouldExceedTokenBudget(
  basePrompt: string,
  contextToAdd: string,
  maxTokens: number = 4000
): boolean {
  const combinedText = basePrompt + contextToAdd;
  const estimatedTokens = estimateTokenCount(combinedText);
  return estimatedTokens > maxTokens;
}

// ============================================
// RAG Context State Management
// ============================================

/**
 * RAG context state for a conversation turn
 */
export interface RAGTurnContext {
  /** Whether RAG was triggered for this turn */
  wasTriggered: boolean;
  /** Query used for retrieval */
  query?: string;
  /** Retrieved chunks */
  chunks: RetrievedChunk[];
  /** Sources for citation */
  sources: RAGSource[];
  /** Retrieval latency in ms */
  latencyMs?: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Create an empty RAG turn context
 */
export function createEmptyTurnContext(): RAGTurnContext {
  return {
    wasTriggered: false,
    chunks: [],
    sources: [],
    timestamp: new Date(),
  };
}

/**
 * Create a RAG turn context from retrieval results
 */
export function createTurnContext(
  query: string,
  chunks: RetrievedChunk[],
  latencyMs: number
): RAGTurnContext {
  const sources: RAGSource[] = chunks.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    title: chunk.document?.title || chunk.document?.fileName || 'Untitled',
    pageNumber: chunk.metadata.pageNumber,
    section: chunk.metadata.section,
    score: chunk.score,
    excerpt: truncateText(chunk.text, 150),
  }));

  return {
    wasTriggered: true,
    query,
    chunks,
    sources,
    latencyMs,
    timestamp: new Date(),
  };
}
