'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Cloud as SlackIcon } from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';

function SlackInstallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizationId = searchParams.get('organizationId') || organization?.orgId;

  const handleInstall = async () => {
    if (!organizationId) {
      setError('Organization ID required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Redirect to OAuth flow
      const oauthUrl = `/api/integrations/slack/oauth?organizationId=${organizationId}`;
      window.location.href = oauthUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate installation');
      setLoading(false);
    }
  };

  if (!organizationId) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error">
          Organization ID required. Please log in or provide organizationId parameter.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <SlackIcon sx={{ fontSize: 64, color: '#4A154B', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom>
            Install Slack Integration
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Connect your Slack workspace to NetPad. This will allow you to:
          </Typography>

          <Box sx={{ textAlign: 'left', mb: 4 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Send form submission notifications to Slack channels
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Trigger workflows from Slack messages
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Upload files and data to Slack
            </Typography>
            <Typography variant="body2">
              • Receive alerts and updates in real-time
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleInstall}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SlackIcon />}
            sx={{
              bgcolor: '#4A154B',
              '&:hover': { bgcolor: '#5a1a5b' },
              px: 4,
              py: 1.5,
            }}
          >
            {loading ? 'Connecting...' : 'Add to Slack'}
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            By installing, you authorize NetPad to access your Slack workspace.
            You can revoke access at any time in your Slack app settings.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function SlackInstallPage() {
  return (
    <Suspense fallback={
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    }>
      <SlackInstallContent />
    </Suspense>
  );
}
