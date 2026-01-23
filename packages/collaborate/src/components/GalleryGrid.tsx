'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Skeleton,
  Alert,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  Favorite,
  OpenInNew,
  GitHub,
  Star,
} from '@mui/icons-material';
import type { GalleryItem } from '../types';

export interface GalleryGridProps {
  /** API endpoint for fetching gallery items (defaults to /api/ext/collaborate/gallery) */
  endpoint?: string;
  /** Filter by category */
  category?: GalleryItem['category'];
  /** Filter by tags */
  tags?: string[];
  /** Only show featured items */
  featured?: boolean;
  /** Maximum items to display */
  limit?: number;
  /** Number of columns (1-4) */
  columns?: 1 | 2 | 3 | 4;
  /** Show loading skeletons */
  showSkeletons?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Callback when item is clicked */
  onItemClick?: (item: GalleryItem) => void;
}

/**
 * GalleryGrid - Displays community gallery items from the collaborate extension
 *
 * Usage:
 * ```tsx
 * import { GalleryGrid } from '@netpad/collaborate/components';
 *
 * <GalleryGrid
 *   category="template"
 *   featured={true}
 *   limit={6}
 *   columns={3}
 * />
 * ```
 */
export function GalleryGrid({
  endpoint = '/api/ext/collaborate/gallery',
  category,
  tags,
  featured,
  limit = 12,
  columns = 3,
  showSkeletons = true,
  emptyMessage = 'No items found. Be the first to contribute!',
  onItemClick,
}: GalleryGridProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (tags?.length) params.set('tags', tags.join(','));
        if (featured !== undefined) params.set('featured', String(featured));
        if (limit) params.set('limit', String(limit));

        const url = `${endpoint}${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setItems(data.items || []);
        } else {
          setError(data.error || 'Failed to load gallery');
        }
      } catch (err) {
        setError('Failed to load gallery. Please try again.');
        console.error('Gallery fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [endpoint, category, tags, featured, limit]);

  const getCategoryColor = (cat: GalleryItem['category']) => {
    const colors: Record<GalleryItem['category'], string> = {
      template: '#00ED64',
      workflow: '#2196F3',
      integration: '#9C27B0',
      app: '#FF9800',
    };
    return colors[cat] || '#00ED64';
  };

  const gridColumns = {
    xs: 1,
    sm: Math.min(2, columns),
    md: Math.min(3, columns),
    lg: columns,
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (loading && showSkeletons) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: limit }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} lg={12 / columns} key={i}>
            <Card
              sx={{
                height: '100%',
                bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
              }}
            >
              <Skeleton variant="rectangular" height={180} />
              <CardContent>
                <Skeleton variant="text" width="60%" height={28} />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (items.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 2,
          bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
          borderRadius: 2,
          border: '1px dashed',
          borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1),
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5), mb: 1 }}
        >
          {emptyMessage}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          href="/collaborate"
          sx={{
            mt: 2,
            borderColor: '#00ED64',
            color: '#00ED64',
            '&:hover': {
              borderColor: '#00FF6A',
              bgcolor: alpha('#00ED64', 0.1),
            },
          }}
        >
          Get Involved
        </Button>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {items.map((item) => (
        <Grid
          item
          xs={gridColumns.xs * 12}
          sm={(12 / gridColumns.sm)}
          md={(12 / gridColumns.md)}
          lg={(12 / gridColumns.lg)}
          key={item.id}
        >
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
              border: '1px solid',
              borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1),
              transition: 'all 0.2s ease',
              cursor: onItemClick ? 'pointer' : 'default',
              '&:hover': {
                borderColor: getCategoryColor(item.category),
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha(getCategoryColor(item.category), 0.2)}`,
              },
            }}
            onClick={() => onItemClick?.(item)}
          >
            {item.thumbnailUrl && (
              <CardMedia
                component="img"
                height="180"
                image={item.thumbnailUrl}
                alt={item.title}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1),
                }}
              />
            )}

            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={item.category}
                  size="small"
                  sx={{
                    bgcolor: alpha(getCategoryColor(item.category), 0.15),
                    color: getCategoryColor(item.category),
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    textTransform: 'capitalize',
                  }}
                />
                {item.featured && (
                  <Star sx={{ color: '#FFD700', fontSize: 18 }} />
                )}
              </Box>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: isDark ? '#fff' : '#1a1a2e',
                  mb: 1,
                  lineHeight: 1.3,
                }}
              >
                {item.title}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: isDark ? alpha('#fff', 0.7) : alpha('#000', 0.6),
                  mb: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.description}
              </Typography>

              {item.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.65rem',
                        height: 20,
                        borderColor: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2),
                        color: isDark ? alpha('#fff', 0.6) : alpha('#000', 0.5),
                      }}
                    />
                  ))}
                  {item.tags.length > 3 && (
                    <Chip
                      label={`+${item.tags.length - 3}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.65rem',
                        height: 20,
                        borderColor: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2),
                        color: isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4),
                      }}
                    />
                  )}
                </Box>
              )}
            </CardContent>

            <CardActions
              sx={{
                px: 2,
                py: 1.5,
                borderTop: '1px solid',
                borderColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Visibility sx={{ fontSize: 16, color: isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4) }} />
                  <Typography variant="caption" sx={{ color: isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5) }}>
                    {item.views}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Favorite sx={{ fontSize: 16, color: isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4) }} />
                  <Typography variant="caption" sx={{ color: isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5) }}>
                    {item.likes}
                  </Typography>
                </Box>
              </Box>

              <Box>
                {item.sourceUrl && (
                  <IconButton
                    size="small"
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ color: isDark ? alpha('#fff', 0.5) : alpha('#000', 0.5) }}
                  >
                    <GitHub fontSize="small" />
                  </IconButton>
                )}
                {item.demoUrl && (
                  <IconButton
                    size="small"
                    href={item.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ color: '#00ED64' }}
                  >
                    <OpenInNew fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default GalleryGrid;
