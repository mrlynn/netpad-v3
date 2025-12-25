'use client';

import {
  Drawer,
  Box,
  Typography,
  IconButton,
  alpha,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  Close,
  Delete,
  ContentCopy,
} from '@mui/icons-material';
import { FieldConfig } from '@/types/form';
import { FieldDetailPanel } from './FieldDetailPanel';

interface FieldConfigDrawerProps {
  open: boolean;
  config: FieldConfig | null;
  allFieldConfigs: FieldConfig[];
  formSlug?: string;
  advancedMode?: boolean;
  onClose: () => void;
  onUpdateField: (path: string, updates: Partial<FieldConfig>) => void;
  onDeleteField?: (path: string) => void;
  onDuplicateField?: (config: FieldConfig) => void;
}

export function FieldConfigDrawer({
  open,
  config,
  allFieldConfigs,
  formSlug,
  advancedMode = false,
  onClose,
  onUpdateField,
  onDeleteField,
  onDuplicateField,
}: FieldConfigDrawerProps) {
  if (!config) return null;

  const handleDelete = () => {
    if (onDeleteField) {
      onDeleteField(config.path);
      onClose();
    }
  };

  const handleDuplicate = () => {
    if (onDuplicateField) {
      onDuplicateField(config);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 380,
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Use FieldDetailPanel for the content */}
        <FieldDetailPanel
          config={config}
          allFieldConfigs={allFieldConfigs}
          formSlug={formSlug}
          onUpdateField={onUpdateField}
          onClose={onClose}
          advancedMode={advancedMode}
        />

        {/* Footer with actions */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
            bgcolor: 'background.paper',
          }}
        >
          {onDuplicateField && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ContentCopy sx={{ fontSize: 16 }} />}
              onClick={handleDuplicate}
              sx={{
                flex: 1,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: '#2196f3',
                  color: '#2196f3',
                  bgcolor: alpha('#2196f3', 0.05),
                },
              }}
            >
              Duplicate
            </Button>
          )}
          {onDeleteField && config.source === 'custom' && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Delete sx={{ fontSize: 16 }} />}
              onClick={handleDelete}
              sx={{
                flex: 1,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'error.main',
                  color: 'error.main',
                  bgcolor: alpha('#f44336', 0.05),
                },
              }}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
