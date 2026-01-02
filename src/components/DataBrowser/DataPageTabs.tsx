'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Tabs,
  Tab,
  alpha,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  TableChart,
  VpnKey,
  CloudQueue,
} from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataBrowser } from './DataBrowser';
import { DataConnectionsTab } from './DataConnectionsTab';
import { DataInfrastructureTab } from './DataInfrastructureTab';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useClusterProvisioning } from '@/hooks/useClusterProvisioning';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`data-tabpanel-${index}`}
      aria-labelledby={`data-tab-${index}`}
      sx={{ height: '100%', overflow: 'hidden' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%', overflow: 'auto' }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

function DataPageTabsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrgId } = useOrganization();
  const { status: clusterStatus } = useClusterProvisioning(currentOrgId || undefined);
  const [tabValue, setTabValue] = useState(0);

  // Get initial tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'browse') setTabValue(0);
    else if (tab === 'connections') setTabValue(1);
    else if (tab === 'infrastructure') setTabValue(2);
  }, [searchParams]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Update URL
    const tabs = ['browse', 'connections', 'infrastructure'];
    router.push(`/data?tab=${tabs[newValue]}`, { scroll: false });
  };

  // Check if cluster is provisioning (for badge)
  const isProvisioning = clusterStatus?.status && [
    'pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'
  ].includes(clusterStatus.status);

  // Handler for switching to Browse tab after connecting
  const handleSwitchToBrowse = () => {
    setTabValue(0);
    router.push('/data?tab=browse', { scroll: false });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Header */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          px: 2,
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="data page tabs"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
            },
            '& .Mui-selected': {
              color: '#00ED64',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#00ED64',
            },
          }}
        >
          <Tab
            icon={<TableChart sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Browse"
            id="data-tab-0"
            aria-controls="data-tabpanel-0"
          />
          <Tab
            icon={<VpnKey sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Connections"
            id="data-tab-1"
            aria-controls="data-tabpanel-1"
          />
          <Tab
            icon={
              isProvisioning ? (
                <Badge
                  variant="dot"
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: '#2196f3',
                      animation: 'pulse 1.5s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                        '100%': { opacity: 1 },
                      },
                    },
                  }}
                >
                  <CloudQueue sx={{ fontSize: 18 }} />
                </Badge>
              ) : (
                <CloudQueue sx={{ fontSize: 18 }} />
              )
            }
            iconPosition="start"
            label="Infrastructure"
            id="data-tab-2"
            aria-controls="data-tabpanel-2"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <DataBrowser showConnectionPanel={false} onNeedConnection={() => setTabValue(1)} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <DataConnectionsTab onConnectAndBrowse={handleSwitchToBrowse} />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <DataInfrastructureTab />
        </TabPanel>
      </Box>
    </Box>
  );
}

export function DataPageTabs() {
  return (
    <Suspense
      fallback={
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      }
    >
      <DataPageTabsContent />
    </Suspense>
  );
}
