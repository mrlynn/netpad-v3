'use client';

import { useParams } from 'next/navigation';
import { Box, Container, Typography, alpha, useTheme } from '@mui/material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { ConnectionVaultSettings } from '@/components/Settings/ConnectionVaultSettings';

export default function ConnectionsPage() {
  const params = useParams();
  const theme = useTheme();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />

      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.5),
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ py: { xs: 2, sm: 3 } }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: 'text.primary',
                fontSize: { xs: '1.75rem', sm: '2.125rem' },
              }}
            >
              Connections
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
            >
              Manage MongoDB connection strings for this project
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <ConnectionVaultSettings organizationId={orgId} projectId={projectId} />
      </Container>
    </Box>
  );
}
