/**
 * AI Formula Assistant Service
 *
 * Converts natural language descriptions into formula expressions for computed fields.
 *
 * NOTE: This class now uses the centralized aiService for token tracking.
 * For direct usage with analytics, use the createFormulaAssistantWithContext function.
 */

import OpenAI from 'openai';
import {
  GenerateFormulaRequest,
  GenerateFormulaResponse,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildFormulaPrompt } from './prompts';
import { evaluateFormula } from '@/lib/formulaEngine';
import { aiService, createAIContext, AIServiceStreamConfig } from './aiService';
import { AIServiceContext } from '@/types/ai-analytics';
import { Message } from './providers/base';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.3, // Lower temperature for more precise formulas
  maxTokens: 1000,
};

// ============================================
// Formula Assistant Class
// ============================================

export class FormulaAssistant {
  private client: OpenAI | null = null;
  private config: AIServiceConfig;
  private aiContext: AIServiceContext | null = null;

  constructor(config: AIServiceConfig, aiContext?: AIServiceContext) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiContext = aiContext || null;

    // Only create OpenAI client if not using centralized service
    if (!aiContext && config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
      });
    }
  }

  /**
   * Generate a formula from natural language description
   */
  async generateFormula(request: GenerateFormulaRequest): Promise<GenerateFormulaResponse> {
    try {
      const prompt = buildFormulaPrompt(
        request.description,
        request.availableFields,
        request.outputType
      );

      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPTS.formulaAssistant },
        { role: 'user', content: prompt },
      ];

      let responseText: string;

      // Use centralized aiService if context is provided (with analytics tracking)
      if (this.aiContext) {
        const result = await aiService.complete(this.aiContext, messages, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          responseFormat: { type: 'json_object' },
        });

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'No response from AI model',
          };
        }

        responseText = result.data;
      } else {
        // Fallback to direct OpenAI client (legacy path without analytics)
        if (!this.client) {
          return {
            success: false,
            error: 'OpenAI client not configured',
          };
        }

        const completion = await this.client.chat.completions.create({
          model: this.config.model || 'gpt-4o-mini',
          messages: messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: 'json_object' },
        });

        responseText = completion.choices[0]?.message?.content || '';
      }

      if (!responseText) {
        return {
          success: false,
          error: 'No response from AI model',
        };
      }

      const parsed = JSON.parse(responseText);

      // Validate the generated formula
      const validation = this.validateFormula(parsed.formula, request.availableFields);
      if (!validation.valid) {
        return {
          success: false,
          formula: parsed.formula,
          error: `Generated formula has issues: ${validation.error}`,
        };
      }

      // Generate sample calculations
      const samples = this.generateSamples(parsed.formula, request.availableFields);

      return {
        success: true,
        formula: parsed.formula,
        explanation: parsed.explanation || this.generateExplanation(parsed.formula),
        dependencies: parsed.dependencies || this.extractDependencies(parsed.formula, request.availableFields),
        samples,
      };
    } catch (error) {
      console.error('Formula generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during formula generation',
      };
    }
  }

  /**
   * Explain an existing formula in plain language
   */
  async explainFormula(
    formula: string,
    availableFields: Array<{ path: string; label: string; type: string }>
  ): Promise<{ success: boolean; explanation?: string; error?: string }> {
    try {
      const fieldContext = availableFields
        .map((f) => `${f.path}: ${f.label} (${f.type})`)
        .join('\n');

      const prompt = `Explain this formula in plain, non-technical language:

Formula: ${formula}

Available fields:
${fieldContext}

Provide a clear explanation that a non-technical person would understand.`;

      const messages: Message[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant that explains formulas in plain language. Be concise and clear.',
        },
        { role: 'user', content: prompt },
      ];

      let explanation: string;

      // Use centralized aiService if context is provided (with analytics tracking)
      if (this.aiContext) {
        const result = await aiService.complete(this.aiContext, messages, {
          model: this.config.model,
          temperature: 0.5,
          maxTokens: 500,
        });

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'No response from AI model',
          };
        }

        explanation = result.data;
      } else {
        // Fallback to direct OpenAI client (legacy path without analytics)
        if (!this.client) {
          return {
            success: false,
            error: 'OpenAI client not configured',
          };
        }

        const completion = await this.client.chat.completions.create({
          model: this.config.model || 'gpt-4o-mini',
          messages: messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          temperature: 0.5,
          max_tokens: 500,
        });

        explanation = completion.choices[0]?.message?.content || '';
      }

      if (!explanation) {
        return {
          success: false,
          error: 'No response from AI model',
        };
      }

      return {
        success: true,
        explanation,
      };
    } catch (error) {
      console.error('Formula explanation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Suggest improvements to an existing formula
   */
  async suggestImprovements(
    formula: string,
    context?: string
  ): Promise<{ success: boolean; suggestions?: string[]; error?: string }> {
    try {
      const prompt = `Review this formula and suggest any improvements:

Formula: ${formula}
${context ? `Context: ${context}` : ''}

Consider:
- Edge cases (division by zero, null values)
- Readability improvements
- Alternative approaches that might be more efficient

Respond with JSON: { "suggestions": ["suggestion 1", "suggestion 2"] }`;

      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPTS.formulaAssistant },
        { role: 'user', content: prompt },
      ];

      let responseText: string;

      // Use centralized aiService if context is provided (with analytics tracking)
      if (this.aiContext) {
        const result = await aiService.complete(this.aiContext, messages, {
          model: this.config.model,
          temperature: 0.6,
          maxTokens: 500,
          responseFormat: { type: 'json_object' },
        });

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'No response from AI model',
          };
        }

        responseText = result.data;
      } else {
        // Fallback to direct OpenAI client (legacy path without analytics)
        if (!this.client) {
          return {
            success: false,
            error: 'OpenAI client not configured',
          };
        }

        const completion = await this.client.chat.completions.create({
          model: this.config.model || 'gpt-4o-mini',
          messages: messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          temperature: 0.6,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        });

        responseText = completion.choices[0]?.message?.content || '';
      }

      if (!responseText) {
        return {
          success: false,
          error: 'No response from AI model',
        };
      }

      const parsed = JSON.parse(responseText);
      return {
        success: true,
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      console.error('Formula improvement error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Validate that a formula is syntactically correct
   */
  private validateFormula(
    formula: string,
    availableFields: Array<{ path: string; label: string; type: string }>
  ): { valid: boolean; error?: string } {
    if (!formula || typeof formula !== 'string') {
      return { valid: false, error: 'Formula is empty or invalid' };
    }

    // Create a context with sample values for validation
    const context: Record<string, any> = {};
    for (const field of availableFields) {
      switch (field.type) {
        case 'number':
        case 'slider':
        case 'rating':
        case 'scale':
        case 'nps':
          context[field.path] = 10;
          break;
        case 'yes_no':
          context[field.path] = true;
          break;
        case 'date':
        case 'datetime':
          context[field.path] = new Date().toISOString();
          break;
        default:
          context[field.path] = 'test';
      }
    }

    try {
      // Try to evaluate the formula
      evaluateFormula(formula, context);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Formula evaluation failed',
      };
    }
  }

  /**
   * Extract field dependencies from a formula
   */
  private extractDependencies(
    formula: string,
    availableFields: Array<{ path: string; label: string; type: string }>
  ): string[] {
    const dependencies: string[] = [];
    const fieldPaths = availableFields.map((f) => f.path);

    for (const path of fieldPaths) {
      // Check if the field path appears in the formula
      // Use word boundary matching to avoid partial matches
      const regex = new RegExp(`\\b${path.replace(/\./g, '\\.')}\\b`);
      if (regex.test(formula)) {
        dependencies.push(path);
      }
    }

    return dependencies;
  }

  /**
   * Generate a basic explanation for a formula
   */
  private generateExplanation(formula: string): string {
    // Basic pattern matching for common operations
    if (formula.includes('if(')) {
      return 'This formula uses conditional logic to return different values based on conditions.';
    }
    if (formula.includes('sum(') || formula.includes('+')) {
      return 'This formula calculates a sum of values.';
    }
    if (formula.includes('average(')) {
      return 'This formula calculates an average of values.';
    }
    if (formula.includes('*')) {
      return 'This formula performs multiplication.';
    }
    if (formula.includes('/')) {
      return 'This formula performs division.';
    }
    if (formula.includes('concat(') || formula.includes('&')) {
      return 'This formula combines text values.';
    }
    return 'This formula computes a value based on other field values.';
  }

  /**
   * Generate sample calculations for a formula
   */
  private generateSamples(
    formula: string,
    availableFields: Array<{ path: string; label: string; type: string }>
  ): Array<{ inputs: Record<string, any>; result: any }> {
    const samples: Array<{ inputs: Record<string, any>; result: any }> = [];

    // Generate a few sample inputs
    const sampleSets = [
      this.generateSampleInputs(availableFields, 'low'),
      this.generateSampleInputs(availableFields, 'medium'),
      this.generateSampleInputs(availableFields, 'high'),
    ];

    for (const inputs of sampleSets) {
      try {
        const result = evaluateFormula(formula, inputs);
        samples.push({ inputs, result });
      } catch {
        // Skip samples that cause errors
      }
    }

    return samples;
  }

  /**
   * Generate sample input values for testing
   */
  private generateSampleInputs(
    fields: Array<{ path: string; label: string; type: string }>,
    magnitude: 'low' | 'medium' | 'high'
  ): Record<string, any> {
    const inputs: Record<string, any> = {};
    const multipliers = { low: 1, medium: 10, high: 100 };
    const mult = multipliers[magnitude];

    for (const field of fields) {
      switch (field.type) {
        case 'number':
        case 'slider':
          inputs[field.path] = 5 * mult;
          break;
        case 'rating':
          inputs[field.path] = Math.min(5, 1 * mult);
          break;
        case 'scale':
        case 'nps':
          inputs[field.path] = Math.min(10, 2 * mult);
          break;
        case 'yes_no':
          inputs[field.path] = magnitude !== 'low';
          break;
        case 'date':
        case 'datetime':
          const date = new Date();
          date.setDate(date.getDate() + mult);
          inputs[field.path] = date.toISOString();
          break;
        default:
          inputs[field.path] = `sample_${magnitude}`;
      }
    }

    return inputs;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a FormulaAssistant instance with default configuration
 *
 * @deprecated Use createFormulaAssistantWithContext for analytics tracking
 */
export function createFormulaAssistant(apiKey?: string): FormulaAssistant {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new FormulaAssistant({ apiKey: key });
}

/**
 * Create a FormulaAssistant instance with AI context for centralized analytics tracking
 *
 * This is the preferred method for creating a FormulaAssistant as it enables:
 * - Automatic token usage tracking
 * - Request logging with latency metrics
 * - Cost estimation
 * - Billing integration
 *
 * @example
 * ```typescript
 * const assistant = createFormulaAssistantWithContext(
 *   guard.context.userId,
 *   guard.context.orgId,
 *   guard.context.isGuest || false
 * );
 * const result = await assistant.generateFormula(request);
 * // Token usage is automatically logged - no need to call recordAIUsage
 * ```
 */
export function createFormulaAssistantWithContext(
  userId: string,
  orgId: string,
  isGuest: boolean = false,
  feature: 'ai_formula_assistant' = 'ai_formula_assistant'
): FormulaAssistant {
  const aiContext = createAIContext(
    userId,
    orgId,
    feature,
    '/api/ai/generate-formula',
    isGuest
  );

  return new FormulaAssistant({ apiKey: '' }, aiContext);
}
