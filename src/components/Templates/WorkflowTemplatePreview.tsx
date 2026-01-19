'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Edit,
} from '@mui/icons-material';
import Image from 'next/image';
import { WorkflowTemplate } from '@/lib/templates/loader';
import { TemplateIcon } from './TemplateIcon';

// Node type to icon/color mapping (from AIWorkflowGeneratorDialog)
const NODE_DISPLAY: Record<string, { icon: string; color: string }> = {
  'manual-trigger': { icon: '▶️', color: '#4CAF50' },
  'form-trigger': { icon: '📝', color: '#2196F3' },
  'webhook-trigger': { icon: '🔗', color: '#FF9800' },
  'schedule-trigger': { icon: '⏰', color: '#9C27B0' },
  'conditional': { icon: '🔀', color: '#9C27B0' },
  'loop': { icon: '🔁', color: '#9C27B0' },
  'delay': { icon: '⏱️', color: '#9C27B0' },
  'http-request': { icon: '🌐', color: '#FF9800' },
  'mongodb-query': { icon: '🔍', color: '#00897B' },
  'mongodb-write': { icon: '💾', color: '#00897B' },
  'email-send': { icon: '📧', color: '#2196F3' },
  'notification': { icon: '🔔', color: '#2196F3' },
  'transform': { icon: '⚙️', color: '#607D8B' },
  'filter': { icon: '🔽', color: '#607D8B' },
  'merge': { icon: '🔗', color: '#607D8B' },
  'ai-prompt': { icon: '🤖', color: '#E91E63' },
  'ai-classify': { icon: '🏷️', color: '#E91E63' },
  'ai-extract': { icon: '📊', color: '#E91E63' },
};

interface WorkflowTemplatePreviewProps {
  open: boolean;
  template: WorkflowTemplate | null;
  onClose: () => void;
  onUseTemplate: (template: WorkflowTemplate) => void;
  onCustomize?: (template: WorkflowTemplate) => void;
}

export function WorkflowTemplatePreview({
  open,
  template,
  onClose,
  onUseTemplate,
  onCustomize,
}: WorkflowTemplatePreviewProps) {
  if (!template) return null;

  const handleUseTemplate = () => {
    onUseTemplate(template);
    onClose();
  };

  const handleCustomize = () => {
    if (onCustomize) {
      onCustomize(template);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TemplateIcon icon={template.icon} size={32} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {template.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {template.description}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {template.previewImageUrl && (
          <Box
            sx={{
              mb: 3,
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                paddingTop: '56.25%', // 16:9 aspect ratio
                bgcolor: 'background.default',
              }}
            >
              <Image
                src={template.previewImageUrl}
                alt={`${template.name} preview`}
                fill
                style={{
                  objectFit: 'contain',
                }}
              />
            </Box>
          </Box>
        )}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label={template.category}
              size="small"
              sx={{ fontWeight: 500 }}
            />
            <Chip
              label={`${template.nodeCount} nodes`}
              size="small"
              variant="outlined"
            />
            {template.complexity && (
              <Chip
                label={template.complexity}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Nodes ({template.nodes.length})
          </Typography>

          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <List dense>
              {template.nodes.map((node, index) => {
                const display = NODE_DISPLAY[node.type] || { icon: '⬜', color: '#666' };
                return (
                  <ListItem
                    key={index}
                    sx={{
                      borderBottom: index < template.nodes.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          bgcolor: alpha(display.color, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                        }}
                      >
                        {display.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {node.label}
                          </Typography>
                          {node.type.endsWith('-trigger') && (
                            <Chip
                              label="Trigger"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: 9,
                                bgcolor: alpha('#4CAF50', 0.1),
                                color: '#4CAF50',
                                '& .MuiChip-label': { px: 0.5 },
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Chip
                          label={node.type}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            mt: 0.5,
                            '& .MuiChip-label': { px: 0.5 },
                          }}
                        />
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        {onCustomize && (
          <Button
            onClick={handleCustomize}
            variant="outlined"
            startIcon={<Edit />}
            sx={{
              borderColor: 'divider',
              '&:hover': {
                borderColor: '#2196f3',
                bgcolor: alpha('#2196f3', 0.05),
              },
            }}
          >
            Customize
          </Button>
        )}
        <Button
          onClick={handleUseTemplate}
          variant="contained"
          startIcon={<CheckCircle />}
          sx={{
            bgcolor: '#9C27B0',
            color: '#fff',
            '&:hover': {
              bgcolor: '#7B1FA2',
            },
          }}
        >
          Use Template
        </Button>
      </DialogActions>
    </Dialog>
  );
}