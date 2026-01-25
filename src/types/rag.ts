/**
 * RAG (Retrieval-Augmented Generation) Type Definitions
 *
 * Types for knowledge-guided conversational forms with document retrieval
 */

import { ObjectId } from 'mongodb';

// ============================================
// Document Storage Types
// ============================================

/**
 * Source type for categorizing documents
 */
export type RAGDocumentSourceType = 'policy' | 'contract' | 'guide' | 'manual' | 'faq' | 'other';

/**
 * Document processing status
 */
export type RAGDocumentStatus = 'pending' | 'processing' | 'ready' | 'error';

/**
 * RAG Document metadata stored in MongoDB
 */
export interface RAGDocument {
  /** MongoDB ObjectId */
  _id?: ObjectId;

  /** Unique document identifier (nanoid) */
  documentId: string;

  /** Associated form ID */
  formId: string;

  /** Organization ID */
  organizationId: string;

  /** Project ID (optional) */
  projectId?: string;

  // Storage
  /** Vercel Blob URL */
  blobUrl: string;

  /** Vercel Blob pathname (for deletion) */
  blobPath: string;

  /** Original filename */
  fileName: string;

  /** MIME type (e.g., 'application/pdf') */
  mimeType: string;

  /** File size in bytes */
  fileSize: number;

  // Metadata
  /** Document source type */
  sourceType: RAGDocumentSourceType;

  /** Optional title (defaults to filename) */
  title?: string;

  /** Optional description */
  description?: string;

  /** Tags for filtering */
  tags?: string[];

  // Processing
  /** Processing status */
  status: RAGDocumentStatus;

  /** When document was processed */
  processedAt?: Date;

  /** Error message if status is 'error' */
  errorMessage?: string;

  // Stats
  /** Number of chunks created */
  chunkCount: number;

  /** Embedding model used */
  embeddingModel: string;

  // Audit
  /** User who uploaded the document */
  uploadedBy: string;

  /** When document was uploaded */
  uploadedAt: Date;

  /** When document was last updated */
  updatedAt: Date;
}

/**
 * Document chunk with embedding stored in MongoDB
 */
export interface RAGDocumentChunk {
  /** MongoDB ObjectId */
  _id?: ObjectId;

  /** Unique chunk identifier (nanoid) */
  chunkId: string;

  /** Reference to parent document */
  documentId: string;

  /** Form ID (denormalized for efficient vector search filtering) */
  formId: string;

  // Content
  /** Chunk text content */
  text: string;

  /** Order within document (0-based) */
  chunkIndex: number;

  // Metadata for context
  /** Page number (if from PDF) */
  pageNumber?: number;

  /** Section heading (if detected) */
  section?: string;

  /** Start character position in original document */
  startChar?: number;

  /** End character position in original document */
  endChar?: number;

  // Embedding
  /** Vector embedding (1536 dims for text-embedding-3-small) */
  embedding: number[];

  /** Embedding model used */
  embeddingModel: string;

  /** When embedding was generated */
  embeddedAt: Date;
}

// ============================================
// RAG Configuration Types
// ============================================

/**
 * RAG retrieval configuration
 */
export interface RAGRetrievalConfig {
  /** Maximum chunks to retrieve per query (default: 5) */
  maxChunks: number;

  /** Minimum similarity score threshold (default: 0.7) */
  minScore: number;

  /** Confidence threshold to trigger retrieval (default: 0.5) */
  retrievalThreshold: number;
}

/**
 * RAG configuration for a conversational form
 * This extends ConversationalFormConfig
 */
export interface RAGConfig {
  /** Whether RAG is enabled for this form */
  enabled: boolean;

  /** Array of documentIds to use for retrieval */
  documents: string[];

  /** Retrieval configuration */
  retrievalConfig?: RAGRetrievalConfig;
}

// ============================================
// Retrieval Types
// ============================================

/**
 * Retrieved chunk with metadata and score
 */
export interface RetrievedChunk {
  /** Chunk identifier */
  chunkId: string;

  /** Document identifier */
  documentId: string;

  /** Chunk text content */
  text: string;

  /** Similarity score (0-1) */
  score: number;

  /** Chunk metadata */
  metadata: {
    chunkIndex: number;
    pageNumber?: number;
    section?: string;
  };

  /** Parent document info */
  document?: {
    fileName: string;
    title?: string;
    sourceType: RAGDocumentSourceType;
  };
}

/**
 * RAG retrieval result
 */
