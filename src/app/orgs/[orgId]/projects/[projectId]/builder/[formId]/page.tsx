'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Box } from '@mui/material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { ApplicationContextBar } from '@/components/Navigation/ApplicationContextBar';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';

export default function BuilderWithFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.formId as string;
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const applicationId = searchParams?.get('applicationId') || undefined;

  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppNavBar />
      {applicationId && (
        <ApplicationContextBar
          applicationId={applicationId}
          orgId={orgId}
          projectId={projectId}
          compact
        />
      )}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FormBuilder 
          initialFormId={formId}
          organizationId={orgId}
          projectId={projectId}
          applicationId={applicationId}
        />
      </Box>
    </Box>
  );
}
