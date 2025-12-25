'use client';

import { Box } from '@mui/material';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';

interface FormBuilderViewProps {
  initialFormId?: string;
}

export function FormBuilderView({ initialFormId }: FormBuilderViewProps) {
  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <FormBuilder initialFormId={initialFormId} />
    </Box>
  );
}

