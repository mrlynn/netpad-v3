'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Business,
  VpnKey,
  Person,
  PrivacyTip,
  Key,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';
import { OrganizationSettings } from '@/components/Settings/OrganizationSettings';
import { ConnectionVaultSettings } from '@/components/Settings/ConnectionVaultSettings';
import { ProfileSettings } from '@/components/Settings/ProfileSettings';
import { PrivacySettings } from '@/components/Settings/PrivacySettings';
import { APIKeySettings } from '@/components/Settings/APIKeySettings';
import { useRouter, useSearchParams } from 'next/navigation';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Get initial tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'organizations') setTabValue(0);
    else if (tab === 'connections') setTabValue(1);
    else if (tab === 'api-keys') setTabValue(2);
    else if (tab === 'profile') setTabValue(3);
    else if (tab === 'privacy') setTabValue(4);
  }, [searchParams]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Update URL
    const tabs = ['organizations', 'connections', 'api-keys', 'profile', 'privacy'];
    router.push(`/settings?tab=${tabs[newValue]}`, { scroll: false });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/settings');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress sx={{ color: '#00ED64' }} />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 4,
          background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Settings
      </Typography>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 56,
                px: 3,
              },
              '& .Mui-selected': {
                color: '#00ED64 !important',
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#00ED64',
              },
            }}
          >
            <Tab
              icon={<Business sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Organizations"
            />
            <Tab
              icon={<VpnKey sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Connections"
            />
            <Tab
              icon={<Key sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="API Keys"
            />
            <Tab
              icon={<Person sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Profile"
            />
            <Tab
              icon={<PrivacyTip sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Privacy"
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <OrganizationSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ConnectionVaultSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <APIKeySettings />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <ProfileSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <PrivacySettings />
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
}

export default function SettingsPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />
      <Suspense
        fallback={
          <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ color: '#00ED64' }} />
          </Container>
        }
      >
        <SettingsContent />
      </Suspense>
    </Box>
  );
}
