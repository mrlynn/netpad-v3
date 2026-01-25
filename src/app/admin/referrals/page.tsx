/**
 * Admin Referrals Management
 *
 * Platform admins can manage referral codes, view all referrals,
 * and approve/reject payout requests.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  Breadcrumbs,
  Link as MuiLink,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Collapse,
  Divider,
  Slider,
} from '@mui/material';
import Link from 'next/link';
import {
  CheckCircle,
  Cancel,
  NavigateNext,
  Share,
  AttachMoney,
  Code,
  Add,
  ContentCopy,
  Search,
  PersonAdd,
  LinkOff,
  CardGiftcard,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface Payout {
  payoutId: string;
  organizationId: string;
  organizationName: string;
  amount: number;
  currency: string;
  method: string;
  paymentDetails: Record<string, string>;
  status: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface ReferralCode {
  code: string;
  organizationId: string | null;
  organizationName?: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  stats?: {
    totalReferrals: number;
    qualifiedReferrals: number;
  };
}

interface Referral {
  referralId: string;
  referrerOrgId: string;
  referrerOrgName?: string;
  referredOrgId: string;
  referredOrgName?: string;
  status: string;
  paymentCount: number;
  attributedAt: string;
  qualifiedAt?: string;
}

interface OrgSearchResult {
  orgId: string;
  name: string;
  slug: string;
  ownerEmail: string | null;
  ownerName: string | null;
  plan: string;
}

export default function AdminReferralsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);

  // Payout dialogs
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Create code dialog
  const [createCodeDialogOpen, setCreateCodeDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newCodeType, setNewCodeType] = useState<'influencer' | 'partner' | 'campaign'>('partner');
  const [selectedOrg, setSelectedOrg] = useState<OrgSearchResult | null>(null);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<OrgSearchResult[]>([]);
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);

  // Benefits configuration
  const [enableBenefits, setEnableBenefits] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [discountPayments, setDiscountPayments] = useState<number>(1);
  const [creditAmountDollars, setCreditAmountDollars] = useState<number>(0);
  const [trialExtensionDays, setTrialExtensionDays] = useState<number>(0);

  // Assign code dialog
  const [assignCodeDialogOpen, setAssignCodeDialogOpen] = useState(false);
  const [codeToAssign, setCodeToAssign] = useState<ReferralCode | null>(null);
  const [assignOrgSearchQuery, setAssignOrgSearchQuery] = useState('');
  const [assignOrgSearchResults, setAssignOrgSearchResults] = useState<OrgSearchResult[]>([]);
  const [assignOrgSearchLoading, setAssignOrgSearchLoading] = useState(false);
  const [selectedAssignOrg, setSelectedAssignOrg] = useState<OrgSearchResult | null>(null);

  const isAdmin = user?.platformRole === 'admin';

  // Fetch data
  const { data: payoutsData, mutate: mutatePayouts } = useSWR(
    isAdmin ? '/api/admin/referrals/payouts?status=pending' : null,
    fetcher
  );
  const { data: allPayoutsData, mutate: mutateAllPayouts } = useSWR(
    isAdmin ? '/api/admin/referrals/payouts' : null,
    fetcher
  );
  const { data: codesData, mutate: mutateCodes } = useSWR(
    isAdmin ? '/api/admin/referrals/codes' : null,
    fetcher
  );
  const { data: referralsData } = useSWR(
    isAdmin ? '/api/admin/referrals' : null,
    fetcher
  );

  // Debounced org search
  const searchOrgs = useCallback(async (query: string, setResults: (r: OrgSearchResult[]) => void, setLoading: (l: boolean) => void) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/organizations/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Error searching orgs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce effect for create dialog
  useEffect(() => {
    const timer = setTimeout(() => {
      searchOrgs(orgSearchQuery, setOrgSearchResults, setOrgSearchLoading);
    }, 300);
    return () => clearTimeout(timer);
  }, [orgSearchQuery, searchOrgs]);

  // Debounce effect for assign dialog
  useEffect(() => {
    const timer = setTimeout(() => {
      searchOrgs(assignOrgSearchQuery, setAssignOrgSearchResults, setAssignOrgSearchLoading);
    }, 300);
    return () => clearTimeout(timer);
  }, [assignOrgSearchQuery, searchOrgs]);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.platformRole !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <NetPadLoader size="large" message="Loading..." />
        </Container>
      </Box>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingPayouts: Payout[] = (payoutsData as { payouts?: Payout[] })?.payouts || [];
  const allPayouts: Payout[] = (allPayoutsData as { payouts?: Payout[] })?.payouts || [];
  const codes: ReferralCode[] = (codesData as { codes?: ReferralCode[] })?.codes || [];
  const referrals: Referral[] = (referralsData as { referrals?: Referral[] })?.referrals || [];

  const unassignedCodes = codes.filter(c => !c.organizationId);

  const handleApprovePayout = async () => {
    if (!selectedPayout) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/referrals/payouts/${selectedPayout.payoutId}/approve`, {
        method: 'POST',
      });
      if (response.ok) {
        mutatePayouts();
        mutateAllPayouts();
        setApproveDialogOpen(false);
        setSelectedPayout(null);
      }
    } catch (error) {
      console.error('Failed to approve payout:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout || !rejectionReason) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/referrals/payouts/${selectedPayout.payoutId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (response.ok) {
        mutatePayouts();
        mutateAllPayouts();
        setRejectDialogOpen(false);
        setSelectedPayout(null);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Failed to reject payout:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode) return;
    setProcessing(true);
    try {
      // Build benefits object if enabled
      let referredUserBenefits: Record<string, unknown> | undefined = undefined;
      if (enableBenefits) {
        const benefits: Record<string, unknown> = {};
        if (discountPercent > 0) {
          benefits.discountPercent = discountPercent / 100; // Convert to decimal
          benefits.discountPayments = discountPayments;
        }
        if (creditAmountDollars > 0) {
          benefits.creditAmountCents = creditAmountDollars * 100; // Convert to cents
        }
        if (trialExtensionDays > 0) {
          benefits.trialExtensionDays = trialExtensionDays;
        }
        // Only include if at least one benefit is set
        if (Object.keys(benefits).length > 0) {
          referredUserBenefits = benefits;
        }
      }

      const response = await fetch('/api/admin/referrals/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          type: newCodeType,
          organizationId: selectedOrg?.orgId || undefined,
          referredUserBenefits,
        }),
      });
      if (response.ok) {
        mutateCodes();
        setCreateCodeDialogOpen(false);
        setNewCode('');
        setSelectedOrg(null);
        setOrgSearchQuery('');
        // Reset benefits
        setEnableBenefits(false);
        setDiscountPercent(10);
        setDiscountPayments(1);
        setCreditAmountDollars(0);
        setTrialExtensionDays(0);
      }
    } catch (error) {
      console.error('Failed to create code:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleAssignCode = async () => {
    if (!codeToAssign || !selectedAssignOrg) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/referrals/codes/${codeToAssign.code}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedAssignOrg.orgId,
        }),
      });
      if (response.ok) {
        mutateCodes();
        setAssignCodeDialogOpen(false);
        setCodeToAssign(null);
        setSelectedAssignOrg(null);
        setAssignOrgSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to assign code:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'completed': return 'success';
      case 'rejected': return 'error';
      case 'qualified': return 'success';
      case 'qualifying': return 'info';
      case 'churned': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 3 }}>
          <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
            Admin
          </MuiLink>
          <Typography color="text.primary">Referrals</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Referral Management
          </Typography>
          <Typography color="text.secondary">
            Manage referral codes, view all referrals, and process payout requests.
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Pending Payouts
                </Typography>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {pendingPayouts.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Active Codes
                </Typography>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {codes.filter(c => c.isActive).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Unassigned Codes
                </Typography>
                <Typography variant="h4" fontWeight={700} color="info.main">
                  {unassignedCodes.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Qualified Referrals
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {referrals.filter(r => r.status === 'qualified').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
                '& .Mui-selected': { color: '#00ED64 !important' },
                '& .MuiTabs-indicator': { bgcolor: '#00ED64' },
              }}
            >
              <Tab
                icon={<AttachMoney sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label={`Pending Payouts (${pendingPayouts.length})`}
              />
              <Tab
                icon={<Share sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="All Referrals"
              />
              <Tab
                icon={<Code sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Referral Codes"
              />
            </Tabs>
          </Box>

          {/* Pending Payouts Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ px: 3 }}>
              {pendingPayouts.length === 0 ? (
                <Alert severity="info">No pending payout requests.</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Organization</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Requested</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingPayouts.map((payout) => (
                        <TableRow key={payout.payoutId}>
                          <TableCell>
                            <Typography fontWeight={500}>{payout.organizationName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {payout.organizationId}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600} color="success.main">
                              {formatCurrency(payout.amount, payout.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={payout.method} size="small" />
                          </TableCell>
                          <TableCell>{formatDate(payout.requestedAt)}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Approve">
                              <IconButton
                                color="success"
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  setApproveDialogOpen(true);
                                }}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                color="error"
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>

          {/* All Referrals Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ px: 3 }}>
              {referrals.length === 0 ? (
                <Alert severity="info">No referrals yet.</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Referrer</TableCell>
                        <TableCell>Referred Org</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Payments</TableCell>
                        <TableCell>Attributed</TableCell>
                        <TableCell>Qualified</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {referrals.map((referral) => (
                        <TableRow key={referral.referralId}>
                          <TableCell>
                            <Typography fontWeight={500}>
                              {referral.referrerOrgName || referral.referrerOrgId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {referral.referredOrgName || referral.referredOrgId}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={referral.status}
                              size="small"
                              color={getStatusColor(referral.status) as any}
                            />
                          </TableCell>
                          <TableCell align="right">{referral.paymentCount}</TableCell>
                          <TableCell>{formatDate(referral.attributedAt)}</TableCell>
                          <TableCell>
                            {referral.qualifiedAt ? formatDate(referral.qualifiedAt) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>

          {/* Referral Codes Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ px: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateCodeDialogOpen(true)}
                  sx={{ bgcolor: '#00ED64', '&:hover': { bgcolor: '#00C853' } }}
                >
                  Create Code
                </Button>
              </Box>

              {/* Unassigned Codes Section */}
              {unassignedCodes.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Unassigned Codes
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    These codes are not assigned to any organization. Assign them to users/organizations as needed.
                  </Alert>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unassignedCodes.map((code) => (
                          <TableRow key={code.code}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography fontWeight={600} fontFamily="monospace">
                                  {code.code}
                                </Typography>
                                <Tooltip title="Copy">
                                  <IconButton
                                    size="small"
                                    onClick={() => navigator.clipboard.writeText(code.code)}
                                  >
                                    <ContentCopy fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={code.type} size="small" color="primary" />
                            </TableCell>
                            <TableCell>{formatDate(code.createdAt)}</TableCell>
                            <TableCell align="center">
                              <Tooltip title="Assign to Organization">
                                <IconButton
                                  color="primary"
                                  onClick={() => {
                                    setCodeToAssign(code);
                                    setAssignCodeDialogOpen(true);
                                  }}
                                >
                                  <PersonAdd />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* All Codes Section */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                All Codes
              </Typography>
              {codes.length === 0 ? (
                <Alert severity="info">No referral codes yet.</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Referrals</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {codes.map((code) => (
                        <TableRow key={code.code}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography fontWeight={600} fontFamily="monospace">
                                {code.code}
                              </Typography>
                              <Tooltip title="Copy">
                                <IconButton
                                  size="small"
                                  onClick={() => navigator.clipboard.writeText(code.code)}
                                >
                                  <ContentCopy fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {code.organizationName || code.organizationId || (
                              <Chip
                                label="Unassigned"
                                size="small"
                                icon={<LinkOff sx={{ fontSize: 14 }} />}
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={code.type}
                              size="small"
                              color={code.type === 'standard' ? 'default' : 'primary'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={code.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              color={code.isActive ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {code.stats?.totalReferrals || 0}
                          </TableCell>
                          <TableCell>{formatDate(code.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>
        </Paper>

        {/* Approve Dialog */}
        <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
          <DialogTitle>Approve Payout</DialogTitle>
          <DialogContent>
            {selectedPayout && (
              <Box sx={{ pt: 1 }}>
                <Typography gutterBottom>
                  Approve payout of{' '}
                  <strong>{formatCurrency(selectedPayout.amount, selectedPayout.currency)}</strong>{' '}
                  to <strong>{selectedPayout.organizationName}</strong>?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Payment method: {selectedPayout.method}
                </Typography>
                {selectedPayout.paymentDetails && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Payment Details:
                    </Typography>
                    {Object.entries(selectedPayout.paymentDetails).map(([key, value]) => (
                      <Typography key={key} variant="body2">
                        {key}: {value}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleApprovePayout}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
          <DialogTitle>Reject Payout</DialogTitle>
          <DialogContent>
            {selectedPayout && (
              <Box sx={{ pt: 1 }}>
                <Typography gutterBottom>
                  Reject payout of{' '}
                  <strong>{formatCurrency(selectedPayout.amount, selectedPayout.currency)}</strong>{' '}
                  to <strong>{selectedPayout.organizationName}</strong>?
                </Typography>
                <TextField
                  fullWidth
                  label="Rejection Reason"
                  multiline
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  sx={{ mt: 2 }}
                  required
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleRejectPayout}
              disabled={processing || !rejectionReason}
            >
              {processing ? 'Processing...' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Code Dialog */}
        <Dialog
          open={createCodeDialogOpen}
          onClose={() => {
            setCreateCodeDialogOpen(false);
            setSelectedOrg(null);
            setOrgSearchQuery('');
            setNewCode('');
            setEnableBenefits(false);
            setDiscountPercent(10);
            setDiscountPayments(1);
            setCreditAmountDollars(0);
            setTrialExtensionDays(0);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create Referral Code</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                label="Code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g., PARTNER2025"
                helperText="4-20 alphanumeric characters. Will be uppercased."
              />

              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newCodeType}
                  label="Type"
                  onChange={(e) => setNewCodeType(e.target.value as any)}
                >
                  <MenuItem value="partner">
                    <Box>
                      <Typography>Partner</Typography>
                      <Typography variant="caption" color="text.secondary">
                        30% / 25% / 20% / 15% commission rates
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="influencer">
                    <Box>
                      <Typography>Influencer</Typography>
                      <Typography variant="caption" color="text.secondary">
                        25% / 20% / 15% / 10% commission rates
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="campaign">
                    <Box>
                      <Typography>Campaign</Typography>
                      <Typography variant="caption" color="text.secondary">
                        20% / 15% / 10% / 10% commission rates
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* User Benefits Section */}
              <Box>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableBenefits}
                      onChange={(e) => setEnableBenefits(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CardGiftcard fontSize="small" />
                      <Typography>Add benefits for referred users</Typography>
                    </Box>
                  }
                />
                <Collapse in={enableBenefits}>
                  <Box sx={{ mt: 2, pl: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      These benefits are given to users who sign up using this code.
                    </Alert>

                    {/* Discount Percentage */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Discount on First Payments
                      </Typography>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={8}>
                          <Slider
                            value={discountPercent}
                            onChange={(_, value) => setDiscountPercent(value as number)}
                            min={0}
                            max={100}
                            step={5}
                            marks={[
                              { value: 0, label: '0%' },
                              { value: 25, label: '25%' },
                              { value: 50, label: '50%' },
                              { value: 100, label: '100%' },
                            ]}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(v) => `${v}%`}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            size="small"
                            type="number"
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                          />
                        </Grid>
                      </Grid>
                      {discountPercent > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Apply to first
                          </Typography>
                          <TextField
                            size="small"
                            type="number"
                            value={discountPayments}
                            onChange={(e) => setDiscountPayments(Math.max(1, parseInt(e.target.value) || 1))}
                            sx={{ width: 80, mx: 1 }}
                            inputProps={{ min: 1, max: 12 }}
                          />
                          <Typography variant="body2" color="text.secondary" component="span">
                            payment(s)
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Credit Amount */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Account Credit
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={creditAmountDollars}
                        onChange={(e) => setCreditAmountDollars(Math.max(0, parseFloat(e.target.value) || 0))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        helperText="Flat credit applied to the new user's account"
                        sx={{ width: 150 }}
                      />
                    </Box>

                    {/* Trial Extension */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Trial Extension
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={trialExtensionDays}
                        onChange={(e) => setTrialExtensionDays(Math.max(0, parseInt(e.target.value) || 0))}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">days</InputAdornment>,
                        }}
                        helperText="Additional days added to the standard trial period"
                        sx={{ width: 150 }}
                      />
                    </Box>

                    {/* Summary */}
                    {(discountPercent > 0 || creditAmountDollars > 0 || trialExtensionDays > 0) && (
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.50' }}>
                        <Typography variant="subtitle2" gutterBottom color="success.main">
                          Benefit Summary
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {discountPercent > 0 && (
                            <li>
                              <Typography variant="body2">
                                {discountPercent}% off first {discountPayments} payment{discountPayments > 1 ? 's' : ''}
                              </Typography>
                            </li>
                          )}
                          {creditAmountDollars > 0 && (
                            <li>
                              <Typography variant="body2">
                                ${creditAmountDollars.toFixed(2)} account credit
                              </Typography>
                            </li>
                          )}
                          {trialExtensionDays > 0 && (
                            <li>
                              <Typography variant="body2">
                                +{trialExtensionDays} extra trial days
                              </Typography>
                            </li>
                          )}
                        </Box>
                      </Paper>
                    )}
                  </Box>
                </Collapse>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Assign to Organization (optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Search by organization name, slug, or owner email. Leave empty to create an unassigned code.
                </Typography>

                {selectedOrg ? (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography fontWeight={600}>{selectedOrg.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedOrg.ownerEmail || selectedOrg.slug}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        onClick={() => setSelectedOrg(null)}
                        color="error"
                      >
                        Remove
                      </Button>
                    </Box>
                  </Paper>
                ) : (
                  <Autocomplete
                    freeSolo
                    options={orgSearchResults}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.name
                    }
                    inputValue={orgSearchQuery}
                    onInputChange={(_, value) => setOrgSearchQuery(value)}
                    onChange={(_, value) => {
                      if (value && typeof value !== 'string') {
                        setSelectedOrg(value);
                        setOrgSearchQuery('');
                      }
                    }}
                    loading={orgSearchLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search organizations..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <>
                              {orgSearchLoading && <CircularProgress size={20} />}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.orgId}>
                        <Box>
                          <Typography fontWeight={500}>{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.ownerEmail || option.slug} • {option.plan}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    noOptionsText={
                      orgSearchQuery.length < 2
                        ? 'Type at least 2 characters to search'
                        : 'No organizations found'
                    }
                  />
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setCreateCodeDialogOpen(false);
                setSelectedOrg(null);
                setOrgSearchQuery('');
                setNewCode('');
                setEnableBenefits(false);
                setDiscountPercent(10);
                setDiscountPayments(1);
                setCreditAmountDollars(0);
                setTrialExtensionDays(0);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateCode}
              disabled={processing || !newCode}
              sx={{ bgcolor: '#00ED64', '&:hover': { bgcolor: '#00C853' } }}
            >
              {processing ? 'Creating...' : selectedOrg ? 'Create & Assign' : 'Create Unassigned'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Code Dialog */}
        <Dialog
          open={assignCodeDialogOpen}
          onClose={() => {
            setAssignCodeDialogOpen(false);
            setCodeToAssign(null);
            setSelectedAssignOrg(null);
            setAssignOrgSearchQuery('');
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Assign Code to Organization</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {codeToAssign && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Code to Assign
                  </Typography>
                  <Typography variant="h6" fontFamily="monospace" fontWeight={700}>
                    {codeToAssign.code}
                  </Typography>
                  <Chip label={codeToAssign.type} size="small" color="primary" sx={{ mt: 1 }} />
                </Paper>
              )}

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Search Organization
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Search by organization name, slug, or owner email.
                </Typography>

                {selectedAssignOrg ? (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography fontWeight={600}>{selectedAssignOrg.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedAssignOrg.ownerEmail || selectedAssignOrg.slug}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        onClick={() => setSelectedAssignOrg(null)}
                        color="error"
                      >
                        Remove
                      </Button>
                    </Box>
                  </Paper>
                ) : (
                  <Autocomplete
                    freeSolo
                    options={assignOrgSearchResults}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.name
                    }
                    inputValue={assignOrgSearchQuery}
                    onInputChange={(_, value) => setAssignOrgSearchQuery(value)}
                    onChange={(_, value) => {
                      if (value && typeof value !== 'string') {
                        setSelectedAssignOrg(value);
                        setAssignOrgSearchQuery('');
                      }
                    }}
                    loading={assignOrgSearchLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search organizations..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <>
                              {assignOrgSearchLoading && <CircularProgress size={20} />}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.orgId}>
                        <Box>
                          <Typography fontWeight={500}>{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.ownerEmail || option.slug} • {option.plan}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    noOptionsText={
                      assignOrgSearchQuery.length < 2
                        ? 'Type at least 2 characters to search'
                        : 'No organizations found'
                    }
                  />
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setAssignCodeDialogOpen(false);
                setCodeToAssign(null);
                setSelectedAssignOrg(null);
                setAssignOrgSearchQuery('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAssignCode}
              disabled={processing || !selectedAssignOrg}
              sx={{ bgcolor: '#00ED64', '&:hover': { bgcolor: '#00C853' } }}
            >
              {processing ? 'Assigning...' : 'Assign Code'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
