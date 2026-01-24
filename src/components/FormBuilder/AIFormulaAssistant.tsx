/**
 * AI Formula Assistant Component
 *
 * Inline component for generating formulas from natural language.
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Collapse,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  AutoAwesome as AIIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  HelpOutline as HelpIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { useAIFormula } from '@/hooks/useAI';

// ============================================
// Types
// ============================================

interface AIFormulaAssistantProps {
  /** Currently available fields that can be referenced in formulas */
  availableFields: Array<{
    path: string;
    label: string;
    type: string;
  }>;
  /** Expected output type of the formula */
  outputType?: 'string' | 'number' | 'boolean';
  /** Callback when a formula is generated and user wants to use it */
  onApply: (formula: string, dependencies: string[]) => void;
  /** Compact mode for inline use */
  compact?: boolean;
}

// ============================================
// Example Prompts
// ============================================

const EXAMPLE_PROMPTS = [
  'Calculate the total including 8% tax',
  'Concatenate first name and last name with a space',
  'Show "High Priority" if score is above 80, otherwise "Normal"',
  'Calculate the discount: 10% off if quantity > 10',
  'Format the date as month/day/year',
];

// ============================================
// Component
// ============================================

export default function AIFormulaAssistant({
  availableFields,
  outputType,
  onApply,
  compact = false,
}: AIFormulaAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: result,
    loading,
    error,
    generateFormula,
    explainFormula,
    reset,
  } = useAIFormula();

  // Handle formula generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    await generateFormula(prompt, availableFields, outputType);
  }, [prompt, availableFields, outputType, generateFormula]);

  // Handle applying the formula
  const handleApply = useCallback(() => {
    if (result?.formula) {
      onApply(result.formula, result.dependencies || []);
      reset();
      setPrompt('');
    }
  }, [result, onApply, reset]);

  // Handle copying formula to clipboard
  const handleCopy = useCallback(() => {
    if (result?.formula) {
      navigator.clipboard.writeText(result.formula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  // Handle example click
  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
    setShowExamples(false);
  }, []);

  if (compact) {
    return (
      <Box>
        {/* Compact input */}
        <Box display="flex" gap={1} alignItems="flex-start">
          <TextField
            fullWidth
            size="small"
            placeholder="Describe the formula in plain language..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            {loading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <AIIcon />}
          </Button>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        {/* Result */}
        {result?.formula && (
          <Paper variant="outlined" sx={{ mt: 1, p: 1.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary">
                Generated Formula:
              </Typography>
              <Box>
                <Tooltip title={copied ? 'Copied!' : 'Copy formula'}>
                  <IconButton size="small" onClick={handleCopy}>
                    {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Typography
              variant="body2"
              fontFamily="monospace"
              sx={{ backgroundColor: 'action.hover', p: 1, borderRadius: 1 }}
            >
              {result.formula}
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <Button size="small" onClick={reset}>
                Reset
              </Button>
              <Button size="small" variant="contained" onClick={handleApply}>
                Use Formula
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <AIIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2">AI Formula Assistant</Typography>
      </Box>

      {/* Input section */}
      <TextField
        fullWidth
        multiline
        rows={2}
        size="small"
        placeholder="Describe what calculation you need in plain language..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
        sx={{ mb: 1 }}
      />

      {/* Example toggle */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button
          size="small"
          startIcon={showExamples ? <CollapseIcon /> : <ExpandIcon />}
          onClick={() => setShowExamples(!showExamples)}
        >
          {showExamples ? 'Hide' : 'Show'} Examples
        </Button>

        <Button
          variant="contained"
          size="small"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          startIcon={loading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <AIIcon />}
        >
          Generate
        </Button>
      </Box>

      {/* Examples */}
      <Collapse in={showExamples}>
        <Box mb={2}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Click an example to try it:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {EXAMPLE_PROMPTS.map((example, index) => (
              <Chip
                key={index}
                label={example}
                size="small"
                variant="outlined"
                onClick={() => handleExampleClick(example)}
                disabled={loading}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      </Collapse>

      {/* Available fields reference */}
      <Box mb={2}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          Available fields you can reference:
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {availableFields.slice(0, 8).map((field) => (
            <Chip
              key={field.path}
              label={`${field.label} (${field.type})`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
          {availableFields.length > 8 && (
            <Chip
              label={`+${availableFields.length - 8} more`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Result display */}
      {result?.formula && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            backgroundColor: 'success.main',
            color: 'success.contrastText',
            '& .MuiTypography-root': { color: 'inherit' },
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="subtitle2">Generated Formula</Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton size="small" onClick={handleCopy} sx={{ color: 'inherit' }}>
                {copied ? <CheckIcon /> : <CopyIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          <Typography
            variant="body2"
            fontFamily="monospace"
            sx={{
              backgroundColor: 'rgba(0,0,0,0.2)',
              p: 1.5,
              borderRadius: 1,
              overflowX: 'auto',
            }}
          >
            {result.formula}
          </Typography>

          {/* Explanation */}
          {result.explanation && (
            <Box mt={2}>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                <HelpIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                {result.explanation}
              </Typography>
            </Box>
          )}

          {/* Dependencies */}
          {result.dependencies && result.dependencies.length > 0 && (
            <Box mt={1}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Uses fields: {result.dependencies.join(', ')}
              </Typography>
            </Box>
          )}

          {/* Sample calculations */}
          {result.samples && result.samples.length > 0 && (
            <Box mt={2}>
              <Button
                size="small"
                onClick={() => setShowSamples(!showSamples)}
                sx={{ color: 'inherit', borderColor: 'inherit' }}
                variant="outlined"
                startIcon={showSamples ? <CollapseIcon /> : <ExpandIcon />}
              >
                {showSamples ? 'Hide' : 'Show'} Sample Calculations
              </Button>
              <Collapse in={showSamples}>
                <List dense sx={{ mt: 1 }}>
                  {result.samples.map((sample, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={`Result: ${JSON.stringify(sample.result)}`}
                        secondary={`Inputs: ${JSON.stringify(sample.inputs)}`}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontFamily: 'monospace',
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          sx: { color: 'rgba(255,255,255,0.7)' },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          )}

          {/* Action buttons */}
          <Box display="flex" gap={1} mt={2}>
            <Button
              size="small"
              variant="outlined"
              onClick={reset}
              sx={{ color: 'inherit', borderColor: 'inherit' }}
            >
              Try Again
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleApply}
              sx={{
                backgroundColor: 'common.white',
                color: 'success.main',
                '&:hover': {
                  backgroundColor: 'grey.100',
                },
              }}
            >
              Use This Formula
            </Button>
          </Box>
        </Paper>
      )}
    </Paper>
  );
}
