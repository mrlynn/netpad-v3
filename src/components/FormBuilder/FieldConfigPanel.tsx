'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  List,
  ListItem,
  alpha,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add,
  Delete,
  Storage,
  DragIndicator,
  ArrowUpward,
  ArrowDownward,
  Title,
  Notes,
  HorizontalRule,
  Image,
  SpaceBar
} from '@mui/icons-material';
import { FieldConfig, LayoutFieldType, FieldWidth } from '@/types/form';
import { ConditionalLogicEditor } from './ConditionalLogicEditor';
import { LookupConfigEditor } from './LookupConfigEditor';
import { ComputedConfigEditor } from './ComputedConfigEditor';
import { RepeaterConfigEditor } from './RepeaterConfigEditor';
import { ArrayPatternConfigEditor } from './ArrayPatternConfigEditor';
import { AddCustomFieldDialog } from './AddCustomFieldDialog';
import { HelpButton } from '@/components/Help';

// Layout field types that don't have data input
const LAYOUT_FIELD_TYPES: LayoutFieldType[] = ['section-header', 'description', 'divider', 'image', 'spacer'];

// Get icon for layout field type
const getLayoutIcon = (type: LayoutFieldType) => {
  switch (type) {
    case 'section-header': return <Title fontSize="small" />;
    case 'description': return <Notes fontSize="small" />;
    case 'divider': return <HorizontalRule fontSize="small" />;
    case 'image': return <Image fontSize="small" />;
    case 'spacer': return <SpaceBar fontSize="small" />;
    default: return null;
  }
};

interface FieldConfigPanelProps {
  fieldConfigs: FieldConfig[];
  onUpdateField: (path: string, updates: Partial<FieldConfig>) => void;
  onAddField?: (field: FieldConfig) => void;
  onRemoveField?: (path: string) => void;
  onMoveField?: (path: string, direction: 'up' | 'down') => void;
  onReorderFields?: (newOrder: FieldConfig[]) => void;
}

