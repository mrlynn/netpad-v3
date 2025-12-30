/**
 * AI Services Index
 *
 * Main entry point for all AI-powered form building features.
 */

// Types
export * from './types';

// Prompts and utilities
export { SYSTEM_PROMPTS, FIELD_TYPE_HINTS, suggestFieldType } from './prompts';

// Form Generator
export { FormGenerator, createFormGenerator } from './formGenerator';

// Formula Assistant
export { FormulaAssistant, createFormulaAssistant } from './formulaAssistant';

// Validation Generator
export {
  ValidationGenerator,
  createValidationGenerator,
  COMMON_PATTERNS,
} from './validationGenerator';

// Conditional Logic Generator
export {
  ConditionalLogicGenerator,
  createConditionalLogicGenerator,
} from './conditionalLogicGenerator';

// Completion Hints Generator
export {
  CompletionHintsGenerator,
  createCompletionHintsGenerator,
} from './completionHints';

// Response Insights Agent
export {
  ResponseInsightsAgent,
  createResponseInsightsAgent,
} from './responseInsightsAgent';

// Form Optimization Agent
export {
  FormOptimizationAgent,
  createFormOptimizationAgent,
} from './formOptimizationAgent';

// Response Processing Agent
export {
  ResponseProcessingAgent,
  createResponseProcessingAgent,
} from './responseProcessingAgent';

// Translation Agent
export {
  TranslationAgent,
  createTranslationAgent,
} from './translationAgent';

// Compliance Audit Agent
export {
  ComplianceAuditAgent,
  createComplianceAuditAgent,
} from './complianceAuditAgent';

// ============================================
// Unified AI Service
// ============================================

import { FormGenerator, createFormGenerator } from './formGenerator';
import { FormulaAssistant, createFormulaAssistant } from './formulaAssistant';
import { ValidationGenerator, createValidationGenerator } from './validationGenerator';
import { ConditionalLogicGenerator, createConditionalLogicGenerator } from './conditionalLogicGenerator';
import { CompletionHintsGenerator, createCompletionHintsGenerator } from './completionHints';
import { ResponseInsightsAgent, createResponseInsightsAgent } from './responseInsightsAgent';
import { FormOptimizationAgent, createFormOptimizationAgent } from './formOptimizationAgent';
import { ResponseProcessingAgent, createResponseProcessingAgent } from './responseProcessingAgent';
import { TranslationAgent, createTranslationAgent } from './translationAgent';
import { ComplianceAuditAgent, createComplianceAuditAgent } from './complianceAuditAgent';

/**
 * Unified AI Service that provides access to all AI capabilities
 */
export class AIService {
  public readonly formGenerator: FormGenerator;
  public readonly formulaAssistant: FormulaAssistant;
  public readonly validationGenerator: ValidationGenerator;
  public readonly conditionalLogicGenerator: ConditionalLogicGenerator;
  public readonly completionHintsGenerator: CompletionHintsGenerator;
  public readonly responseInsightsAgent: ResponseInsightsAgent;
  public readonly formOptimizationAgent: FormOptimizationAgent;
  public readonly responseProcessingAgent: ResponseProcessingAgent;
  public readonly translationAgent: TranslationAgent;
  public readonly complianceAuditAgent: ComplianceAuditAgent;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.formGenerator = createFormGenerator(key);
    this.formulaAssistant = createFormulaAssistant(key);
    this.validationGenerator = createValidationGenerator(key);
    this.conditionalLogicGenerator = createConditionalLogicGenerator(key);
    this.completionHintsGenerator = createCompletionHintsGenerator(key);
    this.responseInsightsAgent = createResponseInsightsAgent(key);
    this.formOptimizationAgent = createFormOptimizationAgent(key);
    this.responseProcessingAgent = createResponseProcessingAgent(key);
    this.translationAgent = createTranslationAgent(key);
    this.complianceAuditAgent = createComplianceAuditAgent(key);
  }
}

/**
 * Create a unified AI service instance
 */
export function createAIService(apiKey?: string): AIService {
  return new AIService(apiKey);
}

// Default export for convenience
export default AIService;
