/**
 * Form Reactions Type Definitions
 *
 * Reactions connect form field events to workflow executions,
 * enabling forms to trigger workflows on user interaction and
 * receive data back to update fields in real-time.
 */

import { ObjectId } from 'mongodb';

// ============================================
// Field Event Types
// ============================================

/**
 * Events that can trigger a reaction.
 */
export type FieldEvent =
  | 'change' // Field value changed
  | 'blur' // Field lost focus
  | 'focus' // Field gained focus
  | 'validate' // Field passed validation
  | 'clear'; // Field was cleared/reset

// ============================================
// Reaction Configuration Types
// ============================================

/**
 * Optional overrides for workflow trigger configuration.
 * Allows a single workflow to be used with different trigger settings per form.
 */
export interface ReactionTriggerOverride {
  /**
   * Override which fields trigger the reaction.
   * Field paths use dot notation (e.g., "address.city").
   */
  fields?: string[];

  /** Override the event type that triggers the reaction */
  event?: FieldEvent;

  /** Override debounce delay in milliseconds (0-30000) */
  debounceMs?: number;

  /**
   * Additional condition that must be true for reaction to fire.
   * Uses standard expression syntax.
   */
  condition?: {
    expression: string;
  };
}

/**
 * Configuration for reaction execution behavior.
 */
export interface ReactionExecutionConfig {
  /**
   * Execution mode:
   * - 'sync': Wait for result (default, v1 only)
   * - 'async': Return immediately, poll for result (future)
   * - 'auto': Use sync if expected <3s, otherwise async (future)
   */
  mode?: 'sync' | 'async' | 'auto';

  /**
   * Maximum time to wait for sync execution (milliseconds).
   * Default: 10000 (10 seconds)
   * Range: 1000-30000
   */
  timeoutMs?: number;

  /** Configuration for async execution (future) */
  async?: {
    /** Polling interval in milliseconds. Default: 1000 */
    pollingIntervalMs?: number;

    /** Maximum wait time in milliseconds. Default: 60000 */
    maxWaitMs?: number;

    /** Whether to show execution progress. Default: false */
    showProgress?: boolean;
  };
}

/**
 * Configuration for user feedback during reaction execution.
 */
export interface ReactionFeedbackConfig {
  /** Show loading indicator while executing. Default: true */
  showLoading?: boolean;

  /**
   * Style of loading indicator:
   * - 'field': Spinner on triggering field
   * - 'overlay': Semi-transparent form overlay
   * - 'subtle': Small indicator in corner
   */
  loadingStyle?: 'field' | 'overlay' | 'subtle';

  /** Message to show while loading */
  loadingMessage?: string;

  /** Show success feedback after completion. Default: true */
  showSuccess?: boolean;

  /** Custom success message */
  successMessage?: string;

  /** Duration to show success indicator (ms). Default: 2000 */
  successDuration?: number;

  /** Show error feedback on failure. Default: true */
  showError?: boolean;

  /**
   * How to display errors:
   * - 'toast': Toast notification
   * - 'inline': Error message near trigger field
   * - 'modal': Modal dialog with details
   */
  errorStyle?: 'toast' | 'inline' | 'modal';

  /** Highlight updated fields after success. Default: true */
  highlightUpdates?: boolean;

  /** Duration to highlight updated fields (ms). Default: 2000 */
  highlightDuration?: number;
}

/**
 * Configuration for a form reaction.
 * Reactions connect forms to workflows, enabling field-triggered automation.
 */
export interface FormReaction {
  /** Unique identifier for the reaction */
  id: string;

  /** Human-readable name for display in UI */
  name: string;

  /** Optional description explaining what this reaction does */
  description?: string;

  /**
   * ID of the workflow that powers this reaction.
   * Workflow should have appropriate nodes for processing field events.
   */
  workflowId: string;

  /**
   * Override trigger configuration from the workflow.
   * If not specified, uses configuration from workflow's trigger node.
   */
  trigger?: ReactionTriggerOverride;

  /** Execution behavior settings */
  execution?: ReactionExecutionConfig;

  /** UI feedback during and after execution */
  feedback?: ReactionFeedbackConfig;

  /** Whether this reaction is active */
  enabled: boolean;

  /** Timestamp when reaction was created */
  createdAt: Date;

  /** Timestamp when reaction was last modified */
  updatedAt: Date;
}

// ============================================
// Execution Context Types
// ============================================

/**
 * Context available to workflows during reaction execution.
 * Injected into workflow data context at execution time.
 */
export interface ReactionExecutionContext {
  /** ID of the form that triggered the reaction */
  formId: string;

  /** ID of the reaction being executed */
  reactionId: string;

  /** Field path that triggered the reaction */
  triggerField: string;

  /** Event type that triggered the reaction */
  triggerEvent: FieldEvent;

  /** Current value of the trigger field */
  fieldValue: unknown;

  /** Complete form data snapshot at trigger time */
  formData: Record<string, unknown>;

