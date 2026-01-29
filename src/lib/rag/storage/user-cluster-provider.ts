/**
 * User-Cluster Storage Provider
 *
 * Stores RAG documents and embeddings in the user's own MongoDB Atlas cluster
 * Used for Team and Enterprise tiers
 */

import { MongoClient, Collection, Db, ObjectId } from 'mongodb';
import {
  RAGStorageProvider,
  RAGDocumentInput,
  RAGChunkInput,
  ListOptions,
  VectorSearchQuery,
  VectorSearchResult,
  HealthCheckResult,
  RAGUsageStats,
  VectorIndexStatus,
  StorageProviderError,
  VectorIndexError,
} from './provider';
import { RAGDocument, RAGDocumentChunk, RAGDocumentStatus } from '@/types/rag';
import { RAGStorageMode } from '@/types/rag-storage';
import { getOrgDb } from '@/lib/platform/db';

/**
 * User-cluster storage provider implementation
 * Stores data in user's own MongoDB Atlas cluster (M10+ required)
 */
export class UserClusterStorageProvider implements RAGStorageProvider {
  readonly providerId = 'user-cluster';
  readonly mode: RAGStorageMode = 'user-cluster';

  private client: MongoClient | null = null;
  private db: Db | null = null;
  private documentsCollection: Collection<RAGDocument> | null = null;
  private chunksCollection: Collection<RAGDocumentChunk> | null = null;
  private organizationId: string;
  private connectionId: string;

  constructor(organizationId: string, connectionId: string) {
    this.organizationId = organizationId;
    this.connectionId = connectionId;
  }

  // ============================================
  // Lifecycle Methods
  // ============================================

