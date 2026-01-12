/**
 * FeatureGate Component
 *
 * Wraps features that require specific subscription tiers.
 * Provides various fallback modes: hide, disable, blur, or upgrade prompt.
 */

'use client';

import { ReactNode, useMemo } from 'react';
import {
  Box,
  Button,
  Tooltip,
  Typography,
  Chip,
  Paper,
  LinearProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { Lock, Sparkles, Zap, Crown, TrendingUp, Server, Database } from 'lucide-react';
import {
  useFeatureGate,
  useAIFeatureGate,
  useUsageLimit,
  getTierDisplayName,
  getTierColor,
  getClusterTierDisplayName,
  UsageLimitKey,
} from '@/hooks/useFeatureGate';
import { AIFeature, PlatformFeature, SubscriptionTier } from '@/types/platform';
import type { ClusterInstanceSize } from '@/lib/atlas/types';

// ============================================
// Types
// ============================================

type FallbackMode = 'hide' | 'disable' | 'blur' | 'upgrade-prompt' | 'inline-badge';

interface FeatureGateProps {
  /** The feature to check access for */
  feature: AIFeature | PlatformFeature;
  /** Organization ID */
  orgId?: string;
  /** Content to render if access is granted */
  children: ReactNode;
  /** How to handle lack of access */
  fallback?: FallbackMode;
  /** Show AI badge on the feature */
  showBadge?: boolean;
  /** Custom message for upgrade prompt */
  upgradeMessage?: string;
  /** Callback when upgrade button is clicked */
  onUpgrade?: () => void;
}

interface AIFeatureGateProps extends Omit<FeatureGateProps, 'feature'> {
  /** The AI feature to check */
  feature: AIFeature;
  /** Show usage indicator */
  showUsage?: boolean;
}

interface UsageLimitIndicatorProps {
  /** Which limit to display */
  limitKey: UsageLimitKey;
  /** Organization ID */
  orgId?: string;
  /** Label for the indicator */
  label?: string;
  /** Show as compact badge or full bar */
  variant?: 'badge' | 'bar' | 'minimal';
  /** Warning threshold (percentage) */
  warningThreshold?: number;
}

// ============================================
// Feature Gate Component
// ============================================

export function FeatureGate({
  feature,
  orgId,
  children,
  fallback = 'upgrade-prompt',
  showBadge = false,
  upgradeMessage,
  onUpgrade,
}: FeatureGateProps) {
  const theme = useTheme();
  const { hasAccess, reason, requiredTier, requiredClusterTier, currentClusterTier, upgradeUrl } = useFeatureGate(feature, orgId);

  // Determine if this is an AI feature or RAG feature
  const isAIFeature = feature.startsWith('ai_') || feature.startsWith('agent_');
  const isRAGFeature = feature.startsWith('rag_');

  if (hasAccess) {
    return (
      <>
        {showBadge && (isAIFeature || isRAGFeature) && <AIBadge variant="inline" />}
        {children}
      </>
    );
  }

  // Loading state
  if (reason === 'loading') {
    return (
      <Box sx={{ opacity: 0.5 }}>
        {children}
      </Box>
    );
  }

  // Cluster upgrade required (for RAG features)
  if (reason === 'cluster_upgrade_required') {
    if (fallback === 'hide') {
      return null;
    }
    return (
      <ClusterRequiredPrompt
        requiredClusterTier={requiredClusterTier || 'M10'}
        currentClusterTier={currentClusterTier}
        feature={feature}
        message={upgradeMessage}
        upgradeUrl={upgradeUrl}
        onUpgrade={onUpgrade}
        compact={fallback === 'blur'}
      />
    );
  }

  // Handle different fallback modes
  switch (fallback) {
    case 'hide':
      return null;

    case 'disable':
      return (
        <Tooltip
          title={`Requires ${getTierDisplayName(requiredTier || 'pro')} plan`}
          arrow
        >
          <Box
            sx={{
              opacity: 0.5,
              pointerEvents: 'none',
              position: 'relative',
              '& > *': { filter: 'grayscale(50%)' },
            }}
          >
            {children}
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
              }}
            >
              <Chip
                icon={<Lock size={12} />}
                label={getTierDisplayName(requiredTier || 'pro')}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: theme.palette.warning.dark,
                  fontSize: '0.7rem',
                }}
              />
            </Box>
          </Box>
        </Tooltip>
      );

    case 'blur':
      return (
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              filter: 'blur(4px)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {children}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.background.paper, 0.85),
              backdropFilter: 'blur(2px)',
              borderRadius: 1,
            }}
          >
            <UpgradePrompt
              requiredTier={requiredTier || 'pro'}
              feature={feature}
              message={upgradeMessage}
              upgradeUrl={upgradeUrl}
              onUpgrade={onUpgrade}
              compact
            />
          </Box>
        </Box>
      );

    case 'inline-badge':
      return (
        <Tooltip
          title={`Upgrade to ${getTierDisplayName(requiredTier || 'pro')} to unlock`}
          arrow
        >
          <Chip
            icon={<Crown size={14} />}
            label={getTierDisplayName(requiredTier || 'pro')}
            size="small"
            onClick={onUpgrade || (() => window.location.href = upgradeUrl || '/settings/billing')}
            sx={{
              cursor: 'pointer',
              bgcolor: alpha(getTierColor(requiredTier || 'pro'), 0.1),
              color: getTierColor(requiredTier || 'pro'),
              '&:hover': {
                bgcolor: alpha(getTierColor(requiredTier || 'pro'), 0.2),
              },
            }}
          />
        </Tooltip>
      );

    case 'upgrade-prompt':
    default:
      return (
        <UpgradePrompt
          requiredTier={requiredTier || 'pro'}
          feature={feature}
          message={upgradeMessage}
          upgradeUrl={upgradeUrl}
          onUpgrade={onUpgrade}
        />
      );
  }
}

