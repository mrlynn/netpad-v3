/**
 * @netpad/workflows Types
 *
 * TypeScript type definitions for NetPad workflows.
 * These types represent the API request/response structures.
 */

// ============================================
// CORE WORKFLOW TYPES
// ============================================

/**
 * Workflow status
 */
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

/**
 * Workflow canvas structure
 */
export interface WorkflowCanvas {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * Workflow settings
 */
export interface WorkflowSettings {
  executionMode: 'sequential' | 'parallel' | 'auto' | 'immediate';
  maxExecutionTime: number;      // ms
  retryPolicy: RetryPolicy;
  errorHandling: 'stop' | 'continue' | 'rollback';
  timezone: string;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
}

/**
 * Workflow variable definition
 */
export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  description?: string;
}

/**
 * Workflow statistics
 */
export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTimeMs: number;
  lastExecutedAt?: Date | string;
}

/**
 * Complete workflow document
 */
export interface WorkflowDocument {
  _id?: string;
  id: string;
  orgId: string;
  name: string;
  description?: string;
  slug: string;
  canvas: WorkflowCanvas;
  settings: WorkflowSettings;
  variables: WorkflowVariable[];
  inputSchema?: JSONSchemaDefinition;
  outputSchema?: JSONSchemaDefinition;
  status: WorkflowStatus;
  version: number;
  publishedVersion?: number;
  tags: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  lastModifiedBy: string;
  stats: WorkflowStats;
}

// ============================================
// NODE TYPES
// ============================================

/**
 * Workflow node instance
 */
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  label?: string;
  notes?: string;
  collapsed?: boolean;
  enabled: boolean;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  runCondition?: {
    expression: string;
    skipOnFalse: boolean;
  };
}

/**
 * Workflow edge (connection between nodes)
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  mapping?: DataMapping[];
  condition?: {
    expression: string;
    label?: string;
  };
  animated?: boolean;
  style?: EdgeStyle;
}

/**
 * Data mapping for edge transformations
 */
export interface DataMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

/**
 * Edge style configuration
 */
export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

// ============================================
// EXECUTION TYPES
// ============================================

/**
 * Execution status
 */
export type ExecutionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/**
 * Execution trigger information
 */
export interface ExecutionTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'form_submission' | 'api';
  nodeId?: string;
  payload?: Record<string, unknown>;
  source?: {
    ip?: string;
    userAgent?: string;
    userId?: string;
  };
}

/**
 * Execution error
 */
export interface ExecutionError {
  nodeId?: string;
  code: string;
  message: string;
  timestamp: Date | string;
  stack?: string;
}

/**
 * Execution context
 */
export interface ExecutionContext {
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  errors: ExecutionError[];
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  totalTimeMs: number;
  nodeMetrics: Record<string, {
    startTime: Date | string;
    endTime?: Date | string;
    durationMs?: number;
  }>;
}

/**
 * Workflow execution document
 */
export interface WorkflowExecution {
  _id?: string;
  workflowId: string;
  workflowVersion: number;
  orgId: string;
  trigger: ExecutionTrigger;
  status: ExecutionStatus;
  startedAt: Date | string;
  completedAt?: Date | string;
  currentNodeId?: string;
  completedNodes: string[];
  failedNodes: string[];
  skippedNodes: string[];
  context: ExecutionContext;
  result?: {
    success: boolean;
    output?: Record<string, unknown>;
    error?: ExecutionError;
  };
  metrics: ExecutionMetrics;
}

/**
 * Execution log entry
 */
export interface ExecutionLog {
  _id?: string;
  executionId: string;
  nodeId?: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date | string;
}

/**
 * Job details (for pending/running executions)
 */
export interface JobDetails {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  runAt?: Date | string;
  lockedAt?: Date | string;
  lockedBy?: string;
  createdAt: Date | string;
  completedAt?: Date | string;
  canRetry: boolean;
  canCancel: boolean;
  waitTimeMs?: number | null;
  isStale: boolean;
}

// ============================================
// JSON SCHEMA TYPES
// ============================================

/**
 * JSON Schema definition (simplified)
 */
export type JSONSchemaDefinition = Record<string, unknown>;

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Options for listing workflows
 */
export interface ListWorkflowsOptions {
  status?: WorkflowStatus;
  tags?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response from listWorkflows
 */
export interface ListWorkflowsResponse {
  workflows: WorkflowDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Options for creating a workflow
 */
export interface CreateWorkflowOptions {
  name: string;
  description?: string;
  tags?: string[];
}

/**
 * Options for updating a workflow
 */
export interface UpdateWorkflowOptions {
  name?: string;
  description?: string;
  canvas?: WorkflowCanvas;
  settings?: WorkflowSettings;
  variables?: WorkflowVariable[];
  tags?: string[];
}

/**
 * Options for executing a workflow
 */
export interface ExecuteWorkflowOptions {
  payload?: Record<string, unknown>;
}

/**
 * Response from executeWorkflow
 */
export interface ExecuteWorkflowResponse {
  executionId: string;
  status: ExecutionStatus;
  message?: string;
}

/**
 * Options for listing executions
 */
export interface ListExecutionsOptions {
  status?: ExecutionStatus;
  limit?: number;
  offset?: number;
  includeLogs?: boolean;
  includeJobs?: boolean;
}

/**
 * Response from listExecutions
 */
export interface ListExecutionsResponse {
  success: boolean;
  executions: WorkflowExecution[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Response from getExecution
 */
export interface GetExecutionResponse {
  success: boolean;
  execution: WorkflowExecution;
  job?: JobDetails | null;
  logs?: ExecutionLog[];
  progress?: {
    completed: number;
    failed: number;
    skipped: number;
    total: number;
  };
}
