'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  alpha,
  ButtonBase,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import {
  TextFields,
  Numbers,
  Email,
  Link,
  CalendarMonth,
  ToggleOn,
  ArrowDropDownCircle,
  CheckBox,
  RadioButtonChecked,
  FormatListNumbered,
  AttachFile,
  Image,
  Star,
  LinearScale,
  ViewModule,
  DataObject,
  Tag,
  Notes,
  Phone,
  LocationOn,
  Palette,
  Timer,
  LinkOff,
  Speed,
} from '@mui/icons-material';
import { FieldConfig } from '@/types/form';
import { generateFieldPath, getDefaultLabel } from '@/utils/fieldPath';

interface QuestionType {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'basic' | 'choice' | 'advanced' | 'layout';
  fieldType: string;
  defaultConfig?: Partial<FieldConfig>;
}

const QUESTION_TYPES: QuestionType[] = [
  // Basic Input - Smart defaults with helpful placeholders and validation
  {
    id: 'short-text',
    label: 'Short Answer',
    description: 'Single line text',
    icon: <TextFields />,
    category: 'basic',
    fieldType: 'string',
    defaultConfig: {
      placeholder: 'Enter your answer',
      validation: { maxLength: 255 },
    },
  },
  {
    id: 'long-text',
    label: 'Paragraph',
    description: 'Multi-line text',
    icon: <Notes />,
    category: 'basic',
    fieldType: 'string',
    defaultConfig: {
      placeholder: 'Enter detailed response...',
      validation: { minLength: 0, maxLength: 2000 },
    },
  },
  {
    id: 'number',
    label: 'Number',
    description: 'Numeric input',
    icon: <Numbers />,
    category: 'basic',
    fieldType: 'number',
    defaultConfig: {
      placeholder: '0',
    },
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Email address',
    icon: <Email />,
    category: 'basic',
    fieldType: 'email',
    defaultConfig: {
      placeholder: 'name@example.com',
    },
  },
  {
    id: 'phone',
    label: 'Phone',
    description: 'Phone number',
    icon: <Phone />,
    category: 'basic',
    fieldType: 'string',
    defaultConfig: {
      placeholder: '+1 (555) 000-0000',
    },
  },
  {
    id: 'url',
    label: 'Website',
    description: 'URL/Link',
    icon: <Link />,
    category: 'basic',
    fieldType: 'url',
    defaultConfig: {
      placeholder: 'https://example.com',
    },
  },
  {
    id: 'date',
    label: 'Date',
    description: 'Date picker',
    icon: <CalendarMonth />,
    category: 'basic',
    fieldType: 'date',
    defaultConfig: {
      placeholder: 'Select a date',
    },
  },
  {
    id: 'time',
    label: 'Time',
    description: 'Time picker',
    icon: <Timer />,
    category: 'basic',
    fieldType: 'string',
    defaultConfig: {
      placeholder: 'HH:MM',
    },
  },

  // Choice - Smart defaults with common configurations
  {
    id: 'dropdown',
    label: 'Dropdown',
    description: 'Select one option',
    icon: <ArrowDropDownCircle />,
    category: 'choice',
    fieldType: 'string',
    defaultConfig: {
      placeholder: 'Select an option',
      lookup: {
        collection: '',
        displayField: '',
        valueField: '',
      },
    },
  },
  {
    id: 'multiple-choice',
    label: 'Multiple Choice',
    description: 'Radio buttons',
    icon: <RadioButtonChecked />,
    category: 'choice',
    fieldType: 'string',
    defaultConfig: {
      placeholder: 'Choose one',
    },
  },
  {
    id: 'checkboxes',
    label: 'Checkboxes',
    description: 'Select multiple',
    icon: <CheckBox />,
    category: 'choice',
    fieldType: 'array',
    defaultConfig: {
      placeholder: 'Select all that apply',
    },
  },
  {
    id: 'yes-no',
    label: 'Yes/No',
    description: 'Toggle switch',
    icon: <ToggleOn />,
    category: 'choice',
    fieldType: 'boolean',
    defaultConfig: {
      defaultValue: false,
    },
  },
  {
    id: 'rating',
    label: 'Rating',
    description: 'Star rating',
    icon: <Star />,
    category: 'choice',
    fieldType: 'number',
    defaultConfig: {
      validation: { min: 1, max: 5 },
      placeholder: 'Select rating',
    },
  },
  {
    id: 'scale',
    label: 'Linear Scale',
    description: '1-10 scale',
    icon: <LinearScale />,
    category: 'choice',
    fieldType: 'number',
    defaultConfig: {
      validation: { min: 1, max: 10 },
      placeholder: 'Select a value',
    },
  },
  {
    id: 'nps',
    label: 'NPS',
    description: 'Net Promoter Score',
    icon: <Speed />,
    category: 'choice',
    fieldType: 'nps',
    defaultConfig: {
      validation: {
        min: 0,
        max: 10,
        lowLabel: 'Not at all likely',
        highLabel: 'Extremely likely',
      },
      placeholder: 'How likely are you to recommend?',
    },
  },

  // Advanced - Smart defaults for complex field types
  {
    id: 'file',
    label: 'File Upload',
    description: 'Upload files',
    icon: <AttachFile />,
    category: 'advanced',
    fieldType: 'file_upload',
    defaultConfig: {
      placeholder: 'Click to upload or drag and drop',
      validation: {
        allowedTypes: ['*/*'],
        maxSize: 10, // 10MB
        multiple: false,
        maxFiles: 1,
      },
    },
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Upload image',
    icon: <Image />,
    category: 'advanced',
    fieldType: 'image_upload',
    defaultConfig: {
      placeholder: 'Upload an image',
      validation: {
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxSize: 5, // 5MB
        multiple: false,
        maxFiles: 1,
      },
    },
  },
  {
    id: 'tags',
    label: 'Tags',
    description: 'Multiple tags',
    icon: <Tag />,
    category: 'advanced',
    fieldType: 'array',
    defaultConfig: {
      placeholder: 'Add tags...',
      arrayPattern: { pattern: 'tags' },
    },
  },
  {
    id: 'location',
    label: 'Location',
    description: 'Address/Location',
    icon: <LocationOn />,
    category: 'advanced',
    fieldType: 'object',
    defaultConfig: {
      placeholder: 'Enter address',
    },
  },
  {
    id: 'color',
    label: 'Color',
    description: 'Color picker',
    icon: <Palette />,
    category: 'advanced',
    fieldType: 'string',
    defaultConfig: {
      placeholder: 'Select a color',
      defaultValue: '#000000',
    },
  },
  {
    id: 'repeater',
    label: 'Repeating Section',
    description: 'Add multiple items',
    icon: <FormatListNumbered />,
    category: 'advanced',
    fieldType: 'array-object',
    defaultConfig: {
      repeater: {
        enabled: true,
        minItems: 0,
        maxItems: 10,
        itemSchema: [
          { name: 'item', type: 'string', label: 'Item', required: false },
        ],
        allowDuplication: false,
        collapsible: true,
      },
    },
  },

  // Layout
  {
    id: 'section',
    label: 'Section Header',
    description: 'Organize with sections',
    icon: <ViewModule />,
    category: 'layout',
    fieldType: 'section-header',
    defaultConfig: {
      layout: {
        type: 'section-header',
        title: 'Section Title',
        subtitle: 'Optional description',
      },
    },
  },

  // Advanced - URI Parameter
  {
    id: 'url-parameter',
    label: 'URL Parameter',
    description: 'Pre-fill from URL',
    icon: <LinkOff />,
    category: 'advanced',
    fieldType: 'url-param',
    defaultConfig: {
      includeInDocument: true,
      urlParam: {
        paramName: '',
        defaultValue: '',
        dataType: 'string',
        hidden: false,
      },
    },
  },
];

