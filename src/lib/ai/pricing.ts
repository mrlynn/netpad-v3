/**
 * LLM and Embedding Model Pricing Configuration
 *
 * Pricing data for cost estimation across different providers and models.
 * Prices are per 1 million tokens as of January 2025.
 */

/**
 * Pricing structure for an LLM model
 */
export interface ModelPricing {
  /** Cost per 1 million prompt/input tokens in USD */
  promptCostPer1MTokens: number;
  /** Cost per 1 million completion/output tokens in USD */
  completionCostPer1MTokens: number;
}

/**
 * Pricing structure for an embedding model
 */
export interface EmbeddingPricing {
  /** Cost per 1 million tokens in USD */
  costPer1MTokens: number;
  /** Provider name */
  provider: string;
}

/**
 * Model pricing lookup table
 * Updated pricing as of January 2025
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4o-mini': {
    promptCostPer1MTokens: 0.15,
    completionCostPer1MTokens: 0.6,
  },
  'gpt-4o': {
    promptCostPer1MTokens: 2.5,
    completionCostPer1MTokens: 10.0,
  },
  'gpt-4-turbo': {
    promptCostPer1MTokens: 10.0,
    completionCostPer1MTokens: 30.0,
  },
  'gpt-4-turbo-preview': {
    promptCostPer1MTokens: 10.0,
    completionCostPer1MTokens: 30.0,
  },
  'gpt-4': {
    promptCostPer1MTokens: 30.0,
    completionCostPer1MTokens: 60.0,
  },
  'gpt-3.5-turbo': {
    promptCostPer1MTokens: 0.5,
    completionCostPer1MTokens: 1.5,
  },
  'gpt-3.5-turbo-0125': {
    promptCostPer1MTokens: 0.5,
    completionCostPer1MTokens: 1.5,
  },

  // OpenAI o1 Models (reasoning)
  'o1': {
    promptCostPer1MTokens: 15.0,
    completionCostPer1MTokens: 60.0,
  },
  'o1-mini': {
    promptCostPer1MTokens: 3.0,
    completionCostPer1MTokens: 12.0,
  },
  'o1-preview': {
    promptCostPer1MTokens: 15.0,
    completionCostPer1MTokens: 60.0,
  },

  // Self-hosted models via Ollama (zero cost)
  llama2: {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'llama2:7b': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'llama2:13b': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'llama3': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'llama3.1': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'llama3.2': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  mistral: {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'mistral:7b': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  codellama: {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'codellama:7b': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'codellama:13b': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  deepseek: {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'deepseek-coder': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  phi: {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'phi3': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  qwen: {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },
  'qwen2': {
    promptCostPer1MTokens: 0,
    completionCostPer1MTokens: 0,
  },

  // OpenRouter hosted models (example pricing)
  'anthropic/claude-3-opus': {
    promptCostPer1MTokens: 15.0,
    completionCostPer1MTokens: 75.0,
  },
  'anthropic/claude-3-sonnet': {
    promptCostPer1MTokens: 3.0,
    completionCostPer1MTokens: 15.0,
  },
  'anthropic/claude-3-haiku': {
    promptCostPer1MTokens: 0.25,
    completionCostPer1MTokens: 1.25,
  },

  // Default fallback (uses gpt-4o-mini pricing)
  default: {
    promptCostPer1MTokens: 0.15,
    completionCostPer1MTokens: 0.6,
  },
};

// ============================================
// Embedding Model Pricing
// ============================================

/**
 * Embedding model pricing lookup table
 * Updated pricing as of January 2025
 */
export const EMBEDDING_PRICING: Record<string, EmbeddingPricing> = {
  // OpenAI Embedding Models
  'text-embedding-3-small': {
    costPer1MTokens: 0.02, // $0.02 per 1M tokens
    provider: 'openai',
  },
  'text-embedding-3-large': {
    costPer1MTokens: 0.13, // $0.13 per 1M tokens
    provider: 'openai',
  },
  'text-embedding-ada-002': {
    costPer1MTokens: 0.1, // $0.10 per 1M tokens (legacy)
    provider: 'openai',
  },

  // Voyage AI Embedding Models
  'voyage-3': {
    costPer1MTokens: 0.06, // $0.06 per 1M tokens
    provider: 'voyage',
  },
  'voyage-3-lite': {
    costPer1MTokens: 0.02, // $0.02 per 1M tokens
    provider: 'voyage',
  },
  'voyage-code-3': {
    costPer1MTokens: 0.06, // $0.06 per 1M tokens
    provider: 'voyage',
  },
  'voyage-3-large': {
    costPer1MTokens: 0.06, // $0.06 per 1M tokens
    provider: 'voyage',
  },

  // Atlas AI Services (uses Voyage, pricing included in Atlas billing)
  // Listed here for reference, actual billing through MongoDB Atlas
  'atlas-ai-default': {
    costPer1MTokens: 0.06, // Equivalent to voyage-3
    provider: 'atlas-ai',
  },

  // Default fallback (uses text-embedding-3-small pricing)
  'embedding-default': {
    costPer1MTokens: 0.02,
    provider: 'default',
  },
};

