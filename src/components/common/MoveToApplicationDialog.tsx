'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  alpha,
  CircularProgress,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Apps,
  Search,
  Check,
  FolderOpen,
} from '@mui/icons-material';
import { Application } from '@/types/application';
import { useApplication } from '@/contexts/ApplicationContext';

interface MoveToApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  onMove: (targetApplicationId: string, targetApplicationName: string) => Promise<void>;
  currentApplicationId?: string;
  itemType: 'form' | 'workflow';
  itemName: string;
}

export function MoveToApplicationDialog({
  open,
  onClose,
  onMove,
  currentApplicationId,
  itemType,
  itemName,
}: MoveToApplicationDialogProps) {
  const { applications, isLoading: isLoadingApps } = useApplication();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out the current application and apply search
  const availableApplications = useMemo(() => {
    return applications
      .filter((app) => app.applicationId !== currentApplicationId)
      .filter((app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [applications, currentApplicationId, searchQuery]);

  const handleMove = async () => {
    if (!selectedAppId) return;

    const targetApp = applications.find((app) => app.applicationId === selectedAppId);
    if (!targetApp) return;

    setIsMoving(true);
    try {
      await onMove(selectedAppId, targetApp.name);
      onClose();
    } catch (error) {
      console.error(`Failed to move ${itemType}:`, error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleClose = () => {
    if (!isMoving) {
      setSelectedAppId(null);
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpen color="primary" />
          <Typography variant="h6" component="span">
            Move {itemType === 'form' ? 'Form' : 'Workflow'}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Move &quot;{itemName}&quot; to another application
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Application List */}
        {isLoadingApps ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : availableApplications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Apps sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {searchQuery
                ? 'No applications match your search'
                : 'No other applications available'}
            </Typography>
            {!searchQuery && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Create another application first to move this {itemType}.
              </Typography>
            )}
          </Box>
        ) : (
          <List sx={{ py: 0, maxHeight: 300, overflow: 'auto' }}>
            {availableApplications.map((app) => (
              <ListItemButton
                key={app.applicationId}
                selected={selectedAppId === app.applicationId}
                onClick={() => setSelectedAppId(app.applicationId)}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                  '&.Mui-selected': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {selectedAppId === app.applicationId ? (
                    <Check color="primary" />
                  ) : (
                    <Apps sx={{ color: app.color || 'text.secondary' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {app.name}
                      </Typography>
                      {app.status === 'draft' && (
                        <Chip
                          label="Draft"
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {app.description || `${app.stats?.formsCount || 0} forms, ${app.stats?.workflowsCount || 0} workflows`}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isMoving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleMove}
          disabled={!selectedAppId || isMoving}
          startIcon={isMoving ? <CircularProgress size={16} color="inherit" /> : <FolderOpen />}
        >
          {isMoving ? 'Moving...' : 'Move'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
