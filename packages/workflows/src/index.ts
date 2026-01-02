/**
 * @netpad/workflows
 *
 * Programmatically trigger and manage NetPad workflows from your applications.
 * Type-safe TypeScript client for NetPad workflow APIs.
 *
 * @example
 * ```typescript
 * import { createNetPadWorkflowClient } from '@netpad/workflows';
 *
 * const client = createNetPadWorkflowClient({
 *   baseUrl: 'https://your-netpad-instance.com',
 *   apiKey: 'np_live_xxx',
 *   organizationId: 'org_123',
 * });
 *
 * // Execute a workflow
 * const execution = await client.executeWorkflow('workflow-123', {
 *   payload: { userId: 'user_456' },
 * });
 *
 * // Wait for completion
 * const result = await client.waitForExecution(execution.executionId);
 * ```
 */

// API Client
export {
  NetPadWorkflowClient,
  NetPadWorkflowError,
  createNetPadWorkflowClient,
} from './client';
export type { NetPadWorkflowClientConfig } from './client';

// Types
export type {
  // Core workflow types
  WorkflowDocument,
  WorkflowStatus,
  WorkflowCanvas,
  WorkflowSettings,
  RetryPolicy,
  WorkflowVariable,
  WorkflowStats,

  // Node types
  WorkflowNode,
  WorkflowEdge,
  DataMapping,
  EdgeStyle,

  // Execution types
  ExecutionStatus,
  ExecutionTrigger,
  ExecutionError,
  ExecutionContext,
  ExecutionMetrics,
  WorkflowExecution,
  ExecutionLog,
  JobDetails,

  // JSON Schema
  JSONSchemaDefinition,

  // API request/response types
  ListWorkflowsOptions,
  ListWorkflowsResponse,
  CreateWorkflowOptions,
  UpdateWorkflowOptions,
  ExecuteWorkflowOptions,
  ExecuteWorkflowResponse,
  ListExecutionsOptions,
  ListExecutionsResponse,
  GetExecutionResponse,
} from './types';
