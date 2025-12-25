/**
 * Types for the AI Chat Assistant
 */

import { FieldConfig, FormConfiguration } from './form';

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
  | 'add_field'
  | 'update_field'
  | 'delete_field'
  | 'reorder_fields'
  | 'update_settings'
  | 'navigate'
  | 'suggest_fields'
  | 'explain';

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

export type ChatAction =
  | AddFieldAction
  | UpdateFieldAction
  | DeleteFieldAction
  | ReorderFieldsAction
  | UpdateSettingsAction
  | NavigateAction
  | SuggestFieldsAction
  | ExplainAction;

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

// ============================================
// API Types
// ============================================

export interface ChatRequest {
  message: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context: FormBuilderContext;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  action?: ChatAction;
  suggestions?: string[];
  error?: string;
}
