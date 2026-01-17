/**
 * AI Conditional Logic Generator Service
 *
 * Converts natural language conditions into structured conditional logic rules.
 *
 * NOTE: This class now uses the centralized aiService for token tracking.
 * For direct usage with analytics, use the createConditionalLogicGeneratorWithContext function.
 */

import OpenAI from 'openai';
import { ConditionalLogic, ConditionOperator } from '@/types/form';
import {
  GenerateConditionalLogicRequest,
  GenerateConditionalLogicResponse,
  AIServiceConfig,
} from './types';
import { SYSTEM_PROMPTS, buildConditionalLogicPrompt } from './prompts';
import { aiService, createAIContext } from './aiService';
import { AIServiceContext } from '@/types/ai-analytics';
import { Message } from './providers/base';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 1000,
};

// ============================================
// Conditional Logic Generator Class
// ============================================

export class ConditionalLogicGenerator {
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
   * Generate conditional logic from natural language description
   */
  async generateConditionalLogic(
    request: GenerateConditionalLogicRequest
  ): Promise<GenerateConditionalLogicResponse> {
    try {
      const prompt = buildConditionalLogicPrompt(
        request.description,
        request.availableFields,
        request.action
      );

      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPTS.conditionalLogicGenerator },
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

      // Validate the generated conditional logic
      if (!parsed.conditionalLogic) {
        return {
          success: false,
          error: 'AI did not generate valid conditional logic',
        };
      }

      const validation = this.validateConditionalLogic(
        parsed.conditionalLogic,
        request.availableFields
      );
      if (!validation.valid) {
        return {
          success: false,
          error: `Generated logic has issues: ${validation.error}`,
        };
      }

      // Normalize the conditional logic
      const normalizedLogic = this.normalizeConditionalLogic(parsed.conditionalLogic);

      return {
        success: true,
        conditionalLogic: normalizedLogic,
        explanation:
          parsed.explanation || this.generateExplanation(normalizedLogic, request.availableFields),
      };
    } catch (error) {
      console.error('Conditional logic generation error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error during conditional logic generation',
      };
    }
  }

  /**
   * Explain existing conditional logic in plain language
   */
  explainCondition(
    logic: ConditionalLogic,
    fields: Array<{ path: string; label: string; type: string }>
  ): string {
    return this.generateExplanation(logic, fields);
  }

  /**
   * Create a simple condition
   */
  createSimpleCondition(
    field: string,
    operator: ConditionOperator,
    value?: any,
    action: 'show' | 'hide' = 'show'
  ): ConditionalLogic {
    return {
      action,
      logicType: 'all',
      conditions: [{ field, operator, value }],
    };
  }

  /**
   * Combine multiple conditions with AND logic
   */
  combineWithAnd(conditions: ConditionalLogic[]): ConditionalLogic {
    const allConditions = conditions.flatMap((c) => c.conditions);
    return {
      action: conditions[0]?.action || 'show',
      logicType: 'all',
      conditions: allConditions,
    };
  }

  /**
   * Combine multiple conditions with OR logic
   */
  combineWithOr(conditions: ConditionalLogic[]): ConditionalLogic {
    const allConditions = conditions.flatMap((c) => c.conditions);
    return {
      action: conditions[0]?.action || 'show',
      logicType: 'any',
      conditions: allConditions,
    };
  }

  /**
   * Invert a condition (show -> hide, hide -> show)
   */
  invertCondition(logic: ConditionalLogic): ConditionalLogic {
    return {
      ...logic,
      action: logic.action === 'show' ? 'hide' : 'show',
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Validate the generated conditional logic
   */
  private validateConditionalLogic(
    logic: any,
    availableFields: Array<{ path: string; label: string; type: string }>
  ): { valid: boolean; error?: string } {
    // Check basic structure
    if (!logic.action || !['show', 'hide'].includes(logic.action)) {
      return { valid: false, error: 'Invalid action (must be "show" or "hide")' };
    }

    if (!logic.logicType || !['all', 'any'].includes(logic.logicType)) {
      return { valid: false, error: 'Invalid logicType (must be "all" or "any")' };
    }

    if (!Array.isArray(logic.conditions) || logic.conditions.length === 0) {
      return { valid: false, error: 'Conditions array is required and must not be empty' };
    }

    // Validate each condition
    const validOperators: ConditionOperator[] = [
      'equals',
      'notEquals',
      'contains',
      'notContains',
      'greaterThan',
      'lessThan',
      'isEmpty',
      'isNotEmpty',
      'isTrue',
      'isFalse',
    ];

    const fieldPaths = availableFields.map((f) => f.path);

    for (const condition of logic.conditions) {
      if (!condition.field) {
        return { valid: false, error: 'Each condition must have a field' };
      }

      if (!fieldPaths.includes(condition.field)) {
        return { valid: false, error: `Unknown field: ${condition.field}` };
      }

      if (!validOperators.includes(condition.operator)) {
        return { valid: false, error: `Invalid operator: ${condition.operator}` };
      }

      // Operators that require a value
      const valueRequiredOperators = ['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan'];
      if (valueRequiredOperators.includes(condition.operator) && condition.value === undefined) {
        return { valid: false, error: `Operator ${condition.operator} requires a value` };
      }
    }

    return { valid: true };
  }

  /**
   * Normalize conditional logic to ensure consistent format
   */
  private normalizeConditionalLogic(logic: any): ConditionalLogic {
    return {
      action: logic.action as 'show' | 'hide',
      logicType: logic.logicType as 'all' | 'any',
      conditions: logic.conditions.map((c: any) => ({
        field: c.field,
        operator: c.operator as ConditionOperator,
        value: c.value,
      })),
    };
  }

  /**
   * Generate a human-readable explanation of the conditional logic
   */
  private generateExplanation(
    logic: ConditionalLogic,
    fields: Array<{ path: string; label: string; type: string }>
  ): string {
    const fieldMap = new Map(fields.map((f) => [f.path, f.label]));
    const actionWord = logic.action === 'show' ? 'Show' : 'Hide';
    const connectorWord = logic.logicType === 'all' ? 'AND' : 'OR';

    const conditionDescriptions = logic.conditions.map((c) => {
      const fieldLabel = fieldMap.get(c.field) || c.field;
      return this.describeCondition(fieldLabel, c.operator, c.value);
    });

    if (conditionDescriptions.length === 1) {
      return `${actionWord} this field when ${conditionDescriptions[0]}`;
    }

    const lastCondition = conditionDescriptions.pop();
    const conditionsText = conditionDescriptions.join(`, ${connectorWord} `) + ` ${connectorWord} ${lastCondition}`;

    return `${actionWord} this field when ${conditionsText}`;
  }

  /**
   * Describe a single condition in plain language
   */
  private describeCondition(fieldLabel: string, operator: ConditionOperator, value?: any): string {
    switch (operator) {
      case 'equals':
        return `"${fieldLabel}" is "${value}"`;
      case 'notEquals':
        return `"${fieldLabel}" is not "${value}"`;
      case 'contains':
        return `"${fieldLabel}" contains "${value}"`;
      case 'notContains':
        return `"${fieldLabel}" does not contain "${value}"`;
      case 'greaterThan':
        return `"${fieldLabel}" is greater than ${value}`;
      case 'lessThan':
        return `"${fieldLabel}" is less than ${value}`;
      case 'isEmpty':
        return `"${fieldLabel}" is empty`;
      case 'isNotEmpty':
        return `"${fieldLabel}" has a value`;
      case 'isTrue':
        return `"${fieldLabel}" is checked/true`;
      case 'isFalse':
        return `"${fieldLabel}" is unchecked/false`;
      default:
        return `"${fieldLabel}" ${operator} ${value || ''}`;
    }
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a ConditionalLogicGenerator instance with default configuration
 *
 * @deprecated Use createConditionalLogicGeneratorWithContext for analytics tracking
 */
export function createConditionalLogicGenerator(apiKey?: string): ConditionalLogicGenerator {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new ConditionalLogicGenerator({ apiKey: key });
}

/**
 * Create a ConditionalLogicGenerator instance with AI context for centralized analytics tracking
 */
export function createConditionalLogicGeneratorWithContext(
  userId: string,
  orgId: string,
  isGuest: boolean = false
): ConditionalLogicGenerator {
  const aiContext = createAIContext(
    userId,
    orgId,
    'ai_conditional_logic',
    '/api/ai/generate-conditional-logic',
    isGuest
  );

  return new ConditionalLogicGenerator({ apiKey: '' }, aiContext);
}
