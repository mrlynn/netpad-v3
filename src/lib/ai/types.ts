/**
 * AI Service Types
 *
 * Type definitions for AI-powered form generation and assistance features.
 */

import { FormConfiguration, FieldConfig, ConditionalLogic } from '@/types/form';
import { QuestionTypeId } from '@/types/questionTypes';

// ============================================
// Form Generation Types
// ============================================

/**
 * Request for generating a form from natural language
 */
export interface GenerateFormRequest {
  /** Natural language description of the form */
  prompt: string;
  /** Optional context about the form's purpose */
  context?: {
    /** Industry or domain (e.g., "healthcare", "ecommerce") */
    industry?: string;
    /** Target audience (e.g., "customers", "employees") */
    audience?: string;
    /** Existing field names to reference */
    existingFields?: string[];
    /** MongoDB collection schema if available */
    schema?: Record<string, any>;
  };
  /** Generation options */
  options?: {
    /** Maximum number of fields to generate */
    maxFields?: number;
    /** Include conditional logic suggestions */
    includeConditionalLogic?: boolean;
    /** Include validation rules */
    includeValidation?: boolean;
    /** Preferred question types to use */
    preferredTypes?: QuestionTypeId[];
  };
}

/**
 * Response from form generation
 */
export interface GenerateFormResponse {
  /** Whether generation was successful */
  success: boolean;
  /** Generated form configuration */
  form?: Partial<FormConfiguration>;
  /** Confidence score (0-1) for the generation */
  confidence: number;
  /** Suggestions or warnings */
  suggestions?: string[];
  /** Error message if generation failed */
  error?: string;
  /** Token usage for billing/tracking */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Field Suggestion Types
// ============================================

/**
 * Request for field suggestions
 */
export interface FieldSuggestionRequest {
  /** Current form configuration */
  currentForm: Partial<FormConfiguration>;
  /** Context about what fields are needed */
  context?: string;
  /** Number of suggestions to return */
  limit?: number;
}

/**
 * A suggested field to add to the form
 */
export interface FieldSuggestion {
  /** Suggested field configuration */
  field: Partial<FieldConfig>;
  /** Reason for suggesting this field */
  reason: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Common in similar forms (percentage) */
  popularity?: number;
}

/**
 * Response from field suggestion
 */
export interface FieldSuggestionResponse {
  success: boolean;
  suggestions: FieldSuggestion[];
  error?: string;
}

// ============================================
// Formula Assistant Types
// ============================================

/**
 * Request for formula generation
 */
export interface GenerateFormulaRequest {
  /** Natural language description of the calculation */
  description: string;
  /** Available field references */
  availableFields: Array<{
    path: string;
    label: string;
    type: string;
  }>;
  /** Expected output type */
  outputType?: 'string' | 'number' | 'boolean';
}

/**
 * Response from formula generation
 */
export interface GenerateFormulaResponse {
  success: boolean;
  /** Generated formula expression */
  formula?: string;
  /** Human-readable explanation */
  explanation?: string;
  /** Dependencies detected */
  dependencies?: string[];
  /** Sample calculations for verification */
  samples?: Array<{
    inputs: Record<string, any>;
    result: any;
  }>;
  error?: string;
}

// ============================================
// Validation Rule Types
// ============================================

/**
 * Request for validation rule generation
 */
export interface GenerateValidationRequest {
  /** Field information */
  field: {
    path: string;
    label: string;
    type: string;
  };
  /** Natural language description of validation requirements */
  description: string;
}

/**
 * Response from validation rule generation
 */
export interface GenerateValidationResponse {
  success: boolean;
  /** Generated validation pattern (regex) */
  pattern?: string;
  /** Error message template */
  errorMessage?: string;
  /** Numeric constraints */
  constraints?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  /** Test cases for the validation */
  testCases?: Array<{
    input: string;
    shouldPass: boolean;
    description: string;
  }>;
  error?: string;
}

// ============================================
// Conditional Logic Types
// ============================================

/**
 * Request for conditional logic generation
 */
export interface GenerateConditionalLogicRequest {
  /** Natural language description of the condition */
  description: string;
  /** Available fields to reference */
  availableFields: Array<{
    path: string;
    label: string;
    type: string;
    options?: string[];
  }>;
  /** Target action */
  action: 'show' | 'hide';
}

/**
 * Response from conditional logic generation
 */
export interface GenerateConditionalLogicResponse {
  success: boolean;
  /** Generated conditional logic */
  conditionalLogic?: ConditionalLogic;
  /** Human-readable explanation */
  explanation?: string;
  error?: string;
}

// ============================================
// Content Generation Types
// ============================================

/**
 * Request for content generation (labels, descriptions, etc.)
 */
export interface GenerateContentRequest {
  /** Type of content to generate */
  contentType: 'label' | 'description' | 'placeholder' | 'errorMessage' | 'helpText';
  /** Context for the content */
  context: {
    fieldPath?: string;
    fieldType?: string;
    formName?: string;
    formDescription?: string;
    existingContent?: string;
  };
  /** Tone/style preferences */
  style?: 'professional' | 'friendly' | 'technical' | 'casual';
  /** Language for the content */
  language?: string;
}

/**
 * Response from content generation
 */
export interface GenerateContentResponse {
  success: boolean;
  /** Generated content */
  content?: string;
  /** Alternative suggestions */
  alternatives?: string[];
  error?: string;
}

// ============================================
// Response Analysis Types
// ============================================

/**
 * Request for response quality analysis
 */
export interface AnalyzeResponsesRequest {
  /** Form configuration */
  form: FormConfiguration;
  /** Sample responses to analyze */
  responses: Array<Record<string, any>>;
  /** What to analyze */
  analysisTypes: Array<'quality' | 'patterns' | 'spam' | 'suggestions'>;
}

/**
 * Quality issue detected in responses
 */
export interface QualityIssue {
  /** Field path with the issue */
  fieldPath: string;
  /** Type of issue */
  issueType: 'low_completion' | 'short_answers' | 'spam_detected' | 'pattern_mismatch';
  /** Severity of the issue */
  severity: 'low' | 'medium' | 'high';
  /** Description of the issue */
  description: string;
  /** Suggested fix */
  suggestion: string;
  /** Percentage of responses affected */
  affectedPercentage: number;
}

/**
 * Response from response analysis
 */
export interface AnalyzeResponsesResponse {
  success: boolean;
  /** Overall quality score (0-100) */
  overallScore?: number;
  /** Detected issues */
  issues?: QualityIssue[];
  /** Improvement suggestions */
  suggestions?: string[];
  /** Spam detection results */
  spamDetection?: {
    flaggedCount: number;
    flaggedIds: string[];
  };
  error?: string;
}

// ============================================
// AI Service Configuration
// ============================================

/**
 * Configuration for the AI service
 */
export interface AIServiceConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use */
  model?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Enable caching */
  enableCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
}

