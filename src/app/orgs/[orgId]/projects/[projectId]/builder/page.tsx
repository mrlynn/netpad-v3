'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Box } from '@mui/material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';

export default function BuilderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const formId = searchParams.get('formId') || undefined;

  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppNavBar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FormBuilder 
          initialFormId={formId}
          organizationId={orgId}
          projectId={projectId}
        />
      </Box>
    </Box>
  );
}
