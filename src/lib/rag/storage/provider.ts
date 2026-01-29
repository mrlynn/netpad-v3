/**
 * RAG Storage Provider Interface
 *
 * Abstraction layer for RAG document and embedding storage
 * Supports both platform storage and user-cluster storage
 */

import { RAGDocument, RAGDocumentChunk } from '@/types/rag';
import { RAGStorageMode, RAGHealthStatus, ClusterValidationResult } from '@/types/rag-storage';

// ============================================
// Provider Interface
// ============================================

/**
 * Storage provider interface for RAG operations
 * Implementations: PlatformStorageProvider, UserClusterStorageProvider
 */
export interface RAGStorageProvider {
  /** Provider identifier */
  readonly providerId: string;

  /** Storage mode */
  readonly mode: RAGStorageMode;

  // ============================================
  // Lifecycle Methods
  // ============================================

  /**
   * Initialize the provider (connect to database, verify indexes)
   */
  initialize(): Promise<void>;

  /**
   * Disconnect and cleanup
   */
  disconnect(): Promise<void>;

  // ============================================
  // Document Operations
  // ============================================

  /**
   * Create a new document record
   */
  createDocument(doc: RAGDocumentInput): Promise<RAGDocument>;

  /**
   * Get a document by ID
   */
  getDocument(documentId: string): Promise<RAGDocument | null>;

  /**
   * List documents for a form
   * @param formId - Form ID or '*' for all forms in organization
   * @param options - Optional pagination and filtering
   */
  listDocuments(formId: string, options?: ListOptions): Promise<RAGDocument[]>;

  /**
   * Update document metadata
   */
  updateDocument(documentId: string, updates: Partial<RAGDocument>): Promise<void>;

  /**
   * Delete a document and all its chunks
   */
  deleteDocument(documentId: string): Promise<void>;

  // ============================================
  // Chunk Operations
  // ============================================

  /**
   * Create chunks for a document
   */
  createChunks(documentId: string, chunks: RAGChunkInput[]): Promise<RAGDocumentChunk[]>;

  /**
   * Get all chunks for a document
   */
  getChunks(documentId: string): Promise<RAGDocumentChunk[]>;

  /**
   * Delete all chunks for a document
   */
  deleteChunks(documentId: string): Promise<void>;

  // ============================================
  // Vector Search
  // ============================================

  /**
   * Perform vector search
   */
  vectorSearch(query: VectorSearchQuery): Promise<VectorSearchResult[]>;

  // ============================================
  // File Storage
  // ============================================

  /**
   * Upload a document file
   * @returns URL to access the file
   */
  uploadFile(file: File, documentId: string): Promise<string>;

  /**
   * Get file URL for a document
   */
  getFileUrl(documentId: string): Promise<string>;

  /**
   * Delete a document file
   */
  deleteFile(documentId: string): Promise<void>;

  // ============================================
  // Health & Status
  // ============================================

  /**
   * Check provider health
   */
  checkHealth(): Promise<HealthCheckResult>;

  /**
   * Get usage statistics
   */
  getUsage(): Promise<RAGUsageStats>;

  // ============================================
  // Index Management
  // ============================================

  /**
   * Ensure vector search index exists
   */
  ensureVectorIndex(): Promise<void>;

  /**
   * Get vector index status
   */
  getVectorIndexStatus(): Promise<VectorIndexStatus>;
}

// ============================================
// Input Types
// ============================================

/**
 * Input for creating a new document
 */
export interface RAGDocumentInput {
  /** Form ID */
  formId: string;

  /** Original filename */
  filename: string;

  /** MIME type */
  mimeType: string;

  /** File size in bytes */
  sizeBytes: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a chunk
 */
export interface RAGChunkInput {
  /** Chunk text content */
  text: string;

  /** Vector embedding */
  embedding: number[];

  /** Optional metadata */
  metadata?: Record<string, unknown>;

  /** Page number (if from PDF) */
  pageNumber?: number;

  /** Chunk index within document */
  chunkIndex: number;
}

// ============================================
// Query Types
// ============================================

/**
 * Vector search query
 */
export interface VectorSearchQuery {
  /** Query embedding vector */
  embedding: number[];

  /** Form ID to filter by */
  formId: string;

  /** Organization ID to filter by */
  organizationId: string;

  /** Maximum results to return */
  limit?: number;

  /** Minimum similarity score threshold */
  minScore?: number;

  /** Filter to specific document IDs */
  documentIds?: string[];

  /** Additional filter criteria */
  filters?: Record<string, unknown>;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  /** Chunk ID */
  chunkId: string;

  /** Document ID */
  documentId: string;

  /** Chunk text */
  text: string;

  /** Similarity score */
  score: number;

  /** Chunk metadata */
  metadata: Record<string, unknown>;
}

// ============================================
// Options Types
// ============================================

/**
 * Options for listing documents
 */
export interface ListOptions {
  /** Maximum results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Filter by status */
  status?: 'pending' | 'processing' | 'ready' | 'error';
}

// ============================================
// Status Types
// ============================================

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Overall health status */
  healthy: boolean;

  /** Response latency in ms */
  latencyMs: number;

  /** Vector index status */
  vectorIndexStatus: 'pending' | 'building' | 'ready' | 'error';

  /** Error messages */
  errors: string[];
}

/**
 * Usage statistics
 */
export interface RAGUsageStats {
  /** Total documents */
  documentCount: number;

  /** Total storage in bytes */
  storageBytes: number;

  /** Queries today */
  queryCountToday: number;

  /** Queries this month */
  queryCountMonth: number;
}

/**
 * Vector index status
 */
export interface VectorIndexStatus {
  /** Index status */
  status: 'pending' | 'building' | 'ready' | 'error';

  /** Index name */
  name: string;

  /** Index definition (if available) */
  definition?: unknown;

  /** Status message */
  message?: string;
}

// ============================================
// Error Types
// ============================================

/**
 * Storage provider error
 */
export class StorageProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StorageProviderError';
  }
}

/**
 * Vector index error
 */
export class VectorIndexError extends Error {
  constructor(
    message: string,
    public status: 'missing' | 'building' | 'error',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VectorIndexError';
  }
}
