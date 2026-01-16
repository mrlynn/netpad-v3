/**
 * Compact AI input component for generating MongoDB queries/pipelines from natural language
 * Designed to fit in the narrow workflow editor panel
 * Now includes workflow context awareness for smarter suggestions
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Collapse,
  Paper,
  Button,
  CircularProgress,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useWorkflowEditor } from '@/contexts/WorkflowContext';
import { WorkflowNode } from '@/types/workflow';

/**
 * Simplified context for AI to understand upstream data
 */
interface WorkflowContextForAI {
  upstreamNodes: Array<{
    id: string;
    type: string;
    label: string;
    outputFields: string[];
  }>;
  triggerInfo?: {
    type: string;
    label: string;
    availableFields: string[];
  };
}

/**
 * Get available output fields for a node type
 */
function getNodeOutputFields(node: WorkflowNode): string[] {
  const prefix = `{{nodes.${node.id}`;
  switch (node.type) {
    case 'form-trigger':
      return [
        `${prefix}.data}}`,
        `${prefix}.data.<fieldName>}}`,
        `${prefix}.submittedAt}}`,
        `${prefix}.formId}}`,
        `${prefix}.respondent.email}}`,
      ];
    case 'webhook-trigger':
      return [
        `${prefix}.body}}`,
        `${prefix}.headers}}`,
        `${prefix}.query}}`,
        `${prefix}.method}}`,
      ];
    case 'http-request':
      return [
        `${prefix}.data}}`,
        `${prefix}.status}}`,
        `${prefix}.ok}}`,
        `${prefix}.headers}}`,
      ];
    case 'mongodb-query':
      return [
        `${prefix}.documents}}`,
        `${prefix}.document}}`,
        `${prefix}.count}}`,
      ];
    case 'mongodb-write':
      return [
        `${prefix}.insertedId}}`,
        `${prefix}.modifiedCount}}`,
      ];
    case 'transform':
      return [`${prefix}.result}}`];
    case 'conditional':
      return [`${prefix}.result}}`, `${prefix}.branch}}`];
    default:
      return [`${prefix}.output}}`];
  }
}

/**
 * Find all upstream nodes connected before a given node
 */
function getUpstreamNodes(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: Array<{ source: string; target: string }>
): WorkflowNode[] {
  const upstream: WorkflowNode[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const incomingEdges = edges.filter((e) => e.target === currentId);
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        upstream.push(sourceNode);
        traverse(sourceNode.id);
      }
    }
  }

  traverse(nodeId);
  return upstream;
}

interface AIQueryInputProps {
  onGenerate: (result: Record<string, unknown>, explanation?: string) => void;
  apiEndpoint: '/api/generate-filter' | '/api/generate-pipeline';
  placeholder: string;
  buttonLabel: string;
  disabled?: boolean;
  collectionName?: string;
  existingQuery?: Record<string, unknown>;
  nodeId: string;
}