/**
 * Get pricing for a model
 *
 * @param model - Model identifier
 * @returns Pricing for the model, or default pricing if not found
 */
export function getModelPricing(model: string): ModelPricing {
  // Try exact match first
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }

  // Try base model name (e.g., "llama3.2:latest" -> "llama3.2")
  const baseModel = model.split(':')[0];
  if (MODEL_PRICING[baseModel]) {
    return MODEL_PRICING[baseModel];
  }

  // Try model family (e.g., "gpt-4o-mini-2024-07-18" -> "gpt-4o-mini")
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(key)) {
      return pricing;
    }
  }

  // Return default pricing
  return MODEL_PRICING['default'];
}

/**
 * Calculate cost for a request based on token usage
 *
 * @param model - Model identifier
 * @param promptTokens - Number of prompt/input tokens
 * @param completionTokens - Number of completion/output tokens
 * @returns Estimated cost in USD
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getModelPricing(model);

  const promptCost = (promptTokens / 1_000_000) * pricing.promptCostPer1MTokens;
  const completionCost =
    (completionTokens / 1_000_000) * pricing.completionCostPer1MTokens;

  // Round to 6 decimal places to avoid floating point issues
  return Math.round((promptCost + completionCost) * 1_000_000) / 1_000_000;
}

/**
 * Estimate tokens from text (rough approximation)
 * Uses ~4 characters per token for English text
 *
 * @param text - Input text
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough estimate: 1 token ~ 4 characters for English
  // This is a simplification; actual tokenization varies by model
  return Math.ceil(text.length / 4);
}

/**
 * Check if a model is self-hosted (zero cost)
 *
 * @param model - Model identifier
 * @returns True if the model is self-hosted
 */
export function isSelfHostedModel(model: string): boolean {
  const pricing = getModelPricing(model);
  return (
    pricing.promptCostPer1MTokens === 0 &&
    pricing.completionCostPer1MTokens === 0
  );
}

/**
 * Format cost for display
 *
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.0012" or "<$0.0001")
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.0001) return '<$0.0001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count for display
 *
 * @param tokens - Token count
 * @returns Formatted string (e.g., "1.2K", "3.5M")
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

// ============================================
// Embedding Cost Functions
// ============================================

/**
 * Get pricing for an embedding model
 *
 * @param model - Embedding model identifier
 * @returns Pricing for the model, or default pricing if not found
 */
export function getEmbeddingPricing(model: string): EmbeddingPricing {
  if (EMBEDDING_PRICING[model]) {
    return EMBEDDING_PRICING[model];
  }

  // Try to match by prefix (e.g., "voyage-3" matches "voyage-3")
  for (const [key, pricing] of Object.entries(EMBEDDING_PRICING)) {
    if (model.startsWith(key)) {
      return pricing;
    }
  }

  // Return default embedding pricing
  return EMBEDDING_PRICING['embedding-default'];
}

/**
 * Calculate embedding cost based on token count
 *
 * @param model - Embedding model identifier
 * @param tokens - Number of tokens to embed
 * @returns Estimated cost in USD
 */
export function calculateEmbeddingCost(model: string, tokens: number): number {
  const pricing = getEmbeddingPricing(model);
  const cost = (tokens / 1_000_000) * pricing.costPer1MTokens;
  // Round to 6 decimal places to avoid floating point issues
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * Check if an embedding model is free (e.g., Atlas AI with billing through Atlas)
 *
 * @param model - Embedding model identifier
 * @returns True if the model is effectively free (billed separately)
 */
export function isEmbeddingIncludedInPlatform(model: string): boolean {
  const pricing = getEmbeddingPricing(model);
  return pricing.provider === 'atlas-ai';
}
