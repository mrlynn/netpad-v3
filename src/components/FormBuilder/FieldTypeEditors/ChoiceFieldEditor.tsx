'use client';

import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  alpha,
} from '@mui/material';
import { Add, Delete, DragIndicator } from '@mui/icons-material';
import { FieldTypeEditorProps, createUpdateValidation } from './shared/utils';

/**
 * Choice Field Editor
 * Handles: multiple_choice, checkboxes, dropdown
 */
export function ChoiceFieldEditor({ config, onUpdate }: FieldTypeEditorProps) {
  const updateValidation = createUpdateValidation(config, onUpdate);
  const fieldType = config.type?.toLowerCase();

  // Determine the field type
  const isMultipleChoice = fieldType === 'multiple_choice' || fieldType === 'multiple-choice' || fieldType === 'multiplechoice' || fieldType === 'radio';
  const isCheckboxes = fieldType === 'checkboxes' || fieldType === 'checkbox';
  const isDropdown = fieldType === 'dropdown' || fieldType === 'select';

  if (!isMultipleChoice && !isCheckboxes && !isDropdown) {
    return null;
  }

  const typeLabel = isMultipleChoice ? 'Multiple Choice' : isCheckboxes ? 'Checkboxes' : 'Dropdown';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
        {typeLabel} Settings
      </Typography>

      {/* Options Editor */}
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          Options
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {(config.validation?.options || []).map((option, index) => {
            const optionLabel = typeof option === 'string' ? option : option.label;
            const optionValue = typeof option === 'string' ? option : option.value;
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  bgcolor: alpha('#000', 0.02),
                  borderRadius: 1,
                }}
              >
                <DragIndicator
                  sx={{ color: 'text.disabled', cursor: 'grab', fontSize: 18 }}
                />
                <TextField
                  size="small"
                  value={optionLabel}
                  onChange={(e) => {
                    const currentOptions = [...(config.validation?.options || [])];
                    const newValue = e.target.value.toLowerCase().replace(/\s+/g, '_');
                    currentOptions[index] = { label: e.target.value, value: newValue };
                    updateValidation('options', currentOptions);
                  }}
                  placeholder="Option label"
                  sx={{ flex: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    const currentOptions = [...(config.validation?.options || [])];
                    currentOptions.splice(index, 1);
                    updateValidation('options', currentOptions);
                  }}
                  disabled={(config.validation?.options || []).length <= 1}
                  sx={{ color: 'text.secondary' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
        <Box
          onClick={() => {
            const currentOptions = [...(config.validation?.options || [])];
            const newIndex = currentOptions.length + 1;
            currentOptions.push({ label: `Option ${newIndex}`, value: `option_${newIndex}` });
            updateValidation('options', currentOptions);
          }}
          sx={{
            mt: 1,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            color: '#00ED64',
            borderRadius: 1,
            border: '1px dashed',
            borderColor: alpha('#00ED64', 0.3),
            bgcolor: alpha('#00ED64', 0.02),
            '&:hover': {
              bgcolor: alpha('#00ED64', 0.05),
            },
          }}
        >
          <Add fontSize="small" />
          <Typography variant="body2">Add option</Typography>
        </Box>
      </Box>

      {/* Layout (for multiple_choice and checkboxes) */}
      {(isMultipleChoice || isCheckboxes) && (
        <>
          <FormControl fullWidth size="small">
            <InputLabel>Layout</InputLabel>
            <Select
              value={config.validation?.choiceLayout || 'vertical'}
              label="Layout"
              onChange={(e) => updateValidation('choiceLayout', e.target.value)}
            >
              <MenuItem value="vertical">Vertical List</MenuItem>
              <MenuItem value="horizontal">Horizontal Row</MenuItem>
              <MenuItem value="grid">Grid</MenuItem>
            </Select>
          </FormControl>

          {config.validation?.choiceLayout === 'grid' && (
            <TextField
              size="small"
              type="number"
              label="Number of Columns"
              value={config.validation?.choiceColumns || 2}
              onChange={(e) => updateValidation('choiceColumns', Number(e.target.value) || 2)}
              inputProps={{ min: 2, max: 6 }}
              fullWidth
            />
          )}

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.randomizeOptions || false}
                onChange={(e) => updateValidation('randomizeOptions', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Randomize Option Order</Typography>}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.allowOther || false}
                onChange={(e) => updateValidation('allowOther', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Allow "Other" Option</Typography>}
          />

          {config.validation?.allowOther && (
            <TextField
              size="small"
              label="Other Option Label"
              placeholder="Other (please specify)"
              value={config.validation?.otherLabel || 'Other'}
              onChange={(e) => updateValidation('otherLabel', e.target.value)}
              fullWidth
            />
          )}

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.showImages || false}
                onChange={(e) => updateValidation('showImages', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Show Images with Options</Typography>}
          />

          {config.validation?.showImages && (
            <FormControl fullWidth size="small">
              <InputLabel>Image Size</InputLabel>
              <Select
                value={config.validation?.imageSize || 'medium'}
                label="Image Size"
                onChange={(e) => updateValidation('imageSize', e.target.value)}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Checkboxes-specific options */}
          {isCheckboxes && (
            <>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  type="number"
                  label="Min Selections"
                  value={config.validation?.minSelections || ''}
                  onChange={(e) => updateValidation('minSelections', e.target.value ? Number(e.target.value) : undefined)}
                  inputProps={{ min: 0 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Max Selections"
                  value={config.validation?.maxSelections || ''}
                  onChange={(e) => updateValidation('maxSelections', e.target.value ? Number(e.target.value) : undefined)}
                  inputProps={{ min: 1 }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config.validation?.showSelectAll || false}
                    onChange={(e) => updateValidation('showSelectAll', e.target.checked)}
                  />
                }
                label={<Typography variant="body2">Show "Select All" Option</Typography>}
              />
            </>
          )}
        </>
      )}

      {/* Dropdown-specific options */}
      {isDropdown && (
        <>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.multiple || false}
                onChange={(e) => updateValidation('multiple', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Allow Multiple Selections</Typography>}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.searchable !== false}
                onChange={(e) => updateValidation('searchable', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Enable Search/Filter</Typography>}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.allowCreate || false}
                onChange={(e) => updateValidation('allowCreate', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Allow Creating New Options</Typography>}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.clearable !== false}
                onChange={(e) => updateValidation('clearable', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Show Clear Button</Typography>}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.groupedOptions || false}
                onChange={(e) => updateValidation('groupedOptions', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Group Options by Category</Typography>}
          />

          {config.validation?.multiple && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="number"
                label="Min Selections"
                value={config.validation?.minSelections || ''}
                onChange={(e) => updateValidation('minSelections', e.target.value ? Number(e.target.value) : undefined)}
                inputProps={{ min: 0 }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Max Selections"
                value={config.validation?.maxSelections || ''}
                onChange={(e) => updateValidation('maxSelections', e.target.value ? Number(e.target.value) : undefined)}
                inputProps={{ min: 1 }}
                sx={{ flex: 1 }}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
