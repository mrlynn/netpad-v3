/**
 * SubscriptionDevPanel
 *
 * Panel for testing subscription tiers and feature gates.
 * Access is controlled by DevPanelWrapper:
 * - In development: shown to all authenticated users
 * - In production: only shown to platform admins (platformRole === 'admin')
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
  Tabs,
  Tab,
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
  Trash2,
  Database,
  FolderX,
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
  const [activeTab, setActiveTab] = useState<'subscription' | 'reset'>('subscription');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<any>(null);

  // Note: Access control (dev vs production, platform admin check) is handled by DevPanelWrapper

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
          width: expanded ? 320 : 'auto',
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
        <Box>
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              minHeight: 36,
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 36,
                fontSize: '0.7rem',
                textTransform: 'none',
              },
            }}
          >
            <Tab label="Subscription" value="subscription" />
            <Tab label="Reset" value="reset" />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 2, maxHeight: 400, overflowY: 'auto' }}>
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

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <>
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
              </>
            )}

            {/* Reset Tab */}
            {activeTab === 'reset' && (
              <ResetSection
                orgId={orgId}
                loading={resetLoading}
                result={resetResult}
                onReset={async (options) => {
                  setResetLoading(true);
                  setResetResult(null);
                  setError(null);
                  setSuccess(null);
                  
                  try {
                    const res = await fetch('/api/dev/reset', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(options),
                    });
                    const data = await res.json();
                    
                    if (!res.ok) {
                      throw new Error(data.error || 'Reset failed');
                    }
                    
                    setResetResult(data);
                    setSuccess(`Reset completed: ${data.operations.length} operations`);
                    setTimeout(() => setSuccess(null), 5000);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Reset failed');
                  } finally {
                    setResetLoading(false);
                  }
                }}
              />
            )}
          </Box>
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

// ============================================
// Reset Section Component
// ============================================

interface ResetSectionProps {
  orgId: string;
  loading: boolean;
  result: any;
  onReset: (options: any) => Promise<void>;
}

function ResetSection({ orgId, loading, result, onReset }: ResetSectionProps) {
  const [options, setOptions] = useState({
    clearForms: false,
    clearWorkflows: false,
    clearClusters: false,
    clearVaults: false,
    clearUsage: false,
    clearLegacyStorage: false,
  });

  const handleReset = async (type: 'org' | 'all' | 'selected') => {
    const resetOptions: any = { orgId };

    if (type === 'org') {
      // Reset everything for this org
      resetOptions.clearForms = true;
      resetOptions.clearWorkflows = true;
      resetOptions.clearClusters = false; // Be careful with clusters
      resetOptions.clearVaults = true;
      resetOptions.clearUsage = true;
    } else if (type === 'all') {
      // Reset everything possible
      resetOptions.clearForms = true;
      resetOptions.clearWorkflows = true;
      resetOptions.clearClusters = false; // Don't auto-delete clusters
      resetOptions.clearVaults = true;
      resetOptions.clearUsage = true;
      resetOptions.clearLegacyStorage = true;
    } else {
      // Use selected options
      Object.assign(resetOptions, options);
    }

    await onReset(resetOptions);
  };

  return (
    <>
      <Alert severity="warning" sx={{ mb: 2, fontSize: '0.7rem' }}>
        <Typography variant="caption" fontWeight={600}>
          DESTRUCTIVE OPERATIONS
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          These operations cannot be undone. Use with caution!
        </Typography>
      </Alert>

      {/* Quick Actions */}
      <Typography variant="caption" color="text.secondary" gutterBottom>
        Quick Reset
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={() => handleReset('org')}
          disabled={loading || !orgId}
          startIcon={<FolderX size={14} />}
          fullWidth
          sx={{ fontSize: '0.7rem' }}
        >
          Reset This Org
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={() => handleReset('selected')}
          disabled={loading || !orgId}
          startIcon={<Trash2 size={14} />}
          fullWidth
          sx={{ fontSize: '0.7rem' }}
        >
          Reset Selected
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Options */}
      <Typography variant="caption" color="text.secondary" gutterBottom>
        Reset Options
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
        {[
          { key: 'clearForms', label: 'Forms & Submissions', requiresOrg: true },
          { key: 'clearWorkflows', label: 'Workflows & Executions', requiresOrg: true },
          { key: 'clearVaults', label: 'Connection Vaults', requiresOrg: true },
          { key: 'clearUsage', label: 'Usage Counters', requiresOrg: true },
          { key: 'clearLegacyStorage', label: 'Legacy Storage', requiresOrg: false },
        ].map(({ key, label, requiresOrg }) => (
          <Box
            key={key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
            }}
          >
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              {label}
            </Typography>
            <Button
              size="small"
              variant={options[key as keyof typeof options] ? 'contained' : 'outlined'}
              {...(options[key as keyof typeof options] ? { color: 'error' as const } : {})}
              onClick={() =>
                setOptions((prev) => ({
                  ...prev,
                  [key]: !prev[key as keyof typeof options],
                }))
              }
              disabled={loading || (requiresOrg && !orgId)}
              sx={{
                minWidth: 60,
                fontSize: '0.65rem',
                height: 24,
                px: 1,
              }}
            >
              {options[key as keyof typeof options] ? 'ON' : 'OFF'}
            </Button>
          </Box>
        ))}
      </Box>

      {/* Cluster Reset (Separate, More Dangerous) */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="error" gutterBottom>
        ⚠️ Dangerous: Cluster Deletion
      </Typography>
      <Button
        size="small"
        variant="outlined"
        color="error"
        onClick={async () => {
          await onReset({
            orgId,
            clearClusters: true,
            clearVaults: true,
          });
        }}
        disabled={loading || !orgId}
        startIcon={<Database size={14} />}
        fullWidth
        sx={{ fontSize: '0.7rem', mt: 1 }}
      >
        Delete Cluster (Including Vaults)
      </Button>

      {/* Results */}
      {result && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Last Reset Results
          </Typography>
          <Box sx={{ fontSize: '0.65rem', color: 'text.secondary', mt: 0.5 }}>
            {result.success ? (
              <>
                <Typography variant="caption" color="success" display="block">
                  ✓ Success
                </Typography>
                {result.operations?.length > 0 && (
                  <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0.5 }}>
                    {result.operations.slice(0, 3).map((op: string, i: number) => (
                      <li key={i}>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                          {op}
                        </Typography>
                      </li>
                    ))}
                    {result.operations.length > 3 && (
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                        +{result.operations.length - 3} more
                      </Typography>
                    )}
                  </Box>
                )}
              </>
            ) : (
              <>
                <Typography variant="caption" color="error" display="block">
                  ✗ Failed
                </Typography>
                {result.errors?.length > 0 && (
                  <Box component="ul" sx={{ pl: 2, mt: 0.5 }}>
                    {result.errors.map((err: string, i: number) => (
                      <li key={i}>
                        <Typography variant="caption" color="error" sx={{ fontSize: '0.65rem' }}>
                          {err}
                        </Typography>
                      </li>
                    ))}
                  </Box>
                )}
              </>
            )}
          </Box>
        </>
      )}
    </>
  );
}

export default SubscriptionDevPanel;
