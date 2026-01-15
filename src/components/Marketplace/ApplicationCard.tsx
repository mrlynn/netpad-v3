/**
 * Application Card Component
 *
 * Displays a marketplace application in a card format.
 * Shows preview information and actions.
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
  Stack,
} from '@mui/material';
import {
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Link as LinkIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  Visibility as ViewIcon,
  Verified as VerifiedIcon,
  CloudDownload as NpmIcon,
  InstallMobile as InstallIcon,
} from '@mui/icons-material';
import { RatingStars } from './RatingStars';
import { ApplicationManifest } from '@/types/template';

interface ApplicationCardProps {
  application: {
    id: string;
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
    formsCount: number;
    workflowsCount: number;
    connectionsCount: number;
    publishedAt?: string;
    isOfficial?: boolean;
    source?: 'web' | 'npm';
    sourcePackageName?: string;
  };
  onView: (id: string) => void;
  onImport?: (id: string) => void;
  onDownload?: (id: string) => void;
  onInstallFromNpm?: (packageName: string) => void;
}

export function ApplicationCard({
  application,
  onView,
  onImport,
  onDownload,
  onInstallFromNpm,
}: ApplicationCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
          borderColor: '#00ED64',
        },
        border: `1px solid ${alpha('#00ED64', 0.1)}`,
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          {application.icon && (
            <Typography variant="h4" sx={{ fontSize: '2rem' }}>
              {application.icon}
            </Typography>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {application.name}
              </Typography>
              {application.isOfficial && (
                <Tooltip title="Official NetPad Application">
                  <Chip
                    icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                    label="Official"
                    size="small"
                    color="primary"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      '& .MuiChip-icon': {
                        fontSize: 14,
                      },
                    }}
                  />
                </Tooltip>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                v{application.version} • {application.category}
              </Typography>
              {application.source === 'npm' && application.sourcePackageName && (
                <Chip
                  icon={<NpmIcon sx={{ fontSize: 12 }} />}
                  label="npm"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: alpha('#CB3837', 0.1),
                    color: '#CB3837',
                    border: `1px solid ${alpha('#CB3837', 0.3)}`,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {application.summary || application.description || 'No description available'}
        </Typography>

        {/* Stats */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FormIcon fontSize="small" color="action" />
            <Typography variant="caption">{application.formsCount}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <WorkflowIcon fontSize="small" color="action" />
            <Typography variant="caption">{application.workflowsCount}</Typography>
          </Box>
          {application.connectionsCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LinkIcon fontSize="small" sx={{ color: '#00ED64' }} />
              <Typography variant="caption" sx={{ color: '#00ED64' }}>
                {application.connectionsCount}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
            <DownloadIcon fontSize="small" color="action" />
            <Typography variant="caption">{application.stats.downloads}</Typography>
          </Box>
          {application.stats.rating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <StarIcon fontSize="small" sx={{ color: '#FFA500' }} />
              <Typography variant="caption">{application.stats.rating.toFixed(1)}</Typography>
            </Box>
          )}
        </Stack>

        {/* Tags */}
        {application.tags && application.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {application.tags.slice(0, 3).map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                }}
              />
            ))}
            {application.tags.length > 3 && (
              <Chip
                label={`+${application.tags.length - 3}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha('#00ED64', 0.05),
                  color: 'text.secondary',
                }}
              />
            )}
          </Box>
        )}

        {/* Author / Package Info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {application.author && (
            <Typography variant="caption" color="text.secondary">
              by {application.author.name}
            </Typography>
          )}
          {application.source === 'npm' && application.sourcePackageName && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {application.sourcePackageName}
            </Typography>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
        <Button
          size="small"
          startIcon={<ViewIcon />}
          onClick={() => onView(application.id)}
          sx={{
            color: '#00ED64',
            '&:hover': {
              bgcolor: alpha('#00ED64', 0.08),
            },
          }}
        >
          View
        </Button>
        {application.source === 'npm' && application.sourcePackageName && onInstallFromNpm ? (
          <Button
            size="small"
            variant="contained"
            startIcon={<InstallIcon />}
            onClick={() => onInstallFromNpm(application.sourcePackageName!)}
            sx={{
              ml: 'auto',
              bgcolor: '#CB3837',
              '&:hover': {
                bgcolor: '#A32A2A',
              },
            }}
          >
            Install from npm
          </Button>
        ) : onImport ? (
          <Button
            size="small"
            variant="contained"
            onClick={() => onImport(application.id)}
            sx={{
              ml: 'auto',
              bgcolor: '#00ED64',
              '&:hover': {
                bgcolor: '#00CC55',
              },
            }}
          >
            Import
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
                  color: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.08),
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