// ============================================
// AI Feature Gate (with usage tracking)
// ============================================

export function AIFeatureGate({
  feature,
  orgId,
  children,
  fallback = 'upgrade-prompt',
  showBadge = true,
  showUsage = false,
  upgradeMessage,
  onUpgrade,
}: AIFeatureGateProps) {
  const theme = useTheme();
  const { hasAccess, reason, requiredTier, currentUsage, limit, remaining, upgradeUrl, incrementUsage } =
    useAIFeatureGate(feature, orgId);

  if (hasAccess) {
    return (
      <Box>
        {showBadge && <AIBadge variant="inline" />}
        {showUsage && limit !== undefined && limit !== -1 && (
          <UsageMeter current={currentUsage || 0} limit={limit} label="AI credits" />
        )}
        {children}
      </Box>
    );
  }

  // Limit reached
  if (reason === 'limit_reached') {
    return (
      <LimitReachedPrompt
        currentUsage={currentUsage || 0}
        limit={limit || 0}
        feature={feature}
        upgradeUrl={upgradeUrl}
        onUpgrade={onUpgrade}
      />
    );
  }

  // Tier required - delegate to regular FeatureGate
  return (
    <FeatureGate
      feature={feature}
      orgId={orgId}
      fallback={fallback}
      showBadge={showBadge}
      upgradeMessage={upgradeMessage}
      onUpgrade={onUpgrade}
    >
      {children}
    </FeatureGate>
  );
}

// ============================================
// Usage Limit Indicator
// ============================================

export function UsageLimitIndicator({
  limitKey,
  orgId,
  label,
  variant = 'bar',
  warningThreshold = 80,
}: UsageLimitIndicatorProps) {
  const theme = useTheme();
  const { current, limit, percentage, isUnlimited, loading } = useUsageLimit(limitKey, orgId);

  const displayLabel = label || getLimitLabel(limitKey);

  if (loading) {
    return <Box sx={{ opacity: 0.5 }}><LinearProgress /></Box>;
  }

  if (isUnlimited) {
    if (variant === 'minimal') return null;
    return (
      <Chip
        icon={<Zap size={14} />}
        label={`${displayLabel}: Unlimited`}
        size="small"
        color="success"
        variant="outlined"
      />
    );
  }

  const isWarning = percentage >= warningThreshold;
  const isDanger = percentage >= 95;

  const color = isDanger
    ? theme.palette.error.main
    : isWarning
      ? theme.palette.warning.main
      : theme.palette.primary.main;

  if (variant === 'badge') {
    return (
      <Tooltip title={`${current} / ${limit} ${displayLabel.toLowerCase()}`}>
        <Chip
          label={`${current}/${limit}`}
          size="small"
          sx={{
            bgcolor: alpha(color, 0.1),
            color: color,
            fontWeight: 500,
          }}
        />
      </Tooltip>
    );
  }

  if (variant === 'minimal') {
    return (
      <Typography variant="caption" sx={{ color: color }}>
        {current}/{limit}
      </Typography>
    );
  }

  // Bar variant
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {displayLabel}
        </Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 500 }}>
          {current} / {limit}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: alpha(color, 0.1),
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            borderRadius: 3,
          },
        }}
      />
    </Box>
  );
}

