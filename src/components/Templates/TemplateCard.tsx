'use client';

import { Box, Paper, Typography, Chip, Stack, alpha } from '@mui/material';
import { Lock, AccessTime as TimeIcon } from '@mui/icons-material';
import Image from 'next/image';
import { TemplateIcon } from './TemplateIcon';

/**
 * Unified TemplateCard component
 *
 * Works with both legacy FormTemplate (fields) and new FormTemplate (fieldConfigs).
 * Supports multiple variants for different use cases.
 */

// Accept any template shape - we'll handle both interfaces
interface BaseTemplate {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  icon: string;
  category: string;
  fields?: any[];
  fieldConfigs?: any[];
  tags?: string[];
  complexity?: 'simple' | 'moderate' | 'advanced';
  estimatedTime?: string | number;
  previewImageUrl?: string;
  previewImage?: string;
  isFeatured?: boolean;
  formType?: string;
}

interface TemplateCardProps {
  template: BaseTemplate;
  onClick?: (template: any) => void;
  variant?: 'compact' | 'default' | 'gallery';
}

// Color schemes for gallery variant
const COMPLEXITY_COLORS: Record<string, { bg: string; text: string }> = {
  simple: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  moderate: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  advanced: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
};

const FORM_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  traditional: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
  conversational: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' },
  hybrid: { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899' },
};

function formatComplexity(complexity: string): string {
  return complexity.charAt(0).toUpperCase() + complexity.slice(1);
}

export function TemplateCard({ template, onClick, variant = 'default' }: TemplateCardProps) {
  const handleClick = () => {
    onClick?.(template);
  };

  // Get fields array - support both interfaces
  const fieldsArray = template.fieldConfigs || template.fields || [];

  // Check if template has encrypted fields
  const encryptedFieldCount = fieldsArray.filter((f: any) => f.encryption?.enabled).length;
  const hasEncryptedFields = encryptedFieldCount > 0;

  // Get description - support both interfaces
  const description = template.shortDescription || template.description || '';

  // Get preview image - support both interfaces
  const previewImage = template.previewImageUrl || template.previewImage;

  // Get estimated time as string
  const estimatedTime =
    typeof template.estimatedTime === 'number'
      ? `${template.estimatedTime} min`
      : template.estimatedTime;

  // Gallery variant - full-featured card for public templates page
  if (variant === 'gallery') {
    const complexityColor = COMPLEXITY_COLORS[template.complexity || 'simple'] || COMPLEXITY_COLORS.simple;
    const formTypeColor = FORM_TYPE_COLORS[template.formType || 'traditional'] || FORM_TYPE_COLORS.traditional;

    return (
      <Paper
        elevation={0}
        onClick={handleClick}
        sx={{
          p: 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: onClick ? 'pointer' : 'default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          transition: 'all 0.2s ease-in-out',
          '&:hover': onClick
            ? {
                transform: 'translateY(-4px)',
                boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.common.black, 0.1)}`,
                borderColor: '#00ED64',
              }
            : {},
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(0, 237, 100, 0.08)',
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
                lineHeight: 1.3,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {template.name}
            </Typography>
            {template.isFeatured && (
              <Chip
                label="Featured"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: 'rgba(251, 191, 36, 0.15)',
                  color: '#fbbf24',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            flexGrow: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 40,
          }}
        >
          {description}
        </Typography>

        {/* Tags */}
        <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            label={formatComplexity(template.complexity || 'simple')}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              bgcolor: complexityColor.bg,
              color: complexityColor.text,
              fontWeight: 500,
            }}
          />
          <Chip
            label={
              template.formType === 'hybrid'
                ? 'Both'
                : template.formType === 'conversational'
                  ? 'AI Chat'
                  : 'Form'
            }
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              bgcolor: formTypeColor.bg,
              color: formTypeColor.text,
              fontWeight: 500,
            }}
          />
          {estimatedTime && (
            <Chip
              icon={<TimeIcon sx={{ fontSize: 12 }} />}
              label={estimatedTime}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                bgcolor: 'rgba(100, 116, 139, 0.1)',
                color: 'text.secondary',
                '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
              }}
            />
          )}
          {hasEncryptedFields && (
            <Chip
              icon={<Lock sx={{ fontSize: 12 }} />}
              label={`${encryptedFieldCount} secure`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                bgcolor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                fontWeight: 600,
                '& .MuiChip-icon': { color: '#22c55e', ml: 0.5 },
              }}
            />
          )}
        </Stack>

        {/* Learn More Button */}
        <Box
          sx={{
            mt: 'auto',
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Chip
            label="Learn More"
            clickable
            sx={{
              bgcolor: 'rgba(0, 237, 100, 0.1)',
              color: '#00ED64',
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(0, 237, 100, 0.2)' },
            }}
          />
        </Box>
      </Paper>
    );
  }

  // Compact and default variants - simpler cards for sidebars/pickers
  return (
    <Paper
      elevation={0}
      onClick={handleClick}
      sx={{
        flex: variant === 'compact' ? '1 1 calc(50% - 6px)' : '1 1 280px',
        minWidth: variant === 'compact' ? 180 : 240,
        maxWidth: variant === 'compact' ? 'calc(50% - 6px)' : 320,
        p: variant === 'compact' ? 1.5 : 2,
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.15s ease',
        '&:hover': onClick
          ? {
              borderColor: alpha('#00ED64', 0.5),
              bgcolor: alpha('#00ED64', 0.03),
              transform: 'translateY(-1px)',
              boxShadow: `0 4px 12px ${alpha('#00ED64', 0.1)}`,
            }
          : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        {previewImage ? (
          <Box
            sx={{
              flexShrink: 0,
              width: variant === 'compact' ? 48 : 56,
              height: variant === 'compact' ? 48 : 56,
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Image
              src={previewImage}
              alt={template.name}
              width={variant === 'compact' ? 48 : 56}
              height={variant === 'compact' ? 48 : 56}
              style={{
                objectFit: 'cover',
                width: '100%',
                height: '100%',
              }}
            />
          </Box>
        ) : (
          <TemplateIcon icon={template.icon} size={variant === 'compact' ? 24 : 28} sx={{ flexShrink: 0 }} />
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              mb: 0.25,
              fontSize: variant === 'compact' ? 13 : 14,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {template.name}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              whiteSpace: variant === 'compact' ? 'nowrap' : 'normal',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: variant === 'compact' ? 11 : 12,
              ...(variant !== 'compact' && {
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }),
            }}
          >
            {description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
            <Chip
              label={`${fieldsArray.length} fields`}
              size="small"
              sx={{
                fontSize: 10,
                height: 18,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
            {template.category && (
              <Chip
                label={template.category}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: 10,
                  height: 18,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}
            {hasEncryptedFields && (
              <Chip
                icon={<Lock sx={{ fontSize: 10 }} />}
                label="Secure"
                size="small"
                sx={{
                  fontSize: 10,
                  height: 18,
                  bgcolor: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                  '& .MuiChip-label': { px: 0.5 },
                  '& .MuiChip-icon': { fontSize: 10, color: '#22c55e', ml: 0.5 },
                }}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
