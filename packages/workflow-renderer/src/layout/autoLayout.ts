/**
 * Auto-layout function for @netpad/workflow-renderer
 */

import type { WorkflowDefinition, WorkflowNode } from '../types/workflow';
import type { LayoutOptions, LayoutDirection } from '../types/props';
import { applyDagreLayout, needsAutoLayout, getDefaultPosition } from './dagre';

/**
 * Default layout options
 */
export const defaultLayoutOptions: LayoutOptions = {
  direction: 'TB',
  nodeSpacing: 50,
  rankSpacing: 100,
  ranker: 'network-simplex',
};

/**
 * Apply auto-layout to a workflow definition
 *
 * @param workflow - The workflow to layout
 * @param options - Layout options (optional, uses defaults if not specified)
 * @returns A new workflow definition with positioned nodes
 *
 * @example
 * ```tsx
 * import { autoLayout } from '@netpad/workflow-renderer/layout';
 *
 * const layoutedWorkflow = autoLayout(workflow, {
 *   direction: 'LR',
 *   nodeSpacing: 80,
 * });
 * ```
 */
export function autoLayout(
  workflow: WorkflowDefinition,
  options?: Partial<LayoutOptions>
): WorkflowDefinition {
  const layoutOptions: LayoutOptions = {
    ...defaultLayoutOptions,
    ...options,
  };

  // If no nodes, return as-is
  if (workflow.nodes.length === 0) {
    return workflow;
  }

  // If only one node and no position, give it a default position
  if (workflow.nodes.length === 1 && !workflow.nodes[0].position) {
    return {
      ...workflow,
      nodes: [
        {
          ...workflow.nodes[0],
          position: { x: 100, y: 100 },
        },
      ],
    };
  }

  // Apply Dagre layout
  const layoutedNodes = applyDagreLayout(
    workflow.nodes,
    workflow.edges,
    layoutOptions
  );

  // Ensure all nodes have positions (fallback for disconnected nodes)
  const nodesWithPositions = layoutedNodes.map((node, index) => {
    if (!node.position) {
      return {
        ...node,
        position: getDefaultPosition(index),
      };
    }
    return node;
  });

  return {
    ...workflow,
    nodes: nodesWithPositions,
  };
}

/**
 * Check if a workflow needs auto-layout (has nodes without positions)
 */
export function workflowNeedsLayout(workflow: WorkflowDefinition): boolean {
  return needsAutoLayout(workflow.nodes);
}

/**
 * Ensure all nodes have position data, applying auto-layout if needed
 */
export function ensureNodePositions(
  workflow: WorkflowDefinition,
  direction?: LayoutDirection
): WorkflowDefinition {
  if (!workflowNeedsLayout(workflow)) {
    return workflow;
  }

  return autoLayout(workflow, direction ? { direction } : undefined);
}
