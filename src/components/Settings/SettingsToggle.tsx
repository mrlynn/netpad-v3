'use client';

import React from 'react';
import {
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Tooltip,
  IconButton,
} from '@mui/material';
import { HelpOutline } from '@mui/icons-material';
import { HelpButton } from '@/components/Help';
import { HelpTopicId } from '@/types/help';

export interface SettingsToggleProps {
  /**
   * Label for the toggle
   */
  label: string;
  
  /**
   * Optional description/helper text
   */
  description?: string;
  
  /**
   * Current checked state
   */
  checked: boolean;
  
  /**
   * Callback when toggle changes
   */
  onChange: (checked: boolean) => void;
  
  /**
   * Whether the toggle is disabled
   */
  disabled?: boolean;
  
  /**
   * Optional help tooltip content (deprecated - use helpTopic instead)
   */
  helpText?: string;
  
  /**
   * Optional help topic ID for contextual help
   */
  helpTopic?: HelpTopicId;
  
  /**
   * Spacing below the toggle (default: 2)
   */
  spacing?: number;
}

/**
 * Unified toggle/switch component for consistent settings UI
 */
export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  helpText,
  helpTopic,
  spacing = 2,
}: SettingsToggleProps) {
  return (
    <Box sx={{ mb: spacing, display: 'flex', flexDirection: 'column' }}>
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#00ED64',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                bgcolor: '#00ED64',
              },
            }}
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
            {helpTopic && (
              <HelpButton
                topicId={helpTopic}
                size="small"
                tooltip={`Help: ${label}`}
              />
            )}
            {!helpTopic && helpText && (
              <Tooltip title={helpText} arrow>
                <IconButton size="small" sx={{ p: 0.25, ml: 0.5 }}>
                  <HelpOutline fontSize="small" sx={{ fontSize: 16, color: 'text.secondary' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
        sx={{ alignItems: 'flex-start' }}
      />
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 4.5 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}
