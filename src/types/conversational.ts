/**
 * Conversational Forms Type Definitions
 * 
 * Types for AI-powered conversational form submissions
 */

import { Message, MessageRole } from '@/lib/ai/providers/base';

/**
 * Topic coverage tracking
 */
export interface TopicCoverage {
  /** Topic identifier */
  topicId: string;
  /** Topic name */
  name: string;
  /** Whether this topic has been covered */
  covered: boolean;
  /** Depth of coverage (0-1) */
  depth: number;
  /** Priority level */
  priority: 'required' | 'important' | 'optional';
  /** Number of turns discussing this topic */
  turnCount: number;
  /** Last turn where this topic was mentioned */
  lastMentionedTurn?: number;
}

/**
 * Conversation state
 */
export interface ConversationState {
  /** Unique conversation ID */
  conversationId: string;
  /** Form ID this conversation belongs to */
  formId: string;
  /** Full conversation messages */
  messages: Message[];
  /** Topics that should be covered */
  topics: TopicCoverage[];
  /** Partial extractions (as conversation progresses) */
  partialExtractions: Record<string, any>;
  /** Overall confidence in extractions */
  confidence: number;
  /** Current turn count */
  turnCount: number;
  /** Maximum allowed turns */
  maxTurns: number;
  /** Conversation status */
  status: 'active' | 'completed' | 'abandoned' | 'error';
  /** When conversation started */
  startedAt: Date;
  /** When conversation was last updated */
  updatedAt: Date;
  /** When conversation completed (if applicable) */
  completedAt?: Date;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Conversational form configuration
 */
export interface ConversationalFormConfig {
  /** Form type */
  formType: 'conversational';
  /** Template ID (e.g., 'it-helpdesk', 'customer-feedback') */
  templateId?: string;
  /** Objective of the conversation */
  objective: string;
  /** Context about the business/situation */
  context?: string;
  /** Topics to explore */
  topics: ConversationTopic[];
  /** AI persona configuration */
  persona: ConversationPersona;
  /** Extraction schema */
  extractionSchema: ExtractionSchema[];
  /** Conversation limits */
  conversationLimits: ConversationLimits;
  /**
   * Use IT Helpdesk template (simplifies configuration)
   * @deprecated Use templateId: 'it-helpdesk' instead
   */
  useITHelpdeskTemplate?: boolean;
}

/**
 * Conversation topic definition
 */
export interface ConversationTopic {
  /** Unique topic identifier */
  id: string;
  /** Topic name */
  name: string;
  /** Description of what to explore */
  description: string;
  /** Priority level */
  priority: 'required' | 'important' | 'optional';
  /** Desired depth of exploration */
  depth: 'surface' | 'moderate' | 'deep';
  /** Extraction field mapping */
  extractionField?: string;
}

/**
 * AI persona configuration
 */
export interface ConversationPersona {
  /** Communication style */
  style: 'professional' | 'friendly' | 'casual' | 'empathetic' | 'custom';
  /** Tone of voice */
  tone?: string;
  /** Behaviors the AI should exhibit */
  behaviors?: string[];
  /** Restrictions on what AI should avoid */
  restrictions?: string[];
  /** Custom system prompt (if style is 'custom') */
  customPrompt?: string;
}

/**
 * Extraction schema for conversational forms
 */
export interface ExtractionSchema {
  /** Field name in output */
  field: string;
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
  /** Whether field is required */
  required: boolean;
  /** Description of what to extract */
  description: string;
  /** For enum type, list of possible values */
  options?: string[];
  /** Validation rules */
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  /** Topic this field maps to */
  topicId?: string;
}

/**
 * Conversation limits
 */
export interface ConversationLimits {
  /** Maximum number of turns */
  maxTurns: number;
  /** Maximum duration in minutes */
  maxDuration: number;
  /** Minimum confidence threshold for completion */
  minConfidence: number;
}

/**
 * Conversation submission (stored in database)
 */
export interface ConversationSubmission {
  /** Unique submission ID */
  id: string;
  /** Form ID */
  formId: string;
  /** Conversation ID */
  conversationId: string;
  /** Full conversation transcript */
  transcript: Message[];
  /** Extracted structured data */
  extractedData: Record<string, any>;
  /** Confidence scores per field */
  fieldConfidence: Record<string, number>;
  /** Overall confidence */
  overallConfidence: number;
  /** Topics covered */
  topicsCovered: TopicCoverage[];
  /** Missing required fields */
  missingFields: string[];
  /** Warnings or issues */
  warnings?: string[];
  /** Metadata */
  metadata: {
    startedAt: Date;
    completedAt: Date;
    turnCount: number;
    duration: number; // seconds
    model: string;
    provider: 'openai' | 'self-hosted';
    cost?: number; // USD
  };
  /** Standard submission fields */
  submittedAt: Date;
  /** Submission status */
  status: 'draft' | 'submitted';
  /** Organization ID */
  organizationId?: string;
  /** Project ID */
  projectId?: string;
}

// ============================================
// Stored Template Types (Admin Portal)
// ============================================

/**
 * Template category for organization
 */
export type TemplateCategory =
  | 'support'      // IT Helpdesk, Customer Support
  | 'feedback'     // Customer Feedback, Surveys
  | 'intake'       // Patient Intake, Lead Qualification
  | 'application'  // Job Applications, Registration
  | 'general';     // Generic templates

/**
 * Template status in the system
 */
export type TemplateStatus = 'draft' | 'published' | 'archived';

/**
 * Template visibility/scope
 */
export type TemplateScope = 'organization' | 'platform';

/**
 * Prompt configuration for stored templates
 *
 * Since PromptStrategy is a class with methods, we store
 * the configuration that can be used to build prompts.
 */
export interface TemplatePromptConfig {
  /** Strategy type identifier */
  strategyType: 'default' | 'it-helpdesk' | 'custom';

