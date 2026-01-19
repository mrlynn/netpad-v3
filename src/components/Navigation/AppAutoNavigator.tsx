'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import { Apps, RocketLaunch } from '@mui/icons-material';
import { useAutoNavigateToApp } from '@/hooks/useAutoNavigateToApp';
import { ApplicationSwitcher } from './ApplicationSwitcher';
import { useApplicationSafe } from '@/contexts/ApplicationContext';
import { NetPadLoader } from '@/components/common/NetPadLoader';

/**
 * Component that handles auto-navigation for authenticated users
 *
 * Shows:
 * - Loading state while determining where to navigate
 * - App switcher if user has multiple apps and no recent selection
 * - Nothing if auto-navigating
 */
interface AppAutoNavigatorProps {
  /** Content to show while resolving (optional - shows default loading state) */
  loadingContent?: React.ReactNode;
  /** Whether to show the app switcher modal automatically */
  showSwitcherOnMultipleApps?: boolean;
  /** Callback when navigation happens */
  onNavigate?: (path: string) => void;
}

export function AppAutoNavigator({
  loadingContent,
  showSwitcherOnMultipleApps = true,
  onNavigate,
}: AppAutoNavigatorProps) {
  const { isNavigating, isResolving, shouldShowAppSelection, navigateToLastApp } =
    useAutoNavigateToApp({ onNavigate });
  const applicationContext = useApplicationSafe();
  const applications = applicationContext?.applications ?? [];
  const hasApplications = applicationContext?.hasApplications ?? false;
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Show loading while resolving
  if (isResolving || isNavigating) {
    if (loadingContent) {
      return <>{loadingContent}</>;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          gap: 2,
        }}
      >
        <NetPadLoader size="small" message={isNavigating ? 'Navigating to your application...' : 'Loading...'} />
      </Box>
    );
  }

  // Show app selection prompt if user has multiple apps and no recent
  if (shouldShowAppSelection && showSwitcherOnMultipleApps) {
    return (
      <>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            px: 3,
            textAlign: 'center',
            gap: 3,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha('#00ED64', 0.1),
            }}
          >
            <Apps sx={{ fontSize: 40, color: '#00ED64' }} />
          </Box>

          <Box>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Welcome back!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
              You have {applications.length} applications. Choose one to get started.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={() => setSwitcherOpen(true)}
            startIcon={<RocketLaunch />}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.9),
              },
            }}
          >
            Open App Switcher
          </Button>

          <Typography variant="caption" color="text.secondary">
            Press <kbd style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}>⌘K</kbd> anytime to switch apps
          </Typography>
        </Box>

        <ApplicationSwitcher
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
        />
      </>
    );
  }

  // Show create app prompt if user has no applications
  if (!hasApplications) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          px: 3,
          textAlign: 'center',
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha('#00ED64', 0.1),
          }}
        >
          <RocketLaunch sx={{ fontSize: 40, color: '#00ED64' }} />
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Create Your First Application
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
            Applications organize your forms, workflows, and data. Get started by creating one.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Nothing to show - navigation is handling it or user is already in an app
  return null;
}

export default AppAutoNavigator;
