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
  Chip,
  alpha,
} from '@mui/material';
import { FieldTypeEditorProps, createUpdateValidation } from './shared/utils';

/**
 * Advanced Field Editor
 * Handles: color_picker, matrix, ranking, address
 */
export function AdvancedFieldEditor({ config, onUpdate }: FieldTypeEditorProps) {
  const updateValidation = createUpdateValidation(config, onUpdate);
  const fieldType = config.type?.toLowerCase();

  const isColorPicker = fieldType === 'color_picker' || fieldType === 'color-picker' || fieldType === 'colorpicker' || fieldType === 'color';
  const isMatrix = fieldType === 'matrix';
  const isRanking = fieldType === 'ranking';
  const isAddress = fieldType === 'address';

  if (!isColorPicker && !isMatrix && !isRanking && !isAddress) {
    return null;
  }

  if (isColorPicker) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Color Picker Settings
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Color Format</InputLabel>
          <Select
            value={config.validation?.colorFormat || 'hex'}
            label="Color Format"
            onChange={(e) => updateValidation('colorFormat', e.target.value)}
          >
            <MenuItem value="hex">HEX (#RRGGBB)</MenuItem>
            <MenuItem value="rgb">RGB (r, g, b)</MenuItem>
            <MenuItem value="hsl">HSL (h, s, l)</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Picker Style</InputLabel>
          <Select
            value={config.validation?.pickerStyle || 'chrome'}
            label="Picker Style"
            onChange={(e) => updateValidation('pickerStyle', e.target.value)}
          >
            <MenuItem value="chrome">Chrome (Full)</MenuItem>
            <MenuItem value="sketch">Sketch</MenuItem>
            <MenuItem value="compact">Compact</MenuItem>
            <MenuItem value="swatches">Swatches Only</MenuItem>
            <MenuItem value="block">Block</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.showAlpha || false}
              onChange={(e) => updateValidation('showAlpha', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Allow Transparency (Alpha)</Typography>}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.presetsOnly || false}
              onChange={(e) => updateValidation('presetsOnly', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Preset Colors Only</Typography>}
        />

        <TextField
          size="small"
          label="Preset Colors"
          placeholder="#FF0000, #00FF00, #0000FF"
          value={(config.validation?.presetColors || []).join(', ')}
          onChange={(e) => updateValidation('presetColors', e.target.value.split(',').map(c => c.trim()).filter(Boolean))}
          helperText="Comma-separated color values"
          fullWidth
        />

        {/* Preview */}
        <Box sx={{ px: 1, py: 1.5, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
            Preview
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(config.validation?.presetColors?.length ? config.validation.presetColors : ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33']).map((color, i) => (
              <Box
                key={i}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: color,
                  borderRadius: 1,
                  border: '2px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  if (isMatrix) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Matrix/Grid Settings
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Cell Input Type</InputLabel>
          <Select
            value={config.validation?.matrixCellType || 'radio'}
            label="Cell Input Type"
            onChange={(e) => updateValidation('matrixCellType', e.target.value)}
          >
            <MenuItem value="radio">Radio (Single per row)</MenuItem>
            <MenuItem value="checkbox">Checkbox (Multiple per row)</MenuItem>
            <MenuItem value="dropdown">Dropdown</MenuItem>
            <MenuItem value="text">Text Input</MenuItem>
            <MenuItem value="number">Number Input</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.requireAllRows || false}
              onChange={(e) => updateValidation('requireAllRows', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Require All Rows</Typography>}
        />

        {config.validation?.matrixCellType === 'radio' && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.onePerColumn || false}
                onChange={(e) => updateValidation('onePerColumn', e.target.checked)}
              />
            }
            label={<Typography variant="body2">One Answer Per Column</Typography>}
          />
        )}

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.randomizeRows || false}
              onChange={(e) => updateValidation('randomizeRows', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Randomize Rows</Typography>}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.randomizeColumns || false}
              onChange={(e) => updateValidation('randomizeColumns', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Randomize Columns</Typography>}
        />

        <Typography variant="caption" color="text.secondary">
          Configure rows and columns in the Options editor above
        </Typography>
      </Box>
    );
  }

  if (isRanking) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Ranking Settings
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Display Style</InputLabel>
          <Select
            value={config.validation?.dragStyle || 'list'}
            label="Display Style"
            onChange={(e) => updateValidation('dragStyle', e.target.value)}
          >
            <MenuItem value="list">Vertical List</MenuItem>
            <MenuItem value="cards">Cards</MenuItem>
            <MenuItem value="grid">Grid</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            type="number"
            label="Min Items to Rank"
            value={config.validation?.minRank || ''}
            onChange={(e) => updateValidation('minRank', e.target.value ? Number(e.target.value) : undefined)}
            helperText="0 = rank all"
            inputProps={{ min: 0 }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            label="Max Items to Rank"
            value={config.validation?.maxRank || ''}
            onChange={(e) => updateValidation('maxRank', e.target.value ? Number(e.target.value) : undefined)}
            helperText="0 = no limit"
            inputProps={{ min: 0 }}
            sx={{ flex: 1 }}
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.showRankNumbers !== false}
              onChange={(e) => updateValidation('showRankNumbers', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Show Rank Numbers</Typography>}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.allowTies || false}
              onChange={(e) => updateValidation('allowTies', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Allow Ties (Same Rank)</Typography>}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.randomizeOptions || false}
              onChange={(e) => updateValidation('randomizeOptions', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Randomize Initial Order</Typography>}
        />
      </Box>
    );
  }

  // Address
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
        Address Settings
      </Typography>

      <FormControl fullWidth size="small">
        <InputLabel>Display Mode</InputLabel>
        <Select
          value={config.validation?.addressDisplayMode || 'multi'}
          label="Display Mode"
          onChange={(e) => updateValidation('addressDisplayMode', e.target.value)}
        >
          <MenuItem value="single">Single Line (Autocomplete)</MenuItem>
          <MenuItem value="multi">Multiple Fields</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel>Address Components</InputLabel>
        <Select
          multiple
          value={config.validation?.addressComponents || ['street1', 'city', 'state', 'postalCode', 'country']}
          label="Address Components"
          onChange={(e) => updateValidation('addressComponents', e.target.value)}
          renderValue={(selected) => (selected as string[]).join(', ')}
        >
          <MenuItem value="street1">Street Address</MenuItem>
          <MenuItem value="street2">Street Address Line 2</MenuItem>
          <MenuItem value="city">City</MenuItem>
          <MenuItem value="state">State/Province</MenuItem>
          <MenuItem value="postalCode">Postal/ZIP Code</MenuItem>
          <MenuItem value="country">Country</MenuItem>
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Default Country"
        placeholder="US"
        value={config.validation?.addressDefaultCountry || ''}
        onChange={(e) => updateValidation('addressDefaultCountry', e.target.value.toUpperCase())}
        helperText="ISO country code"
        inputProps={{ maxLength: 2 }}
        fullWidth
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config.validation?.enableAutocomplete || false}
            onChange={(e) => updateValidation('enableAutocomplete', e.target.checked)}
          />
        }
        label={<Typography variant="body2">Enable Address Autocomplete</Typography>}
      />

      {config.validation?.enableAutocomplete && (
        <FormControl fullWidth size="small">
          <InputLabel>Autocomplete Provider</InputLabel>
          <Select
            value={config.validation?.autocompleteProvider || 'google'}
            label="Autocomplete Provider"
            onChange={(e) => updateValidation('autocompleteProvider', e.target.value)}
          >
            <MenuItem value="google">Google Places</MenuItem>
            <MenuItem value="mapbox">Mapbox</MenuItem>
            <MenuItem value="here">HERE Maps</MenuItem>
          </Select>
        </FormControl>
      )}

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config.validation?.showMap || false}
            onChange={(e) => updateValidation('showMap', e.target.checked)}
          />
        }
        label={<Typography variant="body2">Show Map Preview</Typography>}
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config.validation?.requireAllComponents || false}
            onChange={(e) => updateValidation('requireAllComponents', e.target.checked)}
          />
        }
        label={<Typography variant="body2">Require All Components</Typography>}
      />
    </Box>
  );
}
