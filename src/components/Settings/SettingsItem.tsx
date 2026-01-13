'use client';

import React, { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { HelpButton } from '@/components/Help';
import { HelpTopicId } from '@/types/help';

export interface SettingsItemProps {
  /**
   * Label for the setting
   */
  label: string;
  
  /**
   * Optional description/helper text
   */
  description?: string;
  
  /**
   * The control/input component (TextField, Select, etc.)
   */
  children: ReactNode;
  
  /**
   * Whether this item is required
   */
  required?: boolean;
  
  /**
   * Optional error message to display
   */
  error?: string;
  
  /**
   * Spacing below the item (default: 2)
   */
  spacing?: number;
  
  /**
   * Optional help topic ID for contextual help
   */
  helpTopic?: HelpTopicId;
}

/**
 * Unified settings item component for consistent layout of label + control
 */
export function SettingsItem({
  label,
  description,
  children,
  required = false,
  error,
  spacing = 2,
  helpTopic,
}: SettingsItemProps) {
  return (
    <Box sx={{ mb: spacing }}>
      <Box sx={{ mb: description ? 0.5 : 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {label}
            {required && (
              <Typography component="span" color="error" sx={{ ml: 0.5 }}>
                *
              </Typography>
            )}
          </Typography>
          {helpTopic && (
            <HelpButton
              topicId={helpTopic}
              size="small"
              tooltip={`Help: ${label}`}
            />
          )}
        </Box>
        {description && (
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      {children}
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
