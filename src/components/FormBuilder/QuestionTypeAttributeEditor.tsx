'use client';

import { useState } from 'react';
import { ValidationPatternGenerator } from './ValidationPatternGenerator';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Chip,
  IconButton,
  Button,
  alpha,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Delete,
  DragIndicator,
} from '@mui/icons-material';
import { FieldConfig } from '@/types/form';
import { TextFieldEditor } from './FieldTypeEditors/TextFieldEditor';
import { ChoiceFieldEditor } from './FieldTypeEditors/ChoiceFieldEditor';
import { ScaleFieldEditor } from './FieldTypeEditors/ScaleFieldEditor';
import { DateTimeFieldEditor } from './FieldTypeEditors/DateTimeFieldEditor';
import { MediaFieldEditor } from './FieldTypeEditors/MediaFieldEditor';
import { AdvancedFieldEditor } from './FieldTypeEditors/AdvancedFieldEditor';

interface QuestionTypeAttributeEditorProps {
  config: FieldConfig;
  onUpdate: (updates: Partial<FieldConfig>) => void;
}

// Helper to detect question type from field config
function getQuestionTypeId(config: FieldConfig): string | null {
  const type = config.type?.toLowerCase();

  // Direct type matches first - map various naming conventions to canonical type IDs
  if (type === 'color_picker' || type === 'color-picker' || type === 'colorpicker' || type === 'color') return 'color_picker';
  if (type === 'email') return 'email';
  if (type === 'url') return 'url';
  if (type === 'phone' || type === 'tel' || type === 'telephone') return 'phone';
  if (type === 'file_upload' || type === 'file-upload' || type === 'fileupload' || type === 'file') return 'file_upload';
  if (type === 'image_upload' || type === 'image-upload' || type === 'imageupload' || type === 'image') return 'image_upload';
  if (type === 'time') return 'time';
  if (type === 'datetime' || type === 'date-time') return 'datetime';
  if (type === 'signature') return 'signature';
  if (type === 'tags') return 'tags';
  if (type === 'slider') return 'slider';
  if (type === 'opinion_scale' || type === 'opinion-scale' || type === 'opinionscale') return 'opinion_scale';
  if (type === 'multiple_choice' || type === 'multiple-choice' || type === 'multiplechoice' || type === 'radio') return 'multiple_choice';
  if (type === 'checkboxes' || type === 'checkbox') return 'checkboxes';
  if (type === 'dropdown' || type === 'select') return 'dropdown';
  if (type === 'matrix') return 'matrix';
  if (type === 'ranking') return 'ranking';
  if (type === 'address') return 'address';
  if (type === 'nps') return 'nps';
  if (type === 'rating') return 'rating';
  if (type === 'scale') return 'scale';
  if (type === 'textarea' || type === 'long_text' || type === 'long-text' || type === 'longtext') return 'long-text';
  if (type === 'text' || type === 'short_text' || type === 'short-text' || type === 'shorttext') return 'short-text';

  // Check for special types based on validation or other indicators
  if (type === 'number') {
    // Check if it's a rating or scale based on validation
    if (config.validation?.min !== undefined && config.validation?.max !== undefined) {
      const range = (config.validation.max || 10) - (config.validation.min || 1);
      if (range <= 5) return 'rating';
      if (range <= 10) return 'scale';
    }
    return 'number';
  }

  if (type === 'string') {
    // Could be short text, long text, email, phone, etc.
    if (config.validation?.minLength && config.validation.minLength > 50) return 'long-text';
    return 'short-text';
  }

  if (type === 'boolean' || type === 'yes_no' || type === 'yes-no') return 'yes-no';
  if (type === 'date') return 'date';
  if (type === 'array') return 'checkboxes';

  return type;
}

