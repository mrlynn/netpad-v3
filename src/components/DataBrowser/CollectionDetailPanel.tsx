'use client';

/**
 * Collection Detail Panel Component
 * Shows details about a selected collection including linked forms and workflows
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Stack,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  TableChart as CollectionIcon,
  Storage as DatabaseIcon,
  Description as FormIcon,
  AccountTree as WorkflowIcon,
  OpenInNew as OpenIcon,
  TableRows as BrowseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import type { SelectedNode, LinkedResourceInfo } from '@/types/dataExplorer';

interface CollectionDetailPanelProps {
  selectedNode: SelectedNode | null;
  linkedForms: LinkedResourceInfo[];
  linkedWorkflows: LinkedResourceInfo[];
  linkedLoading: boolean;
  documentCount?: number;
  storageSize?: number;
  onBrowseData: () => void;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDocCount(count?: number): string {
  if (!count) return '0';
  return count.toLocaleString();
}

export function CollectionDetailPanel({
  selectedNode,
  linkedForms,
  linkedWorkflows,
  linkedLoading,
  documentCount,
  storageSize,
  onBrowseData,
}: CollectionDetailPanelProps) {
  const router = useRouter();

  if (!selectedNode || selectedNode.type !== 'collection') {
    return (
      <Paper
        variant="outlined"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          p: 4,
        }}
      >
        <CollectionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Select a collection to view details
        </Typography>
        <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ mt: 1 }}>
          Click on a collection in the tree to see linked forms and workflows
        </Typography>
      </Paper>
    );
  }

  const handleOpenForm = (formId: string, projectId?: string) => {
    // Navigate to form builder
    if (projectId) {
      router.push(`/builder?formId=${formId}&projectId=${projectId}`);
    } else {
      router.push(`/builder?formId=${formId}`);
    }
  };

  const handleOpenWorkflow = (workflowId: string, projectId?: string) => {
    // Navigate to workflow editor
    if (projectId) {
      router.push(`/workflows/${workflowId}?projectId=${projectId}`);
    } else {
      router.push(`/workflows/${workflowId}`);
    }
  };

  const handleCreateForm = () => {
    // Navigate to form builder with collection pre-selected
    router.push(`/builder?collection=${selectedNode.collection}&database=${selectedNode.database}`);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: alpha('#00ED64', 0.05),
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
          <CollectionIcon sx={{ color: '#00ED64' }} />
          <Typography variant="h6" fontWeight={600}>
            {selectedNode.collection}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Chip
            icon={<DatabaseIcon sx={{ fontSize: '14px !important' }} />}
            label={selectedNode.database}
            size="small"
            variant="outlined"
            sx={{ height: 24 }}
          />
          {documentCount !== undefined && (
            <Chip
              label={`${formatDocCount(documentCount)} docs`}
              size="small"
              sx={{
                height: 24,
                bgcolor: alpha('#00ED64', 0.1),
                color: 'text.primary',
              }}
            />
          )}
          {storageSize !== undefined && storageSize > 0 && (
            <Chip
              label={formatSize(storageSize)}
              size="small"
              variant="outlined"
              sx={{ height: 24 }}
            />
          )}
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Linked Forms Section */}
        <Box sx={{ mb: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
            >
              Linked Forms ({linkedForms.length})
            </Typography>
          </Stack>

          {linkedLoading ? (
            <Stack spacing={1}>
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={40} />
            </Stack>
          ) : linkedForms.length === 0 ? (
            <Box
              sx={{
                py: 2,
                px: 1.5,
                borderRadius: 1,
                bgcolor: 'action.hover',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary" mb={1}>
                No forms linked to this collection
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleCreateForm}
                sx={{ color: '#00ED64' }}
              >
                Create Form
              </Button>
            </Box>
          ) : (
            <List disablePadding>
              {linkedForms.map((form) => (
                <ListItemButton
                  key={form.id}
                  onClick={() => handleOpenForm(form.id, form.projectId)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: alpha('#00ED64', 0.08),
                      borderColor: alpha('#00ED64', 0.3),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FormIcon sx={{ color: '#00ED64', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={form.name}
                    secondary={form.status}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 500,
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                    }}
                  />
                  <OpenIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Linked Workflows Section */}
        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              letterSpacing: 0.5,
              mb: 1,
            }}
          >
            Linked Workflows ({linkedWorkflows.length})
          </Typography>

          {linkedLoading ? (
            <Stack spacing={1}>
              <Skeleton variant="rounded" height={40} />
            </Stack>
          ) : linkedWorkflows.length === 0 ? (
            <Box
              sx={{
                py: 2,
                px: 1.5,
                borderRadius: 1,
                bgcolor: 'action.hover',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No workflows linked to this collection
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {linkedWorkflows.map((workflow) => (
                <ListItemButton
                  key={workflow.id}
                  onClick={() => handleOpenWorkflow(workflow.id, workflow.projectId)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: alpha('#9c27b0', 0.08),
                      borderColor: alpha('#9c27b0', 0.3),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WorkflowIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={workflow.name}
                    secondary={workflow.status}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 500,
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                    }}
                  />
                  <OpenIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Box>

      {/* Footer with actions */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<BrowseIcon />}
            onClick={onBrowseData}
            fullWidth
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.9),
              },
            }}
          >
            Browse Data
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateForm}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: '#00ED64',
                bgcolor: alpha('#00ED64', 0.08),
              },
            }}
          >
            Form
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
