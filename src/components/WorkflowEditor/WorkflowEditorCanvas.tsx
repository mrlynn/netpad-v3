'use client';

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  NodeTypes,
  EdgeTypes,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  BackgroundVariant,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Box, useTheme } from '@mui/material';
import { nanoid } from 'nanoid';
import { useWorkflowStore, useWorkflowEditor, useWorkflowActions } from '@/contexts/WorkflowContext';
import { WorkflowNode, WorkflowEdge, NodeDefinition } from '@/types/workflow';

// Node components
import { BaseNode } from './Nodes/BaseNode';
import { TriggerNode } from './Nodes/TriggerNode';

// Custom node types mapping
const nodeTypes: NodeTypes = {
  // Default node type
  default: BaseNode,
  // Trigger nodes
  'manual-trigger': TriggerNode,
  'form-trigger': TriggerNode,
  'webhook-trigger': TriggerNode,
  'schedule-trigger': TriggerNode,
  // Logic nodes
  'conditional': BaseNode,
  'switch': BaseNode,
  'loop': BaseNode,
  'delay': BaseNode,
  // Action nodes
  'http-request': BaseNode,
  'email-send': BaseNode,
  'notification': BaseNode,
  // Data nodes
  'transform': BaseNode,
  'filter': BaseNode,
  'merge': BaseNode,
  'mongodb-query': BaseNode,
  'mongodb-write': BaseNode,
  // AI nodes
  'ai-prompt': BaseNode,
  'ai-classify': BaseNode,
  'ai-extract': BaseNode,
};

// Custom edge types (can add custom edges later)
const edgeTypes: EdgeTypes = {
  // default is fine for now
};

interface WorkflowEditorCanvasProps {
  onNodeSelect?: (nodeId: string | null) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onEdgeDoubleClick?: (edgeId: string) => void;
  readOnly?: boolean;
}

