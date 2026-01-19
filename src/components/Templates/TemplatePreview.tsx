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
  ListItemText,
  alpha,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Edit,
  Lock,
  Shield,
} from '@mui/icons-material';
import Image from 'next/image';
import { FormTemplate } from '@/lib/templates/loader';
import { FieldConfig } from '@/types/form';
import { TemplateIcon } from './TemplateIcon';

interface TemplatePreviewProps {
  open: boolean;
  template: FormTemplate | null;
  onClose: () => void;
  onUseTemplate: (template: FormTemplate) => void;
  onCustomize?: (template: FormTemplate) => void;
}

export function TemplatePreview({
  open,
  template,
  onClose,
  onUseTemplate,
  onCustomize,
}: TemplatePreviewProps) {
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
            {template.previewImageUrl ? (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  flexShrink: 0,
                }}
              >
                <Image
                  src={template.previewImageUrl}
                  alt={template.name}
                  width={48}
                  height={48}
                  style={{
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%',
                  }}
                />
              </Box>
            ) : (
              <TemplateIcon icon={template.icon} size={32} />
            )}
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
              label={`${template.fields.length} fields`}
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
            {/* Encryption indicator if template has encrypted fields */}
            {template.fields.some((f: any) => f.encryption?.enabled) && (
              <Chip
                icon={<Shield sx={{ fontSize: 14 }} />}
                label={`${template.fields.filter((f: any) => f.encryption?.enabled).length} encrypted`}
                size="small"
                sx={{
                  bgcolor: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#22c55e' },
                }}
              />
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Fields ({template.fields.length})
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
              {template.fields.map((field: any, index: number) => (
                <ListItem
                  key={field.path || index}
                  sx={{
                    borderBottom: index < template.fields.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {field.label || field.path}
                        </Typography>
                        {field.required && (
                          <Chip
                            label="Required"
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: 9,
                              '& .MuiChip-label': { px: 0.5 },
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={field.type || 'string'}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            '& .MuiChip-label': { px: 0.5 },
                          }}
                        />
                        {field.encryption?.enabled && (
                          <Chip
                            icon={<Lock sx={{ fontSize: 10 }} />}
                            label={field.encryption?.algorithm === 'Indexed' ? 'Queryable' : 'Encrypted'}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              bgcolor: field.encryption?.algorithm === 'Indexed'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(139, 92, 246, 0.15)',
                              color: field.encryption?.algorithm === 'Indexed' ? '#3b82f6' : '#8b5cf6',
                              '& .MuiChip-label': { px: 0.5 },
                              '& .MuiChip-icon': {
                                fontSize: 10,
                                color: field.encryption?.algorithm === 'Indexed' ? '#3b82f6' : '#8b5cf6',
                              },
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
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
            bgcolor: '#00ED64',
            color: '#000',
            '&:hover': {
              bgcolor: '#00D95A',
            },
          }}
        >
          Use Template
        </Button>
      </DialogActions>
    </Dialog>
  );
}
