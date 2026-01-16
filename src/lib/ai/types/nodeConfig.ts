/**
 * Types for AI-assisted node configuration
 * Used by the unified node config generator system
 */

/**
 * Workflow context passed from the frontend for AI awareness
 */
export interface WorkflowContextForAI {
  upstreamNodes: Array<{
    id: string;
    type: string;
    label: string;
    outputFields: string[];
  }>;
  triggerInfo?: {
    type: string;
    label: string;
    availableFields: string[];
  };
}

/**
 * Request payload for node configuration generation
 */
export interface NodeConfigGenerationRequest {
  nodeType: string;
  fieldKey: string;
  userQuery: string;
  currentConfig: Record<string, unknown>;
  currentFieldValue?: unknown;
  workflowContext?: WorkflowContextForAI;
}

/**
 * Response from node configuration generation
 */
export interface NodeConfigGenerationResponse {
  result: unknown;
  explanation?: string;
  suggestions?: string[];
}

/**
 * Configuration for a node-specific prompt
 */
export interface NodePromptConfig {
  systemPrompt: string;
  outputFormat: 'json' | 'text' | 'code';
  temperature?: number;
  examples?: Array<{
    input: string;
    output: string;
  }>;
}

/**
 * AI assistance configuration for a config field (used in ConfigField interface)
 */
export interface AIAssistConfig {
  enabled: boolean;
  promptHint?: string;
  buttonLabel?: string;
  contextFields?: string[];
}
