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
  Alert,
} from '@mui/material';
import {
  Business,
  VpnKey,
  Person,
  PrivacyTip,
  Key,
  Extension,
  CreditCard,
  Cloud,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';
import { OrganizationSettings } from '@/components/Settings/OrganizationSettings';
import { ConnectionVaultSettings } from '@/components/Settings/ConnectionVaultSettings';
import { ProfileSettings } from '@/components/Settings/ProfileSettings';
import { PrivacySettings } from '@/components/Settings/PrivacySettings';
import { APIKeySettings } from '@/components/Settings/APIKeySettings';
import { IntegrationCredentialsSettings } from '@/components/Settings/IntegrationCredentialsSettings';
import { BillingSettings } from '@/components/Settings/BillingSettings';
import { DeployToVercelButton } from '@/components/Deploy';
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
    else if (tab === 'integrations') setTabValue(2);
    else if (tab === 'api-keys') setTabValue(3);
    else if (tab === 'billing') setTabValue(4);
    else if (tab === 'profile') setTabValue(5);
    else if (tab === 'privacy') setTabValue(6);
  }, [searchParams]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Update URL
    const tabs = ['organizations', 'connections', 'integrations', 'api-keys', 'billing', 'profile', 'privacy'];
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Settings
        </Typography>
        <DeployToVercelButton variant="outlined" size="small" />
      </Box>

      {/* Self-hosting banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          bgcolor: alpha('#000', 0.02),
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Cloud sx={{ color: 'text.secondary' }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Self-host NetPad
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Deploy your own instance with your existing database configuration
            </Typography>
          </Box>
        </Box>
        <DeployToVercelButton variant="contained" size="small" />
      </Paper>

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
              icon={<Extension sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Integrations"
            />
            <Tab
              icon={<Key sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="API Keys"
            />
            <Tab
              icon={<CreditCard sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Billing"
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
            <IntegrationCredentialsSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <APIKeySettings />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <BillingSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={5}>
            <ProfileSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={6}>
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
