'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  DataObject as ObjectIcon,
  TextFields as StringIcon,
  Numbers as NumberIcon,
  ToggleOn as BooleanIcon,
  DateRange as DateIcon,
  List as ArrayIcon,
  ContentCopy as CopyIcon,
  Description as FormIcon,
  Http as HttpIcon,
  Storage as MongoIcon,
  SmartToy as AiIcon,
} from '@mui/icons-material';
import { useWorkflowEditor } from '@/contexts/WorkflowContext';
import { WorkflowNode } from '@/types/workflow';

interface DataContextPanelProps {
  nodeId: string;
  onInsertVariable?: (path: string) => void;
}

// Variable definition for display
interface ContextVariable {
  path: string;           // Full path (e.g., "formTrigger.data.email")
  name: string;           // Display name
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'any';
  description?: string;
  source: string;         // Which node provides this
  sourceNodeId: string;
}

// Get icon for variable type
function getTypeIcon(type: string) {
  switch (type) {
    case 'string': return <StringIcon fontSize="small" />;
    case 'number': return <NumberIcon fontSize="small" />;
    case 'boolean': return <BooleanIcon fontSize="small" />;
    case 'date': return <DateIcon fontSize="small" />;
    case 'array': return <ArrayIcon fontSize="small" />;
    case 'object': return <ObjectIcon fontSize="small" />;
    default: return <ObjectIcon fontSize="small" />;
  }
}

// Get source icon for node type
function getSourceIcon(nodeType: string) {
  if (nodeType.includes('form')) return <FormIcon fontSize="small" />;
  if (nodeType.includes('http')) return <HttpIcon fontSize="small" />;
  if (nodeType.includes('mongo')) return <MongoIcon fontSize="small" />;
  if (nodeType.includes('ai')) return <AiIcon fontSize="small" />;
  return <ObjectIcon fontSize="small" />;
}

