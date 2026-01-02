/**
 * BillingSettings Component
 *
 * Subscription management UI for viewing plan, usage, and upgrading.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
} from '@mui/material';
import {
  CreditCard,
  Zap,
  Crown,
  Check,
  TrendingUp,
  ExternalLink,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  useSubscription,
  useAllUsageLimits,
  getTierDisplayName,
  getTierColor,
} from '@/hooks/useFeatureGate';
import { UsageLimitIndicator } from '@/components/common/FeatureGate';
import {
  SubscriptionTier,
  BillingInterval,
  SUBSCRIPTION_TIERS,
  TIER_PRICING,
} from '@/types/platform';

// ============================================
// Types
// ============================================

interface Organization {
  orgId: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

interface PlanCardProps {
  tier: SubscriptionTier;
  currentTier: SubscriptionTier;
  interval: BillingInterval;
  onSelect: (tier: SubscriptionTier) => void;
  loading?: boolean;
}

// ============================================
// Main Component
// ============================================

export function BillingSettings() {
  const theme = useTheme();

  // Fetch user's organizations
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(true);

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

  // Show loading while fetching orgs
  if (orgsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show message if no org
  if (!selectedOrg) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="info">
          No organization found. Please create an organization first in the Organizations tab.
        </Alert>
      </Box>
    );
  }

  // Render the billing content with the selected org
  return (
    <BillingSettingsContent
      orgId={selectedOrg.orgId}
      orgName={selectedOrg.name}
    />
  );
}

// Inner component that only renders when we have a valid orgId
function BillingSettingsContent({ orgId, orgName }: { orgId: string; orgName: string }) {
  const theme = useTheme();
  const { tier, loading: subscriptionLoading, usage, refresh } = useSubscription(orgId);
  const { limits, loading: usageLoading, refresh: refreshUsage } = useAllUsageLimits(orgId);

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('pro');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [seatCount, setSeatCount] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle checkout
  const handleUpgrade = useCallback(async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          tier: selectedTier,
          interval: billingInterval,
          seatCount: selectedTier === 'team' ? seatCount : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setActionLoading(false);
    }
  }, [orgId, selectedTier, billingInterval, seatCount]);

  // Handle portal redirect
  const handleManageBilling = useCallback(async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      // Redirect to Stripe portal
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    } finally {
      setActionLoading(false);
    }
  }, [orgId]);

  // Handle cancellation
  const handleCancel = useCallback(async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setSuccess('Subscription will be canceled at the end of your billing period');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  }, [orgId, refresh]);

  if (subscriptionLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Current Plan */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: alpha(getTierColor(tier), 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown size={24} color={getTierColor(tier)} />
            </Box>
            <Box>
              <Typography variant="h6">
                {getTierDisplayName(tier)} Plan
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {orgName}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {tier !== 'free' && (
              <Button
                variant="outlined"
                onClick={handleManageBilling}
                disabled={actionLoading}
                startIcon={<CreditCard size={16} />}
              >
                Manage Billing
              </Button>
            )}
            {tier === 'free' && (
              <Button
                variant="contained"
                onClick={() => setUpgradeDialogOpen(true)}
                startIcon={<TrendingUp size={16} />}
              >
                Upgrade
              </Button>
            )}
          </Box>
        </Box>

        {tier !== 'free' && (
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Chip
              icon={<Check size={14} />}
              label={`${SUBSCRIPTION_TIERS[tier].limits.maxForms === -1 ? 'Unlimited' : SUBSCRIPTION_TIERS[tier].limits.maxForms} forms`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<Sparkles size={14} />}
              label={`${SUBSCRIPTION_TIERS[tier].limits.aiGenerationsPerMonth === -1 ? 'Unlimited' : SUBSCRIPTION_TIERS[tier].limits.aiGenerationsPerMonth} AI generations/mo`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<Zap size={14} />}
              label={`${SUBSCRIPTION_TIERS[tier].limits.agentSessionsPerMonth === -1 ? 'Unlimited' : SUBSCRIPTION_TIERS[tier].limits.agentSessionsPerMonth} agent sessions/mo`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}
      </Paper>

      {/* Usage Overview */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Usage This Month
        </Typography>

        {usageLoading ? (
          <LinearProgress />
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <UsageLimitIndicator limitKey="submissions" orgId={orgId} variant="bar" />
            </Grid>
            <Grid item xs={12} md={4}>
              <UsageLimitIndicator limitKey="aiGenerations" orgId={orgId} variant="bar" />
            </Grid>
            <Grid item xs={12} md={4}>
              <UsageLimitIndicator limitKey="agentSessions" orgId={orgId} variant="bar" />
            </Grid>
            <Grid item xs={12} md={4}>
              <UsageLimitIndicator limitKey="forms" orgId={orgId} variant="bar" />
            </Grid>
            <Grid item xs={12} md={4}>
              <UsageLimitIndicator limitKey="connections" orgId={orgId} variant="bar" />
            </Grid>
            <Grid item xs={12} md={4}>
              <UsageLimitIndicator limitKey="storage" orgId={orgId} variant="bar" />
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Plan Comparison */}
      <Typography variant="h6" gutterBottom>
        Compare Plans
      </Typography>

      <Box sx={{ mb: 2 }}>
        <FormControl>
          <RadioGroup
            row
            value={billingInterval}
            onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}
          >
            <FormControlLabel value="month" control={<Radio />} label="Monthly" />
            <FormControlLabel
              value="year"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Yearly
                  <Chip label="Save 17%" size="small" color="success" />
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {(['free', 'pro', 'team', 'enterprise'] as SubscriptionTier[]).map((planTier) => (
          <Grid item xs={12} md={3} key={planTier}>
            <PlanCard
              tier={planTier}
              currentTier={tier}
              interval={billingInterval}
              onSelect={(t) => {
                setSelectedTier(t);
                setUpgradeDialogOpen(true);
              }}
              loading={actionLoading}
            />
          </Grid>
        ))}
      </Grid>

      {/* Cancel Subscription */}
      {tier !== 'free' && (
        <Paper sx={{ p: 3, mt: 3, border: `1px solid ${theme.palette.error.light}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AlertCircle size={24} color={theme.palette.error.main} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">Cancel Subscription</Typography>
              <Typography variant="body2" color="text.secondary">
                Your subscription will remain active until the end of your billing period.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              Cancel Subscription
            </Button>
          </Box>
        </Paper>
      )}

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upgrade to {getTierDisplayName(selectedTier)}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              You're upgrading {orgName} to the {getTierDisplayName(selectedTier)} plan.
            </Typography>

            {selectedTier === 'team' && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  How many seats do you need?
                </Typography>
                <TextField
                  type="number"
                  value={seatCount}
                  onChange={(e) => setSeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                  size="small"
                  sx={{ width: 100 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  ${(TIER_PRICING.team[billingInterval === 'year' ? 'yearly' : 'monthly'] / 100).toFixed(2)}/seat/{billingInterval}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3, p: 2, bgcolor: alpha(getTierColor(selectedTier), 0.05), borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Total: $
                {selectedTier === 'team'
                  ? ((TIER_PRICING.team[billingInterval === 'year' ? 'yearly' : 'monthly'] * seatCount) / 100).toFixed(2)
                  : (TIER_PRICING[selectedTier][billingInterval === 'year' ? 'yearly' : 'monthly'] / 100).toFixed(2)
                }/{billingInterval}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpgrade}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <TrendingUp size={16} />}
          >
            Continue to Checkout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================
// Plan Card Component
// ============================================

function PlanCard({ tier, currentTier, interval, onSelect, loading }: PlanCardProps) {
  const theme = useTheme();
  const config = SUBSCRIPTION_TIERS[tier];
  const pricing = TIER_PRICING[tier];
  const isCurrent = tier === currentTier;
  const tierColor = getTierColor(tier);

  const price = interval === 'year' ? pricing.yearly : pricing.monthly;
  const isEnterprise = tier === 'enterprise';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: isCurrent ? `2px solid ${tierColor}` : undefined,
        position: 'relative',
        mt: isCurrent ? 2 : 0, // Add margin top when current to make room for chip
        overflow: 'visible', // Allow chip to overflow
      }}
    >
      {isCurrent && (
        <Chip
          label="Current Plan"
          size="small"
          sx={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: tierColor,
            color: 'white',
            fontWeight: 600,
            zIndex: 1,
          }}
        />
      )}

      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Crown size={20} color={tierColor} />
          <Typography variant="h6">{getTierDisplayName(tier)}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          {isEnterprise ? (
            <Typography variant="h4">Custom</Typography>
          ) : (
            <>
              <Typography variant="h4" component="span">
                ${(price / 100).toFixed(0)}
              </Typography>
              <Typography variant="body2" component="span" color="text.secondary">
                /{interval}
                {tier === 'team' && '/seat'}
              </Typography>
            </>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FeatureItem label={`${config.limits.maxForms === -1 ? 'Unlimited' : config.limits.maxForms} forms`} />
          <FeatureItem label={`${config.limits.maxSubmissionsPerMonth === -1 ? 'Unlimited' : config.limits.maxSubmissionsPerMonth.toLocaleString()} submissions/mo`} />
          <FeatureItem label={`${config.limits.aiGenerationsPerMonth === -1 ? 'Unlimited' : config.limits.aiGenerationsPerMonth} AI generations/mo`} />
          <FeatureItem label={`${config.limits.agentSessionsPerMonth === -1 ? 'Unlimited' : config.limits.agentSessionsPerMonth} agent sessions/mo`} />
          {config.platformFeatures.includes('custom_branding') && (
            <FeatureItem label="Custom branding" />
          )}
          {config.platformFeatures.includes('api_access') && (
            <FeatureItem label="API access" />
          )}
          {config.platformFeatures.includes('sso_saml') && (
            <FeatureItem label="SSO/SAML" />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2 }}>
        {isCurrent ? (
          <Button fullWidth disabled variant="outlined">
            Current Plan
          </Button>
        ) : isEnterprise ? (
          <Button
            fullWidth
            variant="outlined"
            href="mailto:sales@example.com"
            endIcon={<ExternalLink size={16} />}
          >
            Contact Sales
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={() => onSelect(tier)}
            disabled={loading}
            sx={{
              bgcolor: tierColor,
              '&:hover': { bgcolor: alpha(tierColor, 0.9) },
            }}
          >
            {tier === 'free' ? 'Downgrade' : 'Upgrade'}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

function FeatureItem({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Check size={16} color="green" />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}

export default BillingSettings;