  /** Metadata about the execution */
  metadata: {
    /** Unique execution ID */
    executionId: string;

    /** Timestamp when execution started */
    startedAt: Date;

    /** Organization ID */
    organizationId: string;

    /** User ID who triggered (if authenticated) */
    userId?: string;
  };
}

// ============================================
// Execution Result Types
// ============================================

/**
 * Error codes for reaction execution failures.
 */
export type ReactionErrorCode =
  | 'WORKFLOW_NOT_FOUND'
  | 'WORKFLOW_DISABLED'
  | 'EXECUTION_TIMEOUT'
  | 'EXECUTION_FAILED'
  | 'INVALID_OUTPUT'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'REACTION_NOT_FOUND'
  | 'REACTION_DISABLED'
  | 'INVALID_REQUEST'
  | 'CASCADE_LIMIT'
  | 'INTERNAL_ERROR';

/**
 * Result returned from reaction execution.
 */
export interface ReactionExecutionResult {
  /** Execution status */
  status: 'completed' | 'pending' | 'failed';

  /** Unique execution ID for tracking */
  executionId: string;

  /** Result data (present when status is 'completed') */
  result?: {
    /** Field updates to apply to form */
    updates: Record<string, unknown>;

    /** Optional feedback to show user */
    feedback?: {
      message?: string;
      type?: 'success' | 'info' | 'warning' | 'error';
    };
  };

  /** Error information (present when status is 'failed') */
  error?: {
    message: string;
    code: ReactionErrorCode;
    details?: Record<string, unknown>;
  };

  /** Execution duration in milliseconds */
  durationMs?: number;

  /** URL to poll for status (async mode only) */
  pollUrl?: string;
}

// ============================================
// Node Configuration Types
// ============================================

/**
 * Field update mapping for form-field-update node.
 * Maps workflow data to form field values.
 */
export interface FieldUpdate {
  /** Target field path in form (dot notation) */
  fieldPath: string;

  /** Source path in workflow data context (dot notation) */
  sourcePath: string;

  /**
   * Optional transformation expression.
   * Applied to source value before setting.
   * Example: "value.toUpperCase()" or "value * 100"
   * Note: Not executed in v1 (requires sandboxing)
   */
  transform?: string;

  /**
   * Optional condition for this specific update.
   * Update only applied if condition evaluates to true.
   * Example: "value !== null && value !== undefined"
   */
  condition?: string;

  /**
   * Behavior when source value is null/undefined:
   * - 'skip': Don't update field (default)
   * - 'clear': Clear the field value
   * - 'default': Use defaultValue
   */
  nullBehavior?: 'skip' | 'clear' | 'default';

  /** Default value when nullBehavior is 'default' */
  defaultValue?: unknown;
}

// ============================================
// Database Document Types
// ============================================

/**
 * MongoDB document for reaction execution audit trail.
 * Stored in the reaction_executions collection.
 */
export interface ReactionExecutionDocument {
  _id?: ObjectId;
  executionId: string;

  // References
  formId: string;
  reactionId: string;
  workflowId: string;
  organizationId: string;

  // Trigger info
  triggerField: string;
  triggerEvent: string;

  // Execution data
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;

  // Input/Output
  inputSnapshot: {
    formData: Record<string, unknown>;
    fieldValue: unknown;
  };
  result?: {
    updates: Record<string, unknown>;
    feedback?: {
      message?: string;
      type?: string;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  // Metadata
  userId?: string;
  cascadeDepth: number;
  triggeredByExecutionId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Request body for creating a new reaction.
 */
export interface CreateReactionRequest {
  name: string;
  description?: string;
  workflowId: string;
  trigger?: ReactionTriggerOverride;
  execution?: ReactionExecutionConfig;
  feedback?: ReactionFeedbackConfig;
  enabled?: boolean;
}

/**
 * Request body for updating a reaction.
 */
export interface UpdateReactionRequest {
  name?: string;
  description?: string;
  workflowId?: string;
  trigger?: ReactionTriggerOverride;
  execution?: ReactionExecutionConfig;
  feedback?: ReactionFeedbackConfig;
  enabled?: boolean;
}

/**
 * Request body for executing a reaction.
 */
export interface ExecuteReactionRequest {
  /** ID of the reaction to execute */
  reactionId: string;

  /** Field that triggered the reaction */
  triggerField: string;

  /** Event type that triggered */
  triggerEvent: FieldEvent;

  /** Complete form data at time of trigger */
  formData: Record<string, unknown>;

  /** Optional: Force sync/async mode */
  executionMode?: 'sync' | 'async';
}

/**
 * Response from list reactions endpoint.
 */
export interface ListReactionsResponse {
  success: boolean;
  reactions: FormReaction[];
  total: number;
}

/**
 * Response from create/update reaction endpoint.
 */
export interface ReactionResponse {
  success: boolean;
  reaction: FormReaction;
}

/**
 * Response from delete reaction endpoint.
 */
export interface DeleteReactionResponse {
  success: boolean;
  deletedId: string;
}
