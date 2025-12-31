'use client';

import { Box, CircularProgress, Typography, alpha, Button, Paper } from '@mui/material';
import { Business } from '@mui/icons-material';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';
import { OnboardingWizard, WelcomeScreen } from '@/components/Onboarding';
import { useRequireOrganization, useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

interface FormBuilderViewProps {
  initialFormId?: string;
}

export function FormBuilderView({ initialFormId }: FormBuilderViewProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading, needsOrg, needsSelection } = useRequireOrganization();
  const { refreshOrganizations, organizations, selectOrganization } = useOrganization();

  // Show loading state while checking org status
  if (isLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: '#00ED64' }} />
        <Typography variant="body2" color="text.secondary">
          Loading your workspace...
        </Typography>
      </Box>
    );
  }

  // Show welcome screen if user is not authenticated
  if (!isAuthenticated && needsOrg) {
    return <WelcomeScreen />;
  }

  // Show onboarding wizard if authenticated user needs to create an org
  if (needsOrg) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: alpha('#00ED64', 0.02),
        }}
      >
        <OnboardingWizard onComplete={refreshOrganizations} />
      </Box>
    );
  }

  // Show org selector if user has orgs but none selected
  if (needsSelection && organizations.length > 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxWidth: 400,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <Business sx={{ fontSize: 48, color: '#00ED64', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Select a Workspace
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which workspace you want to work in
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {organizations.map((org) => (
              <Button
                key={org.orgId}
                variant="outlined"
                onClick={() => selectOrganization(org.orgId)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.05),
                  },
                }}
              >
                {org.name}
              </Button>
            ))}
          </Box>
        </Paper>
      </Box>
    );
  }

  // Normal form builder
  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <FormBuilder initialFormId={initialFormId} />
    </Box>
  );
}

