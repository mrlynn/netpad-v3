/**
 * Featured Templates Section
 *
 * Displays a selection of featured templates for quick access.
 * Used in the empty state when no forms exist in an application.
 */

'use client';

import { useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  alpha,
  Button,
  useTheme,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import Link from 'next/link';
import { TemplateIcon } from './TemplateIcon';
import { loadFeaturedGalleryTemplates, convertGalleryToLegacy } from '@/lib/templates/loader';
import type { FormTemplate as NewFormTemplate } from '@/types/formTemplate';

interface FeaturedTemplatesSectionProps {
  /** Base URL for creating a form (e.g., /apps/my-app/forms/new) */
  createFormBaseUrl: string;
  /** URL to browse all templates */
  browseTemplatesUrl?: string;
  /** Maximum number of templates to show */
  limit?: number;
  /** Callback when a template is selected (alternative to URL navigation) */
  onTemplateSelect?: (template: NewFormTemplate) => void;
}

// Complexity badge colors
const COMPLEXITY_COLORS: Record<string, { bg: string; text: string }> = {
  simple: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  moderate: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  advanced: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
};

export function FeaturedTemplatesSection({
  createFormBaseUrl,
  browseTemplatesUrl = '/templates',
  limit = 6,
  onTemplateSelect,
}: FeaturedTemplatesSectionProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Load featured templates
  const featuredTemplates = useMemo(() => {
    return loadFeaturedGalleryTemplates(limit);
  }, [limit]);

  if (featuredTemplates.length === 0) {
    return null;
  }

  const handleTemplateClick = (template: NewFormTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
    // If no callback, the Link component handles navigation
  };

  return (
    <Box>
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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            Start with a Template
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose from popular templates to get started quickly
          </Typography>
        </Box>
        <Button
          component={Link}
          href={browseTemplatesUrl}
          endIcon={<ArrowForward />}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            color: theme.palette.primary.main,
          }}
        >
          Browse All Templates
        </Button>
      </Box>

      {/* Templates Grid */}
      <Grid container spacing={2}>
        {featuredTemplates.map((template) => {
          const complexityColor = COMPLEXITY_COLORS[template.complexity] || COMPLEXITY_COLORS.simple;
          const templateUrl = `${createFormBaseUrl}?template=${template.id}`;

          return (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card
                sx={{
                  height: '100%',
                  bgcolor: isDark
                    ? alpha(theme.palette.background.paper, 0.6)
                    : 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea
                  component={onTemplateSelect ? 'div' : Link}
                  href={onTemplateSelect ? undefined : templateUrl}
                  onClick={onTemplateSelect ? () => handleTemplateClick(template) : undefined}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Icon and Title */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 1.5,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <TemplateIcon icon={template.icon} size={24} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            lineHeight: 1.3,
                            mb: 0.5,
                          }}
                        >
                          {template.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.4,
                          }}
                        >
                          {template.shortDescription}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Metadata Chips */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={template.complexity}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                          bgcolor: complexityColor.bg,
                          color: complexityColor.text,
                          border: 'none',
                        }}
                      />
                      <Chip
                        label={`${template.fieldConfigs.length} fields`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          bgcolor: alpha(theme.palette.text.primary, 0.08),
                          color: 'text.secondary',
                        }}
                      />
                      <Chip
                        label={`~${template.estimatedTime} min`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          bgcolor: alpha(theme.palette.text.primary, 0.08),
                          color: 'text.secondary',
                        }}
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
