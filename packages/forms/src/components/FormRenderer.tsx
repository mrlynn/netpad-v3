'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  FormLabel,
  FormHelperText,
  RadioGroup,
  Radio,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Slider,
  Rating,
  Switch,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Chip,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import {
  FormConfiguration,
  FormRendererProps,
  FieldConfig,
  FormMode,
  FormTheme,
} from '../types';
import {
  evaluateConditionalLogic,
  getNestedValue,
  setNestedValue,
  validateField,
  validateForm,
  evaluateFormula,
} from '../utils';

// ============================================
// Field Components
// ============================================

interface FieldProps {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  mode?: FormMode;
}

function TextField_Field({ field, value, onChange, error, disabled }: FieldProps) {
  return (
    <TextField
      fullWidth
      label={field.label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      helperText={error || field.helpText}
      error={!!error}
      required={field.required}
      disabled={disabled || field.disabled}
      multiline={field.type === 'long_text' || field.type === 'textarea'}
      rows={field.type === 'long_text' || field.type === 'textarea' ? 4 : undefined}
      type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
    />
  );
}

function NumberField({ field, value, onChange, error, disabled }: FieldProps) {
  const displayStyle = field.displayStyle || 'input';

  if (displayStyle === 'slider') {
    return (
      <Box>
        <Typography gutterBottom>{field.label}</Typography>
        <Slider
          value={typeof value === 'number' ? value : field.validation?.min || 0}
          onChange={(_, newValue) => onChange(newValue)}
          min={field.validation?.min}
          max={field.validation?.max}
          disabled={disabled || field.disabled}
          valueLabelDisplay="auto"
        />
        {(error || field.helpText) && (
          <FormHelperText error={!!error}>{error || field.helpText}</FormHelperText>
        )}
      </Box>
    );
  }

  return (
    <TextField
      fullWidth
      type="number"
      label={field.label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
      placeholder={field.placeholder}
      helperText={error || field.helpText}
      error={!!error}
      required={field.required}
      disabled={disabled || field.disabled}
      inputProps={{
        min: field.validation?.min,
        max: field.validation?.max,
      }}
    />
  );
}

function SelectField({ field, value, onChange, error, disabled }: FieldProps) {
  const options = field.options || [];

  return (
    <FormControl fullWidth error={!!error}>
      <InputLabel required={field.required}>{field.label}</InputLabel>
      <Select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        label={field.label}
        disabled={disabled || field.disabled}
      >
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{error || field.helpText}</FormHelperText>
    </FormControl>
  );
}

function RadioField({ field, value, onChange, error, disabled }: FieldProps) {
  const options = field.options || [];

  return (
    <FormControl error={!!error} component="fieldset">
      <FormLabel required={field.required}>{field.label}</FormLabel>
      <RadioGroup
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <FormControlLabel
            key={opt.value}
            value={opt.value}
            control={<Radio />}
            label={opt.label}
            disabled={disabled || field.disabled}
          />
        ))}
      </RadioGroup>
      <FormHelperText>{error || field.helpText}</FormHelperText>
    </FormControl>
  );
}

function CheckboxField({ field, value, onChange, error, disabled }: FieldProps) {
  const options = field.options || [];
  const selectedValues = Array.isArray(value) ? value : [];

  const handleChange = (optValue: string | number, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, optValue]);
    } else {
      onChange(selectedValues.filter((v) => v !== optValue));
    }
  };

  if (options.length === 0) {
    // Single checkbox (boolean)
    return (
      <FormControl error={!!error}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled || field.disabled}
            />
          }
          label={field.label}
        />
        <FormHelperText>{error || field.helpText}</FormHelperText>
      </FormControl>
    );
  }

  return (
    <FormControl error={!!error} component="fieldset">
      <FormLabel required={field.required}>{field.label}</FormLabel>
      {options.map((opt) => (
        <FormControlLabel
          key={opt.value}
          control={
            <Checkbox
              checked={selectedValues.includes(opt.value)}
              onChange={(e) => handleChange(opt.value, e.target.checked)}
              disabled={disabled || field.disabled}
            />
          }
          label={opt.label}
        />
      ))}
      <FormHelperText>{error || field.helpText}</FormHelperText>
    </FormControl>
  );
}

function SwitchField({ field, value, onChange, error, disabled }: FieldProps) {
  return (
    <FormControl error={!!error}>
      <FormControlLabel
        control={
          <Switch
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled || field.disabled}
          />
        }
        label={field.label}
      />
      <FormHelperText>{error || field.helpText}</FormHelperText>
    </FormControl>
  );
}

function RatingField({ field, value, onChange, error, disabled }: FieldProps) {
  return (
    <Box>
      <Typography component="legend">{field.label}</Typography>
      <Rating
        value={typeof value === 'number' ? value : 0}
        onChange={(_, newValue) => onChange(newValue)}
        max={field.validation?.max || 5}
        disabled={disabled || field.disabled}
      />
      {(error || field.helpText) && (
        <FormHelperText error={!!error}>{error || field.helpText}</FormHelperText>
      )}
    </Box>
  );
}