export interface RAGRetrievalResult {
  /** Retrieved chunks */
  chunks: RetrievedChunk[];

  /** Query that was used */
  query: string;

  /** Total documents searched */
  documentsSearched: number;

  /** Retrieval latency in ms */
  latencyMs: number;
}

// ============================================
// Telemetry Types
// ============================================

/**
 * RAG telemetry for a conversation
 * Extends ConversationState
 */
export interface RAGTelemetry {
  /** Number of retrieval operations performed */
  retrievalCount: number;

  /** Documents that were retrieved from */
  retrievedDocuments: Array<{
    documentId: string;
    chunksRetrieved: number;
    avgScore: number;
    retrievedAt: Date;
  }>;

  /** Suggestions made with source citations */
  suggestionsWithSources: Array<{
    fieldName: string;
    suggestedValue: unknown;
    confidence: number;
    sources: Array<{
      documentId: string;
      chunkId: string;
      score: number;
      excerpt: string;
    }>;
    accepted: boolean;
    timestamp: Date;
  }>;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Document upload request
 */
export interface RAGDocumentUploadRequest {
  /** Form ID to attach document to */
  formId: string;

  /** Organization ID */
  organizationId: string;

  /** Document source type */
  sourceType: RAGDocumentSourceType;

  /** Optional title */
  title?: string;

  /** Optional description */
  description?: string;
}

/**
 * Document list response
 */
export interface RAGDocumentListResponse {
  documents: RAGDocument[];
}

/**
 * Retrieval request
 */
export interface RAGRetrievalRequest {
  /** Query to search for */
  query: string;

  /** Form ID to search within */
  formId: string;

  /** Organization ID */
  organizationId: string;

  /** Maximum chunks to retrieve */
  maxChunks?: number;

  /** Minimum similarity score */
  minScore?: number;

  /** Filter to specific document IDs */
  documentIds?: string[];
}

/**
 * Retrieval response
 */
export interface RAGRetrievalResponse {
  chunks: RetrievedChunk[];
}

// ============================================
// Chunk Processing Types
// ============================================

/**
 * Chunk metadata during processing
 */
export interface ChunkMetadata {
  /** Index within document */
  chunkIndex: number;

  /** Page number (if applicable) */
  pageNumber?: number;

  /** Section heading (if applicable) */
  section?: string;

  /** Start character position */
  startChar?: number;

  /** End character position */
  endChar?: number;
}

/**
 * Document chunk before embedding
 */
export interface DocumentChunk {
  /** Chunk text content */
  text: string;

  /** Chunk metadata */
  metadata: ChunkMetadata;
}

/**
 * Chunking options
 */
export interface ChunkingOptions {
  /** Target chunk size in characters (default: 1000) */
  chunkSize: number;

  /** Overlap between chunks in characters (default: 200) */
  chunkOverlap: number;

  /** Try to preserve paragraph boundaries (default: true) */
  preserveParagraphs: boolean;
}

// ============================================
// Default Values
// ============================================

/**
 * Default RAG retrieval configuration
 */
export const DEFAULT_RAG_RETRIEVAL_CONFIG: RAGRetrievalConfig = {
  maxChunks: 5,
  minScore: 0.7,
  retrievalThreshold: 0.5,
};

/**
 * Default chunking options
 */
export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  preserveParagraphs: true,
};

/**
 * Embedding provider type
 */
export type EmbeddingProviderType = 'openai' | 'voyage' | 'atlas-ai';

/**
 * Embedding model constants (defaults for backward compatibility)
 * Note: Actual dimensions are determined by the configured provider
 */
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Model-to-dimensions mapping for all supported embedding models
 */
export const EMBEDDING_MODEL_DIMENSIONS: Record<string, number> = {
  // OpenAI models
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,

  // Voyage AI models
  'voyage-3': 1024,
  'voyage-3-lite': 512,
  'voyage-code-3': 1536,
  'voyage-3-large': 1024,

  // Atlas AI (uses Voyage)
  'atlas-ai-default': 1024,
};

/**
 * Get dimensions for an embedding model
 *
 * @param model - Model name
 * @returns Dimensions for the model, or default 1536 if unknown
 */
export function getEmbeddingDimensions(model: string): number {
  return EMBEDDING_MODEL_DIMENSIONS[model] ?? EMBEDDING_DIMENSIONS;
}

/**
 * Maximum document size (5MB)
 */
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

/**
 * Supported MIME types
 */
export const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];
