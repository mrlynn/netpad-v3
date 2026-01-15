/**
 * Application Import Button
 *
 * A button component that triggers the application import dialog.
 * Can be used as a standalone button or within a menu.
 */

'use client';

import { useState } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Upload as UploadIcon,
  FileUpload as FileUploadIcon,
  Apps as AppsIcon,
} from '@mui/icons-material';
import { ApplicationImportDialog } from './ApplicationImportDialog';

interface ApplicationImportButtonProps {
  organizationId: string;
  projectId?: string;
  variant?: 'button' | 'icon' | 'menu-item';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onImportComplete?: (result: { forms: number; workflows: number; connections: number }) => void;
}

export function ApplicationImportButton({
  organizationId,
  projectId,
  variant = 'button',
  size = 'medium',
  disabled = false,
  onImportComplete,
}: ApplicationImportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
  };

  return (
    <>
      {variant === 'button' && (
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={handleClick}
          disabled={disabled}
          size={size}
          sx={{
            borderColor: 'rgba(0, 237, 100, 0.5)',
            color: '#00ED64',
            '&:hover': {
              borderColor: '#00ED64',
              backgroundColor: 'rgba(0, 237, 100, 0.08)',
            },
          }}
        >
          Import Application
        </Button>
      )}

      {variant === 'icon' && (
        <Tooltip title="Import application bundle">
          <IconButton
            onClick={handleClick}
            disabled={disabled}
            size={size}
            sx={{
              color: '#00ED64',
              '&:hover': {
                backgroundColor: 'rgba(0, 237, 100, 0.08)',
              },
            }}
          >
            <UploadIcon fontSize={size === 'small' ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
      )}

      {variant === 'menu-item' && (
        <MenuItem onClick={handleClick} disabled={disabled}>
          <ListItemIcon>
            <FileUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Import Application"
            secondary="Load forms, workflows, and connections from bundle"
          />
        </MenuItem>
      )}

      <ApplicationImportDialog
        open={dialogOpen}
        onClose={handleClose}
        organizationId={organizationId}
        projectId={projectId}
        onImportComplete={onImportComplete}
      />
    </>
  );
}
