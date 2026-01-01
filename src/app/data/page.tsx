'use client';

import { Box, CircularProgress } from '@mui/material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { DataBrowser } from '@/components/DataBrowser/DataBrowser';
import { WelcomeScreen, OnboardingWizard, WelcomeModal } from '@/components/Onboarding';
import { useRequireOrganization, useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWelcomeModal } from '@/hooks/useWelcomeModal';

export default function DataPage() {
  const { isAuthenticated } = useAuth();
  const { isLoading, needsOrg } = useRequireOrganization();
  const { refreshOrganizations } = useOrganization();
  const { showWelcome, dismissWelcome } = useWelcomeModal();

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      </Box>
    );
  }

  // Show welcome screen if user is not authenticated
  if (!isAuthenticated && needsOrg) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppNavBar />
        <WelcomeScreen />
      </Box>
    );
  }

  // Show onboarding wizard if authenticated user needs to create an org
  if (needsOrg) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Box sx={{ flex: 1 }}>
          {/* Show welcome modal for first-time users */}
          <WelcomeModal open={showWelcome} onContinue={dismissWelcome} />
          <OnboardingWizard onComplete={refreshOrganizations} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppNavBar />
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <DataBrowser />
      </Box>
    </Box>
  );
}
