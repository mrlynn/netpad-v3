/**
 * RAG Vector Search & Retrieval
 *
 * MongoDB Atlas Vector Search integration for semantic document retrieval
 */

import { getOrgDb } from '@/lib/platform/db';
import { generateQueryEmbedding, getCurrentEmbeddingDimensions } from './embeddings';
import { getReadyDocuments } from './storage';
import { ensureVectorSearchIndex } from './indexManagement';
import {
  RetrievedChunk,
  RAGRetrievalResult,
  RAGDocumentChunk,
  DEFAULT_RAG_RETRIEVAL_CONFIG,
} from '@/types/rag';
import { createDefaultRerankProvider, RerankProvider } from '@/lib/ai/reranking';

// ============================================
// Vector Search Index Configuration
// ============================================

/**
 * Vector search index name (must be created in Atlas UI)
 */
const VECTOR_INDEX_NAME = 'rag_vector_index';

/**
 * Collection name for document chunks
 */
const CHUNKS_COLLECTION = 'rag_document_chunks';

// ============================================
// Reranking Provider Cache
// ============================================

/**
 * Cached rerank provider (lazy loaded)
 */
let rerankProvider: RerankProvider | null | undefined = undefined;

/**
 * Get the reranking provider (cached)
 */
function getRerankProvider(): RerankProvider | null {
  if (rerankProvider === undefined) {
    rerankProvider = createDefaultRerankProvider();
  }
  return rerankProvider;
}

// ============================================
// Retrieval Functions
// ============================================

/**
 * Retrieve relevant chunks for a query using MongoDB Atlas Vector Search
 *
 * @param query - Search query text
 * @param formId - Form ID to search within
 * @param organizationId - Organization ID
 * @param options - Retrieval options
 * @returns Array of retrieved chunks with scores
 */
export async function retrieveRelevantChunks(
  query: string,
  formId: string,
  organizationId: string,
  options: {
    maxChunks?: number;
    minScore?: number;
    documentIds?: string[];
  } = {}
): Promise<RetrievedChunk[]> {
  const maxChunks = options.maxChunks ?? DEFAULT_RAG_RETRIEVAL_CONFIG.maxChunks;
  const minScore = options.minScore ?? DEFAULT_RAG_RETRIEVAL_CONFIG.minScore;

  const startTime = Date.now();

  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query);

  // Get database
  const db = await getOrgDb(organizationId);
  const chunksCollection = db.collection<RAGDocumentChunk>(CHUNKS_COLLECTION);

  // Build filter for vector search
  const filter: Record<string, unknown> = { formId };
  if (options.documentIds && options.documentIds.length > 0) {
    filter.documentId = { $in: options.documentIds };
  }

  // MongoDB Atlas Vector Search aggregation pipeline
  const pipeline = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: maxChunks * 10, // Search more candidates for better recall
        limit: maxChunks * 2, // Get extra results, filter by score later
        filter,
      },
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $match: {
        score: { $gte: minScore },
      },
    },
    {
      $limit: maxChunks,
    },
    {
      // Lookup document metadata
      $lookup: {
        from: 'rag_documents',
        localField: 'documentId',
        foreignField: 'documentId',
        as: 'documentData',
      },
    },
    {
      $unwind: {
        path: '$documentData',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      // Project only needed fields (exclude embedding to reduce payload)
      $project: {
        chunkId: 1,
        documentId: 1,
        text: 1,
        score: 1,
        chunkIndex: 1,
        pageNumber: 1,
        section: 1,
        document: {
          fileName: '$documentData.fileName',
          title: '$documentData.title',
          sourceType: '$documentData.sourceType',
        },
      },
    },
  ];

  try {
    const results = await chunksCollection.aggregate(pipeline).toArray();

    const retrievedChunks: RetrievedChunk[] = results.map((doc) => ({
      chunkId: doc.chunkId,
      documentId: doc.documentId,
      text: doc.text,
      score: doc.score,
      metadata: {
        chunkIndex: doc.chunkIndex,
        pageNumber: doc.pageNumber,
        section: doc.section,
      },
      document: doc.document,
    }));

    const latencyMs = Date.now() - startTime;
    console.log(
      `[RAG] Retrieved ${retrievedChunks.length} chunks for query in ${latencyMs}ms`
    );

    return retrievedChunks;
  } catch (error) {
    // Handle vector search index errors gracefully
    if (error instanceof Error) {
      if (
        error.message.includes('index') ||
        error.message.includes('vectorSearch') ||
        error.message.includes('$vectorSearch')
      ) {
        console.error(`[RAG] Vector search index '${VECTOR_INDEX_NAME}' not found. Attempting to create it...`);

        // Try to create the index automatically
        try {
          const indexResult = await ensureVectorSearchIndex(organizationId);
          if (indexResult.created || indexResult.exists) {
            console.log('[RAG] Vector search index created or already exists. Please retry your query.');
            // Return empty results for now - user should retry
            return [];
          }
        } catch (createError) {
          console.error('[RAG] Failed to auto-create vector search index:', createError);
        }

        throw new Error(
          `Vector search index '${VECTOR_INDEX_NAME}' not found. ` +
            'An index is being created in the background. Please try again in a few moments.'
        );
      }
    }
    throw error;
  }
}

