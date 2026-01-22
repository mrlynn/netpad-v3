/**
 * Application Card Component
 *
 * Displays a marketplace application in a card format.
 * Redesigned for reduced density and improved visual hierarchy.
 */

'use client';

import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Verified as VerifiedIcon,
  CloudDownload as NpmIcon,
  InstallMobile as InstallIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as BundleIcon,
} from '@mui/icons-material';
import { MarketplaceItemType } from '@/types/template';

interface MarketplaceItem {
  id: string;
  /** Item type: application (bundle), form (standalone), or workflow (standalone) */
  itemType?: MarketplaceItemType;
  name: string;
  summary?: string;
  description?: string;
  version: string;
  category: string;
  tags?: string[];
  icon?: string;
  author?: { name: string; email?: string; url?: string };
  license?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  // Application-specific fields
  formsCount?: number;
  workflowsCount?: number;
  connectionsCount?: number;
  // Form-specific fields
  fieldCount?: number;
  formType?: 'traditional' | 'conversational' | 'search';
  isMultiPage?: boolean;
  hasConditionalLogic?: boolean;
  // Workflow-specific fields
  nodeCount?: number;
  triggerType?: string;
  nodeTypes?: string[];
  // Common fields
  publishedAt?: string;
  isOfficial?: boolean;
  source?: 'web' | 'npm';
  sourcePackageName?: string;
}

interface ApplicationCardProps {
  application: MarketplaceItem;
  onView: (id: string) => void;
  onImport?: (id: string) => void;
  onDownload?: (id: string) => void;
  onInstallFromNpm?: (packageName: string) => void;
  /** Whether this application has already been imported to the current context */
  isImported?: boolean;
}

// Item type theme colors following brand standards
export const ITEM_TYPE_THEMES = {
  application: {
    label: 'Application',
    icon: <BundleIcon sx={{ fontSize: 16 }} />,
    color: '#00ED64', // NetPad green (primary)
    gradientStart: '#00ED64',
    gradientEnd: '#00D4AA',
    glowColor: 'rgba(0, 237, 100, 0.15)',
    borderColor: 'rgba(0, 237, 100, 0.2)',
    hoverBorderColor: 'rgba(0, 237, 100, 0.5)',
  },
  form: {
    label: 'Form',
    icon: <FormIcon sx={{ fontSize: 16 }} />,
    color: '#58a6ff', // Info blue from brand standards
    gradientStart: '#58a6ff',
    gradientEnd: '#388bfd',
    glowColor: 'rgba(88, 166, 255, 0.12)',
    borderColor: 'rgba(88, 166, 255, 0.2)',
    hoverBorderColor: 'rgba(88, 166, 255, 0.5)',
  },
  workflow: {
    label: 'Workflow',
    icon: <WorkflowIcon sx={{ fontSize: 16 }} />,
    color: '#d29922', // Warning/amber from brand standards
    gradientStart: '#d29922',
    gradientEnd: '#f1a43c',
    glowColor: 'rgba(210, 153, 34, 0.12)',
    borderColor: 'rgba(210, 153, 34, 0.2)',
    hoverBorderColor: 'rgba(210, 153, 34, 0.5)',
  },
} as const;

// Helper function to get item type display info
export function getItemTypeInfo(itemType?: MarketplaceItemType) {
  return ITEM_TYPE_THEMES[itemType || 'application'];
}

