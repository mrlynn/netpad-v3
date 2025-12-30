/**
 * Types for the AI Chat Assistant
 */

import { FieldConfig, FormConfiguration } from './form';
import { WorkflowNode, WorkflowEdge, WorkflowSettings } from './workflow';

// ============================================
// Message Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** Optional action that the assistant can execute */
  action?: ChatAction;
  /** Whether action was executed */
  actionExecuted?: boolean;
  /** Loading state for streaming */
  isStreaming?: boolean;
}

// ============================================
// Action Types
// ============================================

export type ChatActionType =
  // Form Builder Actions
  | 'add_field'
  | 'update_field'
  | 'delete_field'
  | 'reorder_fields'
  | 'update_settings'
  | 'navigate'
  | 'suggest_fields'
  | 'explain'
  // Workflow Builder Actions
  | 'add_node'
  | 'update_node'
  | 'delete_node'
  | 'connect_nodes'
  | 'update_workflow_settings'
  | 'suggest_workflow';

export interface AddFieldAction {
  type: 'add_field';
  payload: {
    field: Partial<FieldConfig>;
    position?: number;
  };
}

export interface UpdateFieldAction {
  type: 'update_field';
  payload: {
    fieldPath: string;
    updates: Partial<FieldConfig>;
  };
}

export interface DeleteFieldAction {
  type: 'delete_field';
  payload: {
    fieldPath: string;
  };
}

export interface ReorderFieldsAction {
  type: 'reorder_fields';
  payload: {
    fieldPaths: string[];
  };
}

export interface UpdateSettingsAction {
  type: 'update_settings';
  payload: {
    settings: Partial<FormConfiguration>;
  };
}

export interface NavigateAction {
  type: 'navigate';
  payload: {
    to: string;
  };
}

export interface SuggestFieldsAction {
  type: 'suggest_fields';
  payload: {
    fields: Partial<FieldConfig>[];
  };
}

export interface ExplainAction {
  type: 'explain';
  payload: {
    topic: string;
    content: string;
  };
}

// ============================================
// Workflow Action Types
// ============================================

export interface AddNodeAction {
  type: 'add_node';
  payload: {
    nodeType: string;
    label?: string;
    position?: { x: number; y: number };
    config?: Record<string, unknown>;
  };
}

export interface UpdateNodeAction {
  type: 'update_node';
  payload: {
    nodeId: string;
    updates: {
      label?: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    };
  };
}

export interface DeleteNodeAction {
  type: 'delete_node';
  payload: {
    nodeId: string;
  };
}

export interface ConnectNodesAction {
  type: 'connect_nodes';
  payload: {
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string;
    targetHandle?: string;
    condition?: {
      label: string;
      expression?: string;
    };
  };
}

export interface UpdateWorkflowSettingsAction {
  type: 'update_workflow_settings';
  payload: {
    settings: Partial<WorkflowSettings>;
  };
}

export interface SuggestWorkflowAction {
  type: 'suggest_workflow';
  payload: {
    nodes: Array<{
      type: string;
      label: string;
      position: { x: number; y: number };
    }>;
    edges: Array<{
      source: number;
      target: number;
    }>;
    description: string;
  };
}

export type ChatAction =
  // Form Actions
  | AddFieldAction
  | UpdateFieldAction
  | DeleteFieldAction
  | ReorderFieldsAction
  | UpdateSettingsAction
  | NavigateAction
  | SuggestFieldsAction
  | ExplainAction
  // Workflow Actions
  | AddNodeAction
  | UpdateNodeAction
  | DeleteNodeAction
  | ConnectNodesAction
  | UpdateWorkflowSettingsAction
  | SuggestWorkflowAction;

// ============================================
// Context Types
// ============================================

export type CurrentView =
  | 'form-builder'
  | 'form-list'
  | 'responses'
  | 'analytics'
  | 'settings'
  | 'preview'
  | 'other';

export interface FormBuilderContext {
  /** Current form being edited */
  formId?: string;
  formName?: string;
  formDescription?: string;

  /** Current fields in the form */
  fields: FieldConfig[];

  /** Currently selected field (if any) */
  selectedFieldPath?: string | null;

  /** Form type */
  formType?: 'data-entry' | 'search' | 'both';

  /** Current view/screen */
  currentView: CurrentView;

  /** Response count (if viewing existing form) */
  responseCount?: number;
}

export type WorkflowCurrentView =
  | 'workflow-editor'
  | 'workflow-list'
  | 'execution-logs'
  | 'settings'
  | 'other';

export interface WorkflowBuilderContext {
  /** Current workflow being edited */
  workflowId?: string;
  workflowName?: string;
  workflowDescription?: string;

  /** Workflow status */
  status?: 'draft' | 'active' | 'paused' | 'archived';

  /** Current nodes in the workflow */
  nodes: Array<{
    id: string;
    type: string;
    label?: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }>;

  /** Current edges connecting nodes */
  edges: Array<{
    id: string;
    source: string;
    target: string;
    condition?: { label: string };
  }>;

  /** Currently selected node (if any) */
  selectedNodeId?: string | null;

  /** Current view/screen */
  currentView: WorkflowCurrentView;

  /** Execution stats */
  stats?: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  };
}

/** Combined context type - either form or workflow */
export type BuilderContext =
  | { type: 'form'; data: FormBuilderContext }
  | { type: 'workflow'; data: WorkflowBuilderContext };

// ============================================
// API Types
// ============================================

export interface ChatRequest {
  message: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  /** Form context (for backwards compatibility) */
  context?: FormBuilderContext;
  /** Workflow context */
  workflowContext?: WorkflowBuilderContext;
  /** Context type indicator */
  contextType?: 'form' | 'workflow';
}

export interface ChatResponse {
  success: boolean;
  message: string;
  action?: ChatAction;
  suggestions?: string[];
  error?: string;
}
