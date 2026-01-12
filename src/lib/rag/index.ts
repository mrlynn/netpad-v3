/**
 * RAG (Retrieval-Augmented Generation) Module
 *
 * Knowledge-guided conversational forms with document retrieval
 *
 * @module lib/rag
 */

// Types
export type {
  RAGDocument,
  RAGDocumentChunk,
  RAGDocumentSourceType,
  RAGDocumentStatus,
  RAGConfig,
  RAGRetrievalConfig,
  RetrievedChunk,
  RAGRetrievalResult,
  RAGTelemetry,
  RAGDocumentUploadRequest,
  RAGDocumentListResponse,
  RAGRetrievalRequest,
  RAGRetrievalResponse,
  DocumentChunk,
  ChunkMetadata,
  ChunkingOptions,
  SupportedMimeType,
} from '@/types/rag';

// Constants
export {
  DEFAULT_RAG_RETRIEVAL_CONFIG,
  DEFAULT_CHUNKING_OPTIONS,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MAX_DOCUMENT_SIZE,
  SUPPORTED_MIME_TYPES,
} from '@/types/rag';

// Storage operations
export {
  // Collection accessors
  getRAGDocumentsCollection,
  getRAGChunksCollection,
  createRAGIndexes,
  // Document CRUD
  createDocumentMetadata,
  getDocumentById,
  getFormDocuments,
  getReadyDocuments,
  updateDocumentStatus,
  updateDocumentMetadata,
  deleteDocument,
  deleteFormDocuments,
  // Chunk operations
  storeChunks,
  getDocumentChunks,
  getChunkCount,
  deleteDocumentChunks,
} from './storage';

// Chunking
export {
  chunkText,
  extractTextFromDocument,
  isSupportedMimeType,
  estimateChunkCount,
  getFileTypeLabel,
} from './chunking';

// Embeddings
export {
  generateEmbeddings,
  generateQueryEmbedding,
  estimateEmbeddingCost,
  estimateChunksCost,
  checkEmbeddingsAvailable,
  getEmbeddingModelInfo,
} from './embeddings';

// Retrieval
export {
  retrieveRelevantChunks,
  retrieveWithMetadata,
  formatChunksAsContext,
  buildSourceCitations,
  checkVectorSearchAvailable,
} from './retrieval';

// Prompt Enhancement
export type {
  RAGContextInjectionOptions,
  EnhancedPrompt,
  RAGSource,
  RAGTurnContext,
} from './promptEnhancement';

export {
  enhancePromptWithContext,
  buildContextualQuery,
  shouldTriggerRetrieval,
  buildRAGResponseGuidance,
  combineTopicAndRAGGuidance,
  estimateTokenCount,
  wouldExceedTokenBudget,
  createEmptyTurnContext,
  createTurnContext,
} from './promptEnhancement';
