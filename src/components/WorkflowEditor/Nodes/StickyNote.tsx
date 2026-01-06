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
  useTheme,
  alpha,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Circle as CircleIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { WorkflowNode } from '@/types/workflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Sticky note color options
const STICKY_COLORS = [
  { name: 'Yellow', value: '#FFF9C4', border: '#FBC02D' },
  { name: 'Green', value: '#C8E6C9', border: '#66BB6A' },
  { name: 'Blue', value: '#BBDEFB', border: '#42A5F5' },
  { name: 'Pink', value: '#F8BBD0', border: '#EC407A' },
  { name: 'Orange', value: '#FFE0B2', border: '#FFA726' },
  { name: 'Purple', value: '#E1BEE7', border: '#AB47BC' },
  { name: 'Gray', value: '#ECEFF1', border: '#78909C' },
];

// Default sticky note dimensions
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 150;
const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

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

  // Get current color from config or default to yellow
  const currentColorValue = (data.config?.bgColor as string) || STICKY_COLORS[0].value;
  const currentColor = STICKY_COLORS.find(c => c.value === currentColorValue) || STICKY_COLORS[0];

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

  const handleColorSelect = (color: typeof STICKY_COLORS[0]) => {
    if (data.onContentChange) {
      // We'll dispatch a custom event for color change
      const event = new CustomEvent('stickyNoteColorChange', {
        detail: { nodeId: id, color: color.value }
      });
      window.dispatchEvent(event);
    }
    handleColorMenuClose();
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
          backgroundColor: currentColor.border,
          borderRadius: 2,
        }}
        lineStyle={{
          borderColor: currentColor.border,
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
          bgcolor: currentColor.value,
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          border: `2px solid ${selected ? currentColor.border : 'transparent'}`,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          cursor: isEditing ? 'text' : 'grab',
          '&:hover': {
            boxShadow: theme.shadows[4],
          },
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
              bgcolor: alpha(currentColor.border, 0.2),
              '&:hover': {
                bgcolor: alpha(currentColor.border, 0.4),
              },
            }}
          >
            <PaletteIcon sx={{ fontSize: 14, color: currentColor.border }} />
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
            color: currentColor.border,
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
              bgcolor: alpha(currentColor.border, 0.3),
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
                // Always use dark text since sticky note backgrounds are light pastel colors
                color: '#1a1a1a',
              }}
            />
          ) : content ? (
            <Box
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                // Always use dark text since sticky note backgrounds are light pastel colors
                color: '#1a1a1a',
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  mt: 0,
                  mb: 0.5,
                  lineHeight: 1.3,
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
                  color: theme.palette.primary.main,
                  textDecoration: 'underline',
                },
                '& code': {
                  bgcolor: alpha(currentColor.border, 0.15),
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                },
                '& pre': {
                  bgcolor: alpha(currentColor.border, 0.15),
                  p: 1,
                  borderRadius: 1,
                  overflow: 'auto',
                  '& code': {
                    bgcolor: 'transparent',
                    p: 0,
                  },
                },
                '& blockquote': {
                  borderLeft: `3px solid ${currentColor.border}`,
                  ml: 0,
                  pl: 1.5,
                  // Use slightly lighter dark text for blockquotes
                  color: 'rgba(26, 26, 26, 0.8)',
                },
                '& img': {
                  maxWidth: '100%',
                  borderRadius: 1,
                },
                '& hr': {
                  border: 'none',
                  borderTop: `1px solid ${alpha(currentColor.border, 0.5)}`,
                  my: 1,
                },
                '& table': {
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '0.8rem',
                },
                '& th, & td': {
                  border: `1px solid ${alpha(currentColor.border, 0.3)}`,
                  p: 0.5,
                },
                '& th': {
                  bgcolor: alpha(currentColor.border, 0.1),
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
                // Use semi-transparent dark text for placeholder
                color: 'rgba(26, 26, 26, 0.5)',
                fontStyle: 'italic',
              }}
            >
              Double-click to add a note...
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Color picker menu */}
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
      >
        {STICKY_COLORS.map((color) => (
          <MenuItem
            key={color.name}
            onClick={() => handleColorSelect(color)}
            selected={color.value === currentColorValue}
          >
            <ListItemIcon>
              <CircleIcon sx={{ color: color.border, fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText>{color.name}</ListItemText>
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

  // Check if config color changed
  const prevColor = prevProps.data.config?.bgColor;
  const nextColor = nextProps.data.config?.bgColor;
  if (prevColor !== nextColor) return false;

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
