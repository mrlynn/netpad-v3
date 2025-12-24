'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  alpha,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Fab,
  TextField,
  InputBase,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  RestartAlt,
  Add,
  DragIndicator,
  Edit as EditIcon,
} from '@mui/icons-material';
import { FieldConfig, LayoutFieldType, FormHeader } from '@/types/form';
import { WYSIWYGFieldCard } from './WYSIWYGFieldCard';
import { AddQuestionDropzone } from './AddQuestionDropzone';
import { FormHeaderDisplay } from './FormHeaderDisplay';
import { evaluateConditionalLogic } from '@/utils/conditionalLogic';

const LAYOUT_FIELD_TYPES: LayoutFieldType[] = ['section-header', 'description', 'divider', 'image', 'spacer'];

const isLayoutField = (config: FieldConfig) => {
  if (config.layout) return true;
  const normalizedType = config.type?.toLowerCase().trim();
  return LAYOUT_FIELD_TYPES.some(lt => lt === normalizedType);
};

interface WYSIWYGFormEditorProps {
  fieldConfigs: FieldConfig[];
  formData: Record<string, any>;
  selectedFieldPath: string | null;
  onFormDataChange: (path: string, value: any) => void;
  onResetForm?: () => void;
  onSelectField: (path: string | null) => void;
  onUpdateField: (path: string, updates: Partial<FieldConfig>) => void;
  onDeleteField?: (path: string) => void;
  onReorderFields?: (newOrder: FieldConfig[]) => void;
  onAddFieldAtIndex?: (index: number) => void;
  allFieldConfigs: FieldConfig[];
  // Header configuration
  header?: FormHeader;
  formTitle?: string;
  formDescription?: string;
  // Inline editing callbacks
  onFormTitleChange?: (title: string) => void;
  onFormDescriptionChange?: (description: string) => void;
}

