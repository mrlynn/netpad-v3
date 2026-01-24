/**
 * Core workflow types for @netpad/workflow-renderer
 */

/**
 * Main workflow definition to render
 */
export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: Viewport;
}

/**
 * Individual node in the workflow
 */
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position?: { x: number; y: number };
  data: NodeData;
  width?: number;
  height?: number;
}

/**
 * Node data (varies by type)
 */
export interface NodeData {
  label: string;
  description?: string;
  icon?: string;
  config?: Record<string, unknown>;
  status?: NodeStatus;
  error?: string;
  [key: string]: unknown;
}

/**
 * Node execution status
 */
export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Edge connecting nodes
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: EdgeType;
  data?: EdgeData;
  animated?: boolean;
}

/**
 * Edge data
 */
export interface EdgeData {
  label?: string;
  condition?: string;
  [key: string]: unknown;
}

/**
 * Viewport state
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * All supported node types
 */
export type NodeType =
  // Triggers (4)
  | 'form_trigger'
  | 'webhook_trigger'
  | 'schedule_trigger'
  | 'manual_trigger'
  // Logic (6)
  | 'filter'
  | 'switch'
  | 'delay'
  | 'loop'
  | 'parallel'
  | 'merge'
  // Data (5)
  | 'mongodb_query'
  | 'mongodb_insert'
  | 'mongodb_update'
  | 'mongodb_delete'
  | 'transform'
  // Actions (7)
  | 'email_send'
  | 'slack_send'
  | 'webhook_call'
  | 'http_request'
  | 'sms_send'
  | 'push_notification'
  | 'function'
  // AI (4)
  | 'llm_generate'
  | 'llm_classify'
  | 'llm_extract'
  | 'llm_summarize'
  // Utility (3)
  | 'note'
  | 'variable_set'
  | 'variable_get'
  // Output (1)
  | 'html_output';

/**
 * Edge types
 */
export type EdgeType =
  | 'default'
  | 'conditional'
  | 'error'
  | 'animated';

/**
 * Node category for color coding
 */
export type NodeCategory =
  | 'trigger'
  | 'logic'
  | 'data'
  | 'action'
  | 'ai'
  | 'utility'
  | 'output';

/**
 * Map node types to their categories
 */
export const NODE_CATEGORIES: Record<NodeType, NodeCategory> = {
  // Triggers
  form_trigger: 'trigger',
  webhook_trigger: 'trigger',
  schedule_trigger: 'trigger',
  manual_trigger: 'trigger',
  // Logic
  filter: 'logic',
  switch: 'logic',
  delay: 'logic',
  loop: 'logic',
  parallel: 'logic',
  merge: 'logic',
  // Data
  mongodb_query: 'data',
  mongodb_insert: 'data',
  mongodb_update: 'data',
  mongodb_delete: 'data',
  transform: 'data',
  // Actions
  email_send: 'action',
  slack_send: 'action',
  webhook_call: 'action',
  http_request: 'action',
  sms_send: 'action',
  push_notification: 'action',
  function: 'action',
  // AI
  llm_generate: 'ai',
  llm_classify: 'ai',
  llm_extract: 'ai',
  llm_summarize: 'ai',
  // Utility
  note: 'utility',
  variable_set: 'utility',
  variable_get: 'utility',
  // Output
  html_output: 'output',
};

/**
 * Output handle definition for multi-output nodes
 */
export interface OutputHandleDefinition {
  id: string;
  label: string;
  description?: string;
  color?: string;
}

/**
 * Logic node output configurations
 */
export const LOGIC_NODE_OUTPUTS: Record<string, OutputHandleDefinition[]> = {
  filter: [
    { id: 'yes', label: 'Yes', description: 'Matches condition', color: '#10B981' },
    { id: 'no', label: 'No', description: 'Does not match condition', color: '#EF4444' },
  ],
  switch: [
    { id: 'default', label: 'Default', description: 'No case matched' },
  ],
  loop: [
    { id: 'loop', label: 'Each', description: 'For each iteration' },
    { id: 'done', label: 'Done', description: 'After all iterations', color: '#10B981' },
  ],
  parallel: [
    { id: 'branch_1', label: 'Branch 1' },
    { id: 'branch_2', label: 'Branch 2' },
  ],
};

/**
 * Props for custom node components
 * Simplified from @xyflow/react NodeProps for our use case
 */
export interface RendererNodeProps {
  id: string;
  data: NodeData;
  selected?: boolean;
  dragging?: boolean;
}