/**
 * AI generation metadata stored with forms
 */
export interface AIGenerationMetadata {
  /** Source of generation */
  generatedFrom: 'natural_language' | 'schema' | 'existing_form';
  /** AI provider used */
  provider: 'openai';
  /** Model used */
  model: string;
  /** Original prompt */
  promptUsed?: string;
  /** Generation timestamp */
  generatedAt: string;
  /** Confidence score */
  confidence: number;
  /** Whether user modified after generation */
  modified?: boolean;
}

// ============================================
// Workflow Generation Types
// ============================================

/**
 * Request for generating a workflow from natural language
 */
export interface GenerateWorkflowRequest {
  /** Natural language description of the workflow */
  prompt: string;
  /** Optional context about the workflow's purpose */
  context?: {
    /** Industry or domain (e.g., "ecommerce", "hr") */
    industry?: string;
    /** Existing forms that can be used as triggers */
    availableForms?: Array<{ id: string; name: string }>;
    /** Existing connections for integrations */
    availableConnections?: Array<{ id: string; name: string; type: string }>;
  };
  /** Generation options */
  options?: {
    /** Maximum number of nodes to generate */
    maxNodes?: number;
    /** Include specific trigger type */
    preferredTrigger?: 'manual' | 'form' | 'webhook' | 'schedule';
    /** Include AI nodes */
    includeAINodes?: boolean;
  };
}

