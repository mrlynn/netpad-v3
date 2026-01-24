'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  AccountTree,
  CloudQueue,
} from '@mui/icons-material';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DataExplorerTab } from './DataExplorerTab';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentOrgId } = useOrganization();
  const { status: clusterStatus } = useClusterProvisioning(currentOrgId || undefined);
  const [tabValue, setTabValue] = useState(0);

  // Get initial tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'explorer') setTabValue(0);
    else if (tab === 'infrastructure') setTabValue(1);
    // Legacy: redirect old browse/connections tab to explorer
    else if (tab === 'browse' || tab === 'connections') {
      setTabValue(0);
      router.replace(`${pathname}?tab=explorer`, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Update URL while preserving the current path (supports both /data and /orgs/.../data)
    const tabs = ['explorer', 'infrastructure'];
    router.push(`${pathname}?tab=${tabs[newValue]}`, { scroll: false });
  };

  // Check if cluster is provisioning (for badge)
  const isProvisioning = clusterStatus?.status && [
    'pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'
  ].includes(clusterStatus.status);

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
            icon={<AccountTree sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Explorer"
            id="data-tab-0"
            aria-controls="data-tabpanel-0"
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
            id="data-tab-1"
            aria-controls="data-tabpanel-1"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <DataExplorerTab onNeedConnection={() => setTabValue(1)} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
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
          <NetPadLoader size="large" variant="ascii" message="Loading..." />
        </Box>
      }
    >
      <DataPageTabsContent />
    </Suspense>
  );
}
