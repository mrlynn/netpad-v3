/**
 * Interactive Template Preview Component
 *
 * Renders an interactive preview of a form template using the actual
 * @netpad/forms FormRenderer component - demonstrating the real NetPad
 * form rendering capabilities.
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import { FormRenderer } from '@netpad/forms';
import { FormTemplate } from '@/types/formTemplate';
import { templateToPreviewConfig } from '@/lib/templates/templateToFormConfig';

interface InteractiveTemplatePreviewProps {
  template: FormTemplate;
  maxFields?: number; // Limit fields shown in preview (optional)
}

/**
 * Interactive Template Preview Component
 *
 * Renders an interactive preview of a form template's fields using
 * the actual NetPad FormRenderer component.
 */
export function InteractiveTemplatePreview({
  template,
  maxFields,
}: InteractiveTemplatePreviewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Convert template to FormConfiguration
  const formConfig = useMemo(() => {
    const config = templateToPreviewConfig(template);

    // Optionally limit fields for preview
    if (maxFields && config.fieldConfigs.length > maxFields) {
      config.fieldConfigs = config.fieldConfigs.slice(0, maxFields);
    }

    return config;
  }, [template, maxFields]);

  // Count total fields (excluding section headers)
  const totalFields = template.fieldConfigs.filter(
    (f) => f.included && f.type !== 'sectionHeader'
  ).length;
  const displayedFields = formConfig.fieldConfigs.filter(
    (f) => f.included && f.type !== 'section-header'
  ).length;
  const hasMoreFields = maxFields && totalFields > displayedFields;

  // Handle form submission (preview mode - just show success)
  const handleSubmit = async (data: Record<string, unknown>) => {
    console.log('Preview form submitted:', data);
    setFormData(data);
    setSubmitted(true);
  };

  // Handle form data change
  const handleChange = (data: Record<string, unknown>) => {
    setFormData(data);
    // Reset submitted state if user changes data
    if (submitted) {
      setSubmitted(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: isDark ? 'rgba(0, 237, 100, 0.3)' : 'rgba(0, 237, 100, 0.2)',
        borderRadius: 2,
        bgcolor: isDark ? 'rgba(0, 30, 43, 0.6)' : 'rgba(0, 237, 100, 0.02)',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Try This Template
          </Typography>
          <Chip
            label="Powered by @netpad/forms"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Interact with the form fields below to see how this template works.
        </Typography>
      </Box>

      {/* Success message */}
      {submitted && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSubmitted(false)}
        >
          Form submitted successfully! In a real form, this data would be saved to MongoDB.
        </Alert>
      )}

      {/* Form Preview using actual FormRenderer */}
      <Box
        sx={{
          '& .MuiTextField-root': {
            '& .MuiOutlinedInput-root': {
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'white',
            },
          },
          '& .MuiFormControl-root': {
            '& .MuiOutlinedInput-root': {
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'white',
            },
          },
        }}
      >
        <FormRenderer
          config={formConfig}
          mode="create"
          onSubmit={handleSubmit}
          onChange={handleChange}
          showSubmitButton={true}
          submitButtonText="Submit (Preview)"
        />
      </Box>

      {/* "More fields" indicator */}
      {hasMoreFields && (
        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: '1px dashed',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Chip
            label={`+ ${totalFields - displayedFields} more fields in full form`}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'text.secondary',
            }}
          />
        </Box>
      )}

      {/* Preview note */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'block',
          mt: 3,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        This is an interactive preview using the @netpad/forms package.
        Use the template to create a fully functional form with MongoDB storage.
      </Typography>
    </Paper>
  );
}

export default InteractiveTemplatePreview;
