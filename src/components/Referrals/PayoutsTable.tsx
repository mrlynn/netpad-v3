'use client';

import { useState } from 'react';
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
  Button,
  Skeleton,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Pending,
  CheckCircle,
  Cancel,
  Paid,
  Add,
  AccountBalance,
} from '@mui/icons-material';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Payout {
  payoutId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  processedAt?: string;
  rejectionReason?: string;
}

interface PayoutsTableProps {
  orgId: string;
}

const statusConfig: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'warning', icon: <Pending fontSize="small" /> },
  approved: { label: 'Approved', color: 'info', icon: <CheckCircle fontSize="small" /> },
  processing: { label: 'Processing', color: 'info', icon: <Pending fontSize="small" /> },
  completed: { label: 'Completed', color: 'success', icon: <Paid fontSize="small" /> },
  rejected: { label: 'Rejected', color: 'error', icon: <Cancel fontSize="small" /> },
};

export function PayoutsTable({ orgId }: PayoutsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [method, setMethod] = useState('paypal');
  const [email, setEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: payoutsData, isLoading: payoutsLoading, mutate } = useSWR<{ payouts: Payout[] }>(
    `/api/organizations/${orgId}/referrals/payouts`,
    fetcher
  );

  const { data: statsData } = useSWR<{ stats: { availableForPayout: number } }>(
    `/api/organizations/${orgId}/referrals/stats`,
    fetcher
  );

  const availableBalance = statsData?.stats?.availableForPayout || 0;
  const minPayout = 5000; // $50 in cents

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

  const handleRequestPayout = async () => {
    setSubmitting(true);
    setError(null);

    let paymentDetails: Record<string, string> = {};
    if (method === 'paypal' || method === 'wise') {
      paymentDetails = { email };
    } else if (method === 'bank_transfer') {
      paymentDetails = { accountName, accountNumber, routingNumber };
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}/referrals/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, paymentDetails }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to request payout');
      }

      setSuccess(true);
      mutate();
      setTimeout(() => {
        setDialogOpen(false);
        setSuccess(false);
        resetForm();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request payout');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setMethod('paypal');
    setEmail('');
    setAccountName('');
    setAccountNumber('');
    setRoutingNumber('');
    setError(null);
    setSuccess(false);
  };

  const isFormValid = () => {
    if (method === 'paypal' || method === 'wise') {
      return email.includes('@');
    }
    if (method === 'bank_transfer') {
      return accountName && accountNumber && routingNumber;
    }
    return false;
  };

  const payouts = payoutsData?.payouts || [];

  return (
    <Box>
      {/* Request Payout Button */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Available Balance
          </Typography>
          <Typography variant="h5" fontWeight={700} color={availableBalance >= minPayout ? 'success.main' : 'text.primary'}>
            {formatCurrency(availableBalance)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
          disabled={availableBalance < minPayout}
        >
          Request Payout
        </Button>
      </Box>

      {availableBalance < minPayout && availableBalance > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Minimum payout amount is $50. You need {formatCurrency(minPayout - availableBalance)} more to request a payout.
        </Alert>
      )}

      {/* Payouts Table */}
      {payoutsLoading ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton width={100} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : payouts.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
            borderRadius: 2,
          }}
        >
          <AccountBalance sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No payouts yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Request a payout once you have $50 or more available
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payouts.map((payout) => {
                const config = statusConfig[payout.status] || statusConfig.pending;
                return (
                  <TableRow key={payout.payoutId}>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(payout.requestedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(payout.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {payout.method.replace('_', ' ')}
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
                      {payout.rejectionReason && (
                        <Typography variant="caption" display="block" color="error" sx={{ mt: 0.5 }}>
                          {payout.rejectionReason}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Request Payout Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Payout</DialogTitle>
        <DialogContent>
          {success ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Payout request submitted successfully! We'll process it within 5-7 business days.
            </Alert>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
                Request a payout of {formatCurrency(availableBalance)} to your preferred payment method.
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={method}
                  label="Payment Method"
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <MenuItem value="paypal">PayPal</MenuItem>
                  <MenuItem value="wise">Wise (TransferWise)</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                </Select>
              </FormControl>

              {(method === 'paypal' || method === 'wise') && (
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`Your ${method === 'paypal' ? 'PayPal' : 'Wise'} email`}
                  sx={{ mb: 2 }}
                />
              )}

              {method === 'bank_transfer' && (
                <>
                  <TextField
                    fullWidth
                    label="Account Holder Name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Routing Number"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              <Alert severity="info">
                Payouts are processed manually within 5-7 business days.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRequestPayout}
            disabled={!isFormValid() || submitting || success}
          >
            {submitting ? 'Submitting...' : `Request ${formatCurrency(availableBalance)}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
