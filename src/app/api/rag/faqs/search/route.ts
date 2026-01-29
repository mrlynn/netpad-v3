/**
 * RAG FAQ Search API
 *
 * POST /api/rag/faqs/search
 * Hybrid search combining keyword matching and vector similarity
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { hasAIFeature } from '@/lib/platform/usageService';
import { getPlatformDb } from '@/lib/platform/db';
import { createDefaultEmbeddingProvider } from '@/lib/ai/embeddings/factory';
import { createTrackedEmbeddingProvider } from '@/lib/ai/embeddings/tracked';
import {
  RAGFAQ,
  SearchFAQRequest,
  FAQSearchResult,
  DEFAULT_FAQ_SEARCH_CONFIG,
} from '@/types/rag-faq';
import { RAGUsageTrackingService } from '@/lib/rag/usage/tracking';

/**
 * Get the FAQ database for an organization
 */
async function getFAQDatabase(organizationId: string) {
  const platformDb = await getPlatformDb();
  const dbName = `netpad_rag_${organizationId}`;
  return platformDb.client.db(dbName);
}

/**
 * POST /api/rag/faqs/search
 * Hybrid search for FAQs
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    // Parse request body
    const body: SearchFAQRequest = await request.json();
    const {
      query,
      organizationId,
      formId,
      categories,
      status,
      maxResults,
      minScore,
      includeArchived,
    } = body;

    // Validate required fields
    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: 'query is required and cannot be empty' },
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

    // Get configuration values
    const actualMaxResults = maxResults || DEFAULT_FAQ_SEARCH_CONFIG.maxResults;
    const actualMinScore = minScore || DEFAULT_FAQ_SEARCH_CONFIG.minScore;

    // Create tracked embedding provider for analytics
    const baseProvider = createDefaultEmbeddingProvider();
    if (!baseProvider) {
      throw new Error('No embedding provider configured');
    }

    const trackedProvider = createTrackedEmbeddingProvider(baseProvider, {
      organizationId,
      userId: guard.context.userId,
      isGuest: false,
      feature: 'rag_faq_search',
      endpoint: '/api/rag/faqs/search',
    });

    // Generate query embedding for vector search (now tracked!)
    const queryEmbedding = await trackedProvider.generateQueryEmbedding(query);

    // Get FAQ database
    const db = await getFAQDatabase(organizationId);

    // Build base filter for both searches
    const baseFilter: Record<string, unknown> = { organizationId };

    if (formId) {
      baseFilter.$or = [{ formId }, { formId: { $exists: false } }]; // Form-specific or org-wide FAQs
    }

    if (categories && categories.length > 0) {
      baseFilter.category = { $in: categories };
    }

    if (status && status.length > 0) {
      baseFilter.status = { $in: status };
    } else if (!includeArchived) {
      baseFilter.status = { $ne: 'archived' };
    }

    // Perform hybrid search using MongoDB aggregation
    // This combines vector search with keyword matching
    const results = await db
      .collection<RAGFAQ>('rag_faqs')
      .aggregate([
        // Stage 1: Vector search
        {
          $vectorSearch: {
            index: 'rag_faq_vector_index',
            path: 'questionEmbedding',
            queryVector: queryEmbedding,
            numCandidates: actualMaxResults * 3, // Get more candidates for reranking
            limit: actualMaxResults * 2,
            filter: baseFilter,
          },
        },
        // Stage 2: Add vector similarity score
        {
          $addFields: {
            vectorScore: { $meta: 'vectorSearchScore' },
          },
        },
        // Stage 3: Add keyword matching score
        {
          $addFields: {
            keywordScore: {
              $cond: {
                if: {
                  $or: [
                    { $regexMatch: { input: '$question', regex: query, options: 'i' } },
                    { $regexMatch: { input: '$answer', regex: query, options: 'i' } },
                    {
                      $anyElementTrue: {
                        $map: {
                          input: '$keywords',
                          as: 'keyword',
                          in: { $regexMatch: { input: '$$keyword', regex: query, options: 'i' } },
                        },
                      },
                    },
                  ],
                },
                then: 1.0,
                else: 0.0,
              },
            },
          },
        },
        // Stage 4: Calculate combined score (weighted average)
        {
          $addFields: {
            combinedScore: {
              $add: [
                { $multiply: ['$vectorScore', DEFAULT_FAQ_SEARCH_CONFIG.vectorWeight] },
                { $multiply: ['$keywordScore', DEFAULT_FAQ_SEARCH_CONFIG.keywordWeight] },
              ],
            },
          },
        },
        // Stage 5: Filter by minimum score
        {
          $match: {
            combinedScore: { $gte: actualMinScore },
          },
        },
        // Stage 6: Sort by combined score and priority
        {
          $sort: {
            combinedScore: -1,
            priority: -1,
          },
        },
        // Stage 7: Limit results
        {
          $limit: actualMaxResults,
        },
        // Stage 8: Project fields (exclude embeddings)
        {
          $project: {
            questionEmbedding: 0,
            answerEmbedding: 0,
          },
        },
      ])
      .toArray();

    // Format results
    const searchResults: FAQSearchResult[] = results.map((faq: any) => ({
      faq: {
        faqId: faq.faqId,
        organizationId: faq.organizationId,
        formId: faq.formId,
        projectId: faq.projectId,
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords,
        category: faq.category,
        tags: faq.tags,
        questionEmbedding: [], // Excluded
        embeddingModel: faq.embeddingModel,
        status: faq.status,
        priority: faq.priority,
        displayOrder: faq.displayOrder,
        viewCount: faq.viewCount,
        clickCount: faq.clickCount,
        helpfulCount: faq.helpfulCount,
        notHelpfulCount: faq.notHelpfulCount,
        createdBy: faq.createdBy,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
        relatedFaqIds: faq.relatedFaqIds,
      },
      score: faq.combinedScore,
      keywordScore: faq.keywordScore,
      vectorScore: faq.vectorScore,
      matchedField: determineMatchedField(faq, query),
      snippet: generateSnippet(faq, query),
    }));

    const latencyMs = Date.now() - startTime;

    // Track query usage
    const usageTracker = new RAGUsageTrackingService();
    await usageTracker.recordVectorSearchQuery(organizationId);

    return NextResponse.json({
      success: true,
      results: searchResults,
      query,
      totalResults: searchResults.length,
      searchMethod: 'hybrid',
      latencyMs,
    });
  } catch (error) {
    console.error('[RAG] FAQ search error:', error);

    // Handle vector search index errors
    if (
      error instanceof Error &&
      (error.message.includes('index') ||
        error.message.includes('vectorSearch') ||
        error.message.includes('rag_faq_vector_index'))
    ) {
      // Fallback to keyword-only search
      console.warn('[RAG] Vector index not found, falling back to keyword search');
      return performKeywordOnlySearch(request);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search FAQs',
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback to keyword-only search when vector index is not available
 */
