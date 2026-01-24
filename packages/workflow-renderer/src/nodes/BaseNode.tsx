/**
 * BaseNode - Shared node wrapper component for @netpad/workflow-renderer
 *
 * This component provides the common structure and styling for all node types.
 * Individual node components wrap their content in this component.
 */

import React, { memo, type CSSProperties } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useRendererTheme } from '../hooks/useTheme';
import type { NodeCategory, NodeStatus } from '../types/workflow';

export interface BaseNodeProps {
  /** Node category for color styling */
  category: NodeCategory;

  /** Icon to display (emoji or unicode) */
  icon: string;

  /** Main label text */
  label: string;

  /** Optional description/notes */
  description?: string;

  /** Whether the node is selected */
  selected?: boolean;

  /** Config preview text shown below label */
  configPreview?: string;

  /** Number of input handles (0 for triggers) */
  inputHandles?: number;

  /** Number of output handles (1 for most nodes) */
  outputHandles?: number;

  /** Custom output handle definitions for multi-output nodes */
  outputHandleDefs?: Array<{
    id: string;
    label: string;
    color?: string;
  }>;

  /** Node execution status */
  status?: NodeStatus;

  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status?: NodeStatus }) {
  const theme = useRendererTheme();

  if (!status || status === 'idle') return null;

  const statusStyles: Record<Exclude<NodeStatus, 'idle'>, CSSProperties> = {
    running: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: theme.status.running,
      animation: 'wr-pulse 1.5s ease-in-out infinite',
    },
    success: {
      width: 12,
      height: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.status.success,
      fontSize: 10,
    },
    error: {
      width: 12,
      height: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.status.error,
      fontSize: 10,
    },
  };

  const style = statusStyles[status];
  if (!style) return null;

  if (status === 'success') {
    return <span style={style}>✓</span>;
  }
  if (status === 'error') {
    return <span style={style}>✕</span>;
  }
  return <span style={style} />;
}

/**
 * BaseNode component
 */
function BaseNodeComponent({
  category,
  icon,
  label,
  description,
  selected = false,
  configPreview,
  inputHandles = 1,
  outputHandles = 1,
  outputHandleDefs,
  status,
  error,
}: BaseNodeProps) {
  const theme = useRendererTheme();
  const categoryColor = theme.nodeCategories[category];

  // Calculate node height based on output handles
  const handleSpacing = 28;
  const hasMultipleOutputs = outputHandleDefs && outputHandleDefs.length > 1;
  const minBodyHeight = hasMultipleOutputs
    ? Math.max(40, outputHandleDefs.length * handleSpacing)
    : 40;

  const nodeStyles: CSSProperties = {
    minWidth: 180,
    maxWidth: 250,
    backgroundColor: theme.node.background,
    borderRadius: theme.node.borderRadius,
    border: `2px solid ${selected ? categoryColor : theme.node.border}`,
    boxShadow: selected ? theme.node.shadow : 'none',
    overflow: 'hidden',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const headerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    backgroundColor: `${categoryColor}15`,
    borderBottom: `1px solid ${categoryColor}30`,
  };

  const iconStyles: CSSProperties = {
    fontSize: 16,
    lineHeight: 1,
  };

  const labelStyles: CSSProperties = {
    flex: 1,
    fontWeight: 600,
    fontSize: 13,
    color: categoryColor,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const bodyStyles: CSSProperties = {
    padding: '8px 12px',
    minHeight: minBodyHeight,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: hasMultipleOutputs ? 'center' : 'flex-start',
  };

  const descriptionStyles: CSSProperties = {
    fontSize: 11,
    color: theme.node.textSecondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const configPreviewStyles: CSSProperties = {
    fontSize: 10,
    color: theme.node.textSecondary,
    marginTop: 4,
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const handleStyle: CSSProperties = {
    width: 10,
    height: 10,
    backgroundColor: categoryColor,
    border: `2px solid ${theme.node.background}`,
  };

  const outputLabelStyles: CSSProperties = {
    fontSize: 10,
    color: theme.node.textSecondary,
    fontWeight: 500,
    textAlign: 'right',
    paddingRight: 4,
    height: handleSpacing,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  };

  return (
    <div className="wr-base-node" style={{ position: 'relative' }}>
      <div style={nodeStyles}>
        {/* Header */}
        <div style={headerStyles}>
          <span style={iconStyles}>{icon}</span>
          <span style={labelStyles}>{label}</span>
          <StatusIndicator status={status} />
        </div>

        {/* Body */}
        <div style={bodyStyles}>
          {hasMultipleOutputs ? (
            // Multi-output layout with labels
            outputHandleDefs?.map((def) => (
              <div key={def.id} style={outputLabelStyles}>
                <span style={{ color: def.color || categoryColor }}>{def.label}</span>
              </div>
            ))
          ) : (
            // Standard layout with description/config
            <>
              {description || configPreview ? (
                <>
                  {description && <div style={descriptionStyles}>{description}</div>}
                  {configPreview && <div style={configPreviewStyles}>{configPreview}</div>}
                </>
              ) : (
                <div style={{ ...descriptionStyles, color: theme.node.textSecondary, opacity: 0.5 }}>
                  No description
                </div>
              )}
              {error && (
                <div style={{ ...descriptionStyles, color: theme.status.error, marginTop: 4 }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input Handle */}
      {inputHandles > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{
            ...handleStyle,
            left: -5,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}

      {/* Output Handles */}
      {hasMultipleOutputs ? (
        // Multiple output handles with positioning
        outputHandleDefs?.map((def, index) => {
          const topOffset = 44 + 8 + (index * handleSpacing) + (handleSpacing / 2);
          return (
            <Handle
              key={def.id}
              type="source"
              position={Position.Right}
              id={def.id}
              style={{
                ...handleStyle,
                backgroundColor: def.color || categoryColor,
                right: -5,
                top: topOffset,
                transform: 'none',
              }}
            />
          );
        })
      ) : outputHandles > 0 ? (
        // Single output handle
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{
            ...handleStyle,
            right: -5,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      ) : null}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