export function AIQueryInput({
  onGenerate,
  apiEndpoint,
  placeholder,
  buttonLabel,
  disabled = false,
  collectionName,
  existingQuery,
  nodeId,
}: AIQueryInputProps) {
  const theme = useTheme();
  const { nodes, edges } = useWorkflowEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    result: Record<string, unknown>;
    explanation?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build workflow context for AI
  const workflowContext = useMemo((): WorkflowContextForAI => {
    const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges);

    // Find trigger node
    const triggerNode = upstreamNodes.find((n) => n.type.includes('trigger'));

    return {
      upstreamNodes: upstreamNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label || node.type,
        outputFields: getNodeOutputFields(node),
      })),
      triggerInfo: triggerNode
        ? {
            type: triggerNode.type,
            label: triggerNode.label || triggerNode.type,
            availableFields: getNodeOutputFields(triggerNode),
          }
        : undefined,
    };
  }, [nodeId, nodes, edges]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          collectionName,
          existingFilter: existingQuery,
          existingPipeline: Array.isArray(existingQuery) ? existingQuery : undefined,
          workflowContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate query');
      }

      const data = await response.json();
      const result = data.filter || data.stages;

      if (result) {
        setPreview({
          result: Array.isArray(result) ? result : result,
          explanation: data.explanation,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate query';
      setError(errorMessage);
      console.error('Error generating query:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (preview) {
      onGenerate(preview.result, preview.explanation);
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setError(null);
    setPreview(null);
  };

  if (disabled) {
    return null;
  }

  return (
    <Box sx={{ mb: 1.5 }}>
      {/* Toggle button */}
      <Collapse in={!isOpen}>
        <Button
          startIcon={<AIIcon />}
          onClick={() => setIsOpen(true)}
          size="small"
          variant="text"
          sx={{
            color: theme.palette.mode === 'dark' ? '#00ED64' : '#00684A',
            textTransform: 'none',
            fontSize: '0.8rem',
            py: 0.5,
            '&:hover': {
              bgcolor: alpha(theme.palette.mode === 'dark' ? '#00ED64' : '#00684A', 0.1),
            },
          }}
        >
          {buttonLabel}
        </Button>
      </Collapse>

      {/* Expanded input */}
      <Collapse in={isOpen}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderColor: alpha(theme.palette.mode === 'dark' ? '#00ED64' : '#00684A', 0.3),
            bgcolor: alpha(theme.palette.mode === 'dark' ? '#00ED64' : '#00684A', 0.03),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <AIIcon sx={{ fontSize: 16, color: theme.palette.mode === 'dark' ? '#00ED64' : '#00684A' }} />
            <Typography variant="caption" sx={{ fontWeight: 500, flex: 1 }}>
              Describe your query in plain English
            </Typography>
            <IconButton size="small" onClick={handleClose} sx={{ p: 0.25 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              rows={2}
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              disabled={isGenerating}
              sx={{
                mb: 1,
                '& .MuiInputBase-input': {
                  fontSize: '0.8rem',
                },
              }}
            />

            {error && (
              <Chip
                label={error}
                color="error"
                size="small"
                onDelete={() => setError(null)}
                sx={{ mb: 1, width: '100%', justifyContent: 'flex-start', fontSize: '0.7rem' }}
              />
            )}

            {/* Preview */}
            {preview && (
              <Box sx={{ mb: 1 }}>
                {preview.explanation && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}
                  >
                    {preview.explanation}
                  </Typography>
                )}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    bgcolor: 'background.default',
                    maxHeight: 120,
                    overflow: 'auto',
                  }}
                >
                  <Typography
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      m: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {JSON.stringify(preview.result, null, 2)}
                  </Typography>
                </Paper>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
              {preview ? (
                <>
                  <Button
                    size="small"
                    onClick={() => setPreview(null)}
                    sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                  >
                    Try Again
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                    onClick={handleApply}
                    sx={{
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      bgcolor: theme.palette.mode === 'dark' ? '#00ED64' : '#00684A',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? '#00C853' : '#005A3D',
                      },
                    }}
                  >
                    Apply
                  </Button>
                </>
              ) : (
                <IconButton
                  type="submit"
                  disabled={!query.trim() || isGenerating}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.mode === 'dark' ? '#00ED64' : '#00684A', 0.1),
                    color: theme.palette.mode === 'dark' ? '#00ED64' : '#00684A',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.mode === 'dark' ? '#00ED64' : '#00684A', 0.2),
                    },
                    '&:disabled': {
                      bgcolor: alpha(theme.palette.mode === 'dark' ? '#00ED64' : '#00684A', 0.05),
                    },
                  }}
                >
                  {isGenerating ? (
                    <CircularProgress size={16} sx={{ color: 'inherit' }} />
                  ) : (
                    <SendIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              )}
            </Box>
          </form>
        </Paper>
      </Collapse>
    </Box>
  );
}
