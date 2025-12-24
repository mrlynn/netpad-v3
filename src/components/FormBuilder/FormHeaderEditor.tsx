'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Switch,
  FormControlLabel,
  Paper,
  alpha,
  IconButton,
  Tooltip,
  Collapse,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from '@mui/material';
import {
  Image as ImageIcon,
  Palette,
  Gradient,
  Block,
  ExpandMore,
  ExpandLess,
  Upload,
  Delete,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { FormHeader } from '@/types/form';

// Preset header colors/gradients (Google Forms-style)
const headerPresets = [
  { id: 'purple', color: '#673AB7', label: 'Purple' },
  { id: 'teal', color: '#009688', label: 'Teal' },
  { id: 'pink', color: '#E91E63', label: 'Pink' },
  { id: 'blue', color: '#2196F3', label: 'Blue' },
  { id: 'green', color: '#4CAF50', label: 'Green' },
  { id: 'orange', color: '#FF9800', label: 'Orange' },
  { id: 'red', color: '#F44336', label: 'Red' },
  { id: 'indigo', color: '#3F51B5', label: 'Indigo' },
  { id: 'cyan', color: '#00BCD4', label: 'Cyan' },
  { id: 'mongodb', color: '#00ED64', label: 'MongoDB Green' },
];

const gradientPresets = [
  { id: 'sunset', start: '#FF512F', end: '#DD2476', label: 'Sunset' },
  { id: 'ocean', start: '#2193b0', end: '#6dd5ed', label: 'Ocean' },
  { id: 'forest', start: '#11998e', end: '#38ef7d', label: 'Forest' },
  { id: 'purple-pink', start: '#7F00FF', end: '#E100FF', label: 'Purple Pink' },
  { id: 'peach', start: '#FFB88C', end: '#DE6262', label: 'Peach' },
  { id: 'midnight', start: '#232526', end: '#414345', label: 'Midnight' },
  { id: 'aurora', start: '#00C9FF', end: '#92FE9D', label: 'Aurora' },
  { id: 'fire', start: '#f12711', end: '#f5af19', label: 'Fire' },
];

const imagePresets = [
  { id: 'abstract-1', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop', label: 'Abstract Blue' },
  { id: 'abstract-2', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop', label: 'Gradient Colors' },
  { id: 'nature-1', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop', label: 'Mountains' },
  { id: 'nature-2', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=400&fit=crop', label: 'Beach' },
  { id: 'minimal-1', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=400&fit=crop', label: 'Minimal Abstract' },
  { id: 'tech-1', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop', label: 'Technology' },
];

interface FormHeaderEditorProps {
  config?: FormHeader;
  onChange: (header: FormHeader | undefined) => void;
  formTitle?: string;
  formDescription?: string;
}

export function FormHeaderEditor({
  config,
  onChange,
  formTitle,
  formDescription,
}: FormHeaderEditorProps) {
  const [expanded, setExpanded] = useState(!!config?.type && config.type !== 'none');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const headerType = config?.type || 'none';

  const handleTypeChange = (type: FormHeader['type']) => {
    if (type === 'none') {
      onChange(undefined);
    } else {
      const newConfig: FormHeader = {
        type,
        height: config?.height || 200,
        showTitle: config?.showTitle ?? true,
        showDescription: config?.showDescription ?? true,
        titleColor: '#ffffff',
        descriptionColor: 'rgba(255,255,255,0.9)',
      };

      if (type === 'color') {
        newConfig.color = config?.color || '#673AB7';
      } else if (type === 'gradient') {
        newConfig.color = config?.color || '#7F00FF';
        newConfig.gradientEndColor = config?.gradientEndColor || '#E100FF';
        newConfig.gradientDirection = config?.gradientDirection || 'to-right';
      } else if (type === 'image') {
        newConfig.imageUrl = config?.imageUrl || imagePresets[0].url;
        newConfig.imageFit = 'cover';
        newConfig.imagePosition = 'center';
        newConfig.overlay = true;
        newConfig.overlayColor = '#000000';
        newConfig.overlayOpacity = 0.3;
      }

      onChange(newConfig);
    }
  };

  const handleUpdate = (updates: Partial<FormHeader>) => {
    onChange({ ...config, ...updates } as FormHeader);
  };

  const getGradientStyle = () => {
    if (!config) return {};
    const direction = config.gradientDirection?.replace('to-', '') || 'right';
    return {
      background: `linear-gradient(to ${direction}, ${config.color || '#7F00FF'}, ${config.gradientEndColor || '#E100FF'})`,
    };
  };

  const getHeaderStyle = (): React.CSSProperties => {
    if (!config || config.type === 'none') return {};

    const style: React.CSSProperties = {
      height: config.height || 200,
      position: 'relative',
      borderRadius: config.borderRadius ?? 8,
      overflow: 'hidden',
    };

    if (config.type === 'color') {
      style.backgroundColor = config.color || '#673AB7';
    } else if (config.type === 'gradient') {
      const direction = config.gradientDirection?.replace('to-', '') || 'right';
      style.background = `linear-gradient(to ${direction}, ${config.color || '#7F00FF'}, ${config.gradientEndColor || '#E100FF'})`;
    } else if (config.type === 'image') {
      style.backgroundImage = `url(${config.imageUrl})`;
      style.backgroundSize = config.imageFit || 'cover';
      style.backgroundPosition = config.imagePosition || 'center';
    }

    return style;
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 1,
          px: 1.5,
          borderRadius: 1,
          bgcolor: expanded ? alpha('#9C27B0', 0.08) : 'transparent',
          '&:hover': { bgcolor: alpha('#9C27B0', 0.05) },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImageIcon fontSize="small" sx={{ color: '#9C27B0' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Header Image & Color
          </Typography>
          {headerType !== 'none' && (
            <Box
              sx={{
                width: 20,
                borderRadius: 0.5,
                ...getHeaderStyle(),
                height: 20,
              }}
            />
          )}
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 2,
            bgcolor: alpha('#9C27B0', 0.03),
            border: '1px solid',
            borderColor: alpha('#9C27B0', 0.15),
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Add a header to your form with a color, gradient, or image. Like Google Forms!
          </Typography>

          {/* Type Selection */}
          <ToggleButtonGroup
            value={headerType}
            exclusive
            onChange={(_, value) => value && handleTypeChange(value)}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="none">
              <Tooltip title="No header">
                <Block sx={{ fontSize: 18 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="color">
              <Tooltip title="Solid color">
                <Palette sx={{ fontSize: 18 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="gradient">
              <Tooltip title="Gradient">
                <Gradient sx={{ fontSize: 18 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="image">
              <Tooltip title="Image">
                <ImageIcon sx={{ fontSize: 18 }} />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Color Selection */}
          {headerType === 'color' && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
                Choose a Color
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {headerPresets.map((preset) => (
                  <Tooltip key={preset.id} title={preset.label}>
                    <Box
                      onClick={() => handleUpdate({ color: preset.color })}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: preset.color,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: config?.color === preset.color ? '#fff' : 'transparent',
                        boxShadow: config?.color === preset.color ? `0 0 0 2px ${preset.color}` : 'none',
                        transition: 'all 0.15s',
                        '&:hover': {
                          transform: 'scale(1.1)',
                        },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              <TextField
                size="small"
                fullWidth
                label="Custom Color"
                type="color"
                value={config?.color || '#673AB7'}
                onChange={(e) => handleUpdate({ color: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Box>
          )}

          {/* Gradient Selection */}
          {headerType === 'gradient' && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
                Choose a Gradient
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {gradientPresets.map((preset) => (
                  <Tooltip key={preset.id} title={preset.label}>
                    <Box
                      onClick={() => handleUpdate({ color: preset.start, gradientEndColor: preset.end })}
                      sx={{
                        width: 48,
                        height: 36,
                        borderRadius: 1,
                        background: `linear-gradient(to right, ${preset.start}, ${preset.end})`,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: config?.color === preset.start && config?.gradientEndColor === preset.end ? '#fff' : 'transparent',
                        boxShadow: config?.color === preset.start && config?.gradientEndColor === preset.end ? '0 0 0 2px #9C27B0' : 'none',
                        transition: 'all 0.15s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Start Color"
                    type="color"
                    value={config?.color || '#7F00FF'}
                    onChange={(e) => handleUpdate({ color: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="End Color"
                    type="color"
                    value={config?.gradientEndColor || '#E100FF'}
                    onChange={(e) => handleUpdate({ gradientEndColor: e.target.value })}
                  />
                </Grid>
              </Grid>
              <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                <InputLabel>Direction</InputLabel>
                <Select
                  value={config?.gradientDirection || 'to-right'}
                  label="Direction"
                  onChange={(e) => handleUpdate({ gradientDirection: e.target.value as FormHeader['gradientDirection'] })}
                >
                  <MenuItem value="to-right">Left to Right</MenuItem>
                  <MenuItem value="to-bottom">Top to Bottom</MenuItem>
                  <MenuItem value="to-bottom-right">Diagonal (Top-Left to Bottom-Right)</MenuItem>
                  <MenuItem value="to-bottom-left">Diagonal (Top-Right to Bottom-Left)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Image Selection */}
          {headerType === 'image' && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
                Choose an Image
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {imagePresets.map((preset) => (
                  <Tooltip key={preset.id} title={preset.label}>
                    <Box
                      onClick={() => handleUpdate({ imageUrl: preset.url })}
                      sx={{
                        width: 64,
                        height: 40,
                        borderRadius: 1,
                        backgroundImage: `url(${preset.url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: config?.imageUrl === preset.url ? '#9C27B0' : 'transparent',
                        transition: 'all 0.15s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              <TextField
                size="small"
                fullWidth
                label="Image URL"
                value={config?.imageUrl || ''}
                onChange={(e) => handleUpdate({ imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                sx={{ mb: 2 }}
              />
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Fit</InputLabel>
                    <Select
                      value={config?.imageFit || 'cover'}
                      label="Fit"
                      onChange={(e) => handleUpdate({ imageFit: e.target.value as FormHeader['imageFit'] })}
                    >
                      <MenuItem value="cover">Cover</MenuItem>
                      <MenuItem value="contain">Contain</MenuItem>
                      <MenuItem value="fill">Fill</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Position</InputLabel>
                    <Select
                      value={config?.imagePosition || 'center'}
                      label="Position"
                      onChange={(e) => handleUpdate({ imagePosition: e.target.value as FormHeader['imagePosition'] })}
                    >
                      <MenuItem value="top">Top</MenuItem>
                      <MenuItem value="center">Center</MenuItem>
                      <MenuItem value="bottom">Bottom</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Overlay */}
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config?.overlay ?? true}
                    onChange={(e) => handleUpdate({ overlay: e.target.checked })}
                  />
                }
                label={<Typography variant="caption">Dark Overlay (improves text readability)</Typography>}
              />
              {config?.overlay && (
                <Box sx={{ mt: 1, pl: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Overlay Opacity: {Math.round((config?.overlayOpacity || 0.3) * 100)}%
                  </Typography>
                  <Slider
                    size="small"
                    value={config?.overlayOpacity || 0.3}
                    min={0}
                    max={0.8}
                    step={0.05}
                    onChange={(_, v) => handleUpdate({ overlayOpacity: v as number })}
                    sx={{ color: '#9C27B0' }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Common Options (when header is enabled) */}
          {headerType !== 'none' && (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Height: {config?.height || 200}px
                  </Typography>
                  <Slider
                    size="small"
                    value={config?.height || 200}
                    min={100}
                    max={400}
                    step={10}
                    onChange={(_, v) => handleUpdate({ height: v as number })}
                    sx={{ color: '#9C27B0' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Corner Radius: {config?.borderRadius ?? 8}px
                  </Typography>
                  <Slider
                    size="small"
                    value={config?.borderRadius ?? 8}
                    min={0}
                    max={32}
                    step={2}
                    onChange={(_, v) => handleUpdate({ borderRadius: v as number })}
                    sx={{ color: '#9C27B0' }}
                  />
                </Grid>
              </Grid>

              {/* Text Display Options */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  mt: 2,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: showAdvanced ? alpha('#9C27B0', 0.1) : 'transparent',
                  '&:hover': { bgcolor: alpha('#9C27B0', 0.05) },
                }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Advanced Options
                </Typography>
                <IconButton size="small">
                  {showAdvanced ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
                </IconButton>
              </Box>

              <Collapse in={showAdvanced}>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={config?.showTitle ?? true}
                        onChange={(e) => handleUpdate({ showTitle: e.target.checked })}
                      />
                    }
                    label={<Typography variant="caption">Show Title on Header</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={config?.showDescription ?? true}
                        onChange={(e) => handleUpdate({ showDescription: e.target.checked })}
                      />
                    }
                    label={<Typography variant="caption">Show Description on Header</Typography>}
                  />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Title Color"
                        type="color"
                        value={config?.titleColor || '#ffffff'}
                        onChange={(e) => handleUpdate({ titleColor: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Description Color"
                        type="color"
                        value={config?.descriptionColor || 'rgba(255,255,255,0.9)'}
                        onChange={(e) => handleUpdate({ descriptionColor: e.target.value })}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>

              {/* Live Preview */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
                  Preview
                </Typography>
                <Box sx={{ ...getHeaderStyle(), position: 'relative' }}>
                  {/* Overlay for images */}
                  {headerType === 'image' && config?.overlay && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: config.overlayColor || '#000000',
                        opacity: config.overlayOpacity || 0.3,
                      }}
                    />
                  )}
                  {/* Title and description */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                      right: 16,
                      zIndex: 1,
                    }}
                  >
                    {config?.showTitle !== false && (
                      <Typography
                        variant="h6"
                        sx={{
                          color: config?.titleColor || '#ffffff',
                          fontWeight: 600,
                          textShadow: headerType === 'image' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                        }}
                      >
                        {formTitle || 'Form Title'}
                      </Typography>
                    )}
                    {config?.showDescription !== false && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: config?.descriptionColor || 'rgba(255,255,255,0.9)',
                          textShadow: headerType === 'image' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                        }}
                      >
                        {formDescription || 'Form description goes here'}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
