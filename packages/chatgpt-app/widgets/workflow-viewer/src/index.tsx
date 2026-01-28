/**
 * Workflow Viewer Widget for ChatGPT
 *
 * Displays workflow diagrams with nodes and connections.
 * Phase 2 implementation placeholder.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface WorkflowViewerData {
  workflow: {
    id: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  theme: 'light' | 'dark';
  fitView: boolean;
}

interface OpenAIGlobal {
  toolOutput?: {
    structuredContent?: WorkflowViewerData;
  };
  theme?: 'light' | 'dark';
  requestDisplayMode?: (mode: 'inline' | 'fullscreen') => void;
  notifyIntrinsicHeight?: (height: number) => void;
}

declare global {
  interface Window {
    openai?: OpenAIGlobal;
  }
}

function useOpenAI() {
  const [openai, setOpenai] = useState(window.openai);

  useEffect(() => {
    const handleSetGlobals = () => setOpenai({ ...window.openai });
    window.addEventListener('openai:set_globals', handleSetGlobals);
    return () => window.removeEventListener('openai:set_globals', handleSetGlobals);
  }, []);

  return openai;
}

const NODE_ICONS: Record<string, string> = {
  trigger: '⚡',
  action: '▶️',
  condition: '🔀',
  delay: '⏱️',
  email: '📧',
  webhook: '🔗',
  default: '⬜',
};

function WorkflowViewer() {
  const openai = useOpenAI();
  const data = openai?.toolOutput?.structuredContent;

  useEffect(() => {
    openai?.notifyIntrinsicHeight?.(document.body.scrollHeight);
  }, [data, openai]);

  if (!data?.workflow) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        <span style={{ fontSize: '48px' }}>⚡</span>
        <p style={{ marginTop: '12px' }}>No workflow data available</p>
      </div>
    );
  }

  const { workflow } = data;

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: '#1a1a1a',
        color: '#fff',
        padding: '20px',
        minHeight: '300px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>
          ⚡ {workflow.name}
        </h2>
        {workflow.description && (
          <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
            {workflow.description}
          </p>
        )}
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>
          {workflow.nodes.length} nodes • {workflow.edges.length} connections
        </p>
      </div>

      {/* Simple node list view (Phase 2 will add ReactFlow diagram) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        {workflow.nodes.map((node) => (
          <div
            key={node.id}
            style={{
              background: '#2a2a2a',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #333',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>
                {NODE_ICONS[node.type] || NODE_ICONS.default}
              </span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{node.label}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{node.type}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen button */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button
          onClick={() => openai?.requestDisplayMode?.('fullscreen')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #444',
            background: 'transparent',
            color: '#aaa',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          🔍 View fullscreen
        </button>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<WorkflowViewer />);
}

export default WorkflowViewer;
