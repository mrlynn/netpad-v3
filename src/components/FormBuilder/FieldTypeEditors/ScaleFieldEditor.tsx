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
  Slider,
  Chip,
  alpha,
} from '@mui/material';
import { FieldTypeEditorProps, createUpdateValidation } from './shared/utils';

/**
 * Scale Field Editor
 * Handles: rating, nps, opinion_scale, slider, scale
 */
export function ScaleFieldEditor({ config, onUpdate }: FieldTypeEditorProps) {
  const updateValidation = createUpdateValidation(config, onUpdate);
  const fieldType = config.type?.toLowerCase();

  // Determine the field type
  const isRating = fieldType === 'rating';
  const isNps = fieldType === 'nps';
  const isOpinionScale = fieldType === 'opinion_scale' || fieldType === 'opinion-scale' || fieldType === 'opinionscale';
  const isSlider = fieldType === 'slider';
  const isScale = fieldType === 'scale' || (!isRating && !isNps && !isOpinionScale && !isSlider && fieldType === 'number');

  if (!isRating && !isNps && !isOpinionScale && !isSlider && !isScale) {
    return null;
  }

  // NPS has specific handling
  if (isNps) {
    const npsColors = {
      detractor: '#ef4444',
      passive: '#f59e0b',
      promoter: '#22c55e',
    };
    const npsLowLabel = config.validation?.lowLabel || 'Not at all likely';
    const npsHighLabel = config.validation?.highLabel || 'Extremely likely';

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          NPS Settings
        </Typography>

        {/* Endpoint Labels */}
        <TextField
          size="small"
          label="Low Label (0)"
          placeholder="Not at all likely"
          value={npsLowLabel}
          onChange={(e) => updateValidation('lowLabel', e.target.value)}
          fullWidth
        />
        <TextField
          size="small"
          label="High Label (10)"
          placeholder="Extremely likely"
          value={npsHighLabel}
          onChange={(e) => updateValidation('highLabel', e.target.value)}
          fullWidth
        />

        {/* Preview */}
        <Box sx={{ px: 1, py: 1.5, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
            Preview
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', mb: 1 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
              const color = score <= 6 ? npsColors.detractor : score <= 8 ? npsColors.passive : npsColors.promoter;
              return (
                <Chip
                  key={score}
                  label={score}
                  size="small"
                  sx={{
                    minWidth: 28,
                    bgcolor: alpha(color, 0.15),
                    color: color,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
            <Typography variant="caption" sx={{ color: npsColors.detractor, fontWeight: 500 }}>
              {npsLowLabel}
            </Typography>
            <Typography variant="caption" sx={{ color: npsColors.promoter, fontWeight: 500 }}>
              {npsHighLabel}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 0.5 }}>
            <Typography variant="caption" sx={{ color: npsColors.detractor, opacity: 0.7 }}>
              Detractors (0-6)
            </Typography>
            <Typography variant="caption" sx={{ color: npsColors.passive, opacity: 0.7 }}>
              Passives (7-8)
            </Typography>
            <Typography variant="caption" sx={{ color: npsColors.promoter, opacity: 0.7 }}>
              Promoters (9-10)
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // Rating and Scale share similar UI
  const minVal = config.validation?.min ?? (isRating ? 1 : 1);
  const maxVal = config.validation?.max ?? (isRating ? 5 : 10);
  const displayStyle = config.validation?.scaleDisplayStyle || 'buttons';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
        {isRating ? 'Rating Settings' : 'Scale Settings'}
      </Typography>

      {/* Display Style Selector */}
      <FormControl fullWidth size="small">
        <InputLabel>Display Style</InputLabel>
        <Select
          value={displayStyle}
          label="Display Style"
          onChange={(e) => updateValidation('scaleDisplayStyle', e.target.value)}
        >
          <MenuItem value="buttons">Number Buttons</MenuItem>
          <MenuItem value="slider">Slider</MenuItem>
          <MenuItem value="radio">Radio Buttons</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          type="number"
          label="Minimum Value"
          value={minVal}
          onChange={(e) => updateValidation('min', Number(e.target.value))}
          inputProps={{ min: 0, max: 10 }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          type="number"
          label="Maximum Value"
          value={maxVal}
          onChange={(e) => updateValidation('max', Number(e.target.value))}
          inputProps={{ min: 1, max: 100 }}
          sx={{ flex: 1 }}
        />
      </Box>

      {/* Slider-specific options */}
      {displayStyle === 'slider' && (
        <>
          <TextField
            size="small"
            type="number"
            label="Step"
            value={config.validation?.step ?? 1}
            onChange={(e) => updateValidation('step', Number(e.target.value) || 1)}
            inputProps={{ min: 0.1, step: 0.1 }}
            helperText="Increment between values"
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.validation?.showValue !== false}
                onChange={(e) => updateValidation('showValue', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Show Current Value</Typography>}
          />
        </>
      )}

      {/* Labels for scale endpoints */}
      <TextField
        size="small"
        label="Low Label"
        placeholder="e.g., Not at all likely"
        value={config.validation?.lowLabel || ''}
        onChange={(e) => updateValidation('lowLabel', e.target.value)}
        fullWidth
      />
      <TextField
        size="small"
        label="High Label"
        placeholder="e.g., Extremely likely"
        value={config.validation?.highLabel || ''}
        onChange={(e) => updateValidation('highLabel', e.target.value)}
        fullWidth
      />

      {isRating && (
        <FormControl fullWidth size="small">
          <InputLabel>Rating Icon Style</InputLabel>
          <Select
            value={config.validation?.ratingStyle || 'stars'}
            label="Rating Icon Style"
            onChange={(e) => updateValidation('ratingStyle', e.target.value)}
          >
            <MenuItem value="stars">Stars</MenuItem>
            <MenuItem value="hearts">Hearts</MenuItem>
            <MenuItem value="thumbs">Thumbs</MenuItem>
            <MenuItem value="emojis">Emojis</MenuItem>
            <MenuItem value="numbers">Numbers</MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Preview */}
      <Box sx={{ px: 1, py: 1, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
          Preview ({displayStyle})
        </Typography>

        {displayStyle === 'slider' ? (
          <Box sx={{ px: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {config.validation?.lowLabel || minVal}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {config.validation?.highLabel || maxVal}
              </Typography>
            </Box>
            <Slider
              value={Math.round((minVal + maxVal) / 2)}
              min={minVal}
              max={maxVal}
              step={config.validation?.step || 1}
              marks
              valueLabelDisplay="auto"
              disabled
              sx={{
                color: '#00ED64',
                '& .MuiSlider-thumb': {
                  bgcolor: '#00ED64',
                },
                '& .MuiSlider-track': {
                  bgcolor: '#00ED64',
                },
                '& .MuiSlider-rail': {
                  bgcolor: alpha('#00ED64', 0.3),
                },
                '& .MuiSlider-mark': {
                  bgcolor: alpha('#00ED64', 0.5),
                },
              }}
            />
          </Box>
        ) : displayStyle === 'radio' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {Array.from({ length: Math.min(maxVal - minVal + 1, 5) }, (_, i) => minVal + i).map((val) => (
              <Box key={val} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: val === Math.round((minVal + maxVal) / 2) ? '#00ED64' : 'divider',
                    bgcolor: val === Math.round((minVal + maxVal) / 2) ? '#00ED64' : 'transparent',
                  }}
                />
                <Typography variant="caption">{val}</Typography>
              </Box>
            ))}
            {maxVal - minVal > 4 && (
              <Typography variant="caption" color="text.secondary">... and more</Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {Array.from({ length: maxVal - minVal + 1 }, (_, i) => minVal + i).map((val) => (
              <Chip
                key={val}
                label={val}
                size="small"
                sx={{
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                  fontWeight: 500,
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
