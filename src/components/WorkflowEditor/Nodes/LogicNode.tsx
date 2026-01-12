'use client';

import React, { memo, useMemo, useEffect } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from 'reactflow';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { WorkflowNode, OutputHandleDefinition, LOGIC_NODE_OUTPUTS } from '@/types/workflow';

// Node status type for execution visualization
type NodeStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface LogicNodeData extends WorkflowNode {
  label?: string;
  status?: NodeStatus;
  onConfigure?: () => void;
}

const NODE_COLORS: Record<string, string> = {
  'conditional': '#9C27B0',
  'switch': '#9C27B0',
  'loop': '#9C27B0',
};

const NODE_ICONS: Record<string, string> = {
  'conditional': '🔀',
  'switch': '🔀',
  'loop': '🔄',
};

/**
 * Derives switch node outputs from the cases configuration
 */
function getSwitchOutputs(config: Record<string, unknown>): OutputHandleDefinition[] {
  const outputs: OutputHandleDefinition[] = [];

  // Parse cases from config
  const cases = config.cases as Array<{ value: string; label?: string }> | undefined;
  if (cases && Array.isArray(cases)) {
    cases.forEach((caseItem, index) => {
      outputs.push({
        id: `case_${index}`,
        label: caseItem.label || String(caseItem.value),
        description: `Executes when value equals "${caseItem.value}"`,
      });
    });
  }

  // Always add default output
  outputs.push({
    id: 'default',
    label: 'Default',
    description: 'Executes when no case matches',
    color: '#607D8B',
  });

  return outputs;
}

/**
 * Gets the output handles for a node based on its type and config
 */
export function getNodeOutputs(type: string, config: Record<string, unknown>): OutputHandleDefinition[] {
  if (type === 'switch') {
    return getSwitchOutputs(config);
  }

  if (type === 'conditional') {
    const base = [...LOGIC_NODE_OUTPUTS['conditional']];
    // Add optional Else output if configured
    if (config.includeElse) {
      base.push({ id: 'else', label: 'Else', description: 'Executes as fallback', color: '#607D8B' });
    }
    return base;
  }

  return LOGIC_NODE_OUTPUTS[type] || [{ id: 'output', label: 'Output' }];
}

// Re-export for use elsewhere
export { getSwitchOutputs };

function LogicNodeComponent({ id, data, selected, isConnectable }: NodeProps<LogicNodeData>) {
  const theme = useTheme();
  const updateNodeInternals = useUpdateNodeInternals();

  const nodeColor = NODE_COLORS[data.type] || theme.palette.grey[500];
  const nodeIcon = NODE_ICONS[data.type] || '⚙️';

  // Get outputs based on node type and config
  const outputs = useMemo(
    () => getNodeOutputs(data.type, data.config || {}),
    [data.type, data.config]
  );

  // Update React Flow internals when handles change (important for switch node)
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, outputs.length, updateNodeInternals]);

  // Calculate node height based on number of outputs
  const handleSpacing = 28; // pixels between handles
  const headerHeight = 44;
  const minBodyHeight = 40;
  const calculatedBodyHeight = Math.max(minBodyHeight, outputs.length * handleSpacing);

  // Status indicator
  const StatusIndicator = () => {
    switch (data.status) {
      case 'running':
        return <PlayIcon sx={{ fontSize: 14, color: 'info.main', animation: 'pulse 1s infinite' }} />;
      case 'completed':
        return <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />;
      case 'pending':
        return <PendingIcon sx={{ fontSize: 14, color: 'warning.main' }} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Paper
        elevation={selected ? 4 : 1}
        sx={{
          minWidth: 180,
          maxWidth: 280,
          borderRadius: 2,
          overflow: 'hidden',
          border: `2px solid ${selected ? nodeColor : 'transparent'}`,
          opacity: data.enabled === false ? 0.5 : 1,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: theme.shadows[4],
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            bgcolor: alpha(nodeColor, 0.1),
            borderBottom: `1px solid ${alpha(nodeColor, 0.2)}`,
            height: headerHeight,
          }}
        >
          <Typography sx={{ fontSize: 16 }}>{nodeIcon}</Typography>
          <Typography
            variant="subtitle2"
            sx={{
              flex: 1,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: nodeColor,
            }}
          >
            {data.label || data.type}
          </Typography>
          <StatusIndicator />
        </Box>

        {/* Body with output labels */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            minHeight: calculatedBodyHeight,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {outputs.map((output) => (
            <Box
              key={output.id}
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                height: handleSpacing,
                pr: 0.5,
              }}
            >
              <Tooltip title={output.description || ''} placement="left">
                <Typography
                  variant="caption"
                  sx={{
                    color: output.color || 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    cursor: 'default',
                  }}
                >
                  {output.label}
                </Typography>
              </Tooltip>
            </Box>
          ))}
        </Box>

        {/* Disabled overlay */}
        {data.enabled === false && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.1)',
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              DISABLED
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Input Handle (single, left side) */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        style={{
          position: 'absolute',
          width: 12,
          height: 12,
          background: nodeColor,
          border: `2px solid ${theme.palette.background.paper}`,
          left: -6,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Multiple Output Handles (right side, stacked vertically) */}
      {outputs.map((output, index) => {
        // Position handles to align with labels in the body
        const topOffset = headerHeight + 8 + (index * handleSpacing) + (handleSpacing / 2);
        return (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            isConnectable={isConnectable}
            title={output.description || output.label}
            className="logic-node-handle"
            style={{
              position: 'absolute',
              width: 12,
              height: 12,
              background: output.color || nodeColor,
              border: `2px solid ${theme.palette.background.paper}`,
              right: -6,
              top: `${topOffset}px`,
              transform: 'none',
            }}
          />
        );
      })}
    </Box>
  );
}

export const LogicNode = memo(LogicNodeComponent);
export default LogicNode;
