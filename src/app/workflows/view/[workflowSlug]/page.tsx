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
        const workflowData = data.workflow as WorkflowDocument;
        setWorkflow(workflowData);
        setError(null);
        postMessage('loaded', { workflow: workflowData });
        
        // Debug: Log workflow data
        if (process.env.NODE_ENV === 'development') {
          console.log('[Workflow Viewer] Loaded workflow:', {
            id: workflowData.id,
            name: workflowData.name,
            slug: workflowData.slug,
            nodesCount: workflowData.canvas?.nodes?.length || 0,
            edgesCount: workflowData.canvas?.edges?.length || 0,
          });
        }
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
        minHeight: isEmbedded ? '600px' : '100vh',
        height: isEmbedded ? '100%' : 'auto',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        ...(isEmbedded && {
          bgcolor: 'transparent',
        }),
      }}
    >
      {/* Header - structural bar; should sit flush with container edges */}
      {!hideHeader && (
        <Paper
          square
          elevation={0}
          sx={{
            borderRadius: 0, // Explicitly override theme for structural element
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
      <Box 
        sx={{ 
          flex: 1, 
          position: 'relative', 
          minHeight: isEmbedded ? '600px' : 0,
          height: isEmbedded ? '100%' : 'auto',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {workflow?.canvas?.nodes?.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '400px',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body1">
              This workflow has no nodes to display.
            </Typography>
          </Box>
        ) : (
          <WorkflowEditorCanvas readOnly={true} isEmbedded={isEmbedded} />
        )}
        
        {/* NetPad Branding Logo for Embedded Workflows - positioned within canvas bounds */}
        {isEmbedded && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              zIndex: 10000,
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'block',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.4)',
              padding: '4px 8px',
              borderRadius: 2,
              backdropFilter: 'blur(6px)',
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 2px 6px rgba(0, 0, 0, 0.4)' 
                : '0 2px 6px rgba(0, 0, 0, 0.15)',
              maxWidth: 'calc(100% - 24px)', // Ensure it doesn't overflow
            }}
          >
            <Box
              component="img"
              src="/logo-simple.svg"
              alt="NetPad"
              sx={{
                width: 80,
                height: 'auto',
                maxWidth: '100%',
                opacity: 0.7,
                display: 'block',
                filter: theme.palette.mode === 'dark' 
                  ? 'brightness(0) invert(1) opacity(0.6)' 
                  : 'brightness(0) opacity(0.5)',
              }}
              onError={(e) => {
                console.error('[Workflow Viewer] Logo failed to load:', e);
                (e.target as HTMLImageElement).src = '/logo-sm.svg';
              }}
              onLoad={() => {
                console.log('[Workflow Viewer] Logo loaded successfully');
              }}
            />
          </Box>
        )}
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