/**
 * Retrieve relevant chunks with full result metadata
 *
 * @param query - Search query text
 * @param formId - Form ID to search within
 * @param organizationId - Organization ID
 * @param options - Retrieval options
 * @returns Retrieval result with chunks and metadata
 */
export async function retrieveWithMetadata(
  query: string,
  formId: string,
  organizationId: string,
  options: {
    maxChunks?: number;
    minScore?: number;
    documentIds?: string[];
  } = {}
): Promise<RAGRetrievalResult> {
  const startTime = Date.now();

  // Get count of documents that will be searched
  const documents = await getReadyDocuments(formId, organizationId, options.documentIds);
  const documentsSearched = documents.length;

  // Retrieve chunks
  const chunks = await retrieveRelevantChunks(query, formId, organizationId, options);

  const latencyMs = Date.now() - startTime;

  return {
    chunks,
    query,
    documentsSearched,
    latencyMs,
  };
}

/**
 * Two-stage retrieval: Vector Search + Reranking
 *
 * Stage 1: Use Atlas Vector Search for fast semantic recall
 * Stage 2: Use Atlas Reranking API for precise relevance scoring
 *
 * This approach improves retrieval quality by 10-30% compared to vector-only search.
 *
 * @param query - Search query text
 * @param formId - Form ID to search within
 * @param organizationId - Organization ID
 * @param options - Retrieval options
 * @returns Array of reranked chunks with updated scores
 */
export async function retrieveWithReranking(
  query: string,
  formId: string,
  organizationId: string,
  options: {
    initialK?: number; // Candidates from vector search (default: 20)
    finalK?: number; // Final results after reranking (default: 5)
    minScore?: number;
    documentIds?: string[];
    skipRerank?: boolean; // Force skip reranking
  } = {}
): Promise<RetrievedChunk[]> {
  const initialK = options.initialK ?? 20;
  const finalK = options.finalK ?? 5;
  const reranker = options.skipRerank ? null : getRerankProvider();

  const startTime = Date.now();

  // Stage 1: Vector search for initial candidates
  // Retrieve more candidates than needed to allow reranker to select best
  const candidates = await retrieveRelevantChunks(query, formId, organizationId, {
    maxChunks: reranker ? initialK : finalK,
    minScore: options.minScore,
    documentIds: options.documentIds,
  });

  // If no reranker or not enough candidates, return vector results as-is
  if (!reranker || candidates.length <= finalK) {
    if (!reranker) {
      console.log('[RAG] Reranking not available, using vector-only results');
    }
    return candidates.slice(0, finalK);
  }

  // Stage 2: Rerank candidates using Atlas Reranking API
  const rerankStartTime = Date.now();
  const documents = candidates.map((c) => c.text);

  try {
    const rerankResults = await reranker.rerank(query, documents, {
      topK: finalK,
      returnDocuments: false,
    });

    // Map rerank results back to chunks with updated scores
    const rerankedChunks: RetrievedChunk[] = rerankResults.map((result) => ({
      ...candidates[result.index],
      score: result.relevanceScore, // Final score from reranker
      vectorScore: candidates[result.index].score, // Preserve original vector score
      rerankScore: result.relevanceScore, // Explicit rerank score
    }));

    const totalLatency = Date.now() - startTime;
    const rerankLatency = Date.now() - rerankStartTime;

    console.log(
      `[RAG] Two-stage retrieval: ${candidates.length} candidates → ${rerankedChunks.length} final ` +
        `(total: ${totalLatency}ms, rerank: ${rerankLatency}ms)`
    );

    return rerankedChunks;
  } catch (error) {
    // Graceful fallback to vector-only results on rerank failure
    console.error('[RAG] Reranking failed, falling back to vector results:', error);
    return candidates.slice(0, finalK);
  }
}

