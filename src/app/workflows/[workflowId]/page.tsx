'use client';

import React from 'react';
import { Box, Alert } from '@mui/material';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import WorkflowEditor from '@/components/WorkflowEditor';
import { AppNavBar } from '@/components/Navigation/AppNavBar';

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.workflowId as string;
  const { organization } = useOrganization();

  if (!organization || !organization.orgId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Box sx={{ p: 4 }}>
          <Alert severity="warning">
            Please select an organization to edit workflows.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppNavBar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <WorkflowEditor orgId={organization.orgId} workflowId={workflowId} />
      </Box>
    </Box>
  );
}
