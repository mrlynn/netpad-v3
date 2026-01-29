/**
 * RAG FAQ Individual Item API
 *
 * GET /api/rag/faqs/[faqId] - Get single FAQ
 * PATCH /api/rag/faqs/[faqId] - Update FAQ
 * DELETE /api/rag/faqs/[faqId] - Delete FAQ
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { hasAIFeature } from '@/lib/platform/usageService';
import { getPlatformDb } from '@/lib/platform/db';
import { createDefaultEmbeddingProvider } from '@/lib/ai/embeddings/factory';
import { createTrackedEmbeddingProvider } from '@/lib/ai/embeddings/tracked';
import { RAGFAQ, UpdateFAQRequest } from '@/types/rag-faq';

/**
 * Get the FAQ database for an organization
 */
async function getFAQDatabase(organizationId: string) {
  const platformDb = await getPlatformDb();
  const dbName = `netpad_rag_${organizationId}`;
  return platformDb.client.db(dbName);
}

/**
 * GET /api/rag/faqs/[faqId]
 * Get single FAQ by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { faqId: string } }
) {
  try {
    const { faqId } = params;

    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    // Get organization ID from query params
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

    // Get FAQ database
    const db = await getFAQDatabase(organizationId);

    // Get FAQ
    const faq = await db.collection<RAGFAQ>('rag_faqs').findOne({
      faqId,
      organizationId,
    });

    if (!faq) {
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    // Increment view count (fire and forget)
    db.collection<RAGFAQ>('rag_faqs')
      .updateOne(
        { faqId, organizationId },
        {
          $inc: { viewCount: 1 },
          $set: { lastAccessedAt: new Date() },
        }
      )
      .catch((error) => {
        console.error('[RAG] Error updating FAQ view count:', error);
      });

    return NextResponse.json({
      success: true,
      faq: {
        faqId: faq.faqId,
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords,
        category: faq.category,
        tags: faq.tags,
        status: faq.status,
        priority: faq.priority,
        displayOrder: faq.displayOrder,
        viewCount: faq.viewCount,
        clickCount: faq.clickCount,
        helpfulCount: faq.helpfulCount,
        notHelpfulCount: faq.notHelpfulCount,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
        createdBy: faq.createdBy,
        updatedBy: faq.updatedBy,
        relatedFaqIds: faq.relatedFaqIds,
      },
    });
  } catch (error) {
    console.error('[RAG] FAQ get error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get FAQ',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/rag/faqs/[faqId]
 * Update FAQ
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { faqId: string } }
) {
  try {
    const { faqId } = params;

    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator');
    if (!guard.success) {
      return guard.response;
    }

    // Parse request body
    const body: UpdateFAQRequest & { organizationId: string } = await request.json();
    const {
      organizationId,
      question,
      answer,
      keywords,
      category,
      tags,
      status,
      priority,
      displayOrder,
      relatedFaqIds,
    } = body;

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

    // Check RAG feature access
    const featureCheck = await hasAIFeature(organizationId, 'rag_conversational_forms');
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: featureCheck.reason || 'RAG features are not available',
        },
        { status: 403 }
      );
    }

    // Get FAQ database
    const db = await getFAQDatabase(organizationId);

    // Check if FAQ exists
    const existingFaq = await db.collection<RAGFAQ>('rag_faqs').findOne({
      faqId,
      organizationId,
    });

    if (!existingFaq) {
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateFields: Partial<RAGFAQ> = {
      updatedAt: new Date(),
      updatedBy: guard.context.userId,
    };

    // If question changed, regenerate embedding with tracking
    if (question !== undefined && question.trim() !== existingFaq.question) {
      updateFields.question = question.trim();

      // Create tracked embedding provider for analytics
      const baseProvider = createDefaultEmbeddingProvider();
      if (!baseProvider) {
        throw new Error('No embedding provider configured');
      }

      const trackedProvider = createTrackedEmbeddingProvider(baseProvider, {
        organizationId,
        userId: guard.context.userId,
        isGuest: false,
        feature: 'rag_conversational_forms',
        endpoint: `/api/rag/faqs/${faqId}`,
      });

      // Regenerate embedding (now tracked!)
      updateFields.questionEmbedding = await trackedProvider.generateQueryEmbedding(question);
      updateFields.embeddingModel = baseProvider.modelName;
    }

    if (answer !== undefined) {
      updateFields.answer = answer.trim();
    }

    if (keywords !== undefined) {
      updateFields.keywords = keywords;
    }

    if (category !== undefined) {
      updateFields.category = category;
    }

    if (tags !== undefined) {
      updateFields.tags = tags;
    }

    if (status !== undefined) {
      updateFields.status = status;
    }

    if (priority !== undefined) {
      updateFields.priority = priority;
    }

    if (displayOrder !== undefined) {
      updateFields.displayOrder = displayOrder;
    }

    if (relatedFaqIds !== undefined) {
      updateFields.relatedFaqIds = relatedFaqIds;
    }

    // Update FAQ
    await db.collection<RAGFAQ>('rag_faqs').updateOne(
      { faqId, organizationId },
      { $set: updateFields }
    );

    // Get updated FAQ
    const updatedFaq = await db.collection<RAGFAQ>('rag_faqs').findOne({
      faqId,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      faq: {
        faqId: updatedFaq!.faqId,
        question: updatedFaq!.question,
        answer: updatedFaq!.answer,
        keywords: updatedFaq!.keywords,
        category: updatedFaq!.category,
        tags: updatedFaq!.tags,
        status: updatedFaq!.status,
        priority: updatedFaq!.priority,
        displayOrder: updatedFaq!.displayOrder,
        updatedAt: updatedFaq!.updatedAt,
        updatedBy: updatedFaq!.updatedBy,
      },
    });
  } catch (error) {
    console.error('[RAG] FAQ update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update FAQ',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rag/faqs/[faqId]
 * Delete FAQ
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { faqId: string } }
) {
  try {
    const { faqId } = params;

    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator');
    if (!guard.success) {
      return guard.response;
    }

    // Get organization ID from query params
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

    // Check RAG feature access
    const featureCheck = await hasAIFeature(organizationId, 'rag_conversational_forms');
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: featureCheck.reason || 'RAG features are not available',
        },
        { status: 403 }
      );
    }

    // Get FAQ database
    const db = await getFAQDatabase(organizationId);

    // Delete FAQ
    const result = await db.collection<RAGFAQ>('rag_faqs').deleteOne({
      faqId,
      organizationId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error) {
    console.error('[RAG] FAQ delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete FAQ',
      },
      { status: 500 }
    );
  }
}
