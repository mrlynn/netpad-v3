'use client';

import { useParams } from 'next/navigation';
import { Box } from '@mui/material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { DataPageTabs } from '@/components/DataBrowser/DataPageTabs';

export default function DataPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppNavBar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DataPageTabs />
      </Box>
    </Box>
  );
}
