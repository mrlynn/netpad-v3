/**
 * SubscriptionDevPanel
 *
 * Development-only panel for testing subscription tiers and feature gates.
 * Only renders in development mode (NODE_ENV !== 'production').
 *
 * Features:
 * - Compact collapsed state (similar to Vercel/Next.js dev popup)
 * - User can reposition to any corner
 * - Position and hidden state persisted in localStorage
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Bug,
  X,
  Move,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
} from 'lucide-react';
import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types/platform';
import { getTierColor } from '@/hooks/useFeatureGate';

export type DevPanelPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface SubscriptionDevPanelProps {
  orgId: string;
  position: DevPanelPosition;
  onPositionChange: (position: DevPanelPosition) => void;
  onHide: () => void;
}

interface DevSubscriptionInfo {
  tier: SubscriptionTier;
  features: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
}

const POSITION_CONFIG: Record<DevPanelPosition, { label: string; icon: typeof ArrowUpLeft }> = {
  'top-left': { label: 'Top Left', icon: ArrowUpLeft },
  'top-right': { label: 'Top Right', icon: ArrowUpRight },
  'bottom-left': { label: 'Bottom Left', icon: ArrowDownLeft },
  'bottom-right': { label: 'Bottom Right', icon: ArrowDownRight },
};

export function SubscriptionDevPanel({
  orgId,
  position,
  onPositionChange,
  onHide,
}: SubscriptionDevPanelProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<DevSubscriptionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [positionMenuAnchor, setPositionMenuAnchor] = useState<null | HTMLElement>(null);

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Position styles - compact positioning
  const positionStyles = {
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
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
            workflowExecutions: limits.workflowExecutionsPerMonth,
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

  const handlePositionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setPositionMenuAnchor(event.currentTarget);
  };

  const handlePositionMenuClose = () => {
    setPositionMenuAnchor(null);
  };

  const handlePositionSelect = (newPosition: DevPanelPosition) => {
    onPositionChange(newPosition);
    handlePositionMenuClose();
  };

  return (
    <>
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          ...positionStyles[position],
          width: expanded ? 280 : 'auto',
          zIndex: 9999,
          border: `1.5px solid ${theme.palette.warning.main}`,
          overflow: 'hidden',
          borderRadius: expanded ? 1 : 2,
          transition: 'width 0.2s ease-in-out',
        }}
      >
        {/* Compact Header */}
        <Box
          sx={{
            px: expanded ? 1.5 : 1,
            py: 0.5,
            bgcolor: theme.palette.warning.main,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            gap: 1,
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Bug size={14} />
            {expanded && (
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                DEV
              </Typography>
            )}
            {info && (
              <Chip
                label={info.tier.charAt(0).toUpperCase()}
                size="small"
                sx={{
                  bgcolor: 'white',
                  color: getTierColor(info.tier),
                  fontWeight: 700,
                  height: 16,
                  fontSize: '0.6rem',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {expanded && (
              <>
                <Tooltip title="Move panel">
                  <IconButton
                    size="small"
                    onClick={handlePositionMenuOpen}
                    sx={{ color: 'white', p: 0.25 }}
                  >
                    <Move size={12} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Hide panel">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHide();
                    }}
                    sx={{ color: 'white', p: 0.25 }}
                  >
                    <X size={12} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
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
            sx={{ mt: 1.5 }}
            startIcon={<RefreshCw size={12} />}
          >
            Refresh
          </Button>
        </Box>
      </Collapse>
      </Paper>

      {/* Position Menu - opens away from panel edge */}
      <Menu
        anchorEl={positionMenuAnchor}
        open={Boolean(positionMenuAnchor)}
        onClose={handlePositionMenuClose}
        anchorOrigin={{
          vertical: position.startsWith('top') ? 'bottom' : 'top',
          horizontal: position.endsWith('left') ? 'right' : 'left',
        }}
        transformOrigin={{
          vertical: position.startsWith('top') ? 'top' : 'bottom',
          horizontal: position.endsWith('left') ? 'left' : 'right',
        }}
        sx={{ zIndex: 10001 }}
        slotProps={{
          paper: {
            elevation: 8,
          },
        }}
      >
        {(Object.keys(POSITION_CONFIG) as DevPanelPosition[]).map((pos) => {
          const config = POSITION_CONFIG[pos];
          const Icon = config.icon;
          return (
            <MenuItem
              key={pos}
              onClick={() => handlePositionSelect(pos)}
              selected={pos === position}
              sx={{ fontSize: '0.8rem', py: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Icon size={14} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>
                {config.label}
              </ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
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
