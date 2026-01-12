'use client';

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { NodeProps, NodeResizer, NodeResizeControl } from 'reactflow';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Circle as CircleIcon,
  DragIndicator as DragIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { WorkflowNode, StickyNoteStyle, StickyNotePreset } from '@/types/workflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================
// STYLE PRESETS
// ============================================

/**
 * Predefined style presets for quick selection
 * Organized into categories: Solids, Gradients, Special Effects
 */
export const STICKY_NOTE_PRESETS: StickyNotePreset[] = [
  // === SOLID COLORS ===
  {
    name: 'Yellow',
    style: { bgType: 'solid', bgColor: '#FFF9C4', borderColor: '#FBC02D', textColor: 'dark' },
    preview: { bg: '#FFF9C4', border: '#FBC02D', text: 'dark' },
  },
  {
    name: 'Green',
    style: { bgType: 'solid', bgColor: '#C8E6C9', borderColor: '#66BB6A', textColor: 'dark' },
    preview: { bg: '#C8E6C9', border: '#66BB6A', text: 'dark' },
  },
  {
    name: 'Blue',
    style: { bgType: 'solid', bgColor: '#BBDEFB', borderColor: '#42A5F5', textColor: 'dark' },
    preview: { bg: '#BBDEFB', border: '#42A5F5', text: 'dark' },
  },
  {
    name: 'Pink',
    style: { bgType: 'solid', bgColor: '#F8BBD0', borderColor: '#EC407A', textColor: 'dark' },
    preview: { bg: '#F8BBD0', border: '#EC407A', text: 'dark' },
  },
  {
    name: 'Orange',
    style: { bgType: 'solid', bgColor: '#FFE0B2', borderColor: '#FFA726', textColor: 'dark' },
    preview: { bg: '#FFE0B2', border: '#FFA726', text: 'dark' },
  },
  {
    name: 'Purple',
    style: { bgType: 'solid', bgColor: '#E1BEE7', borderColor: '#AB47BC', textColor: 'dark' },
    preview: { bg: '#E1BEE7', border: '#AB47BC', text: 'dark' },
  },
  {
    name: 'White',
    style: { bgType: 'solid', bgColor: '#FFFFFF', borderColor: '#E0E0E0', textColor: 'dark' },
    preview: { bg: '#FFFFFF', border: '#E0E0E0', text: 'dark' },
  },
  {
    name: 'Dark',
    style: { bgType: 'solid', bgColor: '#2D2D2D', borderColor: '#4A4A4A', textColor: 'light' },
    preview: { bg: '#2D2D2D', border: '#4A4A4A', text: 'light' },
  },

  // === GRADIENTS ===
  {
    name: 'Ocean',
    style: {
      bgType: 'gradient',
      gradient: { type: 'linear', angle: 135, colors: ['#667eea', '#764ba2'] },
      borderColor: '#667eea',
      textColor: 'light',
    },
    preview: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#667eea', text: 'light' },
  },
  {
    name: 'Sunset',
    style: {
      bgType: 'gradient',
      gradient: { type: 'linear', angle: 135, colors: ['#f093fb', '#f5576c'] },
      borderColor: '#f5576c',
      textColor: 'light',
    },
    preview: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: '#f5576c', text: 'light' },
  },
  {
    name: 'Forest',
    style: {
      bgType: 'gradient',
      gradient: { type: 'linear', angle: 135, colors: ['#11998e', '#38ef7d'] },
      borderColor: '#11998e',
      textColor: 'light',
    },
    preview: { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', border: '#11998e', text: 'light' },
  },
  {
    name: 'Midnight',
    style: {
      bgType: 'gradient',
      gradient: { type: 'linear', angle: 135, colors: ['#232526', '#414345'] },
      borderColor: '#414345',
      textColor: 'light',
    },
    preview: { bg: 'linear-gradient(135deg, #232526 0%, #414345 100%)', border: '#414345', text: 'light' },
  },
  {
    name: 'Peach',
    style: {
      bgType: 'gradient',
      gradient: { type: 'linear', angle: 135, colors: ['#ffecd2', '#fcb69f'] },
      borderColor: '#fcb69f',
      textColor: 'dark',
    },
    preview: { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', border: '#fcb69f', text: 'dark' },
  },
  {
    name: 'Lavender',
    style: {
      bgType: 'gradient',
      gradient: { type: 'linear', angle: 135, colors: ['#e0c3fc', '#8ec5fc'] },
      borderColor: '#8ec5fc',
      textColor: 'dark',
    },
    preview: { bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', border: '#8ec5fc', text: 'dark' },
  },

  // === SPECIAL EFFECTS ===
  {
    name: 'Glass',
    style: {
      bgType: 'solid',
      bgColor: 'rgba(255, 255, 255, 0.25)',
      borderColor: 'rgba(255, 255, 255, 0.4)',
      borderStyle: 'solid',
      opacity: 0.85,
      blur: true,
      textColor: 'light',
    },
    preview: { bg: 'rgba(255, 255, 255, 0.25)', border: 'rgba(255, 255, 255, 0.4)', text: 'light' },
  },
  {
    name: 'Neon Green',
    style: {
      bgType: 'solid',
      bgColor: '#1a1a2e',
      borderColor: '#00ff88',
      borderStyle: 'glow',
      textColor: 'light',
    },
    preview: { bg: '#1a1a2e', border: '#00ff88', text: 'light' },
  },
  {
    name: 'Neon Blue',
    style: {
      bgType: 'solid',
      bgColor: '#1a1a2e',
      borderColor: '#00d4ff',
      borderStyle: 'glow',
      textColor: 'light',
    },
    preview: { bg: '#1a1a2e', border: '#00d4ff', text: 'light' },
  },
  {
    name: 'Neon Pink',
    style: {
      bgType: 'solid',
      bgColor: '#1a1a2e',
      borderColor: '#ff00ff',
      borderStyle: 'glow',
      textColor: 'light',
    },
    preview: { bg: '#1a1a2e', border: '#ff00ff', text: 'light' },
  },
];

// Legacy color array for backward compatibility
const STICKY_COLORS = STICKY_NOTE_PRESETS.slice(0, 8).map((preset) => ({
  name: preset.name,
  value: preset.style.bgColor || preset.preview.bg,
  border: preset.style.borderColor || preset.preview.border,
}));

// Default sticky note dimensions
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 150;
const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

// ============================================
// STYLE UTILITIES
// ============================================

/**
 * Generate CSS background value from style
 */
function getBackgroundCSS(style: StickyNoteStyle): string {
  if (style.bgType === 'gradient' && style.gradient) {
    const { type, angle, colors } = style.gradient;
    if (type === 'radial') {
      return `radial-gradient(circle, ${colors.join(', ')})`;
    }
    return `linear-gradient(${angle || 135}deg, ${colors.join(', ')})`;
  }
  return style.bgColor || '#FFF9C4';
}

/**
 * Get text color based on style settings
 */
function getTextColor(style: StickyNoteStyle): string {
  if (style.textColor === 'light') return '#FFFFFF';
  if (style.textColor === 'dark') return '#1a1a1a';
  if (style.textColor && style.textColor !== 'auto') return style.textColor;
  // Default to dark for backward compatibility
  return '#1a1a1a';
}

/**
 * Get border CSS based on style
 */
function getBorderCSS(style: StickyNoteStyle, selected: boolean): string {
  const width = style.borderWidth || 2;
  const color = selected ? (style.borderColor || '#FBC02D') : 'transparent';

  if (style.borderStyle === 'dashed') {
    return `${width}px dashed ${color}`;
  }
  if (style.borderStyle === 'none') {
    return 'none';
  }
  return `${width}px solid ${color}`;
}

/**
 * Get box shadow for glow effect
 */
function getGlowShadow(style: StickyNoteStyle, selected: boolean): string | undefined {
  if (style.borderStyle === 'glow' && selected) {
    const glowColor = style.borderColor || '#00ff88';
    return `0 0 10px ${glowColor}, 0 0 20px ${alpha(glowColor, 0.5)}, 0 0 30px ${alpha(glowColor, 0.3)}`;
  }
  return undefined;
}

/**
 * Convert legacy bgColor to full StickyNoteStyle
 */
function getStyleFromConfig(config: Record<string, unknown>): StickyNoteStyle {
  // Check if we have a full style object
  if (config.style && typeof config.style === 'object') {
    return config.style as StickyNoteStyle;
  }

  // Legacy: convert bgColor to style
  const bgColor = (config.bgColor as string) || '#FFF9C4';
  const preset = STICKY_NOTE_PRESETS.find(
    (p) => p.style.bgColor === bgColor || p.preview.bg === bgColor
  );

  if (preset) {
    return preset.style;
  }

  // Create a basic solid style from the color
  return {
    bgType: 'solid',
    bgColor,
    borderColor: darkenColor(bgColor, 0.3),
    textColor: 'dark',
  };
}

/**
 * Simple color darkening for auto border color
 */
function darkenColor(hex: string, amount: number): string {
  // Handle rgba colors
  if (hex.startsWith('rgba')) return hex;

  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface StickyNoteData extends WorkflowNode {
  onContentChange?: (content: string) => void;
}

function StickyNoteComponent({
  data,
  selected,
  id,
}: NodeProps<StickyNoteData>) {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(data.config?.content as string || '');
  const [colorAnchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get current style from config (supports both legacy bgColor and new style object)
  const currentStyle = getStyleFromConfig(data.config || {});
  const textColor = getTextColor(currentStyle);
  const bgCSS = getBackgroundCSS(currentStyle);
  const borderColor = currentStyle.borderColor || '#FBC02D';
  const glowShadow = getGlowShadow(currentStyle, selected || false);

  // Find matching preset for highlighting in menu
  const currentPreset = STICKY_NOTE_PRESETS.find(
    (p) =>
      (p.style.bgColor === currentStyle.bgColor && p.style.bgType === 'solid') ||
      (p.style.bgType === 'gradient' &&
        currentStyle.bgType === 'gradient' &&
        JSON.stringify(p.style.gradient) === JSON.stringify(currentStyle.gradient))
  );

  // Note: We no longer use fixed width/height here since React Flow's NodeResizer
  // controls the node container size. The Paper fills 100% of the container.

  // Use the config content when not editing, local content when editing
  const externalContent = (data.config?.content as string) || '';
  const content = isEditing ? localContent : externalContent;

  // Sync local content from config when it changes externally and we're not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalContent(externalContent);
    }
  }, [externalContent, isEditing]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  // Handle double-click to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Sync local content with external content before entering edit mode
    setLocalContent(externalContent);
    setIsEditing(true);
  }, [externalContent]);

  // Handle blur to save
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (data.onContentChange) {
      data.onContentChange(localContent);
    }
  }, [localContent, data]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      if (data.onContentChange) {
        data.onContentChange(localContent);
      }
    }
  }, [localContent, data]);

  // Color menu handlers
  const handleColorMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setColorAnchorEl(event.currentTarget);
  };

  const handleColorMenuClose = () => {
    setColorAnchorEl(null);
  };

  const handlePresetSelect = (preset: StickyNotePreset) => {
    // Dispatch a custom event for style change
    const event = new CustomEvent('stickyNoteStyleChange', {
      detail: { nodeId: id, style: preset.style }
    });
    window.dispatchEvent(event);
    handleColorMenuClose();
  };

  // Legacy handler for backward compatibility
  const handleColorSelect = (color: typeof STICKY_COLORS[0]) => {
    const preset = STICKY_NOTE_PRESETS.find(p => p.style.bgColor === color.value);
    if (preset) {
      handlePresetSelect(preset);
    } else {
      // Fallback: dispatch legacy color change event
      const event = new CustomEvent('stickyNoteColorChange', {
        detail: { nodeId: id, color: color.value }
      });
      window.dispatchEvent(event);
      handleColorMenuClose();
    }
  };

  return (
    <>
      {/* Node Resizer - only show when selected */}
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        handleStyle={{
          width: 8,
          height: 8,
          backgroundColor: borderColor,
          borderRadius: 2,
        }}
        lineStyle={{
          borderColor: borderColor,
          borderWidth: 1,
        }}
      />

      <Paper
        elevation={selected ? 4 : 2}
        onDoubleClick={handleDoubleClick}
        sx={{
          // Fill the entire node container - React Flow's NodeResizer controls the actual size
          width: '100%',
          height: '100%',
          minWidth: MIN_WIDTH,
          minHeight: MIN_HEIGHT,
          background: bgCSS,
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          border: getBorderCSS(currentStyle, selected || false),
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          cursor: isEditing ? 'text' : 'grab',
          // Glass effect
          ...(currentStyle.blur && {
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }),
          // Opacity
          ...(currentStyle.opacity !== undefined && {
            opacity: currentStyle.opacity,
          }),
          '&:hover': {
            boxShadow: glowShadow || theme.shadows[4],
          },
          // Glow effect when selected
          ...(glowShadow && {
            boxShadow: glowShadow,
          }),
        }}
      >
        {/* Header bar with color picker - visible on hover or when selected */}
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.2s ease',
            '& .MuiIconButton-root': {
              width: 24,
              height: 24,
              padding: 0,
            },
          }}
          className="sticky-note-controls"
        >
          <IconButton
            size="small"
            onClick={handleColorMenuOpen}
            sx={{
              bgcolor: alpha(borderColor, 0.2),
              '&:hover': {
                bgcolor: alpha(borderColor, 0.4),
              },
            }}
          >
            <PaletteIcon sx={{ fontSize: 14, color: borderColor }} />
          </IconButton>
        </Box>

        {/* Drag handle indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            left: 4,
            opacity: selected ? 0.5 : 0,
            transition: 'opacity 0.2s ease',
            color: borderColor,
          }}
        >
          <DragIcon sx={{ fontSize: 16 }} />
        </Box>

        {/* Content area */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            p: 1.5,
            pt: 2.5,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: alpha(borderColor, 0.3),
              borderRadius: 2,
            },
          }}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Write your note here... (Markdown supported)"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: textColor,
              }}
            />
          ) : content ? (
            <Box
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: textColor,
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  mt: 0,
                  mb: 0.5,
                  lineHeight: 1.3,
                  color: textColor,
                },
                '& h1': { fontSize: '1.25rem' },
                '& h2': { fontSize: '1.1rem' },
                '& h3': { fontSize: '1rem' },
                '& p': {
                  my: 0.5,
                },
                '& ul, & ol': {
                  pl: 2,
                  my: 0.5,
                },
                '& li': {
                  my: 0.25,
                },
                '& a': {
                  color: currentStyle.textColor === 'light' ? '#90CAF9' : theme.palette.primary.main,
                  textDecoration: 'underline',
                },
                '& code': {
                  bgcolor: alpha(borderColor, 0.15),
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                },
                '& pre': {
                  bgcolor: alpha(borderColor, 0.15),
                  p: 1,
                  borderRadius: 1,
                  overflow: 'auto',
                  '& code': {
                    bgcolor: 'transparent',
                    p: 0,
                  },
                },
                '& blockquote': {
                  borderLeft: `3px solid ${borderColor}`,
                  ml: 0,
                  pl: 1.5,
                  opacity: 0.8,
                },
                '& img': {
                  maxWidth: '100%',
                  borderRadius: 1,
                },
                '& hr': {
                  border: 'none',
                  borderTop: `1px solid ${alpha(borderColor, 0.5)}`,
                  my: 1,
                },
                '& table': {
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '0.8rem',
                },
                '& th, & td': {
                  border: `1px solid ${alpha(borderColor, 0.3)}`,
                  p: 0.5,
                },
                '& th': {
                  bgcolor: alpha(borderColor, 0.1),
                },
                '& input[type="checkbox"]': {
                  mr: 0.5,
                },
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: alpha(textColor, 0.5),
                fontStyle: 'italic',
              }}
            >
              Double-click to add a note...
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Style picker menu */}
      <Menu
        anchorEl={colorAnchorEl}
        open={Boolean(colorAnchorEl)}
        onClose={handleColorMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: { maxHeight: 400, minWidth: 180 },
          },
        }}
      >
        {/* Solid Colors */}
        <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary', display: 'block' }}>
          Solid Colors
        </Typography>
        {STICKY_NOTE_PRESETS.slice(0, 8).map((preset) => (
          <MenuItem
            key={preset.name}
            onClick={() => handlePresetSelect(preset)}
            selected={currentPreset?.name === preset.name}
            dense
          >
            <ListItemIcon>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: preset.preview.bg,
                  border: `2px solid ${preset.preview.border}`,
                }}
              />
            </ListItemIcon>
            <ListItemText>{preset.name}</ListItemText>
          </MenuItem>
        ))}

        <Divider sx={{ my: 0.5 }} />

        {/* Gradients */}
        <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary', display: 'block' }}>
          Gradients
        </Typography>
        {STICKY_NOTE_PRESETS.slice(8, 14).map((preset) => (
          <MenuItem
            key={preset.name}
            onClick={() => handlePresetSelect(preset)}
            selected={currentPreset?.name === preset.name}
            dense
          >
            <ListItemIcon>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: preset.preview.bg,
                  border: `2px solid ${preset.preview.border}`,
                }}
              />
            </ListItemIcon>
            <ListItemText>{preset.name}</ListItemText>
          </MenuItem>
        ))}

        <Divider sx={{ my: 0.5 }} />

        {/* Special Effects */}
        <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary', display: 'block' }}>
          Special Effects
        </Typography>
        {STICKY_NOTE_PRESETS.slice(14).map((preset) => (
          <MenuItem
            key={preset.name}
            onClick={() => handlePresetSelect(preset)}
            selected={currentPreset?.name === preset.name}
            dense
          >
            <ListItemIcon>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: preset.preview.bg,
                  border: `2px solid ${preset.preview.border}`,
                  ...(preset.style.borderStyle === 'glow' && {
                    boxShadow: `0 0 6px ${preset.preview.border}`,
                  }),
                }}
              />
            </ListItemIcon>
            <ListItemText>{preset.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// Custom comparison to ensure re-renders when config changes
function arePropsEqual(prevProps: NodeProps<StickyNoteData>, nextProps: NodeProps<StickyNoteData>) {
  // Always re-render if selected state changes
  if (prevProps.selected !== nextProps.selected) return false;

  // Check if config content changed
  const prevContent = prevProps.data.config?.content;
  const nextContent = nextProps.data.config?.content;
  if (prevContent !== nextContent) return false;

  // Check if config color changed (legacy)
  const prevColor = prevProps.data.config?.bgColor;
  const nextColor = nextProps.data.config?.bgColor;
  if (prevColor !== nextColor) return false;

  // Check if style changed (new system)
  const prevStyle = JSON.stringify(prevProps.data.config?.style);
  const nextStyle = JSON.stringify(nextProps.data.config?.style);
  if (prevStyle !== nextStyle) return false;

  // Check if dimensions changed
  const prevWidth = prevProps.data.config?.width;
  const nextWidth = nextProps.data.config?.width;
  if (prevWidth !== nextWidth) return false;

  const prevHeight = prevProps.data.config?.height;
  const nextHeight = nextProps.data.config?.height;
  if (prevHeight !== nextHeight) return false;

  // Check position
  if (prevProps.xPos !== nextProps.xPos || prevProps.yPos !== nextProps.yPos) return false;

  return true;
}

export const StickyNote = memo(StickyNoteComponent, arePropsEqual);
export default StickyNote;
export { STICKY_COLORS, DEFAULT_WIDTH, DEFAULT_HEIGHT, MIN_WIDTH, MIN_HEIGHT };
export { getBackgroundCSS, getTextColor, getStyleFromConfig };
