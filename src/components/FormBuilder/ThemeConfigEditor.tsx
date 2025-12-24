'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper,
  alpha,
  Grid,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Chip,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Palette,
  Business,
  FilterNone,
  Whatshot,
  Park,
  Code,
  Check,
  Edit,
  Brush
} from '@mui/icons-material';
import { FormTheme, ThemePreset, FormHeader } from '@/types/form';
import { themePresets, getThemesByCategory, categoryInfo, getResolvedTheme } from '@/lib/formThemes';
import { HelpButton } from '@/components/Help';
import { FormHeaderEditor } from './FormHeaderEditor';

interface ThemeConfigEditorProps {
  config?: FormTheme;
  onChange: (theme: FormTheme) => void;
  formTitle?: string;
  formDescription?: string;
}

type CategoryTab = ThemePreset['category'];

const categoryIcons: Record<CategoryTab, React.ReactElement> = {
  professional: <Business fontSize="small" />,
  creative: <Brush fontSize="small" />,
  minimal: <FilterNone fontSize="small" />,
  bold: <Whatshot fontSize="small" />,
  nature: <Park fontSize="small" />,
  tech: <Code fontSize="small" />,
};

export function ThemeConfigEditor({
  config,
  onChange,
  formTitle,
  formDescription,
}: ThemeConfigEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('professional');
  const [showCustomize, setShowCustomize] = useState(false);

  const currentPreset = config?.preset;
  const resolvedTheme = getResolvedTheme(config);
  const categories: CategoryTab[] = ['professional', 'minimal', 'bold', 'creative', 'nature', 'tech'];

  const handlePresetSelect = (presetId: string) => {
    onChange({ preset: presetId });
    setShowCustomize(false);
  };

  const handleCustomize = (updates: Partial<FormTheme>) => {
    const newConfig = { ...config, ...updates };
    console.log('[ThemeConfigEditor] handleCustomize:', {
      updates,
      newConfig,
      pageBackgroundColor: newConfig.pageBackgroundColor,
      pageBackgroundGradient: newConfig.pageBackgroundGradient,
    });
    onChange(newConfig);
  };

  const renderThemePreview = (preset: ThemePreset, isSelected: boolean) => {
    const isDark = preset.theme.mode === 'dark';

    return (
      <Tooltip title={preset.description} key={preset.id}>
        <Paper
          elevation={isSelected ? 4 : 1}
          onClick={() => handlePresetSelect(preset.id)}
          sx={{
            p: 1.5,
            cursor: 'pointer',
            border: '2px solid',
            borderColor: isSelected ? preset.theme.primaryColor : 'transparent',
            borderRadius: 2,
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
            },
          }}
        >
          {/* Selected indicator */}
          {isSelected && (
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: preset.theme.primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check sx={{ fontSize: 14, color: isDark ? '#000' : '#fff' }} />
            </Box>
          )}

          {/* Theme preview */}
          <Box
            sx={{
              height: 60,
              borderRadius: 1,
              mb: 1,
              background: preset.preview?.gradient || preset.theme.backgroundColor,
              border: isDark ? 'none' : '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              p: 1,
            }}
          >
            {/* Mock form elements */}
            <Box
              sx={{
                height: 8,
                width: '60%',
                borderRadius: 0.5,
                bgcolor: preset.theme.primaryColor,
                mb: 0.5,
              }}
            />
            <Box
              sx={{
                height: 12,
                width: '100%',
                borderRadius: 0.5,
                bgcolor: alpha(isDark ? '#fff' : '#000', 0.1),
                border: `1px solid ${alpha(isDark ? '#fff' : '#000', 0.2)}`,
                mb: 0.5,
              }}
            />
            <Box
              sx={{
                height: 12,
                width: '100%',
                borderRadius: 0.5,
                bgcolor: alpha(isDark ? '#fff' : '#000', 0.1),
                border: `1px solid ${alpha(isDark ? '#fff' : '#000', 0.2)}`,
              }}
            />
          </Box>

          {/* Theme name */}
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            {preset.name}
          </Typography>

          {/* Color dots */}
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: preset.theme.primaryColor,
              }}
            />
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: preset.theme.backgroundColor,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: preset.theme.textColor,
              }}
            />
          </Box>
        </Paper>
      </Tooltip>
    );
  };

  const handleHeaderChange = (header: FormHeader | undefined) => {
    onChange({ ...config, header });
  };

  return (
    <Box>
      {/* Form Header Editor - Google Forms style */}
      <FormHeaderEditor
        config={config?.header}
        onChange={handleHeaderChange}
        formTitle={formTitle}
        formDescription={formDescription}
      />

      <Divider sx={{ my: 2 }} />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 1,
          px: 1.5,
          borderRadius: 1,
          bgcolor: expanded ? alpha('#E91E63', 0.08) : 'transparent',
          '&:hover': { bgcolor: alpha('#E91E63', 0.05) },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Palette fontSize="small" sx={{ color: '#E91E63' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Form Theme
          </Typography>
          <HelpButton topicId="form-publishing" tooltip="Form Theme Help" size="small" />
          {currentPreset && (
            <Chip
              label={themePresets.find((p) => p.id === currentPreset)?.name || 'Custom'}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                bgcolor: alpha('#E91E63', 0.1),
                color: '#E91E63',
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
            bgcolor: alpha('#E91E63', 0.03),
            border: '1px solid',
            borderColor: alpha('#E91E63', 0.15),
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Choose a preset theme or customize colors and styling for your published form.
          </Typography>

          {/* Category Tabs */}
          <Tabs
            value={activeCategory}
            onChange={(_, v) => setActiveCategory(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              mb: 2,
              '& .MuiTab-root': {
                minHeight: 36,
                py: 0.5,
                textTransform: 'none',
                fontSize: '0.75rem',
              },
            }}
          >
            {categories.map((cat) => (
              <Tab
                key={cat}
                value={cat}
                icon={categoryIcons[cat]}
                iconPosition="start"
                label={categoryInfo[cat].label}
              />
            ))}
          </Tabs>

          {/* Theme Grid */}
          <Grid container spacing={1.5}>
            {getThemesByCategory(activeCategory).map((preset) => (
              <Grid item xs={6} key={preset.id}>
                {renderThemePreview(preset, currentPreset === preset.id)}
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Customize Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              p: 1,
              borderRadius: 1,
              bgcolor: showCustomize ? alpha('#E91E63', 0.1) : 'transparent',
              '&:hover': { bgcolor: alpha('#E91E63', 0.05) },
            }}
            onClick={() => setShowCustomize(!showCustomize)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Edit fontSize="small" sx={{ color: '#E91E63' }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Customize Theme
              </Typography>
            </Box>
            <IconButton size="small">
              {showCustomize ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={showCustomize}>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Page Background */}
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Page Background
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Page Background"
                    type="color"
                    value={resolvedTheme.pageBackgroundColor || '#F5F5F5'}
                    onChange={(e) => {
                      console.log('[ThemeConfigEditor] Page background color changed to:', e.target.value);
                      handleCustomize({ pageBackgroundColor: e.target.value, pageBackgroundGradient: undefined });
                    }}
                    InputProps={{
                      sx: { height: 40 },
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Gradient Preset</InputLabel>
                    <Select
                      value={resolvedTheme.pageBackgroundGradient || ''}
                      label="Gradient Preset"
                      onChange={(e) => {
                        console.log('[ThemeConfigEditor] Gradient preset changed to:', e.target.value);
                        handleCustomize({
                          pageBackgroundGradient: e.target.value || undefined,
                          pageBackgroundColor: e.target.value ? undefined : resolvedTheme.pageBackgroundColor
                        });
                      }}
                    >
                      <MenuItem value="">None (Solid Color)</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">Purple Haze</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)">Soft Gray</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)">Pastel Dream</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)">Warm Sunset</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)">Rose Mist</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)">Ocean Blue</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)">Sky Blue</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)">Fresh Green</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)">Dark Teal</MenuItem>
                      <MenuItem value="linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)">Dark Navy</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />

              {/* Form Card Colors */}
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Form Card Colors
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Primary Color"
                    type="color"
                    value={resolvedTheme.primaryColor || '#00ED64'}
                    onChange={(e) => handleCustomize({ primaryColor: e.target.value })}
                    InputProps={{
                      sx: { height: 40 },
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Card Background"
                    type="color"
                    value={resolvedTheme.backgroundColor || '#FFFFFF'}
                    onChange={(e) => handleCustomize({ backgroundColor: e.target.value })}
                    InputProps={{
                      sx: { height: 40 },
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Text Color"
                    type="color"
                    value={resolvedTheme.textColor || '#001E2B'}
                    onChange={(e) => handleCustomize({ textColor: e.target.value })}
                    InputProps={{
                      sx: { height: 40 },
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Surface Color"
                    type="color"
                    value={resolvedTheme.surfaceColor || '#F9FBFA'}
                    onChange={(e) => handleCustomize({ surfaceColor: e.target.value })}
                    InputProps={{
                      sx: { height: 40 },
                    }}
                  />
                </Grid>
              </Grid>

              {/* Typography */}
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mt: 1 }}>
                Typography
              </Typography>
              <FormControl size="small" fullWidth>
                <InputLabel>Font Family</InputLabel>
                <Select
                  value={resolvedTheme.fontFamily || 'Inter, sans-serif'}
                  label="Font Family"
                  onChange={(e) => handleCustomize({ fontFamily: e.target.value })}
                >
                  <MenuItem value="Inter, sans-serif">Inter</MenuItem>
                  <MenuItem value="Roboto, sans-serif">Roboto</MenuItem>
                  <MenuItem value="Poppins, sans-serif">Poppins</MenuItem>
                  <MenuItem value="Source Sans Pro, sans-serif">Source Sans Pro</MenuItem>
                  <MenuItem value="Nunito, sans-serif">Nunito</MenuItem>
                  <MenuItem value="Lato, sans-serif">Lato</MenuItem>
                  <MenuItem value="Open Sans, sans-serif">Open Sans</MenuItem>
                  <MenuItem value="JetBrains Mono, monospace">JetBrains Mono</MenuItem>
                  <MenuItem value="Georgia, serif">Georgia (Serif)</MenuItem>
                  <MenuItem value="Merriweather, serif">Merriweather (Serif)</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Font Size</InputLabel>
                <Select
                  value={resolvedTheme.fontSize || 'medium'}
                  label="Font Size"
                  onChange={(e) => handleCustomize({ fontSize: e.target.value as FormTheme['fontSize'] })}
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>

              {/* Layout */}
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mt: 1 }}>
                Layout & Styling
              </Typography>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Border Radius: {resolvedTheme.borderRadius || 8}px
                </Typography>
                <Slider
                  size="small"
                  value={resolvedTheme.borderRadius || 8}
                  min={0}
                  max={24}
                  onChange={(_, v) => handleCustomize({ borderRadius: v as number })}
                  sx={{ color: '#E91E63' }}
                />
              </Box>

              <FormControl size="small" fullWidth>
                <InputLabel>Input Style</InputLabel>
                <Select
                  value={resolvedTheme.inputStyle || 'outlined'}
                  label="Input Style"
                  onChange={(e) => handleCustomize({ inputStyle: e.target.value as FormTheme['inputStyle'] })}
                >
                  <MenuItem value="outlined">Outlined</MenuItem>
                  <MenuItem value="filled">Filled</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Spacing</InputLabel>
                <Select
                  value={resolvedTheme.spacing || 'comfortable'}
                  label="Spacing"
                  onChange={(e) => handleCustomize({ spacing: e.target.value as FormTheme['spacing'] })}
                >
                  <MenuItem value="compact">Compact</MenuItem>
                  <MenuItem value="comfortable">Comfortable</MenuItem>
                  <MenuItem value="spacious">Spacious</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={resolvedTheme.mode === 'dark'}
                    onChange={(e) => handleCustomize({ mode: e.target.checked ? 'dark' : 'light' })}
                  />
                }
                label={<Typography variant="caption">Dark Mode</Typography>}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={resolvedTheme.glassmorphism || false}
                    onChange={(e) => handleCustomize({ glassmorphism: e.target.checked })}
                  />
                }
                label={<Typography variant="caption">Glassmorphism Effect</Typography>}
              />
            </Box>
          </Collapse>

          {/* Live Preview */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
              Preview
            </Typography>
            {/* Page background container */}
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                background: resolvedTheme.pageBackgroundGradient ||
                  resolvedTheme.pageBackgroundColor ||
                  '#F5F5F5',
                ...(resolvedTheme.pageBackgroundImage && {
                  backgroundImage: `url(${resolvedTheme.pageBackgroundImage})`,
                  backgroundSize: resolvedTheme.pageBackgroundSize || 'cover',
                  backgroundPosition: resolvedTheme.pageBackgroundPosition || 'center center',
                }),
              }}
            >
              {/* Form card */}
              <Paper
                elevation={resolvedTheme.elevation || 1}
                sx={{
                  p: 2,
                  bgcolor: resolvedTheme.backgroundColor,
                  borderRadius: `${resolvedTheme.borderRadius || 8}px`,
                  ...(resolvedTheme.glassmorphism && {
                    backdropFilter: 'blur(10px)',
                    bgcolor: alpha(resolvedTheme.backgroundColor || '#fff', 0.8),
                  }),
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: resolvedTheme.fontFamily,
                    color: resolvedTheme.textColor,
                    mb: 1,
                  }}
                >
                  Form Title
                </Typography>
                <Box
                  sx={{
                    height: 36,
                    borderRadius: `${resolvedTheme.inputBorderRadius || resolvedTheme.borderRadius || 8}px`,
                    border: resolvedTheme.inputStyle === 'outlined' ? `1px solid ${alpha(resolvedTheme.textColor || '#000', 0.3)}` : 'none',
                    bgcolor: resolvedTheme.inputStyle === 'filled' ? resolvedTheme.surfaceColor : 'transparent',
                    mb: 1,
                  }}
                />
                <Box
                  sx={{
                    height: 32,
                    width: 100,
                    borderRadius: `${resolvedTheme.buttonBorderRadius || resolvedTheme.borderRadius || 8}px`,
                    bgcolor: resolvedTheme.primaryColor,
                  }}
                />
              </Paper>
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
}
