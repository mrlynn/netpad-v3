/**
 * Workflow Orchestration Platform Types
 *
 * Core type definitions for the visual workflow editor and execution engine.
 */

import { ObjectId } from 'mongodb';

// ============================================
// CORE WORKFLOW TYPES
// ============================================

/**
 * Main workflow document stored in MongoDB
 */
export interface WorkflowDocument {
  _id?: ObjectId;

  // Identity
  id: string;                    // UUID for external reference
  orgId: string;                 // Organization owner
  name: string;
  description?: string;
  slug: string;                  // URL-safe identifier

  // Visual Editor State
  canvas: WorkflowCanvas;

  // Workflow Configuration
  settings: WorkflowSettings;

  // Variables & Context
  variables: WorkflowVariable[];
  inputSchema?: JSONSchemaDefinition;
  outputSchema?: JSONSchemaDefinition;

  // State
  status: WorkflowStatus;
  version: number;
  publishedVersion?: number;

  // Metadata
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;

  // Analytics
  stats: WorkflowStats;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface WorkflowCanvas {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface WorkflowSettings {
  executionMode: 'sequential' | 'parallel' | 'auto' | 'immediate';
  maxExecutionTime: number;      // ms, default 5 minutes
  retryPolicy: RetryPolicy;
  errorHandling: 'stop' | 'continue' | 'rollback';
  timezone: string;              // For scheduled triggers
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  description?: string;
}

export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTimeMs: number;
  lastExecutedAt?: Date;
}

// ============================================
// NODE TYPES
// ============================================

/**
 * A node instance within a workflow canvas
 */
export interface WorkflowNode {
  id: string;                    // Unique within workflow
  type: string;                  // Node type identifier (e.g., 'form-trigger')

  // Position on canvas
  position: { x: number; y: number };

  // Node-specific configuration
  config: Record<string, unknown>;

  // Display
  label?: string;                // Custom label override
  notes?: string;                // User notes
  collapsed?: boolean;

  // Execution behavior
  enabled: boolean;
  timeout?: number;              // Override workflow default
  retryPolicy?: RetryPolicy;     // Override workflow default

  // Conditional execution
  runCondition?: {
    expression: string;
    skipOnFalse: boolean;
  };
}

/**
 * Edge type determines the visual path of the connection
 */
export type WorkflowEdgeType = 'default' | 'straight' | 'step' | 'smoothstep';

/**
 * Connection between two nodes
 */
export interface WorkflowEdge {
  id: string;
  source: string;                // Source node ID
  sourceHandle: string;          // Output port ID
  target: string;                // Target node ID
  targetHandle: string;          // Input port ID

  // Data transformation
  mapping?: DataMapping[];

  // Conditional routing
  condition?: {
    expression: string;
    label?: string;
  };

  // Visual
  type?: WorkflowEdgeType;       // Edge path style (default: bezier curve)
  animated?: boolean;
  style?: EdgeStyle;
}

export interface DataMapping {
  sourceField: string;           // JSONPath to source value
  targetField: string;           // JSONPath to target location
  transform?: string;            // Optional transformation expression
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

// ============================================
// NODE DEFINITIONS (Registry)
// ============================================

/**
 * Node category for palette organization
 */
export type NodeCategory =
  | 'triggers'
  | 'logic'
  | 'data'
  | 'integrations'
  | 'actions'
  | 'ai'
  | 'forms'
  | 'custom'
  | 'annotations';

/**
 * Node lifecycle stage
 */
export type NodeLifecycleStage =
  | 'trigger'                    // Starts workflow execution
  | 'processor'                  // Transforms data
  | 'action'                     // Side effects (send email, API call)
  | 'output';                    // Terminal node

/**
 * Port data types for type checking
 */
export type PortDataType =
  | 'any'
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'date'
  | 'file'
  | 'form_data'
  | 'document'
  | 'documents';

/**
 * Port definition for node inputs/outputs
 */
export interface PortDefinition {
  id: string;
  label: string;
  type: PortDataType;
  required: boolean;
  multiple: boolean;
  defaultValue?: unknown;
  description?: string;
  schema?: JSONSchemaDefinition;
}

/**
 * Base node definition that all node types extend
 */
export interface NodeDefinition {
  // Identity
  type: string;
  version: string;