interface QuestionTypePickerProps {
  onSelect: (field: FieldConfig) => void;
  variant?: 'grid' | 'compact';
}

export function QuestionTypePicker({ onSelect, variant = 'grid' }: QuestionTypePickerProps) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const handleSelect = (type: QuestionType) => {
    const label = getDefaultLabel(type.id);
    const path = generateFieldPath(label);

    // Deep clone defaultConfig to avoid shared references between fields
    const clonedConfig = type.defaultConfig
      ? JSON.parse(JSON.stringify(type.defaultConfig))
      : {};

    const newField: FieldConfig = {
      path,
      label,
      type: type.fieldType,
      included: true,
      required: false,
      source: 'custom',
      ...clonedConfig,
    };
    onSelect(newField);
  };

  const categories = [
    { id: 'basic', label: 'Text & Numbers', types: QUESTION_TYPES.filter(t => t.category === 'basic') },
    { id: 'choice', label: 'Choices', types: QUESTION_TYPES.filter(t => t.category === 'choice') },
    { id: 'advanced', label: 'Advanced', types: QUESTION_TYPES.filter(t => t.category === 'advanced') },
    { id: 'layout', label: 'Layout', types: QUESTION_TYPES.filter(t => t.category === 'layout') },
  ];

  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1 }}>
        {QUESTION_TYPES.slice(0, 8).map((type) => (
          <Tooltip key={type.id} title={type.label} placement="top">
            <ButtonBase
              onClick={() => handleSelect(type)}
              sx={{
                p: 1,
                borderRadius: 1,
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                },
              }}
            >
              {type.icon}
            </ButtonBase>
          </Tooltip>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {categories.map((category, catIndex) => (
        <Box key={category.id} sx={{ mb: catIndex < categories.length - 1 ? 3 : 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              mb: 1.5,
              display: 'block',
            }}
          >
            {category.label}
          </Typography>
          <Grid container spacing={1}>
            {category.types.map((type) => (
              <Grid item xs={6} sm={4} md={3} key={type.id}>
                <ButtonBase
                  onClick={() => handleSelect(type)}
                  onMouseEnter={() => setHoveredType(type.id)}
                  onMouseLeave={() => setHoveredType(null)}
                  sx={{
                    width: '100%',
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: hoveredType === type.id ? alpha('#00ED64', 0.5) : 'divider',
                    bgcolor: hoveredType === type.id ? alpha('#00ED64', 0.05) : 'transparent',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    '&:hover': {
                      borderColor: alpha('#00ED64', 0.5),
                      bgcolor: alpha('#00ED64', 0.05),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 12px ${alpha('#00ED64', 0.15)}`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      color: hoveredType === type.id ? '#00ED64' : 'text.secondary',
                      transition: 'color 0.15s ease',
                      '& .MuiSvgIcon-root': { fontSize: 24 },
                    }}
                  >
                    {type.icon}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 500,
                      color: hoveredType === type.id ? '#00ED64' : 'text.primary',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {type.label}
                  </Typography>
                </ButtonBase>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

// Also export a floating action button version for quick add
export function QuickAddButton({ onSelect }: { onSelect: (field: FieldConfig) => void }) {
  const quickTypes = QUESTION_TYPES.filter(t =>
    ['short-text', 'number', 'email', 'date', 'dropdown', 'yes-no'].includes(t.id)
  );

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        p: 0.5,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 2,
      }}
    >
      {quickTypes.map((type) => (
        <Tooltip key={type.id} title={type.label} placement="top">
          <ButtonBase
            onClick={() => {
              const label = getDefaultLabel(type.id);
              const path = generateFieldPath(label);
              const newField: FieldConfig = {
                path,
                label,
                type: type.fieldType,
                included: true,
                required: false,
                source: 'custom',
                ...type.defaultConfig,
              };
              onSelect(newField);
            }}
            sx={{
              p: 1,
              borderRadius: 1,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
              },
            }}
          >
            {type.icon}
          </ButtonBase>
        </Tooltip>
      ))}
    </Box>
  );
}
