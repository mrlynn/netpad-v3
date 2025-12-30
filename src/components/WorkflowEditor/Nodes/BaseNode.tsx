'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { WorkflowNode } from '@/types/workflow';

// Node status type for execution visualization
type NodeStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface BaseNodeData extends WorkflowNode {
  label?: string;
  status?: NodeStatus;
  onConfigure?: () => void;
}

const NODE_COLORS: Record<string, string> = {
  'manual-trigger': '#4CAF50',
  'form-trigger': '#4CAF50',
  'webhook-trigger': '#4CAF50',
  'schedule-trigger': '#4CAF50',
  'conditional': '#9C27B0',
  'switch': '#9C27B0',
  'loop': '#9C27B0',
  'delay': '#9C27B0',
  'http-request': '#FF9800',
  'mongodb-query': '#00897B',
  'mongodb-write': '#00897B',
  'email-send': '#2196F3',
  'notification': '#2196F3',
  'transform': '#607D8B',
  'filter': '#607D8B',
  'merge': '#607D8B',
  'ai-prompt': '#E91E63',
  'ai-classify': '#E91E63',
  'ai-extract': '#E91E63',
};

const NODE_ICONS: Record<string, string> = {
  'manual-trigger': '▶️',
  'form-trigger': '📝',
  'webhook-trigger': '🔗',
  'schedule-trigger': '⏰',
  'conditional': '🔀',
  'switch': '🔀',
  'loop': '🔄',
  'delay': '⏳',
  'http-request': '🌐',
  'mongodb-query': '🔍',
  'mongodb-write': '💾',
  'email-send': '📧',
  'notification': '🔔',
  'transform': '🔧',
  'filter': '🔍',
  'merge': '🔗',
  'ai-prompt': '🤖',
  'ai-classify': '🏷️',
  'ai-extract': '📋',
};

function BaseNodeComponent({ data, selected, isConnectable }: NodeProps<BaseNodeData>) {
  const theme = useTheme();
  const nodeColor = NODE_COLORS[data.type] || theme.palette.grey[500];
  const nodeIcon = NODE_ICONS[data.type] || '⚙️';

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
          maxWidth: 250,
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

        {/* Body */}
        <Box sx={{ px: 1.5, py: 1 }}>
          {data.notes ? (
            <Typography
              variant="caption"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                color: 'text.secondary',
              }}
            >
              {data.notes}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              No description
            </Typography>
          )}
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

      {/* Input Handle (left) - positioned after Paper so it renders on top */}
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

      {/* Output Handle (right) - positioned after Paper so it renders on top */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        style={{
          position: 'absolute',
          width: 12,
          height: 12,
          background: nodeColor,
          border: `2px solid ${theme.palette.background.paper}`,
          right: -6,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
    </Box>
  );
}

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