export function WorkflowEditorCanvas({
  onNodeSelect,
  onEdgeSelect,
  onNodeDoubleClick,
  onEdgeDoubleClick,
  readOnly = false,
}: WorkflowEditorCanvasProps) {
  const theme = useTheme();
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Get workflow state
  const { workflow, nodes: workflowNodes, edges: workflowEdges, selectedNodeId } = useWorkflowEditor();
  const {
    addNode,
    updateNode,
    removeNode,
    moveNode,
    addEdge: addWorkflowEdge,
    removeEdge,
    selectNode,
    selectEdge,
    setViewport,
  } = useWorkflowActions();

  // Track the workflow ID to detect when we switch workflows
  const currentWorkflowIdRef = useRef<string | null>(null);

  // Convert workflow nodes to React Flow format
  const convertToFlowNodes = useCallback((wfNodes: typeof workflowNodes): Node[] => {
    return wfNodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node,
        label: node.label || getNodeLabel(node.type),
      },
      selected: node.id === selectedNodeId,
      draggable: !readOnly,
      selectable: true,
    }));
  }, [selectedNodeId, readOnly]);

  // Local state for nodes - React Flow controls this directly
  const [nodes, setNodes] = useState<Node[]>(() => convertToFlowNodes(workflowNodes));

  // Track previous node IDs to detect additions/removals
  const prevNodeIdsRef = useRef<Set<string>>(new Set(workflowNodes.map(n => n.id)));

  // Sync from store ONLY when:
  // 1. Workflow changes (different workflow loaded)
  // 2. Nodes are added or removed
  // 3. Node data changes (not position)
  useEffect(() => {
    const workflowChanged = workflow?.id !== currentWorkflowIdRef.current;
    currentWorkflowIdRef.current = workflow?.id || null;

    // Get current node IDs
    const currentNodeIds = new Set(workflowNodes.map(n => n.id));
    const prevNodeIds = prevNodeIdsRef.current;

    // Check if nodes were added or removed
    const nodesAdded = [...currentNodeIds].some(id => !prevNodeIds.has(id));
    const nodesRemoved = [...prevNodeIds].some(id => !currentNodeIds.has(id));
    const nodeCountChanged = nodesAdded || nodesRemoved;

    prevNodeIdsRef.current = currentNodeIds;

    // Full sync if workflow changed or nodes added/removed
    if (workflowChanged || nodeCountChanged) {
      setNodes(convertToFlowNodes(workflowNodes));
      return;
    }

    // For other changes (like selection), update only non-position properties
    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        const storeNode = workflowNodes.find((n) => n.id === node.id);
        if (!storeNode) return node;

        // Keep local position, update other properties
        return {
          ...node,
          selected: storeNode.id === selectedNodeId,
          data: {
            ...storeNode,
            label: storeNode.label || getNodeLabel(storeNode.type),
          },
        };
      });
    });
  }, [workflow?.id, workflowNodes, selectedNodeId, convertToFlowNodes]);

  // Convert workflow edges to React Flow format
  const edges: Edge[] = useMemo(() => {
    return workflowEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      animated: edge.animated,
      label: edge.condition?.label,
      style: edge.style ? {
        stroke: edge.style.stroke,
        strokeWidth: edge.style.strokeWidth,
      } : undefined,
    }));
  }, [workflowEdges]);

  // Handle node changes (move, select, remove)
  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    if (readOnly) return;

    // Apply all changes to local state for smooth visual updates
    setNodes((nds) => applyNodeChanges(changes, nds));

    // Handle specific change types that need to be persisted to store
    changes.forEach((change) => {
      switch (change.type) {
        case 'position':
          // Only persist to store when drag ends (not during dragging)
          if (change.dragging === false && change.position) {
            moveNode(change.id, change.position);
          }
          break;
        case 'select':
          if (change.selected) {
            selectNode(change.id);
            onNodeSelect?.(change.id);
          }
          break;
        case 'remove':
          removeNode(change.id);
          break;
      }
    });
  }, [readOnly, moveNode, selectNode, removeNode, onNodeSelect]);

  // Handle edge changes (select, remove)
  const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (readOnly) return;

    changes.forEach((change) => {
      switch (change.type) {
        case 'select':
          if (change.selected) {
            selectEdge(change.id);
            onEdgeSelect?.(change.id);
          }
          break;
        case 'remove':
          removeEdge(change.id);
          break;
      }
    });
  }, [readOnly, selectEdge, removeEdge, onEdgeSelect]);

  // Handle new connections
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (readOnly) return;
    if (!connection.source || !connection.target) return;

    const newEdge: WorkflowEdge = {
      id: `edge_${nanoid(8)}`,
      source: connection.source,
      sourceHandle: connection.sourceHandle || 'output',
      target: connection.target,
      targetHandle: connection.targetHandle || 'input',
    };

    addWorkflowEdge(newEdge);
  }, [readOnly, addWorkflowEdge]);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
    onNodeSelect?.(null);
    onEdgeSelect?.(null);
  }, [selectNode, selectEdge, onNodeSelect, onEdgeSelect]);

  // Handle node double-click (open config)
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onNodeDoubleClick?.(node.id);
  }, [onNodeDoubleClick]);

  // Handle edge double-click (open config)
  const handleEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    selectEdge(edge.id);
    onEdgeDoubleClick?.(edge.id);
  }, [selectEdge, onEdgeDoubleClick]);

  // Handle viewport changes
  const onMoveEnd = useCallback((event: any, viewport: { x: number; y: number; zoom: number }) => {
    setViewport(viewport);
  }, [setViewport]);

  // Handle drop (for drag and drop from palette)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    if (readOnly || !reactFlowInstance.current) return;

    const nodeType = event.dataTransfer.getData('application/reactflow-nodetype');
    const nodeData = event.dataTransfer.getData('application/reactflow-nodedata');

    if (!nodeType) return;

    // Get position in flow coordinates
    const position = reactFlowInstance.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Create new node
    const newNode: WorkflowNode = {
      id: `${nodeType}_${nanoid(8)}`,
      type: nodeType,
      position,
      config: nodeData ? JSON.parse(nodeData) : {},
      enabled: true,
    };

    addNode(newNode);
  }, [readOnly, addNode]);

  // Initialize React Flow instance
  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;

    // Restore viewport if available
    if (workflow?.canvas.viewport) {
      instance.setViewport(workflow.canvas.viewport);
    }
  }, [workflow?.canvas.viewport]);

  // MiniMap node color based on node type
  const minimapNodeColor = useCallback((node: Node) => {
    const colors: Record<string, string> = {
      'manual-trigger': theme.palette.success.main,
      'form-trigger': theme.palette.success.main,
      'webhook-trigger': theme.palette.success.main,
      'schedule-trigger': theme.palette.success.main,
      'conditional': theme.palette.secondary.main,
      'switch': theme.palette.secondary.main,
      'http-request': theme.palette.warning.main,
      'email-send': theme.palette.info.main,
      'transform': theme.palette.primary.main,
      'filter': theme.palette.primary.main,
    };
    return colors[node.type || 'default'] || theme.palette.grey[500];
  }, [theme]);

  // Dark mode class for React Flow
  const colorMode = theme.palette.mode;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: colorMode === 'dark' ? 'grey.900' : 'grey.50',
        // Override React Flow styles for dark mode
        '& .react-flow__node': {
          color: colorMode === 'dark' ? '#fff' : 'inherit',
          // Remove default React Flow node background
          background: 'transparent',
          padding: 0,
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
        },
        '& .react-flow__edge-path': {
          stroke: colorMode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
        },
        '& .react-flow__handle': {
          backgroundColor: colorMode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
        },
        // Override handle positioning to ensure they're vertically centered on nodes
        '& .react-flow__handle.react-flow__handle-left': {
          top: '50% !important',
          transform: 'translateY(-50%) !important',
        },
        '& .react-flow__handle.react-flow__handle-right': {
          top: '50% !important',
          transform: 'translateY(-50%) !important',
        },
        '& .react-flow__controls': {
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          '& button': {
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          },
          '& button path': {
            fill: theme.palette.text.primary,
          },
        },
        '& .react-flow__minimap': {
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        },
        '& .react-flow__attribution': {
          display: 'none',
        },
      }}
    >
      <ReactFlow
        className={colorMode === 'dark' ? 'dark' : ''}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        onMoveEnd={onMoveEnd}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          animated: true,
          style: {
            stroke: theme.palette.primary.main,
            strokeWidth: 2,
          },
        }}
        connectionLineStyle={{
          stroke: theme.palette.primary.main,
          strokeWidth: 2,
        }}
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Control']}
        panOnScroll
        selectionOnDrag={!readOnly}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[300]}
        />
        <Controls
          showZoom
          showFitView
          showInteractive={!readOnly}
          style={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 8,
            boxShadow: theme.shadows[2],
          }}
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor={theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          position="bottom-left"
          style={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 8,
            boxShadow: theme.shadows[2],
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </Box>
  );
}

// Helper to get default label for node types
function getNodeLabel(type: string): string {
  const labels: Record<string, string> = {
    'manual-trigger': 'Manual Start',
    'form-trigger': 'Form Submission',
    'webhook-trigger': 'Webhook',
    'schedule-trigger': 'Schedule',
    'conditional': 'If/Else',
    'switch': 'Switch',
    'loop': 'Loop',
    'http-request': 'HTTP Request',
    'email-send': 'Send Email',
    'transform': 'Transform',
    'filter': 'Filter',
  };
  return labels[type] || type.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export default WorkflowEditorCanvas;