export function QuestionTypeAttributeEditor({
  config,
  onUpdate,
}: QuestionTypeAttributeEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const questionType = getQuestionTypeId(config);

  // Helper to update validation
  const updateValidation = (key: string, value: any) => {
    onUpdate({
      validation: {
        ...config.validation,
        [key]: value,
      },
    });
  };

  // Render nothing if no specific attributes for this type
  if (!questionType) return null;

  // Render type-specific attributes
  const renderAttributes = () => {
    switch (questionType) {
      // Text fields - use new TextFieldEditor
      case 'short-text':
      case 'long-text':
      case 'email':
      case 'url':
      case 'phone':
        return <TextFieldEditor config={config} onUpdate={onUpdate} />;

      // Choice fields - use new ChoiceFieldEditor
      case 'multiple_choice':
      case 'checkboxes':
      case 'dropdown':
        return <ChoiceFieldEditor config={config} onUpdate={onUpdate} />;

      // Scale fields - use new ScaleFieldEditor
      case 'scale':
      case 'rating':
      case 'nps':
      case 'opinion_scale':
      case 'slider':
        return <ScaleFieldEditor config={config} onUpdate={onUpdate} />;

      case 'number':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Number Settings
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="number"
                label="Minimum"
                value={config.validation?.min ?? ''}
                onChange={(e) => updateValidation('min', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Maximum"
                value={config.validation?.max ?? ''}
                onChange={(e) => updateValidation('max', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ flex: 1 }}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.decimalsAllowed || false}
                  onChange={(e) => updateValidation('decimalsAllowed', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Allow Decimals</Typography>}
            />
          </Box>
        );

      // DateTime fields - use new DateTimeFieldEditor
      case 'date':
      case 'time':
      case 'datetime':
        return <DateTimeFieldEditor config={config} onUpdate={onUpdate} />;

      case 'yes-no':
        const yesLabel = config.validation?.yesLabel || 'Yes';
        const noLabel = config.validation?.noLabel || 'No';
        const yesNoDisplayStyle = config.validation?.displayStyle || 'switch';

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Yes/No Settings
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Display Style</InputLabel>
              <Select
                value={yesNoDisplayStyle}
                label="Display Style"
                onChange={(e) => updateValidation('displayStyle', e.target.value)}
              >
                <MenuItem value="switch">Toggle Switch</MenuItem>
                <MenuItem value="buttons">Yes/No Buttons</MenuItem>
                <MenuItem value="checkbox">Checkbox</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                label="Yes Label"
                value={yesLabel}
                onChange={(e) => updateValidation('yesLabel', e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="No Label"
                value={noLabel}
                onChange={(e) => updateValidation('noLabel', e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Preview */}
            <Box sx={{ px: 1, py: 1.5, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
                Preview ({yesNoDisplayStyle})
              </Typography>

              {yesNoDisplayStyle === 'switch' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 20,
                      borderRadius: 10,
                      bgcolor: '#00ED64',
                      position: 'relative',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 2,
                        top: 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: 'white',
                      }}
                    />
                  </Box>
                  <Typography variant="body2">{yesLabel}</Typography>
                </Box>
              ) : yesNoDisplayStyle === 'buttons' ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={yesLabel}
                    size="small"
                    sx={{
                      bgcolor: '#00ED64',
                      color: '#001E2B',
                      fontWeight: 500,
                    }}
                  />
                  <Chip
                    label={noLabel}
                    size="small"
                    sx={{
                      bgcolor: alpha('#00ED64', 0.1),
                      color: '#00ED64',
                      fontWeight: 500,
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      border: '2px solid #00ED64',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'white',
                    }}
                  >
                    <Box sx={{ width: 10, height: 10, bgcolor: '#00ED64', borderRadius: 0.5 }} />
                  </Box>
                  <Typography variant="body2">{yesLabel}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        );

      // Media fields - use new MediaFieldEditor
      case 'file_upload':
      case 'image_upload':
      case 'signature':
        return <MediaFieldEditor config={config} onUpdate={onUpdate} />;

      // Advanced fields - use new AdvancedFieldEditor
      case 'color_picker':
      case 'matrix':
      case 'ranking':
      case 'address':
        return <AdvancedFieldEditor config={config} onUpdate={onUpdate} />;

      default:
        return null;
    }
  };

  const content = renderAttributes();

  if (!content) return null;

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
