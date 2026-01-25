'use client';

import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Referral {
  referralId: string;
  status: string;
  paymentCount: number;
  attributedAt: string;
  qualifiedAt?: string;
  churnedAt?: string;
  referredOrgName: string;
}

interface ReferralsListProps {
  orgId: string;
}

const statusConfig: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'info', icon: <Schedule fontSize="small" /> },
  qualifying: { label: 'Qualifying', color: 'warning', icon: <HourglassEmpty fontSize="small" /> },
  qualified: { label: 'Qualified', color: 'success', icon: <CheckCircle fontSize="small" /> },
  active: { label: 'Active', color: 'success', icon: <CheckCircle fontSize="small" /> },
  churned: { label: 'Churned', color: 'error', icon: <Cancel fontSize="small" /> },
};

export function ReferralsList({ orgId }: ReferralsListProps) {
  const { data, isLoading } = useSWR<{ referrals: Referral[]; total: number }>(
    `/api/organizations/${orgId}/referrals`,
    fetcher
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Organization</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payments</TableCell>
              <TableCell>Attributed</TableCell>
              <TableCell>Qualified</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton width={120} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell><Skeleton width={40} /></TableCell>
                <TableCell><Skeleton width={100} /></TableCell>
                <TableCell><Skeleton width={100} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  const referrals = data?.referrals || [];

  if (referrals.length === 0) {
    return (
      <Box
        sx={{
          py: 6,
          textAlign: 'center',
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No referrals yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Share your referral code to start earning commissions
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Organization</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Payments</TableCell>
            <TableCell>Attributed</TableCell>
            <TableCell>Qualified</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {referrals.map((referral) => {
            const config = statusConfig[referral.status] || statusConfig.pending;
            return (
              <TableRow key={referral.referralId}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {referral.referredOrgName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={config.icon as React.ReactElement}
                    label={config.label}
                    color={config.color}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: referral.paymentCount >= 2 ? 600 : 400,
                      color: referral.paymentCount >= 2 ? 'success.main' : 'text.secondary',
                    }}
                  >
                    {referral.paymentCount}/2
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(referral.attributedAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {referral.qualifiedAt ? (
                    <Typography variant="body2" color="success.main">
                      {formatDate(referral.qualifiedAt)}
                    </Typography>
                  ) : referral.churnedAt ? (
                    <Typography variant="body2" color="error.main">
                      Churned {formatDate(referral.churnedAt)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
