/**
 * Import Destination Dialog
 *
 * Asks users where they want to import a standalone form or workflow:
 * - Into an existing application
 * - Create a new application
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  Divider,
  TextField,
  InputAdornment,
  alpha,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Inventory as AppIcon,
  Article as FormIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { MarketplaceItemType } from '@/types/template';

interface Application {
  applicationId: string;
  name: string;
  description?: string;
  icon?: string;
  formsCount?: number;
  workflowsCount?: number;
}

interface ImportDestinationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (destination: { type: 'new' } | { type: 'existing'; applicationId: string; applicationName: string }) => void;
  itemName: string;
  itemType: MarketplaceItemType;
  organizationId: string;
  projectId?: string;
}

export function ImportDestinationDialog({
  open,
  onClose,
  onConfirm,
  itemName,
  itemType,
  organizationId,
  projectId,
}: ImportDestinationDialogProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOption, setSelectedOption] = useState<'new' | string>('new');

  // Fetch user's applications
  useEffect(() => {
    if (!open || !organizationId) return;

    const fetchApplications = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ orgId: organizationId });
        if (projectId) {
          params.append('projectId', projectId);
        }

        const response = await fetch(`/api/applications?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setApplications(data.applications || []);
        }
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [open, organizationId, projectId]);

  // Filter applications by search
  const filteredApps = applications.filter(app =>
    app.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedOption === 'new') {
      onConfirm({ type: 'new' });
    } else {
      const app = applications.find(a => a.applicationId === selectedOption);
      if (app) {
        onConfirm({ type: 'existing', applicationId: app.applicationId, applicationName: app.name });
      }
    }
  };

  const typeLabel = itemType === 'form' ? 'form' : itemType === 'workflow' ? 'workflow' : 'item';
  const TypeIcon = itemType === 'form' ? FormIcon : itemType === 'workflow' ? WorkflowIcon : AppIcon;
  const typeColor = itemType === 'form' ? '#58a6ff' : itemType === 'workflow' ? '#d29922' : '#00ED64';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: alpha(typeColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TypeIcon sx={{ color: typeColor }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Import {itemName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose where to add this {typeLabel}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Create New Application Option */}
        <ListItemButton
          selected={selectedOption === 'new'}
          onClick={() => setSelectedOption('new')}
          sx={{
            borderRadius: 2,
            mb: 2,
            border: '1px solid',
            borderColor: selectedOption === 'new' ? typeColor : 'divider',
            bgcolor: selectedOption === 'new' ? alpha(typeColor, 0.04) : 'transparent',
            '&:hover': {
              bgcolor: alpha(typeColor, 0.08),
            },
          }}
        >
          <ListItemIcon>
            <Radio
              checked={selectedOption === 'new'}
              sx={{
                color: typeColor,
                '&.Mui-checked': { color: typeColor },
              }}
            />
          </ListItemIcon>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <AddIcon sx={{ color: typeColor }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontWeight: 600 }}>
                Create new application
              </Typography>
            }
            secondary={`A new application named "${itemName}" will be created`}
          />
        </ListItemButton>

        <Divider sx={{ my: 2 }}>
          <Chip label="or add to existing" size="small" />
        </Divider>

        {/* Search existing applications */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search your applications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Existing Applications List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: typeColor }} />
          </Box>
        ) : filteredApps.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {search ? 'No applications match your search' : 'No existing applications found'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {filteredApps.map((app) => (
              <ListItemButton
                key={app.applicationId}
                selected={selectedOption === app.applicationId}
                onClick={() => setSelectedOption(app.applicationId)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid',
                  borderColor: selectedOption === app.applicationId ? typeColor : 'divider',
                  bgcolor: selectedOption === app.applicationId ? alpha(typeColor, 0.04) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha(typeColor, 0.08),
                  },
                }}
              >
                <ListItemIcon>
                  <Radio
                    checked={selectedOption === app.applicationId}
                    sx={{
                      color: typeColor,
                      '&.Mui-checked': { color: typeColor },
                    }}
                  />
                </ListItemIcon>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {app.icon ? (
                    <Typography sx={{ fontSize: '1.5rem' }}>{app.icon}</Typography>
                  ) : (
                    <AppIcon color="action" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 500 }}>
                      {app.name}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {app.formsCount || 0} forms
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {app.workflowsCount || 0} workflows
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          sx={{
            bgcolor: typeColor,
            '&:hover': { bgcolor: alpha(typeColor, 0.85) },
          }}
        >
          {selectedOption === 'new' ? 'Create & Import' : 'Add to Application'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
