/**
 * Workflow Viewer MCP App
 *
 * Renders an interactive workflow diagram as a lightweight SVG visualization.
 * This is a standalone implementation optimized for MCP App contexts.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { WorkflowViewerData, WorkflowNode, WorkflowEdge } from '../../types';

interface AppProps {
  initialData?: WorkflowViewerData;
}

// Layout constants
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 100;
const PADDING = 40;

// Node type icons
const NODE_ICONS: Record<string, string> = {
  form_trigger: '📝',
  webhook_trigger: '🔗',
  schedule_trigger: '⏰',
  manual_trigger: '▶️',
  conditional: '🔀',
  switch: '🔀',
  loop: '🔄',
  transform: '⚙️',
  filter: '🔍',
  mongodb_query: '🗄️',
  mongodb_write: '💾',
  http_request: '🌐',
  email_send: '📧',
  notification: '🔔',
  ai_prompt: '🤖',
  code: '💻',
  delay: '⏳',
  default: '⚡',
};

// Node type colors
const NODE_COLORS: Record<string, string> = {
  form_trigger: '#00ED64',
  webhook_trigger: '#00ED64',
  schedule_trigger: '#00ED64',
  manual_trigger: '#00ED64',
  conditional: '#58a6ff',
  switch: '#58a6ff',
  loop: '#58a6ff',
  transform: '#d29922',
  filter: '#d29922',
  mongodb_query: '#00684A',
  mongodb_write: '#00684A',
  http_request: '#9333EA',
  email_send: '#EC4899',
  notification: '#EC4899',
  ai_prompt: '#F59E0B',
  code: '#6B7280',
  delay: '#6B7280',
  default: '#6B7280',
};

function getNodeIcon(type: string): string {
  return NODE_ICONS[type] || NODE_ICONS.default;
}

function getNodeColor(type: string): string {
  return NODE_COLORS[type] || NODE_COLORS.default;
}

interface LayoutedNode extends WorkflowNode {
  x: number;
  y: number;
}

function layoutNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): LayoutedNode[] {
  if (nodes.length === 0) return [];

  // Build adjacency map
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  nodes.forEach(n => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  });

  edges.forEach(e => {
    outgoing.get(e.source)?.push(e.target);
    incoming.get(e.target)?.push(e.source);
  });

  // Find root nodes (no incoming edges)
  const roots = nodes.filter(n => (incoming.get(n.id)?.length || 0) === 0);
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]); // Fallback if graph is cyclic
  }

  // BFS to assign levels
  const levels = new Map<string, number>();
  const queue = roots.map(n => ({ id: n.id, level: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, Math.max(levels.get(id) || 0, level));

    const children = outgoing.get(id) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Group nodes by level
  const levelGroups = new Map<number, WorkflowNode[]>();
  nodes.forEach(n => {
    const level = levels.get(n.id) || 0;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(n);
  });

  // Assign positions
  const layouted: LayoutedNode[] = [];
  levelGroups.forEach((levelNodes, level) => {
    const totalWidth = levelNodes.length * NODE_WIDTH + (levelNodes.length - 1) * HORIZONTAL_GAP;
    const startX = PADDING + (levelNodes.length > 1 ? 0 : (NODE_WIDTH + HORIZONTAL_GAP) / 2);

    levelNodes.forEach((node, idx) => {
      layouted.push({
        ...node,
        x: startX + idx * (NODE_WIDTH + HORIZONTAL_GAP),
        y: PADDING + level * (NODE_HEIGHT + VERTICAL_GAP),
      });
    });
  });

  return layouted;
}

export function App({ initialData }: AppProps) {
  const [data, setData] = useState<WorkflowViewerData | null>(initialData ?? null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = event.data;
        if (message?.type === 'MCP_TOOL_RESULT' && message.data) {
          setData(message.data as WorkflowViewerData);
          setError(null);
        }
      } catch (err) {
        setError('Failed to parse workflow data');
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent?.postMessage({ type: 'READY' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const theme = useMemo(() => {
    if (data?.theme) return data.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, [data?.theme]);

  const handleNodeClick = useCallback((node: LayoutedNode) => {
    setSelectedNode(node.id);
    window.parent?.postMessage({
      type: 'NODE_CLICKED',
      payload: {
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.data?.label || node.type,
      },
    }, '*');
  }, []);

  const layoutedNodes = useMemo(() => {
    if (!data?.workflow?.nodes) return [];
    return layoutNodes(data.workflow.nodes, data.workflow.edges || []);
  }, [data?.workflow]);

  const viewBox = useMemo(() => {
    if (layoutedNodes.length === 0) return '0 0 400 300';
    const maxX = Math.max(...layoutedNodes.map(n => n.x + NODE_WIDTH)) + PADDING;
    const maxY = Math.max(...layoutedNodes.map(n => n.y + NODE_HEIGHT)) + PADDING;
    return `0 0 ${maxX} ${maxY}`;
  }, [layoutedNodes]);

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0a0e14' : '#F8FAF9';
  const textColor = isDark ? '#e6edf3' : '#1a1a2e';
  const borderColor = isDark ? 'rgba(110, 118, 129, 0.3)' : 'rgba(0, 104, 74, 0.2)';
  const nodeBackground = isDark ? '#141920' : '#ffffff';

  if (error) {
    return (
      <div style={{ ...containerStyle, backgroundColor: bgColor, color: textColor }}>
        <div style={centerStyle}>⚠️ {error}</div>
      </div>
    );
  }

  if (!data?.workflow) {
    return (
      <div style={{ ...containerStyle, backgroundColor: bgColor, color: textColor }}>
        <div style={centerStyle}>Loading workflow...</div>
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, backgroundColor: bgColor }}>
      <svg
        viewBox={viewBox}
        style={{ width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={isDark ? '#00ED64' : '#00684A'}
            />
          </marker>
        </defs>

        {/* Edges */}
        {data.workflow.edges?.map((edge) => {
          const source = layoutedNodes.find(n => n.id === edge.source);
          const target = layoutedNodes.find(n => n.id === edge.target);
          if (!source || !target) return null;

          const startX = source.x + NODE_WIDTH / 2;
          const startY = source.y + NODE_HEIGHT;
          const endX = target.x + NODE_WIDTH / 2;
          const endY = target.y;

          // Simple curved path
          const midY = (startY + endY) / 2;
          const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

          return (
            <g key={edge.id}>
              <path
                d={path}
                fill="none"
                stroke={isDark ? 'rgba(0, 237, 100, 0.4)' : 'rgba(0, 104, 74, 0.4)'}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={(startX + endX) / 2}
                  y={midY - 5}
                  textAnchor="middle"
                  fill={isDark ? '#8b949e' : '#5c6370'}
                  fontSize="10"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {layoutedNodes.map((node) => {
          const isSelected = selectedNode === node.id;
          const color = getNodeColor(node.type);
          const icon = getNodeIcon(node.type);
          const label = node.data?.label || node.type;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => handleNodeClick(node)}
              style={{ cursor: 'pointer' }}
            >
              {/* Node background */}
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="8"
                fill={nodeBackground}
                stroke={isSelected ? color : borderColor}
                strokeWidth={isSelected ? 2 : 1}
              />

              {/* Color accent bar */}
              <rect
                width={NODE_WIDTH}
                height="4"
                rx="8"
                fill={color}
              />
              <rect
                x="0"
                y="4"
                width={NODE_WIDTH}
                height="4"
                fill={nodeBackground}
              />

              {/* Icon */}
              <text
                x="12"
                y={NODE_HEIGHT / 2 + 5}
                fontSize="18"
              >
                {icon}
              </text>

              {/* Label */}
              <text
                x="38"
                y={NODE_HEIGHT / 2 + 4}
                fill={textColor}
                fontSize="12"
                fontWeight="500"
                fontFamily="Inter, -apple-system, sans-serif"
              >
                {label.length > 16 ? label.slice(0, 16) + '...' : label}
              </text>

              {/* Type badge */}
              <text
                x={NODE_WIDTH - 8}
                y={NODE_HEIGHT - 8}
                textAnchor="end"
                fill={isDark ? '#8b949e' : '#5c6370'}
                fontSize="9"
                fontFamily="Inter, -apple-system, sans-serif"
              >
                {node.type.replace(/_/g, ' ')}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Footer badge */}
      <div style={badgeStyle}>MCP App • {layoutedNodes.length} nodes</div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  fontFamily: "'Inter', -apple-system, 'Segoe UI', 'Roboto', sans-serif",
};

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  fontSize: '14px',
};

const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '12px',
  right: '12px',
  padding: '4px 10px',
  fontSize: '10px',
  fontWeight: 500,
  borderRadius: '4px',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: '#fff',
};

export default App;
