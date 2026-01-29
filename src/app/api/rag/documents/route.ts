/**
 * RAG Documents API
 *
 * GET /api/rag/documents - List documents for a form
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { hasAIFeature } from '@/lib/platform/usageService';
import { getRAGStorageProvider } from '@/lib/rag/storage/factory';
import { RAGDocumentStatus } from '@/types/rag';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId'); // Optional - if not provided, returns all org documents
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status') as RAGDocumentStatus | null;

    // Validate required parameters
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

    // Get storage provider and list documents
    const storageProvider = await getRAGStorageProvider(organizationId);

    // If formId is provided, list documents for that form only
    // If formId is not provided (or is '*'), list ALL documents for the organization
    const formIdToUse = formId || '*';
    console.log('[RAG API] Listing documents for org:', organizationId, 'formId:', formIdToUse);
    const documents = await storageProvider.listDocuments(formIdToUse, {
      status: status || undefined,
    });
    console.log('[RAG API] Found', documents.length, 'documents');

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
