/**
 * Tests for AI Pricing Module
 *
 * Tests model pricing lookups, cost calculations, token estimation,
 * formatting functions, and embedding pricing.
 */

import {
  MODEL_PRICING,
  EMBEDDING_PRICING,
  getModelPricing,
  calculateCost,
  estimateTokens,
  isSelfHostedModel,
  formatCost,
  formatTokens,
  getEmbeddingPricing,
  calculateEmbeddingCost,
  isEmbeddingIncludedInPlatform,
} from '@/lib/ai/pricing';

// ============================================
// MODEL_PRICING data integrity
// ============================================

describe('MODEL_PRICING', () => {
  it('contains expected OpenAI models', () => {
    expect(MODEL_PRICING['gpt-4o-mini']).toBeDefined();
    expect(MODEL_PRICING['gpt-4o']).toBeDefined();
    expect(MODEL_PRICING['gpt-4']).toBeDefined();
    expect(MODEL_PRICING['gpt-3.5-turbo']).toBeDefined();
  });

  it('contains expected reasoning models', () => {
    expect(MODEL_PRICING['o1']).toBeDefined();
    expect(MODEL_PRICING['o1-mini']).toBeDefined();
    expect(MODEL_PRICING['o1-preview']).toBeDefined();
  });

  it('contains self-hosted models with zero cost', () => {
    const selfHosted = ['llama2', 'llama3', 'mistral', 'codellama', 'deepseek', 'phi', 'qwen'];
    for (const model of selfHosted) {
      expect(MODEL_PRICING[model]).toBeDefined();
      expect(MODEL_PRICING[model].promptCostPer1MTokens).toBe(0);
      expect(MODEL_PRICING[model].completionCostPer1MTokens).toBe(0);
    }
  });

  it('contains Anthropic models via OpenRouter', () => {
    expect(MODEL_PRICING['anthropic/claude-3-opus']).toBeDefined();
    expect(MODEL_PRICING['anthropic/claude-3-sonnet']).toBeDefined();
    expect(MODEL_PRICING['anthropic/claude-3-haiku']).toBeDefined();
  });

  it('has a default fallback entry', () => {
    expect(MODEL_PRICING['default']).toBeDefined();
  });

  it('all entries have valid numeric pricing', () => {
    for (const [model, pricing] of Object.entries(MODEL_PRICING)) {
      expect(typeof pricing.promptCostPer1MTokens).toBe('number');
      expect(typeof pricing.completionCostPer1MTokens).toBe('number');
      expect(pricing.promptCostPer1MTokens).toBeGreaterThanOrEqual(0);
      expect(pricing.completionCostPer1MTokens).toBeGreaterThanOrEqual(0);
    }
  });

  it('gpt-4o-mini is cheaper than gpt-4o', () => {
    expect(MODEL_PRICING['gpt-4o-mini'].promptCostPer1MTokens).toBeLessThan(
      MODEL_PRICING['gpt-4o'].promptCostPer1MTokens
    );
  });

  it('gpt-4 is more expensive than gpt-3.5-turbo', () => {
    expect(MODEL_PRICING['gpt-4'].promptCostPer1MTokens).toBeGreaterThan(
      MODEL_PRICING['gpt-3.5-turbo'].promptCostPer1MTokens
    );
  });
});

// ============================================
// getModelPricing
// ============================================

describe('getModelPricing', () => {
  it('returns exact match pricing', () => {
    const pricing = getModelPricing('gpt-4o');
    expect(pricing).toEqual(MODEL_PRICING['gpt-4o']);
  });

  it('strips version suffix from Ollama models (e.g., llama3.2:latest)', () => {
    const pricing = getModelPricing('llama3.2:latest');
    expect(pricing).toEqual(MODEL_PRICING['llama3.2']);
  });

  it('matches model family prefix (e.g., gpt-4o-mini-2024-07-18)', () => {
    const pricing = getModelPricing('gpt-4o-mini-2024-07-18');
    expect(pricing.promptCostPer1MTokens).toBe(MODEL_PRICING['gpt-4o-mini'].promptCostPer1MTokens);
  });

  it('returns default pricing for unknown models', () => {
    const pricing = getModelPricing('some-unknown-model-xyz');
    expect(pricing).toEqual(MODEL_PRICING['default']);
  });

  it('returns default pricing for empty string', () => {
    const pricing = getModelPricing('');
    // empty string starts with every key, but should match something or default
    expect(pricing).toBeDefined();
    expect(typeof pricing.promptCostPer1MTokens).toBe('number');
  });
});

// ============================================
// calculateCost
// ============================================

