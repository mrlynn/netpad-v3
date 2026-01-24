'use client';

import { useMemo, memo } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import dynamic from 'next/dynamic';
import type { Node, Edge, NodeProps } from '@xyflow/react';

// Theme colors matching the actual workflow-renderer dark theme
const THEME = {
  canvas: '#0a0e14',
  nodeBackground: '#1a1f2e',
  nodeBorder: '#2d3548',
  textPrimary: '#f0f0f0',
  textSecondary: '#9ca3af',
  edgeColor: '#00ED64',
  categories: {
    trigger: '#10B981',
    logic: '#F59E0B',
    data: '#3B82F6',
    action: '#8B5CF6',
    ai: '#EC4899',
    utility: '#64748B',
  },
};

// Node configuration matching workflow-renderer node types
const NODE_CONFIG: Record<string, { icon: string; color: string; category: keyof typeof THEME.categories }> = {
  form_trigger: { icon: '📝', color: THEME.categories.trigger, category: 'trigger' },
  filter: { icon: '🔀', color: THEME.categories.logic, category: 'logic' },
  mongodb_query: { icon: '🔍', color: THEME.categories.data, category: 'data' },
  mongodb_insert: { icon: '💾', color: THEME.categories.data, category: 'data' },
  function: { icon: '⚡', color: THEME.categories.action, category: 'action' },
  email_send: { icon: '📧', color: THEME.categories.action, category: 'action' },
  slack_send: { icon: '💬', color: THEME.categories.action, category: 'action' },
};

// Import Position enum for handle positioning
import { Position } from '@xyflow/react';

// Dynamically import Handle for connection points
const Handle = dynamic(
  () => import('@xyflow/react').then((mod) => mod.Handle),
  { ssr: false }
);

