/**
 * RAG Vector Search Index Management
 *
 * Automatically creates and manages MongoDB Atlas Vector Search indexes
 */

import { getOrgDb } from '@/lib/platform/db';
import { getCurrentEmbeddingDimensions } from './embeddings';

/**
 * Vector search index name
 */
const VECTOR_INDEX_NAME = 'rag_vector_index';

/**
 * Collection name for document chunks
 */
const CHUNKS_COLLECTION = 'rag_document_chunks';

/**
 * Check if vector search index exists
 *
 * @param organizationId - Organization ID
 * @returns True if index exists and is ready
 */
export async function checkVectorIndexExists(
  organizationId: string
): Promise<{ exists: boolean; status?: string; error?: string }> {
  try {
    const db = await getOrgDb(organizationId);
    const collection = db.collection(CHUNKS_COLLECTION);

    // List all search indexes
    const indexes = await collection.listSearchIndexes().toArray();

    const vectorIndex = indexes.find((idx: any) => idx.name === VECTOR_INDEX_NAME) as any;

    if (!vectorIndex) {
      return { exists: false };
    }

    return {
      exists: true,
      status: vectorIndex.status as string | undefined,
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create vector search index if it doesn't exist
 *
 * @param organizationId - Organization ID
 * @returns Result of index creation
 */
export async function ensureVectorSearchIndex(
  organizationId: string
): Promise<{
  created: boolean;
  exists: boolean;
  status?: string;
  error?: string;
}> {
  try {
    // Check if index already exists
    const check = await checkVectorIndexExists(organizationId);

    if (check.exists) {
      console.log(
        `[RAG Index] Vector search index already exists for org ${organizationId} (status: ${check.status})`
      );
      return {
        created: false,
        exists: true,
        status: check.status,
      };
    }

    // Get the embedding dimensions from the current provider
    const dimensions = getCurrentEmbeddingDimensions();

    console.log(
      `[RAG Index] Creating vector search index for org ${organizationId} with ${dimensions} dimensions`
    );

    const db = await getOrgDb(organizationId);
    const collection = db.collection(CHUNKS_COLLECTION);

    // Create the search index
    // Note: This uses the MongoDB Search Index management API
    const indexDefinition = {
      name: VECTOR_INDEX_NAME,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: dimensions,
            similarity: 'cosine',
          },
          {
            type: 'filter',
            path: 'formId',
          },
          {
            type: 'filter',
            path: 'documentId',
          },
        ],
      },
    };

    await collection.createSearchIndex(indexDefinition);

    console.log(`[RAG Index] Vector search index created for org ${organizationId}`);
    console.log(
      '[RAG Index] Index is building in the background. It may take a few minutes to become ready.'
    );

    return {
      created: true,
      exists: true,
      status: 'BUILDING',
    };
  } catch (error) {
    console.error('[RAG Index] Error creating vector search index:', error);
    return {
      created: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get vector search index status
 *
 * @param organizationId - Organization ID
 * @returns Index status information
 */
export async function getVectorIndexStatus(
  organizationId: string
): Promise<{
  exists: boolean;
  status?: 'READY' | 'BUILDING' | 'FAILED' | 'PENDING' | string;
  queryable?: boolean;
  error?: string;
}> {
  try {
    const db = await getOrgDb(organizationId);
    const collection = db.collection(CHUNKS_COLLECTION);

    const indexes = await collection.listSearchIndexes().toArray();
    const vectorIndex = indexes.find((idx: any) => idx.name === VECTOR_INDEX_NAME) as any;

    if (!vectorIndex) {
      return { exists: false };
    }

    return {
      exists: true,
      status: vectorIndex.status as string | undefined,
      queryable: vectorIndex.queryable !== undefined ? vectorIndex.queryable : vectorIndex.status === 'READY',
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
