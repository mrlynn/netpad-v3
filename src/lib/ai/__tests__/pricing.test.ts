/**
 * Tests for LLM and Embedding Model Pricing utilities
 */
import {
  getModelPricing,
  calculateCost,
  estimateTokens,
  isSelfHostedModel,
  formatCost,
  formatTokens,
  getEmbeddingPricing,
  calculateEmbeddingCost,
  isEmbeddingIncludedInPlatform,
  MODEL_PRICING,
  EMBEDDING_PRICING,
} from '../pricing';

describe('Model Pricing', () => {
  describe('getModelPricing', () => {
    it('returns exact match for known models', () => {
      const pricing = getModelPricing('gpt-4o');
      expect(pricing.promptCostPer1MTokens).toBe(2.5);
      expect(pricing.completionCostPer1MTokens).toBe(10.0);
    });

    it('returns pricing for gpt-4o-mini', () => {
      const pricing = getModelPricing('gpt-4o-mini');
      expect(pricing.promptCostPer1MTokens).toBe(0.15);
      expect(pricing.completionCostPer1MTokens).toBe(0.6);
    });

    it('strips version suffix via base model match (colon)', () => {
      const pricing = getModelPricing('llama3.2:latest');
      expect(pricing.promptCostPer1MTokens).toBe(0);
      expect(pricing.completionCostPer1MTokens).toBe(0);
    });

    it('matches by prefix for dated model names', () => {
      const pricing = getModelPricing('gpt-4o-mini-2024-07-18');
      expect(pricing.promptCostPer1MTokens).toBe(0.15);
    });

    it('returns default pricing for unknown models', () => {
      const pricing = getModelPricing('some-unknown-model');
      expect(pricing).toEqual(MODEL_PRICING['default']);
    });

    it('returns Claude pricing', () => {
      const pricing = getModelPricing('anthropic/claude-3-opus');
      expect(pricing.promptCostPer1MTokens).toBe(15.0);
      expect(pricing.completionCostPer1MTokens).toBe(75.0);
    });

    it('returns o1 reasoning model pricing', () => {
      const pricing = getModelPricing('o1');
      expect(pricing.promptCostPer1MTokens).toBe(15.0);
      expect(pricing.completionCostPer1MTokens).toBe(60.0);
    });
  });

  describe('calculateCost', () => {
    it('calculates cost correctly for gpt-4o', () => {
      // 1000 prompt tokens + 500 completion tokens
      const cost = calculateCost('gpt-4o', 1000, 500);
      // (1000/1M) * 2.5 + (500/1M) * 10.0 = 0.0025 + 0.005 = 0.0075
      expect(cost).toBe(0.0075);
    });

    it('returns zero for self-hosted models', () => {
      const cost = calculateCost('llama3', 100000, 50000);
      expect(cost).toBe(0);
    });

    it('handles zero tokens', () => {
      expect(calculateCost('gpt-4o', 0, 0)).toBe(0);
    });

    it('handles large token counts', () => {
      const cost = calculateCost('gpt-4o', 1_000_000, 1_000_000);
      // 2.5 + 10.0 = 12.5
      expect(cost).toBe(12.5);
    });

    it('avoids floating point precision issues', () => {
      // The function rounds to 6 decimal places
      const cost = calculateCost('gpt-4o-mini', 333, 777);
      expect(Number.isFinite(cost)).toBe(true);
      // Should have at most 6 decimal places
      const decimalStr = cost.toString().split('.')[1] || '';
      expect(decimalStr.length).toBeLessThanOrEqual(6);
    });
  });

  describe('estimateTokens', () => {
    it('estimates ~4 chars per token', () => {
      expect(estimateTokens('hello world!')).toBe(3); // 12 chars / 4 = 3
    });

    it('returns 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('returns 0 for null/undefined', () => {
      expect(estimateTokens(null as unknown as string)).toBe(0);
      expect(estimateTokens(undefined as unknown as string)).toBe(0);
    });

    it('rounds up', () => {
      expect(estimateTokens('hi')).toBe(1); // 2 chars / 4 = 0.5, ceil = 1
    });
  });

  describe('isSelfHostedModel', () => {
    it('returns true for ollama models', () => {
      expect(isSelfHostedModel('llama3')).toBe(true);
      expect(isSelfHostedModel('mistral')).toBe(true);
      expect(isSelfHostedModel('codellama')).toBe(true);
      expect(isSelfHostedModel('deepseek')).toBe(true);
      expect(isSelfHostedModel('phi3')).toBe(true);
      expect(isSelfHostedModel('qwen2')).toBe(true);
    });

    it('returns false for cloud models', () => {
      expect(isSelfHostedModel('gpt-4o')).toBe(false);
      expect(isSelfHostedModel('anthropic/claude-3-opus')).toBe(false);
      expect(isSelfHostedModel('o1')).toBe(false);
    });
  });

  describe('formatCost', () => {
    it('formats zero', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('formats very small costs', () => {
      expect(formatCost(0.00001)).toBe('<$0.0001');
    });

    it('formats small costs with 4 decimals', () => {
      expect(formatCost(0.0012)).toBe('$0.0012');
    });

    it('formats sub-dollar costs with 3 decimals', () => {
      expect(formatCost(0.125)).toBe('$0.125');
    });

    it('formats dollar+ costs with 2 decimals', () => {
      expect(formatCost(12.5)).toBe('$12.50');
    });
  });

  describe('formatTokens', () => {
    it('formats small numbers as-is', () => {
      expect(formatTokens(500)).toBe('500');
    });

    it('formats thousands with K', () => {
      expect(formatTokens(1500)).toBe('1.5K');
    });

    it('formats millions with M', () => {
      expect(formatTokens(2_500_000)).toBe('2.5M');
    });

    it('formats exactly 1000', () => {
      expect(formatTokens(1000)).toBe('1.0K');
    });
  });
});

