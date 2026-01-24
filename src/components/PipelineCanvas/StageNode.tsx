'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Paper, Box, Typography, Badge, alpha, IconButton, Tooltip } from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Delete } from '@mui/icons-material';
import { StageNodeData } from '@/types/pipeline';
import { getStageDefinition } from '@/lib/stageDefinitions';
import * as Icons from '@mui/icons-material';

export const StageNode = memo(({ data, selected, id }: NodeProps<StageNodeData>) => {
  const definition = getStageDefinition(data.stageType);
  if (!definition) return null;

  const { deleteElements } = useReactFlow();
  const IconComponent = (Icons as any)[definition.icon] || Icons.Code;

  const hasError = !!data.error;
  const isExecuting = data.isExecuting || false;
  const docCount = data.docCount;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <Paper
      elevation={selected ? 4 : 2}
      sx={{
        minWidth: 200,
        border: '2px solid',
        borderColor: hasError
          ? 'error.main'
          : selected
          ? definition.color
          : 'divider',
        bgcolor: 'background.paper',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          borderColor: definition.color,
          boxShadow: `0 4px 16px ${alpha(definition.color, 0.3)}`
        }
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: definition.color,
          width: 12,
          height: 12,
          border: '2px solid',
          borderColor: 'background.paper'
        }}
      />

      {/* Node Header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(definition.color, 0.1),
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: alpha(definition.color, 0.2),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isExecuting ? (
            <NetPadLoader size="small" variant="svg" showPhrases={false} />
          ) : (
            <IconComponent sx={{ color: definition.color, fontSize: 18 }} />
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: '0.875rem'
            }}
          >
            {definition.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              fontFamily: 'monospace'
            }}
          >
            {data.stageType}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {docCount !== undefined && (
            <Badge
              badgeContent={docCount}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: definition.color,
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }
              }}
            />
          )}
          <Tooltip title="Delete stage (or press Delete key)">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': {
                  color: 'error.main',
                  bgcolor: alpha('#f85149', 0.1)
                }
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Node Body */}
      <Box sx={{ p: 1.5 }}>
        {hasError ? (
          <Typography
            variant="caption"
            sx={{
              color: 'error.main',
              fontSize: '0.75rem',
              display: 'block',
              wordBreak: 'break-word'
            }}
          >
            {data.error}
          </Typography>
        ) : (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {Object.keys(data.config).length > 0
              ? JSON.stringify(data.config).substring(0, 40) + '...'
              : 'No configuration'}
          </Typography>
        )}
      </Box>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: definition.color,
          width: 12,
          height: 12,
          border: '2px solid',
          borderColor: 'background.paper'
        }}
      />
    </Paper>
  );
});

StageNode.displayName = 'StageNode';

