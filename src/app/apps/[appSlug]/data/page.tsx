'use client';

import { Box } from '@mui/material';
import { DataPageTabs } from '@/components/DataBrowser/DataPageTabs';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';

/**
 * /apps/[appSlug]/data
 *
 * App-centric data explorer page. Embeds the full data browser within the app context.
 * The PersistentApplicationBar from the layout provides navigation context.
 */
export default function AppDataPage() {
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  if (isAppLoading || !currentApplication) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <NetPadLoader size="large" variant="ascii" />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DataPageTabs />
    </Box>
  );
}
