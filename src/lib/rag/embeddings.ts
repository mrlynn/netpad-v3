/**
 * RAG Embeddings Generation
 *
 * OpenAI embeddings API integration for document chunks
 */

import OpenAI from 'openai';
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '@/types/rag';

// ============================================
// OpenAI Client
// ============================================

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

// ============================================
// Embedding Generation
// ============================================

/**
 * Maximum batch size for OpenAI embeddings API
 * OpenAI supports up to 2048 inputs per request, we use conservative batch size
 */
const EMBEDDING_BATCH_SIZE = 100;

/**
 * Generate embeddings for text chunks
 *
 * Batches requests for efficiency when processing multiple chunks
 *
 * @param chunks - Array of text chunks to embed
 * @returns Array of embeddings (each embedding is an array of numbers)
 */
export async function generateEmbeddings(
  chunks: Array<{ text: string }>
): Promise<number[][]> {
  const client = getOpenAIClient();
  const allEmbeddings: number[][] = [];

  // Process in batches
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = batch.map((chunk) => chunk.text);

    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      });

      // Extract embeddings in order
      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      allEmbeddings.push(...batchEmbeddings);
    } catch (error) {
      console.error(`[RAG] Embedding batch ${i / EMBEDDING_BATCH_SIZE + 1} failed:`, error);
      throw error;
    }
  }

  // Validate embedding dimensions
  for (const embedding of allEmbeddings) {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Unexpected embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`
      );
    }
  }

  return allEmbeddings;
}

/**
 * Generate a single embedding for a query
 *
 * @param query - Text to embed
 * @returns Embedding vector
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });

  const embedding = response.data[0].embedding;

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Unexpected embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`
    );
  }

  return embedding;
}

// ============================================
// Cost Estimation
// ============================================

/**
 * Pricing for text-embedding-3-small (as of Jan 2025)
 * $0.020 per 1M tokens
 */
const EMBEDDING_COST_PER_TOKEN = 0.02 / 1_000_000;

/**
 * Estimate average tokens per character
 * OpenAI tokenizer averages ~4 characters per token for English text
 */
const CHARS_PER_TOKEN = 4;

/**
 * Estimate embedding cost for text
 *
 * @param text - Text to estimate cost for
 * @returns Estimated cost in USD
 */
export function estimateEmbeddingCost(text: string): number {
  const estimatedTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
  return estimatedTokens * EMBEDDING_COST_PER_TOKEN;
}

/**
 * Estimate embedding cost for multiple chunks
 *
 * @param chunks - Array of text chunks
 * @returns Estimated cost in USD
 */
export function estimateChunksCost(chunks: Array<{ text: string }>): number {
  const totalText = chunks.map((c) => c.text).join('');
  return estimateEmbeddingCost(totalText);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if OpenAI API is configured and accessible
 */
export async function checkEmbeddingsAvailable(): Promise<{
  available: boolean;
  error?: string;
}> {
  try {
    const client = getOpenAIClient();

    // Test with minimal input
    await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: 'test',
    });

    return { available: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { available: false, error: errorMessage };
  }
}

/**
 * Get embedding model info
 */
export function getEmbeddingModelInfo(): {
  model: string;
  dimensions: number;
  batchSize: number;
} {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    batchSize: EMBEDDING_BATCH_SIZE,
  };
}
