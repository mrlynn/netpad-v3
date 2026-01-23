'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Skeleton,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import { EmojiEvents, TrendingUp } from '@mui/icons-material';
import type { Contributor } from '../types';
import { ContributorCard } from './ContributorCard';

export interface ContributorLeaderboardProps {
  /** API endpoint for fetching contributors (defaults to /api/ext/collaborate/contributors) */
  endpoint?: string;
  /** Maximum contributors to display */
  limit?: number;
  /** Layout variant */
  variant?: 'list' | 'grid' | 'podium';
  /** Title for the leaderboard */
  title?: string;
  /** Show ranking numbers */
  showRanking?: boolean;
  /** Callback when contributor is clicked */
  onContributorClick?: (contributor: Contributor) => void;
}

const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze

/**
 * ContributorLeaderboard - Displays top contributors from the collaborate extension
 *
 * Usage:
 * ```tsx
 * import { ContributorLeaderboard } from '@netpad/collaborate/components';
 *
 * <ContributorLeaderboard
 *   limit={10}
 *   variant="podium"
 *   title="Top Contributors"
 * />
 * ```
 */
export function ContributorLeaderboard({
  endpoint = '/api/ext/collaborate/contributors',
  limit = 10,
  variant = 'list',
  title = 'Top Contributors',
  showRanking = true,
  onContributorClick,
}: ContributorLeaderboardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContributors = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));

        const url = `${endpoint}${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setContributors(data.contributors || []);
        } else {
          setError(data.error || 'Failed to load contributors');
        }
      } catch (err) {
        setError('Failed to load contributors. Please try again.');
        console.error('Contributors fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContributors();
  }, [endpoint, limit]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Paper
        sx={{
          p: 3,
          bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
          border: '1px solid',
          borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1),
        }}
      >
        <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
        {Array.from({ length: Math.min(5, limit) }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Box>
          </Box>
        ))}
      </Paper>
    );
  }

  if (contributors.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
          border: '1px solid',
          borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1),
        }}
      >
        <TrendingUp sx={{ fontSize: 48, color: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2), mb: 2 }} />
        <Typography variant="h6" sx={{ color: isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5) }}>
          No contributors yet
        </Typography>
        <Typography variant="body2" sx={{ color: isDark ? alpha('#fff', 0.3) : alpha('#000', 0.3) }}>
          Be the first to contribute to NetPad!
        </Typography>
      </Paper>
    );
  }

  // Podium variant for top 3
  if (variant === 'podium' && contributors.length >= 3) {
    const [first, second, third, ...rest] = contributors;

    return (
      <Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: isDark ? '#fff' : '#1a1a2e',
            mb: 4,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <EmojiEvents sx={{ color: '#FFD700' }} />
          {title}
        </Typography>

        {/* Podium */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: 2,
            mb: 4,
          }}
        >
          {/* Second place */}
          <Box sx={{ textAlign: 'center' }}>
            <Avatar
              src={second.avatarUrl}
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 1,
                border: '3px solid',
                borderColor: rankColors[1],
              }}
            >
              {second.name.charAt(0)}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#fff' : '#1a1a2e' }}>
              {second.name}
            </Typography>
            <Chip
              label={`${second.contributions}`}
              size="small"
              sx={{ bgcolor: alpha(rankColors[1], 0.2), color: rankColors[1], fontWeight: 600 }}
            />
            <Box
              sx={{
                width: 80,
                height: 60,
                bgcolor: alpha(rankColors[1], 0.2),
                borderRadius: '8px 8px 0 0',
                mt: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h4" sx={{ color: rankColors[1], fontWeight: 700 }}>
                2
              </Typography>
            </Box>
          </Box>

          {/* First place */}
          <Box sx={{ textAlign: 'center' }}>
            <EmojiEvents sx={{ color: rankColors[0], fontSize: 32, mb: 0.5 }} />
            <Avatar
              src={first.avatarUrl}
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 1,
                border: '4px solid',
                borderColor: rankColors[0],
                boxShadow: `0 0 20px ${alpha(rankColors[0], 0.4)}`,
              }}
            >
              {first.name.charAt(0)}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 700, color: isDark ? '#fff' : '#1a1a2e' }}>
              {first.name}
            </Typography>
            <Chip
              label={`${first.contributions}`}
              size="small"
              sx={{ bgcolor: alpha(rankColors[0], 0.2), color: rankColors[0], fontWeight: 600 }}
            />
            <Box
              sx={{
                width: 100,
                height: 80,
                bgcolor: alpha(rankColors[0], 0.2),
                borderRadius: '8px 8px 0 0',
                mt: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h3" sx={{ color: rankColors[0], fontWeight: 700 }}>
                1
              </Typography>
            </Box>
          </Box>

          {/* Third place */}
          <Box sx={{ textAlign: 'center' }}>
            <Avatar
              src={third.avatarUrl}
              sx={{
                width: 56,
                height: 56,
                mx: 'auto',
                mb: 1,
                border: '2px solid',
                borderColor: rankColors[2],
              }}
            >
              {third.name.charAt(0)}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#fff' : '#1a1a2e' }}>
              {third.name}
            </Typography>
            <Chip
              label={`${third.contributions}`}
              size="small"
              sx={{ bgcolor: alpha(rankColors[2], 0.2), color: rankColors[2], fontWeight: 600 }}
            />
            <Box
              sx={{
                width: 70,
                height: 40,
                bgcolor: alpha(rankColors[2], 0.2),
                borderRadius: '8px 8px 0 0',
                mt: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h5" sx={{ color: rankColors[2], fontWeight: 700 }}>
                3
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Rest of the list */}
        {rest.length > 0 && (
          <List>
            {rest.map((contributor, index) => (
              <ListItem
                key={contributor.id}
                sx={{
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                  borderRadius: 1,
                  mb: 1,
                  cursor: onContributorClick ? 'pointer' : 'default',
                  '&:hover': {
                    bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                  },
                }}
                onClick={() => onContributorClick?.(contributor)}
              >
                {showRanking && (
                  <Typography
                    sx={{
                      width: 32,
                      fontWeight: 600,
                      color: isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5),
                    }}
                  >
                    {index + 4}
                  </Typography>
                )}
                <ListItemAvatar>
                  <Avatar src={contributor.avatarUrl}>{contributor.name.charAt(0)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={contributor.name}
                  secondary={`${contributor.contributions} contributions`}
                  primaryTypographyProps={{
                    fontWeight: 600,
                    color: isDark ? '#fff' : '#1a1a2e',
                  }}
                  secondaryTypographyProps={{
                    color: '#00ED64',
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    );
  }

  // Grid variant
  if (variant === 'grid') {
    return (
      <Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: isDark ? '#fff' : '#1a1a2e',
            mb: 3,
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {contributors.map((contributor, index) => (
            <ContributorCard
              key={contributor.id}
              contributor={contributor}
              variant={index < 3 ? 'featured' : 'default'}
              onClick={onContributorClick}
            />
          ))}
        </Box>
      </Box>
    );
  }

  // Default list variant
  return (
    <Paper
      sx={{
        bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
        border: '1px solid',
        borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1),
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1),
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: isDark ? '#fff' : '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <EmojiEvents sx={{ color: '#FFD700' }} />
          {title}
        </Typography>
      </Box>

      <List sx={{ p: 0 }}>
        {contributors.map((contributor, index) => (
          <ListItem
            key={contributor.id}
            sx={{
              borderBottom: '1px solid',
              borderColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
              cursor: onContributorClick ? 'pointer' : 'default',
              '&:last-child': { borderBottom: 'none' },
              '&:hover': {
                bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
              },
            }}
            onClick={() => onContributorClick?.(contributor)}
          >
            {showRanking && (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: index < 3 ? alpha(rankColors[index], 0.2) : alpha('#fff', 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: index < 3 ? rankColors[index] : isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5),
                  }}
                >
                  {index + 1}
                </Typography>
              </Box>
            )}
            <ListItemAvatar>
              <Avatar
                src={contributor.avatarUrl}
                sx={{
                  border: index < 3 ? '2px solid' : 'none',
                  borderColor: index < 3 ? rankColors[index] : 'transparent',
                }}
              >
                {contributor.name.charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={contributor.name}
              secondary={`${contributor.contributions} contributions`}
              primaryTypographyProps={{
                fontWeight: 600,
                color: isDark ? '#fff' : '#1a1a2e',
              }}
              secondaryTypographyProps={{
                color: '#00ED64',
                fontWeight: 500,
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default ContributorLeaderboard;
