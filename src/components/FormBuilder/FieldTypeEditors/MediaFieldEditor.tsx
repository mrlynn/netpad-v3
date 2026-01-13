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
  Slider,
  alpha,
} from '@mui/material';
import { FieldTypeEditorProps, createUpdateValidation } from './shared/utils';

/**
 * Media Field Editor
 * Handles: file_upload, image_upload, signature
 */
export function MediaFieldEditor({ config, onUpdate }: FieldTypeEditorProps) {
  const updateValidation = createUpdateValidation(config, onUpdate);
  const fieldType = config.type?.toLowerCase();

  const isFileUpload = fieldType === 'file_upload' || fieldType === 'file-upload' || fieldType === 'fileupload' || fieldType === 'file';
  const isImageUpload = fieldType === 'image_upload' || fieldType === 'image-upload' || fieldType === 'imageupload' || fieldType === 'image';
  const isSignature = fieldType === 'signature';

  if (!isFileUpload && !isImageUpload && !isSignature) {
    return null;
  }

  if (isFileUpload) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          File Upload Settings
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Allowed File Types</InputLabel>
          <Select
            multiple
            value={config.validation?.allowedTypes || []}
            label="Allowed File Types"
            onChange={(e) => updateValidation('allowedTypes', e.target.value)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => (
                  <Chip key={value} label={value} size="small" sx={{ height: 20 }} />
                ))}
              </Box>
            )}
          >
            <MenuItem value="application/pdf">PDF</MenuItem>
            <MenuItem value="application/msword">Word (.doc)</MenuItem>
            <MenuItem value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word (.docx)</MenuItem>
            <MenuItem value="application/vnd.ms-excel">Excel (.xls)</MenuItem>
            <MenuItem value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel (.xlsx)</MenuItem>
            <MenuItem value="text/csv">CSV</MenuItem>
            <MenuItem value="text/plain">Text</MenuItem>
            <MenuItem value="image/*">All Images</MenuItem>
            <MenuItem value="video/*">All Videos</MenuItem>
            <MenuItem value="audio/*">All Audio</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="number"
          label="Maximum File Size (MB)"
          value={config.validation?.maxSize || 10}
          onChange={(e) => updateValidation('maxSize', Number(e.target.value) || 10)}
          inputProps={{ min: 1, max: 100 }}
          fullWidth
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.multiple || false}
              onChange={(e) => updateValidation('multiple', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Allow Multiple Files</Typography>}
        />

        {config.validation?.multiple && (
          <TextField
            size="small"
            type="number"
            label="Maximum Number of Files"
            value={config.validation?.maxFiles || 5}
            onChange={(e) => updateValidation('maxFiles', Number(e.target.value) || 5)}
            inputProps={{ min: 1, max: 20 }}
            fullWidth
          />
        )}
      </Box>
    );
  }

  if (isImageUpload) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Image Upload Settings
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Allowed Image Types</InputLabel>
          <Select
            multiple
            value={config.validation?.allowedTypes || ['image/jpeg', 'image/png']}
            label="Allowed Image Types"
            onChange={(e) => updateValidation('allowedTypes', e.target.value)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => (
                  <Chip key={value} label={value.split('/')[1]?.toUpperCase()} size="small" sx={{ height: 20 }} />
                ))}
              </Box>
            )}
          >
            <MenuItem value="image/jpeg">JPEG</MenuItem>
            <MenuItem value="image/png">PNG</MenuItem>
            <MenuItem value="image/gif">GIF</MenuItem>
            <MenuItem value="image/webp">WebP</MenuItem>
            <MenuItem value="image/svg+xml">SVG</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="number"
          label="Maximum File Size (MB)"
          value={config.validation?.maxSize || 5}
          onChange={(e) => updateValidation('maxSize', Number(e.target.value) || 5)}
          inputProps={{ min: 1, max: 50 }}
          fullWidth
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.multiple || false}
              onChange={(e) => updateValidation('multiple', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Allow Multiple Images</Typography>}
        />

        {config.validation?.multiple && (
          <TextField
            size="small"
            type="number"
            label="Maximum Number of Images"
            value={config.validation?.maxFiles || 5}
            onChange={(e) => updateValidation('maxFiles', Number(e.target.value) || 5)}
            inputProps={{ min: 1, max: 20 }}
            fullWidth
          />
        )}

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.enableCrop || false}
              onChange={(e) => updateValidation('enableCrop', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Enable Image Cropping</Typography>}
        />

        {config.validation?.enableCrop && (
          <TextField
            size="small"
            type="number"
            label="Crop Aspect Ratio"
            placeholder="1.78 for 16:9"
            value={config.validation?.cropAspectRatio || ''}
            onChange={(e) => updateValidation('cropAspectRatio', e.target.value ? Number(e.target.value) : undefined)}
            helperText="Leave empty for free crop"
            fullWidth
          />
        )}

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.enableCompression || false}
              onChange={(e) => updateValidation('enableCompression', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Compress Images</Typography>}
        />

        {config.validation?.enableCompression && (
          <Box sx={{ px: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Compression Quality: {Math.round((config.validation?.compressionQuality || 0.8) * 100)}%
            </Typography>
            <Slider
              size="small"
              value={config.validation?.compressionQuality || 0.8}
              min={0.1}
              max={1}
              step={0.1}
              onChange={(_, value) => updateValidation('compressionQuality', value)}
              sx={{ color: '#00ED64' }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            type="number"
            label="Min Width (px)"
            value={config.validation?.minImageWidth || ''}
            onChange={(e) => updateValidation('minImageWidth', e.target.value ? Number(e.target.value) : undefined)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            label="Min Height (px)"
            value={config.validation?.minImageHeight || ''}
            onChange={(e) => updateValidation('minImageHeight', e.target.value ? Number(e.target.value) : undefined)}
            sx={{ flex: 1 }}
          />
        </Box>
      </Box>
    );
  }

  // Signature
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
        Signature Settings
      </Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          type="number"
          label="Canvas Width (px)"
          value={config.validation?.canvasWidth || 400}
          onChange={(e) => updateValidation('canvasWidth', Number(e.target.value) || 400)}
          inputProps={{ min: 200, max: 800 }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          type="number"
          label="Canvas Height (px)"
          value={config.validation?.canvasHeight || 150}
          onChange={(e) => updateValidation('canvasHeight', Number(e.target.value) || 150)}
          inputProps={{ min: 100, max: 400 }}
          sx={{ flex: 1 }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          type="color"
          label="Stroke Color"
          value={config.validation?.strokeColor || '#000000'}
          onChange={(e) => updateValidation('strokeColor', e.target.value)}
          sx={{ flex: 1 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="number"
          label="Stroke Width"
          value={config.validation?.strokeWidth || 2}
          onChange={(e) => updateValidation('strokeWidth', Number(e.target.value) || 2)}
          inputProps={{ min: 1, max: 10 }}
          sx={{ flex: 1 }}
        />
      </Box>

      <TextField
        size="small"
        type="color"
        label="Background Color"
        value={config.validation?.backgroundColor || '#ffffff'}
        onChange={(e) => updateValidation('backgroundColor', e.target.value)}
        fullWidth
        InputLabelProps={{ shrink: true }}
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config.validation?.allowTypedSignature || false}
            onChange={(e) => updateValidation('allowTypedSignature', e.target.checked)}
          />
        }
        label={<Typography variant="body2">Allow Typed Signature</Typography>}
      />
    </Box>
  );
}
