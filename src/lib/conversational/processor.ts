/**
 * Conversation Processor Service
 *
 * Handles the transformation of conversation state to form submission data.
 * Encapsulates extraction, mapping, validation, and metadata assembly.
 */

import {
  ConversationalFormConfig,
  ConversationState,
  ExtractionSchema,
} from '@/types/conversational';
import { FieldConfig } from '@/types/form';
import { mapExtractedDataToFormFields, validateMappedData } from './mapping';
import { getTemplate } from './templates/registry';

/**
 * Submission data with conversation metadata
 */
export interface ConversationalSubmissionData {
  /** Mapped form data */
  data: Record<string, any>;
  /** Conversation metadata stored in _meta */
  _meta: ConversationMetadata;
}

/**
 * Conversation metadata structure
 */
export interface ConversationMetadata {
  /** Type of submission */
  submissionType: 'conversational';
  /** Conversation ID */
  conversationId: string;
  /** Full conversation transcript */
  transcript: ConversationState['messages'];
  /** Number of turns in conversation */
  turnCount: number;
  /** Overall confidence score */
  confidence: number;
  /** Reason for completion */
  completionReason: 'completed' | 'user_confirmed' | 'turn_limit' | 'duration_limit';
  /** Duration in seconds */
  duration: number;
  /** Topics covered during conversation */
  topicsCovered: Array<{
    topicId: string;
    name: string;
    covered: boolean;
    depth: number;
  }>;
  /** Extraction schema used */
  extractionSchema: Array<{
    field: string;
    type: string;
    required: boolean;
  }>;
  /** Field mapping report */
  mappingReport: Array<{
    extractionField: string;
    formFieldPath: string | null;
    matched: boolean;
    strategy?: string;
  }>;
  /** Validation warnings */
  validationWarnings: string[];
  /** Missing required fields */
  missingRequiredFields: string[];
  /** Fields that couldn't be mapped */
  unmappedFields?: Record<string, any>;
  /** Authenticated user info (if available) */
  authenticatedUser?: {
    userId: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Processor configuration
 */
export interface ProcessorConfig {
  /** Whether to include transcript in metadata */
  includeTranscript?: boolean;
  /** Whether to include mapping report */
  includeMappingReport?: boolean;
  /** Custom extraction schema (overrides template/config schema) */
  customSchema?: ExtractionSchema[];
}

/**
 * Result of processing a conversation
 */
export interface ProcessorResult {
  /** Success status */
  success: boolean;
  /** Submission data (if successful) */
  submissionData?: ConversationalSubmissionData;
  /** Error message (if failed) */
  error?: string;
  /** Validation warnings */
  warnings: string[];
  /** Missing required fields */
  missingRequiredFields: string[];
}

/**
 * Conversation Processor
 *
 * Processes conversation state into form submission data.
 */
export class ConversationProcessor {
  private config: ProcessorConfig;

  constructor(config: ProcessorConfig = {}) {
    this.config = {
      includeTranscript: true,
      includeMappingReport: true,
      ...config,
    };
  }

  /**
   * Process conversation state into submission data
   *
   * @param conversationState Current conversation state
   * @param formConfig Conversational form configuration
   * @param formFields Form field configurations for mapping
   * @param authenticatedUser Optional authenticated user info
   * @returns Processor result with submission data or error
   */
  process(
    conversationState: ConversationState,
    formConfig: ConversationalFormConfig,
    formFields: FieldConfig[],
    authenticatedUser?: {
      userId: string;
      email?: string;
      displayName?: string;
    }
  ): ProcessorResult {
    try {
      // Get extraction schema
      const extractionSchema = this.getExtractionSchema(formConfig);

      // Map extracted data to form fields
      const { mappedData, unmappedFields, mappingReport } =
        mapExtractedDataToFormFields(
          conversationState.partialExtractions,
          extractionSchema,
          formFields
        );

      // Validate mapped data
      const validation = validateMappedData(mappedData, formFields);

      // Calculate duration
      const duration = this.calculateDuration(conversationState);

      // Determine completion reason
      const completionReason = this.determineCompletionReason(conversationState);

      // Build metadata
      const metadata: ConversationMetadata = {
        submissionType: 'conversational',
        conversationId: conversationState.conversationId,
        transcript: this.config.includeTranscript
          ? conversationState.messages
          : [],
        turnCount: conversationState.turnCount,
        confidence: conversationState.confidence,
        completionReason,
        duration,
        topicsCovered: conversationState.topics.map((t) => ({
          topicId: t.topicId,
          name: t.name,
          covered: t.covered,
          depth: t.depth,
        })),
        extractionSchema: extractionSchema.map((s) => ({
          field: s.field,
          type: s.type,
          required: s.required,
        })),
        mappingReport: this.config.includeMappingReport ? mappingReport : [],
        validationWarnings: validation.warnings,
        missingRequiredFields: validation.missingRequiredFields,
        unmappedFields:
          Object.keys(unmappedFields).length > 0 ? unmappedFields : undefined,
        authenticatedUser,
      };

      // Build submission data
      const submissionData: ConversationalSubmissionData = {
        data: mappedData,
        _meta: metadata,
      };

      return {
        success: true,
        submissionData,
        warnings: validation.warnings,
        missingRequiredFields: validation.missingRequiredFields,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process conversation',
        warnings: [],
        missingRequiredFields: [],
      };
    }
  }

  /**
   * Get extraction schema from config or template
   */
  private getExtractionSchema(
    formConfig: ConversationalFormConfig
  ): ExtractionSchema[] {
    // Use custom schema if provided
    if (this.config.customSchema) {
      return this.config.customSchema;
    }

    // Check for template-based schema
    const templateId = (formConfig as any).templateId;
    if (templateId) {
      const template = getTemplate(templateId);
      if (template) {
        return template.defaultSchema;
      }
    }

    // Fall back to config schema
    return formConfig.extractionSchema || [];
  }

  /**
   * Calculate conversation duration in seconds
   */
  private calculateDuration(state: ConversationState): number {
    if (state.completedAt && state.startedAt) {
      return Math.round(
        (state.completedAt.getTime() - state.startedAt.getTime()) / 1000
      );
    }
    return Math.round((Date.now() - state.startedAt.getTime()) / 1000);
  }

  /**
   * Determine the reason for conversation completion
   */
  private determineCompletionReason(
    state: ConversationState
  ): ConversationMetadata['completionReason'] {
    if (state.status === 'completed') {
      return 'completed';
    }

    if (state.turnCount >= state.maxTurns) {
      return 'turn_limit';
    }

    // Check duration limit (would need to be passed in or calculated)
    // For now, default to user_confirmed
    return 'user_confirmed';
  }
}

/**
 * Create a processor with default configuration
 */
export function createProcessor(
  config?: ProcessorConfig
): ConversationProcessor {
  return new ConversationProcessor(config);
}

/**
 * Convenience function for one-off processing
 */
export function processConversation(
  conversationState: ConversationState,
  formConfig: ConversationalFormConfig,
  formFields: FieldConfig[],
  authenticatedUser?: {
    userId: string;
    email?: string;
    displayName?: string;
  }
): ProcessorResult {
  const processor = new ConversationProcessor();
  return processor.process(
    conversationState,
    formConfig,
    formFields,
    authenticatedUser
  );
}
