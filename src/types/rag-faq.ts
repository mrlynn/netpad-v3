/**
 * RAG FAQ Type Definitions
 *
 * Types for FAQ knowledge management with hybrid search (keyword + vector)
 */

import { ObjectId } from 'mongodb';

// ============================================
// FAQ Types
// ============================================

/**
 * FAQ category for organization
 */
export type FAQCategory =
  | 'general'
  | 'getting-started'
  | 'technical'
  | 'billing'
  | 'support'
  | 'troubleshooting'
  | 'features'
  | 'integration'
  | 'security'
  | 'compliance'
  | 'other';

/**
 * FAQ status
 */
export type FAQStatus = 'draft' | 'published' | 'archived';

/**
 * FAQ document stored in MongoDB
 */
export interface RAGFAQ {
  /** MongoDB ObjectId */
  _id?: ObjectId;

  /** Unique FAQ identifier (nanoid) */
  faqId: string;

  /** Organization ID */
  organizationId: string;

  /** Associated form ID (optional - FAQs can be org-wide or form-specific) */
  formId?: string;

  /** Project ID (optional) */
  projectId?: string;

  // Content
  /** Question text */
  question: string;

  /** Answer text (supports markdown) */
  answer: string;

  /** Keywords for keyword search */
  keywords: string[];

  /** FAQ category */
  category: FAQCategory;

  /** Tags for filtering */
  tags?: string[];

  // Vector Search
  /** Question embedding (1024 dimensions for Atlas Embedding API) */
  questionEmbedding: number[];

  /** Answer embedding (optional, for answer-based retrieval) */
  answerEmbedding?: number[];

  /** Embedding model used */
  embeddingModel: string;

  // Metadata
  /** FAQ status */
  status: FAQStatus;

  /** Priority (higher = shown first in search results) */
  priority: number;

  /** Display order (for manual sorting) */
  displayOrder?: number;

  // Usage Stats
  /** Number of times this FAQ was shown in search results */
  viewCount: number;

  /** Number of times this FAQ was clicked/selected */
  clickCount: number;

  /** Number of times this FAQ was marked as helpful */
  helpfulCount: number;

  /** Number of times this FAQ was marked as not helpful */
  notHelpfulCount: number;

  /** Last time this FAQ was accessed */
  lastAccessedAt?: Date;

  // Audit
  /** User who created the FAQ */
  createdBy: string;

  /** When FAQ was created */
  createdAt: Date;

  /** User who last updated the FAQ */
  updatedBy?: string;

  /** When FAQ was last updated */
  updatedAt: Date;

  // Related FAQs
  /** Related FAQ IDs (for "See also" links) */
  relatedFaqIds?: string[];
}

/**
 * FAQ search result (combines keyword + vector search)
 */
export interface FAQSearchResult {
  faq: RAGFAQ;

  /** Relevance score (0-1, combines keyword + vector scores) */
  score: number;

  /** Keyword match score (0-1) */
  keywordScore: number;

  /** Vector similarity score (0-1) */
  vectorScore: number;

  /** Which field matched (question, answer, or keywords) */
  matchedField: 'question' | 'answer' | 'keywords';

  /** Highlighted snippet showing the match */
  snippet?: string;
}

/**
 * FAQ creation request
 */
export interface CreateFAQRequest {
  organizationId: string;
  formId?: string;
  projectId?: string;
  question: string;
  answer: string;
  keywords?: string[];
  category?: FAQCategory;
  tags?: string[];
  status?: FAQStatus;
  priority?: number;
  relatedFaqIds?: string[];
}

/**
 * FAQ update request
 */
export interface UpdateFAQRequest {
  question?: string;
  answer?: string;
  keywords?: string[];
  category?: FAQCategory;
  tags?: string[];
  status?: FAQStatus;
  priority?: number;
  displayOrder?: number;
  relatedFaqIds?: string[];
}

/**
 * FAQ search request
 */
export interface SearchFAQRequest {
  query: string;
  organizationId: string;
  formId?: string;
  categories?: FAQCategory[];
  status?: FAQStatus[];
  maxResults?: number;
  minScore?: number;
  includeArchived?: boolean;
}

/**
 * FAQ search response
 */
export interface SearchFAQResponse {
  results: FAQSearchResult[];
  query: string;
  totalResults: number;
  searchMethod: 'hybrid' | 'keyword' | 'vector';
  latencyMs: number;
}

/**
 * FAQ analytics summary
 */
export interface FAQAnalytics {
  faqId: string;
  question: string;
  metrics: {
    viewCount: number;
    clickCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    clickThroughRate: number; // clickCount / viewCount
    helpfulRate: number; // helpfulCount / (helpfulCount + notHelpfulCount)
  };
  lastAccessedAt?: Date;
  createdAt: Date;
}

// ============================================
// FAQ Constants
// ============================================

/**
 * Default FAQ search configuration
 */
export const DEFAULT_FAQ_SEARCH_CONFIG = {
  maxResults: 10,
  minScore: 0.5,
  keywordWeight: 0.3, // 30% keyword matching
  vectorWeight: 0.7, // 70% semantic matching
};

/**
 * FAQ category display names
 */
export const FAQ_CATEGORY_LABELS: Record<FAQCategory, string> = {
  general: 'General',
  'getting-started': 'Getting Started',
  technical: 'Technical',
  billing: 'Billing & Pricing',
  support: 'Support',
  troubleshooting: 'Troubleshooting',
  features: 'Features',
  integration: 'Integration',
  security: 'Security',
  compliance: 'Compliance',
  other: 'Other',
};

/**
 * Default priority for new FAQs
 */
export const DEFAULT_FAQ_PRIORITY = 50;
