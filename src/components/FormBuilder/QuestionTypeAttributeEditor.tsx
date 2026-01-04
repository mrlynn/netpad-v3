'use client';

import { useState } from 'react';
import { ValidationPatternGenerator } from './ValidationPatternGenerator';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Chip,
  IconButton,
  Button,
  alpha,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Delete,
  DragIndicator,
} from '@mui/icons-material';
import { FieldConfig } from '@/types/form';

interface QuestionTypeAttributeEditorProps {
  config: FieldConfig;
  onUpdate: (updates: Partial<FieldConfig>) => void;
}

// Helper to detect question type from field config
function getQuestionTypeId(config: FieldConfig): string | null {
  const type = config.type?.toLowerCase();

  // Direct type matches first - map various naming conventions to canonical type IDs
  if (type === 'color_picker' || type === 'color-picker' || type === 'colorpicker' || type === 'color') return 'color_picker';
  if (type === 'email') return 'email';
  if (type === 'url') return 'url';
  if (type === 'phone' || type === 'tel' || type === 'telephone') return 'phone';
  if (type === 'file_upload' || type === 'file-upload' || type === 'fileupload' || type === 'file') return 'file_upload';
  if (type === 'image_upload' || type === 'image-upload' || type === 'imageupload' || type === 'image') return 'image_upload';
  if (type === 'time') return 'time';
  if (type === 'datetime' || type === 'date-time') return 'datetime';
  if (type === 'signature') return 'signature';
  if (type === 'tags') return 'tags';
  if (type === 'slider') return 'slider';
  if (type === 'opinion_scale' || type === 'opinion-scale' || type === 'opinionscale') return 'opinion_scale';
  if (type === 'multiple_choice' || type === 'multiple-choice' || type === 'multiplechoice' || type === 'radio') return 'multiple_choice';
  if (type === 'checkboxes' || type === 'checkbox') return 'checkboxes';
  if (type === 'dropdown' || type === 'select') return 'dropdown';
  if (type === 'matrix') return 'matrix';
  if (type === 'ranking') return 'ranking';
  if (type === 'address') return 'address';
  if (type === 'nps') return 'nps';
  if (type === 'rating') return 'rating';
  if (type === 'scale') return 'scale';
  if (type === 'textarea' || type === 'long_text' || type === 'long-text' || type === 'longtext') return 'long-text';
  if (type === 'text' || type === 'short_text' || type === 'short-text' || type === 'shorttext') return 'short-text';

  // Check for special types based on validation or other indicators
  if (type === 'number') {
    // Check if it's a rating or scale based on validation
    if (config.validation?.min !== undefined && config.validation?.max !== undefined) {
      const range = (config.validation.max || 10) - (config.validation.min || 1);
      if (range <= 5) return 'rating';
      if (range <= 10) return 'scale';
    }
    return 'number';
  }

  if (type === 'string') {
    // Could be short text, long text, email, phone, etc.
    if (config.validation?.minLength && config.validation.minLength > 50) return 'long-text';
    return 'short-text';
  }

  if (type === 'boolean' || type === 'yes_no' || type === 'yes-no') return 'yes-no';
  if (type === 'date') return 'date';
  if (type === 'array') return 'checkboxes';

  return type;
}

