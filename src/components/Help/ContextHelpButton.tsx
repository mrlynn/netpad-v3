'use client';

/**
 * ContextHelpButton - A subtle, context-sensitive help button
 * 
 * Use this component to add help buttons near complex features or sections.
 * The button is designed to be subtle but discoverable, appearing as a small
 * question mark icon that opens either:
 * - A specific help topic (if topicId is provided)
 * - The help search (if no topicId)
 * 
 * @example
 * // Context-specific help
 * <ContextHelpButton topicId="form-builder" placement="top-start" />
 * 
 * // General help (opens search)
 * <ContextHelpButton placement="top-start" />
 */

import { IconButton, Tooltip, alpha, Box, SxProps, Theme } from '@mui/material';
import { HelpOutline } from '@mui/icons-material';
import { HelpTopicId } from '@/types/help';
import { useHelp } from '@/contexts/HelpContext';

interface ContextHelpButtonProps {
  /** Optional: Specific help topic to open. If not provided, opens help search */
  topicId?: HelpTopicId;
  /** Tooltip placement */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  /** Size of the icon */
  size?: 'small' | 'medium';
  /** Custom tooltip text */
  tooltip?: string;
  /** Custom styles */
  sx?: SxProps<Theme>;
  /** Variant: 'subtle' (default) is very low opacity, 'visible' is more prominent */
  variant?: 'subtle' | 'visible';
}

export function ContextHelpButton({
  topicId,
  placement = 'top-start',
  size = 'small',
  tooltip,
  sx,
  variant = 'subtle',
}: ContextHelpButtonProps) {
  const { openHelp, openSearch } = useHelp();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (topicId) {
      openHelp(topicId);
    } else {
      openSearch();
    }
  };

  const defaultTooltip = topicId
    ? `Help: ${topicId.replace(/-/g, ' ')}`
    : 'Help (⌘/)';

  const ariaLabel = tooltip || defaultTooltip;

  return (
    <Tooltip 
      title={tooltip || defaultTooltip}
      placement={placement}
      arrow
    >
      <IconButton
        size={size}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        sx={{
          color: 'text.secondary',
          opacity: variant === 'subtle' ? 0.4 : 0.7,
          p: 0.5,
          minWidth: 20,
          width: 20,
          height: 20,
          transition: 'all 0.2s ease',
          '&:hover': {
            opacity: 1,
            color: '#00ED64',
            bgcolor: alpha('#00ED64', 0.1),
            transform: 'scale(1.1)',
          },
          '&:focus-visible': {
            opacity: 1,
            outline: '2px solid #00ED64',
            outlineOffset: 2,
          },
          ...sx,
        }}
      >
        <HelpOutline
          fontSize={size === 'small' ? 'small' : 'medium'}
          aria-hidden="true"
          sx={{
            // Make the icon itself slightly smaller for subtlety
            fontSize: size === 'small' ? '0.875rem' : '1rem',
          }}
        />
      </IconButton>
    </Tooltip>
  );
}

/**
 * InlineHelpIcon - An even more subtle inline help icon
 * 
 * Use this for inline help within text or labels. It appears as a tiny
 * question mark that's barely visible until hovered.
 * 
 * @example
 * <Typography>
 *   Form Builder
 *   <InlineHelpIcon topicId="form-builder" />
 * </Typography>
 */
export function InlineHelpIcon({
  topicId,
  tooltip,
}: {
  topicId?: HelpTopicId;
  tooltip?: string;
}) {
  const { openHelp, openSearch } = useHelp();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (topicId) {
      openHelp(topicId);
    } else {
      openSearch();
    }
  };

  return (
    <Box
      component="span"
      onClick={handleClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        ml: 0.5,
        cursor: 'help',
        opacity: 0.3,
        transition: 'opacity 0.2s ease',
        '&:hover': {
          opacity: 1,
          color: '#00ED64',
        },
      }}
      aria-label={tooltip || 'Help'}
    >
      <HelpOutline sx={{ fontSize: '0.75rem' }} />
    </Box>
  );
}
