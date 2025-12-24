'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  alpha,
  IconButton,
  Tooltip,
  Chip,
  Fade,
  ClickAwayListener,
  Slider,
  Radio,
  RadioGroup,
  Button,
} from '@mui/material';
import {
  Edit,
  Delete,
  DragIndicator,
  Settings,
  Check,
  Close,
  ContentCopy,
  Star,
} from '@mui/icons-material';
import { FieldConfig, LayoutFieldType } from '@/types/form';
import { ArrayFieldInput } from './ArrayFieldInput';
import { NestedObjectField } from './NestedObjectField';
import { LookupFieldInput } from './LookupFieldInput';
import { RepeaterField } from './RepeaterField';
import { KeyValueArrayInput } from './KeyValueArrayInput';
import { TagsArrayInput } from './TagsArrayInput';
import { LayoutFieldRenderer } from './LayoutFieldRenderer';
import { evaluateFormula } from '@/utils/computedFields';

const LAYOUT_FIELD_TYPES: LayoutFieldType[] = ['section-header', 'description', 'divider', 'image', 'spacer'];

const isLayoutField = (config: FieldConfig) => {
  if (config.layout) return true;
  const normalizedType = config.type?.toLowerCase().trim();
  return LAYOUT_FIELD_TYPES.some(lt => lt === normalizedType);
};

function isKeyValueArray(arr: any[]): boolean {
  if (!arr || arr.length === 0) return false;
  const sampleItems = arr.slice(0, 3);
  return sampleItems.every(item => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
    const keys = Object.keys(item);
    if (keys.length !== 2) return false;
    const hasKeyField = keys.some(k =>
      k.toLowerCase() === 'key' ||
      k.toLowerCase() === 'name' ||
      k.toLowerCase() === 'attribute' ||
      k.toLowerCase() === 'property'
    );
    const hasValueField = keys.some(k =>
      k.toLowerCase() === 'value' ||
      k.toLowerCase() === 'val' ||
      k.toLowerCase() === 'data'
    );
    return hasKeyField && hasValueField;
  });
}

function isPrimitiveStringArray(arr: any[]): boolean {
  if (!arr || arr.length === 0) return true;
  return arr.every(item => typeof item === 'string');
}

interface WYSIWYGFieldCardProps {
  config: FieldConfig;
  formData: Record<string, any>;
  allFieldConfigs: FieldConfig[];
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onFormDataChange: (path: string, value: any) => void;
  onUpdateField: (path: string, updates: Partial<FieldConfig>) => void;
  onDelete?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  draggable: boolean;
}