// ============================================
// Sub-components
// ============================================

interface AIBadgeProps {
  variant?: 'inline' | 'chip';
}

function AIBadge({ variant = 'chip' }: AIBadgeProps) {
  const theme = useTheme();

  if (variant === 'inline') {
    return (
      <Sparkles
        size={14}
        style={{
          color: theme.palette.primary.main,
          marginRight: 4,
          verticalAlign: 'middle',
        }}
      />
    );
  }

  return (
    <Chip
      icon={<Sparkles size={12} />}
      label="AI"
      size="small"
      sx={{
        ml: 1,
        height: 20,
        fontSize: '0.7rem',
        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        color: 'white',
        '& .MuiChip-icon': { color: 'white' },
      }}
    />
  );
}

interface UpgradePromptProps {
  requiredTier: SubscriptionTier;
  feature: string;
  message?: string;
  upgradeUrl?: string;
  onUpgrade?: () => void;
  compact?: boolean;
}

function UpgradePrompt({
  requiredTier,
  feature,
  message,
  upgradeUrl,
  onUpgrade,
  compact = false,
}: UpgradePromptProps) {
  const theme = useTheme();
  const tierColor = getTierColor(requiredTier);

  const featureLabel = useMemo(() => {
    return feature
      .replace(/^(ai_|agent_)/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [feature]);

  const defaultMessage = `${featureLabel} is available on ${getTierDisplayName(requiredTier)} and above.`;

  if (compact) {
    return (
      <Box sx={{ textAlign: 'center', p: 2 }}>
        <Crown size={24} color={tierColor} style={{ marginBottom: 8 }} />
        <Typography variant="body2" sx={{ mb: 2 }}>
          {message || defaultMessage}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<TrendingUp size={16} />}
          onClick={onUpgrade || (() => window.location.href = upgradeUrl || '/settings/billing')}
          sx={{
            bgcolor: tierColor,
            '&:hover': { bgcolor: alpha(tierColor, 0.9) },
          }}
        >
          Upgrade to {getTierDisplayName(requiredTier)}
        </Button>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        textAlign: 'center',
        border: `1px dashed ${alpha(tierColor, 0.3)}`,
        bgcolor: alpha(tierColor, 0.02),
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: alpha(tierColor, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <Crown size={24} color={tierColor} />
      </Box>

      <Typography variant="h6" gutterBottom>
        Upgrade to {getTierDisplayName(requiredTier)}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {message || defaultMessage}
      </Typography>

      <Button
        variant="contained"
        startIcon={<TrendingUp size={16} />}
        onClick={onUpgrade || (() => window.location.href = upgradeUrl || '/settings/billing')}
        sx={{
          bgcolor: tierColor,
          '&:hover': { bgcolor: alpha(tierColor, 0.9) },
        }}
      >
        View Plans
      </Button>
    </Paper>
  );
}

interface LimitReachedPromptProps {
  currentUsage: number;
  limit: number;
  feature: string;
  upgradeUrl?: string;
  onUpgrade?: () => void;
}

function LimitReachedPrompt({
  currentUsage,
  limit,
  feature,
  upgradeUrl,
  onUpgrade,
}: LimitReachedPromptProps) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 3,
        textAlign: 'center',
        border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
        bgcolor: alpha(theme.palette.warning.main, 0.02),
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.warning.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <Zap size={24} color={theme.palette.warning.main} />
      </Box>

      <Typography variant="h6" gutterBottom>
        Usage Limit Reached
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        You've used {currentUsage} of {limit} available credits this month.
      </Typography>

      <UsageMeter current={currentUsage} limit={limit} />

      <Button
        variant="contained"
        color="warning"
        startIcon={<TrendingUp size={16} />}
        onClick={onUpgrade || (() => window.location.href = upgradeUrl || '/settings/billing')}
        sx={{ mt: 2 }}
      >
        Increase Limit
      </Button>
    </Paper>
  );
}

interface ClusterRequiredPromptProps {
  requiredClusterTier: ClusterInstanceSize;
  currentClusterTier?: ClusterInstanceSize | null;
  feature: string;
  message?: string;
  upgradeUrl?: string;
  onUpgrade?: () => void;
  compact?: boolean;
}

export function ClusterRequiredPrompt({
  requiredClusterTier,
  currentClusterTier,
  feature,
  message,
  upgradeUrl,
  onUpgrade,
  compact = false,
}: ClusterRequiredPromptProps) {
  const theme = useTheme();

  const featureLabel = useMemo(() => {
    return feature
      .replace(/^(rag_)/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [feature]);

  const currentTierDisplay = getClusterTierDisplayName(currentClusterTier);
  const defaultMessage = currentClusterTier
    ? `${featureLabel} requires an Atlas ${requiredClusterTier}+ cluster. Your current cluster is ${currentTierDisplay}.`
    : `${featureLabel} requires an Atlas ${requiredClusterTier}+ cluster with Vector Search capability.`;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = upgradeUrl || '/settings/cluster';
    }
  };

  if (compact) {
    return (
      <Box sx={{ textAlign: 'center', p: 2 }}>
        <Database size={24} color={theme.palette.info.main} style={{ marginBottom: 8 }} />
        <Typography variant="body2" sx={{ mb: 2 }}>
          {message || defaultMessage}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Server size={16} />}
          onClick={handleUpgrade}
          sx={{
            bgcolor: theme.palette.info.main,
            '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.9) },
          }}
        >
          Upgrade to {requiredClusterTier}
        </Button>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        textAlign: 'center',
        border: `1px dashed ${alpha(theme.palette.info.main, 0.3)}`,
        bgcolor: alpha(theme.palette.info.main, 0.02),
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.info.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <Database size={24} color={theme.palette.info.main} />
      </Box>

      <Typography variant="h6" gutterBottom>
        Cluster Upgrade Required
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {message || defaultMessage}
      </Typography>

      {currentClusterTier && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            mb: 3,
          }}
        >
          <Chip
            label={currentTierDisplay}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.dark,
            }}
          />
          <TrendingUp size={16} color={theme.palette.text.secondary} />
          <Chip
            label={requiredClusterTier}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.dark,
            }}
          />
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
        Vector Search is a MongoDB Atlas feature that requires an M10+ dedicated cluster.
      </Typography>

      <Button
        variant="contained"
        startIcon={<Server size={16} />}
        onClick={handleUpgrade}
        sx={{
          bgcolor: theme.palette.info.main,
          '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.9) },
        }}
      >
        Upgrade Cluster
      </Button>
    </Paper>
  );
}

interface UsageMeterProps {
  current: number;
  limit: number;
  label?: string;
}

function UsageMeter({ current, limit, label }: UsageMeterProps) {
  const theme = useTheme();
  const percentage = Math.min(100, (current / limit) * 100);
  const isHigh = percentage >= 80;
  const color = isHigh ? theme.palette.warning.main : theme.palette.primary.main;

  return (
    <Box sx={{ my: 2 }}>
      {label && (
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(color, 0.1),
            '& .MuiLinearProgress-bar': {
              bgcolor: color,
              borderRadius: 4,
            },
          }}
        />
        <Typography variant="caption" sx={{ color, fontWeight: 600, minWidth: 50 }}>
          {current}/{limit}
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================
// Helpers
// ============================================

function getLimitLabel(key: UsageLimitKey): string {
  const labels: Record<UsageLimitKey, string> = {
    aiGenerations: 'AI Generations',
    agentSessions: 'Agent Sessions',
    responseProcessing: 'Response Processing',
    submissions: 'Form Submissions',
    forms: 'Active Forms',
    connections: 'Database Connections',
    storage: 'Storage',
  };
  return labels[key];
}
