/**
 * Edge exports for @netpad/workflow-renderer
 */

export { DefaultEdge } from './DefaultEdge';
export { ConditionalEdge } from './ConditionalEdge';
export { ErrorEdge } from './ErrorEdge';
export { AnimatedEdge } from './AnimatedEdge';

import type { ComponentType } from 'react';
import { DefaultEdge } from './DefaultEdge';
import { ConditionalEdge } from './ConditionalEdge';
import { ErrorEdge } from './ErrorEdge';
import { AnimatedEdge } from './AnimatedEdge';
import type { EdgeType } from '../types/workflow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEdgeComponent = ComponentType<any>;

/**
 * Registry of all built-in edge components
 */
export const edgeRegistry: Record<EdgeType, AnyEdgeComponent> = {
  default: DefaultEdge,
  conditional: ConditionalEdge,
  error: ErrorEdge,
  animated: AnimatedEdge,
};

/**
 * Get an edge component by type, with fallback to DefaultEdge
 */
export function getEdgeComponent(type: string): AnyEdgeComponent {
  return edgeRegistry[type as EdgeType] || DefaultEdge;
}
