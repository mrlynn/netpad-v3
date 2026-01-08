'use client';

/**
 * Public Workflow Viewer Page
 * 
 * This page displays a read-only view of a workflow for documentation/embedding purposes.
 * 
 * Query Parameters:
 * - embedded: true - Marks as embedded for special handling
 * - theme: light | dark | auto - Theme selection
 * - hideHeader: true - Hide header
 * - hideBranding: true - Hide NetPad branding
 * - metadata: true - Include metadata (stats, variables, etc.)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import { ReactFlowProvider } from 'reactflow';
import { WorkflowEditorCanvas } from '@/components/WorkflowEditor/WorkflowEditorCanvas';
import { WorkflowProvider, useWorkflowStore } from '@/contexts/WorkflowContext';
import { WorkflowDocument } from '@/types/workflow';

/**
 * Send message to parent window if embedded
 */
function usePostMessage(executionId: string, isEmbedded: boolean) {
  const postMessage = useCallback((type: string, payload?: any) => {
    if (!isEmbedded || typeof window === 'undefined') return;

    try {
      window.parent.postMessage({
        source: 'netpad-workflow-viewer',
        workflowSlug: executionId,
        type,
        payload,
      }, '*');
    } catch (e) {
      // Ignore if postMessage fails
    }
  }, [isEmbedded, executionId]);

  return postMessage;
}

function WorkflowViewerInner({ workflowSlug }: { workflowSlug: string }) {
  const searchParams = useSearchParams();
  const theme = useTheme();
  const { setWorkflow } = useWorkflowStore();
  
  const hideHeader = searchParams.get('hideHeader') === 'true';
  const hideBranding = searchParams.get('hideBranding') === 'true';
  const embedTheme = searchParams.get('theme') as 'light' | 'dark' | 'auto' | null;
  const isEmbedded = searchParams.get('embedded') === 'true';
  const includeMetadata = searchParams.get('metadata') === 'true';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workflow = useWorkflowStore((state) => state.workflow);

  const postMessage = usePostMessage(workflowSlug, isEmbedded);

  /**
   * Fetch workflow data and load into store
   */
  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const url = `/api/workflows/public/${workflowSlug}${includeMetadata ? '?metadata=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load workflow');
        }

        if (!data.workflow) {
          throw new Error('Workflow data not found in response');
        }

        // Load workflow into store
        setWorkflow(data.workflow as WorkflowDocument);
        setError(null);
        postMessage('loaded', { workflow: data.workflow });
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load workflow';
        setError(errorMessage);
        postMessage('error', { error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [workflowSlug, includeMetadata, setWorkflow, postMessage]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            {error}
          </Typography>
          {error.includes('not available for public viewing') && (
            <Typography variant="body2" color="text.secondary">
              To enable public viewing, go to the workflow settings and enable "Allow public viewing (read-only)" in the Embed tab.
            </Typography>
          )}
        </Alert>
      </Box>
    );
  }

  if (!workflow) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            Workflow not found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This workflow may not exist or public viewing may not be enabled. Check the workflow settings to enable public viewing.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        ...(isEmbedded && {
          minHeight: 'auto',
          bgcolor: 'transparent',
        }),
      }}
    >
      {/* Header */}
      {!hideHeader && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box>
            <Typography variant="h6">{workflow.name}</Typography>
            {workflow.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {workflow.description}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* Workflow Canvas */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <WorkflowEditorCanvas readOnly={true} isEmbedded={isEmbedded} />
      </Box>

      {/* Branding */}
      {!hideBranding && (
        <Box
          sx={{
            p: 1,
            textAlign: 'center',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Powered by{' '}
            <a
              href="https://www.netpad.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              NetPad
            </a>
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function PublicWorkflowViewerPage() {
  const params = useParams();
  const workflowSlug = params.workflowSlug as string;

  // Wrap in WorkflowProvider to provide context for the canvas
  return (
    <WorkflowProvider>
      <ReactFlowProvider>
        <WorkflowViewerInner workflowSlug={workflowSlug} />
      </ReactFlowProvider>
    </WorkflowProvider>
  );
}