  /** Custom system prompt template (supports mustache-style variables) */
  systemPromptTemplate?: string;

  /** Custom context prompt template */
  contextPromptTemplate?: string;

  /** Custom wrap-up prompt template */
  wrapUpPromptTemplate?: string;

  /** Variables available in templates */
  templateVariables?: Record<string, string>;
}

/**
 * Default configuration values for stored templates
 */
export interface StoredTemplateDefaultConfig {
  /** Default objective text */
  objective: string;

  /** Default context */
  context?: string;

  /** Default persona settings */
  persona: ConversationPersona;

  /** Default conversation limits */
  conversationLimits: ConversationLimits;
}

/**
 * Stored template metadata for UI and discovery
 */
export interface StoredTemplateMetadata {
  /** Preview description shown in template selector */
  previewDescription?: string;

  /** Example use cases */
  useCases?: string[];

  /** Tags for filtering */
  tags?: string[];

  /** Estimated completion time in minutes */
  estimatedDuration?: number;

  /** Author information */
  author?: string;
}

/**
 * Stored template in the database
 *
 * This is the persisted version of a ConversationTemplate
 * that can be edited through the admin portal.
 */
export interface StoredTemplate {
  /** Unique template ID (auto-generated) */
  templateId: string;

  /** Organization that owns this template (null for platform templates) */
  organizationId: string | null;

  /** Human-readable template name */
  name: string;

  /** Description of what this template is for */
  description: string;

  /** Template category for organization */
  category: TemplateCategory;

  /** Icon identifier (MUI icon name or custom) */
  icon?: string;

  /** Template version */
  version: string;

  /** Template status */
  status: TemplateStatus;

  /** Template visibility scope */
  scope: TemplateScope;

  /** Priority for display ordering (higher = shown first) */
  priority: number;

  /** Whether template is enabled */
  enabled: boolean;

  /** Prompt configuration */
  promptConfig: TemplatePromptConfig;

  /** Default form configuration */
  defaultConfig: StoredTemplateDefaultConfig;

  /** Topics to explore */
  topics: ConversationTopic[];

  /** Extraction schema */
  extractionSchema: ExtractionSchema[];

  /** Metadata for UI display */
  metadata: StoredTemplateMetadata;

  /** Who created this template */
  createdBy: string;

  /** When template was created */
  createdAt: Date;

  /** Who last updated this template */
  updatedBy: string;

  /** When template was last updated */
  updatedAt: Date;

  /** Clone source (if this was cloned from another template) */
  clonedFrom?: string;
}

/**
 * Request to create a new template
 */
export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: TemplateCategory;
  icon?: string;
  scope?: TemplateScope;
  priority?: number;
  promptConfig: TemplatePromptConfig;
  defaultConfig: StoredTemplateDefaultConfig;
  topics: ConversationTopic[];
  extractionSchema: ExtractionSchema[];
  metadata?: Partial<StoredTemplateMetadata>;
}

/**
 * Request to update an existing template
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  icon?: string;
  status?: TemplateStatus;
  priority?: number;
  enabled?: boolean;
  promptConfig?: TemplatePromptConfig;
  defaultConfig?: StoredTemplateDefaultConfig;
  topics?: ConversationTopic[];
  extractionSchema?: ExtractionSchema[];
  metadata?: Partial<StoredTemplateMetadata>;
}

/**
 * Template list item (summary for lists)
 */
export interface TemplateListItem {
  templateId: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon?: string;
  status: TemplateStatus;
  scope: TemplateScope;
  enabled: boolean;
  priority: number;
  topicCount: number;
  fieldCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Template query options
 */
export interface StoredTemplateQueryOptions {
  /** Filter by category */
  category?: TemplateCategory;

  /** Filter by status */
  status?: TemplateStatus;

  /** Filter by scope */
  scope?: TemplateScope;

  /** Include disabled templates */
  includeDisabled?: boolean;

  /** Search by name/description */
  search?: string;

  /** Filter by tags */
  tags?: string[];

  /** Sort field */
  sortBy?: 'name' | 'priority' | 'createdAt' | 'updatedAt';

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';

  /** Pagination offset */
  offset?: number;

  /** Pagination limit */
  limit?: number;
}

/**
 * Result of cloning a template
 */
export interface CloneTemplateResult {
  /** New template that was created */
  template: StoredTemplate;

  /** ID of the original template */
  sourceTemplateId: string;
}
