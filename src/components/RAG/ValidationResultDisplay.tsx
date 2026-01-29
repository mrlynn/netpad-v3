/**
 * Validation Result Display
 *
 * Displays cluster validation results with detailed issue breakdown
 * Used in setup wizard and settings page
 */

'use client';

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  resolution?: string;
}

interface ValidationResultDisplayProps {
  result: {
    isValid: boolean;
    clusterTier: string | null;
    mongoVersion: string | null;
    vectorSearchAvailable: boolean;
    connectionSuccessful: boolean;
    latencyMs: number;
    issues: ValidationIssue[];
    summary: string;
  };
  loading?: boolean;
}

export default function ValidationResultDisplay({
  result,
  loading = false,
}: ValidationResultDisplayProps) {
  if (loading) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Validating cluster...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  const errorCount = result.issues.filter((i) => i.severity === 'error').length;
  const warningCount = result.issues.filter((i) => i.severity === 'warning').length;

  return (
    <Box>
      {/* Overall Status */}
      <Alert
        severity={result.isValid ? 'success' : errorCount > 0 ? 'error' : 'warning'}
        icon={result.isValid ? <CheckCircleIcon /> : <ErrorIcon />}
        sx={{ mb: 2 }}
      >
        <Typography variant="body1" fontWeight="medium">
          {result.summary}
        </Typography>
        {!result.isValid && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {errorCount > 0
              ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
              : ''}
            {errorCount > 0 && warningCount > 0 ? ', ' : ''}
            {warningCount > 0
              ? `${warningCount} warning${warningCount > 1 ? 's' : ''}`
              : ''}
          </Typography>
        )}
      </Alert>

      {/* Cluster Information */}
      {result.connectionSuccessful && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Cluster Information
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {result.mongoVersion && (
              <Chip
                icon={<InfoIcon />}
                label={`MongoDB ${result.mongoVersion}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {result.clusterTier && (
              <Chip
                icon={<StorageIcon />}
                label={result.clusterTier}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              icon={<SpeedIcon />}
              label={`${result.latencyMs}ms latency`}
              size="small"
              color={result.latencyMs < 100 ? 'success' : 'warning'}
              variant="outlined"
            />
            <Chip
              icon={<BuildIcon />}
              label={result.vectorSearchAvailable ? 'Vector Search Ready' : 'Vector Search Unavailable'}
              size="small"
              color={result.vectorSearchAvailable ? 'success' : 'error'}
              variant="outlined"
            />
          </Box>
        </Paper>
      )}

      {/* Validation Issues */}
      {result.issues.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Issues Found
          </Typography>
          <List>
            {result.issues.map((issue, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{
                  mb: 1,
                  borderColor: issue.severity === 'error' ? 'error.main' : 'warning.main',
                  borderWidth: 2,
                }}
              >
                <ListItem>
                  <ListItemIcon>
                    {issue.severity === 'error' ? (
                      <ErrorIcon color="error" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        color={issue.severity === 'error' ? 'error.main' : 'warning.main'}
                      >
                        {issue.message}
                      </Typography>
                    }
                    secondary={
                      issue.resolution && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          <strong>Resolution:</strong> {issue.resolution}
                        </Typography>
                      )
                    }
                  />
                </ListItem>
              </Paper>
            ))}
          </List>
        </Box>
      )}

      {/* Success State */}
      {result.isValid && result.issues.length === 0 && (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          <Typography variant="body2">
            Your cluster meets all requirements for RAG storage. You can proceed with
            configuration.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
