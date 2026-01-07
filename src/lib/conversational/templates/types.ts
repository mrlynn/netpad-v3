/**
 * Conversational Form Template Types
 *
 * Defines the interface for pluggable conversation templates.
 * Templates encapsulate all configuration needed for a specific use case.
 */

import {
  ConversationalFormConfig,
  ConversationTopic,
  ExtractionSchema,
  ConversationPersona,
  ConversationLimits,
} from '@/types/conversational';
import { PromptStrategy } from '../strategies/prompt';

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
 * Conversation Template Definition
 *
 * A template is a complete, self-contained definition for a conversational form use case.
 * Templates can be provided by the platform or created by users.
 */
export interface ConversationTemplate {
  /** Unique template identifier (e.g., 'it-helpdesk', 'customer-feedback') */
  id: string;

  /** Human-readable template name */
  name: string;

  /** Description of what this template is for */
  description: string;

  /** Template category for organization */
  category: TemplateCategory;

  /** Icon identifier (MUI icon name or custom) */
  icon?: string;

  /** Template version for compatibility */
  version: string;

  /** Whether this is a built-in platform template */
  isBuiltIn: boolean;

  /** Prompt strategy for this template */
  promptStrategy: PromptStrategy;

  /** Default form configuration */
  defaultConfig: TemplateDefaultConfig;

  /** Default topics to explore */
  defaultTopics: ConversationTopic[];

  /** Default extraction schema */
  defaultSchema: ExtractionSchema[];

  /** Metadata for UI display */
  metadata?: TemplateMetadata;
}

/**
 * Default configuration values for a template
 */
export interface TemplateDefaultConfig {
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
 * Template metadata for UI and discovery
 */
export interface TemplateMetadata {
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

  /** When template was last updated */
  updatedAt?: Date;
}

/**
 * Template registration entry
 */
export interface TemplateRegistration {
  /** Template definition */
  template: ConversationTemplate;

  /** Registration priority (higher = shown first) */
  priority: number;

  /** Whether template is enabled */
  enabled: boolean;
}

/**
 * Template query options for registry
 */
export interface TemplateQueryOptions {
  /** Filter by category */
  category?: TemplateCategory;

  /** Filter by tags */
  tags?: string[];

  /** Include disabled templates */
  includeDisabled?: boolean;

  /** Only built-in templates */
  builtInOnly?: boolean;
}

/**
 * Result of applying a template to form configuration
 */
export interface AppliedTemplate {
  /** Template ID that was applied */
  templateId: string;

  /** Resulting configuration */
  config: ConversationalFormConfig;

  /** Whether any customizations were made */
  hasCustomizations: boolean;
}

/**
 * Template factory function type
 *
 * Allows templates to be created dynamically with custom prompt strategies
 */
export type TemplateFactory = (options?: TemplateFactoryOptions) => ConversationTemplate;

/**
 * Options for template factory
 */
export interface TemplateFactoryOptions {
  /** Override prompt strategy */
  promptStrategy?: PromptStrategy;

  /** Override default config values */
  configOverrides?: Partial<TemplateDefaultConfig>;

  /** Additional metadata */
  metadata?: Partial<TemplateMetadata>;
}