// Custom node component matching BaseNode styling from workflow-renderer
function DemoNode({ data, id }: NodeProps) {
  const nodeData = data as { nodeType?: string; label?: string; description?: string };
  const config = NODE_CONFIG[nodeData.nodeType || ''] || {
    icon: '⬛',
    color: '#64748B',
    category: 'utility' as const,
  };

  const isTrigger = nodeData.nodeType?.includes('trigger');

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Node container */}
      <Box
        sx={{
          minWidth: 180,
          maxWidth: 220,
          bgcolor: THEME.nodeBackground,
          borderRadius: '8px',
          border: `2px solid ${THEME.nodeBorder}`,
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: config.color,
            boxShadow: `0 4px 12px ${alpha(config.color, 0.3)}`,
          },
        }}
      >
        {/* Header with colored background */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            bgcolor: alpha(config.color, 0.08),
            borderBottom: `1px solid ${alpha(config.color, 0.2)}`,
          }}
        >
          <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{config.icon}</Typography>
          <Typography
            sx={{
              flex: 1,
              fontWeight: 600,
              fontSize: 12,
              color: config.color,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nodeData.label}
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{ px: 1.5, py: 1, minHeight: 36 }}>
          <Typography
            sx={{
              fontSize: 10,
              color: THEME.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {nodeData.description || 'No description'}
          </Typography>
        </Box>
      </Box>

      {/* Input Handle (left side) - not on triggers */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{
            width: 10,
            height: 10,
            backgroundColor: config.color,
            border: `2px solid ${THEME.nodeBackground}`,
            left: -5,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}

      {/* Output Handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          width: 10,
          height: 10,
          backgroundColor: config.color,
          border: `2px solid ${THEME.nodeBackground}`,
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
    </Box>
  );
}

const MemoizedDemoNode = memo(DemoNode);

// Loading component
function WorkflowLoading() {
  return (
    <Box
      sx={{
        height: 300,
        bgcolor: THEME.canvas,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: THEME.textSecondary,
      }}
    >
      Loading workflow...
    </Box>
  );
}

// Dynamically import ReactFlow components
const ReactFlow = dynamic(
  () => import('@xyflow/react').then((mod) => mod.ReactFlow),
  { ssr: false, loading: WorkflowLoading }
);

const Background = dynamic(
  () => import('@xyflow/react').then((mod) => mod.Background),
  { ssr: false }
);

const Panel = dynamic(
  () => import('@xyflow/react').then((mod) => mod.Panel),
  { ssr: false }
);

// Pre-calculated positions - horizontal layout with proper spacing
const DEMO_NODES: Node[] = [
  { id: 'trigger', type: 'demoNode', position: { x: 0, y: 100 }, data: { label: 'Order Submitted', nodeType: 'form_trigger', description: 'When order form is submitted' }, draggable: false, selectable: false },
  { id: 'validate', type: 'demoNode', position: { x: 260, y: 100 }, data: { label: 'Validate Order', nodeType: 'filter', description: 'Check inventory & payment' }, draggable: false, selectable: false },
  { id: 'query', type: 'demoNode', position: { x: 520, y: 100 }, data: { label: 'Get Customer', nodeType: 'mongodb_query', description: 'Query customers collection' }, draggable: false, selectable: false },
  { id: 'process', type: 'demoNode', position: { x: 780, y: 100 }, data: { label: 'Process Order', nodeType: 'function', description: 'Calculate totals & shipping' }, draggable: false, selectable: false },
  { id: 'insert', type: 'demoNode', position: { x: 1040, y: 100 }, data: { label: 'Save Order', nodeType: 'mongodb_insert', description: 'Insert into orders' }, draggable: false, selectable: false },
  { id: 'notify', type: 'demoNode', position: { x: 1300, y: 20 }, data: { label: 'Send Email', nodeType: 'email_send', description: 'Order confirmation' }, draggable: false, selectable: false },
  { id: 'slack', type: 'demoNode', position: { x: 1300, y: 180 }, data: { label: 'Notify Team', nodeType: 'slack_send', description: 'Post to #orders' }, draggable: false, selectable: false },
];

// Edges with NetPad signature green color
const DEMO_EDGES: Edge[] = [
  { id: 'e1', source: 'trigger', target: 'validate', type: 'smoothstep', animated: true, style: { stroke: THEME.edgeColor, strokeWidth: 2 } },
  { id: 'e2', source: 'validate', target: 'query', type: 'smoothstep', animated: true, style: { stroke: THEME.edgeColor, strokeWidth: 2 } },
  { id: 'e3', source: 'query', target: 'process', type: 'smoothstep', animated: true, style: { stroke: THEME.edgeColor, strokeWidth: 2 } },
  { id: 'e4', source: 'process', target: 'insert', type: 'smoothstep', animated: true, style: { stroke: THEME.edgeColor, strokeWidth: 2 } },
  { id: 'e5', source: 'insert', target: 'notify', type: 'smoothstep', animated: true, style: { stroke: THEME.edgeColor, strokeWidth: 2 } },
  { id: 'e6', source: 'insert', target: 'slack', type: 'smoothstep', animated: true, style: { stroke: THEME.edgeColor, strokeWidth: 2 } },
];

export function WorkflowDemoRenderer() {
  const nodeTypes = useMemo(() => ({ demoNode: MemoizedDemoNode }), []);

  return (
    <Box
      sx={{
        height: 300,
        bgcolor: THEME.canvas,
        position: 'relative',
        '& .react-flow__attribution': { display: 'none' },
      }}
    >
      <ReactFlow
        nodes={DEMO_NODES}
        edges={DEMO_EDGES}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255, 255, 255, 0.03)" gap={20} />

        <Panel
          position="bottom-right"
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
              filter: 'invert(1) brightness(1.5)',
            }}
          />
          <Typography
            sx={{
              fontSize: '9px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.4)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Made with NetPad
          </Typography>
        </Panel>
      </ReactFlow>
    </Box>
  );
}
