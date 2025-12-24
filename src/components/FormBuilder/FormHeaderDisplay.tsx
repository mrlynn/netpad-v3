'use client';

import { Box, Typography, alpha } from '@mui/material';
import { FormHeader } from '@/types/form';

interface FormHeaderDisplayProps {
  header?: FormHeader;
  title?: string;
  description?: string;
  editable?: boolean;
}

export function FormHeaderDisplay({
  header,
  title,
  description,
  editable = false,
}: FormHeaderDisplayProps) {
  if (!header || header.type === 'none') {
    return null;
  }

  const getHeaderStyle = (): React.CSSProperties => {
    const radius = header.borderRadius ?? 8;
    const style: React.CSSProperties = {
      height: header.height || 200,
      position: 'relative',
      borderRadius: radius,
      overflow: 'hidden',
      marginBottom: 0,
    };

    if (header.type === 'color') {
      style.backgroundColor = header.color || '#673AB7';
    } else if (header.type === 'gradient') {
      const directionMap: Record<string, string> = {
        'to-right': 'to right',
        'to-bottom': 'to bottom',
        'to-bottom-right': 'to bottom right',
        'to-bottom-left': 'to bottom left',
      };
      const direction = directionMap[header.gradientDirection || 'to-right'] || 'to right';
      style.background = `linear-gradient(${direction}, ${header.color || '#7F00FF'}, ${header.gradientEndColor || '#E100FF'})`;
    } else if (header.type === 'image') {
      style.backgroundImage = `url(${header.imageUrl})`;
      style.backgroundSize = header.imageFit || 'cover';
      style.backgroundPosition = header.imagePosition || 'center';
      style.backgroundRepeat = 'no-repeat';
    }

    return style;
  };

  const showTitle = header.showTitle !== false && title;
  const showDescription = header.showDescription !== false && description;

  return (
    <Box sx={getHeaderStyle()}>
      {/* Overlay for image headers */}
      {header.type === 'image' && header.overlay && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: header.overlayColor || '#000000',
            opacity: header.overlayOpacity || 0.3,
          }}
        />
      )}

      {/* Title and description container */}
      {(showTitle || showDescription) && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 3,
            zIndex: 1,
            // Subtle gradient overlay for better text readability
            background: header.type === 'image'
              ? 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)'
              : 'transparent',
          }}
        >
          {showTitle && (
            <Typography
              variant="h4"
              sx={{
                color: header.titleColor || '#ffffff',
                fontWeight: 700,
                mb: showDescription ? 0.5 : 0,
                textShadow: header.type === 'image' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
          )}
          {showDescription && (
            <Typography
              variant="body1"
              sx={{
                color: header.descriptionColor || 'rgba(255,255,255,0.9)',
                textShadow: header.type === 'image' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                maxWidth: 600,
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
      )}

      {/* Edit hint for editable mode */}
      {editable && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: alpha('#000', 0.5),
            color: '#fff',
            fontSize: '0.7rem',
            opacity: 0,
            transition: 'opacity 0.2s',
            '.MuiBox-root:hover > &': {
              opacity: 1,
            },
          }}
        >
          Edit in Settings → Theme
        </Box>
      )}
    </Box>
  );
}
