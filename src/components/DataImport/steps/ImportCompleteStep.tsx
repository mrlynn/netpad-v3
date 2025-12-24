'use client';

/**
 * Import Complete Step
 * Shows import results and next steps
 */

import React from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Description as FormIcon,
  CloudUpload as ImportIcon,
  Close as CloseIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { ImportJob } from '@/types/dataImport';

interface ImportCompleteStepProps {
  job: ImportJob | null;
  collectionName: string;
  database: string;
  onCreateForm: () => void;
  onImportMore: () => void;
  onClose: () => void;
}

export function ImportCompleteStep({
  job,
  collectionName,
  database,
  onCreateForm,
  onImportMore,
  onClose,
}: ImportCompleteStepProps) {
  if (!job) {
    return <Alert severity="error">Import job information not available.</Alert>;
  }

  const isSuccess = job.status === 'completed';
  const hasErrors = job.results && job.results.failed > 0;

  return (
    <Box>
      {/* Status banner */}
      <Alert
        severity={isSuccess ? (hasErrors ? 'warning' : 'success') : 'error'}
        icon={isSuccess ? <SuccessIcon /> : <ErrorIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="subtitle1" fontWeight={500}>
          {isSuccess
            ? hasErrors
              ? 'Import completed with some errors'
              : 'Import completed successfully!'
            : 'Import failed'}
        </Typography>
      </Alert>

      {/* Results summary */}
      {job.results && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Import Results
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Total Processed:</Typography>
              <Typography fontWeight={500}>
                {job.results.totalProcessed.toLocaleString()}
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Successfully Inserted:</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <SuccessIcon color="success" fontSize="small" />
                <Typography fontWeight={500} color="success.main">
                  {job.results.inserted.toLocaleString()}
                </Typography>
              </Stack>
            </Box>
            {job.results.updated > 0 && (
              <>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Updated:</Typography>
                  <Typography fontWeight={500}>
                    {job.results.updated.toLocaleString()}
                  </Typography>
                </Box>
              </>
            )}
            {job.results.skipped > 0 && (
              <>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Skipped:</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WarningIcon color="warning" fontSize="small" />
                    <Typography fontWeight={500} color="warning.main">
                      {job.results.skipped.toLocaleString()}
                    </Typography>
                  </Stack>
                </Box>
              </>
            )}
            {job.results.failed > 0 && (
              <>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Failed:</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ErrorIcon color="error" fontSize="small" />
                    <Typography fontWeight={500} color="error.main">
                      {job.results.failed.toLocaleString()}
                    </Typography>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </Paper>
      )}

      {/* Errors list */}
      {job.results && job.results.errors && job.results.errors.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom color="error">
            Errors ({job.results.errorCount})
          </Typography>
          <List dense>
            {job.results.errors.slice(0, 5).map((error, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <ErrorIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={error.error}
                  secondary={`Row ${error.rowNumber}${
                    error.column ? `, Column: ${error.column}` : ''
                  }`}
                />
              </ListItem>
            ))}
          </List>
          {job.results.errorCount > 5 && (
            <Typography variant="caption" color="text.secondary">
              ...and {job.results.errorCount - 5} more errors
            </Typography>
          )}
        </Paper>
      )}

      {/* Import info */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Data Location
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={database} size="small" />
          <ArrowIcon fontSize="small" color="action" />
          <Chip label={collectionName} size="small" color="primary" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Your data has been imported into the{' '}
          <strong>{collectionName}</strong> collection.
        </Typography>
      </Paper>

      {/* Next steps */}
      <Typography variant="subtitle1" gutterBottom>
        Next Steps
      </Typography>
      <Stack spacing={2}>
        <Button
          variant="contained"
          startIcon={<FormIcon />}
          onClick={onCreateForm}
          fullWidth
        >
          Create a Form for This Data
        </Button>
        <Button
          variant="outlined"
          startIcon={<ImportIcon />}
          onClick={onImportMore}
          fullWidth
        >
          Import More Data
        </Button>
        <Button
          variant="text"
          startIcon={<CloseIcon />}
          onClick={onClose}
          fullWidth
        >
          Close
        </Button>
      </Stack>
    </Box>
  );
}
