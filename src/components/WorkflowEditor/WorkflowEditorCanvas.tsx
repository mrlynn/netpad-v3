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
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Box, useTheme, Fab, Tooltip, alpha } from '@mui/material';
import { netpadColors } from '@/theme/theme';
import { HelpOutline } from '@mui/icons-material';
import { nanoid } from 'nanoid';
import { useWorkflowStore, useWorkflowEditor, useWorkflowActions } from '@/contexts/WorkflowContext';
import { WorkflowNode, WorkflowEdge, NodeDefinition } from '@/types/workflow';
import { EmptyWorkflowState, WorkflowTemplate } from './Panels/EmptyWorkflowState';
import { GeneratedWorkflow } from '@/lib/ai/types';

// Node components
import { BaseNode } from './Nodes/BaseNode';
import { TriggerNode } from './Nodes/TriggerNode';
import { StickyNote, STICKY_COLORS, DEFAULT_WIDTH, DEFAULT_HEIGHT } from './Nodes/StickyNote';

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
  // Custom nodes
  'code': BaseNode,
  // Annotations
  'sticky-note': StickyNote,
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
  isEmbedded?: boolean; // Hide UI elements when embedded
}

export function WorkflowEditorCanvas({
  onNodeSelect,
  onEdgeSelect,
  onNodeDoubleClick,
  onEdgeDoubleClick,
  readOnly = false,
  isEmbedded = false,
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

  // Handle sticky note color change events
  useEffect(() => {
    const handleColorChange = (event: CustomEvent<{ nodeId: string; color: string }>) => {
      const { nodeId, color } = event.detail;
      const node = workflowNodes.find(n => n.id === nodeId);
      if (node) {
        updateNode(nodeId, {
          config: { ...node.config, bgColor: color }
        });
      }
    };

    window.addEventListener('stickyNoteColorChange', handleColorChange as EventListener);
    return () => {
      window.removeEventListener('stickyNoteColorChange', handleColorChange as EventListener);
    };
  }, [workflowNodes, updateNode]);

  // Callback for sticky note content changes
  const handleStickyNoteContentChange = useCallback((nodeId: string, content: string) => {
    const node = workflowNodes.find(n => n.id === nodeId);
    if (node) {
      updateNode(nodeId, {
        config: { ...node.config, content }
      });
    }
  }, [workflowNodes, updateNode]);

  // Track if the "Build Your Workflow" helper has been dismissed
  const [helperDismissed, setHelperDismissed] = useState(false);

  // Load helper dismissed state from localStorage when workflow changes
  useEffect(() => {
    if (workflow?.id) {
      const storageKey = `workflow_helper_dismissed_${workflow.id}`;
      const dismissed = localStorage.getItem(storageKey) === 'true';
      setHelperDismissed(dismissed);
    }
  }, [workflow?.id]);

  // Handle dismissing the helper
  const handleDismissHelper = useCallback(() => {
    setHelperDismissed(true);
    if (workflow?.id) {
      localStorage.setItem(`workflow_helper_dismissed_${workflow.id}`, 'true');
    }
  }, [workflow?.id]);

  // Handle showing the helper again
  const handleShowHelper = useCallback(() => {
    setHelperDismissed(false);
    if (workflow?.id) {
      localStorage.removeItem(`workflow_helper_dismissed_${workflow.id}`);
    }
  }, [workflow?.id]);

  // Convert workflow nodes to React Flow format
  const convertToFlowNodes = useCallback((wfNodes: typeof workflowNodes): Node[] => {
    return wfNodes.map((node) => {
      const baseNodeData = {
        ...node,
        label: node.label || getNodeLabel(node.type),
      };

      // For sticky notes, add the content change callback and place behind other nodes
      if (node.type === 'sticky-note') {
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...baseNodeData,
            onContentChange: (content: string) => handleStickyNoteContentChange(node.id, content),
          },
          selected: node.id === selectedNodeId,
          draggable: !readOnly,
          selectable: true,
          // Use negative zIndex to place sticky notes behind regular nodes
          // Regular nodes default to zIndex 0, so -1 puts sticky notes behind
          zIndex: -1,
          style: {
            width: (node.config?.width as number) || DEFAULT_WIDTH,
            height: (node.config?.height as number) || DEFAULT_HEIGHT,
          },
        };
      }

      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: baseNodeData,
        selected: node.id === selectedNodeId,
        draggable: !readOnly,
        selectable: true,
      };
    });
  }, [selectedNodeId, readOnly, handleStickyNoteContentChange]);

  // Local state for nodes - React Flow controls this directly
  const [nodes, setNodes] = useState<Node[]>(() => convertToFlowNodes(workflowNodes));

  // Track previous node IDs to detect additions/removals
  const prevNodeIdsRef = useRef<Set<string>>(new Set(workflowNodes.map(n => n.id)));

  // Sync from store ONLY when:
  // 1. Workflow changes (different workflow loaded)
  // 2. Nodes are added or removed
  // 3. Node data changes (not position)
  // NOTE: selectedNodeId is intentionally NOT a dependency - selection is handled via onNodesChange
  useEffect(() => {
    const workflowChanged = workflow?.id !== currentWorkflowIdRef.current;
    currentWorkflowIdRef.current = workflow?.id || null;

    // Update tracked node IDs
    prevNodeIdsRef.current = new Set(workflowNodes.map(n => n.id));

    // Full sync only if workflow changed (loading a different workflow)
    if (workflowChanged) {
      setNodes(convertToFlowNodes(workflowNodes));
      return;
    }

    // For nodes added/removed, merge while preserving local positions and dimensions
    // This ensures existing node positions/sizes aren't lost when adding new nodes
    setNodes((currentNodes) => {
      // Create maps of current local positions and styles (for sticky notes)
      const localPositions = new Map(currentNodes.map(n => [n.id, n.position]));
      const localStyles = new Map(currentNodes.map(n => [n.id, n.style]));
      const localSelected = new Map(currentNodes.map(n => [n.id, n.selected]));

      // Build the new node list
      return workflowNodes.map((storeNode) => {
        // For existing nodes, preserve local position (may differ from store during drag)
        // For new nodes, use store position
        const position = localPositions.get(storeNode.id) || storeNode.position;
        const existingStyle = localStyles.get(storeNode.id);
        // Preserve local selection state - React Flow manages this
        const isSelected = localSelected.get(storeNode.id) ?? false;

        const baseNodeData = {
          ...storeNode,
          label: storeNode.label || getNodeLabel(storeNode.type),
        };

        // For sticky notes, add the content change callback and style
        if (storeNode.type === 'sticky-note') {
          // For dimensions: prefer store config (authoritative), but fall back to local style if store hasn't updated yet
          const storeWidth = storeNode.config?.width as number | undefined;
          const storeHeight = storeNode.config?.height as number | undefined;
          const localWidth = (existingStyle?.width as number | undefined);
          const localHeight = (existingStyle?.height as number | undefined);

          // Use store dimensions if they exist and are different from defaults, otherwise use local
          const width = storeWidth || localWidth || DEFAULT_WIDTH;
          const height = storeHeight || localHeight || DEFAULT_HEIGHT;

          return {
            id: storeNode.id,
            type: storeNode.type,
            position,
            data: {
              ...baseNodeData,
              onContentChange: (content: string) => handleStickyNoteContentChange(storeNode.id, content),
            },
            selected: isSelected,
            draggable: !readOnly,
            selectable: true,
            // Use negative zIndex to place sticky notes behind regular nodes
            zIndex: -1,
            style: {
              width,
              height,
            },
          };
        }

        return {
          id: storeNode.id,
          type: storeNode.type,
          position,
          data: baseNodeData,
          selected: isSelected,
          draggable: !readOnly,
          selectable: true,
        };
      });
    });
  }, [workflow?.id, workflowNodes, readOnly, handleStickyNoteContentChange, convertToFlowNodes]);

  // Convert workflow edges to React Flow format
  const convertToFlowEdges = useCallback((wfEdges: typeof workflowEdges): Edge[] => {
    return wfEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: edge.type || 'default',
      animated: edge.animated,
      label: edge.condition?.label,
      style: edge.style ? {
        stroke: edge.style.stroke,
        strokeWidth: edge.style.strokeWidth,
      } : undefined,
    }));
  }, []);

  // Local state for edges - React Flow controls this directly
  const [edges, setEdges] = useEdgesState(convertToFlowEdges(workflowEdges));

  // Track previous workflowEdges to detect changes
  const prevWorkflowEdgesRef = useRef(workflowEdges);

  // Sync edges from store when workflowEdges changes (for style/property updates)
  useEffect(() => {
    // Check if workflowEdges actually changed
    const prevEdges = prevWorkflowEdgesRef.current;
    const edgesChanged = 
      prevEdges.length !== workflowEdges.length ||
      prevEdges.some((prevEdge, index) => {
        const currentEdge = workflowEdges[index];
        if (!currentEdge || prevEdge.id !== currentEdge.id) return true;
        
        // Check if edge properties changed
        return (
          prevEdge.type !== currentEdge.type ||
          prevEdge.animated !== currentEdge.animated ||
          prevEdge.style?.stroke !== currentEdge.style?.stroke ||
          prevEdge.style?.strokeWidth !== currentEdge.style?.strokeWidth ||
          prevEdge.condition?.label !== currentEdge.condition?.label
        );
      });

    if (edgesChanged) {
      setEdges(convertToFlowEdges(workflowEdges));
      prevWorkflowEdgesRef.current = workflowEdges;
    }
  }, [workflowEdges, setEdges, convertToFlowEdges]);

  // Handle node changes (move, select, remove, resize)
  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    if (readOnly) return;

    // Apply all changes to local state for smooth visual updates
    setNodes((nds) => {
      const updatedNodes = applyNodeChanges(changes, nds);

      // Handle specific change types that need to be persisted to store
      changes.forEach((change) => {
        switch (change.type) {
          case 'position':
            // Persist to store when drag ends
            // ReactFlow may not always include position in the change when dragging === false
            // so we get the position from the updated nodes
            if (change.dragging === false) {
              const node = updatedNodes.find(n => n.id === change.id);
              if (node?.position) {
                moveNode(change.id, node.position);
              }
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
          case 'dimensions':
            // Handle resize for sticky notes - save when resize ends OR when dimensions change
            // We check for resizing === false OR when we have valid dimensions (final state)
            {
              const node = updatedNodes.find(n => n.id === change.id);
              const workflowNode = workflowNodes.find(n => n.id === change.id);
              if (node && workflowNode && node.type === 'sticky-note' && change.dimensions) {
                // Only persist to store when resizing ends (resizing === false)
                // During active resize, React Flow updates local state via applyNodeChanges
                if (change.resizing === false) {
                  updateNode(change.id, {
                    config: {
                      ...workflowNode.config,
                      width: Math.round(change.dimensions.width),
                      height: Math.round(change.dimensions.height),
                    }
                  });
                }
              }
            }
            break;
        }
      });

      return updatedNodes;
    });
  }, [readOnly, moveNode, selectNode, removeNode, onNodeSelect, workflowNodes, updateNode]);

  // Handle edge changes (select, remove)
  const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (readOnly) return;

    // Apply changes to local state first for smooth visual updates
    setEdges((eds) => {
      const updatedEdges = applyEdgeChanges(changes, eds);

      // Handle specific change types that need to be persisted to store
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

      return updatedEdges;
    });
  }, [readOnly, selectEdge, removeEdge, onEdgeSelect, setEdges]);

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

  // Handle adding a node from the empty state
  const handleAddNodeFromEmpty = useCallback((nodeType: string) => {
    if (readOnly) return;

    // Create new node at center of viewport
    const position = reactFlowInstance.current
      ? reactFlowInstance.current.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
      : { x: 250, y: 150 };

    const newNode: WorkflowNode = {
      id: `${nodeType}_${nanoid(8)}`,
      type: nodeType,
      position,
      config: {},
      enabled: true,
    };

    addNode(newNode);
  }, [readOnly, addNode]);

  // Handle loading a template from the empty state
  const handleLoadTemplate = useCallback((template: WorkflowTemplate) => {
    if (readOnly) return;

    // Create nodes from template
    const nodeIdMap: Record<number, string> = {};

    template.nodes.forEach((templateNode, index) => {
      const nodeId = `${templateNode.type}_${nanoid(8)}`;
      nodeIdMap[index] = nodeId;

      const newNode: WorkflowNode = {
        id: nodeId,
        type: templateNode.type,
        label: templateNode.label,
        position: templateNode.position,
        config: {},
        enabled: true,
      };

      addNode(newNode);
    });

    // Create edges from template
    template.edges.forEach((templateEdge) => {
      const sourceId = nodeIdMap[templateEdge.source];
      const targetId = nodeIdMap[templateEdge.target];

      if (sourceId && targetId) {
        const newEdge: WorkflowEdge = {
          id: `edge_${nanoid(8)}`,
          source: sourceId,
          sourceHandle: 'output',
          target: targetId,
          targetHandle: 'input',
        };

        addWorkflowEdge(newEdge);
      }
    });

    // Fit view after adding nodes
    setTimeout(() => {
      reactFlowInstance.current?.fitView({ padding: 0.2 });
    }, 100);
  }, [readOnly, addNode, addWorkflowEdge]);

  // Handle AI-generated workflow
  const handleGenerateWorkflow = useCallback((generatedWorkflow: GeneratedWorkflow) => {
    if (readOnly) return;

    // Map tempIds to real node IDs
    const tempIdToRealId: Record<string, string> = {};

    // Create nodes from generated workflow
    generatedWorkflow.nodes.forEach((genNode) => {
      const nodeId = `${genNode.type}_${nanoid(8)}`;
      tempIdToRealId[genNode.tempId] = nodeId;

      const newNode: WorkflowNode = {
        id: nodeId,
        type: genNode.type,
        label: genNode.label,
        position: genNode.position,
        config: genNode.config || {},
        enabled: genNode.enabled,
      };

      addNode(newNode);
    });

    // Create edges from generated workflow
    generatedWorkflow.edges.forEach((genEdge) => {
      const sourceId = tempIdToRealId[genEdge.sourceTempId];
      const targetId = tempIdToRealId[genEdge.targetTempId];

      if (sourceId && targetId) {
        const newEdge: WorkflowEdge = {
          id: `edge_${nanoid(8)}`,
          source: sourceId,
          sourceHandle: genEdge.sourceHandle || 'output',
          target: targetId,
          targetHandle: genEdge.targetHandle || 'input',
          condition: genEdge.condition,
        };

        addWorkflowEdge(newEdge);
      }
    });

    // Fit view after adding nodes
    setTimeout(() => {
      reactFlowInstance.current?.fitView({ padding: 0.2 });
    }, 100);
  }, [readOnly, addNode, addWorkflowEdge]);

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

    // Restore viewport if available, otherwise fit view once on init
    if (workflow?.canvas.viewport && (workflow.canvas.viewport.x !== 0 || workflow.canvas.viewport.y !== 0 || workflow.canvas.viewport.zoom !== 1)) {
      instance.setViewport(workflow.canvas.viewport);
    } else {
      // Only fit view on initial load when no viewport is saved
      instance.fitView({ padding: 0.2 });
    }
  }, [workflow?.canvas.viewport]);

  // MiniMap node color based on node type
  const minimapNodeColor = useCallback((node: Node) => {
    // For sticky notes, use their configured color
    if (node.type === 'sticky-note') {
      const bgColor = node.data?.config?.bgColor as string;
      if (bgColor) {
        const stickyColor = STICKY_COLORS.find(c => c.value === bgColor);
        return stickyColor?.border || '#FBC02D';
      }
      return '#FBC02D'; // Default yellow
    }
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
      'code': '#795548',
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
        // NetPad branded canvas background
        bgcolor: colorMode === 'dark' ? '#0a0e14' : '#F8FAF9',
        // Subtle grid pattern overlay - NetPad identity
        backgroundImage: colorMode === 'dark'
          ? netpadColors.gridPatternDark
          : netpadColors.gridPatternLight,
        backgroundSize: netpadColors.gridSize,
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
          // NetPad branded dot color - subtle green tint
          color={theme.palette.mode === 'dark'
            ? 'rgba(0, 237, 100, 0.08)' // Subtle green dots in dark mode
            : 'rgba(0, 104, 74, 0.12)'  // Darker green dots in light mode
          }
        />
        {!isEmbedded && (
          <Controls
            showZoom
            showFitView
            showInteractive={!readOnly}
            data-tour="workflow-controls"
            style={{
              backgroundColor: theme.palette.background.paper,
              borderRadius: 8,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(0, 237, 100, 0.05)'
                : theme.shadows[2],
              border: theme.palette.mode === 'dark'
                ? '1px solid rgba(0, 237, 100, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.08)',
            }}
          />
        )}
        {!isEmbedded && (
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor={theme.palette.mode === 'dark' ? 'rgba(10, 14, 20, 0.8)' : 'rgba(248, 250, 249, 0.8)'}
            position="bottom-left"
            style={{
              backgroundColor: theme.palette.background.paper,
              borderRadius: 8,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(0, 237, 100, 0.05)'
                : theme.shadows[2],
              border: theme.palette.mode === 'dark'
                ? '1px solid rgba(0, 237, 100, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.08)',
            }}
            pannable
            zoomable
          />
        )}
      </ReactFlow>

      {/* Empty State Dialog - show when workflow has no nodes and helper not dismissed */}
      {workflowNodes.length === 0 && !readOnly && !helperDismissed && (
        <EmptyWorkflowState
          onAddNode={handleAddNodeFromEmpty}
          onLoadTemplate={handleLoadTemplate}
          onGenerateWorkflow={handleGenerateWorkflow}
          onDismiss={handleDismissHelper}
        />
      )}

      {/* Help button to show the helper again when it's been dismissed */}
      {workflowNodes.length === 0 && !readOnly && helperDismissed && (
        <Tooltip title="Show workflow builder helper" placement="left">
          <Fab
            size="small"
            onClick={handleShowHelper}
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              bgcolor: alpha('#9C27B0', 0.9),
              color: 'white',
              '&:hover': {
                bgcolor: '#9C27B0',
              },
            }}
          >
            <HelpOutline />
          </Fab>
        </Tooltip>
      )}
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
