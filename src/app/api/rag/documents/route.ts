/**
 * RAG Documents API
 *
 * GET /api/rag/documents - List documents for a form
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { hasAIFeature } from '@/lib/platform/billing';
import { getFormDocuments } from '@/lib/rag/storage';
import { RAGDocumentStatus } from '@/types/rag';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status') as RAGDocumentStatus | null;

    // Validate required parameters
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

    // Get documents
    const documents = await getFormDocuments(formId, organizationId, {
      status: status || undefined,
    });

    // Return documents without blob URLs (security)
    const safeDocuments = documents.map((doc) => ({
      documentId: doc.documentId,
      formId: doc.formId,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      sourceType: doc.sourceType,
      title: doc.title,
      description: doc.description,
      tags: doc.tags,
      status: doc.status,
      errorMessage: doc.errorMessage,
      chunkCount: doc.chunkCount,
      embeddingModel: doc.embeddingModel,
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt,
      processedAt: doc.processedAt,
      updatedAt: doc.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      documents: safeDocuments,
    });
  } catch (error) {
    console.error('[RAG] List documents error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list documents',
      },
      { status: 500 }
    );
  }
}
