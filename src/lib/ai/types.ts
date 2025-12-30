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
