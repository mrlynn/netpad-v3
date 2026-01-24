'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

interface UnsavedChangesModalProps {
  open: boolean;
  entityType: 'form' | 'workflow';
  entityName?: string;
  onSave: () => Promise<boolean>;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesModal({
  open,
  entityType,
  entityName,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesModalProps) {
  const theme = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const entityLabel = entityType === 'form' ? 'form' : 'workflow';
  const displayName = entityName || `this ${entityLabel}`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await onSave();
      if (success) {
        // onSave should handle navigation after successful save
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 1,
        }}
      >
        <WarningIcon
          sx={{
            color: theme.palette.warning.main,
            fontSize: 28,
          }}
        />
        Unsaved Changes
      </DialogTitle>

      <DialogContent>
        <DialogContentText>
          You have unsaved changes to{' '}
          <strong>&quot;{displayName}&quot;</strong>. What would you like to do?
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={onCancel}
          color="inherit"
          disabled={isSaving}
          sx={{
            color: 'text.secondary',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onDiscard}
          color="error"
          variant="outlined"
          disabled={isSaving}
        >
          Discard
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            bgcolor: theme.palette.primary.main,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.9),
            },
          }}
        >
          {isSaving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UnsavedChangesModal;
