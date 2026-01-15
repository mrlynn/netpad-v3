'use client';

import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { useParams, useSearchParams } from 'next/navigation';
import WorkflowEditor from '@/components/WorkflowEditor';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { ApplicationContextBar } from '@/components/Navigation/ApplicationContextBar';

export default function WorkflowEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workflowId = params.workflowId as string;
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const urlApplicationId = searchParams?.get('applicationId') || undefined;
  
  const [applicationId, setApplicationId] = useState<string | undefined>(urlApplicationId);
  const [applicationName, setApplicationName] = useState<string | undefined>(undefined);

  // Load workflow to get applicationId if not in URL
  useEffect(() => {
    if (!urlApplicationId && orgId && workflowId) {
      const loadWorkflow = async () => {
        try {
          const response = await fetch(`/api/workflows/${workflowId}?orgId=${orgId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.workflow?.applicationId) {
              setApplicationId(data.workflow.applicationId);
            }
          }
        } catch (error) {
          console.error('[WorkflowEditorPage] Failed to load workflow:', error);
        }
      };
      loadWorkflow();
    }
  }, [urlApplicationId, orgId, workflowId]);

  if (!orgId || !projectId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Box sx={{ p: 4 }}>
          <Alert severity="warning">
            Invalid organization or project context.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppNavBar />
      {applicationId && (
        <ApplicationContextBar
          applicationId={applicationId}
          applicationName={applicationName}
          orgId={orgId}
          projectId={projectId}
          compact
        />
      )}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <WorkflowEditor orgId={orgId} workflowId={workflowId} />
      </Box>
    </Box>
  );
}
