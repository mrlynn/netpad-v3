'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  alpha,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Description,
  Storage,
  ArrowForward,
} from '@mui/icons-material';

interface NewFormDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (formName: string, collectionName: string) => void;
  suggestedName?: string;
}

// Generate a valid MongoDB collection name from a form name
function generateCollectionName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 64);
}

export function NewFormDialog({
  open,
  onClose,
  onConfirm,
  suggestedName = '',
}: NewFormDialogProps) {
  const [formName, setFormName] = useState(suggestedName);
  const [collectionName, setCollectionName] = useState('');

  // Update collection name when form name changes
  useEffect(() => {
    setCollectionName(generateCollectionName(formName));
  }, [formName]);

  // Reset when dialog opens with a new suggested name
  useEffect(() => {
    if (open && suggestedName) {
      setFormName(suggestedName);
      setCollectionName(generateCollectionName(suggestedName));
    }
  }, [open, suggestedName]);

  const handleConfirm = () => {
    if (formName.trim() && collectionName.trim()) {
      onConfirm(formName.trim(), collectionName.trim());
      // Reset for next time
      setFormName('');
      setCollectionName('');
    }
  };

  const handleClose = () => {
    setFormName('');
    setCollectionName('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${alpha('#00ED64', 0.1)} 0%, ${alpha('#00ED64', 0.02)} 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Description sx={{ color: '#00ED64' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Create New Form
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Give your form a name - this becomes your data collection
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <TextField
          fullWidth
          label="What data are you collecting?"
          placeholder="Customer Feedback, Event Registrations, Job Applications..."
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && formName.trim()) {
              handleConfirm();
            }
          }}
          autoFocus
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Description sx={{ color: 'text.disabled', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        {collectionName && (
          <Box
            sx={{
              p: 2,
              bgcolor: alpha('#00ED64', 0.05),
              borderRadius: 2,
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Storage sx={{ fontSize: 18, color: '#00ED64' }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Data will be stored in your MongoDB database:
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="forms"
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  bgcolor: alpha('#2196f3', 0.1),
                  color: '#2196f3',
                  height: 22,
                }}
              />
              <Typography variant="caption" color="text.secondary">→</Typography>
              <Chip
                label={collectionName}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Each form submission creates a document in this collection. You can browse your data anytime in the Data tab.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!formName.trim()}
          endIcon={<ArrowForward />}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            fontWeight: 600,
            '&:hover': { bgcolor: '#00c853' },
          }}
        >
          Create Form
        </Button>
      </DialogActions>
    </Dialog>
  );
}
