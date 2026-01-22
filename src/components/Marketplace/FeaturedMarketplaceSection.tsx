/**
 * Featured Marketplace Section
 *
 * Hero section at the top of the marketplace displaying official templates
 * with SpotlightCard effects for premium interactive feel.
 */

'use client';

import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  Inventory as BundleIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { SpotlightCard, hexToRgb } from '@/components/marketing/SpotlightCard';
import { MarketplaceItemType } from '@/types/template';
import { ITEM_TYPE_THEMES, getItemTypeInfo } from './ApplicationCard';

interface MarketplaceApplication {
  id: string;
  itemType?: MarketplaceItemType;
  name: string;
  summary?: string;
  description?: string;
  version: string;
  category: string;
  tags?: string[];
  icon?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  isOfficial?: boolean;
  source?: 'web' | 'npm';
  sourcePackageName?: string;
}

interface FeaturedMarketplaceSectionProps {
  items: MarketplaceApplication[];
  onView: (id: string) => void;
  onImport: (id: string) => void;
  importedAppIds: Set<string>;
  onViewAllOfficial?: () => void;
}

// Format download count for display
function formatDownloads(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function FeaturedMarketplaceSection({
  items,
  onView,
  onImport,
  importedAppIds,
  onViewAllOfficial,
}: FeaturedMarketplaceSectionProps) {
  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 4,
        p: 3,
        borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(0, 237, 100, 0.05) 0%, rgba(0, 212, 170, 0.03) 100%)',
        border: '1px solid',
        borderColor: alpha('#00ED64', 0.15),
      }}
    >
      {/* Section Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <StarIcon sx={{ color: '#fbbf24', fontSize: 24 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Official Templates
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Curated by the NetPad team
          </Typography>
        </Box>
        {onViewAllOfficial && (
          <Button
            endIcon={<ArrowForwardIcon />}
            onClick={onViewAllOfficial}
            sx={{
              color: '#00ED64',
              fontWeight: 500,
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.08),
              },
            }}
          >
            View All Official
          </Button>
        )}
      </Box>

      {/* Featured Cards Grid */}
      <Grid container spacing={2.5}>
        {items.map((item) => {
          const itemType = item.itemType || 'application';
          const typeInfo = getItemTypeInfo(itemType);
          const isImported = importedAppIds.has(item.id);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <SpotlightCard
                spotlightColor={hexToRgb(typeInfo.color)}
                spotlightOpacity={0.15}
                radius={400}
                hoverBorderColor={alpha(typeInfo.color, 0.4)}
                sx={{
                  height: '100%',
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeftWidth: 3,
                  borderLeftColor: typeInfo.color,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${typeInfo.glowColor}`,
                  },
                }}
                onClick={() => onView(item.id)}
              >
                {/* Icon Box */}
                {item.icon && (
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: alpha(typeInfo.color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                    }}
                  >
                    <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>
                      {item.icon}
                    </Typography>
                  </Box>
                )}

                {/* Title + Verified */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Tooltip title="Official NetPad Template">
                    <VerifiedIcon sx={{ fontSize: 18, color: '#00ED64', flexShrink: 0 }} />
                  </Tooltip>
                </Box>

                {/* Type Pill */}
                <Chip
                  icon={typeInfo.icon}
                  label={typeInfo.label}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(typeInfo.color, 0.12),
                    color: typeInfo.color,
                    border: `1px solid ${alpha(typeInfo.color, 0.35)}`,
                    mb: 1.5,
                    '& .MuiChip-icon': {
                      fontSize: 16,
                      color: typeInfo.color,
                    },
                  }}
                />

                {/* Description */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 40,
                    lineHeight: 1.5,
                    fontSize: '0.8125rem',
                  }}
                >
                  {item.summary || item.description || 'No description available'}
                </Typography>

                {/* Stats */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                  <DownloadIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDownloads(item.stats.downloads)} uses
                  </Typography>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(item.id);
                    }}
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      '&:hover': {
                        color: typeInfo.color,
                        bgcolor: alpha(typeInfo.color, 0.08),
                      },
                    }}
                  >
                    Preview
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={isImported ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isImported) {
                        onImport(item.id);
                      }
                    }}
                    disabled={isImported}
                    sx={{
                      flex: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      bgcolor: isImported ? alpha(typeInfo.color, 0.1) : typeInfo.color,
                      color: isImported ? typeInfo.color : 'white',
                      '&:hover': {
                        bgcolor: isImported ? alpha(typeInfo.color, 0.15) : alpha(typeInfo.color, 0.85),
                      },
                      '&.Mui-disabled': {
                        bgcolor: alpha(typeInfo.color, 0.1),
                        color: typeInfo.color,
                      },
                    }}
                  >
                    {isImported ? 'Added' : 'Use This'}
                  </Button>
                </Box>
              </SpotlightCard>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
