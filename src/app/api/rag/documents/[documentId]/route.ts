/**
 * RAG Document API
 *
 * GET /api/rag/documents/[documentId] - Get document details
 * DELETE /api/rag/documents/[documentId] - Delete a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { hasAIFeature } from '@/lib/platform/billing';
import { getDocumentById, deleteDocument } from '@/lib/rag/storage';

interface RouteParams {
  params: Promise<{
    documentId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

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

    // Get document
    const document = await getDocumentById(documentId, organizationId);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Return document without blob URL (security)
    return NextResponse.json({
      success: true,
      document: {
        documentId: document.documentId,
        formId: document.formId,
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        sourceType: document.sourceType,
        title: document.title,
        description: document.description,
        tags: document.tags,
        status: document.status,
        errorMessage: document.errorMessage,
        chunkCount: document.chunkCount,
        embeddingModel: document.embeddingModel,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.uploadedAt,
        processedAt: document.processedAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    console.error('[RAG] Get document error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator');
    if (!guard.success) {
      return guard.response;
    }

    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

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

    // Delete document (returns blob path for cleanup)
    const { blobPath } = await deleteDocument(documentId, organizationId);

    // Delete blob from Vercel Blob storage
    if (blobPath) {
      try {
        await del(blobPath);
        console.log(`[RAG] Deleted blob: ${blobPath}`);
      } catch (blobError) {
        // Log but don't fail - document is already deleted from DB
        console.error(`[RAG] Failed to delete blob ${blobPath}:`, blobError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('[RAG] Delete document error:', error);

    // Handle not found specifically
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document',
      },
      { status: 500 }
    );
  }
}
