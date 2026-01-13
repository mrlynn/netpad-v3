'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  alpha,
  ClickAwayListener,
  Fade,
} from '@mui/material';
import {
  Edit,
  Check,
  Close,
  DragIndicator,
  Delete,
  Settings,
} from '@mui/icons-material';
import { FieldConfig } from '@/types/form';

interface EditableFieldWrapperProps {
  config: FieldConfig;
  children: React.ReactNode;
  onUpdateLabel?: (newLabel: string) => void;
  onUpdatePlaceholder?: (newPlaceholder: string) => void;
  onDelete?: () => void;
  onOpenSettings?: () => void;
  editable?: boolean;
}

export function EditableFieldWrapper({
  config,
  children,
  onUpdateLabel,
  onUpdatePlaceholder,
  onDelete,
  onOpenSettings,
  editable = true,
}: EditableFieldWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabelValue, setEditLabelValue] = useState(config.label);

  const handleSaveLabel = () => {
    const trimmedValue = editLabelValue.trim();
    if (trimmedValue && trimmedValue !== config.label && onUpdateLabel) {
      onUpdateLabel(trimmedValue);
    } else {
      setEditLabelValue(config.label);
    }
    setIsEditingLabel(false);
  };

  const handleCancelLabel = () => {
    setEditLabelValue(config.label);
    setIsEditingLabel(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveLabel();
    } else if (e.key === 'Escape') {
      handleCancelLabel();
    }
  };

  if (!editable) {
    return <>{children}</>;
  }

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        borderRadius: 2,
        transition: 'all 0.15s ease',
        border: '2px solid transparent',
        '&:hover': {
          border: '2px solid',
          borderColor: alpha('#00ED64', 0.3),
          bgcolor: alpha('#00ED64', 0.02),
        },
      }}
    >
      {/* Editing toolbar - overlay pattern, positioned above field, no layout shift */}
      <Fade in={isHovered && !isEditingLabel}>
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 3,
            px: 0.5,
            py: 0.25,
            zIndex: 100,
            pointerEvents: 'auto',
            // Ensure toolbar overlays content without affecting layout
            opacity: (isHovered && !isEditingLabel) ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Tooltip title="Edit label" placement="top">
            <IconButton
              size="small"
              onClick={() => {
                setEditLabelValue(config.label);
                setIsEditingLabel(true);
              }}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': { color: '#00ED64', bgcolor: alpha('#00ED64', 0.1) },
              }}
            >
              <Edit sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          {onOpenSettings && (
            <Tooltip title="Field settings" placement="top">
              <IconButton
                size="small"
                onClick={onOpenSettings}
                sx={{
                  p: 0.5,
                  color: 'text.secondary',
                  '&:hover': { color: '#2196f3', bgcolor: alpha('#2196f3', 0.1) },
                }}
              >
                <Settings sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete field" placement="top">
              <IconButton
                size="small"
                onClick={onDelete}
                sx={{
                  p: 0.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main', bgcolor: alpha('#f44336', 0.1) },
                }}
              >
                <Delete sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Fade>

      {/* Inline label editing overlay */}
      {isEditingLabel && (
        <ClickAwayListener onClickAway={handleSaveLabel}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 4,
              p: 1.5,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Edit Question Label
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                value={editLabelValue}
                onChange={(e) => setEditLabelValue(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                fullWidth
                autoFocus
                placeholder="Enter question label..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#00ED64' },
                    '&:hover fieldset': { borderColor: '#00ED64' },
                    '&.Mui-focused fieldset': { borderColor: '#00ED64', borderWidth: 2 },
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={handleSaveLabel}
                sx={{
                  color: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.1),
                  '&:hover': { bgcolor: alpha('#00ED64', 0.2) },
                }}
              >
                <Check sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleCancelLabel}
                sx={{ color: 'text.secondary' }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        </ClickAwayListener>
      )}

      {/* Field content */}
      <Box sx={{ p: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
