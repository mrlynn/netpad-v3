/**
 * WorkflowRenderer - Main component for @netpad/workflow-renderer
 *
 * Renders NetPad workflow definitions as interactive, read-only visualizations.
 */

import React, { useMemo, useCallback, type CSSProperties } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  BackgroundVariant as RFBackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ThemeContext } from './hooks/useTheme';
import { nodeRegistry } from './nodes';
import { edgeRegistry } from './edges';
import { darkTheme } from './themes/dark';
import { lightTheme } from './themes/light';
import { getThemeCSSVariables } from './themes/createTheme';
import { ensureNodePositions } from './layout/autoLayout';
import type { WorkflowRendererProps } from './types/props';
import type { RendererTheme } from './types/theme';
import type { WorkflowNode, WorkflowEdge, NodeData } from './types/workflow';

/**
 * Convert workflow nodes to ReactFlow nodes
 */
function toReactFlowNodes(nodes: WorkflowNode[]): Node<NodeData>[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position || { x: 0, y: 0 },
    data: node.data,
    width: node.width,
    height: node.height,
    selectable: true,
    draggable: false,
    connectable: false,
  }));
}

/**
 * Convert workflow edges to ReactFlow edges
 */
function toReactFlowEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type || 'default',
    data: edge.data,
    animated: edge.animated || edge.type === 'animated',
    selectable: true,
  }));
}

/**
 * Resolve theme from prop
 */
function resolveTheme(theme?: 'light' | 'dark' | RendererTheme): RendererTheme {
  if (!theme || theme === 'dark') return darkTheme;
  if (theme === 'light') return lightTheme;
  return theme;
}

/**
 * Map background variant to ReactFlow variant
 */
function mapBackgroundVariant(variant?: 'dots' | 'lines' | 'none'): RFBackgroundVariant {
  switch (variant) {
    case 'dots':
      return RFBackgroundVariant.Dots;
    case 'lines':
      return RFBackgroundVariant.Lines;
    case 'none':
    default:
      return RFBackgroundVariant.Dots;
  }
}

/**
 * Map minimap position to CSS
 */
function getMinimapStyle(position?: string): CSSProperties {
  switch (position) {
    case 'top-left':
      return { top: 10, left: 10, bottom: 'auto', right: 'auto' };
    case 'top-right':
      return { top: 10, right: 10, bottom: 'auto', left: 'auto' };
    case 'bottom-left':
      return { bottom: 10, left: 10, top: 'auto', right: 'auto' };
    case 'bottom-right':
    default:
      return { bottom: 10, right: 10, top: 'auto', left: 'auto' };
  }
}

/**
 * WorkflowRenderer component
 *
 * @example
 * ```tsx
 * import { WorkflowRenderer } from '@netpad/workflow-renderer';
 * import '@netpad/workflow-renderer/styles.css';
 *
 * function App() {
 *   return (
 *     <WorkflowRenderer
 *       workflow={workflow}
 *       height={400}
 *       theme="dark"
 *       showMinimap
 *       fitView
 *     />
 *   );
 * }
 * ```
 */
