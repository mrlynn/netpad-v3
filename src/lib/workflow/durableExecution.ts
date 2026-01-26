/**
 * Durable Execution Integration
 *
 * This module provides the bridge between NetPad's open-core workflow executor
 * and the premium durable execution engine from @netpad/cloud-features.
 *
 * Architecture:
 * - Open Core: Single-pass workflow executor (src/lib/workflow/executor.ts)
 * - Premium Cloud: Durable execution engine with state persistence, approvals, timers
 *
 * The durable execution engine is conditionally loaded when:
 * 1. @netpad/cloud-features package is installed
 * 2. Workflow requires durable features (approval nodes, long delays, signals)
 * 3. Organization has cloud premium features enabled
 */

import { WorkflowDocument, WorkflowJob } from '@/types/workflow';

// ============================================
// TYPES
// ============================================

/**
 * Execution mode determines which executor processes the workflow
 */
export type ExecutionMode = 'standard' | 'durable';

/**
 * Result from durable execution processing
 */
export interface DurableProcessResult {
  status: 'completed' | 'failed' | 'waiting';
  completedNodes: string[];
  failedNodes: string[];
  error?: {
    nodeId: string;
    code: string;
    message: string;
  };
  waitingFor?: {
    type: 'approval' | 'timer' | 'signal';
    approvalId?: string;
    resumeAt?: Date;
  };
  output?: Record<string, unknown>;
}

/**
 * Interface for the durable execution engine
 */
export interface DurableExecutionEngine {
  processExecution(
    executionId: string,
    workflow: { _id: unknown; canvas: { nodes: unknown[]; edges: unknown[] } },
    services: unknown,
    organization: unknown,
  ): Promise<DurableProcessResult>;

  resumeExecution(executionId: string): Promise<DurableProcessResult>;

  cancelExecution(executionId: string, reason: string): Promise<void>;
}

/**
 * Interface for the durable execution module
 */
export interface DurableExecutionModule {
  createExecutionEngine(options: {
    db: unknown;
    services: unknown;
  }): DurableExecutionEngine;

  requiresDurableExecution(workflow: {
    canvas: { nodes: Array<{ type: string; data?: { config?: unknown } }> };
  }): boolean;

  DURABLE_ONLY_NODE_TYPES: readonly string[];
}

// ============================================
// DURABLE EXECUTION DETECTION
// ============================================

let _durableModule: DurableExecutionModule | null = null;
let _detectionAttempted = false;

/**
 * Check if the durable execution package is available
 * Uses dynamic import to avoid build-time dependency
 */
export async function isDurableExecutionAvailable(): Promise<boolean> {
  if (_detectionAttempted) {
    return _durableModule !== null;
  }

  _detectionAttempted = true;

  try {
    // Dynamic import to avoid build-time dependency
    // This package is optional and only available in cloud deployments
    const pkgName = '@netpad/cloud-features';
    const cloudFeatures = await new Function('p', 'return import(p)')(pkgName);

    if (
      cloudFeatures &&
      typeof cloudFeatures.createDurableExecutionEngine === 'function' &&
      typeof cloudFeatures.requiresDurableExecution === 'function'
    ) {
      _durableModule = {
        createExecutionEngine: cloudFeatures.createDurableExecutionEngine,
        requiresDurableExecution: cloudFeatures.requiresDurableExecution,
        DURABLE_ONLY_NODE_TYPES:
          cloudFeatures.DURABLE_ONLY_NODE_TYPES || [],
      };
      console.log('[DurableExecution] Cloud features module loaded successfully');
      return true;
    }

    console.log('[DurableExecution] Cloud features module missing required exports');
    return false;
  } catch (error) {
    // Package not installed - this is expected in open-source deployments
    console.log('[DurableExecution] Cloud features not available, using standard executor');
    return false;
  }
}

/**
 * Get the durable execution module (if available)
 */
export async function getDurableExecutionModule(): Promise<DurableExecutionModule | null> {
  if (!_detectionAttempted) {
    await isDurableExecutionAvailable();
  }
  return _durableModule;
}

// ============================================
// EXECUTION MODE DETECTION
// ============================================

/**
 * Node types that require durable execution (cloud-only)
 * These nodes need state persistence and resumption capabilities
 */
export const DURABLE_ONLY_NODE_TYPES = [
  'approval', // Human-in-the-loop approval
  'wait_for_signal', // External signal reception
  'manual_task', // Manual intervention points
  'durable_delay', // Long-running delays (> 1 hour)
] as const;

/**
 * Check if a workflow requires durable execution
 * Called before execution to determine which engine to use
 */
