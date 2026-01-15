/**
 * Breaking Changes Dialog
 * 
 * Displays breaking changes detected during contract comparison or upgrade validation
 */

'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Paper,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Close,
  Warning,
  Error,
  Info,
  ExpandMore,
  CheckCircle,
} from '@mui/icons-material';
import { ContractComparison } from '@/lib/platform/contractComparison';

interface BreakingChangesDialogProps {
  open: boolean;
  onClose: () => void;
  comparison: ContractComparison;
  onProceed?: () => void;
  onCancel?: () => void;
  showProceedButton?: boolean;
}

export function BreakingChangesDialog({
  open,
  onClose,
  comparison,
  onProceed,
  onCancel,
  showProceedButton = false,
}: BreakingChangesDialogProps) {
  const hasBreakingChanges = comparison.breakingChanges.length > 0;
  const hasNonBreakingChanges = comparison.nonBreakingChanges.length > 0;
  const hasAdditiveChanges = comparison.additiveChanges.length > 0;

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getImpactIcon = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return <Error />;
      case 'medium':
        return <Warning />;
      case 'low':
        return <Info />;
      default:
        return <Info />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ color: 'error.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Contract Comparison: {comparison.fromVersion} → {comparison.toVersion}
          </Typography>
        </Box>
        <Button onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
          <Close />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ overflow: 'auto', pt: 3 }}>
        {/* Compatibility Status */}
        <Alert
          severity={comparison.compatibility === 'incompatible' ? 'error' : comparison.compatibility === 'requires-migration' ? 'warning' : 'success'}
          icon={comparison.compatibility === 'incompatible' ? <Error /> : comparison.compatibility === 'requires-migration' ? <Warning /> : <CheckCircle />}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Compatibility: {comparison.compatibility.toUpperCase()}
          </Typography>
          {comparison.compatibility === 'incompatible' && (
            <Typography variant="body2">
              This upgrade contains breaking changes that may break dependent systems.
            </Typography>
          )}
          {comparison.compatibility === 'requires-migration' && (
            <Typography variant="body2">
              This upgrade contains non-breaking changes that may require updates to consumers.
            </Typography>
          )}
          {comparison.compatibility === 'compatible' && (
            <Typography variant="body2">
              This upgrade is fully compatible. No breaking changes detected.
            </Typography>
          )}
        </Alert>

        {/* Breaking Changes */}
        {hasBreakingChanges && (
          <Paper sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'error.main' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Error sx={{ color: 'error.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                Breaking Changes ({comparison.breakingChanges.length})
              </Typography>
            </Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              These changes will break existing consumers. A major version bump is required.
            </Alert>
            <List>
              {comparison.breakingChanges.map((change, index) => (
                <Paper key={index} sx={{ mb: 2, p: 2, bgcolor: 'rgba(211, 47, 47, 0.1)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    {getImpactIcon(change.impact)}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {change.component}
                        </Typography>
                        <Chip
                          label={change.type}
                          size="small"
                          color={getImpactColor(change.impact) as any}
                        />
                        <Chip
                          label={`Impact: ${change.impact}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {change.description}
                      </Typography>
                      {change.migration && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Migration Required:
                          </Typography>
                          <Typography variant="body2">{change.migration}</Typography>
                        </Alert>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </List>
          </Paper>
        )}

        {/* Non-Breaking Changes */}
        {hasNonBreakingChanges && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info sx={{ color: 'info.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Non-Breaking Changes ({comparison.nonBreakingChanges.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {comparison.nonBreakingChanges.map((change, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Info color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {change.component}
                          </Typography>
                          <Chip label={change.type} size="small" variant="outlined" />
                        </Box>
                      }
                      secondary={change.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Additive Changes */}
        {hasAdditiveChanges && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: 'success.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Additive Changes ({comparison.additiveChanges.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {comparison.additiveChanges.map((change, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {change.component}
                          </Typography>
                          <Chip label={change.type} size="small" color="success" />
                        </Box>
                      }
                      secondary={change.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Migration Guide */}
        {comparison.migrationGuide && (
          <Paper sx={{ p: 2, mt: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Migration Guide
            </Typography>
            <Box
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 300,
              }}
            >
              {comparison.migrationGuide}
            </Box>
          </Paper>
        )}

        {!hasBreakingChanges && !hasNonBreakingChanges && !hasAdditiveChanges && (
          <Alert severity="success" icon={<CheckCircle />}>
            No changes detected between these contract versions.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onCancel || onClose} sx={{ textTransform: 'none' }}>
          {hasBreakingChanges ? 'Cancel Upgrade' : 'Close'}
        </Button>
        {showProceedButton && onProceed && (
          <Button
            variant="contained"
            onClick={onProceed}
            color={hasBreakingChanges ? 'error' : 'primary'}
            sx={{
              textTransform: 'none',
              bgcolor: hasBreakingChanges ? 'error.main' : '#00ED64',
              '&:hover': {
                bgcolor: hasBreakingChanges ? 'error.dark' : '#00CC55',
              },
            }}
          >
            {hasBreakingChanges ? 'Proceed Anyway' : 'Proceed'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