/**
 * Generated workflow structure
 */
export interface GeneratedWorkflow {
  /** Workflow name */
  name: string;
  /** Workflow description */
  description?: string;
  /** Generated nodes */
  nodes: GeneratedWorkflowNode[];
  /** Generated edges/connections */
  edges: GeneratedWorkflowEdge[];
  /** Suggested workflow settings */
  settings?: {
    executionMode?: 'sequential' | 'parallel' | 'auto';
    errorHandling?: 'stop' | 'continue';
  };
}

/**
 * Generated workflow node
 */
export interface GeneratedWorkflowNode {
  /** Temporary ID for edge references */
  tempId: string;
  /** Node type (e.g., 'form-trigger', 'email-send') */
  type: string;
  /** Display label */
  label: string;
  /** Position on canvas */
  position: { x: number; y: number };
  /** Node configuration */
  config: Record<string, unknown>;
  /** Whether the node is enabled */
  enabled: boolean;
}

/**
 * Generated workflow edge
 */
export interface GeneratedWorkflowEdge {
  /** Source node tempId */
  sourceTempId: string;
  /** Source handle */
  sourceHandle: string;
  /** Target node tempId */
  targetTempId: string;
  /** Target handle */
  targetHandle: string;
  /** Optional condition for conditional edges */
  condition?: {
    expression: string;
    label?: string;
  };
}

/**
 * Response from workflow generation
 */
