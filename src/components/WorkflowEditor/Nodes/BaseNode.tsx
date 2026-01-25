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
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { WorkflowNode } from '@/types/workflow';
import { useHelp } from '@/contexts/HelpContext';
import type { HelpTopicId } from '@/types/help';

// Node status type for execution visualization
type NodeStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface BaseNodeData extends WorkflowNode {
  label?: string;
  status?: NodeStatus;
  onConfigure?: () => void;
  // Extension node metadata (passed from node definition)
  extensionColor?: string;
  extensionIcon?: string;
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
  'atlas-cluster': '#00684A',
  'atlas-data-api': '#00684A',
  'google-sheets': '#0F9D58',
  'email-send': '#2196F3',
  'notification': '#2196F3',
  'transform': '#607D8B',
  'filter': '#607D8B',
  'merge': '#607D8B',
  'ai-prompt': '#E91E63',
  'ai-classify': '#E91E63',
  'ai-extract': '#E91E63',
  'ai-embed': '#00897B',
  'vector-search': '#00897B',
  'semantic-search': '#00897B',
  'field-event-trigger': '#4CAF50',
  'form-field-update': '#2196F3',
  'html-output': '#00897B',
  'code': '#795548',
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
  'atlas-cluster': '☁️',
  'atlas-data-api': '🔌',
  'google-sheets': '📊',
  'email-send': '📧',
  'notification': '🔔',
  'transform': '🔧',
  'filter': '🔍',
  'merge': '🔗',
  'ai-prompt': '🤖',
  'ai-classify': '🏷️',
  'ai-extract': '📋',
  'ai-embed': '🔗',
  'vector-search': '🔍',
  'semantic-search': '🔎',
  'field-event-trigger': '⚡',
  'form-field-update': '✏️',
  'html-output': '📄',
  'code': '💻',
};

// Map node types to help topic IDs
const NODE_HELP_TOPICS: Record<string, HelpTopicId> = {
  'manual-trigger': 'node-manual-trigger',
  'form-trigger': 'node-form-trigger',
  'webhook-trigger': 'node-webhook-trigger',
  'schedule-trigger': 'node-schedule-trigger',
  'conditional': 'node-conditional',
  'switch': 'node-switch',
  'loop': 'node-loop',
  'delay': 'node-delay',
  'http-request': 'node-http-request',
  'mongodb-query': 'node-mongodb-query',
  'mongodb-write': 'node-mongodb-write',
  'atlas-cluster': 'node-atlas-cluster',
  'atlas-data-api': 'node-atlas-data-api',
  'google-sheets': 'node-google-sheets',
  'email-send': 'node-email-send',
  'notification': 'node-notification',
  'transform': 'node-transform',
  'filter': 'node-filter',
  'merge': 'node-merge',
  'ai-prompt': 'node-ai-prompt',
  'ai-classify': 'node-ai-classify',
  'ai-extract': 'node-ai-extract',
  'ai-embed': 'node-ai-embed',
  'vector-search': 'node-vector-search',
  'semantic-search': 'node-semantic-search',
  'code': 'node-code',
  'html-output': 'node-html-output',
};

function BaseNodeComponent({ data, selected, isConnectable }: NodeProps<BaseNodeData>) {
  const theme = useTheme();
  const { openHelp } = useHelp();

  // Use extension-provided color/icon if available, otherwise fall back to hardcoded maps
  const nodeColor = data.extensionColor || NODE_COLORS[data.type] || theme.palette.grey[500];
  const nodeIcon = data.extensionIcon || NODE_ICONS[data.type] || '⚙️';
  const helpTopicId = NODE_HELP_TOPICS[data.type];

  // Handle help button click
  const handleHelpClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection when clicking help
    if (helpTopicId) {
      openHelp(helpTopicId);
    }
  };

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
          {helpTopicId && (
            <Tooltip title="Help" placement="top" arrow>
              <IconButton
                size="small"
                onClick={handleHelpClick}
                sx={{
                  p: 0.25,
                  opacity: 0.5,
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    opacity: 1,
                    bgcolor: alpha(nodeColor, 0.1),
                  },
                }}
              >
                <HelpIcon sx={{ fontSize: 14, color: nodeColor }} />
              </IconButton>
            </Tooltip>
          )}
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
          width: 12,
          height: 12,
          background: nodeColor,
          border: `2px solid ${theme.palette.background.paper}`,
        }}
      />

      {/* Output Handle (right) - positioned after Paper so it renders on top */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        style={{
          width: 12,
          height: 12,
          background: nodeColor,
          border: `2px solid ${theme.palette.background.paper}`,
        }}
      />
    </Box>
  );
}

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
