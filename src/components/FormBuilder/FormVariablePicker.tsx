'use client';

import React, { useState, useMemo } from 'react';
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
  Tabs,
  Tab,
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
  Description as FieldIcon,
  Code as VariableCodeIcon,
  Functions as FunctionIcon,
  Help as HelpIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { FieldConfig, FormVariable } from '@/types/form';
import { useHelp } from '@/contexts/HelpContext';

// Variable definition for display
interface FormContextVariable {
  path: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'any';
  description?: string;
  source: 'field' | 'variable' | 'metadata' | 'function';
  category?: string;
}

// Context type for the picker
export type FormVariableContext =
  | 'formula'           // For computed fields - fields, variables, functions
  | 'template'          // For success messages - {{field}} syntax
  | 'condition'         // For conditional logic - field values only
  | 'webhook';          // For webhook payloads - fields, metadata

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

// Get source icon
function getSourceIcon(source: string) {
  switch (source) {
    case 'field': return <FieldIcon fontSize="small" />;
    case 'variable': return <VariableCodeIcon fontSize="small" />;
    case 'function': return <FunctionIcon fontSize="small" />;
    case 'metadata': return <InfoIcon fontSize="small" />;
    default: return <ObjectIcon fontSize="small" />;
  }
}

// Formula functions available in computed fields
const FORMULA_FUNCTIONS: FormContextVariable[] = [
  // String functions
  { path: 'len(text)', name: 'Length', type: 'number', source: 'function', category: 'string', description: 'Returns the length of text' },
  { path: 'upper(text)', name: 'Uppercase', type: 'string', source: 'function', category: 'string', description: 'Converts text to uppercase' },
  { path: 'lower(text)', name: 'Lowercase', type: 'string', source: 'function', category: 'string', description: 'Converts text to lowercase' },
  { path: 'trim(text)', name: 'Trim', type: 'string', source: 'function', category: 'string', description: 'Removes leading/trailing spaces' },
  { path: 'concat(a, b, ...)', name: 'Concatenate', type: 'string', source: 'function', category: 'string', description: 'Joins text values together' },
  { path: 'left(text, n)', name: 'Left', type: 'string', source: 'function', category: 'string', description: 'Returns first n characters' },
  { path: 'right(text, n)', name: 'Right', type: 'string', source: 'function', category: 'string', description: 'Returns last n characters' },
  { path: 'mid(text, start, len)', name: 'Mid', type: 'string', source: 'function', category: 'string', description: 'Returns substring from middle' },
  { path: 'replace(text, find, replace)', name: 'Replace', type: 'string', source: 'function', category: 'string', description: 'Replaces text in string' },
  { path: 'split(text, delimiter)', name: 'Split', type: 'array', source: 'function', category: 'string', description: 'Splits text into array' },

  // Numeric functions
  { path: 'sum(a, b, ...)', name: 'Sum', type: 'number', source: 'function', category: 'numeric', description: 'Adds numbers together' },
  { path: 'average(a, b, ...)', name: 'Average', type: 'number', source: 'function', category: 'numeric', description: 'Calculates average' },
  { path: 'min(a, b, ...)', name: 'Min', type: 'number', source: 'function', category: 'numeric', description: 'Returns smallest value' },
  { path: 'max(a, b, ...)', name: 'Max', type: 'number', source: 'function', category: 'numeric', description: 'Returns largest value' },
  { path: 'round(num, decimals)', name: 'Round', type: 'number', source: 'function', category: 'numeric', description: 'Rounds to decimal places' },
  { path: 'floor(num)', name: 'Floor', type: 'number', source: 'function', category: 'numeric', description: 'Rounds down to integer' },
  { path: 'ceil(num)', name: 'Ceiling', type: 'number', source: 'function', category: 'numeric', description: 'Rounds up to integer' },
  { path: 'abs(num)', name: 'Absolute', type: 'number', source: 'function', category: 'numeric', description: 'Returns absolute value' },

  // Date functions
  { path: 'now()', name: 'Now', type: 'date', source: 'function', category: 'date', description: 'Current date and time' },
  { path: 'today()', name: 'Today', type: 'date', source: 'function', category: 'date', description: 'Current date (no time)' },
  { path: 'year(date)', name: 'Year', type: 'number', source: 'function', category: 'date', description: 'Extracts year from date' },
  { path: 'month(date)', name: 'Month', type: 'number', source: 'function', category: 'date', description: 'Extracts month from date' },
  { path: 'day(date)', name: 'Day', type: 'number', source: 'function', category: 'date', description: 'Extracts day from date' },
  { path: 'dateAdd(date, num, unit)', name: 'Date Add', type: 'date', source: 'function', category: 'date', description: 'Adds time to a date' },
  { path: 'dateDiff(date1, date2, unit)', name: 'Date Diff', type: 'number', source: 'function', category: 'date', description: 'Difference between dates' },

  // Array functions
  { path: 'count(array)', name: 'Count', type: 'number', source: 'function', category: 'array', description: 'Number of items in array' },
  { path: 'first(array)', name: 'First', type: 'any', source: 'function', category: 'array', description: 'First item in array' },
  { path: 'last(array)', name: 'Last', type: 'any', source: 'function', category: 'array', description: 'Last item in array' },
  { path: 'join(array, separator)', name: 'Join', type: 'string', source: 'function', category: 'array', description: 'Joins array into string' },
  { path: 'contains(array, value)', name: 'Contains', type: 'boolean', source: 'function', category: 'array', description: 'Checks if array contains value' },

  // Conditional functions
  { path: 'if(condition, ifTrue, ifFalse)', name: 'If', type: 'any', source: 'function', category: 'logic', description: 'Returns value based on condition' },
  { path: 'coalesce(a, b, ...)', name: 'Coalesce', type: 'any', source: 'function', category: 'logic', description: 'Returns first non-null value' },
];

