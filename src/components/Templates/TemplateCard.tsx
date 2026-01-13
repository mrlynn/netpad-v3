'use client';

import { Box, Paper, Typography, Chip, alpha } from '@mui/material';
import Image from 'next/image';
import { FormTemplate } from '@/lib/templates/loader';

interface TemplateCardProps {
  template: FormTemplate;
  onClick?: (template: FormTemplate) => void;
  variant?: 'compact' | 'default';
}

export function TemplateCard({ template, onClick, variant = 'default' }: TemplateCardProps) {
  const handleClick = () => {
    onClick?.(template);
  };

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
        '&:hover': onClick ? {
          borderColor: alpha('#00ED64', 0.5),
          bgcolor: alpha('#00ED64', 0.03),
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${alpha('#00ED64', 0.1)}`,
        } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        {template.previewImageUrl ? (
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
              src={template.previewImageUrl}
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
          <Typography sx={{ fontSize: variant === 'compact' ? 24 : 28, flexShrink: 0 }}>
            {template.icon}
          </Typography>
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
            {template.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
            <Chip
              label={`${template.fields.length} fields`}
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
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
