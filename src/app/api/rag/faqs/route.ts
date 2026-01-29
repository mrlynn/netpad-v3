/**
 * RAG FAQ API
 *
 * POST /api/rag/faqs - Create a new FAQ
 * GET /api/rag/faqs - List FAQs with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { hasAIFeature } from '@/lib/platform/usageService';
import { getPlatformDb } from '@/lib/platform/db';
import { createDefaultEmbeddingProvider } from '@/lib/ai/embeddings/factory';
import { createTrackedEmbeddingProvider } from '@/lib/ai/embeddings/tracked';
import {
  RAGFAQ,
  CreateFAQRequest,
  FAQCategory,
  FAQStatus,
  DEFAULT_FAQ_PRIORITY,
} from '@/types/rag-faq';

/**
 * Get the FAQ database for an organization
 */
async function getFAQDatabase(organizationId: string) {
  const platformDb = await getPlatformDb();
  const dbName = `netpad_rag_${organizationId}`;
  return platformDb.client.db(dbName);
}

/**
 * POST /api/rag/faqs
 * Create a new FAQ
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator');
    if (!guard.success) {
      return guard.response;
    }

    // Parse request body
    const body: CreateFAQRequest = await request.json();
    const {
      organizationId,
      formId,
      projectId,
      question,
      answer,
      keywords,
      category,
      tags,
      status,
      priority,
      relatedFaqIds,
    } = body;

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!question || !question.trim()) {
      return NextResponse.json(
        { success: false, error: 'question is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!answer || !answer.trim()) {
      return NextResponse.json(
        { success: false, error: 'answer is required and cannot be empty' },
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
      endpoint: '/api/rag/faqs',
    });

    // Generate embedding for the question (now tracked!)
    const questionEmbedding = await trackedProvider.generateQueryEmbedding(question);

    // Get FAQ database
    const db = await getFAQDatabase(organizationId);

    // Create FAQ document
    const faq: RAGFAQ = {
      faqId: nanoid(),
      organizationId,
      formId,
      projectId,
      question: question.trim(),
      answer: answer.trim(),
      keywords: keywords || [],
      category: category || 'general',
      tags: tags || [],
      questionEmbedding,
      embeddingModel: baseProvider.modelName,
      status: status || 'published',
      priority: priority !== undefined ? priority : DEFAULT_FAQ_PRIORITY,
      viewCount: 0,
      clickCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      createdBy: guard.context.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      relatedFaqIds: relatedFaqIds || [],
    };

    // Insert into database
    await db.collection<RAGFAQ>('rag_faqs').insertOne(faq);

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
        createdAt: faq.createdAt,
      },
    });
  } catch (error) {
    console.error('[RAG] FAQ creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create FAQ',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rag/faqs
 * List FAQs with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const formId = searchParams.get('formId');
    const category = searchParams.get('category') as FAQCategory | null;
    const status = searchParams.get('status') as FAQStatus | null;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

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

    // Build query filter
    const filter: Record<string, unknown> = { organizationId };

    if (formId) {
      filter.formId = formId;
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    } else {
      // By default, exclude archived FAQs
      filter.status = { $ne: 'archived' };
    }

    // Get FAQ database
    const db = await getFAQDatabase(organizationId);

    // Get total count
    const total = await db.collection<RAGFAQ>('rag_faqs').countDocuments(filter);

    // Get FAQs
    const faqs = await db
      .collection<RAGFAQ>('rag_faqs')
      .find(filter)
      .sort({ priority: -1, displayOrder: 1, createdAt: -1 }) // Higher priority first, then display order, then newest
      .skip(offset)
      .limit(limit)
      .project({
        questionEmbedding: 0, // Exclude embeddings from list response
        answerEmbedding: 0,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      faqs: faqs.map((faq) => ({
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
        relatedFaqIds: faq.relatedFaqIds,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + faqs.length < total,
      },
    });
  } catch (error) {
    console.error('[RAG] FAQ list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list FAQs',
      },
      { status: 500 }
    );
  }
}