async function performKeywordOnlySearch(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: SearchFAQRequest = await request.json();
    const {
      query,
      organizationId,
      formId,
      categories,
      status,
      maxResults,
      includeArchived,
    } = body;

    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    const db = await getFAQDatabase(organizationId);

    const actualMaxResults = maxResults || DEFAULT_FAQ_SEARCH_CONFIG.maxResults;

    // Build filter
    const filter: Record<string, unknown> = {
      organizationId,
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } },
        { keywords: { $elemMatch: { $regex: query, $options: 'i' } } },
      ],
    };

    if (formId) {
      filter.$and = [
        { $or: [{ formId }, { formId: { $exists: false } }] },
        filter.$or as any,
      ];
      delete filter.$or;
    }

    if (categories && categories.length > 0) {
      filter.category = { $in: categories };
    }

    if (status && status.length > 0) {
      filter.status = { $in: status };
    } else if (!includeArchived) {
      filter.status = { $ne: 'archived' };
    }

    const faqs = await db
      .collection<RAGFAQ>('rag_faqs')
      .find(filter)
      .sort({ priority: -1 })
      .limit(actualMaxResults)
      .project({ questionEmbedding: 0, answerEmbedding: 0 })
      .toArray();

    const results: FAQSearchResult[] = faqs.map((faq) => ({
      faq: faq as unknown as RAGFAQ,
      score: 0.8, // Fixed score for keyword-only search
      keywordScore: 0.8,
      vectorScore: 0,
      matchedField: determineMatchedField(faq as unknown as RAGFAQ, query),
      snippet: generateSnippet(faq as unknown as RAGFAQ, query),
    }));

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      results,
      query,
      totalResults: results.length,
      searchMethod: 'keyword',
      latencyMs,
      warning: 'Vector search index not available, using keyword search only',
    });
  } catch (error) {
    console.error('[RAG] Keyword search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search FAQs',
      },
      { status: 500 }
    );
  }
}

/**
 * Determine which field matched the query
 */
function determineMatchedField(faq: any, query: string): 'question' | 'answer' | 'keywords' {
  const lowerQuery = query.toLowerCase();

  if (faq.question.toLowerCase().includes(lowerQuery)) {
    return 'question';
  }

  if (faq.answer.toLowerCase().includes(lowerQuery)) {
    return 'answer';
  }

  if (faq.keywords.some((k: string) => k.toLowerCase().includes(lowerQuery))) {
    return 'keywords';
  }

  return 'question'; // Default
}

/**
 * Generate a snippet highlighting the match
 */
function generateSnippet(faq: any, query: string): string {
  const lowerQuery = query.toLowerCase();
  const text = faq.question + ' ' + faq.answer;
  const lowerText = text.toLowerCase();

  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) {
    // No direct match, return first 150 characters
    return text.substring(0, 150) + (text.length > 150 ? '...' : '');
  }

  // Extract snippet around the match
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 100);

  let snippet = text.substring(start, end);

  if (start > 0) {
    snippet = '...' + snippet;
  }

  if (end < text.length) {
    snippet = snippet + '...';
  }

  return snippet;
}
