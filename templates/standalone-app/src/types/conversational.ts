/**
 * Conversational Forms Type Definitions (Standalone Version)
 *
 * Types for AI-powered conversational form submissions.
 */

import { Message } from '@/lib/ai/providers/base';

/**
 * Topic coverage tracking
 */
export interface TopicCoverage {
  topicId: string;
  name: string;
  covered: boolean;
  depth: number;
  priority: 'required' | 'important' | 'optional';
  turnCount: number;
  lastMentionedTurn?: number;
}

/**
 * Conversation state
 */
export interface ConversationState {
  conversationId: string;
  formId: string;
  messages: Message[];
  topics: TopicCoverage[];
  partialExtractions: Record<string, any>;
  confidence: number;
  turnCount: number;
  maxTurns: number;
  status: 'active' | 'completed' | 'abandoned' | 'error';
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Conversational form configuration
 */
export interface ConversationalFormConfig {
  formType: 'conversational';
  templateId?: string;
  objective: string;
  context?: string;
  topics: ConversationTopic[];
  persona: ConversationPersona;
  extractionSchema: ExtractionSchema[];
  conversationLimits: ConversationLimits;
}

/**
 * Conversation topic definition
 */
export interface ConversationTopic {
  id: string;
  name: string;
  description: string;
  priority: 'required' | 'important' | 'optional';
  depth: 'surface' | 'moderate' | 'deep';
  extractionField?: string;
}

/**
 * AI persona configuration
 */
export interface ConversationPersona {
  style: 'professional' | 'friendly' | 'casual' | 'empathetic' | 'custom';
  tone?: string;
  behaviors?: string[];
  restrictions?: string[];
  customPrompt?: string;
}

/**
 * Extraction schema for conversational forms
 */
export interface ExtractionSchema {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
  required: boolean;
  description: string;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  topicId?: string;
}

/**
 * Conversation limits
 */
export interface ConversationLimits {
  maxTurns: number;
  maxDuration: number;
  minConfidence: number;
}

/**
 * Conversation submission (stored in database)
 */
export interface ConversationSubmission {
  id: string;
  formId: string;
  conversationId: string;
  transcript: Message[];
  extractedData: Record<string, any>;
  fieldConfidence: Record<string, number>;
  overallConfidence: number;
  topicsCovered: TopicCoverage[];
  missingFields: string[];
  warnings?: string[];
  metadata: {
    startedAt: Date;
    completedAt: Date;
    turnCount: number;
    duration: number;
    model: string;
    provider: string;
  };
  submittedAt: Date;
  status: 'draft' | 'submitted';
}