export interface GenerateWorkflowResponse {
  /** Whether generation was successful */
  success: boolean;
  /** Generated workflow configuration */
  workflow?: GeneratedWorkflow;
  /** Confidence score (0-1) for the generation */
  confidence: number;
  /** Suggestions or warnings */
  suggestions?: string[];
  /** Error message if generation failed */
  error?: string;
  /** Token usage for billing/tracking */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Completion Hints Types
// ============================================

/**
 * Request for completion hints as user types
 */
export interface CompletionHintsRequest {
  /** The field type (short_text, email, phone, etc.) */
  fieldType: string;
  /** Current partial value the user has typed */
  partialValue: string;
  /** Field label for context */
  fieldLabel: string;
  /** Optional context about the form */
  formContext?: {
    /** Form name */
    formName?: string;
    /** Industry or domain */
    industry?: string;
    /** Previous responses for this field (for learning patterns) */
    previousResponses?: string[];
  };
  /** Number of suggestions to return (default 5) */
  limit?: number;
}

/**
 * A single completion hint suggestion
 */
export interface CompletionHint {
  /** The suggested completion value */
  value: string;
  /** Display text (may include highlighting) */
  displayText: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Response from completion hints generation
 */
export interface CompletionHintsResponse {
  /** Whether generation was successful */
  success: boolean;
  /** Generated completion hints */
  hints: CompletionHint[];
  /** Error message if generation failed */
  error?: string;
  /** Token usage for billing/tracking */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Response Insights Agent Types
// ============================================

/**
 * Request for response insights analysis
 */
export interface ResponseInsightsRequest {
  /** Form ID to analyze */
  formId: string;
  /** Form configuration for context */
  form: {
    name: string;
    description?: string;
    fieldConfigs: Array<{
      path: string;
      label: string;
      type: string;
      required?: boolean;
    }>;
  };
  /** Sample of responses to analyze (max 100) */
  responses: Array<Record<string, unknown>>;
  /** Time range for analysis */
  timeRange?: {
    start: string;
    end: string;
  };
  /** Areas to focus on */
  focusAreas?: ('patterns' | 'anomalies' | 'trends' | 'quality')[];
}

/**
 * A detected pattern in responses
 */
export interface ResponsePattern {
  /** Description of the pattern */
  description: string;
  /** Which field(s) this pattern relates to */
  fields: string[];
  /** How often this pattern occurs (percentage) */
  frequency: number;
  /** Example values demonstrating the pattern */
  examples: unknown[];
  /** Pattern type */
  type: 'common_value' | 'correlation' | 'sequence' | 'timing';
}

/**
 * A detected anomaly in responses
 */
export interface ResponseAnomaly {
  /** Description of the anomaly */
  description: string;
  /** Which field(s) this anomaly relates to */
  fields: string[];
  /** Severity of the anomaly */
  severity: 'low' | 'medium' | 'high';
  /** IDs or indices of affected responses */
  affectedResponses: string[];
  /** Anomaly type */
  type: 'outlier' | 'duplicate' | 'spam' | 'incomplete' | 'invalid';
}

/**
 * A trend detected in responses
 */
export interface ResponseTrend {
  /** Metric being tracked */
  metric: string;
  /** Direction of the trend */
  direction: 'increasing' | 'decreasing' | 'stable';
  /** Percentage change */
  change: number;
  /** Description of the trend */
  description: string;
}

/**
 * Response from insights analysis
 */
export interface ResponseInsightsResponse {
  /** Whether analysis was successful */
  success: boolean;
  /** Executive summary of insights */
  summary?: string;
  /** Detected patterns */
  patterns?: ResponsePattern[];
  /** Detected anomalies */
  anomalies?: ResponseAnomaly[];
  /** Detected trends */
  trends?: ResponseTrend[];
  /** Quality score (0-100) */
  qualityScore?: number;
  /** Recommendations for improving the form */
  recommendations?: string[];
  /** Error message if analysis failed */
  error?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Form Optimization Agent Types
// ============================================

/**
 * Request for form optimization analysis
 */
export interface FormOptimizationRequest {
  /** Form ID to optimize */
  formId: string;
  /** Form configuration */
  form: {
    name: string;
    description?: string;
    fieldConfigs: Array<{
      path: string;
      label: string;
      type: string;
      required?: boolean;
      placeholder?: string;
      validation?: Record<string, unknown>;
    }>;
  };
  /** Include response data for conversion analysis */
  includeResponseData?: boolean;
  /** Response statistics if available */
  responseStats?: {
    totalResponses: number;
    completionRate: number;
    averageCompletionTime: number;
    fieldCompletionRates: Record<string, number>;
    dropOffPoints: string[];
  };
}

/**
 * An optimization issue found in the form
 */
export interface OptimizationIssue {
  /** Category of the issue */
  type: 'ux' | 'conversion' | 'accessibility' | 'mobile' | 'performance';
  /** Severity level */
  severity: 'critical' | 'warning' | 'suggestion';
  /** Which field this relates to (if applicable) */
  field?: string;
  /** Description of the issue */
  description: string;
  /** Recommended fix */
  recommendation: string;
  /** Estimated impact on conversion (0-100) */
  estimatedImpact: number;
}

/**
 * Response from optimization analysis
 */
export interface FormOptimizationResponse {
  /** Whether analysis was successful */
  success: boolean;
  /** Overall optimization score (0-100) */
  score?: number;
  /** Detected issues */
  issues?: OptimizationIssue[];
  /** Quick wins that can be implemented immediately */
  quickWins?: string[];
  /** Suggested field reordering */
  reorderSuggestions?: Array<{
    from: number;
    to: number;
    reason: string;
  }>;
  /** Error message if analysis failed */
  error?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Response Processing Agent Types
// ============================================

/**
 * Request for processing a form response
 */
export interface ProcessResponseRequest {
  /** The response data to process */
  response: Record<string, unknown>;
  /** Form configuration for context */
  form: {
    name: string;
    fieldConfigs: Array<{
      path: string;
      label: string;
      type: string;
    }>;
  };
  /** Processing actions to perform */
  actions: ('categorize' | 'extract' | 'sentiment' | 'summarize' | 'route')[];
  /** Processing rules */
  rules?: {
    /** Categories for classification */
    categories?: string[];
    /** Fields to extract from free-text */
    extractFields?: string[];
    /** Routing rules */
    routingRules?: Array<{
      condition: string;
      destination: string;
    }>;
  };
}

/**
 * Response from processing
 */
export interface ProcessResponseResponse {
  /** Whether processing was successful */
  success: boolean;
  /** Categorization result */
  category?: {
    primary: string;
    secondary?: string;
    confidence: number;
  };
  /** Extracted entities */
  extracted?: Record<string, unknown>;
  /** Sentiment analysis */
  sentiment?: {
    score: number; // -1 to 1
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  };
  /** Summary of the response */
  summary?: string;
  /** Routing decision */
  routing?: {
    destination: string;
    reason: string;
  };
  /** Error message if processing failed */
  error?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Translation Agent Types
// ============================================

/**
 * Request for translating form content
 */
export interface TranslateFormRequest {
  /** Form ID to translate */
  formId: string;
  /** Form content to translate */
  form: {
    name: string;
    description?: string;
    fieldConfigs: Array<{
      path: string;
      label: string;
      placeholder?: string;
      helpText?: string;
      options?: Array<{ label: string; value: string }>;
      validation?: {
        errorMessage?: string;
      };
    }>;
  };
  /** Source language (auto-detect if not specified) */
  sourceLanguage?: string;
  /** Target languages to translate to */
  targetLanguages: string[];
  /** Include validation messages */
  includeValidationMessages?: boolean;
}

/**
 * Translated form content for a single language
 */
export interface TranslatedForm {
  /** Target language code */
  language: string;
  /** Translated form name */
  name: string;
  /** Translated description */
  description?: string;
  /** Translated field content */
  fields: Array<{
    path: string;
    label: string;
    placeholder?: string;
    helpText?: string;
    options?: Array<{ label: string; value: string }>;
    errorMessage?: string;
  }>;
}

/**
 * Response from translation
 */
export interface TranslateFormResponse {
  /** Whether translation was successful */
  success: boolean;
  /** Detected source language */
  sourceLanguage?: string;
  /** Translations for each target language */
  translations?: TranslatedForm[];
  /** Error message if translation failed */
  error?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Compliance Audit Agent Types
// ============================================

/**
 * Request for compliance audit
 */
export interface ComplianceAuditRequest {
  /** Form ID to audit */
  formId: string;
  /** Form configuration */
  form: {
    name: string;
    description?: string;
    fieldConfigs: Array<{
      path: string;
      label: string;
      type: string;
      required?: boolean;
      encryption?: {
        enabled: boolean;
        algorithm?: string;
      };
    }>;
  };
  /** Compliance frameworks to check against */
  frameworks: ('GDPR' | 'HIPAA' | 'CCPA' | 'PCI-DSS' | 'SOC2')[];
}

/**
 * A compliance violation or concern
 */
export interface ComplianceViolation {
  /** Framework this relates to */
  framework: string;
  /** Regulation or rule being violated */
  regulation: string;
  /** Severity */
  severity: 'critical' | 'warning' | 'info';
  /** Which field this relates to */
  field?: string;
  /** Description of the issue */
  description: string;
  /** How to remediate */
  remediation: string;
}

/**
 * Response from compliance audit
 */
export interface ComplianceAuditResponse {
  /** Whether audit was successful */
  success: boolean;
  /** Overall compliance score per framework */
  scores?: Record<string, number>;
  /** Detected violations */
  violations?: ComplianceViolation[];
  /** Recommendations for improving compliance */
  recommendations?: string[];
  /** Compliant aspects (positive findings) */
  compliantAspects?: string[];
  /** Error message if audit failed */
  error?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
