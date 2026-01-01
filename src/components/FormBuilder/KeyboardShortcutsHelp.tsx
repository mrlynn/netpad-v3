'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  alpha,
  Chip,
} from '@mui/material';
import { Close, Keyboard } from '@mui/icons-material';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'editing';
}

const SHORTCUTS: ShortcutItem[] = [
  // Actions
  { keys: ['Cmd', 'S'], description: 'Save form', category: 'actions' },
  { keys: ['Cmd', 'N'], description: 'Add new field', category: 'actions' },
  { keys: ['Cmd', 'Shift', 'P'], description: 'Preview form', category: 'actions' },
  { keys: ['Cmd', 'Shift', 'A'], description: 'Toggle advanced mode', category: 'actions' },
  // Navigation
  { keys: ['Cmd', ','], description: 'Open settings', category: 'navigation' },
  { keys: ['Cmd', 'L'], description: 'Toggle form library', category: 'navigation' },
  { keys: ['Escape'], description: 'Close panel / dialog', category: 'navigation' },
];

// Detect if user is on Mac
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Convert "Cmd" to appropriate key for platform
const formatKey = (key: string) => {
  if (key === 'Cmd') return isMac ? '⌘' : 'Ctrl';
  if (key === 'Shift') return isMac ? '⇧' : 'Shift';
  if (key === 'Escape') return 'Esc';
  return key;
};

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const categories = [
    { id: 'actions', label: 'Actions' },
    { id: 'navigation', label: 'Navigation' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '80vh' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Keyboard sx={{ color: 'primary.main' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Keyboard Shortcuts
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {categories.map((category) => (
          <Box key={category.id} sx={{ mb: 2.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                mb: 1,
                display: 'block',
              }}
            >
              {category.label}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {SHORTCUTS.filter((s) => s.category === category.id).map((shortcut, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 0.75,
                    px: 1,
                    borderRadius: 1,
                    bgcolor: alpha('#00ED64', 0.03),
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    {shortcut.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {shortcut.keys.map((key, keyIdx) => (
                      <Chip
                        key={keyIdx}
                        label={formatKey(key)}
                        size="small"
                        sx={{
                          height: 22,
                          minWidth: 28,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ))}

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: alpha('#2196f3', 0.05),
            borderRadius: 1,
            border: '1px solid',
            borderColor: alpha('#2196f3', 0.2),
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Press <Chip label="?" size="small" sx={{ height: 18, fontSize: '0.65rem', mx: 0.5 }} /> anywhere to show this help.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
