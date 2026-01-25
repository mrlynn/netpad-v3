/**
 * RAG Document Storage
 *
 * CRUD operations for RAG documents and chunks
 * Follows patterns from src/lib/platform/db.ts
 */

import { Collection, ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';
import { getOrgDb } from '@/lib/platform/db';
import {
  RAGDocument,
  RAGDocumentChunk,
  RAGDocumentSourceType,
  RAGDocumentStatus,
  EMBEDDING_MODEL,
} from '@/types/rag';

// ============================================
// Collection Accessors
// ============================================

/**
 * Get RAG documents collection for an organization
 */
export async function getRAGDocumentsCollection(
  orgId: string
): Promise<Collection<RAGDocument>> {
  const db = await getOrgDb(orgId);
  return db.collection<RAGDocument>('rag_documents');
}

/**
 * Get RAG document chunks collection for an organization
 */
export async function getRAGChunksCollection(
  orgId: string
): Promise<Collection<RAGDocumentChunk>> {
  const db = await getOrgDb(orgId);
  return db.collection<RAGDocumentChunk>('rag_document_chunks');
}

// Use global to survive HMR in development
declare global {
  // eslint-disable-next-line no-var
  var __ragIndexesCreated: Set<string> | undefined;
}

if (!global.__ragIndexesCreated) {
  global.__ragIndexesCreated = new Set();
}

const ragIndexesCreated = global.__ragIndexesCreated;

/**
 * Create indexes for RAG collections
 * Called on first connection to org database
 */
export async function createRAGIndexes(orgId: string): Promise<void> {
  // Skip if already created for this org
  if (ragIndexesCreated.has(orgId)) {
    return;
  }

  try {
    const db = await getOrgDb(orgId);

    // RAG documents collection
    const documents = db.collection('rag_documents');
    await documents.createIndex({ documentId: 1 }, { unique: true });
    await documents.createIndex({ formId: 1, organizationId: 1 });
    await documents.createIndex({ formId: 1, status: 1 });
    await documents.createIndex({ status: 1, uploadedAt: -1 });
    await documents.createIndex({ organizationId: 1, projectId: 1 });

    // RAG document chunks collection
    const chunks = db.collection('rag_document_chunks');
    await chunks.createIndex({ chunkId: 1 }, { unique: true });
    await chunks.createIndex({ documentId: 1 });
    await chunks.createIndex({ formId: 1, documentId: 1 });

    // Note: Vector search index must be created in Atlas UI or via API
    // Index name: rag_vector_index
    // See: docs/internal/knowledge-guided-conversational-forms-implementation-plan.md

    ragIndexesCreated.add(orgId);
    console.log(`[RAG] Indexes created for ${orgId}`);
  } catch (error) {
    // Indexes may already exist
    ragIndexesCreated.add(orgId);
    console.log(`[RAG] Index creation completed for ${orgId} (some may already exist)`);
  }
}

// ============================================
// Document CRUD Operations
// ============================================

/**
 * Create document metadata entry
 */
export async function createDocumentMetadata(
  formId: string,
  organizationId: string,
  data: {
    blobUrl: string;
    blobPath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    sourceType: RAGDocumentSourceType;
    title?: string;
    description?: string;
    uploadedBy: string;
    projectId?: string;
  }
): Promise<RAGDocument> {
  const collection = await getRAGDocumentsCollection(organizationId);

  const document: RAGDocument = {
    _id: new ObjectId(),
    documentId: nanoid(),
    formId,
    organizationId,
    projectId: data.projectId,
    blobUrl: data.blobUrl,
    blobPath: data.blobPath,
    fileName: data.fileName,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    sourceType: data.sourceType,
    title: data.title,
    description: data.description,
    status: 'pending',
    chunkCount: 0,
    embeddingModel: EMBEDDING_MODEL,
    uploadedBy: data.uploadedBy,
    uploadedAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(document);
  console.log(`[RAG] Created document metadata: ${document.documentId}`);

  return document;
}

/**
 * Get document by ID
 */
export async function getDocumentById(
  documentId: string,
  organizationId: string
): Promise<RAGDocument | null> {
  const collection = await getRAGDocumentsCollection(organizationId);
  return collection.findOne({ documentId, organizationId });
}

/**
 * Get documents for a form
 */
export async function getFormDocuments(
  formId: string,
  organizationId: string,
  options?: {
    status?: RAGDocumentStatus;
    limit?: number;
  }
): Promise<RAGDocument[]> {
  const collection = await getRAGDocumentsCollection(organizationId);

  const query: Record<string, unknown> = { formId, organizationId };
  if (options?.status) {
    query.status = options.status;
  }

  return collection
    .find(query)
    .sort({ uploadedAt: -1 })
    .limit(options?.limit || 100)
    .toArray();
}

/**
 * Get ready documents for a form (for retrieval)
 */
export async function getReadyDocuments(
  formId: string,
  organizationId: string,
  documentIds?: string[]
): Promise<RAGDocument[]> {
  const collection = await getRAGDocumentsCollection(organizationId);

  const query: Record<string, unknown> = {
    formId,
    organizationId,
    status: 'ready',
  };

  if (documentIds && documentIds.length > 0) {
    query.documentId = { $in: documentIds };
  }

  return collection.find(query).toArray();
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  documentId: string,
  organizationId: string,
  status: RAGDocumentStatus,
  options?: {
    errorMessage?: string;
    chunkCount?: number;
  }
): Promise<void> {
  const collection = await getRAGDocumentsCollection(organizationId);

  const update: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'ready') {
    update.processedAt = new Date();
    if (options?.chunkCount !== undefined) {
      update.chunkCount = options.chunkCount;
    }
  }

  if (status === 'error' && options?.errorMessage) {
    update.errorMessage = options.errorMessage;
  }

  await collection.updateOne(
    { documentId, organizationId },
    { $set: update }
  );

  console.log(`[RAG] Updated document ${documentId} status to ${status}`);
}

/**
 * Update document metadata
 */
export async function updateDocumentMetadata(
  documentId: string,
  organizationId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    sourceType?: RAGDocumentSourceType;
  }
): Promise<void> {
  const collection = await getRAGDocumentsCollection(organizationId);

  await collection.updateOne(
    { documentId, organizationId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Delete document and all its chunks
 * Note: Caller should handle blob deletion separately
 */
export async function deleteDocument(
  documentId: string,
  organizationId: string
): Promise<{ blobPath: string | null }> {
  // Get document to return blob path for cleanup
  const document = await getDocumentById(documentId, organizationId);

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  // Delete chunks first
  const chunksCollection = await getRAGChunksCollection(organizationId);
  const deleteResult = await chunksCollection.deleteMany({ documentId });
  console.log(`[RAG] Deleted ${deleteResult.deletedCount} chunks for document ${documentId}`);

  // Delete document metadata
  const documentsCollection = await getRAGDocumentsCollection(organizationId);
  await documentsCollection.deleteOne({ documentId, organizationId });
  console.log(`[RAG] Deleted document metadata: ${documentId}`);

  return { blobPath: document.blobPath };
}

/**
 * Delete all documents for a form
 * Note: Caller should handle blob deletion separately
 */
export async function deleteFormDocuments(
  formId: string,
  organizationId: string
): Promise<{ blobPaths: string[] }> {
  // Get all documents to return blob paths for cleanup
  const documents = await getFormDocuments(formId, organizationId);
  const blobPaths = documents.map((doc) => doc.blobPath).filter(Boolean);

  // Delete all chunks for these documents
  const chunksCollection = await getRAGChunksCollection(organizationId);
  const documentIds = documents.map((doc) => doc.documentId);

  if (documentIds.length > 0) {
    await chunksCollection.deleteMany({ documentId: { $in: documentIds } });
  }

  // Delete all document metadata
  const documentsCollection = await getRAGDocumentsCollection(organizationId);
  await documentsCollection.deleteMany({ formId, organizationId });

  console.log(`[RAG] Deleted ${documents.length} documents for form ${formId}`);

  return { blobPaths };
}

// ============================================
// Chunk Operations
// ============================================

/**
 * Store chunks with embeddings
 */
export async function storeChunks(
  documentId: string,
  formId: string,
  organizationId: string,
  chunks: Array<{
    text: string;
    embedding: number[];
    metadata: {
      chunkIndex: number;
      pageNumber?: number;
      section?: string;
      startChar?: number;
      endChar?: number;
    };
  }>
): Promise<void> {
  const collection = await getRAGChunksCollection(organizationId);

  const chunkDocs: RAGDocumentChunk[] = chunks.map((chunk) => ({
    _id: new ObjectId(),
    chunkId: nanoid(),
    documentId,
    formId,
    text: chunk.text,
    chunkIndex: chunk.metadata.chunkIndex,
    pageNumber: chunk.metadata.pageNumber,
    section: chunk.metadata.section,
    startChar: chunk.metadata.startChar,
    endChar: chunk.metadata.endChar,
    embedding: chunk.embedding,
    embeddingModel: EMBEDDING_MODEL,
    embeddedAt: new Date(),
  }));

  await collection.insertMany(chunkDocs);
  console.log(`[RAG] Stored ${chunkDocs.length} chunks for document ${documentId}`);
}

/**
 * Get chunks for a document (without embeddings for display)
 */
export async function getDocumentChunks(
  documentId: string,
  organizationId: string,
  options?: {
    includeEmbeddings?: boolean;
    limit?: number;
  }
): Promise<RAGDocumentChunk[]> {
  const collection = await getRAGChunksCollection(organizationId);

  const projection = options?.includeEmbeddings
    ? {}
    : { embedding: 0 };

  return collection
    .find({ documentId }, { projection })
    .sort({ chunkIndex: 1 })
    .limit(options?.limit || 1000)
    .toArray();
}

/**
 * Get chunk count for a document
 */
export async function getChunkCount(
  documentId: string,
  organizationId: string
): Promise<number> {
  const collection = await getRAGChunksCollection(organizationId);
  return collection.countDocuments({ documentId });
}

/**
 * Delete chunks for a document
 */
export async function deleteDocumentChunks(
  documentId: string,
  organizationId: string
): Promise<number> {
  const collection = await getRAGChunksCollection(organizationId);
  const result = await collection.deleteMany({ documentId });
  return result.deletedCount;
}
