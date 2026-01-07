'use client';

import React from 'react';
import { Box, Alert } from '@mui/material';
import { useParams } from 'next/navigation';
import WorkflowEditor from '@/components/WorkflowEditor';
import { AppNavBar } from '@/components/Navigation/AppNavBar';

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.workflowId as string;
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

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
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <WorkflowEditor orgId={orgId} workflowId={workflowId} />
      </Box>
    </Box>
  );
}
