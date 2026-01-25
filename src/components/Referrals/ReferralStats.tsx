'use client';

import {
  Box,
  Paper,
  Typography,
  Grid,
  Skeleton,
  alpha,
} from '@mui/material';
import {
  People,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  TrendingUp,
  AccountBalance,
  Pending,
  Paid,
} from '@mui/icons-material';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ReferralStatsData {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  churnedReferrals: number;
  totalEarnings: number;
  availableForPayout: number;
  pendingEarnings: number;
  paidOut: number;
}

interface ReferralStatsProps {
  orgId: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 1.5,
            bgcolor: alpha(color, 0.1),
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function StatCardSkeleton() {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Skeleton variant="rounded" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width={80} height={20} />
          <Skeleton width={60} height={32} />
        </Box>
      </Box>
    </Paper>
  );
}

export function ReferralStats({ orgId }: ReferralStatsProps) {
  const { data, isLoading } = useSWR<{ stats: ReferralStatsData }>(
    `/api/organizations/${orgId}/referrals/stats`,
    fetcher
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <StatCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  const stats = data?.stats;

  if (!stats) {
    return null;
  }

  return (
    <Grid container spacing={2}>
      {/* Referral Stats */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Referrals"
          value={stats.totalReferrals}
          icon={<People />}
          color="#2196f3"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Qualified"
          value={stats.qualifiedReferrals}
          subtitle="2+ payments made"
          icon={<CheckCircle />}
          color="#4caf50"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Pending"
          value={stats.pendingReferrals}
          subtitle="Awaiting qualification"
          icon={<HourglassEmpty />}
          color="#ff9800"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Churned"
          value={stats.churnedReferrals}
          icon={<Cancel />}
          color="#f44336"
        />
      </Grid>

      {/* Earnings Stats */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Earnings"
          value={formatCurrency(stats.totalEarnings)}
          subtitle="All time"
          icon={<TrendingUp />}
          color="#9c27b0"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Available"
          value={formatCurrency(stats.availableForPayout)}
          subtitle="Ready for payout"
          icon={<AccountBalance />}
          color="#00bcd4"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Pending"
          value={formatCurrency(stats.pendingEarnings)}
          subtitle="In hold period"
          icon={<Pending />}
          color="#ff9800"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Paid Out"
          value={formatCurrency(stats.paidOut)}
          subtitle="Total withdrawn"
          icon={<Paid />}
          color="#4caf50"
        />
      </Grid>
    </Grid>
  );
}
