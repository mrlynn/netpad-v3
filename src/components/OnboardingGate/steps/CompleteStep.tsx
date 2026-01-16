'use client';

/**
 * Complete Step
 *
 * Success celebration and call-to-action after onboarding is complete
 */

import {
  Box,
  Typography,
  Button,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Rocket,
  Description,
  AccountTree,
  Storage,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useOnboardingGate } from '@/contexts/OnboardingGateContext';
import { useOrganization } from '@/contexts/OrganizationContext';

export function CompleteStep() {
  const router = useRouter();
  const { completeOnboarding, status } = useOnboardingGate();
  const { organization } = useOrganization();

  const orgId = status?.organization?.orgId || organization?.orgId;
  const projectId = status?.project?.projectId;

  const handleStartBuilding = () => {
    completeOnboarding();
    // Navigate to forms/builder
    if (orgId && projectId) {
      router.push(`/orgs/${orgId}/projects/${projectId}/forms`);
    } else {
      router.push('/');
    }
  };

  const handleGoToForms = () => {
    completeOnboarding();
    if (orgId && projectId) {
      router.push(`/orgs/${orgId}/projects/${projectId}/builder`);
    }
  };

  const handleGoToWorkflows = () => {
    completeOnboarding();
    if (orgId && projectId) {
      router.push(`/orgs/${orgId}/projects/${projectId}/workflows`);
    }
  };

  const handleGoToData = () => {
    completeOnboarding();
    if (orgId && projectId) {
      router.push(`/orgs/${orgId}/projects/${projectId}/data`);
    }
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      {/* Success Icon */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha('#00ED64', 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
        }}
      >
        <CheckCircle sx={{ fontSize: 48, color: '#00ED64' }} />
      </Box>

      {/* Success Message */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Your workspace is ready!
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        You're all set up and ready to start building amazing things.
      </Typography>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}
        >
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Description />}
            onClick={handleGoToForms}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: '#00ED64',
                bgcolor: alpha('#00ED64', 0.05),
              },
            }}
          >
            Create Form
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AccountTree />}
            onClick={handleGoToWorkflows}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: '#9C27B0',
                bgcolor: alpha('#9C27B0', 0.05),
              },
            }}
          >
            Create Workflow
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Storage />}
            onClick={handleGoToData}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: '#2196F3',
                bgcolor: alpha('#2196F3', 0.05),
              },
            }}
          >
            Explore Data
          </Button>
        </Box>
      </Box>

      {/* Primary CTA */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={handleStartBuilding}
        startIcon={<Rocket />}
        sx={{
          bgcolor: '#00ED64',
          color: '#001E2B',
          fontWeight: 600,
          '&:hover': { bgcolor: '#00c853' },
        }}
      >
        Start Building
      </Button>
    </Box>
  );
}
