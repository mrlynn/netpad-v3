'use client';

import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  Connection,
  BackgroundVariant,
  XYPosition,
  Node,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import { Box, alpha } from '@mui/material';
import { nodeTypes } from './nodeTypes';
import { usePipeline } from '@/contexts/PipelineContext';
import { getStageDefinition } from '@/lib/stageDefinitions';
import { StageNodeData } from '@/types/pipeline';
import 'reactflow/dist/style.css';

export function PipelineCanvas() {
  const { nodes: contextNodes, edges: contextEdges, selectedNodeId, dispatch } = usePipeline();
  const [nodes, setNodes, onNodesChange] = useNodesState(contextNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(contextEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Sync ReactFlow changes back to context
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);
      
      // Handle node selection
      const selectionChange = changes.find((change) => change.type === 'select');
      if (selectionChange && selectionChange.type === 'select') {
        dispatch({
          type: 'SELECT_NODE',
          payload: { nodeId: selectionChange.selected ? selectionChange.id : null }
        });
      }

      // Handle node deletion
      const deleteChange = changes.find((change) => change.type === 'remove');
      if (deleteChange && deleteChange.type === 'remove') {
        dispatch({ type: 'DELETE_NODE', payload: { nodeId: deleteChange.id } });
      } else {
        // Sync position and other changes
        dispatch({ type: 'SET_NODES', payload: { nodes: updatedNodes } });
      }
    },
    [nodes, setNodes, dispatch]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      setEdges(updatedEdges);
      dispatch({ type: 'SET_EDGES', payload: { edges: updatedEdges } });
    },
    [edges, setEdges, dispatch]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge({ ...connection, animated: true }, edges);
      setEdges(newEdges);
      dispatch({ type: 'SET_EDGES', payload: { edges: newEdges } });
    },
    [edges, setEdges, dispatch]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const stageType = event.dataTransfer.getData('application/reactflow');
      if (!stageType || !reactFlowWrapper.current) return;

      const definition = getStageDefinition(stageType);
      if (!definition) return;

      // Get position relative to ReactFlow viewport
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      let position: XYPosition = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      };

      // Convert to flow coordinates if instance is available (accounts for pan/zoom)
      if (reactFlowInstance) {
        position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        });
      }

      const newNode: Node<StageNodeData> = {
        id: `${stageType}-${Date.now()}`,
        type: 'stageNode',
        position,
        data: {
          stageType,
          config: { ...definition.defaultConfig }
        }
      };

      dispatch({ type: 'ADD_NODE', payload: { node: newNode } });
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, dispatch, reactFlowInstance]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      dispatch({
        type: 'SELECT_NODE',
        payload: { nodeId: node.id }
      });
    },
    [dispatch]
  );

  // Sync context nodes/edges to ReactFlow when they change
  React.useEffect(() => {
    setNodes(contextNodes);
  }, [contextNodes, setNodes]);

  React.useEffect(() => {
    setEdges(contextEdges);
  }, [contextEdges, setEdges]);

  // Update node selection state in ReactFlow
  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId
      }))
    );
  }, [selectedNodeId, setNodes]);

  return (
    <Box
      ref={reactFlowWrapper}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1,
        '& .react-flow': {
          width: '100%',
          height: '100%'
        },
        '& .react-flow__renderer': {
          width: '100%',
          height: '100%'
        },
        '& .react-flow__viewport': {
          width: '100%',
          height: '100%'
        },
        '& .react-flow__pane': {
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing'
          }
        },
        '& .react-flow__controls': {
          bgcolor: alpha('#141920', 0.9),
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          '& button': {
            bgcolor: 'transparent',
            border: 'none',
            color: 'text.primary',
            '&:hover': {
              bgcolor: alpha('#00ED64', 0.1)
            },
            '&:active': {
              bgcolor: alpha('#00ED64', 0.2)
            }
          }
        },
        '& .react-flow__minimap': {
          bgcolor: alpha('#141920', 0.9),
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        },
        '& .react-flow__edge-path': {
          stroke: alpha('#00ED64', 0.4),
          strokeWidth: 2
        },
        '& .react-flow__edge.selected .react-flow__edge-path': {
          stroke: '#00ED64',
          strokeWidth: 3
        },
        '& .react-flow__handle': {
          bgcolor: '#00ED64',
          border: '2px solid',
          borderColor: 'background.paper',
          width: 12,
          height: 12
        }
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onInit={onInit}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Meta', 'Control']}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          animated: false,
          style: { strokeWidth: 2 }
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={alpha('#6e7681', 0.2)}
        />
        {/* Large centered NetPad logo watermark */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          <Box
            component="img"
            src="/netpad-logo.svg"
            alt=""
            sx={{
              width: 200,
              height: 200,
              opacity: 0.035,
              filter: 'brightness(0) invert(1)',
            }}
          />
        </Box>
        <Controls position="top-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.type === 'collectionNode') return '#00684A';
            return '#00ED64';
          }}
          maskColor={alpha('#0a0e14', 0.8)}
        />
      </ReactFlow>
    </Box>
  );
}