export function WYSIWYGFormEditor({
  fieldConfigs,
  formData,
  selectedFieldPath,
  onFormDataChange,
  onResetForm,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onReorderFields,
  onAddFieldAtIndex,
  allFieldConfigs,
  header,
  formTitle,
  formDescription,
  onFormTitleChange,
  onFormDescriptionChange,
}: WYSIWYGFormEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const dragCounter = useRef(0);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Calculate form completion stats
  const formStats = useMemo(() => {
    const dataFields = fieldConfigs.filter(f => !isLayoutField(f));
    const requiredFields = dataFields.filter(f => f.required);

    const getFieldValue = (path: string): any => {
      const keys = path.split('.');
      let value = formData;
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          return undefined;
        }
      }
      return value;
    };

    const isFieldFilled = (config: FieldConfig): boolean => {
      if (config.computed) return true;
      const value = getFieldValue(config.path);
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    };

    const filledFields = dataFields.filter(isFieldFilled);
    const filledRequiredFields = requiredFields.filter(isFieldFilled);

    return {
      totalFields: dataFields.length,
      filledFields: filledFields.length,
      requiredFields: requiredFields.length,
      filledRequiredFields: filledRequiredFields.length,
      completionPercent: dataFields.length > 0
        ? Math.round((filledFields.length / dataFields.length) * 100)
        : 0,
      isComplete: requiredFields.length === filledRequiredFields.length
    };
  }, [fieldConfigs, formData]);

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragCounter.current++;
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback((targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex || !onReorderFields) return;

    const newConfigs = [...fieldConfigs];
    const [removed] = newConfigs.splice(draggedIndex, 1);
    newConfigs.splice(targetIndex, 0, removed);
    onReorderFields(newConfigs);

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, [draggedIndex, fieldConfigs, onReorderFields]);

  const handleAddAtIndex = (index: number) => {
    if (onAddFieldAtIndex) {
      onAddFieldAtIndex(index);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header with progress */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Form Editor
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {formStats.totalFields > 0 && (
              <>
                <Tooltip title={`${formStats.filledFields} of ${formStats.totalFields} questions answered`}>
                  <Chip
                    icon={formStats.filledFields > 0 ? <CheckCircle sx={{ fontSize: 14 }} /> : <RadioButtonUnchecked sx={{ fontSize: 14 }} />}
                    label={`${formStats.filledFields}/${formStats.totalFields}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      bgcolor: formStats.filledFields > 0 ? alpha('#00ED64', 0.1) : alpha('#000', 0.05),
                      color: formStats.filledFields > 0 ? '#00ED64' : 'text.secondary',
                      '& .MuiChip-icon': {
                        color: formStats.filledFields > 0 ? '#00ED64' : 'text.disabled'
                      }
                    }}
                  />
                </Tooltip>
                {formStats.requiredFields > 0 && (
                  <Tooltip title={`${formStats.filledRequiredFields} of ${formStats.requiredFields} required questions answered`}>
                    <Chip
                      label={`${formStats.filledRequiredFields}/${formStats.requiredFields} req`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: formStats.isComplete ? alpha('#00ED64', 0.1) : alpha('#ff9800', 0.1),
                        color: formStats.isComplete ? '#00ED64' : '#ff9800'
                      }}
                    />
                  </Tooltip>
                )}
              </>
            )}
            {onResetForm && formStats.filledFields > 0 && (
              <Tooltip title="Reset form">
                <IconButton
                  size="small"
                  onClick={onResetForm}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'error.main',
                      bgcolor: alpha('#f44336', 0.1)
                    }
                  }}
                >
                  <RestartAlt sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Progress bar */}
        {formStats.totalFields > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {formStats.completionPercent}% complete
              </Typography>
              {formStats.isComplete && formStats.requiredFields > 0 && (
                <Chip
                  icon={<CheckCircle sx={{ fontSize: 12 }} />}
                  label="Ready to submit"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: alpha('#00ED64', 0.15),
                    color: '#00ED64',
                    '& .MuiChip-icon': { color: '#00ED64' }
                  }}
                />
              )}
            </Box>
            <LinearProgress
              variant="determinate"
              value={formStats.completionPercent}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: alpha('#00ED64', 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: formStats.isComplete ? '#00ED64' : '#2196f3',
                  borderRadius: 2
                }
              }}
            />
          </Box>
        )}
      </Box>

      {/* Scrollable form area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {/* Form Header with inline editable title - matches published form */}
        <Box sx={{ maxWidth: 700, mx: 'auto', mb: 3 }}>
          {/* Header Image (if configured) with editable title overlay */}
          {header && header.type !== 'none' ? (
            <Box sx={{ position: 'relative' }}>
              <FormHeaderDisplay
                header={header}
                title={header.showTitle !== false ? formTitle : undefined}
                description={header.showDescription !== false ? formDescription : undefined}
                editable
              />
              {/* Clickable overlay for editing title in header */}
              {header.showTitle !== false && (
                <Box
                  onClick={() => {
                    setEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 0);
                  }}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 3,
                    cursor: 'text',
                    zIndex: 2,
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.1)',
                    },
                  }}
                />
              )}
            </Box>
          ) : (
            /* No header - show title card like published form would */
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                borderTop: '4px solid',
                borderColor: '#00ED64',
                bgcolor: 'background.paper',
              }}
            >
              {/* Title Field */}
              {editingTitle ? (
                <InputBase
                  inputRef={titleInputRef}
                  value={formTitle || ''}
                  onChange={(e) => onFormTitleChange?.(e.target.value)}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingTitle(false);
                      setEditingDescription(true);
                    } else if (e.key === 'Escape') {
                      setEditingTitle(false);
                    }
                  }}
                  placeholder="Untitled form"
                  autoFocus
                  fullWidth
                  sx={{
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: 'text.primary',
                    '& input': {
                      p: 0,
                      pb: 0.5,
                      borderBottom: '2px solid',
                      borderColor: '#00ED64',
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="h5"
                  onClick={() => {
                    setEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 0);
                  }}
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    pb: 0.5,
                    cursor: 'text',
                    color: formTitle ? 'text.primary' : 'text.disabled',
                    borderBottom: '1px solid transparent',
                    '&:hover': {
                      borderBottomColor: 'divider',
                    },
                  }}
                >
                  {formTitle || 'Untitled form'}
                </Typography>
              )}

              {/* Description Field */}
              {editingDescription ? (
                <InputBase
                  inputRef={descriptionInputRef}
                  value={formDescription || ''}
                  onChange={(e) => onFormDescriptionChange?.(e.target.value)}
                  onBlur={() => setEditingDescription(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingDescription(false);
                    }
                  }}
                  placeholder="Form description"
                  autoFocus
                  fullWidth
                  multiline
                  sx={{
                    mt: 1.5,
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    color: 'text.secondary',
                    '& textarea': {
                      p: 0,
                      pb: 0.5,
                      borderBottom: '2px solid',
                      borderColor: '#00ED64',
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="body1"
                  onClick={() => {
                    setEditingDescription(true);
                    setTimeout(() => descriptionInputRef.current?.focus(), 0);
                  }}
                  sx={{
                    mt: 1.5,
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    cursor: 'text',
                    color: formDescription ? 'text.secondary' : 'text.disabled',
                    borderBottom: '1px solid transparent',
                    minHeight: 24,
                    '&:hover': {
                      borderBottomColor: 'divider',
                    },
                  }}
                >
                  {formDescription || 'Form description'}
                </Typography>
              )}
            </Paper>
          )}

          {/* Floating edit modal for title when header has image */}
          {header && header.type !== 'none' && editingTitle && (
            <Paper
              elevation={8}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                p: 3,
                zIndex: 100,
                minWidth: 400,
                maxWidth: 600,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Edit Form Title
              </Typography>
              <InputBase
                inputRef={titleInputRef}
                value={formTitle || ''}
                onChange={(e) => onFormTitleChange?.(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setEditingTitle(false);
                  }
                }}
                placeholder="Untitled form"
                autoFocus
                fullWidth
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  '& input': {
                    p: 1,
                    border: '2px solid',
                    borderColor: '#00ED64',
                    borderRadius: 1,
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Press Enter or click outside to save
              </Typography>
            </Paper>
          )}
        </Box>

        {fieldConfigs.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: alpha('#00ED64', 0.03),
              border: '2px dashed',
              borderColor: alpha('#00ED64', 0.3),
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#00ED64',
                bgcolor: alpha('#00ED64', 0.08),
              },
            }}
            onClick={() => onAddFieldAtIndex?.(0)}
          >
            <Add sx={{ fontSize: 48, color: alpha('#00ED64', 0.5), mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              Start building your form
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Click here or use the + button to add your first question
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ maxWidth: 700, mx: 'auto' }}>
            {/* First dropzone */}
            <AddQuestionDropzone onAdd={() => handleAddAtIndex(0)} />

            {/* Field cards */}
            {fieldConfigs.map((config, index) => {
              const isVisible = evaluateConditionalLogic(
                config.conditionalLogic,
                formData
              );
              const isSelected = selectedFieldPath === config.path;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <Collapse key={config.path} in={isVisible} unmountOnExit>
                  <Box>
                    <WYSIWYGFieldCard
                      config={config}
                      formData={formData}
                      allFieldConfigs={allFieldConfigs}
                      isSelected={isSelected}
                      isDragging={isDragging}
                      isDragOver={isDragOver}
                      onSelect={() => onSelectField(isSelected ? null : config.path)}
                      onFormDataChange={onFormDataChange}
                      onUpdateField={onUpdateField}
                      onDelete={onDeleteField ? () => onDeleteField(config.path) : undefined}
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDrop(index)}
                      draggable={!!onReorderFields}
                    />
                    <AddQuestionDropzone onAdd={() => handleAddAtIndex(index + 1)} />
                  </Box>
                </Collapse>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
