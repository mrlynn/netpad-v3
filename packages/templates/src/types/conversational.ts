/**
 * Conversational Form Types (Simplified)
 *
 * Minimal types for conversational template configuration.
 * No AI provider dependencies.
 */

// ============================================
// Conversation Topic
// ============================================

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

// ============================================
// Conversation Persona
// ============================================

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

// ============================================
// Extraction Schema
// ============================================

export interface ExtractionSchema {
  /** Field name in output */
  field: string;
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'file';
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

// ============================================
// Conversation Limits
// ============================================

export interface ConversationLimits {
  /** Maximum number of turns */
  maxTurns: number;
  /** Maximum duration in minutes */
  maxDuration: number;
  /** Minimum confidence threshold for completion */
  minConfidence: number;
}

// ============================================
// Conversational Form Config
// ============================================

export interface ConversationalFormConfig {
  /** Form type */
  formType: 'conversational';
  /** Template ID */
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
  /** Use IT Helpdesk template @deprecated */
  useITHelpdeskTemplate?: boolean;
}
