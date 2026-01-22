/**
 * Schema Viewer Component
 *
 * Displays the inferred JSON Schema for an application, showing:
 * - Collections and their schemas
 * - Field types, constraints, and requirements
 * - Source forms for each collection
 * - MongoDB validation format (copyable)
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ExpandMore,
  ContentCopy,
  Check,
  Storage,
  Code,
  TableChart,
  Info,
  Description,
} from '@mui/icons-material';
import { InferredApplicationSchema, JSONSchema, JSONSchemaProperty } from '@/lib/schema/inferSchema';

interface SchemaViewerProps {
  schema: InferredApplicationSchema | null;
  isLoading?: boolean;
  error?: string | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Renders a JSON Schema property type as a readable string
 */
function renderType(prop: JSONSchemaProperty): string {
  if (Array.isArray(prop.type)) {
    return prop.type.join(' | ');
  }
  let typeStr = prop.type;
  if (prop.format) {
    typeStr += ` (${prop.format})`;
  }
  return typeStr;
}

/**
 * Renders constraints for a property
 */
function renderConstraints(prop: JSONSchemaProperty): string[] {
  const constraints: string[] = [];

  if (prop.minimum !== undefined) constraints.push(`min: ${prop.minimum}`);
  if (prop.maximum !== undefined) constraints.push(`max: ${prop.maximum}`);
  if (prop.minLength !== undefined) constraints.push(`minLength: ${prop.minLength}`);
  if (prop.maxLength !== undefined) constraints.push(`maxLength: ${prop.maxLength}`);
  if (prop.pattern) constraints.push(`pattern: ${prop.pattern}`);
  if (prop.enum) constraints.push(`enum: [${prop.enum.slice(0, 3).join(', ')}${prop.enum.length > 3 ? '...' : ''}]`);

  return constraints;
}

/**
 * Collection schema card component
 */
function CollectionSchemaCard({
  collectionName,
  collectionData,
  defaultExpanded = false,
}: {
  collectionName: string;
  collectionData: {
    jsonSchema: JSONSchema;
    mongoDBValidation?: object;
    fieldCount: number;
    sourceFormIds: string[];
    sourceFormNames: string[];
  };
  defaultExpanded?: boolean;
}) {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const { jsonSchema, mongoDBValidation, fieldCount, sourceFormNames } = collectionData;

  return (
    <Accordion defaultExpanded={defaultExpanded} sx={{ mb: 2 }}>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Storage sx={{ color: theme.palette.primary.main }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {collectionName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fieldCount} fields from {sourceFormNames.length} form{sourceFormNames.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
            {jsonSchema.required.length > 0 && (
              <Chip
                label={`${jsonSchema.required.length} required`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Source forms: {sourceFormNames.join(', ')}
          </Typography>
        </Box>

        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab
            icon={<TableChart sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Fields"
            sx={{ textTransform: 'none', minHeight: 48 }}
          />
          <Tab
            icon={<Code sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="JSON Schema"
            sx={{ textTransform: 'none', minHeight: 48 }}
          />
          <Tab
            icon={<Storage sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="MongoDB Validation"
            sx={{ textTransform: 'none', minHeight: 48 }}
          />
        </Tabs>

        {/* Fields Table View */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Required</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Constraints</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(jsonSchema.properties).map(([fieldName, prop]) => {
                  const isRequired = jsonSchema.required.includes(fieldName);
                  const constraints = renderConstraints(prop);

                  return (
                    <TableRow key={fieldName} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontWeight: isRequired ? 600 : 400 }}
                        >
                          {fieldName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={renderType(prop)}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        {isRequired ? (
                          <Chip label="Required" size="small" color="error" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Optional
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {constraints.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {constraints.map((c, i) => (
                              <Chip
                                key={i}
                                label={c}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                          {prop.description || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* JSON Schema View */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ position: 'relative' }}>
            <Tooltip title={copied === 'json' ? 'Copied!' : 'Copy JSON Schema'}>
              <IconButton
                size="small"
                onClick={() => handleCopy(JSON.stringify(jsonSchema, null, 2), 'json')}
                sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
              >
                {copied === 'json' ? <Check color="success" /> : <ContentCopy />}
              </IconButton>
            </Tooltip>
            <Box
              component="pre"
              sx={{
                bgcolor: alpha(theme.palette.common.black, 0.04),
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 400,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                m: 0,
              }}
            >
              {JSON.stringify(jsonSchema, null, 2)}
            </Box>
          </Box>
        </TabPanel>

        {/* MongoDB Validation View */}
        <TabPanel value={tabValue} index={2}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This is the MongoDB JSON Schema validation format. You can use this with{' '}
            <code>db.createCollection()</code> or <code>db.runCommand()</code> to enforce
            schema validation in MongoDB.
          </Alert>
          <Box sx={{ position: 'relative' }}>
            <Tooltip title={copied === 'mongo' ? 'Copied!' : 'Copy MongoDB Validation'}>
              <IconButton
                size="small"
                onClick={() =>
                  handleCopy(JSON.stringify(mongoDBValidation, null, 2), 'mongo')
                }
                sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
              >
                {copied === 'mongo' ? <Check color="success" /> : <ContentCopy />}
              </IconButton>
            </Tooltip>
            <Box
              component="pre"
              sx={{
                bgcolor: alpha(theme.palette.common.black, 0.04),
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 400,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                m: 0,
              }}
            >
              {JSON.stringify(mongoDBValidation, null, 2)}
            </Box>
          </Box>
        </TabPanel>
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Main Schema Viewer component
 */
export function SchemaViewer({ schema, isLoading, error }: SchemaViewerProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!schema || Object.keys(schema.collections).length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Schema Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add forms to this application to see the inferred data schema.
          The schema is automatically generated from your form field configurations.
        </Typography>
      </Paper>
    );
  }

  const collectionNames = Object.keys(schema.collections);

  return (
    <Box>
      {/* Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Info sx={{ color: theme.palette.info.main }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Inferred Data Schema
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This schema is automatically inferred from the forms in your application.
          It shows what data structure will be created in MongoDB when forms are submitted.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<Storage />}
            label={`${schema.summary.totalCollections} collection${schema.summary.totalCollections !== 1 ? 's' : ''}`}
            variant="outlined"
          />
          <Chip
            icon={<TableChart />}
            label={`${schema.summary.totalFields} total fields`}
            variant="outlined"
          />
          <Chip
            icon={<Description />}
            label={`${schema.summary.forms} form${schema.summary.forms !== 1 ? 's' : ''}`}
            variant="outlined"
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Generated: {new Date(schema.generatedAt).toLocaleString()}
        </Typography>
      </Paper>

      {/* Collections */}
      {collectionNames.map((collectionName, index) => (
        <CollectionSchemaCard
          key={collectionName}
          collectionName={collectionName}
          collectionData={schema.collections[collectionName]}
          defaultExpanded={index === 0}
        />
      ))}
    </Box>
  );
}