// Metadata variables available in templates
const METADATA_VARIABLES: FormContextVariable[] = [
  { path: 'responseId', name: 'Response ID', type: 'string', source: 'metadata', description: 'Unique ID of the submitted response' },
  { path: 'submittedAt', name: 'Submitted At', type: 'date', source: 'metadata', description: 'Timestamp when form was submitted' },
  { path: 'formId', name: 'Form ID', type: 'string', source: 'metadata', description: 'ID of the form' },
  { path: 'formName', name: 'Form Name', type: 'string', source: 'metadata', description: 'Name of the form' },
];

interface FormVariablePickerButtonProps {
  fieldConfigs: FieldConfig[];
  variables?: FormVariable[];
  context: FormVariableContext;
  onInsert: (value: string) => void;
  disabled?: boolean;
  // For template context, wrap in {{}}
  useTemplateSyntax?: boolean;
}

export function FormVariablePickerButton({
  fieldConfigs,
  variables = [],
  context,
  onInsert,
  disabled,
  useTemplateSyntax = false,
}: FormVariablePickerButtonProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const { openHelp } = useHelp();

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setSearchQuery('');
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleInsert = (path: string, source: string) => {
    let value = path;

    // Apply template syntax if needed
    if (useTemplateSyntax && source !== 'function') {
      value = `{{${path}}}`;
    }

    onInsert(value);
    handleClose();
  };

  const handleCopy = (path: string, source: string) => {
    let value = path;
    if (useTemplateSyntax && source !== 'function') {
      value = `{{${path}}}`;
    }
    navigator.clipboard.writeText(value);
  };

  // Build available variables based on context
  const availableVariables = useMemo(() => {
    const vars: FormContextVariable[] = [];

    // Add form fields
    const includedFields = fieldConfigs.filter(f => f.included);
    for (const field of includedFields) {
      vars.push({
        path: field.path,
        name: field.label || field.path,
        type: mapFieldType(field.type),
        source: 'field',
        description: field.placeholder, // Use placeholder as description fallback
      });
    }

    // Add user-defined variables (for formula and template contexts)
    if (context === 'formula' || context === 'template') {
      for (const variable of variables) {
        vars.push({
          path: `$${variable.name}`,
          name: variable.name,
          type: variable.type as FormContextVariable['type'],
          source: 'variable',
          description: variable.description,
        });
      }
    }

    // Add metadata (for template and webhook contexts)
    if (context === 'template' || context === 'webhook') {
      vars.push(...METADATA_VARIABLES);
    }

    return vars;
  }, [fieldConfigs, variables, context]);

  // Get functions for formula context
  const availableFunctions = useMemo(() => {
    if (context !== 'formula') return [];
    return FORMULA_FUNCTIONS;
  }, [context]);

  // Filter by search
  const filteredVariables = useMemo(() => {
    if (!searchQuery) return availableVariables;
    const query = searchQuery.toLowerCase();
    return availableVariables.filter(
      v => v.name.toLowerCase().includes(query) ||
           v.path.toLowerCase().includes(query) ||
           (v.description?.toLowerCase().includes(query))
    );
  }, [availableVariables, searchQuery]);

  const filteredFunctions = useMemo(() => {
    if (!searchQuery) return availableFunctions;
    const query = searchQuery.toLowerCase();
    return availableFunctions.filter(
      f => f.name.toLowerCase().includes(query) ||
           f.path.toLowerCase().includes(query) ||
           (f.description?.toLowerCase().includes(query))
    );
  }, [availableFunctions, searchQuery]);

  // Group variables by source
  const variablesBySource = useMemo(() => {
    const groups: Record<string, FormContextVariable[]> = {};
    for (const v of filteredVariables) {
      const sourceKey = v.source === 'field' ? 'Form Fields' :
                       v.source === 'variable' ? 'Variables' :
                       v.source === 'metadata' ? 'Metadata' : 'Other';
      if (!groups[sourceKey]) groups[sourceKey] = [];
      groups[sourceKey].push(v);
    }
    return groups;
  }, [filteredVariables]);

  // Group functions by category
  const functionsByCategory = useMemo(() => {
    const groups: Record<string, FormContextVariable[]> = {};
    for (const f of filteredFunctions) {
      const cat = f.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    }
    return groups;
  }, [filteredFunctions]);

  const open = Boolean(anchorEl);

  // Determine tabs based on context
  const showFunctions = context === 'formula';
  const tabs = showFunctions ? ['Variables', 'Functions'] : ['Variables'];

  return (
    <>
      <Tooltip title="Insert variable or field reference">
        <IconButton
          size="small"
          onClick={handleOpen}
          disabled={disabled}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: '#9c27b0',
              bgcolor: alpha('#9c27b0', 0.1),
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
            width: 380,
            maxHeight: 500,
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
              Insert Reference
            </Typography>
            <Tooltip title="Learn about form variables">
              <IconButton
                size="small"
                onClick={() => openHelp('form-variables')}
                sx={{ color: 'text.secondary' }}
              >
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            fullWidth
            size="small"
            placeholder="Search..."
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

        {/* Tabs for formula context */}
        {showFunctions && (
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 36,
              borderBottom: `1px solid ${theme.palette.divider}`,
              '& .MuiTab-root': {
                minHeight: 36,
                fontSize: '0.75rem',
                textTransform: 'none',
              },
            }}
          >
            {tabs.map((tab, i) => (
              <Tab key={tab} label={tab} />
            ))}
          </Tabs>
        )}

        {/* Syntax hint */}
        <Box sx={{ px: 2, py: 1, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {context === 'formula' && activeTab === 0 && 'Click a field name to insert it into your formula'}
            {context === 'formula' && activeTab === 1 && 'Click a function to insert its syntax'}
            {context === 'template' && (
              <>Use <code style={{ backgroundColor: alpha(theme.palette.common.black, 0.1), padding: '2px 4px', borderRadius: 2 }}>{'{{fieldPath}}'}</code> to include field values in your message</>
            )}
            {context === 'condition' && 'Select a field to use in your condition'}
            {context === 'webhook' && 'Select fields to include in the webhook payload'}
          </Typography>
        </Box>

        {/* Content based on active tab */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {(activeTab === 0 || !showFunctions) ? (
            // Variables tab
            Object.keys(variablesBySource).length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {searchQuery ? 'No matching fields found' : 'No fields available'}
                </Typography>
              </Box>
            ) : (
              Object.entries(variablesBySource).map(([source, vars]) => (
                <Accordion
                  key={source}
                  defaultExpanded={source === 'Form Fields'}
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
                    {getSourceIcon(vars[0]?.source || 'field')}
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
                          onClick={() => handleInsert(variable.path, variable.source)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: alpha('#9c27b0', 0.1),
                            },
                            py: 0.5,
                          }}
                          secondaryAction={
                            <Tooltip title="Copy to clipboard">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(variable.path, variable.source);
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
                            secondary={variable.description || (useTemplateSyntax ? `{{${variable.path}}}` : variable.path)}
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
            )
          ) : (
            // Functions tab
            Object.keys(functionsByCategory).length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No matching functions found
                </Typography>
              </Box>
            ) : (
              Object.entries(functionsByCategory).map(([category, funcs]) => (
                <Accordion
                  key={category}
                  defaultExpanded={category === 'string' || category === 'numeric'}
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
                    <FunctionIcon fontSize="small" sx={{ color: '#9c27b0' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {category}
                    </Typography>
                    <Chip label={funcs.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <List dense disablePadding>
                      {funcs.map((func) => (
                        <ListItem
                          key={func.path}
                          onClick={() => handleInsert(func.path, func.source)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: alpha('#9c27b0', 0.1),
                            },
                            py: 0.5,
                          }}
                          secondaryAction={
                            <Tooltip title="Copy to clipboard">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(func.path, func.source);
                                }}
                                sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                              >
                                <CopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <Tooltip title={func.type}>
                              {getTypeIcon(func.type)}
                            </Tooltip>
                          </ListItemIcon>
                          <ListItemText
                            primary={func.name}
                            secondary={func.description}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              sx: {
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
            )
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Click to insert, or use the copy icon
          </Typography>
        </Box>
      </Popover>
    </>
  );
}

// Helper to map field types to our variable types
function mapFieldType(fieldType: string): FormContextVariable['type'] {
  switch (fieldType) {
    case 'string':
    case 'text':
    case 'email':
    case 'url':
    case 'tel':
    case 'textarea':
      return 'string';
    case 'number':
    case 'int':
    case 'double':
    case 'decimal':
      return 'number';
    case 'bool':
    case 'boolean':
    case 'checkbox':
      return 'boolean';
    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'date';
    case 'array':
    case 'repeater':
      return 'array';
    case 'object':
    case 'embedded':
      return 'object';
    default:
      return 'any';
  }
}

export default FormVariablePickerButton;