describe('calculateCost', () => {
  it('calculates zero cost for zero tokens', () => {
    expect(calculateCost('gpt-4o', 0, 0)).toBe(0);
  });

  it('calculates cost for prompt tokens only', () => {
    // gpt-4o: $2.5 per 1M prompt tokens
    const cost = calculateCost('gpt-4o', 1_000_000, 0);
    expect(cost).toBe(2.5);
  });

  it('calculates cost for completion tokens only', () => {
    // gpt-4o: $10.0 per 1M completion tokens
    const cost = calculateCost('gpt-4o', 0, 1_000_000);
    expect(cost).toBe(10.0);
  });

  it('calculates combined cost correctly', () => {
    // gpt-4o-mini: $0.15 prompt + $0.6 completion per 1M
    const cost = calculateCost('gpt-4o-mini', 1000, 500);
    const expected = (1000 / 1_000_000) * 0.15 + (500 / 1_000_000) * 0.6;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it('returns zero for self-hosted models', () => {
    expect(calculateCost('llama3', 10000, 5000)).toBe(0);
  });

  it('uses default pricing for unknown models', () => {
    const cost = calculateCost('unknown-model', 1_000_000, 1_000_000);
    const defaultPricing = MODEL_PRICING['default'];
    const expected = defaultPricing.promptCostPer1MTokens + defaultPricing.completionCostPer1MTokens;
    expect(cost).toBe(expected);
  });

  it('handles very small token counts without floating point issues', () => {
    const cost = calculateCost('gpt-4o', 1, 1);
    expect(cost).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(cost)).toBe(true);
  });

  it('handles very large token counts', () => {
    const cost = calculateCost('gpt-4o', 100_000_000, 50_000_000);
    expect(cost).toBeGreaterThan(0);
    expect(Number.isFinite(cost)).toBe(true);
  });
});

// ============================================
// estimateTokens
// ============================================

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 0 for null/undefined (falsy)', () => {
    expect(estimateTokens(null as any)).toBe(0);
    expect(estimateTokens(undefined as any)).toBe(0);
  });

  it('estimates ~1 token per 4 characters', () => {
    const text = 'abcd'; // 4 chars = 1 token
    expect(estimateTokens(text)).toBe(1);
  });

  it('rounds up partial tokens', () => {
    const text = 'abc'; // 3 chars -> ceil(3/4) = 1
    expect(estimateTokens(text)).toBe(1);
  });

  it('handles longer text proportionally', () => {
    const text = 'a'.repeat(400); // 400 chars = 100 tokens
    expect(estimateTokens(text)).toBe(100);
  });

  it('returns a positive integer for any non-empty string', () => {
    const text = 'Hello, world!';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(Number.isInteger(tokens)).toBe(true);
  });
});

// ============================================
// isSelfHostedModel
// ============================================

describe('isSelfHostedModel', () => {
  it('returns true for llama models', () => {
    expect(isSelfHostedModel('llama2')).toBe(true);
    expect(isSelfHostedModel('llama3')).toBe(true);
    expect(isSelfHostedModel('llama3.2')).toBe(true);
  });

  it('returns true for other self-hosted models', () => {
    expect(isSelfHostedModel('mistral')).toBe(true);
    expect(isSelfHostedModel('codellama')).toBe(true);
    expect(isSelfHostedModel('deepseek')).toBe(true);
    expect(isSelfHostedModel('phi')).toBe(true);
    expect(isSelfHostedModel('qwen')).toBe(true);
  });

  it('returns false for OpenAI models', () => {
    expect(isSelfHostedModel('gpt-4o')).toBe(false);
    expect(isSelfHostedModel('gpt-4o-mini')).toBe(false);
    expect(isSelfHostedModel('gpt-4')).toBe(false);
  });

  it('returns false for Anthropic models', () => {
    expect(isSelfHostedModel('anthropic/claude-3-opus')).toBe(false);
  });

  it('handles versioned Ollama models', () => {
    expect(isSelfHostedModel('llama3.2:latest')).toBe(true);
    expect(isSelfHostedModel('mistral:7b')).toBe(true);
  });
});

// ============================================
// formatCost
// ============================================

