/**
 * AI Workflow Generator Dialog
 *
 * Dialog component for generating workflows from natural language descriptions.
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  alpha,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  Lightbulb as SuggestionIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  PlayArrow as TriggerIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { useAIWorkflowGenerator } from '@/hooks/useAI';
import { GeneratedWorkflow } from '@/lib/ai/types';

// ============================================
// Types
// ============================================

interface AIWorkflowGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (workflow: GeneratedWorkflow) => void;
}

interface TriggerOption {
  value: string;
  label: string;
}

// ============================================
// Constants
// ============================================

const TRIGGER_OPTIONS: TriggerOption[] = [
  { value: '', label: 'Any / Auto-detect' },
  { value: 'manual', label: 'Manual Start' },
  { value: 'form', label: 'Form Submission' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'schedule', label: 'Schedule / Cron' },
];

const EXAMPLE_PROMPTS = [
  'When a form is submitted, send an email notification and save data to MongoDB',
  'Every day at 9am, fetch data from an API and store it in the database',
  'Process incoming webhooks, classify the content with AI, and route to different actions',
  'When a support form is submitted, use AI to analyze sentiment and notify the team',
  'Sync data between two APIs on a schedule with error handling',
];

// Node type to icon/color mapping for preview
const NODE_DISPLAY: Record<string, { icon: string; color: string }> = {
  'manual-trigger': { icon: '▶️', color: '#4CAF50' },
  'form-trigger': { icon: '📝', color: '#2196F3' },
  'webhook-trigger': { icon: '🔗', color: '#FF9800' },
  'schedule-trigger': { icon: '⏰', color: '#9C27B0' },
  'conditional': { icon: '🔀', color: '#9C27B0' },
  'loop': { icon: '🔁', color: '#9C27B0' },
  'delay': { icon: '⏱️', color: '#9C27B0' },
  'http-request': { icon: '🌐', color: '#FF9800' },
  'mongodb-query': { icon: '🔍', color: '#00897B' },
  'mongodb-write': { icon: '💾', color: '#00897B' },
  'email-send': { icon: '📧', color: '#2196F3' },
  'notification': { icon: '🔔', color: '#2196F3' },
  'transform': { icon: '⚙️', color: '#607D8B' },
  'filter': { icon: '🔽', color: '#607D8B' },
  'merge': { icon: '🔗', color: '#607D8B' },
  'ai-prompt': { icon: '🤖', color: '#E91E63' },
  'ai-classify': { icon: '🏷️', color: '#E91E63' },
  'ai-extract': { icon: '📊', color: '#E91E63' },
};

// ============================================
// Component
// ============================================

export default function AIWorkflowGeneratorDialog({
  open,
  onClose,
  onGenerate,
}: AIWorkflowGeneratorDialogProps) {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [preferredTrigger, setPreferredTrigger] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    data: generatedWorkflow,
    loading,
    error,
    generateWorkflow,
    reset,
    suggestions,
    confidence,
  } = useAIWorkflowGenerator();

  // Handle workflow generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    await generateWorkflow(
      prompt,
      {},
      {
        preferredTrigger: preferredTrigger as 'manual' | 'form' | 'webhook' | 'schedule' | undefined,
        maxNodes: 10,
      }
    );
  }, [prompt, preferredTrigger, generateWorkflow]);

  // Handle applying the generated workflow
  const handleApply = useCallback(() => {
    if (generatedWorkflow) {
      onGenerate(generatedWorkflow);
      handleClose();
    }
  }, [generatedWorkflow, onGenerate]);

  // Handle closing the dialog
  const handleClose = useCallback(() => {
    reset();
    setPrompt('');
    setPreferredTrigger('');
    setShowAdvanced(false);
    onClose();
  }, [reset, onClose]);

  // Handle example prompt click
  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  const canGenerate = prompt.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AIIcon sx={{ color: '#9C27B0' }} />
            <Typography variant="h6">Generate Workflow with AI</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Main input area */}
        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Describe the workflow you want to create in plain language. Be specific about
            the trigger, actions, and any conditions or integrations you need.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Describe your workflow"
            placeholder="e.g., When a customer submits a feedback form, analyze the sentiment with AI, and if negative, send an urgent email to the support team"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          {/* Example prompts */}
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary">
              Try an example:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
              {EXAMPLE_PROMPTS.map((example, index) => (
                <Chip
                  key={index}
                  label={example.length > 50 ? example.substring(0, 50) + '...' : example}
                  size="small"
                  variant="outlined"
                  onClick={() => handleExampleClick(example)}
                  disabled={loading}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>

          {/* Advanced options */}
          <Accordion
            expanded={showAdvanced}
            onChange={() => setShowAdvanced(!showAdvanced)}
            elevation={0}
            sx={{ backgroundColor: 'transparent', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" color="text.secondary">
                Advanced Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" gap={2}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Preferred Trigger</InputLabel>
                  <Select
                    value={preferredTrigger}
                    onChange={(e) => setPreferredTrigger(e.target.value)}
                    label="Preferred Trigger"
                    disabled={loading}
                  >
                    {TRIGGER_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Loading state */}
        {loading && (
          <Box textAlign="center" py={4}>
            <CircularProgress size={40} sx={{ color: '#9C27B0' }} />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Generating your workflow...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Generated workflow preview */}
        {generatedWorkflow && !loading && (
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                Generated Workflow Preview
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  Confidence:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={confidence * 100}
                  sx={{
                    width: 80,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: alpha('#9C27B0', 0.1),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#9C27B0',
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(confidence * 100)}%
                </Typography>
              </Box>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WorkflowIcon sx={{ color: '#9C27B0', fontSize: 20 }} />
                <Typography variant="subtitle2">
                  {generatedWorkflow.name}
                </Typography>
              </Box>
              {generatedWorkflow.description && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {generatedWorkflow.description}
                </Typography>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Nodes ({generatedWorkflow.nodes.length}):
              </Typography>
              <List dense disablePadding>
                {generatedWorkflow.nodes.map((node, index) => {
                  const display = NODE_DISPLAY[node.type] || { icon: '⬜', color: '#666' };
                  return (
                    <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            bgcolor: alpha(display.color, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                          }}
                        >
                          {display.icon}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={node.label}
                        secondary={node.type}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      {node.type.endsWith('-trigger') && (
                        <Chip
                          icon={<TriggerIcon sx={{ fontSize: 14 }} />}
                          label="Trigger"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 10,
                            bgcolor: alpha('#4CAF50', 0.1),
                            color: '#4CAF50',
                            '& .MuiChip-icon': { color: '#4CAF50' },
                          }}
                        />
                      )}
                    </ListItem>
                  );
                })}
              </List>

              {generatedWorkflow.edges.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Connections: {generatedWorkflow.edges.length}
                  </Typography>
                </>
              )}
            </Paper>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  mb={1}
                >
                  <SuggestionIcon fontSize="small" />
                  Suggestions for improvement:
                </Typography>
                {suggestions.map((suggestion, index) => (
                  <Alert
                    key={index}
                    severity="info"
                    icon={<WarningIcon fontSize="small" />}
                    sx={{ mb: 1, py: 0 }}
                  >
                    <Typography variant="caption">{suggestion}</Typography>
                  </Alert>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {!generatedWorkflow ? (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            startIcon={loading ? <CircularProgress size={16} /> : <AIIcon />}
            sx={{
              background: 'linear-gradient(135deg, #9C27B0 0%, #E91E63 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7B1FA2 0%, #C2185B 100%)',
              },
            }}
          >
            {loading ? 'Generating...' : 'Generate Workflow'}
          </Button>
        ) : (
          <>
            <Button onClick={reset} disabled={loading}>
              Try Again
            </Button>
            <Button
              variant="contained"
              onClick={handleApply}
              color="success"
              startIcon={<CheckIcon />}
            >
              Apply to Canvas
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export { AIWorkflowGeneratorDialog };
