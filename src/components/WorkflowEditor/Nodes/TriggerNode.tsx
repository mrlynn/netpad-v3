'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Paper,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow as ManualIcon,
  Description as FormIcon,
  Link as WebhookIcon,
  Schedule as ScheduleIcon,
  Api as ApiIcon,
} from '@mui/icons-material';
import { WorkflowNode } from '@/types/workflow';

interface TriggerNodeData extends WorkflowNode {
  label?: string;
  status?: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
}

const TRIGGER_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  label: string;
}> = {
  'manual-trigger': {
    icon: <ManualIcon />,
    color: '#4CAF50',
    label: 'Manual Start',
  },
  'form-trigger': {
    icon: <FormIcon />,
    color: '#2196F3',
    label: 'Form Submission',
  },
  'webhook-trigger': {
    icon: <WebhookIcon />,
    color: '#FF9800',
    label: 'Webhook',
  },
  'schedule-trigger': {
    icon: <ScheduleIcon />,
    color: '#9C27B0',
    label: 'Schedule',
  },
  'api-trigger': {
    icon: <ApiIcon />,
    color: '#00BCD4',
    label: 'API Call',
  },
};

function TriggerNodeComponent({ data, selected, isConnectable }: NodeProps<TriggerNodeData>) {
  const theme = useTheme();
  const config = TRIGGER_CONFIG[data.type] || TRIGGER_CONFIG['manual-trigger'];
  const nodeColor = config.color;

  // Get trigger-specific config display
  const getTriggerDetails = (): string => {
    const nodeConfig = data.config as Record<string, unknown>;
    switch (data.type) {
      case 'form-trigger':
        return nodeConfig?.formId ? `Form: ${nodeConfig.formId}` : 'Select a form';
      case 'webhook-trigger':
        return nodeConfig?.webhookUrl ? 'URL configured' : 'URL will be generated';
      case 'schedule-trigger':
        return (nodeConfig?.cron as string) || 'Set schedule';
      default:
        return 'Click to start workflow';
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Start indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          px: 1,
          py: 0.25,
          bgcolor: nodeColor,
          borderRadius: 1,
          boxShadow: 1,
          zIndex: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: 9,
            fontWeight: 700,
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Start
        </Typography>
      </Box>

      <Paper
        elevation={selected ? 4 : 1}
        sx={{
          minWidth: 200,
          maxWidth: 280,
          borderRadius: 2,
          overflow: 'hidden',
          border: `2px solid ${selected ? nodeColor : 'transparent'}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: theme.shadows[4],
          },
        }}
      >
        {/* Header with gradient */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.5,
            background: `linear-gradient(135deg, ${alpha(nodeColor, 0.15)} 0%, ${alpha(nodeColor, 0.05)} 100%)`,
            borderBottom: `1px solid ${alpha(nodeColor, 0.2)}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: alpha(nodeColor, 0.15),
              color: nodeColor,
            }}
          >
            {config.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: nodeColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {data.label || config.label}
            </Typography>
            <Chip
              label="TRIGGER"
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 600,
                bgcolor: alpha(nodeColor, 0.1),
                color: nodeColor,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getTriggerDetails()}
          </Typography>
        </Box>
      </Paper>

      {/* Output handle - positioned after Paper so it renders on top */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        style={{
          position: 'absolute',
          width: 14,
          height: 14,
          background: nodeColor,
          border: `3px solid ${theme.palette.background.paper}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          right: -7,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
    </Box>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
export default TriggerNode;
