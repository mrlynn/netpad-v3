/**
 * Generic AI configuration assistant component
 * Can be embedded in any node config field to provide AI assistance
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
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  AutoAwesome as AIIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useWorkflowEditor } from '@/contexts/WorkflowContext';
import { WorkflowNode } from '@/types/workflow';
import { WorkflowContextForAI } from '@/lib/ai/types/nodeConfig';

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
    case 'ai-prompt':
    case 'ai-classify':
    case 'ai-extract':
      return [`${prefix}.result}}`, `${prefix}.usage}}`];
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

interface AIConfigAssistantProps {
  nodeId: string;
  nodeType: string;
  fieldKey: string;
  currentConfig: Record<string, unknown>;
  currentFieldValue?: unknown;
  onApply: (value: unknown) => void;
  promptHint?: string;
  buttonLabel?: string;
  disabled?: boolean;
}

export function AIConfigAssistant({
  nodeId,
  nodeType,
  fieldKey,
  currentConfig,
  currentFieldValue,
  onApply,
  promptHint = 'Describe what you need...',
  buttonLabel = 'Generate with AI',
  disabled = false,
}: AIConfigAssistantProps) {
  const theme = useTheme();
  const { nodes, edges } = useWorkflowEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    result: unknown;
    explanation?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build workflow context for AI
  const workflowContext = useMemo((): WorkflowContextForAI => {
    const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges);
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
      const response = await fetch('/api/ai/node-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeType,
          fieldKey,
          userQuery: query.trim(),
          currentConfig,
          currentFieldValue,
          workflowContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate configuration');
      }

      const data = await response.json();

      if (data.result !== undefined) {
        setPreview({
          result: data.result,
          explanation: data.explanation,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate';
      setError(errorMessage);
      console.error('Error generating config:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (preview) {
      onApply(preview.result);
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

  // Use MongoDB green for consistency with existing AI buttons
  const accentColor = theme.palette.mode === 'dark' ? '#00ED64' : '#00684A';

  return (
    <Box sx={{ mb: 1 }}>
      {/* Toggle button */}
      <Collapse in={!isOpen}>
        <Button
          startIcon={<AIIcon />}
          onClick={() => setIsOpen(true)}
          size="small"
          variant="text"
          sx={{
            color: accentColor,
            textTransform: 'none',
            fontSize: '0.8rem',
            py: 0.5,
            '&:hover': {
              bgcolor: alpha(accentColor, 0.1),
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
            borderColor: alpha(accentColor, 0.3),
            bgcolor: alpha(accentColor, 0.03),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <AIIcon sx={{ fontSize: 16, color: accentColor }} />
            <Typography variant="caption" sx={{ fontWeight: 500, flex: 1 }}>
              Describe what you need
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
              placeholder={promptHint}
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
                    {typeof preview.result === 'string'
                      ? preview.result
                      : JSON.stringify(preview.result, null, 2)}
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
                      bgcolor: accentColor,
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
                    bgcolor: alpha(accentColor, 0.1),
                    color: accentColor,
                    '&:hover': {
                      bgcolor: alpha(accentColor, 0.2),
                    },
                    '&:disabled': {
                      bgcolor: alpha(accentColor, 0.05),
                    },
                  }}
                >
                  {isGenerating ? (
                    <NetPadLoader size="small" variant="svg" showPhrases={false} />
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
