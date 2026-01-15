/**
 * AI Application Generator Dialog
 *
 * Dialog component for generating complete applications (metadata, form, and workflow)
 * from natural language descriptions.
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  alpha,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Apps as AppsIcon,
  Description as FormIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { GeneratedApplication } from '@/lib/ai/types';

// ============================================
// Types
// ============================================

interface AIApplicationGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (application: GeneratedApplication) => void;
}

// ============================================
// Constants
// ============================================

const EXAMPLE_PROMPTS = [
  'Customer feedback application with a feedback form and automated email notifications',
  'Employee onboarding application with intake form and welcome email workflow',
  'IT helpdesk ticket system with ticket submission form and assignment workflow',
  'Event registration application with registration form and confirmation email',
  'Product order application with order form and inventory update workflow',
];

// ============================================
// Component
// ============================================

export default function AIApplicationGeneratorDialog({
  open,
  onClose,
  onGenerate,
}: AIApplicationGeneratorDialogProps) {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [industry, setIndustry] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedApplication, setGeneratedApplication] = useState<GeneratedApplication | null>(null);
  const [confidence, setConfidence] = useState(0);

  // Handle application generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setGeneratedApplication(null);

    try {
      const response = await fetch('/api/ai/generate-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: {
            industry: industry || undefined,
          },
          options: {
            includeForm: true,
            includeWorkflow: true,
            maxFields: 15,
            maxNodes: 7,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate application');
      }

      setGeneratedApplication(data.application);
      setConfidence(data.confidence || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to generate application');
    } finally {
      setLoading(false);
    }
  }, [prompt, industry]);

  // Handle applying the generated application
  const handleApply = useCallback(() => {
    if (generatedApplication) {
      onGenerate(generatedApplication);
      handleClose();
    }
  }, [generatedApplication, onGenerate]);

  // Handle closing the dialog
  const handleClose = useCallback(() => {
    setPrompt('');
    setIndustry('');
    setShowAdvanced(false);
    setError(null);
    setGeneratedApplication(null);
    setConfidence(0);
    onClose();
  }, [onClose]);

  // Handle example prompt click
  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  const canGenerate = prompt.trim().length > 0 && !loading;

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
            <Typography variant="h6">Generate Application with AI</Typography>
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
            Describe the application you want to create. We'll generate the application metadata,
            a form to collect data, and a workflow to process it.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Describe your application"
            placeholder="e.g., Customer feedback application with a feedback form and automated email notifications"
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
              <FormControl size="small" fullWidth>
                <InputLabel>Industry/Domain</InputLabel>
                <Select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  label="Industry/Domain"
                  disabled={loading}
                >
                  <MenuItem value="">Any / General</MenuItem>
                  <MenuItem value="healthcare">Healthcare</MenuItem>
                  <MenuItem value="finance">Finance & Banking</MenuItem>
                  <MenuItem value="ecommerce">E-Commerce</MenuItem>
                  <MenuItem value="education">Education</MenuItem>
                  <MenuItem value="hr">Human Resources</MenuItem>
                  <MenuItem value="marketing">Marketing</MenuItem>
                  <MenuItem value="customer_service">Customer Service</MenuItem>
                  <MenuItem value="technology">Technology</MenuItem>
                  <MenuItem value="real_estate">Real Estate</MenuItem>
                </Select>
              </FormControl>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Loading state */}
        {loading && (
          <Box textAlign="center" py={4}>
            <CircularProgress size={40} sx={{ color: '#9C27B0' }} />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Generating your application...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Generated application preview */}
        {generatedApplication && !loading && (
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                Generated Application Preview
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
                    height: 6,
                    borderRadius: 3,
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

            {/* Application metadata */}
            <Box
              sx={{
                p: 2,
                bgcolor: alpha('#9C27B0', 0.05),
                borderRadius: 1,
                mb: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <AppsIcon sx={{ fontSize: 20, color: '#9C27B0' }} />
                <Typography variant="subtitle2" fontWeight={600}>
                  {generatedApplication.application.name}
                </Typography>
              </Box>
              {generatedApplication.application.description && (
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {generatedApplication.application.description}
                </Typography>
              )}
              {generatedApplication.application.tags &&
                generatedApplication.application.tags.length > 0 && (
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {generatedApplication.application.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" />
                    ))}
                  </Box>
                )}
            </Box>

            {/* Form preview */}
            {generatedApplication.form && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha('#00ED64', 0.05),
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <FormIcon sx={{ fontSize: 20, color: '#00ED64' }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {generatedApplication.form.name || 'Generated Form'}
                  </Typography>
                </Box>
                {generatedApplication.form.fieldConfigs &&
                  generatedApplication.form.fieldConfigs.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {generatedApplication.form.fieldConfigs.length} field(s) will be created
                    </Typography>
                  )}
              </Box>
            )}

            {/* Workflow preview */}
            {generatedApplication.workflow && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha('#9C27B0', 0.05),
                  borderRadius: 1,
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <WorkflowIcon sx={{ fontSize: 20, color: '#9C27B0' }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {generatedApplication.workflow.name || 'Generated Workflow'}
                  </Typography>
                </Box>
                {generatedApplication.workflow.nodes &&
                  generatedApplication.workflow.nodes.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {generatedApplication.workflow.nodes.length} node(s) will be created
                    </Typography>
                  )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        {!generatedApplication ? (
          <Button
            onClick={handleGenerate}
            variant="contained"
            disabled={!canGenerate}
            startIcon={loading ? <CircularProgress size={16} /> : <AIIcon />}
            sx={{
              bgcolor: '#9C27B0',
              textTransform: 'none',
              '&:hover': { bgcolor: '#7B1FA2' },
            }}
          >
            {loading ? 'Generating...' : 'Generate Application'}
          </Button>
        ) : (
          <Button
            onClick={handleApply}
            variant="contained"
            startIcon={<CheckIcon />}
            sx={{
              bgcolor: '#00ED64',
              textTransform: 'none',
              '&:hover': { bgcolor: '#00D955' },
            }}
          >
            Create Application
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
