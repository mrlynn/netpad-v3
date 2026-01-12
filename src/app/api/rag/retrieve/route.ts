/**
 * RAG Retrieval API
 *
 * POST /api/rag/retrieve
 * Retrieves relevant document chunks for a query using vector search
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { hasAIFeature } from '@/lib/platform/billing';
import {
  retrieveRelevantChunks,
  retrieveWithMetadata,
  formatChunksAsContext,
  buildSourceCitations,
} from '@/lib/rag/retrieval';
import { getReadyDocuments } from '@/lib/rag/storage';
import { DEFAULT_RAG_RETRIEVAL_CONFIG } from '@/types/rag';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    // Parse request body
    const body = await request.json();
    const {
      query,
      formId,
      organizationId,
      maxChunks,
      minScore,
      documentIds,
      includeContext,
      includeCitations,
    } = body;

    // Validate required fields
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'query is required and must be a string' },
        { status: 400 }
      );
    }

    if (!formId) {
      return NextResponse.json(
        { success: false, error: 'formId is required' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Validate organization access
    if (organizationId !== guard.context.orgId) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this organization' },
        { status: 403 }
      );
    }

    // Check RAG feature access (includes subscription tier and cluster tier checks)
    const featureCheck = await hasAIFeature(organizationId, 'rag_conversational_forms');
    
    if (!featureCheck.allowed) {
      // Return detailed error with tier/cluster information
      const errorResponse: Record<string, unknown> = {
        success: false,
        error: featureCheck.reason || 'RAG features are not available',
      };
      
      if (featureCheck.requiredTier) {
        errorResponse.requiredTier = featureCheck.requiredTier;
      }
      
      if (featureCheck.requiredClusterTier) {
        errorResponse.requiredClusterTier = featureCheck.requiredClusterTier;
        errorResponse.currentClusterTier = featureCheck.currentClusterTier;
      }
      
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Validate query length
    if (query.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Query too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    // Check if there are any ready documents
    const readyDocuments = await getReadyDocuments(formId, organizationId, documentIds);
    if (readyDocuments.length === 0) {
      return NextResponse.json({
        success: true,
        chunks: [],
        message: 'No processed documents available for retrieval',
        context: includeContext ? '' : undefined,
        citations: includeCitations ? [] : undefined,
      });
    }

    // Perform retrieval
    const result = await retrieveWithMetadata(query, formId, organizationId, {
      maxChunks: maxChunks ?? DEFAULT_RAG_RETRIEVAL_CONFIG.maxChunks,
      minScore: minScore ?? DEFAULT_RAG_RETRIEVAL_CONFIG.minScore,
      documentIds: documentIds,
    });

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      chunks: result.chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        text: chunk.text,
        score: chunk.score,
        metadata: chunk.metadata,
        document: chunk.document,
      })),
      query: result.query,
      documentsSearched: result.documentsSearched,
      latencyMs: result.latencyMs,
    };

    // Include formatted context if requested
    if (includeContext) {
      response.context = formatChunksAsContext(result.chunks);
    }

    // Include citations if requested
    if (includeCitations) {
      response.citations = buildSourceCitations(result.chunks);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[RAG] Retrieval error:', error);

    // Handle vector search index errors
    if (
      error instanceof Error &&
      (error.message.includes('index') ||
        error.message.includes('vectorSearch') ||
        error.message.includes('Vector search'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Vector search is not available. Ensure MongoDB Atlas Vector Search is configured with an M10+ cluster.',
          details: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Retrieval failed',
      },
      { status: 500 }
    );
  }
}
