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
  Pending,
  CheckCircle,
  Paid,
  Schedule,
} from '@mui/icons-material';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Earning {
  earningId: string;
  amount: number;
  status: string;
  earnedAt: string;
  referredOrgName?: string;
}

interface EarningsResponse {
  earnings: Earning[];
  total: number;
  availableBalance: {
    amount: number;
    currency: string;
  };
}

interface EarningsTableProps {
  orgId: string;
}

const statusConfig: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'info'; icon: React.ReactNode }> = {
  pending: { label: 'Hold', color: 'warning', icon: <Schedule fontSize="small" /> },
  available: { label: 'Available', color: 'success', icon: <CheckCircle fontSize="small" /> },
  requested: { label: 'Requested', color: 'info', icon: <Pending fontSize="small" /> },
  paid: { label: 'Paid', color: 'default', icon: <Paid fontSize="small" /> },
};

export function EarningsTable({ orgId }: EarningsTableProps) {
  const { data, isLoading } = useSWR<EarningsResponse>(
    `/api/organizations/${orgId}/referrals/earnings`,
    fetcher
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

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
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton width={100} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  const earnings = data?.earnings || [];
  const availableBalance = data?.availableBalance;

  return (
    <Box>
      {/* Available Balance Banner */}
      {availableBalance && availableBalance.amount > 0 && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
            border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="body2" color="success.main">
              Available for Payout
            </Typography>
            <Typography variant="h5" fontWeight={700} color="success.main">
              {formatCurrency(availableBalance.amount)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Go to the Payouts tab to request a withdrawal
          </Typography>
        </Box>
      )}

      {earnings.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No earnings yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You'll start earning commissions once your referrals make 2+ payments
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {earnings.map((earning) => {
                const config = statusConfig[earning.status] || statusConfig.pending;
                return (
                  <TableRow key={earning.earningId}>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(earning.earnedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(earning.amount)}
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