// Format download count for display
function formatDownloads(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function ApplicationCard({
  application,
  onView,
  onImport,
  onDownload,
  onInstallFromNpm,
  isImported = false,
}: ApplicationCardProps) {
  const itemType = application.itemType || 'application';
  const typeInfo = getItemTypeInfo(itemType);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        // Subtle left accent border for type distinction
        borderLeftWidth: 3,
        borderLeftColor: typeInfo.color,
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(typeInfo.color, 0.4),
          borderLeftColor: typeInfo.color,
          boxShadow: `0 8px 24px ${typeInfo.glowColor}`,
          // Show tags on hover
          '& .tags-container': {
            opacity: 1,
            maxHeight: 60,
            mt: 1.5,
          },
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1, pt: 2 }}>
        {/* Header - Icon + Title + Verified */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          {/* Larger icon */}
          {application.icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: alpha(typeInfo.color, 0.08),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: '1.75rem', lineHeight: 1 }}>
                {application.icon}
              </Typography>
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title row with verified badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
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
                {application.name}
              </Typography>
              {application.isOfficial && (
                <Tooltip title="Official NetPad Template">
                  <VerifiedIcon sx={{ fontSize: 18, color: '#00ED64', flexShrink: 0 }} />
                </Tooltip>
              )}
            </Box>
            {/* Category */}
            <Typography variant="caption" color="text.secondary">
              {application.category}
            </Typography>
          </Box>
        </Box>

        {/* Type Pill - Prominent */}
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
            lineHeight: 1.5,
            minHeight: 42,
          }}
        >
          {application.summary || application.description || 'No description available'}
        </Typography>

        {/* Single Metric - Downloads */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <DownloadIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
          <Typography variant="caption" color="text.secondary">
            {formatDownloads(application.stats.downloads)} uses
          </Typography>
          {application.source === 'npm' && (
            <Chip
              icon={<NpmIcon sx={{ fontSize: 12 }} />}
              label="npm"
              size="small"
              sx={{
                ml: 1,
                height: 18,
                fontSize: '0.6rem',
                bgcolor: alpha('#CB3837', 0.1),
                color: '#CB3837',
                border: `1px solid ${alpha('#CB3837', 0.2)}`,
              }}
            />
          )}
        </Box>

        {/* Tags - Hidden by default, shown on hover */}
        {application.tags && application.tags.length > 0 && (
          <Box
            className="tags-container"
            sx={{
              display: 'flex',
              gap: 0.5,
              flexWrap: 'wrap',
              opacity: 0,
              maxHeight: 0,
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
          >
            {application.tags.slice(0, 4).map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  bgcolor: alpha(typeInfo.color, 0.06),
                  color: 'text.secondary',
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2, gap: 1 }}>
        <Button
          size="small"
          startIcon={<ViewIcon />}
          onClick={() => onView(application.id)}
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            '&:hover': {
              color: typeInfo.color,
              bgcolor: alpha(typeInfo.color, 0.08),
            },
          }}
        >
          Preview
        </Button>
        {application.source === 'npm' && application.sourcePackageName && onInstallFromNpm ? (
          <Button
            size="small"
            variant="contained"
            startIcon={isImported ? <CheckCircleIcon /> : <InstallIcon />}
            onClick={() => !isImported && onInstallFromNpm(application.sourcePackageName!)}
            disabled={isImported}
            sx={{
              ml: 'auto',
              fontWeight: 600,
              textTransform: 'none',
              bgcolor: isImported ? alpha('#00ED64', 0.1) : '#CB3837',
              color: isImported ? '#00ED64' : 'white',
              '&:hover': {
                bgcolor: isImported ? alpha('#00ED64', 0.15) : '#A32A2A',
              },
              '&.Mui-disabled': {
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
              },
            }}
          >
            {isImported ? 'Added' : 'Install'}
          </Button>
        ) : onImport ? (
          <Button
            size="small"
            variant="contained"
            startIcon={isImported ? <CheckCircleIcon /> : undefined}
            onClick={() => !isImported && onImport(application.id)}
            disabled={isImported}
            sx={{
              ml: 'auto',
              fontWeight: 600,
              textTransform: 'none',
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
        ) : null}
        {onDownload && (
          <Tooltip title="Download bundle">
            <IconButton
              size="small"
              onClick={() => onDownload(application.id)}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: typeInfo.color,
                  bgcolor: alpha(typeInfo.color, 0.08),
                },
              }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
}
