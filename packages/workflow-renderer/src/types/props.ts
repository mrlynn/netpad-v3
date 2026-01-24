/**
 * Component prop types for @netpad/workflow-renderer
 */

import type { CSSProperties, ComponentType } from 'react';
import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from './workflow';
import type { RendererTheme } from './theme';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

/**
 * Main WorkflowRenderer component props
 */
export interface WorkflowRendererProps {
  // === REQUIRED ===

  /** Workflow definition to render */
  workflow: WorkflowDefinition;

  // === DIMENSIONS ===

  /** Height of the renderer (required for proper sizing) */
  height: number | string;

  /** Width of the renderer */
  width?: number | string;

  // === LAYOUT ===

  /** Enable auto-layout for workflows without position data */
  autoLayout?: boolean;

  /** Direction for auto-layout */
  layoutDirection?: LayoutDirection;

  /** Spacing between nodes (auto-layout) */
  nodeSpacing?: number;

  /** Spacing between ranks/levels (auto-layout) */
  rankSpacing?: number;

  // === APPEARANCE ===

  /** Theme preset or custom theme */
  theme?: 'light' | 'dark' | RendererTheme;

  /** Show minimap */
  showMinimap?: boolean;

  /** Minimap position */
  minimapPosition?: MinimapPosition;

  /** Show zoom controls */
  showControls?: boolean;

  /** Show background grid/dots */
  showBackground?: boolean;

  /** Background variant */
  backgroundVariant?: BackgroundVariant;

  // === INTERACTION ===

  /** Allow panning */
  pannable?: boolean;

  /** Allow zooming */
  zoomable?: boolean;

  /** Min zoom level */
  minZoom?: number;

  /** Max zoom level */
  maxZoom?: number;

  /** Initial zoom level */
  defaultZoom?: number;

  /** Fit view to show all nodes on load */
  fitView?: boolean;

  /** Padding around fitted view */
  fitViewPadding?: number;

  // === CALLBACKS ===

  /** Called when a node is clicked */
  onNodeClick?: (node: WorkflowNode) => void;

  /** Called when an edge is clicked */
  onEdgeClick?: (edge: WorkflowEdge) => void;

  /** Called when renderer is ready */
  onLoad?: () => void;

  // === ADVANCED ===

  /** Custom node type components (override defaults) */
  customNodes?: Record<string, AnyComponent>;

  /** Custom edge type components (override defaults) */
  customEdges?: Record<string, AnyComponent>;

  /** Additional class name */
  className?: string;

  /** Additional inline styles */
  style?: CSSProperties;
}

/**
 * Layout direction for auto-layout
 */
export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';

/**
 * Minimap position
 */
export type MinimapPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Background variant
 */
export type BackgroundVariant = 'dots' | 'lines' | 'none';

/**
 * WorkflowMinimap component props
 */
export interface WorkflowMinimapProps {
  /** Position on screen */
  position?: MinimapPosition;

  /** Width of minimap */
  width?: number;

  /** Height of minimap */
  height?: number;

  /** Node color or color function */
  nodeColor?: string | ((node: WorkflowNode) => string);

  /** Mask color (area outside viewport) */
  maskColor?: string;

  /** Additional class name */
  className?: string;
}

/**
 * Base node component props
 */
export interface BaseNodeProps {
  /** Node category for styling */
  category: 'trigger' | 'logic' | 'data' | 'action' | 'ai' | 'utility';

  /** Icon to display */
  icon: string;

  /** Node label */
  label: string;

  /** Optional description */
  description?: string;

  /** Whether node is selected */
  selected?: boolean;

  /** Config preview text */
  configPreview?: string;

  /** Number of input handles */
  inputHandles?: number;

  /** Number of output handles */
  outputHandles?: number;

  /** Custom output handle definitions */
  outputHandleDefs?: Array<{
    id: string;
    label: string;
    color?: string;
  }>;

  /** Node status */
  status?: 'idle' | 'running' | 'success' | 'error';

  /** Error message */
  error?: string;
}

/**
 * Layout options for auto-layout
 */
export interface LayoutOptions {
  /** Layout direction */
  direction: LayoutDirection;

  /** Horizontal spacing between nodes */
  nodeSpacing: number;

  /** Vertical spacing between ranks */
  rankSpacing: number;

  /** Algorithm for ranking nodes */
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';

  /** Alignment within rank */
  align?: 'UL' | 'UR' | 'DL' | 'DR';
}
