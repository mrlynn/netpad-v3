'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Typography,
  alpha,
  ButtonBase,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Close,
  TextFields,
  Numbers,
  Email,
  CalendarMonth,
  ArrowDropDownCircle,
  ToggleOn,
} from '@mui/icons-material';
import { QuestionTypePicker } from './QuestionTypePicker';
import { FieldConfig } from '@/types/form';
import { generateFieldPath, getDefaultLabel } from '@/utils/fieldPath';

// Quick-add types for common use cases with smart defaults
const QUICK_TYPES = [
  {
    id: 'short-text',
    label: 'Text',
    icon: <TextFields />,
    fieldType: 'string',
    defaultConfig: { placeholder: 'Enter your answer', validation: { maxLength: 255 } },
  },
  {
    id: 'number',
    label: 'Number',
    icon: <Numbers />,
    fieldType: 'number',
    defaultConfig: { placeholder: '0' },
  },
  {
    id: 'email',
    label: 'Email',
    icon: <Email />,
    fieldType: 'email',
    defaultConfig: { placeholder: 'name@example.com' },
  },
  {
    id: 'date',
    label: 'Date',
    icon: <CalendarMonth />,
    fieldType: 'date',
    defaultConfig: { placeholder: 'Select a date' },
  },
  {
    id: 'dropdown',
    label: 'Dropdown',
    icon: <ArrowDropDownCircle />,
    fieldType: 'string',
    defaultConfig: { placeholder: 'Select an option' },
  },
  {
    id: 'yes-no',
    label: 'Yes/No',
    icon: <ToggleOn />,
    fieldType: 'boolean',
    defaultConfig: { defaultValue: false },
  },
];

interface AddQuestionDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (field: FieldConfig) => void;
}

export function AddQuestionDialog({
  open,
  onClose,
  onAdd,
}: AddQuestionDialogProps) {
  const handleSelect = (field: FieldConfig) => {
    onAdd(field);
    onClose();
  };

  const handleQuickAdd = (type: typeof QUICK_TYPES[0]) => {
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
    handleSelect(newField);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Add Question
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Quick-add row for common types */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="caption"
          sx={{ width: '100%', color: 'text.secondary', mb: 0.5 }}
        >
          Quick add:
        </Typography>
        {QUICK_TYPES.map((type) => (
          <Tooltip key={type.id} title={type.label}>
            <ButtonBase
              onClick={() => handleQuickAdd(type)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                transition: 'all 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha('#00ED64', 0.05),
                  color: 'primary.main',
                },
                '& .MuiSvgIcon-root': {
                  fontSize: 18,
                },
              }}
            >
              {type.icon}
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {type.label}
              </Typography>
            </ButtonBase>
          </Tooltip>
        ))}
      </Box>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        <QuestionTypePicker onSelect={handleSelect} />
      </DialogContent>
    </Dialog>
  );
}