export function FieldConfigPanel({
  fieldConfigs,
  onUpdateField,
  onAddField,
  onRemoveField,
  onMoveField,
  onReorderFields
}: FieldConfigPanelProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Separate schema fields from custom fields
  const schemaFields = fieldConfigs.filter((f) => f.source !== 'custom');
  const customFields = fieldConfigs.filter((f) => f.source === 'custom');

  const handleAddField = (field: FieldConfig) => {
    onAddField?.(field);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, path: string) => {
    setDraggedField(path);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', path);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedField(null);
    setDragOverField(null);
    dragCounter.current = 0;
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragEnter = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    dragCounter.current++;
    if (path !== draggedField) {
      setDragOverField(path);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverField(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    setDragOverField(null);
    dragCounter.current = 0;

    if (!draggedField || draggedField === targetPath || !onReorderFields) return;

    const dragIndex = fieldConfigs.findIndex((f) => f.path === draggedField);
    const dropIndex = fieldConfigs.findIndex((f) => f.path === targetPath);

    if (dragIndex === -1 || dropIndex === -1) return;

    const newConfigs = [...fieldConfigs];
    const [removed] = newConfigs.splice(dragIndex, 1);
    newConfigs.splice(dropIndex, 0, removed);
    onReorderFields(newConfigs);
    setDraggedField(null);
  };

  // Check if field can move in a direction
  const canMoveUp = (path: string) => {
    const index = fieldConfigs.findIndex((f) => f.path === path);
    return index > 0;
  };

  const canMoveDown = (path: string) => {
    const index = fieldConfigs.findIndex((f) => f.path === path);
    return index < fieldConfigs.length - 1;
  };

  // Check if this is a layout field (non-data display element)
  const isLayoutField = (config: FieldConfig) => {
    // Check if layout config exists
    if (config.layout) return true;
    // Check if type is a layout type (case-insensitive, trimmed)
    const normalizedType = config.type?.toLowerCase().trim();
    return LAYOUT_FIELD_TYPES.some(lt => lt === normalizedType);
  };

  const getFieldBorderColor = (config: FieldConfig) => {
    if (isLayoutField(config)) return '#9c27b0';
    if (config.source === 'custom') return '#ff9800';
    if (config.computed) return '#9c27b0';
    if (config.lookup) return '#2196f3';
    return 'divider';
  };

  const getFieldBgColor = (config: FieldConfig) => {
    if (!config.included) return 'background.default';
    if (isLayoutField(config)) return alpha('#9c27b0', 0.05);
    if (config.source === 'custom') return alpha('#ff9800', 0.05);
    return alpha('#00ED64', 0.05);
  };

  const renderFieldItem = (config: FieldConfig) => (
    <ListItem
      key={config.path}
      draggable={!!onReorderFields}
      onDragStart={(e) => handleDragStart(e, config.path)}
      onDragEnd={handleDragEnd}
      onDragEnter={(e) => handleDragEnter(e, config.path)}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, config.path)}
      sx={{
        flexDirection: 'column',
        alignItems: 'stretch',
        mb: 2,
        p: 2,
        border: '2px solid',
        borderColor: dragOverField === config.path ? '#00ED64' : getFieldBorderColor(config),
        borderRadius: 1,
        bgcolor: dragOverField === config.path ? alpha('#00ED64', 0.1) : getFieldBgColor(config),
        cursor: onReorderFields ? 'grab' : 'default',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:active': onReorderFields ? { cursor: 'grabbing' } : {}
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Drag Handle */}
          {onReorderFields && (
            <Tooltip title="Drag to reorder">
              <DragIndicator
                fontSize="small"
                sx={{ color: 'text.disabled', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
              />
            </Tooltip>
          )}
          {/* Layout field icon */}
          {isLayoutField(config) && (
            <Box sx={{ color: '#9c27b0', display: 'flex', alignItems: 'center' }}>
              {getLayoutIcon(config.type as LayoutFieldType)}
            </Box>
          )}
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: isLayoutField(config) ? 'inherit' : 'monospace' }}>
            {isLayoutField(config) ? (config.layout?.title || config.label) : config.path}
          </Typography>
          <Chip
            label={config.type}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: isLayoutField(config) ? alpha('#9c27b0', 0.1) : alpha('#00ED64', 0.1),
              color: isLayoutField(config) ? '#9c27b0' : '#00ED64'
            }}
          />
          {isLayoutField(config) && (
            <Chip
              label="Layout"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: alpha('#9c27b0', 0.1),
                color: '#9c27b0'
              }}
            />
          )}
          {config.source === 'custom' && !isLayoutField(config) && (
            <Chip
              label="Custom"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: alpha('#ff9800', 0.1),
                color: '#ff9800'
              }}
            />
          )}
          {config.includeInDocument === false && !isLayoutField(config) && (
            <Chip
              label="No Doc"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: alpha('#9e9e9e', 0.1),
                color: '#9e9e9e'
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Move Up/Down Buttons */}
          {onMoveField && (
            <>
              <Tooltip title="Move up">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onMoveField(config.path, 'up')}
                    disabled={!canMoveUp(config.path)}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move down">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onMoveField(config.path, 'down')}
                    disabled={!canMoveDown(config.path)}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
          {config.source === 'custom' && onRemoveField && (
            <Tooltip title="Remove custom field">
              <IconButton
                size="small"
                onClick={() => onRemoveField(config.path)}
                color="error"
                sx={{ p: 0.5 }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {/* Show Include toggle only for non-layout fields */}
          {!isLayoutField(config) && (
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.included}
                  onChange={(e) =>
                    onUpdateField(config.path, { included: e.target.checked })
                  }
                />
              }
              label="Include"
              sx={{ m: 0 }}
            />
          )}
        </Box>
      </Box>

      {/* Layout field content - simplified display */}
      {isLayoutField(config) && config.included && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Show layout-specific content preview */}
          {config.layout?.type === 'section-header' && (
            <>
              <TextField
                size="small"
                label="Section Title"
                value={config.layout.title || ''}
                onChange={(e) => onUpdateField(config.path, {
                  layout: { ...config.layout!, title: e.target.value },
                  label: e.target.value
                })}
                fullWidth
              />
              <TextField
                size="small"
                label="Subtitle"
                value={config.layout.subtitle || ''}
                onChange={(e) => onUpdateField(config.path, {
                  layout: { ...config.layout!, subtitle: e.target.value }
                })}
                fullWidth
                multiline
                rows={2}
              />
            </>
          )}
          {config.layout?.type === 'description' && (
            <TextField
              size="small"
              label="Text Content"
              value={config.layout.content || ''}
              onChange={(e) => onUpdateField(config.path, {
                layout: { ...config.layout!, content: e.target.value }
              })}
              fullWidth
              multiline
              rows={3}
            />
          )}
          {config.layout?.type === 'image' && (
            <>
              <TextField
                size="small"
                label="Image URL"
                value={config.layout.imageUrl || ''}
                onChange={(e) => onUpdateField(config.path, {
                  layout: { ...config.layout!, imageUrl: e.target.value }
                })}
                fullWidth
              />
              <TextField
                size="small"
                label="Alt Text"
                value={config.layout.imageAlt || ''}
                onChange={(e) => onUpdateField(config.path, {
                  layout: { ...config.layout!, imageAlt: e.target.value }
                })}
                fullWidth
              />
            </>
          )}
          {config.layout?.type === 'spacer' && (
            <TextField
              size="small"
              label="Height (pixels)"
              type="number"
              value={config.layout.height || 24}
              onChange={(e) => onUpdateField(config.path, {
                layout: { ...config.layout!, height: Number(e.target.value) || 24 }
              })}
              inputProps={{ min: 8, max: 200 }}
              fullWidth
            />
          )}
          {config.layout?.type === 'divider' && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              A horizontal line will be displayed to separate sections.
            </Typography>
          )}
          {/* Conditional logic still applies to layout fields */}
          <ConditionalLogicEditor
            config={config}
            allFieldConfigs={fieldConfigs}
            onUpdate={(conditionalLogic) =>
              onUpdateField(config.path, { conditionalLogic })
            }
          />
        </Box>
      )}

      {/* Data field content - full options */}
      {!isLayoutField(config) && config.included && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            size="small"
            label="Label"
            value={config.label}
            onChange={(e) => onUpdateField(config.path, { label: e.target.value })}
            fullWidth
          />
          <TextField
            size="small"
            label="Placeholder"
            value={config.placeholder || ''}
            onChange={(e) => onUpdateField(config.path, { placeholder: e.target.value })}
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Field Width</InputLabel>
            <Select
              label="Field Width"
              value={config.fieldWidth || 'full'}
              onChange={(e) => onUpdateField(config.path, { fieldWidth: e.target.value as FieldWidth })}
            >
              <MenuItem value="full">Full Width</MenuItem>
              <MenuItem value="half">Half (1/2)</MenuItem>
              <MenuItem value="third">Third (1/3)</MenuItem>
              <MenuItem value="quarter">Quarter (1/4)</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.required}
                  onChange={(e) =>
                    onUpdateField(config.path, { required: e.target.checked })
                  }
                />
              }
              label="Required"
              sx={{ m: 0 }}
            />
            {config.source === 'custom' && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config.includeInDocument !== false}
                    onChange={(e) =>
                      onUpdateField(config.path, { includeInDocument: e.target.checked })
                    }
                  />
                }
                label="In Document"
                sx={{ m: 0 }}
              />
            )}
          </Box>
          <ConditionalLogicEditor
            config={config}
            allFieldConfigs={fieldConfigs}
            onUpdate={(conditionalLogic) =>
              onUpdateField(config.path, { conditionalLogic })
            }
          />
          <LookupConfigEditor
            config={config}
            allFieldConfigs={fieldConfigs}
            onUpdate={(lookup) =>
              onUpdateField(config.path, { lookup })
            }
          />
          <ComputedConfigEditor
            config={config}
            allFieldConfigs={fieldConfigs}
            onUpdate={(computed) =>
              onUpdateField(config.path, { computed })
            }
          />
          <RepeaterConfigEditor
            config={config}
            onUpdate={(repeater) =>
              onUpdateField(config.path, { repeater })
            }
          />
          {/* Array Pattern Editor - only for array fields */}
          {(config.type === 'array' || config.type === 'array-object') && (
            <ArrayPatternConfigEditor
              config={config.arrayPattern}
              onChange={(arrayPattern) =>
                onUpdateField(config.path, { arrayPattern })
              }
              sampleValue={config.defaultValue}
            />
          )}
        </Box>
      )}
    </ListItem>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha('#00ED64', 0.05)
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Field Configuration
            </Typography>
            <HelpButton topicId="field-configuration" tooltip="Field Configuration Help" />
          </Box>
          {onAddField && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setAddDialogOpen(true)}
              sx={{
                borderColor: '#ff9800',
                color: '#ff9800',
                fontSize: '0.7rem',
                py: 0.5,
                '&:hover': {
                  borderColor: '#ff9800',
                  bgcolor: alpha('#ff9800', 0.05)
                }
              }}
            >
              Custom Field
            </Button>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Configure form fields • {schemaFields.length} schema, {customFields.length} custom
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {fieldConfigs.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
              textAlign: 'center',
              gap: 2
            }}
          >
            <Storage sx={{ fontSize: 48, opacity: 0.3 }} />
            <Typography variant="body2">
              No fields available. Select a collection to see fields.
            </Typography>
            {onAddField && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setAddDialogOpen(true)}
                sx={{
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  '&:hover': {
                    borderColor: '#ff9800',
                    bgcolor: alpha('#ff9800', 0.05)
                  }
                }}
              >
                Add Custom Field
              </Button>
            )}
          </Box>
        ) : (
          <>
            {/* Custom Fields Section */}
            {customFields.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                    color: '#ff9800',
                    fontWeight: 600
                  }}
                >
                  <Add fontSize="small" />
                  Custom Fields ({customFields.length})
                </Typography>
                <List sx={{ p: 0 }}>
                  {customFields.map(renderFieldItem)}
                </List>
                <Divider sx={{ my: 2 }} />
              </>
            )}

            {/* Schema Fields Section */}
            {schemaFields.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                    color: '#00ED64',
                    fontWeight: 600
                  }}
                >
                  <Storage fontSize="small" />
                  Schema Fields ({schemaFields.length})
                </Typography>
                <List sx={{ p: 0 }}>
                  {schemaFields.map(renderFieldItem)}
                </List>
              </>
            )}
          </>
        )}
      </Box>

      {/* Add Custom Field Dialog */}
      <AddCustomFieldDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddField}
        existingPaths={fieldConfigs.map((f) => f.path)}
      />
    </Box>
  );
}
