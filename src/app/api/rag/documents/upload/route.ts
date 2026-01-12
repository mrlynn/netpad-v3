/**
 * RAG Document Upload API
 *
 * POST /api/rag/documents/upload
 * Uploads a document and queues it for processing (chunking + embedding)
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { hasAIFeature } from '@/lib/platform/billing';
import {
  createDocumentMetadata,
  updateDocumentStatus,
  storeChunks,
} from '@/lib/rag/storage';
import {
  extractTextFromDocument,
  chunkText,
  isSupportedMimeType,
} from '@/lib/rag/chunking';
import { generateEmbeddings } from '@/lib/rag/embeddings';
import {
  MAX_DOCUMENT_SIZE,
  SUPPORTED_MIME_TYPES,
  RAGDocumentSourceType,
} from '@/types/rag';

// Valid source types
const VALID_SOURCE_TYPES: RAGDocumentSourceType[] = [
  'policy',
  'contract',
  'guide',
  'manual',
  'faq',
  'other',
];

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    const guard = await validateAIRequest('ai_form_generator');
    if (!guard.success) {
      return guard.response;
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const formId = formData.get('formId') as string | null;
    const organizationId = formData.get('organizationId') as string | null;
    const sourceType = formData.get('sourceType') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const projectId = formData.get('projectId') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
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

    // Validate file size
    if (file.size > MAX_DOCUMENT_SIZE) {
      const maxMB = MAX_DOCUMENT_SIZE / 1024 / 1024;
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${maxMB}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!isSupportedMimeType(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate source type
    const validSourceType = VALID_SOURCE_TYPES.includes(sourceType as RAGDocumentSourceType)
      ? (sourceType as RAGDocumentSourceType)
      : 'other';

    // Upload to Vercel Blob with private access for security
    // Private blobs require signed URLs for access (generated in GET endpoint)
    const blob = await put(
      `rag-documents/${organizationId}/${formId}/${Date.now()}-${file.name}`,
      file,
      {
        access: 'private',
        contentType: file.type,
      }
    );

    // Create document metadata
    const document = await createDocumentMetadata(formId, organizationId, {
      blobUrl: blob.url,
      blobPath: blob.pathname,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      sourceType: validSourceType,
      title: title || undefined,
      description: description || undefined,
      uploadedBy: guard.context.userId,
      projectId: projectId || undefined,
    });

    // Update status to processing
    await updateDocumentStatus(document.documentId, organizationId, 'processing');

    // Process document asynchronously
    // In production, this should be a background job
    processDocumentAsync(
      document.documentId,
      formId,
      organizationId,
      blob.url,
      file.type
    ).catch((error) => {
      console.error(`[RAG] Error processing document ${document.documentId}:`, error);
      updateDocumentStatus(
        document.documentId,
        organizationId,
        'error',
        { errorMessage: error instanceof Error ? error.message : 'Processing failed' }
      );
    });

    return NextResponse.json({
      success: true,
      document: {
        documentId: document.documentId,
        fileName: document.fileName,
        status: 'processing',
        mimeType: document.mimeType,
        fileSize: document.fileSize,
      },
    });
  } catch (error) {
    console.error('[RAG] Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Process document asynchronously
 * Extracts text, chunks it, generates embeddings, and stores chunks
 */
async function processDocumentAsync(
  documentId: string,
  formId: string,
  organizationId: string,
  blobUrl: string,
  mimeType: string,
  maxRetries: number = 3
): Promise<void> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`[RAG] Processing document ${documentId} (attempt ${attempt + 1})`);

      // Extract text with timeout
      const text = await Promise.race([
        extractTextFromDocument(blobUrl, mimeType),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Text extraction timeout (30s)')), 30000)
        ),
      ]);

      if (!text || text.trim().length === 0) {
        throw new Error('No text extracted from document');
      }

      console.log(`[RAG] Extracted ${text.length} characters from document ${documentId}`);

      // Chunk text
      const chunks = chunkText(text, {
        chunkSize: 1000,
        chunkOverlap: 200,
        preserveParagraphs: true,
      });

      if (chunks.length === 0) {
        throw new Error('No chunks created from document');
      }

      console.log(`[RAG] Created ${chunks.length} chunks for document ${documentId}`);

      // Generate embeddings with timeout
      const embeddings = await Promise.race([
        generateEmbeddings(chunks),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Embedding generation timeout (60s)')), 60000)
        ),
      ]);

      if (embeddings.length !== chunks.length) {
        throw new Error(
          `Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`
        );
      }

      // Store chunks with embeddings
      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        text: chunk.text,
        embedding: embeddings[index],
        metadata: chunk.metadata,
      }));

      await storeChunks(documentId, formId, organizationId, chunksWithEmbeddings);

      // Update document status to ready
      await updateDocumentStatus(documentId, organizationId, 'ready', {
        chunkCount: chunks.length,
      });

      console.log(`[RAG] Document ${documentId} processed successfully`);
      return;
    } catch (error) {
      attempt++;
      console.error(
        `[RAG] Processing attempt ${attempt} failed for ${documentId}:`,
        error
      );

      if (attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
      );
    }
  }
}
