'use client';

/**
 * Schema Preview Step
 * Shows inferred schema and data preview
 */

import React, { useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { InferredSchema, InferredField } from '@/types/dataImport';

interface SchemaPreviewStepProps {
  schema: InferredSchema | null;
  preview: {
    headers: string[];
    rows: any[][];
    totalRows: number;
  } | null;
  loading: boolean;
  onAnalyze: () => void;
  onNext: () => void;
  onBack: () => void;
}

const TYPE_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  string: 'default',
  number: 'primary',
  integer: 'primary',
  decimal: 'primary',
  boolean: 'secondary',
  date: 'info',
  datetime: 'info',
  time: 'info',
  email: 'success',
  url: 'success',
  phone: 'success',
  objectId: 'warning',
  array: 'error',
  object: 'error',
  null: 'default',
  mixed: 'warning',
};

function FieldTypeChip({ type, confidence }: { type: string; confidence: number }) {
  return (
    <Chip
      label={`${type} (${Math.round(confidence * 100)}%)`}
      size="small"
      color={TYPE_COLORS[type] || 'default'}
      variant={confidence > 0.8 ? 'filled' : 'outlined'}
    />
  );
}

function SchemaFieldRow({ field }: { field: InferredField }) {
  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {field.originalName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          → {field.suggestedPath}
        </Typography>
      </TableCell>
      <TableCell>
        <FieldTypeChip type={field.inferredType} confidence={field.confidence} />
      </TableCell>
      <TableCell>
        {field.isRequired ? (
          <Chip label="Required" size="small" color="error" variant="outlined" />
        ) : (
          <Chip label="Optional" size="small" variant="outlined" />
        )}
        {field.isUnique && (
          <Chip
            label="Unique"
            size="small"
            color="info"
            variant="outlined"
            sx={{ ml: 0.5 }}
          />
        )}
      </TableCell>
      <TableCell>
        <Typography variant="caption">
          {field.stats.uniqueCount} unique / {field.stats.totalValues - field.stats.nullCount} values
        </Typography>
        {field.stats.nullCount > 0 && (
          <Typography variant="caption" color="text.secondary" display="block">
            {field.stats.nullCount} empty
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {field.stats.sampleValues.slice(0, 3).map((val, i) => (
            <Chip
              key={i}
              label={String(val).length > 20 ? String(val).slice(0, 20) + '...' : String(val)}
              size="small"
              variant="outlined"
            />
          ))}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export function SchemaPreviewStep({
  schema,
  preview,
  loading,
  onAnalyze,
  onNext,
  onBack,
}: SchemaPreviewStepProps) {
  // Auto-analyze when mounted if no schema
  useEffect(() => {
    if (!schema && !loading) {
      onAnalyze();
    }
  }, [schema, loading, onAnalyze]);

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Analyzing data structure...</Typography>
      </Box>
    );
  }

  if (!schema || !preview) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Button variant="contained" onClick={onAnalyze}>
          Analyze Data
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Detected {schema.fields.length} fields in {preview.totalRows} rows
      </Alert>

      {/* Warnings */}
      {schema.warnings.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <WarningIcon color="warning" />
              <Typography>
                {schema.warnings.length} warning{schema.warnings.length > 1 ? 's' : ''}
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {schema.warnings.map((warning, i) => (
                <ListItem key={i}>
                  <ListItemIcon>
                    {warning.severity === 'error' ? (
                      <WarningIcon color="error" fontSize="small" />
                    ) : warning.severity === 'warning' ? (
                      <WarningIcon color="warning" fontSize="small" />
                    ) : (
                      <InfoIcon color="info" fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={warning.message}
                    secondary={warning.field ? `Field: ${warning.field}` : undefined}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Inferred Schema */}
      <Typography variant="subtitle1" gutterBottom fontWeight={500}>
        Inferred Schema
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Field Name</TableCell>
              <TableCell>Detected Type</TableCell>
              <TableCell>Flags</TableCell>
              <TableCell>Statistics</TableCell>
              <TableCell>Sample Values</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schema.fields.map((field) => (
              <SchemaFieldRow key={field.originalName} field={field} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Data Preview */}
      <Typography variant="subtitle1" gutterBottom fontWeight={500}>
        Data Preview
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
              {preview.headers.map((header) => (
                <TableCell key={header} sx={{ fontWeight: 600 }}>
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {preview.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell>{rowIndex + 1}</TableCell>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>
                    {cell === null || cell === undefined ? (
                      <Typography variant="caption" color="text.disabled" fontStyle="italic">
                        null
                      </Typography>
                    ) : String(cell).length > 50 ? (
                      String(cell).slice(0, 50) + '...'
                    ) : (
                      String(cell)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={onNext} startIcon={<CheckIcon />}>
          Continue to Mapping
        </Button>
      </Box>
    </Box>
  );
}
