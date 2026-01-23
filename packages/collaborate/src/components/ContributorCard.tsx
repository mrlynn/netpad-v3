'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { GitHub, Code, Description, Widgets, AccountTree, Palette } from '@mui/icons-material';
import type { Contributor } from '../types';

export interface ContributorCardProps {
  /** Contributor data */
  contributor: Contributor;
  /** Card variant */
  variant?: 'default' | 'compact' | 'featured';
  /** Show contribution breakdown */
  showContributions?: boolean;
  /** Callback when card is clicked */
  onClick?: (contributor: Contributor) => void;
}

const contributionIcons: Record<Contributor['contributionTypes'][number], React.ElementType> = {
  code: Code,
  docs: Description,
  templates: Widgets,
  workflows: AccountTree,
  design: Palette,
};

const contributionColors: Record<Contributor['contributionTypes'][number], string> = {
  code: '#2196F3',
  docs: '#9C27B0',
  templates: '#00ED64',
  workflows: '#FF9800',
  design: '#E91E63',
};

/**
 * ContributorCard - Displays a single contributor's profile
 *
 * Usage:
 * ```tsx
 * import { ContributorCard } from '@netpad/collaborate/components';
 *
 * <ContributorCard
 *   contributor={contributor}
 *   variant="featured"
 *   showContributions={true}
 * />
 * ```
 */
export function ContributorCard({
  contributor,
  variant = 'default',
  showContributions = true,
  onClick,
}: ContributorCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: isCompact ? 'row' : 'column',
        alignItems: isCompact ? 'center' : 'stretch',
        bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
        border: '1px solid',
        borderColor: isFeatured
          ? '#00ED64'
          : isDark
          ? alpha('#fff', 0.1)
          : alpha('#000', 0.1),
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...(isFeatured && {
          background: isDark
            ? `linear-gradient(135deg, ${alpha('#00ED64', 0.1)} 0%, transparent 50%)`
            : `linear-gradient(135deg, ${alpha('#00ED64', 0.05)} 0%, transparent 50%)`,
        }),
        '&:hover': {
          borderColor: '#00ED64',
          transform: onClick ? 'translateY(-2px)' : 'none',
          boxShadow: onClick ? `0 4px 16px ${alpha('#00ED64', 0.15)}` : 'none',
        },
      }}
      onClick={() => onClick?.(contributor)}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: isCompact ? 'row' : 'column',
          alignItems: isCompact ? 'center' : 'center',
          gap: isCompact ? 2 : 1,
          p: isCompact ? 2 : 3,
          width: '100%',
          textAlign: isCompact ? 'left' : 'center',
        }}
      >
        {/* Avatar */}
        <Avatar
          src={contributor.avatarUrl}
          alt={contributor.name}
          sx={{
            width: isCompact ? 48 : isFeatured ? 80 : 64,
            height: isCompact ? 48 : isFeatured ? 80 : 64,
            border: '2px solid',
            borderColor: '#00ED64',
            ...(isFeatured && {
              boxShadow: `0 0 20px ${alpha('#00ED64', 0.3)}`,
            }),
          }}
        >
          {contributor.name.charAt(0).toUpperCase()}
        </Avatar>

        {/* Info */}
        <Box sx={{ flexGrow: isCompact ? 1 : 0 }}>
          <Typography
            variant={isCompact ? 'body1' : 'h6'}
            sx={{
              fontWeight: 600,
              color: isDark ? '#fff' : '#1a1a2e',
              mb: isCompact ? 0 : 0.5,
            }}
          >
            {contributor.name}
          </Typography>

          {contributor.bio && !isCompact && (
            <Typography
              variant="body2"
              sx={{
                color: isDark ? alpha('#fff', 0.6) : alpha('#000', 0.6),
                mb: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {contributor.bio}
            </Typography>
          )}

          {/* Contribution count */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCompact ? 'flex-start' : 'center',
              gap: 1,
              mb: showContributions && !isCompact ? 2 : 0,
            }}
          >
            <Typography
              variant={isCompact ? 'caption' : 'body2'}
              sx={{
                color: '#00ED64',
                fontWeight: 600,
              }}
            >
              {contributor.contributions} contributions
            </Typography>
            {contributor.githubUsername && (
              <IconButton
                size="small"
                href={`https://github.com/${contributor.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  color: isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5),
                  p: 0.5,
                  '&:hover': { color: '#00ED64' },
                }}
              >
                <GitHub fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Contribution types */}
        {showContributions && !isCompact && contributor.contributionTypes.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 0.5,
            }}
          >
            {contributor.contributionTypes.map((type) => {
              const Icon = contributionIcons[type];
              const color = contributionColors[type];
              return (
                <Chip
                  key={type}
                  icon={<Icon sx={{ fontSize: 14, color: `${color} !important` }} />}
                  label={type}
                  size="small"
                  sx={{
                    bgcolor: alpha(color, 0.1),
                    color: color,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    '& .MuiChip-icon': {
                      ml: 0.5,
                    },
                  }}
                />
              );
            })}
          </Box>
        )}

        {/* Compact contribution badges */}
        {isCompact && contributor.contributionTypes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {contributor.contributionTypes.map((type) => {
              const Icon = contributionIcons[type];
              const color = contributionColors[type];
              return (
                <Box
                  key={type}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: alpha(color, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={type}
                >
                  <Icon sx={{ fontSize: 14, color }} />
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default ContributorCard;