export function requiresDurableExecution(workflow: WorkflowDocument): boolean {
  // Check explicit settings first
  const durableSettings = workflow.settings?.durableExecution;
  if (durableSettings) {
    if (durableSettings.mode === 'always') {
      return true;
    }
    if (durableSettings.mode === 'never') {
      return false;
    }
    // mode === 'auto' falls through to node-based detection
  }

  const { nodes } = workflow.canvas;

  for (const node of nodes) {
    // Check if it's a durable-only node type
    if (DURABLE_ONLY_NODE_TYPES.includes(node.type as typeof DURABLE_ONLY_NODE_TYPES[number])) {
      return true;
    }

    // Check if node has explicit retry policy (requires state tracking)
    if (node.retryPolicy && node.retryPolicy.maxRetries > 0) {
      return true;
    }

    // Check for long delays (> 1 hour)
    if (node.type === 'delay') {
      const duration = (node.config as { duration?: string | number })?.duration;
      if (duration) {
        const durationMs = parseDurationToMs(duration);
        if (durationMs > 60 * 60 * 1000) {
          // > 1 hour
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Determine the execution mode for a workflow
 */
export async function getExecutionMode(
  workflow: WorkflowDocument,
  _orgId: string,
): Promise<ExecutionMode> {
  // Check if workflow explicitly requires durable execution
  if (requiresDurableExecution(workflow)) {
    // Only use durable if it's available
    const available = await isDurableExecutionAvailable();
    if (available) {
      return 'durable';
    }
    // Log warning if durable is required but not available
    console.warn(
      `[DurableExecution] Workflow ${workflow.id} requires durable execution but cloud features not available. ` +
        'Using standard executor - some features may not work correctly.',
    );
  }

  // Default to standard execution
  return 'standard';
}

// ============================================
// EXECUTION BRIDGE
// ============================================

let _durableEngine: DurableExecutionEngine | null = null;

/**
 * Get or create the durable execution engine
 */
export async function getDurableExecutionEngine(
  db: unknown,
  services: unknown,
): Promise<DurableExecutionEngine | null> {
  const module = await getDurableExecutionModule();
  if (!module) {
    return null;
  }

  if (!_durableEngine) {
    _durableEngine = module.createExecutionEngine({
      db,
      services,
    });
  }

  return _durableEngine;
}

/**
 * Execute a workflow job using the durable execution engine
 * This is the main entry point for cloud premium workflow execution
 */
export async function executeDurableWorkflowJob(
  job: WorkflowJob,
  workflow: WorkflowDocument,
  db: unknown,
  services: unknown,
  organization: unknown,
): Promise<DurableProcessResult> {
  const engine = await getDurableExecutionEngine(db, services);

  if (!engine) {
    return {
      status: 'failed',
      completedNodes: [],
      failedNodes: [],
      error: {
        nodeId: 'system',
        code: 'DURABLE_EXECUTION_UNAVAILABLE',
        message:
          'Durable execution engine not available. Install @netpad/cloud-features for this feature.',
      },
    };
  }

  try {
    const result = await engine.processExecution(
      job.executionId,
      {
        _id: workflow._id,
        canvas: workflow.canvas,
      },
      services,
      organization,
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DurableExecution] Execution failed:', error);

    return {
      status: 'failed',
      completedNodes: [],
      failedNodes: [],
      error: {
        nodeId: 'system',
        code: 'DURABLE_EXECUTION_ERROR',
        message: errorMessage,
      },
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Parse duration string to milliseconds
 * Supports: ISO 8601 (PT1H, P1D), simple seconds, human-readable (1h, 30m)
 */
function parseDurationToMs(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration;
  }

  // ISO 8601 duration (P1D, PT1H, PT30M, PT1H30M)
  const isoMatch = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (isoMatch) {
    const [, days, hours, minutes, seconds] = isoMatch;
    let ms = 0;
    if (days) ms += parseInt(days, 10) * 24 * 60 * 60 * 1000;
    if (hours) ms += parseInt(hours, 10) * 60 * 60 * 1000;
    if (minutes) ms += parseInt(minutes, 10) * 60 * 1000;
    if (seconds) ms += parseInt(seconds, 10) * 1000;
    return ms;
  }

  // Human-readable (1h, 30m, 1d, 1w)
  const humanMatch = duration.match(/^(\d+)(s|m|h|d|w)$/i);
  if (humanMatch) {
    const [, value, unit] = humanMatch;
    const num = parseInt(value, 10);
    switch (unit.toLowerCase()) {
      case 's':
        return num * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'h':
        return num * 60 * 60 * 1000;
      case 'd':
        return num * 24 * 60 * 60 * 1000;
      case 'w':
        return num * 7 * 24 * 60 * 60 * 1000;
    }
  }

  // Plain number (assume milliseconds)
  const num = parseInt(duration, 10);
  if (!isNaN(num)) {
    return num;
  }

  return 0;
}

/**
 * Check if a node type is durable-only
 */
export function isDurableOnlyNodeType(nodeType: string): boolean {
  return DURABLE_ONLY_NODE_TYPES.includes(nodeType as typeof DURABLE_ONLY_NODE_TYPES[number]);
}

/**
 * Get list of durable-only nodes in a workflow
 * Useful for displaying upgrade prompts in the UI
 */
export function getDurableOnlyNodes(workflow: WorkflowDocument): string[] {
  return workflow.canvas.nodes
    .filter((node) => isDurableOnlyNodeType(node.type))
    .map((node) => node.id);
}

// ============================================
// RESET FUNCTIONS (for testing)
// ============================================

/**
 * Reset the module state (for testing only)
 */
export function __resetForTesting(): void {
  _durableModule = null;
  _detectionAttempted = false;
  _durableEngine = null;
}
