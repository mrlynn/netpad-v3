'use client';

/**
 * DeploymentModeBadge Component
 *
 * Displays the current deployment mode in the user interface.
 * This helps users understand which hosting configuration they're using:
 * - Cloud: Hosted on netpad.io (SaaS)
 * - Self-Hosted: Running on user's own infrastructure
 *
 * Note: Standalone mode is only applicable to exported apps and won't appear here.
 */

import React from 'react';
import { Box, Chip, Tooltip, alpha } from '@mui/material';
import { Cloud, Computer, HelpOutline } from '@mui/icons-material';
import { useHelp } from '@/contexts/HelpContext';

export type DeploymentMode = 'cloud' | 'self-hosted';

interface DeploymentModeBadgeProps {
  /** Override the mode (useful for testing, otherwise auto-detected from env) */
  mode?: DeploymentMode;
  /** Show as a full chip (default) or compact icon only */
  variant?: 'chip' | 'icon';
  /** Show help icon that links to documentation */
  showHelp?: boolean;
}

/**
 * Get the current deployment mode from environment variables.
 * This is determined by NETPAD_PLATFORM_MODE or NEXT_PUBLIC_NETPAD_PLATFORM_MODE.
 */
function getDeploymentMode(): DeploymentMode {
  // Check both server and client-accessible env vars
  const mode =
    process.env.NETPAD_PLATFORM_MODE ||
    process.env.NEXT_PUBLIC_NETPAD_PLATFORM_MODE;

  if (mode === 'cloud') return 'cloud';
  return 'self-hosted';
}

const MODE_CONFIG = {
  cloud: {
    label: 'Cloud',
    description: 'Hosted on netpad.io - fully managed SaaS',
    icon: Cloud,
    color: '#2196F3',
    bgColor: '#2196F3',
  },
  'self-hosted': {
    label: 'Self-Hosted',
    description: 'Running on your own infrastructure',
    icon: Computer,
    color: '#FF9800',
    bgColor: '#FF9800',
  },
} as const;

export function DeploymentModeBadge({
  mode,
  variant = 'chip',
  showHelp = true,
}: DeploymentModeBadgeProps) {
  const resolvedMode = mode ?? getDeploymentMode();
  const config = MODE_CONFIG[resolvedMode];
  const Icon = config.icon;
  const { openHelp } = useHelp();

  const handleHelpClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open help documentation for deployment modes
    openHelp('deployment-modes');
  };

  if (variant === 'icon') {
    return (
      <Tooltip title={`${config.label}: ${config.description}`}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 1,
            bgcolor: alpha(config.bgColor, 0.1),
            color: config.color,
          }}
        >
          <Icon sx={{ fontSize: 16 }} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={config.description}>
        <Chip
          icon={<Icon sx={{ fontSize: 14 }} />}
          label={config.label}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 500,
            bgcolor: alpha(config.bgColor, 0.1),
            color: config.color,
            border: `1px solid ${alpha(config.bgColor, 0.3)}`,
            '& .MuiChip-icon': {
              color: config.color,
              ml: 0.5,
            },
          }}
        />
      </Tooltip>
      {showHelp && (
        <Tooltip title="Learn about deployment modes">
          <Box
            component="span"
            onClick={handleHelpClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'text.disabled',
              '&:hover': {
                color: 'text.secondary',
              },
            }}
          >
            <HelpOutline sx={{ fontSize: 14 }} />
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

/**
 * Inline deployment mode indicator for menus
 * Shows mode in a compact format suitable for menu items
 */
export function DeploymentModeMenuItem() {
  const mode = getDeploymentMode();
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 0.5,
          bgcolor: alpha(config.bgColor, 0.1),
          color: config.color,
        }}
      >
        <Icon sx={{ fontSize: 14 }} />
      </Box>
      <Box>
        <Box sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.primary' }}>
          {config.label} Mode
        </Box>
        <Box sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          {config.description}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Export the mode detection function for use elsewhere
 */
export { getDeploymentMode };