function DateField({ field, value, onChange, error, disabled }: FieldProps) {
  return (
    <DatePicker
      label={field.label}
      value={value ? new Date(value as string) : null}
      onChange={(newValue) => onChange(newValue?.toISOString())}
      disabled={disabled || field.disabled}
      slotProps={{
        textField: {
          fullWidth: true,
          required: field.required,
          error: !!error,
          helperText: error || field.helpText,
        },
      }}
    />
  );
}

function TimeField({ field, value, onChange, error, disabled }: FieldProps) {
  return (
    <TimePicker
      label={field.label}
      value={value ? new Date(`1970-01-01T${value}`) : null}
      onChange={(newValue) => {
        if (newValue) {
          const hours = newValue.getHours().toString().padStart(2, '0');
          const minutes = newValue.getMinutes().toString().padStart(2, '0');
          onChange(`${hours}:${minutes}`);
        } else {
          onChange(null);
        }
      }}
      disabled={disabled || field.disabled}
      slotProps={{
        textField: {
          fullWidth: true,
          required: field.required,
          error: !!error,
          helperText: error || field.helpText,
        },
      }}
    />
  );
}

function AutocompleteField({ field, value, onChange, error, disabled }: FieldProps) {
  const options = field.options || [];

  return (
    <Autocomplete
      value={options.find((o) => o.value === value) || null}
      onChange={(_, newValue) => onChange(newValue?.value ?? null)}
      options={options}
      getOptionLabel={(option) => option.label}
      disabled={disabled || field.disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label}
          placeholder={field.placeholder}
          required={field.required}
          error={!!error}
          helperText={error || field.helpText}
        />
      )}
    />
  );
}

function TagsField({ field, value, onChange, error, disabled }: FieldProps) {
  const tags = Array.isArray(value) ? value : [];

  return (
    <Autocomplete
      multiple
      freeSolo
      value={tags}
      onChange={(_, newValue) => onChange(newValue)}
      options={field.options?.map((o) => o.label) || []}
      disabled={disabled || field.disabled}
      renderTags={(tagValues, getTagProps) =>
        tagValues.map((option, index) => (
          <Chip
            label={option}
            size="small"
            {...getTagProps({ index })}
            key={option}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label}
          placeholder={field.placeholder}
          required={field.required}
          error={!!error}
          helperText={error || field.helpText}
        />
      )}
    />
  );
}

// Layout components
function SectionHeader({ field }: { field: FieldConfig }) {
  const layout = field.layout;
  if (!layout) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {layout.title && (
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {layout.title}
        </Typography>
      )}
      {layout.subtitle && (
        <Typography variant="body2" color="text.secondary">
          {layout.subtitle}
        </Typography>
      )}
    </Box>
  );
}

function Description({ field }: { field: FieldConfig }) {
  const layout = field.layout;
  if (!layout?.content) return null;

  return (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      {layout.content}
    </Typography>
  );
}

// ============================================
// Field Renderer
// ============================================

function renderField(props: FieldProps): React.ReactNode {
  const { field } = props;
  const type = field.type.toLowerCase();

  // Layout fields
  if (field.layout) {
    switch (field.layout.type) {
      case 'section-header':
        return <SectionHeader field={field} />;
      case 'description':
        return <Description field={field} />;
      case 'divider':
        return <Divider sx={{ my: 2 }} />;
      case 'spacer':
        return <Box sx={{ height: field.layout.height || 24 }} />;
      default:
        return null;
    }
  }

  // Input fields
  switch (type) {
    case 'short_text':
    case 'text':
    case 'email':
    case 'url':
    case 'phone':
    case 'long_text':
    case 'textarea':
    case 'paragraph':
      return <TextField_Field {...props} />;

    case 'number':
    case 'scale':
    case 'slider':
      return <NumberField {...props} />;

    case 'dropdown':
    case 'select':
      return <SelectField {...props} />;

    case 'multiple_choice':
    case 'radio':
      return <RadioField {...props} />;

    case 'checkboxes':
    case 'checkbox':
    case 'checkbox-group':
      return <CheckboxField {...props} />;

    case 'yes_no':
    case 'boolean':
    case 'switch':
      return <SwitchField {...props} />;

    case 'rating':
    case 'nps':
      return <RatingField {...props} />;

    case 'date':
      return <DateField {...props} />;

    case 'time':
      return <TimeField {...props} />;

    case 'autocomplete':
      return <AutocompleteField {...props} />;

    case 'tags':
      return <TagsField {...props} />;

    default:
      return <TextField_Field {...props} />;
  }
}

// ============================================
// Main FormRenderer Component
// ============================================

