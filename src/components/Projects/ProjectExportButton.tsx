/**
 * Project Export Button
 *
 * A button component that triggers the project export dialog.
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
  Download as DownloadIcon,
  IosShare as ExportIcon,
  Archive as BundleIcon,
} from '@mui/icons-material';
import { Project } from '@/types/platform';
import { ProjectExportDialog } from './ProjectExportDialog';

interface ProjectExportButtonProps {
  project: Project;
  organizationId: string;
  variant?: 'button' | 'icon' | 'menu-item';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export function ProjectExportButton({
  project,
  organizationId,
  variant = 'button',
  size = 'medium',
  disabled = false,
}: ProjectExportButtonProps) {
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
          startIcon={<ExportIcon />}
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
          Export
        </Button>
      )}

      {variant === 'icon' && (
        <Tooltip title="Export project as bundle">
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
            <ExportIcon fontSize={size === 'small' ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
      )}

      {variant === 'menu-item' && (
        <MenuItem onClick={handleClick} disabled={disabled}>
          <ListItemIcon>
            <BundleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Export as Bundle"
            secondary="Download project as portable package"
          />
        </MenuItem>
      )}

      <ProjectExportDialog
        open={dialogOpen}
        onClose={handleClose}
        project={project}
        organizationId={organizationId}
      />
    </>
  );
}

/**
 * Quick Export Button
 *
 * A simpler button that immediately downloads the bundle without showing options.
 * Useful for quick exports where default options are acceptable.
 */
interface QuickExportButtonProps {
  projectId: string;
  projectName: string;
  organizationId: string;
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export function QuickExportButton({
  projectId,
  projectName,
  organizationId,
  variant = 'icon',
  size = 'small',
  disabled = false,
}: QuickExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/bundle?orgId=${organizationId}&format=json`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export project');
      }

      const data = await response.json();

      // Create downloadable JSON
      const jsonString = JSON.stringify(data.bundle, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-bundle.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting project:', err);
      alert(err instanceof Error ? err.message : 'Failed to export project');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'button') {
    return (
      <Button
        variant="text"
        startIcon={loading ? undefined : <DownloadIcon />}
        onClick={handleExport}
        disabled={disabled || loading}
        size={size}
      >
        {loading ? 'Exporting...' : 'Export'}
      </Button>
    );
  }

  return (
    <Tooltip title="Quick export bundle">
      <IconButton
        onClick={handleExport}
        disabled={disabled || loading}
        size={size}
      >
        <DownloadIcon fontSize={size === 'small' ? 'small' : 'medium'} />
      </IconButton>
    </Tooltip>
  );
}
