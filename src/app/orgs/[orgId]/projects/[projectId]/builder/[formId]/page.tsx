'use client';

import { useParams } from 'next/navigation';
import { Box } from '@mui/material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';

export default function BuilderWithFormPage() {
  const params = useParams();
  const formId = params.formId as string;

  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppNavBar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FormBuilder initialFormId={formId} />
      </Box>
    </Box>
  );
}