export function FormRenderer({
  config,
  initialData = {},
  mode = 'create',
  theme,
  onSubmit,
  onChange,
  onError,
  submitButtonText,
  showSubmitButton = true,
  enableDrafts = false,
  onLookup,
  className,
  loading = false,
  disabled = false,
}: FormRendererProps) {
  // Form state
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Multi-page configuration
  const isMultiPage = config.multiPage?.enabled && config.multiPage.pages.length > 0;
  const pages = config.multiPage?.pages || [];

  // Get visible fields based on conditional logic
  const visibleFields = useMemo(() => {
    return config.fieldConfigs.filter((field) => {
      if (!field.included) return false;
      if (!field.conditionalLogic) return true;
      return evaluateConditionalLogic(field.conditionalLogic, formData);
    });
  }, [config.fieldConfigs, formData]);

  // Get fields for current page
  const currentPageFields = useMemo(() => {
    if (!isMultiPage) return visibleFields;
    const page = pages[currentPage];
    if (!page) return visibleFields;
    return visibleFields.filter((f) => page.fields.includes(f.path));
  }, [isMultiPage, pages, currentPage, visibleFields]);

  // Evaluate computed fields
  useEffect(() => {
    const computedFields = config.fieldConfigs.filter((f) => f.computed);
    let hasChanges = false;
    const newData = { ...formData };

    for (const field of computedFields) {
      if (field.computed?.formula) {
        const result = evaluateFormula(field.computed.formula, formData);
        if (result !== getNestedValue(formData, field.path)) {
          setNestedValue(newData, field.path, result);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setFormData(newData);
    }
  }, [formData, config.fieldConfigs]);

  // Handle field change
  const handleFieldChange = useCallback(
    (path: string, value: unknown) => {
      const newData = setNestedValue(formData, path, value);
      setFormData(newData);

      // Clear field error
      if (errors[path]) {
        const newErrors = { ...errors };
        delete newErrors[path];
        setErrors(newErrors);
      }

      // Notify parent
      onChange?.(newData);
    },
    [formData, errors, onChange]
  );

  // Validate current page
  const validateCurrentPage = useCallback(() => {
    const fieldsToValidate = isMultiPage ? currentPageFields : visibleFields;
    const pageErrors = validateForm(fieldsToValidate, formData);
    setErrors(pageErrors);
    onError?.(pageErrors);
    return Object.keys(pageErrors).length === 0;
  }, [isMultiPage, currentPageFields, visibleFields, formData, onError]);

  // Handle page navigation
  const handleNext = useCallback(() => {
    if (validateCurrentPage()) {
      setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
    }
  }, [validateCurrentPage, pages.length]);

  const handleBack = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateCurrentPage()) {
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        await onSubmit?.(formData);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : 'An error occurred'
        );
      } finally {
        setSubmitting(false);
      }
    },
    [formData, validateCurrentPage, onSubmit]
  );

  // Get field width style
  const getFieldWidth = (field: FieldConfig) => {
    switch (field.fieldWidth) {
      case 'half':
        return { xs: 12, sm: 6 };
      case 'third':
        return { xs: 12, sm: 4 };
      case 'quarter':
        return { xs: 12, sm: 3 };
      default:
        return { xs: 12 };
    }
  };

  const isViewMode = mode === 'view';
  const isLastPage = currentPage === pages.length - 1;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        className={className}
        sx={{ width: '100%' }}
      >
        {/* Multi-page stepper */}
        {isMultiPage && config.multiPage?.showProgressBar !== false && (
          <Stepper activeStep={currentPage} sx={{ mb: 4 }}>
            {pages.map((page, index) => (
              <Step key={page.id}>
                <StepLabel>{page.title}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* Page title */}
        {isMultiPage && pages[currentPage] && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              {pages[currentPage].title}
            </Typography>
            {pages[currentPage].description && (
              <Typography variant="body2" color="text.secondary">
                {pages[currentPage].description}
              </Typography>
            )}
          </Box>
        )}

        {/* Error alert */}
        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {submitError}
          </Alert>
        )}

        {/* Fields */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 3,
          }}
        >
          {currentPageFields.map((field) => {
            const width = getFieldWidth(field);
            const value = getNestedValue(formData, field.path);
            const error = errors[field.path];

            return (
              <Box
                key={field.path}
                sx={{
                  gridColumn: {
                    xs: `span ${width.xs}`,
                    sm: `span ${width.sm || width.xs}`,
                  },
                }}
              >
                {renderField({
                  field,
                  value,
                  onChange: (v) => handleFieldChange(field.path, v),
                  error,
                  disabled: disabled || loading || isViewMode,
                  mode,
                })}
              </Box>
            );
          })}
        </Box>

        {/* Navigation buttons */}
        {showSubmitButton && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 4,
              gap: 2,
            }}
          >
            {isMultiPage && currentPage > 0 && (
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={submitting || loading}
              >
                Back
              </Button>
            )}

            <Box sx={{ flex: 1 }} />

            {isMultiPage && !isLastPage ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={submitting || loading}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || loading || isViewMode}
                startIcon={
                  submitting ? <CircularProgress size={20} /> : undefined
                }
              >
                {submitButtonText || config.submitButtonText || 'Submit'}
              </Button>
            )}
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
}

export default FormRenderer;
