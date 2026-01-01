'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
  Divider,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  DataObject as VariableIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  TextFields as StringIcon,
  Numbers as NumberIcon,
  ToggleOn as BooleanIcon,
  DateRange as DateIcon,
  List as ArrayIcon,
  DataObject as ObjectIcon,
  Description as FormIcon,
  Http as HttpIcon,
  Storage as MongoIcon,
  SmartToy as AiIcon,
  Code as CodeIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useWorkflowEditor } from '@/contexts/WorkflowContext';
import { WorkflowNode } from '@/types/workflow';
import { useHelp } from '@/contexts/HelpContext';

// Variable definition for display
interface ContextVariable {
  path: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'any';
  description?: string;
  source: string;
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
  if (nodeType.includes('code')) return <CodeIcon fontSize="small" />;
  return <ObjectIcon fontSize="small" />;
}

// Define what variables each node type outputs (same as DataContextPanel)
function getNodeOutputSchema(node: WorkflowNode): ContextVariable[] {
  const nodeLabel = node.label || node.type;
  const prefix = `nodes.${node.id}`;

  switch (node.type) {
    case 'form-trigger':
      return [
        { path: `${prefix}.data`, name: 'Form Data', type: 'object', source: nodeLabel, sourceNodeId: node.id, description: 'All submitted form fields' },
        { path: `${prefix}.submittedAt`, name: 'Submitted At', type: 'date', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.formId`, name: 'Form ID', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.respondent.email`, name: 'Respondent Email', type: 'string', source: nodeLabel, sourceNodeId: node.id },
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
        { path: `${prefix}.schedule.cronExpression`, name: 'Cron Expression', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.scheduledAt`, name: 'Scheduled At', type: 'date', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.executedAt`, name: 'Executed At', type: 'date', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'http-request':
      return [
        { path: `${prefix}.data`, name: 'Response Data', type: 'any', source: nodeLabel, sourceNodeId: node.id, description: 'Parsed response body' },
        { path: `${prefix}.status`, name: 'Status Code', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.ok`, name: 'Is OK (2xx)', type: 'boolean', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.headers`, name: 'Response Headers', type: 'object', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'mongodb-query':
      return [
        { path: `${prefix}.documents`, name: 'Documents', type: 'array', source: nodeLabel, sourceNodeId: node.id, description: 'Query results' },
        { path: `${prefix}.document`, name: 'Document', type: 'object', source: nodeLabel, sourceNodeId: node.id, description: 'Single result (findOne)' },
        { path: `${prefix}.count`, name: 'Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'mongodb-write':
      return [
        { path: `${prefix}.insertedId`, name: 'Inserted ID', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.modifiedCount`, name: 'Modified Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'transform':
      return [
        { path: `${prefix}.result`, name: 'Transformed Data', type: 'any', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'filter':
      return [
        { path: `${prefix}.filtered`, name: 'Filtered Items', type: 'array', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.counts.passed`, name: 'Passed Count', type: 'number', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.isEmpty`, name: 'Is Empty', type: 'boolean', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'conditional':
      return [
        { path: `${prefix}.result`, name: 'Condition Result', type: 'boolean', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.branch`, name: 'Chosen Branch', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.data`, name: 'Pass-through Data', type: 'object', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'switch':
      return [
        { path: `${prefix}.output`, name: 'Output Branch', type: 'string', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.matchedCase`, name: 'Matched Case', type: 'any', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.data`, name: 'Pass-through Data', type: 'object', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'code':
      return [
        { path: `${prefix}`, name: 'Code Output', type: 'object', source: nodeLabel, sourceNodeId: node.id, description: 'Whatever the code returns' },
      ];

    case 'delay':
      return [
        { path: `${prefix}.data`, name: 'Pass-through Data', type: 'object', source: nodeLabel, sourceNodeId: node.id },
      ];

    case 'email-send':
      return [
        { path: `${prefix}.success`, name: 'Success', type: 'boolean', source: nodeLabel, sourceNodeId: node.id },
        { path: `${prefix}.messageId`, name: 'Message ID', type: 'string', source: nodeLabel, sourceNodeId: node.id },
      ];

    default:
      return [
        { path: `${prefix}.output`, name: 'Output', type: 'any', source: nodeLabel, sourceNodeId: node.id },
      ];
  }
}

// Find all upstream nodes
function getUpstreamNodes(nodeId: string, nodes: WorkflowNode[], edges: { source: string; target: string }[]): WorkflowNode[] {
  const upstream: WorkflowNode[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

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

interface VariablePickerButtonProps {
  nodeId: string;
  onInsert: (variable: string) => void;
  disabled?: boolean;
}

export function VariablePickerButton({ nodeId, onInsert, disabled }: VariablePickerButtonProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { nodes, edges } = useWorkflowEditor();
  const { openHelp } = useHelp();

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setSearchQuery('');
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleInsert = (path: string) => {
    onInsert(`{{${path}}}`);
    handleClose();
  };

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(`{{${path}}}`);
  };

  // Get all available variables
  const availableVariables = useMemo(() => {
    const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges);
    const variables: ContextVariable[] = [];

    // Add trigger variables
    variables.push(
      { path: 'trigger.type', name: 'Trigger Type', type: 'string', source: 'Trigger', sourceNodeId: '', description: 'How the workflow was triggered' },
      { path: 'trigger.payload', name: 'Trigger Payload', type: 'object', source: 'Trigger', sourceNodeId: '', description: 'Full trigger payload data' },
    );

    // Add workflow variables
    variables.push(
      { path: 'variables', name: 'Workflow Variables', type: 'object', source: 'Variables', sourceNodeId: '', description: 'All workflow-level variables' },
    );

    // Add variables from each upstream node
    for (const node of upstreamNodes) {
      const nodeVars = getNodeOutputSchema(node);
      variables.push(...nodeVars);
    }

    return variables;
  }, [nodeId, nodes, edges]);

  // Filter by search
  const filteredVariables = useMemo(() => {
    if (!searchQuery) return availableVariables;
    const query = searchQuery.toLowerCase();
    return availableVariables.filter(
      v => v.name.toLowerCase().includes(query) ||
           v.path.toLowerCase().includes(query) ||
           v.source.toLowerCase().includes(query)
    );
  }, [availableVariables, searchQuery]);

  // Group by source
  const variablesBySource = useMemo(() => {
    const groups: Record<string, ContextVariable[]> = {};
    for (const v of filteredVariables) {
      if (!groups[v.source]) groups[v.source] = [];
      groups[v.source].push(v);
    }
    return groups;
  }, [filteredVariables]);

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Insert variable reference">
        <IconButton
          size="small"
          onClick={handleOpen}
          disabled={disabled}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: '#00ED64',
              bgcolor: alpha('#00ED64', 0.1),
            },
          }}
        >
          <VariableIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Insert Variable
            </Typography>
            <Tooltip title="Learn about variables">
              <IconButton
                size="small"
                onClick={() => openHelp('workflow-variables' as any)}
                sx={{ color: 'text.secondary' }}
              >
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            fullWidth
            size="small"
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Syntax hint */}
        <Box sx={{ px: 2, py: 1, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Use <code style={{ backgroundColor: alpha(theme.palette.common.black, 0.1), padding: '2px 4px', borderRadius: 2 }}>{'{{path}}'}</code> syntax to reference data from other nodes
          </Typography>
        </Box>

        {/* Variable list */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {Object.keys(variablesBySource).length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? 'No matching variables found' : 'No upstream nodes connected'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Connect this node to triggers or other nodes to access their output data.
              </Typography>
            </Box>
          ) : (
            Object.entries(variablesBySource).map(([source, vars]) => (
              <Accordion
                key={source}
                defaultExpanded={source !== 'Trigger' && source !== 'Variables'}
                disableGutters
                sx={{
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandIcon />}
                  sx={{
                    minHeight: 40,
                    '& .MuiAccordionSummary-content': {
                      my: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    },
                  }}
                >
                  {getSourceIcon(vars[0]?.sourceNodeId ? nodes.find(n => n.id === vars[0].sourceNodeId)?.type || '' : '')}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {source}
                  </Typography>
                  <Chip label={vars.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <List dense disablePadding>
                    {vars.map((variable) => (
                      <ListItem
                        key={variable.path}
                        onClick={() => handleInsert(variable.path)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: alpha('#00ED64', 0.1),
                          },
                          py: 0.5,
                        }}
                        secondaryAction={
                          <Tooltip title="Copy to clipboard">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(variable.path);
                              }}
                              sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                            >
                              <CopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <Tooltip title={variable.type}>
                            {getTypeIcon(variable.type)}
                          </Tooltip>
                        </ListItemIcon>
                        <ListItemText
                          primary={variable.name}
                          secondary={variable.description || `{{${variable.path}}}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            sx: {
                              fontFamily: 'monospace',
                              fontSize: '0.65rem',
                              color: 'text.secondary',
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Click a variable to insert it, or copy with the icon
          </Typography>
        </Box>
      </Popover>
    </>
  );
}

export default VariablePickerButton;