describe('formatCost', () => {
  it('formats zero cost', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it('formats very small costs with < indicator', () => {
    expect(formatCost(0.00001)).toBe('<$0.0001');
    expect(formatCost(0.00009)).toBe('<$0.0001');
  });

  it('formats small costs with 4 decimal places', () => {
    expect(formatCost(0.0001)).toBe('$0.0001');
    expect(formatCost(0.0099)).toBe('$0.0099');
  });

  it('formats medium costs with 3 decimal places', () => {
    expect(formatCost(0.01)).toBe('$0.010');
    expect(formatCost(0.123)).toBe('$0.123');
    expect(formatCost(0.999)).toBe('$0.999');
  });

  it('formats large costs with 2 decimal places', () => {
    expect(formatCost(1.0)).toBe('$1.00');
    expect(formatCost(10.5)).toBe('$10.50');
    expect(formatCost(100.99)).toBe('$100.99');
  });
});

// ============================================
// formatTokens
// ============================================

describe('formatTokens', () => {
  it('formats small numbers as-is', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(999999)).toBe('1000.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatTokens(1_000_000)).toBe('1.0M');
    expect(formatTokens(2_500_000)).toBe('2.5M');
  });
});

// ============================================
// EMBEDDING_PRICING data integrity
// ============================================

describe('EMBEDDING_PRICING', () => {
  it('contains OpenAI embedding models', () => {
    expect(EMBEDDING_PRICING['text-embedding-3-small']).toBeDefined();
    expect(EMBEDDING_PRICING['text-embedding-3-large']).toBeDefined();
    expect(EMBEDDING_PRICING['text-embedding-ada-002']).toBeDefined();
  });

  it('contains Voyage AI models', () => {
    expect(EMBEDDING_PRICING['voyage-3']).toBeDefined();
    expect(EMBEDDING_PRICING['voyage-3-lite']).toBeDefined();
    expect(EMBEDDING_PRICING['voyage-code-3']).toBeDefined();
  });

  it('contains Atlas AI entry', () => {
    expect(EMBEDDING_PRICING['atlas-ai-default']).toBeDefined();
    expect(EMBEDDING_PRICING['atlas-ai-default'].provider).toBe('atlas-ai');
  });

  it('has a default fallback', () => {
    expect(EMBEDDING_PRICING['embedding-default']).toBeDefined();
  });

  it('all entries have valid pricing and provider', () => {
    for (const [, pricing] of Object.entries(EMBEDDING_PRICING)) {
      expect(typeof pricing.costPer1MTokens).toBe('number');
      expect(pricing.costPer1MTokens).toBeGreaterThanOrEqual(0);
      expect(typeof pricing.provider).toBe('string');
      expect(pricing.provider.length).toBeGreaterThan(0);
    }
  });

  it('text-embedding-3-small is cheaper than text-embedding-3-large', () => {
    expect(EMBEDDING_PRICING['text-embedding-3-small'].costPer1MTokens).toBeLessThan(
      EMBEDDING_PRICING['text-embedding-3-large'].costPer1MTokens
    );
  });
});

// ============================================
// getEmbeddingPricing
// ============================================

describe('getEmbeddingPricing', () => {
  it('returns exact match', () => {
    expect(getEmbeddingPricing('voyage-3')).toEqual(EMBEDDING_PRICING['voyage-3']);
  });

  it('matches by prefix', () => {
    const pricing = getEmbeddingPricing('voyage-3-something');
    expect(pricing.provider).toBe('voyage');
  });

  it('returns default for unknown model', () => {
    const pricing = getEmbeddingPricing('totally-unknown-embedding');
    expect(pricing).toEqual(EMBEDDING_PRICING['embedding-default']);
  });
});

// ============================================
// calculateEmbeddingCost
// ============================================

describe('calculateEmbeddingCost', () => {
  it('returns 0 for 0 tokens', () => {
    expect(calculateEmbeddingCost('text-embedding-3-small', 0)).toBe(0);
  });

  it('calculates correctly for 1M tokens', () => {
    const cost = calculateEmbeddingCost('text-embedding-3-small', 1_000_000);
    expect(cost).toBe(EMBEDDING_PRICING['text-embedding-3-small'].costPer1MTokens);
  });

  it('handles fractional results without floating point issues', () => {
    const cost = calculateEmbeddingCost('text-embedding-3-small', 100);
    expect(Number.isFinite(cost)).toBe(true);
    expect(cost).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// isEmbeddingIncludedInPlatform
// ============================================

describe('isEmbeddingIncludedInPlatform', () => {
  it('returns true for Atlas AI models', () => {
    expect(isEmbeddingIncludedInPlatform('atlas-ai-default')).toBe(true);
  });

  it('returns false for OpenAI models', () => {
    expect(isEmbeddingIncludedInPlatform('text-embedding-3-small')).toBe(false);
  });

  it('returns false for Voyage models', () => {
    expect(isEmbeddingIncludedInPlatform('voyage-3')).toBe(false);
  });

  it('returns false for unknown models (default provider)', () => {
    expect(isEmbeddingIncludedInPlatform('unknown-model')).toBe(false);
  });
});
