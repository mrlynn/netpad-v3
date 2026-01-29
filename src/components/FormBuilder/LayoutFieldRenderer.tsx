'use client';

import { Box, Typography, Divider, alpha, useTheme } from '@mui/material';
import { LayoutConfig } from '@/types/form';
import { sanitizeHtml } from './RichTextEditor';

interface LayoutFieldRendererProps {
  layout: LayoutConfig;
  editable?: boolean; // If true, show edit affordances
}

/**
 * Renders HTML content safely
 */
function HtmlContent({
  html,
  variant = 'body2',
  sx = {}
}: {
  html: string;
  variant?: 'body2' | 'h6';
  sx?: object;
}) {
  const sanitized = sanitizeHtml(html);

  return (
    <Typography
      variant={variant}
      component="div"
      sx={{
        '& a': {
          color: 'primary.main',
          textDecoration: 'underline',
        },
        '& ul, & ol': {
          pl: 3,
          my: 0.5,
        },
        '& li': {
          mb: 0.25,
        },
        '& p': {
          my: 0.5,
        },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/**
 * Renders layout/display-only elements in forms
 * Similar to Google Forms section headers, descriptions, etc.
 */
export function LayoutFieldRenderer({ layout, editable = false }: LayoutFieldRendererProps) {
  const muiTheme = useTheme();
  const isDarkMode = muiTheme.palette.mode === 'dark';
  const isHtml = layout.contentType === 'html';

  switch (layout.type) {
    case 'section-header':
      return (
        <Box
          sx={{
            py: 2,
            borderBottom: '2px solid',
            borderColor: layout.borderColor || alpha('#00ED64', 0.3),
            bgcolor: layout.backgroundColor || 'transparent',
            ...(layout.padding && { p: layout.padding / 8 })
          }}
        >
          {isHtml && layout.title ? (
            <HtmlContent
              html={layout.title}
              variant="h6"
              sx={{
                fontWeight: 600,
                color: layout.textColor || 'text.primary',
                mb: layout.subtitle ? 0.5 : 0
              }}
            />
          ) : (
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: layout.textColor || 'text.primary',
                mb: layout.subtitle ? 0.5 : 0
              }}
            >
              {layout.title}
            </Typography>
          )}
          {layout.subtitle && (
            isHtml ? (
              <HtmlContent
                html={layout.subtitle}
                sx={{ color: layout.textColor || 'text.secondary' }}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: layout.textColor || 'text.secondary' }}
              >
                {layout.subtitle}
              </Typography>
            )
          )}
        </Box>
      );

    case 'description':
      return (
        <Box
          sx={{
            py: 1.5,
            px: 2,
            bgcolor: layout.backgroundColor || (isDarkMode ? alpha('#2196f3', 0.12) : alpha('#2196f3', 0.05)),
            borderRadius: 1,
            borderLeft: '3px solid',
            borderColor: layout.borderColor || '#2196f3',
            ...(layout.padding && { p: layout.padding / 8 })
          }}
        >
          {isHtml && layout.content ? (
            <HtmlContent
              html={layout.content}
              sx={{
                color: layout.textColor || 'text.secondary',
                lineHeight: 1.6
              }}
            />
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: layout.textColor || 'text.secondary',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6
              }}
            >
              {layout.content}
            </Typography>
          )}
        </Box>
      );

    case 'divider':
      return (
        <Divider
          sx={{
            my: 2,
            borderColor: layout.borderColor || 'divider'
          }}
        />
      );

    case 'image':
      return (
        <Box
          sx={{
            py: 2,
            display: 'flex',
            justifyContent: layout.imageAlignment || 'center',
            ...(layout.padding && { p: layout.padding / 8 })
          }}
        >
          <Box
            component="img"
            src={layout.imageUrl}
            alt={layout.imageAlt || ''}
            sx={{
              maxWidth: '100%',
              width: layout.imageWidth === 'full'
                ? '100%'
                : layout.imageWidth === 'auto' || !layout.imageWidth
                  ? 'auto'
                  : layout.imageWidth,
              height: 'auto',
              borderRadius: 1,
              border: '1px solid',
              borderColor: layout.borderColor || 'divider'
            }}
          />
        </Box>
      );

    case 'spacer':
      return (
        <Box
          sx={{
            height: layout.height || 24,
            bgcolor: editable ? alpha('#9c27b0', 0.05) : 'transparent',
            borderRadius: editable ? 1 : 0,
            border: editable ? '1px dashed' : 'none',
            borderColor: editable ? alpha('#9c27b0', 0.3) : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {editable && (
            <Typography variant="caption" color="text.disabled">
              Spacer ({layout.height || 24}px)
            </Typography>
          )}
        </Box>
      );

    default:
      return null;
  }
}