export function QuestionTypeAttributeEditor({
  config,
  onUpdate,
}: QuestionTypeAttributeEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const questionType = getQuestionTypeId(config);

  // Helper to update validation
  const updateValidation = (key: string, value: any) => {
    onUpdate({
      validation: {
        ...config.validation,
        [key]: value,
      },
    });
  };

  // Render nothing if no specific attributes for this type
  if (!questionType) return null;

  // Render type-specific attributes
  const renderAttributes = () => {
    switch (questionType) {
      case 'scale':
      case 'rating':
        const minVal = config.validation?.min ?? 1;
        const maxVal = config.validation?.max ?? (questionType === 'rating' ? 5 : 10);
        const displayStyle = config.validation?.scaleDisplayStyle || 'buttons';

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {questionType === 'rating' ? 'Rating Settings' : 'Scale Settings'}
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

            {questionType === 'rating' && (
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

      case 'number':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Number Settings
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="number"
                label="Minimum"
                value={config.validation?.min ?? ''}
                onChange={(e) => updateValidation('min', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Maximum"
                value={config.validation?.max ?? ''}
                onChange={(e) => updateValidation('max', e.target.value ? Number(e.target.value) : undefined)}
                sx={{ flex: 1 }}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.decimalsAllowed || false}
                  onChange={(e) => updateValidation('decimalsAllowed', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Allow Decimals</Typography>}
            />
          </Box>
        );

      case 'short-text':
      case 'long-text':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Text Settings
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="number"
                label="Min Length"
                value={config.validation?.minLength ?? ''}
                onChange={(e) => updateValidation('minLength', e.target.value ? Number(e.target.value) : undefined)}
                inputProps={{ min: 0 }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Max Length"
                value={config.validation?.maxLength ?? ''}
                onChange={(e) => updateValidation('maxLength', e.target.value ? Number(e.target.value) : undefined)}
                inputProps={{ min: 1 }}
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                size="small"
                label="Validation Pattern (Regex)"
                value={config.validation?.pattern ?? ''}
                onChange={(e) => updateValidation('pattern', e.target.value || undefined)}
                placeholder="e.g., ^[A-Z].*"
                helperText="Regular expression to validate input"
                fullWidth
              />
              <ValidationPatternGenerator
                field={config}
                onPatternGenerated={(pattern) => {
                  updateValidation('pattern', pattern);
                }}
              />
            </Box>
          </Box>
        );

      case 'date':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Date Settings
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="date"
                label="Earliest Date"
                value={config.validation?.minDate ?? ''}
                onChange={(e) => updateValidation('minDate', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="date"
                label="Latest Date"
                value={config.validation?.maxDate ?? ''}
                onChange={(e) => updateValidation('maxDate', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.allowPastDates !== false}
                  onChange={(e) => updateValidation('allowPastDates', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Allow Past Dates</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.allowFutureDates !== false}
                  onChange={(e) => updateValidation('allowFutureDates', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Allow Future Dates</Typography>}
            />
          </Box>
        );

      case 'yes-no':
        const yesLabel = config.validation?.yesLabel || 'Yes';
        const noLabel = config.validation?.noLabel || 'No';
        const yesNoDisplayStyle = config.validation?.displayStyle || 'switch';

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Yes/No Settings
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Display Style</InputLabel>
              <Select
                value={yesNoDisplayStyle}
                label="Display Style"
                onChange={(e) => updateValidation('displayStyle', e.target.value)}
              >
                <MenuItem value="switch">Toggle Switch</MenuItem>
                <MenuItem value="buttons">Yes/No Buttons</MenuItem>
                <MenuItem value="checkbox">Checkbox</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                label="Yes Label"
                value={yesLabel}
                onChange={(e) => updateValidation('yesLabel', e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="No Label"
                value={noLabel}
                onChange={(e) => updateValidation('noLabel', e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Preview */}
            <Box sx={{ px: 1, py: 1.5, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
                Preview ({yesNoDisplayStyle})
              </Typography>

              {yesNoDisplayStyle === 'switch' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 20,
                      borderRadius: 10,
                      bgcolor: '#00ED64',
                      position: 'relative',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 2,
                        top: 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: 'white',
                      }}
                    />
                  </Box>
                  <Typography variant="body2">{yesLabel}</Typography>
                </Box>
              ) : yesNoDisplayStyle === 'buttons' ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={yesLabel}
                    size="small"
                    sx={{
                      bgcolor: '#00ED64',
                      color: '#001E2B',
                      fontWeight: 500,
                    }}
                  />
                  <Chip
                    label={noLabel}
                    size="small"
                    sx={{
                      bgcolor: alpha('#00ED64', 0.1),
                      color: '#00ED64',
                      fontWeight: 500,
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      border: '2px solid #00ED64',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'white',
                    }}
                  >
                    <Box sx={{ width: 10, height: 10, bgcolor: '#00ED64', borderRadius: 0.5 }} />
                  </Box>
                  <Typography variant="body2">{yesLabel}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        );

      case 'nps':
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

      case 'color_picker':
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

      case 'email':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Email Settings
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.allowMultipleEmails || false}
                  onChange={(e) => updateValidation('allowMultipleEmails', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Allow Multiple Emails</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.blockDisposable || false}
                  onChange={(e) => updateValidation('blockDisposable', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Block Disposable Emails</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.confirmEmail || false}
                  onChange={(e) => updateValidation('confirmEmail', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Require Email Confirmation</Typography>}
            />

            <TextField
              size="small"
              label="Allowed Domains"
              placeholder="gmail.com, company.com"
              value={(config.validation?.allowedDomains || []).join(', ')}
              onChange={(e) => updateValidation('allowedDomains', e.target.value.split(',').map(d => d.trim()).filter(Boolean))}
              helperText="Leave empty to allow all domains"
              fullWidth
            />

            <TextField
              size="small"
              label="Blocked Domains"
              placeholder="spam.com, temp-mail.org"
              value={(config.validation?.blockedDomains || []).join(', ')}
              onChange={(e) => updateValidation('blockedDomains', e.target.value.split(',').map(d => d.trim()).filter(Boolean))}
              helperText="Domains to reject"
              fullWidth
            />
          </Box>
        );

      case 'url':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              URL Settings
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.requireHttps || false}
                  onChange={(e) => updateValidation('requireHttps', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Require HTTPS</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.showUrlPreview || false}
                  onChange={(e) => updateValidation('showUrlPreview', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Show Link Preview</Typography>}
            />

            <TextField
              size="small"
              label="Allowed Protocols"
              placeholder="https, http, ftp"
              value={(config.validation?.allowedProtocols || ['https', 'http']).join(', ')}
              onChange={(e) => updateValidation('allowedProtocols', e.target.value.split(',').map(p => p.trim()).filter(Boolean))}
              helperText="Comma-separated list of allowed protocols"
              fullWidth
            />
          </Box>
        );

      case 'phone':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Phone Settings
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Phone Format</InputLabel>
              <Select
                value={config.validation?.phoneFormat || 'national'}
                label="Phone Format"
                onChange={(e) => updateValidation('phoneFormat', e.target.value)}
              >
                <MenuItem value="national">National (555) 123-4567</MenuItem>
                <MenuItem value="international">International +1 555 123 4567</MenuItem>
                <MenuItem value="e164">E.164 (+15551234567)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Default Country"
              placeholder="US"
              value={config.validation?.defaultCountry || ''}
              onChange={(e) => updateValidation('defaultCountry', e.target.value.toUpperCase())}
              helperText="ISO country code (e.g., US, GB, CA)"
              inputProps={{ maxLength: 2 }}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.showCountrySelector !== false}
                  onChange={(e) => updateValidation('showCountrySelector', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Show Country Selector</Typography>}
            />

            <TextField
              size="small"
              label="Allowed Countries"
              placeholder="US, CA, GB, AU"
              value={(config.validation?.allowedCountries || []).join(', ')}
              onChange={(e) => updateValidation('allowedCountries', e.target.value.split(',').map(c => c.trim().toUpperCase()).filter(Boolean))}
              helperText="Leave empty to allow all countries"
              fullWidth
            />
          </Box>
        );

      case 'file_upload':
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

      case 'image_upload':
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

      case 'time':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Time Settings
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Time Format</InputLabel>
              <Select
                value={config.validation?.timeFormat || '12h'}
                label="Time Format"
                onChange={(e) => updateValidation('timeFormat', e.target.value)}
              >
                <MenuItem value="12h">12-hour (AM/PM)</MenuItem>
                <MenuItem value="24h">24-hour</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Minute Interval</InputLabel>
              <Select
                value={config.validation?.minuteStep || 1}
                label="Minute Interval"
                onChange={(e) => updateValidation('minuteStep', Number(e.target.value))}
              >
                <MenuItem value={1}>1 minute</MenuItem>
                <MenuItem value={5}>5 minutes</MenuItem>
                <MenuItem value={10}>10 minutes</MenuItem>
                <MenuItem value={15}>15 minutes</MenuItem>
                <MenuItem value={30}>30 minutes</MenuItem>
                <MenuItem value={60}>1 hour</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="time"
                label="Earliest Time"
                value={config.validation?.minTime || ''}
                onChange={(e) => updateValidation('minTime', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="time"
                label="Latest Time"
                value={config.validation?.maxTime || ''}
                onChange={(e) => updateValidation('maxTime', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.showSeconds || false}
                  onChange={(e) => updateValidation('showSeconds', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Include Seconds</Typography>}
            />
          </Box>
        );

      case 'datetime':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Date & Time Settings
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Time Format</InputLabel>
              <Select
                value={config.validation?.timeFormat || '12h'}
                label="Time Format"
                onChange={(e) => updateValidation('timeFormat', e.target.value)}
              >
                <MenuItem value="12h">12-hour (AM/PM)</MenuItem>
                <MenuItem value="24h">24-hour</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Timezone Handling</InputLabel>
              <Select
                value={config.validation?.dateTimeTimezone || 'local'}
                label="Timezone Handling"
                onChange={(e) => updateValidation('dateTimeTimezone', e.target.value)}
              >
                <MenuItem value="local">User's Local Time</MenuItem>
                <MenuItem value="utc">UTC</MenuItem>
                <MenuItem value="custom">Custom Timezone</MenuItem>
              </Select>
            </FormControl>

            {config.validation?.dateTimeTimezone === 'custom' && (
              <TextField
                size="small"
                label="Custom Timezone"
                placeholder="America/New_York"
                value={config.validation?.customTimezone || ''}
                onChange={(e) => updateValidation('customTimezone', e.target.value)}
                fullWidth
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.showTimezoneSelector || false}
                  onChange={(e) => updateValidation('showTimezoneSelector', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Show Timezone Selector</Typography>}
            />

            <FormControl fullWidth size="small">
              <InputLabel>Minute Interval</InputLabel>
              <Select
                value={config.validation?.minuteStep || 1}
                label="Minute Interval"
                onChange={(e) => updateValidation('minuteStep', Number(e.target.value))}
              >
                <MenuItem value={1}>1 minute</MenuItem>
                <MenuItem value={5}>5 minutes</MenuItem>
                <MenuItem value={15}>15 minutes</MenuItem>
                <MenuItem value={30}>30 minutes</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.allowPastDates !== false}
                  onChange={(e) => updateValidation('allowPastDates', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Allow Past Dates</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.allowFutureDates !== false}
                  onChange={(e) => updateValidation('allowFutureDates', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Allow Future Dates</Typography>}
            />
          </Box>
        );

      case 'signature':
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

            <FormControl fullWidth size="small">
              <InputLabel>Output Format</InputLabel>
              <Select
                value={config.validation?.outputFormat || 'png'}
                label="Output Format"
                onChange={(e) => updateValidation('outputFormat', e.target.value)}
              >
                <MenuItem value="png">PNG Image</MenuItem>
                <MenuItem value="svg">SVG Vector</MenuItem>
                <MenuItem value="base64">Base64 Data URL</MenuItem>
              </Select>
            </FormControl>

            {/* Preview */}
            <Box sx={{ px: 1, py: 1.5, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
                Preview
              </Typography>
              <Box
                sx={{
                  width: Math.min(config.validation?.canvasWidth || 400, 300),
                  height: Math.min(config.validation?.canvasHeight || 150, 100),
                  bgcolor: config.validation?.backgroundColor || '#ffffff',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.disabled">
                  Sign here
                </Typography>
              </Box>
            </Box>
          </Box>
        );

      case 'tags':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Tags Settings
            </Typography>

            <TextField
              size="small"
              label="Suggested Tags"
              placeholder="tag1, tag2, tag3"
              value={(config.validation?.tagSuggestions || []).join(', ')}
              onChange={(e) => updateValidation('tagSuggestions', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              helperText="Comma-separated autocomplete suggestions"
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.allowCustomTags !== false}
                  onChange={(e) => updateValidation('allowCustomTags', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Allow Custom Tags</Typography>}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="number"
                label="Min Tags"
                value={config.validation?.minTags || ''}
                onChange={(e) => updateValidation('minTags', e.target.value ? Number(e.target.value) : undefined)}
                inputProps={{ min: 0 }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Max Tags"
                value={config.validation?.maxTags || ''}
                onChange={(e) => updateValidation('maxTags', e.target.value ? Number(e.target.value) : undefined)}
                inputProps={{ min: 1 }}
                sx={{ flex: 1 }}
              />
            </Box>

            <TextField
              size="small"
              type="number"
              label="Max Tag Length"
              value={config.validation?.maxTagLength || 50}
              onChange={(e) => updateValidation('maxTagLength', Number(e.target.value) || 50)}
              inputProps={{ min: 5, max: 100 }}
              fullWidth
            />

            <FormControl fullWidth size="small">
              <InputLabel>Case Handling</InputLabel>
              <Select
                value={config.validation?.tagCaseHandling || 'preserve'}
                label="Case Handling"
                onChange={(e) => updateValidation('tagCaseHandling', e.target.value)}
              >
                <MenuItem value="preserve">Preserve Case</MenuItem>
                <MenuItem value="lowercase">Convert to Lowercase</MenuItem>
                <MenuItem value="uppercase">Convert to Uppercase</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.createTagOnEnter !== false}
                  onChange={(e) => updateValidation('createTagOnEnter', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Create Tag on Enter</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.createTagOnComma !== false}
                  onChange={(e) => updateValidation('createTagOnComma', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Create Tag on Comma</Typography>}
            />

            {/* Preview */}
            <Box sx={{ px: 1, py: 1.5, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
                Preview
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {(config.validation?.tagSuggestions?.slice(0, 5) || ['example', 'tags', 'here']).map((tag, i) => (
                  <Chip
                    key={i}
                    label={tag}
                    size="small"
                    onDelete={() => {}}
                    sx={{
                      bgcolor: alpha('#00ED64', 0.1),
                      color: '#00ED64',
                      '& .MuiChip-deleteIcon': { color: alpha('#00ED64', 0.5) },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        );

      case 'slider':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Slider Settings
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="number"
                label="Minimum"
                value={config.validation?.min ?? 0}
                onChange={(e) => updateValidation('min', Number(e.target.value))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Maximum"
                value={config.validation?.max ?? 100}
                onChange={(e) => updateValidation('max', Number(e.target.value))}
                sx={{ flex: 1 }}
              />
            </Box>

            <TextField
              size="small"
              type="number"
              label="Step"
              value={config.validation?.step ?? 1}
              onChange={(e) => updateValidation('step', Number(e.target.value) || 1)}
              inputProps={{ min: 0.1, step: 0.1 }}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.showTicks || false}
                  onChange={(e) => updateValidation('showTicks', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Show Tick Marks</Typography>}
            />

            {config.validation?.showTicks && (
              <TextField
                size="small"
                type="number"
                label="Tick Interval"
                value={config.validation?.tickInterval || 10}
                onChange={(e) => updateValidation('tickInterval', Number(e.target.value) || 10)}
                fullWidth
              />
            )}

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

            {config.validation?.showValue !== false && (
              <FormControl fullWidth size="small">
                <InputLabel>Value Position</InputLabel>
                <Select
                  value={config.validation?.valuePosition || 'tooltip'}
                  label="Value Position"
                  onChange={(e) => updateValidation('valuePosition', e.target.value)}
                >
                  <MenuItem value="tooltip">Tooltip (on hover)</MenuItem>
                  <MenuItem value="above">Above Slider</MenuItem>
                  <MenuItem value="below">Below Slider</MenuItem>
                </Select>
              </FormControl>
            )}

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.showMinMax !== false}
                  onChange={(e) => updateValidation('showMinMax', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Show Min/Max Labels</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.rangeSelection || false}
                  onChange={(e) => updateValidation('rangeSelection', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Range Selection (Two Handles)</Typography>}
            />

            <TextField
              size="small"
              label="Low Label"
              placeholder="e.g., Low"
              value={config.validation?.lowLabel || ''}
              onChange={(e) => updateValidation('lowLabel', e.target.value)}
              fullWidth
            />

            <TextField
              size="small"
              label="High Label"
              placeholder="e.g., High"
              value={config.validation?.highLabel || ''}
              onChange={(e) => updateValidation('highLabel', e.target.value)}
              fullWidth
            />

            {/* Preview */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
                Preview
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {config.validation?.lowLabel || config.validation?.min || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {config.validation?.highLabel || config.validation?.max || 100}
                </Typography>
              </Box>
              <Slider
                value={config.validation?.rangeSelection ? [30, 70] : 50}
                min={config.validation?.min || 0}
                max={config.validation?.max || 100}
                step={config.validation?.step || 1}
                marks={config.validation?.showTicks}
                valueLabelDisplay={config.validation?.valuePosition === 'tooltip' ? 'auto' : 'on'}
                disabled
                sx={{ color: '#00ED64' }}
              />
            </Box>
          </Box>
        );

      case 'opinion_scale':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Opinion Scale Settings
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Scale Type</InputLabel>
              <Select
                value={config.validation?.scaleType || 'agreement'}
                label="Scale Type"
                onChange={(e) => updateValidation('scaleType', e.target.value)}
              >
                <MenuItem value="agreement">Agreement (Strongly Disagree → Strongly Agree)</MenuItem>
                <MenuItem value="satisfaction">Satisfaction (Very Dissatisfied → Very Satisfied)</MenuItem>
                <MenuItem value="frequency">Frequency (Never → Always)</MenuItem>
                <MenuItem value="importance">Importance (Not Important → Very Important)</MenuItem>
                <MenuItem value="likelihood">Likelihood (Very Unlikely → Very Likely)</MenuItem>
                <MenuItem value="custom">Custom Labels</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Display Style</InputLabel>
              <Select
                value={config.validation?.opinionDisplayStyle || 'buttons'}
                label="Display Style"
                onChange={(e) => updateValidation('opinionDisplayStyle', e.target.value)}
              >
                <MenuItem value="buttons">Buttons</MenuItem>
                <MenuItem value="radio">Radio Buttons</MenuItem>
                <MenuItem value="emojis">Emojis</MenuItem>
                <MenuItem value="icons">Icons</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.validation?.showNeutral !== false}
                  onChange={(e) => updateValidation('showNeutral', e.target.checked)}
                />
              }
              label={<Typography variant="body2">Include Neutral Option</Typography>}
            />

            {config.validation?.showNeutral !== false && (
              <TextField
                size="small"
                label="Neutral Label"
                placeholder="Neither Agree nor Disagree"
                value={config.validation?.neutralLabel || ''}
                onChange={(e) => updateValidation('neutralLabel', e.target.value)}
                fullWidth
              />
            )}

            {config.validation?.scaleType === 'custom' && (
              <>
                <TextField
                  size="small"
                  label="Low Label"
                  placeholder="e.g., Strongly Disagree"
                  value={config.validation?.lowLabel || ''}
                  onChange={(e) => updateValidation('lowLabel', e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="High Label"
                  placeholder="e.g., Strongly Agree"
                  value={config.validation?.highLabel || ''}
                  onChange={(e) => updateValidation('highLabel', e.target.value)}
                  fullWidth
                />
              </>
            )}

            {/* Preview */}
            <Box sx={{ px: 1, py: 1.5, bgcolor: alpha('#00ED64', 0.03), borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
                Preview ({config.validation?.scaleType || 'agreement'})
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(config.validation?.opinionDisplayStyle === 'emojis' ? ['😠', '😕', '😐', '🙂', '😄'] :
                  ['1', '2', '3', '4', '5']).map((item, i) => (
                  <Chip
                    key={i}
                    label={item}
                    size="small"
                    sx={{
                      minWidth: 36,
                      bgcolor: i === 2 ? alpha('#00ED64', 0.2) : alpha('#00ED64', 0.1),
                      color: '#00ED64',
                      fontWeight: i === 2 ? 600 : 400,
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        );

      case 'multiple_choice':
      case 'checkboxes':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {questionType === 'multiple_choice' ? 'Multiple Choice' : 'Checkboxes'} Settings
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

            {questionType === 'checkboxes' && (
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
          </Box>
        );

      case 'dropdown':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Dropdown Settings
            </Typography>

            {/* Options Editor */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Options
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(config.validation?.options || []).map((option, index) => {
                  const optionLabel = typeof option === 'string' ? option : option.label;
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
          </Box>
        );

      case 'matrix':
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

      case 'ranking':
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

      case 'address':
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

      default:
        return null;
    }
  };

  const content = renderAttributes();

  if (!content) return null;

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        '&:before': { display: 'none' },
        borderRadius: '8px !important',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          minHeight: 48,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Type-Specific Settings
          </Typography>
          <Chip
            label={questionType}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: alpha('#00ED64', 0.1),
              color: '#00ED64',
            }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {content}
      </AccordionDetails>
    </Accordion>
  );
}