// Define what variables each node type outputs
function getNodeOutputSchema(node: WorkflowNode): ContextVariable[] {
  const baseVars: ContextVariable[] = [];
  const nodeLabel = node.label || node.type;
  const prefix = `nodes.${node.id}`;

  switch (node.type) {
    case 'form-trigger':
      // Form submission data - these are examples, real form would have actual fields
      return [
        { path: `${prefix}.data`, name: 'Form Data', type: 'object', source: nodeLabel, sourceNodeId: node.id, description: 'All submitted form fields' },
        { path: `${prefix}.data.*`, name: 'Any Field', type: 'any', source: nodeLabel, sourceNodeId: node.id, description: 'Access any form field by name' },
        { path: `${prefix}.submittedAt`, name: 'Submitted At', type: 'date', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.formId`, name: 'Form ID', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.respondent`, name: 'Respondent', type: 'object', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.respondent.email`, name: 'Respondent Email', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.respondent.userId`, name: 'Respondent User ID', type: 'string', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'webhook-trigger':
      return [
        { path: `${prefix}.body`, name: 'Request Body', type: 'object', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.headers`, name: 'Headers', type: 'object', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.query`, name: 'Query Params', type: 'object', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.method`, name: 'HTTP Method', type: 'string', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'manual-trigger':
      return [
        { path: `${prefix}.triggeredBy`, name: 'Triggered By', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.triggeredAt`, name: 'Triggered At', type: 'date', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'schedule-trigger':
      return [
        { path: `${prefix}.scheduledTime`, name: 'Scheduled Time', type: 'date', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.executionTime`, name: 'Execution Time', type: 'date', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'http-request':
      return [
        { path: `${prefix}.data`, name: 'Response Data', type: 'any', source: nodeLabel, sourceNodeId: node.id, description: 'Parsed response body (JSON or text)' },
        { path: `${prefix}.status`, name: 'Status Code', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.statusText`, name: 'Status Text', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.headers`, name: 'Response Headers', type: 'object', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.ok`, name: 'Is OK (2xx)', type: 'boolean', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.url`, name: 'Final URL', type: 'string', source: nodeLabel, sourceNodeId: node.id, description: 'URL after redirects' },
      ];

    case 'mongodb-query':
      return [
        { path: `${prefix}.documents`, name: 'Documents', type: 'array', source: nodeLabel, sourceNodeId: node.id, description: 'Array of matched documents (find/aggregate)' },
        { path: `${prefix}.document`, name: 'Document', type: 'object', source: nodeLabel, sourceNodeId: node.id, description: 'Single document (findOne)' },
        { path: `${prefix}.count`, name: 'Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.found`, name: 'Found', type: 'boolean', source: nodeLabel, sourceNodeId: node.id, description: 'Whether document was found (findOne)' },
        { path: `${prefix}.values`, name: 'Distinct Values', type: 'array', source: nodeLabel, sourceNodeId: node.id, description: 'Array of distinct values' },
        { path: `${prefix}.metadata.collection`, name: 'Collection', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.metadata.operation`, name: 'Operation', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.metadata.executionTimeMs`, name: 'Query Time (ms)', type: 'number', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'mongodb-write':
      return [
        { path: `${prefix}.insertedId`, name: 'Inserted ID', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.modifiedCount`, name: 'Modified Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.matchedCount`, name: 'Matched Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'transform':
      return [
        { path: `${prefix}.result`, name: 'Transformed Data', type: 'any', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'filter':
      return [
        { path: `${prefix}.filtered`, name: 'Filtered Items', type: 'array', source: nodeLabel, sourceNodeId: node.id, description: 'Items that passed the filter' },
        { path: `${prefix}.removed`, name: 'Removed Items', type: 'array', source: nodeLabel, sourceNodeId: node.id, description: 'Items that were filtered out' },
        { path: `${prefix}.counts.total`, name: 'Total Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.counts.passed`, name: 'Passed Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.counts.removed`, name: 'Removed Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.counts.passRate`, name: 'Pass Rate (%)', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.first`, name: 'First Item', type: 'any', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.last`, name: 'Last Item', type: 'any', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.isEmpty`, name: 'Is Empty', type: 'boolean', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'ai-prompt':
      return [
        { path: `${prefix}.response`, name: 'AI Response', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.usage`, name: 'Token Usage', type: 'object', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'ai-classify':
      return [
        { path: `${prefix}.category`, name: 'Category', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.confidence`, name: 'Confidence', type: 'number', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'conditional':
      return [
        { path: `${prefix}.result`, name: 'Condition Result', type: 'boolean', source: nodeLabel, sourceNodeId: node.id, description: 'true if conditions passed' },
        { path: `${prefix}.branch`, name: 'Chosen Branch', type: 'string', source: nodeLabel, sourceNodeId: node.id, description: '"true" or "false"' },
        { path: `${prefix}.data`, name: 'Pass-through Data', type: 'object', source: nodeLabel, sourceNodeId: node.id, description: 'Input data passed through' },
        { path: `${prefix}.evaluatedConditions`, name: 'Evaluated Conditions', type: 'array', source: nodeLabel, sourceNodeId: node.id, description: 'Details of each condition evaluation' },
      ];

    case 'switch':
      return [
        { path: `${prefix}.output`, name: 'Output Branch', type: 'string', source: nodeLabel, sourceNodeId: node.id, description: 'Name of matched output branch' },
        { path: `${prefix}.matchedCase`, name: 'Matched Case', type: 'any', source: nodeLabel, sourceNodeId: node.id, description: 'Value that matched, or "default"' },
        { path: `${prefix}.matchedIndex`, name: 'Matched Index', type: 'number', source: nodeLabel, sourceNodeId: node.id, description: 'Index of matched case (-1 for default)' },
        { path: `${prefix}.isDefault`, name: 'Is Default', type: 'boolean', source: nodeLabel, sourceNodeId: node.id, description: 'True if default branch was taken' },
        { path: `${prefix}.fieldValue`, name: 'Field Value', type: 'any', source: nodeLabel, sourceNodeId: node.id, description: 'The value that was evaluated' },
        { path: `${prefix}.data`, name: 'Pass-through Data', type: 'object', source: nodeLabel, sourceNodeId: node.id, description: 'Input data passed through' },
      ];

    case 'code':
      return [
        { path: `${prefix}`, name: 'Code Output', type: 'object', source: nodeLabel, sourceNodeId: node.id, description: 'Whatever the code returns' },
        { path: `${prefix}._execution.durationMs`, name: 'Execution Time', type: 'number', source: nodeLabel, sourceNodeId: node.id, description: 'How long the code took to run (ms)' },
      ];

    case 'loop':
      return [
        { path: `${prefix}.currentItem`, name: 'Current Item', type: 'any', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.index`, name: 'Current Index', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.results`, name: 'Loop Results', type: 'array', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'delay':
      return [
        { path: `${prefix}.delayedUntil`, name: 'Delayed Until', type: 'date', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.actualDelayMs`, name: 'Actual Delay (ms)', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.data`, name: 'Pass-through Data', type: 'object', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'email-send':
      return [
        { path: `${prefix}.success`, name: 'Success', type: 'boolean', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.messageId`, name: 'Message ID', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.to`, name: 'Recipient', type: 'string', source: nodeLabel, sourceNodeId: node.id },
      ];

    default:
      return [
        { path: `${prefix}.output`, name: 'Output', type: 'any', source: nodeLabel, sourceNodeId: node.id },
      ];
  }
}

// Find all upstream nodes that can provide data
function getUpstreamNodes(nodeId: string, nodes: WorkflowNode[], edges: { source: string; target: string }[]): WorkflowNode[] {
  const upstream: WorkflowNode[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    // Find all edges that target this node
    const incomingEdges = edges.filter(e => e.target === currentId);

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        upstream.push(sourceNode);
        traverse(sourceNode.id);
      }
    }
  }

  traverse(nodeId);
  return upstream;
}

export function DataContextPanel({ nodeId, onInsertVariable }: DataContextPanelProps) {
  const theme = useTheme();
  const { nodes, edges } = useWorkflowEditor();

  // Get all upstream nodes and their output variables
  const availableVariables = useMemo(() => {
    const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges);
    const variables: ContextVariable[] = [];

    // Add workflow-level variables
    variables.push(
      { path: 'workflow.id', name: 'Workflow ID', type: 'string', source: 'Workflow', sourceNodeId: '' },
      { path: 'workflow.name', name: 'Workflow Name', type: 'string', source: 'Workflow', sourceNodeId: '' },
      { path: 'execution.id', name: 'Execution ID', type: 'string', source: 'Execution', sourceNodeId: '' },
      { path: 'execution.startedAt', name: 'Started At', type: 'date', source: 'Execution', sourceNodeId: '' },
    );

    // Add variables from each upstream node
    for (const node of upstreamNodes) {
      const nodeVars = getNodeOutputSchema(node);
      variables.push(...nodeVars);
    }

    return variables;
  }, [nodeId, nodes, edges]);

  // Group variables by source
  const variablesBySource = useMemo(() => {
    const groups: Record<string, ContextVariable[]> = {};
    for (const v of availableVariables) {
      if (!groups[v.source]) groups[v.source] = [];
      groups[v.source].push(v);
    }
    return groups;
  }, [availableVariables]);

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(`{{${path}}}`);
    onInsertVariable?.(path);
  };

  if (availableVariables.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No upstream data available. Connect this node to a trigger or other nodes to access their output.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
      <Box sx={{ px: 2, py: 1, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
        <Typography variant="caption" color="text.secondary">
          Click a variable to copy its reference. Use <code>{'{{path}}'}</code> syntax in expressions.
        </Typography>
      </Box>

      {Object.entries(variablesBySource).map(([source, vars]) => (
        <Accordion key={source} defaultExpanded={source !== 'Workflow' && source !== 'Execution'} disableGutters>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getSourceIcon(vars[0]?.sourceNodeId ? nodes.find(n => n.id === vars[0].sourceNodeId)?.type || '' : '')}
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {source}
              </Typography>
              <Chip label={vars.length} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense disablePadding>
              {vars.map((variable) => (
                <ListItem
                  key={variable.path}
                  secondaryAction={
                    <Tooltip title="Copy variable reference">
                      <IconButton size="small" onClick={() => handleCopy(variable.path)}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                  }}
                  onClick={() => handleCopy(variable.path)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Tooltip title={variable.type}>
                      {getTypeIcon(variable.type)}
                    </Tooltip>
                  </ListItemIcon>
                  <ListItemText
                    primary={variable.name}
                    secondary={variable.description || variable.path}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      sx: { fontFamily: 'monospace', fontSize: '0.7rem' }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

export default DataContextPanel;
