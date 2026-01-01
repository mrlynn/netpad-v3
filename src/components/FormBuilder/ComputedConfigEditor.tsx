'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Collapse,
  Paper,
  alpha,
  Chip,
  Button,
  Menu,
  Tabs,
  Tab,
  Tooltip,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Functions,
  Check,
  Error as ErrorIcon,
  TextFields,
  Calculate,
  CalendarToday,
  List,
  HelpOutline
} from '@mui/icons-material';
import { FieldConfig, ComputedConfig } from '@/types/form';
import {
  validateFormula,
  extractDependencies,
  formulaTemplates,
  getTemplatesByCategory,
  getFunctionsByCategory,
  formulaFunctions
} from '@/utils/computedFields';
import AIFormulaAssistant from './AIFormulaAssistant';
import { FormVariablePickerButton } from './FormVariablePicker';

interface ComputedConfigEditorProps {
  config: FieldConfig;
  allFieldConfigs: FieldConfig[];
  onUpdate: (computed: ComputedConfig | undefined) => void;
}

// Category icons mapping
const categoryIcons: Record<string, React.ReactElement> = {
  string: <TextFields fontSize="small" />,
  numeric: <Calculate fontSize="small" />,
  date: <CalendarToday fontSize="small" />,
  array: <List fontSize="small" />,
  conditional: <HelpOutline fontSize="small" />,
  math: <Calculate fontSize="small" />
};

// Category display names
const categoryNames: Record<string, string> = {
  string: 'Text',
  numeric: 'Numbers',
  date: 'Dates',
  array: 'Arrays',
  conditional: 'Logic',
  math: 'Math'
};