  // Display
  name: string;
  description: string;
  icon: string;                  // Material icon name
  color: string;                 // Hex color
  category: NodeCategory;

  // Lifecycle
  stage: NodeLifecycleStage;

  // Ports
  inputs: PortDefinition[];
  outputs: PortDefinition[];

  // Configuration schema
  configSchema: JSONSchemaDefinition;

  // Dependencies
  dependencies: {
    requiredConnections?: string[];
    requiredNodes?: string[];
    requiredFeatures?: string[];
  };

  // Execution defaults
  executor: {
    type: 'sync' | 'async' | 'streaming';
    timeout: number;
  };

  // Error handling defaults
  errorHandling: {
    retryable: boolean;
    maxRetries: number;
    retryDelayMs: number;
    fallbackValue?: unknown;
  };

  // Documentation
  docs?: {
    examples: NodeExample[];
    tips: string[];
    warnings: string[];
  };
}

export interface NodeExample {
  title: string;
  description: string;
  config: Record<string, unknown>;
  sampleInput?: Record<string, unknown>;
  sampleOutput?: Record<string, unknown>;
}

// ============================================
// EXECUTION TYPES
// ============================================

export type TriggerType = 'manual' | 'schedule' | 'webhook' | 'form_submission' | 'api';
export type ExecutionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  _id?: ObjectId;

  // References
  workflowId: string;
  workflowVersion: number;
  orgId: string;

  // Trigger info
  trigger: {
    type: TriggerType;
    nodeId?: string;
    payload?: Record<string, unknown>;
    source?: {
      ip?: string;
      userAgent?: string;
      userId?: string;
    };
  };

  // Execution state
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;

  // Progress tracking
  currentNodeId?: string;
  completedNodes: string[];
  failedNodes: string[];
  skippedNodes: string[];

  // Data flow
  context: ExecutionContext;

  // Final result
  result?: {
    success: boolean;
    output?: Record<string, unknown>;
    error?: ExecutionError;
  };

  // Performance
  metrics: ExecutionMetrics;
}

export interface ExecutionContext {
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  errors: ExecutionError[];
}

export interface ExecutionError {
  nodeId: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  stack?: string;
  retryable?: boolean;
}

export interface ExecutionMetrics {
  totalDurationMs: number;
  nodeMetrics: Record<string, {
    durationMs: number;
    retries: number;
    dataSize: number;
  }>;
}

/**
 * Execution log entry
 */
export interface ExecutionLog {
  _id?: ObjectId;
  executionId: string;
  nodeId: string;

  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';

  event: ExecutionLogEvent;

  message: string;
  data?: Record<string, unknown>;

  expiresAt: Date;
}

export type ExecutionLogEvent =
  | 'node_start'
  | 'node_complete'
  | 'node_error'
  | 'node_skip'
  | 'data_transform'
  | 'condition_eval'
  | 'retry'
  | 'custom';

// ============================================
// WORKFLOW VERSIONING TYPES
// ============================================

/**
 * Immutable snapshot of a workflow version
 * Created when a workflow is published, enabling:
 * - Rollback to previous versions
 * - Execution against a specific version
 * - Audit trail of changes
 */
export interface WorkflowVersion {
  _id?: ObjectId;

  // References
  workflowId: string;
  orgId: string;
  version: number;

  // Immutable snapshot of workflow state at publish time
  snapshot: {
    name: string;
    description?: string;
    canvas: WorkflowCanvas;
    settings: WorkflowSettings;
    variables: WorkflowVariable[];
    inputSchema?: JSONSchemaDefinition;
    outputSchema?: JSONSchemaDefinition;
  };

  // Publish metadata
  publishedAt: Date;
  publishedBy: string;
  publishNote?: string;

  // Change tracking
  changesSummary?: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesAdded: number;
    edgesRemoved: number;
  };