  async initialize(): Promise<void> {
    try {
      // Get user's cluster connection
      // Use the organization's database which already has the connection pooling
      const orgDb = await getOrgDb(this.organizationId);
      this.client = orgDb.client as MongoClient;

      // Use a dedicated database for RAG data in user's cluster
      // Format: netpad_rag
      const dbName = 'netpad_rag';
      this.db = this.client.db(dbName);

      // Get collections
      this.documentsCollection = this.db.collection<RAGDocument>('rag_documents');
      this.chunksCollection = this.db.collection<RAGDocumentChunk>('rag_document_chunks');

      // Ensure indexes exist
      await this.ensureIndexes();
    } catch (error) {
      throw new StorageProviderError(
        'Failed to initialize user-cluster storage provider',
        'INIT_ERROR',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  async disconnect(): Promise<void> {
    // Connection is managed by org client pool, don't disconnect here
    this.db = null;
    this.documentsCollection = null;
    this.chunksCollection = null;
  }

  /**
   * Ensure all required indexes exist
   */
  private async ensureIndexes(): Promise<void> {
    if (!this.documentsCollection || !this.chunksCollection) {
      throw new StorageProviderError('Collections not initialized', 'NOT_INITIALIZED');
    }

    // Document indexes
    await this.documentsCollection.createIndex({ formId: 1 });
    await this.documentsCollection.createIndex({ organizationId: 1, formId: 1 });
    await this.documentsCollection.createIndex({ status: 1 });
    await this.documentsCollection.createIndex({ uploadedAt: -1 });

    // Chunk indexes
    await this.chunksCollection.createIndex({ documentId: 1 });
    await this.chunksCollection.createIndex({ formId: 1 });
    await this.chunksCollection.createIndex({ organizationId: 1, formId: 1 });

    // Note: Vector search index must be created manually via Atlas UI or Admin API
    // See docs for index creation instructions
  }

  // ============================================
  // Document Operations
  // ============================================

  async createDocument(doc: RAGDocumentInput): Promise<RAGDocument> {
    if (!this.documentsCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    const document: RAGDocument = {
      _id: new ObjectId(),
      documentId: new ObjectId().toString(), // Generate unique ID
      formId: doc.formId,
      organizationId: this.organizationId,
      blobUrl: '', // Will be set after file upload
      blobPath: '',
      fileName: doc.filename,
      mimeType: doc.mimeType,
      fileSize: doc.sizeBytes,
      sourceType: 'other', // Default, can be updated
      status: 'pending' as RAGDocumentStatus,
      chunkCount: 0,
      embeddingModel: '', // Will be set during processing
      uploadedBy: '', // Should be passed in metadata
      uploadedAt: new Date(),
      updatedAt: new Date(),
      ...doc.metadata,
    };

    await this.documentsCollection.insertOne(document);
    return document;
  }

  async getDocument(documentId: string): Promise<RAGDocument | null> {
    if (!this.documentsCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    return this.documentsCollection.findOne({ documentId });
  }

  async listDocuments(formId: string, options?: ListOptions): Promise<RAGDocument[]> {
    if (!this.documentsCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    const query: any = {
      organizationId: this.organizationId,
      ...(formId !== '*' && { formId }),
      ...(options?.status && { status: options.status }),
    };

    return this.documentsCollection
      .find(query)
      .sort({ uploadedAt: -1 })
      .limit(options?.limit || 100)
      .skip(options?.offset || 0)
      .toArray();
  }

  async updateDocument(documentId: string, updates: Partial<RAGDocument>): Promise<void> {
    if (!this.documentsCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    await this.documentsCollection.updateOne(
      { documentId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!this.documentsCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    // Delete document record
    await this.documentsCollection.deleteOne({ documentId });

    // Delete associated chunks
    await this.deleteChunks(documentId);
  }

  // ============================================
  // Chunk Operations
  // ============================================

  async createChunks(documentId: string, chunks: RAGChunkInput[]): Promise<RAGDocumentChunk[]> {
    if (!this.chunksCollection || !this.documentsCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    // Get document info for formId
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new StorageProviderError('Document not found', 'NOT_FOUND', { documentId });
    }

    // Create chunk documents
    const chunkDocs = chunks.map((chunk, index) => ({
      _id: new ObjectId(),
      chunkId: new ObjectId().toString(),
      documentId,
      formId: document.formId,
      organizationId: this.organizationId, // Store for filtering but not in type
      text: chunk.text,
      embedding: chunk.embedding,
      embeddingModel: document.embeddingModel || 'unknown',
      embeddingGeneratedAt: new Date(),
      chunkIndex: chunk.chunkIndex ?? index,
      pageNumber: chunk.pageNumber,
      ...chunk.metadata,
      createdAt: new Date(),
    }));

    // Insert chunks
    await this.chunksCollection.insertMany(chunkDocs as any);

    return chunkDocs as unknown as RAGDocumentChunk[];
  }

  async getChunks(documentId: string): Promise<RAGDocumentChunk[]> {
    if (!this.chunksCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    return this.chunksCollection
      .find({ documentId })
      .sort({ chunkIndex: 1 })
      .toArray();
  }

  async deleteChunks(documentId: string): Promise<void> {
    if (!this.chunksCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    await this.chunksCollection.deleteMany({ documentId });
  }

  // ============================================
  // Vector Search
  // ============================================

  async vectorSearch(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.chunksCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    try {
      // Build match filter
      const matchFilter: any = {
        organizationId: query.organizationId,
        formId: query.formId,
      };

      if (query.documentIds && query.documentIds.length > 0) {
        matchFilter.documentId = { $in: query.documentIds };
      }

      // Perform vector search using MongoDB Atlas Vector Search
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index', // Default index name
            path: 'embedding',
            queryVector: query.embedding,
            numCandidates: (query.limit || 5) * 10, // Over-fetch for better results
            limit: query.limit || 5,
            filter: matchFilter,
          },
        },
        {
          $project: {
            chunkId: 1,
            documentId: 1,
            text: 1,
            metadata: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      // Add score filter if specified
      if (query.minScore) {
        pipeline.push({
          $match: {
            score: { $gte: query.minScore },
          },
        } as any);
      }

      const results = await this.chunksCollection.aggregate(pipeline).toArray();

      return results.map((result) => ({
        chunkId: result.chunkId,
        documentId: result.documentId,
        text: result.text,
        score: result.score,
        metadata: result.metadata || {},
      }));
    } catch (error) {
      // Check if it's a vector search index error
      if (
        error instanceof Error &&
        (error.message.includes('$vectorSearch') ||
          error.message.includes('index') ||
          error.message.includes('vector'))
      ) {
        throw new VectorIndexError(
          'Vector search index not found or not ready. Please create the vector search index in Atlas UI.',
          'missing',
          { error: error.message }
        );
      }

      throw new StorageProviderError(
        'Vector search failed',
        'VECTOR_SEARCH_ERROR',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  // ============================================
  // File Storage (Delegate to Vercel Blob)
  // ============================================

  async uploadFile(file: File, documentId: string): Promise<string> {
    // User-cluster mode still uses Vercel Blob for file storage
    // This is handled by the upload endpoint
    throw new StorageProviderError(
      'File upload should be handled by upload endpoint',
      'NOT_IMPLEMENTED'
    );
  }

  async getFileUrl(documentId: string): Promise<string> {
    const document = await this.getDocument(documentId);
    if (!document || !document.blobUrl) {
      throw new StorageProviderError('Document file not found', 'NOT_FOUND', { documentId });
    }
    return document.blobUrl;
  }

  async deleteFile(documentId: string): Promise<void> {
    // File deletion is handled by the delete endpoint (uses Vercel Blob del())
    throw new StorageProviderError(
      'File deletion should be handled by delete endpoint',
      'NOT_IMPLEMENTED'
    );
  }

  // ============================================
  // Health & Status
  // ============================================

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      if (!this.db) {
        throw new Error('Provider not initialized');
      }

      // Test database connection
      await this.db.admin().ping();

      // Check vector index status
      const vectorStatus = await this.getVectorIndexStatus();

      return {
        healthy: vectorStatus.status === 'ready',
        latencyMs: Date.now() - startTime,
        vectorIndexStatus: vectorStatus.status,
        errors: vectorStatus.status !== 'ready' ? [vectorStatus.message || 'Vector index not ready'] : [],
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Health check failed');

      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        vectorIndexStatus: 'error',
        errors,
      };
    }
  }

  async getUsage(): Promise<RAGUsageStats> {
    if (!this.documentsCollection || !this.chunksCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    // Count documents
    const documentCount = await this.documentsCollection.countDocuments({
      organizationId: this.organizationId,
    });

    // Calculate total storage
    const documents = await this.documentsCollection
      .find({ organizationId: this.organizationId })
      .toArray();
    const storageBytes = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);

    // Note: Query counts would need to be tracked separately via usage tracking service
    // For now, return 0 as these are tracked in the platform database

    return {
      documentCount,
      storageBytes,
      queryCountToday: 0, // Tracked separately
      queryCountMonth: 0, // Tracked separately
    };
  }

  // ============================================
  // Index Management
  // ============================================

  async ensureVectorIndex(): Promise<void> {
    const status = await this.getVectorIndexStatus();

    if (status.status === 'ready') {
      return;
    }

    if (status.status === 'building') {
      console.log(`[RAG] Vector index is building for user cluster ${this.organizationId}`);
      return;
    }

    // For 'error' or 'pending' status, log a warning but don't throw
    console.warn(
      `[RAG] Vector index status: ${status.status} for user cluster ${this.organizationId}. ` +
      `Vector search queries may not work until the index is ready. ` +
      `Please create the index named "vector_index" in your Atlas cluster.`
    );
  }

  async getVectorIndexStatus(): Promise<VectorIndexStatus> {
    if (!this.db) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    try {
      // List search indexes using listSearchIndexes command
      const indexes = await this.db
        .collection('rag_document_chunks')
        .listSearchIndexes()
        .toArray();

      // Look for vector index
      const vectorIndex = indexes.find(
        (idx: any) => idx.name === 'vector_index' || idx.type === 'vectorSearch'
      );

      if (!vectorIndex) {
        return {
          status: 'pending',
          name: 'vector_index',
          message: 'Vector search index not found. Please create it in Atlas UI.',
        };
      }

      // Cast to any to access dynamic properties
      const indexData = vectorIndex as any;

      // Check index status
      const indexStatus = indexData.status || indexData.queryable;
      if (indexStatus === 'READY' || indexStatus === true) {
        return {
          status: 'ready',
          name: indexData.name,
          definition: indexData.latestDefinition || indexData.definition,
        };
      }

      if (indexStatus === 'BUILDING' || indexStatus === 'PENDING') {
        return {
          status: 'building',
          name: indexData.name,
          message: 'Vector search index is being built',
        };
      }

      return {
        status: 'error',
        name: indexData.name,
        message: `Unexpected index status: ${indexStatus}`,
      };
    } catch (error) {
      console.error('[RAG] Error checking vector index status:', error);
      return {
        status: 'error',
        name: 'vector_index',
        message: error instanceof Error ? error.message : 'Failed to check index status',
      };
    }
  }
}
