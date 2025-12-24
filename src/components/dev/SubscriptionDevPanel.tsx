/**
 * SubscriptionDevPanel
 *
 * Development-only panel for testing subscription tiers and feature gates.
 * Only renders in development mode (NODE_ENV !== 'production').
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  Alert,
  Collapse,
  IconButton,
  LinearProgress,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Crown,
  Bug,
  X,
} from 'lucide-react';
import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types/platform';
import { getTierDisplayName, getTierColor } from '@/hooks/useFeatureGate';

interface SubscriptionDevPanelProps {
  orgId: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

interface DevSubscriptionInfo {
  tier: SubscriptionTier;
  features: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
}

export function SubscriptionDevPanel({
  orgId,
  position = 'bottom-right',
}: SubscriptionDevPanelProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<DevSubscriptionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Position styles - bottom positions raised to avoid overlap with pagination/buttons
  const positionStyles = {
    'bottom-right': { bottom: 80, right: 16 },
    'bottom-left': { bottom: 80, left: 16 },
    'top-right': { top: 16, right: 16 },
    'top-left': { top: 16, left: 16 },
  };

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dev/subscription?orgId=${orgId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (expanded && !info) {
      fetchInfo();
    }
  }, [expanded, info, fetchInfo]);

  const setTier = async (tier: SubscriptionTier) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/dev/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInfo(data.current);
      setSuccess(`Switched to ${tier} tier`);
      // Clear success after 2s
      setTimeout(() => setSuccess(null), 2000);
      // Reload page to reflect changes
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const resetUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, resetUsage: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInfo(data.current);
      setSuccess('Usage reset');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const maxOutUsage = async () => {
    if (!info) return;
    setLoading(true);
    setError(null);
    try {
      const limits = SUBSCRIPTION_TIERS[info.tier].limits;
      const res = await fetch('/api/dev/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          usage: {
            aiGenerations: limits.aiGenerationsPerMonth,
            agentSessions: limits.agentSessionsPerMonth,
            submissions: limits.maxSubmissionsPerMonth,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInfo(data.current);
      setSuccess('Usage maxed out');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (hidden) {
    return (
      <Tooltip title="Show Dev Panel">
        <IconButton
          onClick={() => setHidden(false)}
          sx={{
            position: 'fixed',
            ...positionStyles[position],
            bgcolor: theme.palette.warning.main,
            color: 'white',
            '&:hover': { bgcolor: theme.palette.warning.dark },
            zIndex: 9999,
          }}
        >
          <Bug size={20} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        ...positionStyles[position],
        width: 320,
        zIndex: 9999,
        border: `2px solid ${theme.palette.warning.main}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: theme.palette.warning.main,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bug size={16} />
          <Typography variant="subtitle2" fontWeight={600}>
            DEV: Subscription
          </Typography>
          {info && (
            <Chip
              label={getTierDisplayName(info.tier)}
              size="small"
              sx={{
                bgcolor: 'white',
                color: getTierColor(info.tier),
                fontWeight: 600,
                height: 20,
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setHidden(true);
            }}
            sx={{ color: 'white', mr: 0.5 }}
          >
            <X size={14} />
          </IconButton>
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </Box>
      </Box>

      {loading && <LinearProgress color="warning" />}

      {/* Collapsible Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Tier Switcher */}
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Switch Tier
          </Typography>
          <ButtonGroup fullWidth size="small" sx={{ mb: 2 }}>
            {(['free', 'pro', 'team', 'enterprise'] as SubscriptionTier[]).map((tier) => (
              <Button
                key={tier}
                onClick={() => setTier(tier)}
                disabled={loading || info?.tier === tier}
                sx={{
                  bgcolor: info?.tier === tier ? alpha(getTierColor(tier), 0.2) : undefined,
                  borderColor: getTierColor(tier),
                  color: getTierColor(tier),
                  '&:hover': {
                    bgcolor: alpha(getTierColor(tier), 0.1),
                    borderColor: getTierColor(tier),
                  },
                }}
              >
                {tier.charAt(0).toUpperCase()}
              </Button>
            ))}
          </ButtonGroup>

          {info && (
            <>
              {/* Current Usage */}
              <Typography variant="caption" color="text.secondary">
                Current Usage
              </Typography>
              <Box sx={{ mb: 2, mt: 0.5 }}>
                {Object.entries(info.usage).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{formatKey(key)}</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {value} / {info.limits[key] === -1 ? '∞' : info.limits[key]}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Usage Actions */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={resetUsage}
                  disabled={loading}
                  startIcon={<RefreshCw size={14} />}
                  fullWidth
                >
                  Reset
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={maxOutUsage}
                  disabled={loading}
                  startIcon={<Zap size={14} />}
                  fullWidth
                >
                  Max Out
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Features */}
              <Typography variant="caption" color="text.secondary">
                Available Features ({info.features.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {info.features.slice(0, 8).map((feature) => (
                  <Chip
                    key={feature}
                    label={formatKey(feature.replace(/^(ai_|agent_)/, ''))}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                ))}
                {info.features.length > 8 && (
                  <Chip
                    label={`+${info.features.length - 8} more`}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                )}
              </Box>
            </>
          )}

          {/* Refresh */}
          <Button
            size="small"
            fullWidth
            onClick={fetchInfo}
            disabled={loading}
            sx={{ mt: 2 }}
            startIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export default SubscriptionDevPanel;
