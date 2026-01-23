'use client';

import { useParams } from 'next/navigation';
import { Box } from '@mui/material';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * /apps/[appSlug]/forms/[formId]/edit
 *
 * App-centric form editor page. Opens the form builder for editing an existing form.
 */
export default function AppFormEditPage() {
  const params = useParams();
  const formId = params.formId as string;

  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  const applicationId = currentApplication?.applicationId;
  const projectId = currentApplication?.projectId;

  if (isAppLoading || !currentApplication || !currentOrgId || !projectId) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader fullPage variant="ascii" />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FormBuilder
        initialFormId={formId}
        organizationId={currentOrgId}
        projectId={projectId}
        applicationId={applicationId}
      />
    </Box>
  );
}
