'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  alpha,
  IconButton,
  Tooltip,
  InputBase,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Add,
  DragIndicator,
  Info,
} from '@mui/icons-material';
import { FieldConfig, LayoutFieldType, FormHeader, FormType, FormTheme } from '@/types/form';
import { WYSIWYGFieldCard } from './WYSIWYGFieldCard';
import { AddQuestionDropzone } from './AddQuestionDropzone';
import { FormHeaderDisplay } from './FormHeaderDisplay';
import { evaluateConditionalLogic } from '@/utils/conditionalLogic';
import { getResolvedTheme } from '@/lib/formThemes';

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
  // Form type for conversational mode warning
  formType?: FormType;
  // Theme configuration for WYSIWYG preview
  theme?: FormTheme;
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
  formType,
  theme: themeProp,
}: WYSIWYGFormEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const dragCounter = useRef(0);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Resolve the form theme (applies preset defaults if needed)
  const resolvedTheme = useMemo(() => getResolvedTheme(themeProp), [themeProp]);
  const primaryColor = resolvedTheme.primaryColor || '#00ED64';
  const backgroundColor = resolvedTheme.backgroundColor || '#FFFFFF';
  const surfaceColor = resolvedTheme.surfaceColor || '#F9FBFA';
  const textColor = resolvedTheme.textColor || '#001E2B';
  const textSecondaryColor = resolvedTheme.textSecondaryColor || '#5C6C75';
  const borderRadius = resolvedTheme.borderRadius || 8;
  const inputStyle = resolvedTheme.inputStyle || 'outlined';
  const inputBorderRadius = resolvedTheme.inputBorderRadius || borderRadius;
  const isDarkMode = resolvedTheme.mode === 'dark';

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
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: isDarkMode ? resolvedTheme.backgroundColor : surfaceColor,
      position: 'relative',
      transition: 'background-color 0.3s ease',
    }}>
      {/* Large centered NetPad logo watermark */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      >
        <Box
          component="img"
          src="/netpad-logo.svg"
          alt=""
          sx={{
            width: 180,
            height: 180,
            opacity: isDarkMode ? 0.05 : 0.03,
          }}
        />
      </Box>

      {/* Scrollable form area - Google Forms style centered */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 3, px: 2, position: 'relative', zIndex: 1 }}>
        {/* Form Header with inline editable title - matches published form */}
        {/* data-thumbnail-target is used by FormBuilder to capture preview for thumbnails */}
        <Box sx={{ maxWidth: 700, mx: 'auto', mb: 3 }} data-thumbnail-target="true">
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
              elevation={resolvedTheme.elevation ?? 0}
              sx={{
                p: 3,
                borderRadius: `${borderRadius}px`,
                borderTop: '4px solid',
                borderColor: primaryColor,
                bgcolor: backgroundColor,
                transition: 'all 0.3s ease',
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
                    color: textColor,
                    '& input': {
                      p: 0,
                      pb: 0.5,
                      borderBottom: '2px solid',
                      borderColor: primaryColor,
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
                    color: formTitle ? textColor : textSecondaryColor,
                    borderBottom: '1px solid transparent',
                    '&:hover': {
                      borderBottomColor: alpha(textColor, 0.2),
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
                    color: textSecondaryColor,
                    '& textarea': {
                      p: 0,
                      pb: 0.5,
                      borderBottom: '2px solid',
                      borderColor: primaryColor,
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
                    color: formDescription ? textSecondaryColor : alpha(textSecondaryColor, 0.5),
                    borderBottom: '1px solid transparent',
                    minHeight: 24,
                    '&:hover': {
                      borderBottomColor: alpha(textColor, 0.2),
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
                bgcolor: backgroundColor,
                borderRadius: `${borderRadius}px`,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, color: textSecondaryColor }}>
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
                  color: textColor,
                  '& input': {
                    p: 1,
                    border: '2px solid',
                    borderColor: primaryColor,
                    borderRadius: `${inputBorderRadius}px`,
                  },
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: textSecondaryColor }}>
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
              bgcolor: alpha(primaryColor, 0.03),
              border: '2px dashed',
              borderColor: alpha(primaryColor, 0.3),
              borderRadius: `${borderRadius}px`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: primaryColor,
                bgcolor: alpha(primaryColor, 0.08),
              },
            }}
            onClick={() => onAddFieldAtIndex?.(0)}
          >
            <Add sx={{ fontSize: 48, color: alpha(primaryColor, 0.5), mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, color: textSecondaryColor }}>
              Start building your form
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(textSecondaryColor, 0.7) }}>
              Click here or use the + button to add your first question
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ maxWidth: 700, mx: 'auto' }}>
            {/* Conversational Mode Warning */}
            {formType === 'conversational' && (
              <Alert 
                severity="warning" 
                icon={<Info />}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Conversational Mode Active
                </Typography>
                <Typography variant="caption">
                  This form uses AI conversation to collect data. Form fields should match your extraction schema defined in Settings → Conversational Config. 
                  Fields are used for data mapping and workflow integration. To sync fields with your extraction schema, go to Settings → Conversational Config → Extraction Schema and click "Generate Form Fields from Extraction Schema".
                </Typography>
              </Alert>
            )}

            {/* First dropzone */}
            <AddQuestionDropzone onAdd={() => handleAddAtIndex(0)} />

            {/* Field cards - 12-column grid layout */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: 0,
                alignItems: 'start',
              }}
            >
              {fieldConfigs.map((config, index) => {
                const isVisible = evaluateConditionalLogic(
                  config.conditionalLogic,
                  formData
                );
                const isSelected = selectedFieldPath === config.path;
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                // Map fieldWidth to grid column span
                const getGridColumn = () => {
                  switch (config.fieldWidth) {
                    case 'quarter': return 'span 3';
                    case 'third': return 'span 4';
                    case 'half': return 'span 6';
                    case 'full':
                    default: return 'span 12';
                  }
                };

                return (
                  <Collapse
                    key={config.path}
                    in={isVisible}
                    unmountOnExit
                    sx={{ gridColumn: getGridColumn() }}
                  >
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
                        theme={resolvedTheme}
                      />
                    </Box>
                  </Collapse>
                );
              })}
            </Box>
            {/* Add dropzone after grid */}
            <AddQuestionDropzone onAdd={() => handleAddAtIndex(fieldConfigs.length)} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