export function WYSIWYGFieldCard({
  config,
  formData,
  allFieldConfigs,
  isSelected,
  isDragging,
  isDragOver,
  onSelect,
  onFormDataChange,
  onUpdateField,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDrop,
  draggable,
}: WYSIWYGFieldCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabelValue, setEditLabelValue] = useState(config.label);

  const isLayout = isLayoutField(config);

  const getFieldValue = (path: string): any => {
    const keys = path.split('.');
    let value = formData;
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return '';
      }
    }
    return value !== undefined ? value : '';
  };

  const value = getFieldValue(config.path);

  const handleSaveLabel = () => {
    const trimmedValue = editLabelValue.trim();
    if (trimmedValue && trimmedValue !== config.label) {
      onUpdateField(config.path, { label: trimmedValue });
    } else {
      setEditLabelValue(config.label);
    }
    setIsEditingLabel(false);
  };

  const handleCancelLabel = () => {
    setEditLabelValue(config.label);
    setIsEditingLabel(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveLabel();
    } else if (e.key === 'Escape') {
      handleCancelLabel();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', config.path);
    onDragStart();
  };

  const renderFieldInput = () => {
    if (isLayout) {
      const layoutConfig = config.layout || { type: config.type as LayoutFieldType };
      return <LayoutFieldRenderer layout={layoutConfig} editable />;
    }

    if (config.computed) {
      const computedValue = evaluateFormula(config.computed.formula, formData, allFieldConfigs);
      const displayValue = computedValue !== null && computedValue !== undefined
        ? String(computedValue)
        : '';

      return (
        <TextField
          fullWidth
          value={displayValue}
          placeholder="Computed value will appear here"
          InputProps={{
            readOnly: true,
            sx: {
              bgcolor: alpha('#00ED64', 0.05),
              '& input': { color: '#00ED64', fontWeight: 500 }
            }
          }}
          helperText="Auto-calculated from formula"
          size="small"
        />
      );
    }

    if (config.lookup) {
      return (
        <LookupFieldInput
          config={config}
          value={value}
          onChange={(newValue) => onFormDataChange(config.path, newValue)}
          formData={formData}
        />
      );
    }

    switch (config.type) {
      case 'boolean':
      case 'yes-no':
      case 'yes_no': {
        const yesLabel = config.validation?.yesLabel || 'Yes';
        const noLabel = config.validation?.noLabel || 'No';
        const displayStyle = config.validation?.displayStyle || 'switch';

        if (displayStyle === 'switch') {
          return (
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(value)}
                  onChange={(e) => onFormDataChange(config.path, e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ED64' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00ED64' },
                  }}
                />
              }
              label={value ? yesLabel : noLabel}
              sx={{ ml: 0 }}
            />
          );
        }

        if (displayStyle === 'buttons') {
          return (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={yesLabel}
                onClick={() => onFormDataChange(config.path, true)}
                sx={{
                  cursor: 'pointer',
                  fontWeight: 500,
                  px: 2,
                  bgcolor: value === true ? '#00ED64' : alpha('#00ED64', 0.1),
                  color: value === true ? '#001E2B' : '#00ED64',
                  '&:hover': { bgcolor: value === true ? '#00ED64' : alpha('#00ED64', 0.2) },
                }}
              />
              <Chip
                label={noLabel}
                onClick={() => onFormDataChange(config.path, false)}
                sx={{
                  cursor: 'pointer',
                  fontWeight: 500,
                  px: 2,
                  bgcolor: value === false ? '#00ED64' : alpha('#00ED64', 0.1),
                  color: value === false ? '#001E2B' : '#00ED64',
                  '&:hover': { bgcolor: value === false ? '#00ED64' : alpha('#00ED64', 0.2) },
                }}
              />
            </Box>
          );
        }

        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => onFormDataChange(config.path, e.target.checked)}
              />
            }
            label={value ? yesLabel : noLabel}
            sx={{ ml: 0 }}
          />
        );
      }

      case 'rating':
      case 'scale':
      case 'number': {
        const minVal = config.validation?.min;
        const maxVal = config.validation?.max;
        const displayStyle = config.validation?.scaleDisplayStyle;
        const step = config.validation?.step || 1;
        const showValue = config.validation?.showValue !== false;
        const lowLabel = config.validation?.lowLabel;
        const highLabel = config.validation?.highLabel;
        const isScale = minVal !== undefined && maxVal !== undefined && (maxVal - minVal) <= 100;

        if (isScale && displayStyle === 'slider') {
          const currentValue = typeof value === 'number' ? value : minVal;
          return (
            <Box sx={{ px: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{lowLabel || minVal}</Typography>
                {showValue && (
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#00ED64' }}>{currentValue}</Typography>
                )}
                <Typography variant="caption" color="text.secondary">{highLabel || maxVal}</Typography>
              </Box>
              <Slider
                value={currentValue}
                min={minVal}
                max={maxVal}
                step={step}
                marks
                valueLabelDisplay={showValue ? 'auto' : 'off'}
                onChange={(_, newValue) => onFormDataChange(config.path, newValue as number)}
                sx={{ color: '#00ED64' }}
              />
            </Box>
          );
        }

        if (isScale && (!displayStyle || displayStyle === 'buttons')) {
          const options = Array.from({ length: maxVal - minVal + 1 }, (_, i) => minVal + i);
          return (
            <Box>
              {(lowLabel || highLabel) && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{lowLabel}</Typography>
                  <Typography variant="caption" color="text.secondary">{highLabel}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {options.map((opt) => (
                  <Button
                    key={opt}
                    variant={value === opt ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => onFormDataChange(config.path, opt)}
                    sx={{
                      minWidth: 40,
                      bgcolor: value === opt ? '#00ED64' : 'transparent',
                      color: value === opt ? '#001E2B' : 'text.primary',
                      borderColor: value === opt ? '#00ED64' : 'divider',
                      '&:hover': {
                        bgcolor: value === opt ? '#00CC55' : alpha('#00ED64', 0.1),
                        borderColor: '#00ED64',
                      },
                    }}
                  >
                    {opt}
                  </Button>
                ))}
              </Box>
            </Box>
          );
        }

        return (
          <TextField
            fullWidth
            type="number"
            placeholder={config.placeholder || 'Enter a number'}
            value={value || ''}
            onChange={(e) => {
              const numValue = e.target.value === '' ? '' : Number(e.target.value);
              onFormDataChange(config.path, numValue);
            }}
            inputProps={{
              min: config.validation?.min,
              max: config.validation?.max
            }}
            size="small"
          />
        );
      }

      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            placeholder={config.placeholder}
            value={value || ''}
            onChange={(e) => onFormDataChange(config.path, e.target.value)}
            size="small"
          />
        );

      case 'email':
        return (
          <TextField
            fullWidth
            type="email"
            placeholder={config.placeholder || 'email@example.com'}
            value={value || ''}
            onChange={(e) => onFormDataChange(config.path, e.target.value)}
            size="small"
          />
        );

      case 'url':
        return (
          <TextField
            fullWidth
            type="url"
            placeholder={config.placeholder || 'https://'}
            value={value || ''}
            onChange={(e) => onFormDataChange(config.path, e.target.value)}
            size="small"
          />
        );

      case 'color': {
        const colorValue = value || '#000000';
        const presetColors = config.validation?.presetColors || ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33', '#33FFF5'];
        const presetsOnly = config.validation?.presetsOnly || false;
        const pickerStyle = config.validation?.pickerStyle || 'chrome';

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Color preview box */}
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  bgcolor: colorValue,
                  border: '2px solid',
                  borderColor: 'divider',
                  boxShadow: 1,
                  flexShrink: 0,
                }}
              />
              {/* Color input */}
              {!presetsOnly && (
                <TextField
                  type="color"
                  value={colorValue}
                  onChange={(e) => onFormDataChange(config.path, e.target.value)}
                  size="small"
                  sx={{
                    width: 80,
                    '& input': { p: 0.5, height: 40, cursor: 'pointer' },
                  }}
                />
              )}
              {/* Hex value display */}
              <TextField
                value={colorValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || val === '') {
                    onFormDataChange(config.path, val);
                  }
                }}
                placeholder="#000000"
                size="small"
                sx={{ width: 120 }}
                inputProps={{ maxLength: 7 }}
              />
            </Box>
            {/* Preset color swatches */}
            {presetColors.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {presetColors.map((color, i) => (
                  <Box
                    key={i}
                    onClick={() => onFormDataChange(config.path, color)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 0.5,
                      bgcolor: color,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: colorValue === color ? '#00ED64' : 'divider',
                      boxShadow: colorValue === color ? '0 0 0 2px rgba(0,237,100,0.3)' : 'none',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: 1,
                      },
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        );
      }

      case 'file': {
        const allowedTypes = config.validation?.allowedTypes || [];
        const maxSize = config.validation?.maxSize || 10;
        const multiple = config.validation?.multiple || false;
        const maxFiles = config.validation?.maxFiles || 5;

        return (
          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<span style={{ fontSize: 18 }}>📎</span>}
              sx={{
                borderColor: 'divider',
                color: 'text.secondary',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.05),
                },
              }}
            >
              {multiple ? 'Choose files' : 'Choose file'}
              <input
                type="file"
                hidden
                multiple={multiple}
                accept={allowedTypes.join(',')}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    const fileList = Array.from(files).slice(0, maxFiles);
                    // Store file names for display (actual upload would be handled separately)
                    onFormDataChange(config.path, multiple ? fileList.map(f => f.name) : fileList[0]?.name);
                  }
                }}
              />
            </Button>
            {value && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Selected: {Array.isArray(value) ? value.join(', ') : value}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              Max size: {maxSize}MB {allowedTypes.length > 0 && `• Allowed: ${allowedTypes.join(', ')}`}
            </Typography>
          </Box>
        );
      }

      case 'time': {
        const timeFormat = config.validation?.timeFormat || '12h';
        const minuteStep = config.validation?.minuteStep || 1;

        return (
          <TextField
            fullWidth
            type="time"
            placeholder={config.placeholder}
            value={value || ''}
            onChange={(e) => onFormDataChange(config.path, e.target.value)}
            size="small"
            inputProps={{
              step: minuteStep * 60, // step is in seconds
            }}
          />
        );
      }

      case 'array':
      case 'array-object': {
        const arrayValue = Array.isArray(value) ? value : [];

        if (config.repeater?.enabled) {
          return (
            <RepeaterField
              config={config}
              value={arrayValue}
              onChange={(newValue) => onFormDataChange(config.path, newValue)}
              itemSchema={config.repeater.itemSchema}
              minItems={config.repeater.minItems}
              maxItems={config.repeater.maxItems}
              allowDuplication={config.repeater.allowDuplication}
              collapsible={config.repeater.collapsible}
            />
          );
        }

        const arrayPattern = config.arrayPattern?.pattern;

        if (arrayPattern === 'key-value' || (config.type === 'array-object' && !arrayPattern && isKeyValueArray(arrayValue))) {
          return (
            <KeyValueArrayInput
              label={config.label}
              value={arrayValue}
              onChange={(newValue) => onFormDataChange(config.path, newValue)}
              config={config.arrayPattern}
            />
          );
        }

        if (arrayPattern === 'tags' || (config.type === 'array' && !arrayPattern && isPrimitiveStringArray(arrayValue))) {
          return (
            <TagsArrayInput
              label={config.label}
              value={arrayValue as string[]}
              onChange={(newValue) => onFormDataChange(config.path, newValue)}
              config={config.arrayPattern}
              placeholder={config.placeholder}
            />
          );
        }

        return (
          <ArrayFieldInput
            config={config}
            value={arrayValue}
            onChange={(newValue) => onFormDataChange(config.path, newValue)}
          />
        );
      }

      case 'object': {
        const objectValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return (
          <NestedObjectField
            config={config}
            value={objectValue}
            onChange={(newValue) => onFormDataChange(config.path, newValue)}
            allFieldConfigs={allFieldConfigs}
          />
        );
      }

      default:
        return (
          <TextField
            fullWidth
            placeholder={config.placeholder || 'Your answer'}
            value={value || ''}
            onChange={(e) => onFormDataChange(config.path, e.target.value)}
            multiline={config.type === 'textarea' || config.type === 'string' && (value?.length || 0) > 50}
            rows={config.type === 'textarea' ? 3 : config.type === 'string' && (value?.length || 0) > 50 ? 4 : 1}
            inputProps={{
              maxLength: config.validation?.maxLength
            }}
            size="small"
          />
        );
    }
  };

  return (
    <Paper
      elevation={isSelected ? 2 : isHovered ? 1 : 0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter(); }}
      onDragLeave={(e) => { e.preventDefault(); onDragLeave(); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      sx={{
        p: 2.5,
        pl: 3,
        mb: 0,
        borderRadius: 2,
        // Google Forms style: colored left border for selection
        border: '1px solid',
        borderColor: isDragOver
          ? alpha('#00ED64', 0.4)
          : isHovered
          ? 'divider'
          : alpha('#000', 0.08),
        // Override left border for selection indicator
        borderLeftWidth: 6,
        borderLeftStyle: 'solid',
        borderLeftColor: isSelected
          ? '#00ED64'
          : isDragOver
          ? alpha('#00ED64', 0.6)
          : 'transparent',
        bgcolor: isDragging
          ? alpha('#00ED64', 0.05)
          : 'background.paper',
        opacity: isDragging ? 0.6 : 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        '&:hover': {
          borderColor: alpha('#00ED64', 0.3),
          boxShadow: isSelected ? 2 : 1,
        },
        '&:active': draggable ? { cursor: 'grabbing' } : {},
      }}
    >
      {/* Hover toolbar */}
      <Fade in={isHovered || isSelected}>
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 2,
            px: 0.5,
            py: 0.25,
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {draggable && (
            <Tooltip title="Drag to reorder" placement="top">
              <IconButton
                size="small"
                sx={{
                  p: 0.5,
                  cursor: 'grab',
                  color: 'text.secondary',
                  '&:hover': { color: '#00ED64' },
                }}
              >
                <DragIndicator sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Edit label" placement="top">
            <IconButton
              size="small"
              onClick={() => {
                setEditLabelValue(config.label);
                setIsEditingLabel(true);
              }}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': { color: '#00ED64', bgcolor: alpha('#00ED64', 0.1) },
              }}
            >
              <Edit sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={config.required ? 'Remove required' : 'Make required'} placement="top">
            <IconButton
              size="small"
              onClick={() => onUpdateField(config.path, { required: !config.required })}
              sx={{
                p: 0.5,
                color: config.required ? '#ff9800' : 'text.secondary',
                '&:hover': { color: '#ff9800', bgcolor: alpha('#ff9800', 0.1) },
              }}
            >
              <Star sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings" placement="top">
            <IconButton
              size="small"
              onClick={onSelect}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': { color: '#2196f3', bgcolor: alpha('#2196f3', 0.1) },
              }}
            >
              <Settings sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          {onDelete && config.source === 'custom' && (
            <Tooltip title="Delete" placement="top">
              <IconButton
                size="small"
                onClick={onDelete}
                sx={{
                  p: 0.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main', bgcolor: alpha('#f44336', 0.1) },
                }}
              >
                <Delete sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Fade>

      {/* Inline label editing overlay */}
      {isEditingLabel && (
        <ClickAwayListener onClickAway={handleSaveLabel}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 4,
              p: 1.5,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Edit Question Label
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                value={editLabelValue}
                onChange={(e) => setEditLabelValue(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                fullWidth
                autoFocus
                placeholder="Enter question label..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#00ED64' },
                    '&:hover fieldset': { borderColor: '#00ED64' },
                    '&.Mui-focused fieldset': { borderColor: '#00ED64', borderWidth: 2 },
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={handleSaveLabel}
                sx={{
                  color: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.1),
                  '&:hover': { bgcolor: alpha('#00ED64', 0.2) },
                }}
              >
                <Check sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleCancelLabel}
                sx={{ color: 'text.secondary' }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        </ClickAwayListener>
      )}

      {/* Field content - cleaner Google Forms style */}
      <Box sx={{ pt: isHovered || isSelected ? 3.5 : 0, transition: 'padding 0.15s ease' }}>
        {/* Simplified Question Label Display */}
        {!isLayout && (
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              mb: 1.5,
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {config.label}
            {config.required && (
              <Typography component="span" sx={{ color: 'error.main', fontWeight: 400 }}>*</Typography>
            )}
          </Typography>
        )}
        {renderFieldInput()}
      </Box>

      {/* Minimal bottom indicators - only show when relevant */}
      {(config.conditionalLogic?.conditions?.length || config.computed || config.lookup) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          {config.conditionalLogic?.conditions?.length && (
            <Chip
              label="Conditional"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: alpha('#9c27b0', 0.08),
                color: '#9c27b0',
              }}
            />
          )}
          {config.computed && (
            <Chip
              label="Computed"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: alpha('#00ED64', 0.08),
                color: '#00ED64',
              }}
            />
          )}
          {config.lookup && (
            <Chip
              label="Lookup"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: alpha('#2196f3', 0.08),
                color: '#2196f3',
              }}
            />
          )}
        </Box>
      )}
    </Paper>
  );
}