export function ComputedConfigEditor({
  config,
  allFieldConfigs,
  onUpdate
}: ComputedConfigEditorProps) {
  const [expanded, setExpanded] = useState(!!config.computed);
  const [templateAnchor, setTemplateAnchor] = useState<null | HTMLElement>(null);
  const [functionTab, setFunctionTab] = useState(0);
  const [showFunctions, setShowFunctions] = useState(false);

  // Get functions grouped by category
  const functionsByCategory = getFunctionsByCategory();
  const templatesByCategory = getTemplatesByCategory();
  const functionCategories = Object.keys(functionsByCategory);

  const computed = config.computed || {
    formula: '',
    dependencies: [],
    outputType: 'string' as const
  };

  const hasComputed = !!config.computed;

  // Validate formula
  const validation = computed.formula
    ? validateFormula(computed.formula, allFieldConfigs)
    : { valid: true };

  // Get available fields for reference
  const availableFields = allFieldConfigs.filter(
    (f) => f.path !== config.path && f.included && !f.computed
  );

  const handleUpdate = (updates: Partial<ComputedConfig>) => {
    const newComputed = { ...computed, ...updates };

    // Auto-detect dependencies
    if (updates.formula !== undefined) {
      newComputed.dependencies = extractDependencies(updates.formula, allFieldConfigs);
    }

    onUpdate(newComputed);
  };

  const handleToggle = () => {
    if (hasComputed) {
      onUpdate(undefined);
      setExpanded(false);
    } else {
      onUpdate(computed);
      setExpanded(true);
    }
  };

  const insertFieldReference = (path: string) => {
    const newFormula = computed.formula ? `${computed.formula} ${path}` : path;
    handleUpdate({ formula: newFormula });
  };

  const insertFunction = (funcName: string, syntax: string) => {
    // Insert the function syntax at cursor or append
    const newFormula = computed.formula ? `${computed.formula} ${syntax}` : syntax;
    handleUpdate({ formula: newFormula });
  };

  const applyTemplate = (template: typeof formulaTemplates[0]) => {
    handleUpdate({ formula: template.formula });
    setTemplateAnchor(null);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 0.5
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Functions fontSize="small" sx={{ color: hasComputed ? '#00ED64' : 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Computed Field
          </Typography>
          {hasComputed && validation.valid && (
            <Check fontSize="small" sx={{ color: '#00ED64', fontSize: 14 }} />
          )}
          {hasComputed && !validation.valid && (
            <ErrorIcon fontSize="small" sx={{ color: 'error.main', fontSize: 14 }} />
          )}
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 2,
            bgcolor: alpha('#00ED64', 0.03),
            border: '1px solid',
            borderColor: alpha('#00ED64', 0.15),
            borderRadius: 1
          }}
        >
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={hasComputed}
                onChange={handleToggle}
              />
            }
            label={
              <Typography variant="caption">
                Calculate value from other fields
              </Typography>
            }
            sx={{ mb: 2 }}
          />

          {hasComputed && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Formula Input with AI Assistant */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <TextField
                    size="small"
                    label="Formula"
                    value={computed.formula}
                    onChange={(e) => handleUpdate({ formula: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="e.g., price * quantity"
                    error={!validation.valid}
                    helperText={
                      !validation.valid
                        ? validation.error
                        : 'Use field names and functions. Click {x} to browse available fields and functions.'
                    }
                    InputProps={{
                      sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
                    }}
                  />
                  <Box sx={{ pt: 1 }}>
                    <FormVariablePickerButton
                      fieldConfigs={allFieldConfigs.filter(f => f.path !== config.path)}
                      context="formula"
                      onInsert={(value) => {
                        const newFormula = computed.formula ? `${computed.formula}${value}` : value;
                        handleUpdate({ formula: newFormula });
                      }}
                    />
                  </Box>
                </Box>
                <AIFormulaAssistant
                  availableFields={allFieldConfigs
                    .filter(f => f.included && f.path !== config.path)
                    .map(f => ({
                      path: f.path,
                      label: f.label || f.path,
                      type: f.type
                    }))}
                  outputType={computed.outputType}
                  onApply={(formula, dependencies) => {
                    handleUpdate({ formula, dependencies });
                  }}
                />
              </Box>

              {/* Template & Function Buttons */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setTemplateAnchor(e.currentTarget)}
                  sx={{ fontSize: '0.7rem' }}
                >
                  Templates
                </Button>
                <Button
                  size="small"
                  variant={showFunctions ? 'contained' : 'outlined'}
                  onClick={() => setShowFunctions(!showFunctions)}
                  startIcon={<Functions />}
                  sx={{ fontSize: '0.7rem' }}
                >
                  {showFunctions ? 'Hide Functions' : 'Show Functions'}
                </Button>
                <Menu
                  anchorEl={templateAnchor}
                  open={Boolean(templateAnchor)}
                  onClose={() => setTemplateAnchor(null)}
                  PaperProps={{ sx: { maxHeight: 400, width: 320 } }}
                >
                  {Object.entries(templatesByCategory).map(([category, templates]) => [
                    <MenuItem key={`header-${category}`} disabled sx={{ opacity: '1 !important' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {categoryIcons[category]}
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                          {categoryNames[category] || category}
                        </Typography>
                      </Box>
                    </MenuItem>,
                    ...templates.map((template) => (
                      <MenuItem
                        key={template.name}
                        onClick={() => applyTemplate(template)}
                        sx={{ pl: 4 }}
                      >
                        <Box>
                          <Typography variant="body2">{template.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {template.formula}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  ])}
                </Menu>
              </Box>

              {/* Function Reference Panel */}
              <Collapse in={showFunctions}>
                <Paper
                  elevation={0}
                  sx={{
                    mt: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Tabs
                    value={functionTab}
                    onChange={(_, v) => setFunctionTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      minHeight: 36,
                      bgcolor: alpha('#000', 0.02),
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '& .MuiTab-root': {
                        minHeight: 36,
                        py: 0.5,
                        fontSize: '0.7rem',
                        textTransform: 'none'
                      }
                    }}
                  >
                    {functionCategories.map((cat) => (
                      <Tab
                        key={cat}
                        icon={categoryIcons[cat]}
                        iconPosition="start"
                        label={categoryNames[cat] || cat}
                      />
                    ))}
                  </Tabs>
                  <Box sx={{ p: 1.5, maxHeight: 200, overflowY: 'auto' }}>
                    {functionsByCategory[functionCategories[functionTab]]?.map((fn) => (
                      <Box
                        key={fn.name}
                        sx={{
                          mb: 1.5,
                          pb: 1.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': { mb: 0, pb: 0, border: 'none' }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Tooltip title="Click to insert">
                            <Chip
                              label={fn.syntax}
                              size="small"
                              onClick={() => insertFunction(fn.name, fn.syntax)}
                              sx={{
                                height: 24,
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                bgcolor: alpha('#00ED64', 0.1),
                                '&:hover': { bgcolor: alpha('#00ED64', 0.2) }
                              }}
                            />
                          </Tooltip>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                          {fn.description}
                        </Typography>
                        {fn.examples && fn.examples.length > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              fontFamily: 'monospace',
                              fontSize: '0.65rem',
                              color: 'text.secondary',
                              bgcolor: alpha('#000', 0.03),
                              p: 0.5,
                              borderRadius: 0.5
                            }}
                          >
                            e.g. {fn.examples[0]}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Collapse>

              {/* Available Fields */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Available Fields (click to insert):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {availableFields.map((f) => (
                    <Chip
                      key={f.path}
                      label={f.path}
                      size="small"
                      onClick={() => insertFieldReference(f.path)}
                      sx={{
                        height: 22,
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha('#00ED64', 0.15)
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Output Type */}
              <FormControl size="small" fullWidth>
                <InputLabel>Output Type</InputLabel>
                <Select
                  value={computed.outputType}
                  label="Output Type"
                  onChange={(e) =>
                    handleUpdate({ outputType: e.target.value as ComputedConfig['outputType'] })
                  }
                >
                  <MenuItem value="string">Text</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="boolean">Boolean</MenuItem>
                </Select>
              </FormControl>

              {/* Dependencies */}
              {computed.dependencies.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Dependencies:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {computed.dependencies.map((dep) => (
                      <Chip
                        key={dep}
                        label={dep}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.6rem',
                          bgcolor: alpha('#00ED64', 0.1),
                          color: '#00ED64'
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
