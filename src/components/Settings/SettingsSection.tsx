'use client';

import React, { ReactNode } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  alpha,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { HelpButton } from '@/components/Help';
import { HelpTopicId } from '@/types/help';

export interface SettingsSectionProps {
  /**
   * Title of the section
   */
  title: string;
  
  /**
   * Optional description shown below the title
   */
  description?: string;
  
  /**
   * Optional icon displayed next to the title
   */
  icon?: ReactNode;
  
  /**
   * Whether the section is expanded by default
   */
  defaultExpanded?: boolean;
  
  /**
   * Optional badge/content to show next to the title (e.g., checkmark, count)
   */
  badge?: ReactNode;
  
  /**
   * Optional color theme for the section (defaults to primary)
   */
  color?: string;
  
  /**
   * Children rendered inside the section
   */
  children: ReactNode;
  
  /**
   * Optional callback when section expansion changes
   */
  onChange?: (expanded: boolean) => void;
  
  /**
   * Optional help topic ID for contextual help
   */
  helpTopic?: HelpTopicId;
}

/**
 * Unified settings section component providing consistent styling
 * across all settings surfaces (Settings page, Form drawer, Workflow panels)
 */
export function SettingsSection({
  title,
  description,
  icon,
  defaultExpanded = false,
  badge,
  color = '#00ED64',
  children,
  onChange,
  helpTopic,
}: SettingsSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const handleChange = (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
    onChange?.(isExpanded);
  };

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      onChange={handleChange}
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: expanded ? alpha(color, 0.3) : 'divider',
        borderRadius: 1,
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0 0 16px 0',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          minHeight: 56,
          '&.Mui-expanded': {
            minHeight: 56,
            borderBottom: expanded ? `1px solid ${alpha(color, 0.2)}` : 'none',
          },
          '&:hover': {
            bgcolor: alpha(color, 0.03),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: expanded ? color : 'text.secondary',
                transition: 'color 0.2s',
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              {helpTopic && (
                <HelpButton
                  topicId={helpTopic}
                  size="small"
                  tooltip={`Help: ${title}`}
                />
              )}
              {badge && badge}
            </Box>
            {description && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {description}
              </Typography>
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 2, pb: 2 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}