// ============================================
// Context Building
// ============================================

/**
 * Format retrieved chunks as context for LLM prompt
 *
 * @param chunks - Retrieved chunks
 * @returns Formatted context string
 */
export function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return '';
  }

  let context = '## Relevant Documentation\n\n';
  context += 'The following information from attached documents may help answer the question:\n\n';

  chunks.forEach((chunk, index) => {
    const sourceLabel = chunk.document?.title || chunk.document?.fileName || 'Unknown source';
    const scorePercent = (chunk.score * 100).toFixed(0);

    context += `### Reference ${index + 1} (${scorePercent}% match)\n`;
    context += `**Source:** ${sourceLabel}\n`;

    if (chunk.metadata.pageNumber) {
      context += `**Page:** ${chunk.metadata.pageNumber}\n`;
    }
    if (chunk.metadata.section) {
      context += `**Section:** ${chunk.metadata.section}\n`;
    }

    context += `\n${chunk.text}\n\n`;
  });

  context += 'When answering questions, cite these sources using [Source 1], [Source 2], etc.\n';

  return context;
}

/**
 * Build source citations from retrieved chunks
 *
 * @param chunks - Retrieved chunks
 * @returns Array of source citations for UI display
 */
export function buildSourceCitations(
  chunks: RetrievedChunk[]
): Array<{
  index: number;
  documentId: string;
  chunkId: string;
  title: string;
  excerpt: string;
  score: number;
  pageNumber?: number;
}> {
  return chunks.map((chunk, index) => ({
    index: index + 1,
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    title: chunk.document?.title || chunk.document?.fileName || 'Untitled',
    excerpt: truncateText(chunk.text, 200),
    score: chunk.score,
    pageNumber: chunk.metadata.pageNumber,
  }));
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
 * Check if vector search is available
 * Attempts a minimal query to verify index exists
 */
export async function checkVectorSearchAvailable(
  organizationId: string
): Promise<{
  available: boolean;
  error?: string;
}> {
  try {
    const db = await getOrgDb(organizationId);
    const chunksCollection = db.collection(CHUNKS_COLLECTION);

    // Check if collection exists and has any documents
    const count = await chunksCollection.countDocuments({}, { limit: 1 });

    if (count === 0) {
      return {
        available: true, // Index may exist but no documents yet
      };
    }

    // Try a minimal vector search to verify index
    // This will fail if index doesn't exist
    // Use dynamic dimensions based on configured embedding provider
    const dimensions = getCurrentEmbeddingDimensions();
    const testEmbedding = new Array(dimensions).fill(0);
    await chunksCollection
      .aggregate([
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: 'embedding',
            queryVector: testEmbedding,
            numCandidates: 1,
            limit: 1,
          },
        },
      ])
      .toArray();

    return { available: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { available: false, error: errorMessage };
  }
}