describe('Embedding Pricing', () => {
  describe('getEmbeddingPricing', () => {
    it('returns exact match for known models', () => {
      const pricing = getEmbeddingPricing('text-embedding-3-small');
      expect(pricing.costPer1MTokens).toBe(0.02);
      expect(pricing.provider).toBe('openai');
    });

    it('returns voyage pricing', () => {
      const pricing = getEmbeddingPricing('voyage-3');
      expect(pricing.costPer1MTokens).toBe(0.06);
      expect(pricing.provider).toBe('voyage');
    });

    it('returns default for unknown models', () => {
      const pricing = getEmbeddingPricing('unknown-embedding');
      expect(pricing).toEqual(EMBEDDING_PRICING['embedding-default']);
    });
  });

  describe('calculateEmbeddingCost', () => {
    it('calculates correctly for text-embedding-3-small', () => {
      // 1M tokens at $0.02/1M = $0.02
      expect(calculateEmbeddingCost('text-embedding-3-small', 1_000_000)).toBe(0.02);
    });

    it('returns zero for zero tokens', () => {
      expect(calculateEmbeddingCost('voyage-3', 0)).toBe(0);
    });

    it('handles fractional results', () => {
      const cost = calculateEmbeddingCost('text-embedding-3-small', 500);
      expect(Number.isFinite(cost)).toBe(true);
    });
  });

  describe('isEmbeddingIncludedInPlatform', () => {
    it('returns true for Atlas AI', () => {
      expect(isEmbeddingIncludedInPlatform('atlas-ai-default')).toBe(true);
    });

    it('returns false for OpenAI models', () => {
      expect(isEmbeddingIncludedInPlatform('text-embedding-3-small')).toBe(false);
    });

    it('returns false for Voyage models', () => {
      expect(isEmbeddingIncludedInPlatform('voyage-3')).toBe(false);
    });
  });
});
