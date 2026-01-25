'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  alpha,
  Alert,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Share,
  TrendingUp,
  Payments,
} from '@mui/icons-material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { ReferralCodeCard } from './ReferralCodeCard';
import { ReferralStats } from './ReferralStats';
import { ReferralsList } from './ReferralsList';
import { EarningsTable } from './EarningsTable';
import { PayoutsTable } from './PayoutsTable';
import { useExtensionFeature } from '@/lib/extensions/hooks';

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
      id={`referral-tabpanel-${index}`}
      aria-labelledby={`referral-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface Organization {
  orgId: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export function ReferralDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(true);

  const { available: hasReferralProgram } = useExtensionFeature('referral_program');

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data.organizations || []);
          // Select the first organization by default
          if (data.organizations?.length > 0) {
            setSelectedOrg(data.organizations[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
      } finally {
        setOrgsLoading(false);
      }
    };
    fetchOrganizations();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Show loading while fetching orgs
  if (orgsLoading) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <NetPadLoader />
      </Box>
    );
  }

  // Show message if referral program is not available
  if (!hasReferralProgram) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="info">
          The referral program is only available in NetPad Cloud.
        </Alert>
      </Box>
    );
  }

  // Show message if no org
  if (!selectedOrg) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="info">
          You need to be part of an organization to access the referral program.
        </Alert>
      </Box>
    );
  }

  const orgId = selectedOrg.orgId;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Referral Program
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Share NetPad with others and earn commissions on their subscriptions.
          </Typography>
        </Box>

        {/* Organization Selector (if multiple orgs) */}
        {organizations.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="org-select-label">Organization</InputLabel>
            <Select
              labelId="org-select-label"
              value={selectedOrg.orgId}
              label="Organization"
              onChange={(e) => {
                const org = organizations.find(o => o.orgId === e.target.value);
                if (org) setSelectedOrg(org);
              }}
            >
              {organizations.map((org) => (
                <MenuItem key={org.orgId} value={org.orgId}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Referral Code Card */}
      <Box sx={{ mb: 4 }}>
        <ReferralCodeCard orgId={orgId} />
      </Box>

      {/* Stats Overview */}
      <Box sx={{ mb: 4 }}>
        <ReferralStats orgId={orgId} />
      </Box>

      {/* Tabs */}
      <Paper
        sx={{
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
          borderRadius: 2,
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="referral tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<Share sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Referrals"
              sx={{ minHeight: 56 }}
            />
            <Tab
              icon={<TrendingUp sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Earnings"
              sx={{ minHeight: 56 }}
            />
            <Tab
              icon={<Payments sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Payouts"
              sx={{ minHeight: 56 }}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <ReferralsList orgId={orgId} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <EarningsTable orgId={orgId} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <PayoutsTable orgId={orgId} />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
