/**
 * RAG Diagnostics API
 *
 * GET /api/rag/admin/diagnostics?organizationId=xxx
 *
 * Provides comprehensive diagnostics about RAG setup including:
 * - MongoDB cluster, database, and collection details
 * - Vector search index status
 * - Document and chunk counts
 * - Sample data
 * - Direct links to Atlas UI
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgDb } from '@/lib/platform/db';
import { getVectorIndexStatus } from '@/lib/rag/indexManagement';
import { getCurrentEmbeddingDimensions } from '@/lib/rag/embeddings';

const CHUNKS_COLLECTION = 'rag_document_chunks';
const DOCUMENTS_COLLECTION = 'rag_documents';
const VECTOR_INDEX_NAME = 'rag_vector_index';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[RAG Diagnostics] Running diagnostics for org ${organizationId}`);

    const db = await getOrgDb(organizationId);
    const connectionString = process.env.MONGODB_URI || '';

    // Extract cluster info from connection string
    const clusterMatch = connectionString.match(/@([^/]+)/);
    const clusterHost = clusterMatch ? clusterMatch[1] : 'unknown';
    const clusterName = clusterHost.split('.')[0];

    // Get database name
    const databaseName = db.databaseName;

    // Get collections
    const collections = await db.listCollections().toArray();
    const chunksCollection = db.collection(CHUNKS_COLLECTION);
    const documentsCollection = db.collection(DOCUMENTS_COLLECTION);

    // Check if collections exist
    const chunksCollectionExists = collections.some(c => c.name === CHUNKS_COLLECTION);
    const documentsCollectionExists = collections.some(c => c.name === DOCUMENTS_COLLECTION);

    // Get counts
    const [chunksCount, documentsCount] = await Promise.all([
      chunksCollectionExists ? chunksCollection.countDocuments() : 0,
      documentsCollectionExists ? documentsCollection.countDocuments() : 0,
    ]);

    // Get sample chunk to check structure
    let sampleChunk = null;
    if (chunksCollectionExists && chunksCount > 0) {
      sampleChunk = await chunksCollection.findOne();
    }

    // Get sample document
    let sampleDocument = null;
    if (documentsCollectionExists && documentsCount > 0) {
      sampleDocument = await documentsCollection.findOne();
    }

    // Check vector search index
    const indexStatus = await getVectorIndexStatus(organizationId);

    // List all indexes on chunks collection
    let allIndexes: any[] = [];
    if (chunksCollectionExists) {
      try {
        allIndexes = await chunksCollection.listSearchIndexes().toArray();
      } catch (error) {
        console.error('[RAG Diagnostics] Error listing search indexes:', error);
      }
    }

    // Get current embedding dimensions
    const expectedDimensions = getCurrentEmbeddingDimensions();

    // Build Atlas UI URLs
    // Note: These are approximate and may need adjustment based on your org structure
    const atlasProjectId = process.env.ATLAS_PROJECT_ID || 'YOUR_PROJECT_ID';
    const atlasOrgId = process.env.ATLAS_ORG_ID || 'YOUR_ORG_ID';

    const atlasUrls = {
      cluster: `https://cloud.mongodb.com/v2/${atlasProjectId}#/clusters`,
      database: `https://cloud.mongodb.com/v2/${atlasProjectId}#/clusters/detail/${clusterName}/collections`,
      searchIndexes: `https://cloud.mongodb.com/v2/${atlasProjectId}#/clusters/detail/${clusterName}/search`,
      dataExplorer: `https://cloud.mongodb.com/v2/${atlasProjectId}#/clusters/detail/${clusterName}/collections/${databaseName}/${CHUNKS_COLLECTION}`,
    };

    // Build diagnostic report
    const diagnostics = {
      timestamp: new Date().toISOString(),
      organizationId,

      // Connection Info
      connection: {
        clusterHost,
        clusterName,
        databaseName,
        connectionStringPrefix: connectionString.substring(0, 30) + '...',
      },

      // Atlas UI Links
      atlasLinks: {
        cluster: atlasUrls.cluster,
        collections: atlasUrls.database,
        searchIndexes: atlasUrls.searchIndexes,
        dataExplorer: atlasUrls.dataExplorer,
        note: 'These URLs may need adjustment based on your Atlas organization structure',
      },

      // Collections
      collections: {
        documents: {
          name: DOCUMENTS_COLLECTION,
          exists: documentsCollectionExists,
          count: documentsCount,
          sampleDocument: sampleDocument ? {
            documentId: sampleDocument.documentId,
            fileName: sampleDocument.fileName,
            status: sampleDocument.status,
            formId: sampleDocument.formId,
            chunkCount: sampleDocument.chunkCount,
            createdAt: sampleDocument.createdAt,
          } : null,
        },
        chunks: {
          name: CHUNKS_COLLECTION,
          exists: chunksCollectionExists,
          count: chunksCount,
          sampleChunk: sampleChunk ? {
            chunkId: sampleChunk.chunkId,
            documentId: sampleChunk.documentId,
            formId: sampleChunk.formId,
            textLength: sampleChunk.text?.length || 0,
            textPreview: sampleChunk.text?.substring(0, 100) + '...',
            hasEmbedding: !!sampleChunk.embedding,
            embeddingDimensions: sampleChunk.embedding?.length || 0,
            chunkIndex: sampleChunk.chunkIndex,
          } : null,
        },
      },

      // Vector Search Index
      vectorSearchIndex: {
        name: VECTOR_INDEX_NAME,
        exists: indexStatus.exists,
        status: indexStatus.status,
        queryable: indexStatus.queryable,
        expectedDimensions,
        actualDimensions: sampleChunk?.embedding?.length,
        dimensionsMatch: sampleChunk?.embedding?.length === expectedDimensions,
        allSearchIndexes: allIndexes.map(idx => ({
          name: idx.name,
          type: idx.type,
          status: idx.status,
          queryable: idx.queryable,
        })),
      },

      // Health Checks
      healthChecks: {
        chunksCollectionExists: chunksCollectionExists ? '✅' : '❌',
        documentsCollectionExists: documentsCollectionExists ? '✅' : '❌',
        hasDocuments: documentsCount > 0 ? '✅' : '❌',
        hasChunks: chunksCount > 0 ? '✅' : '❌',
        chunksHaveEmbeddings: sampleChunk?.embedding ? '✅' : '❌',
        vectorIndexExists: indexStatus.exists ? '✅' : '❌',
        vectorIndexReady: indexStatus.status === 'READY' ? '✅' : '⏳',
        dimensionsCorrect: sampleChunk?.embedding?.length === expectedDimensions ? '✅' : '⚠️',
      },

      // Issues & Recommendations
      issues: [] as string[],
      recommendations: [] as string[],
    };

    // Analyze issues
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!chunksCollectionExists) {
      issues.push('Chunks collection does not exist');
      recommendations.push('Upload a document to create the collection');
    }

    if (!documentsCollectionExists) {
      issues.push('Documents collection does not exist');
      recommendations.push('Upload a document to create the collection');
    }

    if (chunksCollectionExists && chunksCount === 0) {
      issues.push('No chunks found in collection');
      recommendations.push('Documents may not have been processed. Check upload logs.');
    }

    if (sampleChunk && !sampleChunk.embedding) {
      issues.push('Chunks exist but have no embeddings');
      recommendations.push('Embeddings were not generated. Check embedding provider configuration.');
    }

    if (sampleChunk?.embedding && sampleChunk.embedding.length !== expectedDimensions) {
      issues.push(`Embedding dimensions mismatch: expected ${expectedDimensions}, got ${sampleChunk.embedding.length}`);
      recommendations.push('Recreate the vector search index with the correct dimensions');
    }

    if (!indexStatus.exists) {
      issues.push('Vector search index does not exist');
      recommendations.push('Run POST /api/rag/admin/ensure-index to create it');
    } else if (indexStatus.status !== 'READY') {
      issues.push(`Vector search index is ${indexStatus.status}, not READY`);
      recommendations.push('Wait for the index to finish building (usually 1-2 minutes)');
    }

    diagnostics.issues = issues;
    diagnostics.recommendations = recommendations;

    // Overall status
    const allHealthy =
      chunksCollectionExists &&
      documentsCollectionExists &&
      chunksCount > 0 &&
      documentsCount > 0 &&
      sampleChunk?.embedding &&
      indexStatus.exists &&
      indexStatus.status === 'READY' &&
      sampleChunk.embedding.length === expectedDimensions;

    return NextResponse.json({
      success: true,
      status: allHealthy ? 'healthy' : 'needs-attention',
      diagnostics,
      summary: {
        cluster: clusterName,
        database: databaseName,
        documents: documentsCount,
        chunks: chunksCount,
        indexStatus: indexStatus.status || 'NOT_FOUND',
        issues: issues.length,
        recommendations: recommendations.length,
      },
    });
  } catch (error) {
    console.error('[RAG Diagnostics] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
