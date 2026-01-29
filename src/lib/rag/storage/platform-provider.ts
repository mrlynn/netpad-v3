/**
 * Platform Storage Provider
 *
 * Stores RAG documents and embeddings in NetPad's managed MongoDB Atlas cluster
 * Used for Free and Pro tiers (default)
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
import { getPlatformDb } from '@/lib/platform/db';

/**
 * Platform storage provider implementation
 * Stores data in NetPad's managed cluster with per-organization isolation
 */
export class PlatformStorageProvider implements RAGStorageProvider {
  readonly providerId = 'platform';
  readonly mode: RAGStorageMode = 'platform';

  private client: MongoClient | null = null;
  private db: Db | null = null;
  private documentsCollection: Collection<RAGDocument> | null = null;
  private chunksCollection: Collection<RAGDocumentChunk> | null = null;
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  // ============================================
  // Lifecycle Methods
  // ============================================

  async initialize(): Promise<void> {
    try {
      // Get platform client (shared connection pool)
      const platformDb = await getPlatformDb();
      this.client = platformDb.client as MongoClient;

      // Use organization-specific database for RAG data
      // Format: netpad_rag_{organizationId}
      const dbName = `netpad_rag_${this.organizationId}`;
      this.db = this.client.db(dbName);

      // Get collections
      this.documentsCollection = this.db.collection<RAGDocument>('rag_documents');
      this.chunksCollection = this.db.collection<RAGDocumentChunk>('rag_document_chunks');

      // Ensure indexes exist
      await this.ensureIndexes();
    } catch (error) {
      throw new StorageProviderError(
        'Failed to initialize platform storage provider',
        'INIT_ERROR',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  async disconnect(): Promise<void> {
    // Platform client is managed globally, don't disconnect here
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

    // Get document to get formId
    const doc = await this.getDocument(documentId);
    if (!doc) {
      throw new StorageProviderError('Document not found', 'DOCUMENT_NOT_FOUND', { documentId });
    }

    // Create chunk documents
    const ragChunks: RAGDocumentChunk[] = chunks.map((chunk, index) => ({
      _id: new ObjectId(),
      chunkId: new ObjectId().toString(),
      documentId,
      formId: doc.formId,
      text: chunk.text,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      section: chunk.metadata?.section as string | undefined,
      startChar: chunk.metadata?.startChar as number | undefined,
      endChar: chunk.metadata?.endChar as number | undefined,
      embedding: chunk.embedding,
      embeddingModel: doc.embeddingModel || 'unknown',
      embeddedAt: new Date(),
    }));

    // Insert chunks
    if (ragChunks.length > 0) {
      await this.chunksCollection.insertMany(ragChunks);
    }

    // Update document chunk count
    await this.documentsCollection.updateOne(
      { documentId },
      {
        $set: {
          chunkCount: ragChunks.length,
          status: 'ready' as RAGDocumentStatus,
          processedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return ragChunks;
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

    // Build aggregation pipeline for vector search
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'rag_vector_index',
          path: 'embedding',
          queryVector: query.embedding,
          numCandidates: Math.max(query.limit || 5, 20) * 4,
          limit: query.limit || 5,
          filter: {
            organizationId: query.organizationId,
            formId: query.formId,
            ...(query.documentIds && { documentId: { $in: query.documentIds } }),
            ...query.filters,
          },
        },
      },
      {
        $project: {
          _id: 1,
          chunkId: 1,
          documentId: 1,
          text: 1,
          chunkIndex: 1,
          pageNumber: 1,
          section: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    // Add score filtering if specified
    if (query.minScore) {
      pipeline.push({
        $match: { score: { $gte: query.minScore } },
      });
    }

    try {
      const results = await this.chunksCollection.aggregate(pipeline).toArray();

      return results.map((r: any) => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        text: r.text,
        score: r.score,
        metadata: {
          chunkIndex: r.chunkIndex,
          pageNumber: r.pageNumber,
          section: r.section,
        },
      }));
    } catch (error) {
      // Check if error is due to missing vector index
      if (error instanceof Error && error.message.includes('index')) {
        throw new VectorIndexError(
          'Vector search index not found or not ready',
          'missing',
          { error: error.message }
        );
      }
      throw error;
    }
  }

  // ============================================
  // File Storage
  // ============================================

  async uploadFile(file: File, documentId: string): Promise<string> {
    try {
      // Use Vercel Blob for file storage
      const { put } = await import('@vercel/blob');

      const blob = await put(
        `rag/${this.organizationId}/${documentId}/${file.name}`,
        file,
        { access: 'public' }
      );

      // Update document with blob URL
      await this.updateDocument(documentId, {
        blobUrl: blob.url,
        blobPath: blob.pathname,
      });

      return blob.url;
    } catch (error) {
      throw new StorageProviderError(
        'Failed to upload file',
        'FILE_UPLOAD_ERROR',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  async getFileUrl(documentId: string): Promise<string> {
    const doc = await this.getDocument(documentId);
    if (!doc || !doc.blobUrl) {
      throw new StorageProviderError('Document file not found', 'FILE_NOT_FOUND', { documentId });
    }
    return doc.blobUrl;
  }

  async deleteFile(documentId: string): Promise<void> {
    try {
      const doc = await this.getDocument(documentId);
      if (doc && doc.blobPath) {
        const { del } = await import('@vercel/blob');
        await del(doc.blobPath);
      }
    } catch (error) {
      // Log error but don't throw - file deletion is best-effort
      console.error('[PlatformStorageProvider] Failed to delete file:', error);
    }
  }

  // ============================================
  // Health & Status
  // ============================================

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Ping database
      const start = Date.now();
      await this.db.command({ ping: 1 });
      const latencyMs = Date.now() - start;

      // Check vector index status
      const indexStatus = await this.getVectorIndexStatus();

      return {
        healthy: indexStatus.status === 'ready',
        latencyMs,
        vectorIndexStatus: indexStatus.status,
        errors: indexStatus.status !== 'ready' ? [indexStatus.message || 'Vector index not ready'] : [],
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: -1,
        vectorIndexStatus: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async getUsage(): Promise<RAGUsageStats> {
    if (!this.documentsCollection || !this.chunksCollection) {
      throw new StorageProviderError('Provider not initialized', 'NOT_INITIALIZED');
    }

    // Get document count
    const documentCount = await this.documentsCollection.countDocuments({
      organizationId: this.organizationId,
      status: 'ready',
    });

    // Calculate total storage (approximate)
    const documents = await this.documentsCollection
      .find({ organizationId: this.organizationId })
      .project({ fileSize: 1 })
      .toArray();

    const storageBytes = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);

    // TODO: Track query counts in separate collection
    // For now, return zeros
    return {
      documentCount,
      storageBytes,
      queryCountToday: 0,
      queryCountMonth: 0,
    };
  }

  // ============================================
  // Index Management
  // ============================================

  async ensureVectorIndex(): Promise<void> {
    const status = await this.getVectorIndexStatus();

    // Only throw if we're absolutely sure there's a problem
    // This method is often called in a .catch() handler, so warnings are ok
    if (status.status === 'ready') {
      // Index is ready, all good
      return;
    }

    if (status.status === 'building') {
      // Index is building, this is expected - just log
      console.log(`[RAG] Vector index is building for ${this.organizationId}`);
      return;
    }

    // For 'error' or 'pending' status, log a warning but don't throw
    // The index might exist but our check failed, or it's still being created
    console.warn(
      `[RAG] Vector index status: ${status.status} for ${this.organizationId}. ` +
      `Vector search queries may not work until the index is ready.`
    );
  }

  async getVectorIndexStatus(): Promise<VectorIndexStatus> {
    try {
      if (!this.client || !this.chunksCollection) {
        return {
          status: 'error',
          name: 'rag_vector_index',
          message: 'Provider not initialized',
        };
      }

      // Attempt to list search indexes
      const dbName = this.db!.databaseName;
      const collectionName = this.chunksCollection.collectionName;

      const adminDb = this.client.db('admin');
      const result = await adminDb.command({
        listSearchIndexes: `${dbName}.${collectionName}`,
      });

      // Find the vector index
      const indexes = result.cursor?.firstBatch || [];
      const vectorIndex = indexes.find((idx: any) => idx.name === 'rag_vector_index');

      if (!vectorIndex) {
        return {
          status: 'pending',
          name: 'rag_vector_index',
          message: 'Vector search index not found',
        };
      }

      // Map Atlas status to our status
      const atlasStatus = vectorIndex.status || vectorIndex.queryable;
      let status: 'pending' | 'building' | 'ready' | 'error' = 'pending';

      if (atlasStatus === 'READY' || atlasStatus === true) {
        status = 'ready';
      } else if (atlasStatus === 'BUILDING' || atlasStatus === 'PENDING') {
        status = 'building';
      } else if (atlasStatus === 'FAILED') {
        status = 'error';
      }

      return {
        status,
        name: vectorIndex.name,
        definition: vectorIndex.latestDefinition,
        message: `Index status: ${atlasStatus}`,
      };
    } catch (error) {
      return {
        status: 'error',
        name: 'rag_vector_index',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
