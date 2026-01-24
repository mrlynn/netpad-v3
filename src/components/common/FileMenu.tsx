'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  NoteAdd as NewIcon,
  FolderOpen as OpenIcon,
  Save as SaveIcon,
  SaveAs as SaveAsIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  ContentCopy as DuplicateIcon,
  DriveFileRenameOutline as RenameIcon,
  DriveFileMove as MoveIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  History as RecentIcon,
  ChevronRight as SubMenuIcon,
} from '@mui/icons-material';

export interface RecentItem {
  id: string;
  name: string;
  type: 'form' | 'workflow';
  lastOpened: Date;
}

interface FileMenuProps {
  entityType: 'form' | 'workflow';
  entityName?: string;
  entityId?: string;
  isDirty?: boolean;

  // Callbacks - all optional, menu items hidden if not provided
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => Promise<boolean> | void;
  onSaveAs?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onDuplicate?: () => void;
  onRename?: () => void;
  onMoveToProject?: () => void;
  onDelete?: () => void;
  onClose?: () => void;

  // Optional
  recentItems?: RecentItem[];
  onOpenRecent?: (item: RecentItem) => void;
  disabled?: boolean;
}

interface ShortcutProps {
  keys: string;
}

function Shortcut({ keys }: ShortcutProps) {
  const theme = useTheme();
  return (
    <Typography
      component="span"
      sx={{
        ml: 'auto',
        pl: 3,
        fontSize: '0.75rem',
        color: alpha(theme.palette.text.secondary, 0.7),
        fontFamily: 'monospace',
      }}
    >
      {keys}
    </Typography>
  );
}

export function FileMenu({
  entityType,
  entityName,
  entityId,
  isDirty = false,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExport,
  onImport,
  onDuplicate,
  onRename,
  onMoveToProject,
  onDelete,
  onClose,
  recentItems = [],
  onOpenRecent,
  disabled = false,
}: FileMenuProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [recentMenuAnchor, setRecentMenuAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl+';

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setRecentMenuAnchor(null);
  };

  const handleAction = (action?: () => void | Promise<boolean>) => {
    if (action) {
      action();
    }
    handleClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCmd && e.key === 'n' && onNew) {
        e.preventDefault();
        onNew();
      } else if (isCmd && e.key === 'o' && onOpen) {
        e.preventDefault();
        onOpen();
      } else if (isCmd && e.shiftKey && e.key === 's' && onSaveAs) {
        e.preventDefault();
        onSaveAs();
      } else if (isCmd && e.key === 's' && onSave) {
        e.preventDefault();
        onSave();
      } else if (isCmd && e.key === 'e' && onExport) {
        e.preventDefault();
        onExport();
      } else if (isCmd && e.key === 'w' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMac, onNew, onOpen, onSave, onSaveAs, onExport, onClose]);

  const entityLabel = entityType === 'form' ? 'Form' : 'Workflow';

  return (
    <>
      <Button
        id="file-menu-button"
        aria-controls={open ? 'file-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        disabled={disabled}
        endIcon={<ExpandIcon />}
        sx={{
          color: theme.palette.text.primary,
          textTransform: 'none',
          fontWeight: 500,
          minWidth: 'auto',
          px: 1.5,
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        File
      </Button>

      <Menu
        id="file-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'file-menu-button',
          dense: true,
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            minWidth: 220,
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {/* New */}
        {onNew && (
          <MenuItem onClick={() => handleAction(onNew)}>
            <ListItemIcon>
              <NewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>New {entityLabel}</ListItemText>
            <Shortcut keys={`${cmdKey}N`} />
          </MenuItem>
        )}

        {/* Open */}
        {onOpen && (
          <MenuItem onClick={() => handleAction(onOpen)}>
            <ListItemIcon>
              <OpenIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Open...</ListItemText>
            <Shortcut keys={`${cmdKey}O`} />
          </MenuItem>
        )}

        {/* Open Recent - submenu */}
        {onOpenRecent && recentItems.length > 0 && (
          <MenuItem
            onMouseEnter={(e) => setRecentMenuAnchor(e.currentTarget)}
            onMouseLeave={() => setRecentMenuAnchor(null)}
          >
            <ListItemIcon>
              <RecentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Open Recent</ListItemText>
            <SubMenuIcon fontSize="small" sx={{ ml: 'auto', color: 'text.secondary' }} />
          </MenuItem>
        )}

        {(onNew || onOpen) && <Divider />}

        {/* Save */}
        {onSave && (
          <MenuItem onClick={() => handleAction(onSave)} disabled={!isDirty && !!entityId}>
            <ListItemIcon>
              <SaveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Save</ListItemText>
            <Shortcut keys={`${cmdKey}S`} />
          </MenuItem>
        )}

        {/* Save As */}
        {onSaveAs && (
          <MenuItem onClick={() => handleAction(onSaveAs)}>
            <ListItemIcon>
              <SaveAsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Save As...</ListItemText>
            <Shortcut keys={`${cmdKey}⇧S`} />
          </MenuItem>
        )}

        {/* Export */}
        {onExport && (
          <MenuItem onClick={() => handleAction(onExport)}>
            <ListItemIcon>
              <ExportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export...</ListItemText>
            <Shortcut keys={`${cmdKey}E`} />
          </MenuItem>
        )}

        {/* Import */}
        {onImport && (
          <MenuItem onClick={() => handleAction(onImport)}>
            <ListItemIcon>
              <ImportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Import...</ListItemText>
          </MenuItem>
        )}

        {(onSave || onSaveAs || onExport || onImport) && <Divider />}

        {/* Duplicate */}
        {onDuplicate && entityId && (
          <MenuItem onClick={() => handleAction(onDuplicate)}>
            <ListItemIcon>
              <DuplicateIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
        )}

        {/* Rename */}
        {onRename && entityId && (
          <MenuItem onClick={() => handleAction(onRename)}>
            <ListItemIcon>
              <RenameIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename...</ListItemText>
          </MenuItem>
        )}

        {/* Move to Project */}
        {onMoveToProject && entityId && (
          <MenuItem onClick={() => handleAction(onMoveToProject)}>
            <ListItemIcon>
              <MoveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Move to Project...</ListItemText>
          </MenuItem>
        )}

        {(onDuplicate || onRename || onMoveToProject) && entityId && <Divider />}

        {/* Delete */}
        {onDelete && entityId && (
          <MenuItem onClick={() => handleAction(onDelete)} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}

        {onDelete && entityId && onClose && <Divider />}

        {/* Close */}
        {onClose && (
          <MenuItem onClick={() => handleAction(onClose)}>
            <ListItemIcon>
              <CloseIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Close</ListItemText>
            <Shortcut keys={`${cmdKey}W`} />
          </MenuItem>
        )}
      </Menu>

      {/* Recent Items Submenu */}
      <Menu
        anchorEl={recentMenuAnchor}
        open={Boolean(recentMenuAnchor)}
        onClose={() => setRecentMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        MenuListProps={{
          dense: true,
          onMouseLeave: () => setRecentMenuAnchor(null),
        }}
        PaperProps={{
          sx: {
            minWidth: 200,
            maxHeight: 300,
          },
        }}
      >
        {recentItems.slice(0, 10).map((item) => (
          <MenuItem
            key={item.id}
            onClick={() => {
              onOpenRecent?.(item);
              handleClose();
            }}
          >
            <ListItemText
              primary={item.name}
              secondary={item.lastOpened.toLocaleDateString()}
              primaryTypographyProps={{ noWrap: true }}
              secondaryTypographyProps={{ fontSize: '0.7rem' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
