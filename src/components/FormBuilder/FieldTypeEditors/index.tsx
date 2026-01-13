'use client';

/**
 * Field Type Editors - Router/Loader
 * 
 * Routes to appropriate category editor based on field type.
 * This is a refactored version that splits the monolithic QuestionTypeAttributeEditor
 * into per-category components for better maintainability.
 */

import { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  alpha,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { FieldConfig } from '@/types/form';
import { getQuestionTypeId } from './shared/utils';
import { TextFieldEditor } from './TextFieldEditor';
// Import other editors as we create them
// import { ChoiceFieldEditor } from './ChoiceFieldEditor';
// import { ScaleFieldEditor } from './ScaleFieldEditor';
// import { DateTimeFieldEditor } from './DateTimeFieldEditor';
// import { MediaFieldEditor } from './MediaFieldEditor';
// import { AdvancedFieldEditor } from './AdvancedFieldEditor';

interface QuestionTypeAttributeEditorProps {
  config: FieldConfig;
  onUpdate: (updates: Partial<FieldConfig>) => void;
}

/**
 * Main router component - routes to appropriate editor based on field type
 */
export function QuestionTypeAttributeEditor({
  config,
  onUpdate,
}: QuestionTypeAttributeEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const questionType = getQuestionTypeId(config);

  // Render nothing if no specific attributes for this type
  if (!questionType) return null;

  // Route to appropriate editor based on type
  const renderEditor = () => {
    // Text fields: short-text, long-text, email, url, phone
    if (
      questionType === 'short-text' ||
      questionType === 'long-text' ||
      questionType === 'email' ||
      questionType === 'url' ||
      questionType === 'phone'
    ) {
      return <TextFieldEditor config={config} onUpdate={onUpdate} />;
    }

    // TODO: Add other category editors as we extract them
    // Choice fields: multiple_choice, checkboxes, dropdown
    // if (questionType === 'multiple_choice' || questionType === 'checkboxes' || questionType === 'dropdown') {
    //   return <ChoiceFieldEditor config={config} onUpdate={onUpdate} />;
    // }

    // Scale fields: rating, nps, opinion_scale, slider
    // if (questionType === 'rating' || questionType === 'nps' || questionType === 'opinion_scale' || questionType === 'slider' || questionType === 'scale') {
    //   return <ScaleFieldEditor config={config} onUpdate={onUpdate} />;
    // }

    // Date/time fields: date, time, datetime
    // if (questionType === 'date' || questionType === 'time' || questionType === 'datetime') {
    //   return <DateTimeFieldEditor config={config} onUpdate={onUpdate} />;
    // }

    // Media fields: file_upload, image_upload, signature
    // if (questionType === 'file_upload' || questionType === 'image_upload' || questionType === 'signature') {
    //   return <MediaFieldEditor config={config} onUpdate={onUpdate} />;
    // }

    // Advanced fields: matrix, ranking, address, tags
    // if (questionType === 'matrix' || questionType === 'ranking' || questionType === 'address' || questionType === 'tags') {
    //   return <AdvancedFieldEditor config={config} onUpdate={onUpdate} />;
    // }

    // For types not yet extracted, return null
    // The old QuestionTypeAttributeEditor will handle these
    // This allows incremental migration - FieldDetailPanel can use both
    return null;
  };

  const content = renderEditor();

  if (!content) return null;

  // Wrap in Accordion (same as old component)
  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        '&:before': { display: 'none' },
        borderRadius: '8px !important',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          minHeight: 48,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Type-Specific Settings
          </Typography>
          <Chip
            label={questionType}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: alpha('#00ED64', 0.1),
              color: '#00ED64',
            }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {content}
      </AccordionDetails>
    </Accordion>
  );
}
