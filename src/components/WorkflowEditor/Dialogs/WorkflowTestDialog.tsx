/**
 * Workflow Test Dialog
 *
 * Modal dialog for testing workflows with different trigger types:
 * - Form triggers: Renders the linked form for data entry
 * - Webhook triggers: Provides a JSON editor for payload input
 * - Manual triggers: Simple run button
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Science as TestIcon,
  Description as FormIcon,
  Webhook as WebhookIcon,
  TouchApp as ManualIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { WorkflowDocument } from '@/types/workflow';
import { FormPreview } from '@/components/FormBuilder/FormPreview';
import { useWorkflowTest, TestableTriggerType } from '@/hooks/useWorkflowTest';

// ============================================
// Types
// ============================================

interface WorkflowTestDialogProps {
  open: boolean;
  onClose: () => void;
  workflow: WorkflowDocument | null;
  orgId: string;
  onExecutionStarted: (executionId: string) => void;
  onSaveBeforeTest?: () => Promise<boolean>;
  isDirty?: boolean;
}

// ============================================
// Syntax Highlighting (Simple JSON)
// ============================================

function SyntaxHighlightedCode({
  code,
  darkMode = true,
}: {
  code: string;
  darkMode?: boolean;
}) {
  const highlightedCode = useMemo(() => {
    return code
      // Strings
      .replace(/"([^"\\]|\\.)*"/g, (match) => {
        if (code.indexOf(match + ':') !== -1 || code.indexOf(match + ' :') !== -1) {
          // It's a key
          return `<span style="color: ${darkMode ? '#9CDCFE' : '#0451A5'}">${match}</span>`;
        }
        // It's a value
        return `<span style="color: ${darkMode ? '#CE9178' : '#A31515'}">${match}</span>`;
      })
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, `<span style="color: ${darkMode ? '#B5CEA8' : '#098658'}">$1</span>`)
      // Booleans and null
      .replace(/\b(true|false|null)\b/g, `<span style="color: ${darkMode ? '#569CD6' : '#0000FF'}">$1</span>`);
  }, [code, darkMode]);

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        overflow: 'auto',
        maxHeight: 200,
        fontSize: '0.75rem',
        fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
        lineHeight: 1.5,
        backgroundColor: darkMode ? '#1E1E1E' : '#FFFFFF',
        color: darkMode ? '#D4D4D4' : '#000000',
        borderRadius: 1,
        border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
        '& span': {
          fontFamily: 'inherit',
        },
      }}
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  );
}

// ============================================
// JSON Editor Component
// ============================================

function JsonEditor({
  value,
  onChange,
  error,
  darkMode = true,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  darkMode?: boolean;
}) {
  return (
    <Box>
      <Box
        component="textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          width: '100%',
          minHeight: 200,
          maxHeight: 400,
          p: 2,
          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
          fontSize: '0.8rem',
          lineHeight: 1.6,
          border: `1px solid ${error ? '#f44336' : darkMode ? '#333' : '#E0E0E0'}`,
          borderRadius: 1,
          backgroundColor: darkMode ? '#1E1E1E' : '#FFFFFF',
          color: darkMode ? '#D4D4D4' : '#000000',
          resize: 'vertical',
          outline: 'none',
          '&:focus': {
            borderColor: error ? '#f44336' : '#00ED64',
          },
        }}
      />
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

// ============================================
// Trigger Icon Component
// ============================================

function TriggerIcon({ type }: { type: TestableTriggerType | null }) {
  switch (type) {
    case 'form-trigger':
      return <FormIcon />;
    case 'webhook-trigger':
      return <WebhookIcon />;
    case 'manual-trigger':
      return <ManualIcon />;
    default:
      return <TestIcon />;
  }
}

// ============================================
// Main Component
// ============================================

export function WorkflowTestDialog({
  open,
  onClose,
  workflow,
  orgId,
  onExecutionStarted,
  onSaveBeforeTest,
  isDirty,
}: WorkflowTestDialogProps) {
  const theme = useTheme();
  const [payloadPreviewExpanded, setPayloadPreviewExpanded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    triggerType,
    triggerNode,
    canTest,
    form,
    formLoading,
    formError,
    formData,
    handleFormDataChange,
    resetFormData,
    webhookPayload,
    setWebhookPayload,
    webhookPayloadError,
    resetWebhookPayload,
    isExecuting,
    executeTest,
    generatePayload,
  } = useWorkflowTest({ workflow, orgId });

  // Handle test execution
  const handleRunTest = useCallback(async () => {
    setSaveError(null);

    // Save workflow first if there are unsaved changes
    if (isDirty && onSaveBeforeTest) {
      const saved = await onSaveBeforeTest();
      if (!saved) {
        setSaveError('Failed to save workflow. Please save manually before testing.');
        return;
      }
    }

    const result = await executeTest();
    if (result.success && result.executionId) {
      onExecutionStarted(result.executionId);
      onClose();
    }
  }, [executeTest, onExecutionStarted, onClose, isDirty, onSaveBeforeTest]);

  // Generate payload preview
  const payloadPreview = useMemo(() => {
    const payload = generatePayload();
    return payload ? JSON.stringify(payload, null, 2) : null;
  }, [generatePayload]);

  // Get trigger type label
  const triggerLabel = useMemo(() => {
    switch (triggerType) {
      case 'form-trigger':
        return 'Form Submission';
      case 'webhook-trigger':
        return 'Webhook';
      case 'manual-trigger':
        return 'Manual';
      default:
        return 'Unknown';
    }
  }, [triggerType]);

  if (!workflow) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TestIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Test Workflow
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {workflow.name}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {/* Trigger Type Indicator */}
        <Box
          sx={{
            px: 3,
            py: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <TriggerIcon type={triggerType} />
          <Typography variant="subtitle2">
            Testing with: <strong>{triggerLabel}</strong>
          </Typography>
          {triggerType === 'form-trigger' && form && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Form: {form.name}
            </Typography>
          )}
        </Box>

        {/* Save error or dirty warning */}
        {saveError && (
          <Box sx={{ px: 3, pt: 2 }}>
            <Alert severity="error">{saveError}</Alert>
          </Box>
        )}
        {isDirty && !saveError && (
          <Box sx={{ px: 3, pt: 2 }}>
            <Alert severity="info">
              You have unsaved changes. The workflow will be saved automatically before testing.
            </Alert>
          </Box>
        )}

        {/* Content based on trigger type */}
        <Box sx={{ p: 3 }}>
          {triggerType === 'form-trigger' && (
            <FormTriggerContent
              form={form}
              formLoading={formLoading}
              formError={formError}
              formData={formData}
              onFormDataChange={handleFormDataChange}
              onReset={resetFormData}
            />
          )}

          {triggerType === 'webhook-trigger' && (
            <WebhookTriggerContent
              payload={webhookPayload}
              onPayloadChange={setWebhookPayload}
              error={webhookPayloadError}
              onReset={resetWebhookPayload}
              config={triggerNode?.config}
            />
          )}

          {triggerType === 'manual-trigger' && (
            <ManualTriggerContent />
          )}

          {!triggerType && (
            <Alert severity="warning">
              This workflow does not have a testable trigger. Add a form, webhook, or manual trigger to test.
            </Alert>
          )}
        </Box>

        {/* Payload Preview */}
        {payloadPreview && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Accordion
              expanded={payloadPreviewExpanded}
              onChange={(_, expanded) => setPayloadPreviewExpanded(expanded)}
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: 40,
                  '& .MuiAccordionSummary-content': { my: 0 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Preview Payload
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <SyntaxHighlightedCode
                  code={payloadPreview}
                  darkMode={theme.palette.mode === 'dark'}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={isExecuting ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <PlayIcon />}
          onClick={handleRunTest}
          disabled={!canTest || isExecuting || (triggerType === 'webhook-trigger' && Boolean(webhookPayloadError))}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            '&:hover': {
              bgcolor: '#00CC55',
            },
          }}
        >
          {isExecuting ? 'Running...' : 'Run Test'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Form Trigger Content
// ============================================

interface FormTriggerContentProps {
  form: any;
  formLoading: boolean;
  formError: string | null;
  formData: Record<string, any>;
  onFormDataChange: (path: string, value: any) => void;
  onReset: () => void;
}

function FormTriggerContent({
  form,
  formLoading,
  formError,
  formData,
  onFormDataChange,
  onReset,
}: FormTriggerContentProps) {
  if (formLoading) {
    return (
      <Box sx={{ py: 2 }}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="rectangular" height={48} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={48} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={48} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (formError) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {formError}. Please check that the form exists and you have access to it.
      </Alert>
    );
  }

  if (!form) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        No form linked to this trigger. Please configure the form trigger node first.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Fill out the form below to test the workflow
        </Typography>
        <Tooltip title="Reset form">
          <IconButton size="small" onClick={onReset}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        sx={{
          maxHeight: 400,
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <FormPreview
          fieldConfigs={form.fieldConfigs || []}
          formData={formData}
          onFormDataChange={onFormDataChange}
          onResetForm={onReset}
          editableMode={false}
        />
      </Box>
    </Box>
  );
}

// ============================================
// Webhook Trigger Content
// ============================================

interface WebhookTriggerContentProps {
  payload: string;
  onPayloadChange: (value: string) => void;
  error: string | null;
  onReset: () => void;
  config?: Record<string, any>;
}

function WebhookTriggerContent({
  payload,
  onPayloadChange,
  error,
  onReset,
  config,
}: WebhookTriggerContentProps) {
  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Enter the webhook payload (JSON)
          </Typography>
          {config?.method && (
            <Typography variant="caption" color="text.secondary">
              Method: {config.method}
              {config.path && ` | Path: ${config.path}`}
            </Typography>
          )}
        </Box>
        <Tooltip title="Reset to sample payload">
          <IconButton size="small" onClick={onReset}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <JsonEditor
        value={payload}
        onChange={onPayloadChange}
        error={error}
        darkMode={theme.palette.mode === 'dark'}
      />
    </Box>
  );
}

// ============================================
// Manual Trigger Content
// ============================================

function ManualTriggerContent() {
  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <ManualIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
      <Typography variant="body1" color="text.secondary">
        This workflow uses a manual trigger.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Click &quot;Run Test&quot; to execute the workflow with an empty payload.
      </Typography>
    </Box>
  );
}

export default WorkflowTestDialog;
