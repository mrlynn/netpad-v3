/**
 * Dagre layout utilities for @netpad/workflow-renderer
 */

import dagre from '@dagrejs/dagre';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type { LayoutOptions } from '../types/props';

/**
 * Default node dimensions for layout calculation
 */
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 80;

/**
 * Apply Dagre layout to workflow nodes
 */
export function applyDagreLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: LayoutOptions
): WorkflowNode[] {
  const g = new dagre.graphlib.Graph();

  // Set graph options
  g.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeSpacing,
    ranksep: options.rankSpacing,
    ranker: options.ranker || 'network-simplex',
    align: options.align,
    marginx: 20,
    marginy: 20,
  });

  // Default edge label to empty object
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to the graph
  nodes.forEach((node) => {
    const width = node.width || DEFAULT_NODE_WIDTH;
    const height = node.height || DEFAULT_NODE_HEIGHT;
    g.setNode(node.id, { width, height });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(g);

  // Apply calculated positions to nodes
  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    if (nodeWithPosition) {
      const width = node.width || DEFAULT_NODE_WIDTH;
      const height = node.height || DEFAULT_NODE_HEIGHT;

      return {
        ...node,
        position: {
          // Dagre returns center position, convert to top-left
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      };
    }
    return node;
  });
}

/**
 * Check if any nodes are missing position data
 */
export function needsAutoLayout(nodes: WorkflowNode[]): boolean {
  return nodes.some((node) => !node.position);
}

/**
 * Get default position for a node if not specified
 */
export function getDefaultPosition(index: number): { x: number; y: number } {
  const col = Math.floor(index / 5);
  const row = index % 5;
  return {
    x: col * 250 + 50,
    y: row * 120 + 50,
  };
}
