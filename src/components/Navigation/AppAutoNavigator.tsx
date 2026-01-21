'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, alpha, Divider } from '@mui/material';
import { Apps, RocketLaunch, Store, Description } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
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
            gap: 2,
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

          {/* Quick links to explore */}
          <Divider sx={{ width: '100%', maxWidth: 300, my: 2, borderColor: alpha('#fff', 0.1) }} />
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Button
              component={Link}
              href="/templates"
              startIcon={<Description sx={{ fontSize: 18 }} />}
              size="small"
              sx={{
                color: alpha('#fff', 0.6),
                textTransform: 'none',
                '&:hover': { color: '#00ED64', bgcolor: 'transparent' },
              }}
            >
              Browse Templates
            </Button>
            <Button
              component={Link}
              href="/marketplace"
              startIcon={<Store sx={{ fontSize: 18 }} />}
              size="small"
              sx={{
                color: alpha('#fff', 0.6),
                textTransform: 'none',
                '&:hover': { color: '#00ED64', bgcolor: 'transparent' },
              }}
            >
              Marketplace
            </Button>
          </Box>
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
            Applications organize your forms, workflows, and data. Get started by creating one or exploring our templates.
          </Typography>
        </Box>

        {/* Quick links to explore */}
        <Divider sx={{ width: '100%', maxWidth: 300, my: 1, borderColor: alpha('#fff', 0.1) }} />
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Button
            component={Link}
            href="/templates"
            startIcon={<Description sx={{ fontSize: 18 }} />}
            size="small"
            sx={{
              color: alpha('#fff', 0.6),
              textTransform: 'none',
              '&:hover': { color: '#00ED64', bgcolor: 'transparent' },
            }}
          >
            Browse Templates
          </Button>
          <Button
            component={Link}
            href="/marketplace"
            startIcon={<Store sx={{ fontSize: 18 }} />}
            size="small"
            sx={{
              color: alpha('#fff', 0.6),
              textTransform: 'none',
              '&:hover': { color: '#00ED64', bgcolor: 'transparent' },
            }}
          >
            Marketplace
          </Button>
        </Box>
      </Box>
    );
  }

  // User has applications but auto-navigation didn't happen
  // Show a "Continue to your app" prompt with quick navigation
  if (hasApplications && applications.length > 0) {
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
            gap: 1,
          }}
        >
          <Image
            src="/netpad-builder.png"
            alt="NetPad Builder"
            width={300}
            height={300}
            style={{ objectFit: 'contain', marginBottom: -8 }}
          />

          <Box>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Welcome back!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
              Continue to your application or switch to a different one.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigateToLastApp()}
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
              Continue to App
            </Button>
            {applications.length > 1 && (
              <Button
                variant="outlined"
                size="large"
                onClick={() => setSwitcherOpen(true)}
                sx={{
                  borderColor: alpha('#00ED64', 0.5),
                  color: '#00ED64',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.1),
                  },
                }}
              >
                Switch App
              </Button>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary">
            Press <kbd style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}>⌘K</kbd> anytime to switch apps
          </Typography>

          {/* Quick links to explore */}
          <Divider sx={{ width: '100%', maxWidth: 300, my: 2, borderColor: alpha('#fff', 0.1) }} />
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Button
              component={Link}
              href="/templates"
              startIcon={<Description sx={{ fontSize: 18 }} />}
              size="small"
              sx={{
                color: alpha('#fff', 0.6),
                textTransform: 'none',
                '&:hover': { color: '#00ED64', bgcolor: 'transparent' },
              }}
            >
              Browse Templates
            </Button>
            <Button
              component={Link}
              href="/marketplace"
              startIcon={<Store sx={{ fontSize: 18 }} />}
              size="small"
              sx={{
                color: alpha('#fff', 0.6),
                textTransform: 'none',
                '&:hover': { color: '#00ED64', bgcolor: 'transparent' },
              }}
            >
              Marketplace
            </Button>
          </Box>
        </Box>

        <ApplicationSwitcher
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
        />
      </>
    );
  }

  // Fallback - shouldn't reach here, but just in case
  return null;
}

export default AppAutoNavigator;
