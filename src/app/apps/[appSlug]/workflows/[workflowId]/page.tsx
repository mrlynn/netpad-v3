'use client';

import React, { useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import WorkflowEditor from '@/components/WorkflowEditor';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { getAppUrl } from '@/lib/routing';

/**
 * /apps/[appSlug]/workflows/[workflowId]
 *
 * App-centric workflow editor page. Loads the workflow editor for a specific workflow
 * within the current application context.
 */
export default function AppWorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.workflowId as string;
  const appSlug = params.appSlug as string;

  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  // Handle "new" as workflowId - redirect to workflows list page which has the create dialog
  useEffect(() => {
    if (workflowId === 'new' && appSlug) {
      // Redirect to the workflows list page - the user should create via the dialog there
      router.replace(`${getAppUrl(appSlug, 'workflows')}?createNew=true`);
    }
  }, [workflowId, appSlug, router]);

  // Show nothing while redirecting for "new"
  if (workflowId === 'new') {
    return null;
  }

  if (isAppLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader fullPage variant="ascii" />
      </Box>
    );
  }

  if (!currentOrgId || !currentApplication) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          Invalid organization or application context.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <WorkflowEditor orgId={currentOrgId} workflowId={workflowId} />
    </Box>
  );
}