export function WorkflowRenderer({
  // Required
  workflow,
  height,

  // Dimensions
  width = '100%',

  // Layout
  autoLayout = false,
  layoutDirection = 'TB',
  nodeSpacing = 50,
  rankSpacing = 100,

  // Appearance
  theme: themeProp = 'dark',
  showMinimap = false,
  minimapPosition = 'bottom-right',
  showControls = true,
  showBackground = true,
  backgroundVariant = 'dots',
  showWatermark = true,
  watermarkPosition = 'bottom-right',

  // Interaction
  pannable = true,
  zoomable = true,
  minZoom = 0.25,
  maxZoom = 2,
  defaultZoom = 1,
  fitView = true,
  fitViewPadding = 0.2,

  // Callbacks
  onNodeClick,
  onEdgeClick,
  onLoad,

  // Advanced
  customNodes,
  customEdges,
  className,
  style,
}: WorkflowRendererProps) {
  // Resolve theme
  const theme = useMemo(() => resolveTheme(themeProp), [themeProp]);

  // Apply auto-layout if needed
  const layoutedWorkflow = useMemo(() => {
    if (autoLayout) {
      return ensureNodePositions(workflow, layoutDirection);
    }
    return workflow;
  }, [workflow, autoLayout, layoutDirection, nodeSpacing, rankSpacing]);

  // Convert to ReactFlow format
  const nodes = useMemo(
    () => toReactFlowNodes(layoutedWorkflow.nodes),
    [layoutedWorkflow.nodes]
  );

  const edges = useMemo(
    () => toReactFlowEdges(layoutedWorkflow.edges),
    [layoutedWorkflow.edges]
  );

  // Merge node types
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      ...nodeRegistry,
      ...customNodes,
    }),
    [customNodes]
  );

  // Merge edge types
  const edgeTypes = useMemo<EdgeTypes>(
    () => ({
      ...edgeRegistry,
      ...customEdges,
    }),
    [customEdges]
  );

  // Event handlers
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      if (onNodeClick) {
        const workflowNode = layoutedWorkflow.nodes.find((n) => n.id === node.id);
        if (workflowNode) {
          onNodeClick(workflowNode);
        }
      }
    },
    [onNodeClick, layoutedWorkflow.nodes]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        const workflowEdge = layoutedWorkflow.edges.find((e) => e.id === edge.id);
        if (workflowEdge) {
          onEdgeClick(workflowEdge);
        }
      }
    },
    [onEdgeClick, layoutedWorkflow.edges]
  );

  const handleInit = useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  // CSS variables from theme
  const cssVariables = useMemo(() => getThemeCSSVariables(theme), [theme]);

  // Container styles
  const containerStyle: CSSProperties = {
    width,
    height,
    ...cssVariables,
    ...style,
  };

  // Viewport settings
  const defaultViewport = layoutedWorkflow.viewport || {
    x: 0,
    y: 0,
    zoom: defaultZoom,
  };

  return (
    <ThemeContext.Provider value={theme}>
      <div
        className={`wr-workflow-renderer ${className || ''}`}
        style={containerStyle}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onInit={handleInit}
          defaultViewport={defaultViewport}
          fitView={fitView}
          fitViewOptions={{ padding: fitViewPadding }}
          minZoom={minZoom}
          maxZoom={maxZoom}
          panOnDrag={pannable}
          zoomOnScroll={zoomable}
          zoomOnPinch={zoomable}
          panOnScroll={false}
          selectionOnDrag={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          proOptions={{ hideAttribution: true }}
          style={{ background: theme.canvas.background }}
        >
          {showBackground && backgroundVariant !== 'none' && (
            <Background
              variant={mapBackgroundVariant(backgroundVariant)}
              color={theme.canvas.backgroundPattern}
              gap={16}
              size={1}
            />
          )}

          {showControls && (
            <Controls
              showZoom={zoomable}
              showFitView={true}
              showInteractive={false}
              style={{
                backgroundColor: theme.controls.background,
                borderColor: theme.controls.border,
              }}
            />
          )}

          {showMinimap && (
            <MiniMap
              style={{
                ...getMinimapStyle(minimapPosition),
                backgroundColor: theme.minimap.background,
              }}
              maskColor={theme.minimap.mask}
              nodeColor={theme.minimap.node}
              nodeBorderRadius={4}
              pannable={false}
              zoomable={false}
            />
          )}

          {showWatermark && (
            <Panel
              position={watermarkPosition}
              className="wr-watermark"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0',
                margin: '12px',
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                pointerEvents: 'none',
                userSelect: 'none',
                opacity: 0.25,
                width: 'fit-content',
                minWidth: 'auto',
              }}
            >
              <img
                src="/micro-mark-black-trans.png"
                alt="NetPad"
                style={{
                  height: '11px',
                  width: 'auto',
                  filter: theme.name === 'dark' ? 'invert(1) brightness(1.5)' : 'none',
                }}
              />
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  color: theme.node.textSecondary,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Made with NetPad
              </span>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </ThemeContext.Provider>
  );
}

export default WorkflowRenderer;
