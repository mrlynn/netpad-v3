'use client';

import { Box } from '@mui/material';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * /apps/[appSlug]/forms/new
 *
 * App-centric new form page. Opens the form builder for creating a new form.
 */
export default function AppNewFormPage() {
  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  const applicationId = currentApplication?.applicationId;
  const projectId = currentApplication?.projectId;

  if (isAppLoading || !currentApplication || !currentOrgId || !projectId) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader size="large" message="Loading application..." />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FormBuilder
        organizationId={currentOrgId}
        projectId={projectId}
        applicationId={applicationId}
      />
    </Box>
  );
}
