'use client';

import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import WorkflowEditor from '@/components/WorkflowEditor';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { ApplicationContextBar } from '@/components/Navigation/ApplicationContextBar';
import { getOrgProjectUrl } from '@/lib/routing';

export default function WorkflowEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const workflowId = params.workflowId as string;
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const urlApplicationId = searchParams?.get('applicationId') || undefined;

  const [applicationId, setApplicationId] = useState<string | undefined>(urlApplicationId);
  const [applicationName, setApplicationName] = useState<string | undefined>(undefined);

  // Handle "new" as workflowId - redirect to workflows list page which has the create dialog
  useEffect(() => {
    if (workflowId === 'new' && orgId && projectId) {
      // Redirect to the workflows list page - the user should create via the dialog there
      const workflowsListUrl = urlApplicationId
        ? `${getOrgProjectUrl(orgId, projectId, 'workflows')}?applicationId=${urlApplicationId}&createNew=true`
        : `${getOrgProjectUrl(orgId, projectId, 'workflows')}?createNew=true`;
      router.replace(workflowsListUrl);
    }
  }, [workflowId, orgId, projectId, urlApplicationId, router]);

  // Load workflow to get applicationId if not in URL
  useEffect(() => {
    if (!urlApplicationId && orgId && workflowId && workflowId !== 'new') {
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

  // Show nothing while redirecting for "new"
  if (workflowId === 'new') {
    return null;
  }

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