  // Execution stats for this version
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  };

  // Lifecycle
  isActive: boolean;              // Currently the published version
  deprecatedAt?: Date;            // When replaced by newer version
  deprecatedBy?: string;          // User who published newer version
}

/**
 * Request to publish a workflow version
 */
export interface PublishWorkflowRequest {
  publishNote?: string;
}

/**
 * Response after publishing a workflow
 */
export interface PublishWorkflowResponse {
  version: number;
  publishedAt: Date;
  changesSummary: WorkflowVersion['changesSummary'];
}

/**
 * Request to rollback to a previous version
 */
export interface RollbackWorkflowRequest {
  targetVersion: number;
  publishNote?: string;
}

// ============================================
// JOB QUEUE TYPES (MongoDB-based)
// ============================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Workflow job in the MongoDB queue
 */
export interface WorkflowJob {
  _id?: ObjectId;
  workflowId: string;
  executionId: string;
  orgId: string;

  status: JobStatus;
  priority: number;

  // Execution data
  trigger: {
    type: TriggerType;
    payload?: Record<string, unknown>;
    source?: {
      ip?: string;
      userAgent?: string;
      userId?: string;
    };
  };

  // Scheduling
  runAt: Date;
  lockedAt?: Date;
  lockedBy?: string;

  // Retry handling
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: Date;

  // Timestamps
  createdAt: Date;
  completedAt?: Date;

  // TTL for cleanup
  expiresAt: Date;

  // Result (for completed jobs)
  result?: unknown;
}

// ============================================
// NODE EXECUTOR TYPES
// ============================================

/**
 * Context passed to node executors at runtime
 */
export interface NodeExecutionContext {
  // Workflow info
  workflowId: string;
  executionId: string;
  nodeId: string;
  orgId: string;

  // Input data from connected nodes
  inputs: Record<string, unknown>;

  // Node configuration
  config: Record<string, unknown>;

  // Workflow variables
  variables: Record<string, unknown>;

  // Previous node outputs
  nodeOutputs: Record<string, Record<string, unknown>>;

  // Logging
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) => Promise<void>;
}

/**
 * Result returned by node executors
 */
export interface NodeExecutionResult {
  success: boolean;
  data: Record<string, unknown>;  // Port ID → output value
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  metadata?: {
    durationMs: number;
    bytesProcessed?: number;
  };
}

/**
 * Node executor function signature
 */
export type NodeExecutor = (context: NodeExecutionContext) => Promise<NodeExecutionResult>;

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  tags?: string[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  canvas?: WorkflowCanvas;
  settings?: Partial<WorkflowSettings>;
  variables?: WorkflowVariable[];
  tags?: string[];
  status?: WorkflowStatus;
}

export interface WorkflowListResponse {
  workflows: WorkflowDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExecuteWorkflowRequest {
  trigger?: {
    type: TriggerType;
    payload?: Record<string, unknown>;
  };
}

export interface ExecuteWorkflowResponse {
  executionId: string;
  status: ExecutionStatus;
}

export interface ExecutionStatusResponse {
  execution: WorkflowExecution;
  logs?: ExecutionLog[];
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Simplified JSON Schema definition
 */
export interface JSONSchemaDefinition {
  type?: string | string[];
  properties?: Record<string, JSONSchemaDefinition>;
  items?: JSONSchemaDefinition;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  title?: string;
  description?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JSONSchemaDefinition;
  oneOf?: JSONSchemaDefinition[];
  anyOf?: JSONSchemaDefinition[];
  allOf?: JSONSchemaDefinition[];
  'x-component'?: string;        // Custom UI component hint
}

/**
 * Default workflow settings
 */
export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  executionMode: 'auto',
  maxExecutionTime: 300000,      // 5 minutes
  retryPolicy: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
  },
  errorHandling: 'stop',
  timezone: 'UTC',
};

/**
 * Default workflow stats
 */
export const DEFAULT_WORKFLOW_STATS: WorkflowStats = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  avgExecutionTimeMs: 0,
};

/**
 * Generate a new empty workflow canvas
 */
export function createEmptyCanvas(): WorkflowCanvas {
  return {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}
