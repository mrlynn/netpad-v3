/**
 * Tests for formThemes.ts
 * 
 * Tests theme presets, lookup functions, theme resolution, and CSS variable generation.
 */
import {
  themePresets,
  getThemePreset,
  getThemesByCategory,
  getResolvedTheme,
  generateCSSVariables,
  categoryInfo,
} from '@/lib/formThemes';

describe('formThemes', () => {
  // ============================================
  // Theme Presets Data Integrity
  // ============================================
  describe('themePresets', () => {
    it('should have at least 10 presets', () => {
      expect(themePresets.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique ids', () => {
      const ids = themePresets.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique names', () => {
      const names = themePresets.map(p => p.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('every preset should have required fields', () => {
      themePresets.forEach(preset => {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.category).toBeTruthy();
        expect(preset.theme).toBeDefined();
        expect(preset.preview).toBeDefined();
        expect(preset.preview.gradient).toBeTruthy();
        expect(preset.preview.accent).toBeTruthy();
      });
    });

    it('every preset theme should have all required color properties', () => {
      const requiredColors = [
        'primaryColor', 'secondaryColor', 'backgroundColor',
        'surfaceColor', 'textColor', 'textSecondaryColor',
        'errorColor', 'successColor',
      ];
      themePresets.forEach(preset => {
        requiredColors.forEach(color => {
          expect(preset.theme).toHaveProperty(color);
          expect((preset.theme as any)[color]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });
    });

    it('every preset theme should have typography settings', () => {
      themePresets.forEach(preset => {
        expect(preset.theme.fontFamily).toBeTruthy();
        expect(preset.theme.fontSize).toBeTruthy();
      });
    });

    it('every preset theme should have layout settings', () => {
      themePresets.forEach(preset => {
        expect(typeof preset.theme.borderRadius).toBe('number');
        expect(preset.theme.spacing).toBeTruthy();
        expect(preset.theme.inputStyle).toBeTruthy();
        expect(preset.theme.buttonStyle).toBeTruthy();
      });
    });

    it('every preset should have a valid mode (light or dark)', () => {
      themePresets.forEach(preset => {
        expect(['light', 'dark']).toContain(preset.theme.mode);
      });
    });

    it('should contain the mongodb-green default preset', () => {
      const mongoPreset = themePresets.find(p => p.id === 'mongodb-green');
      expect(mongoPreset).toBeDefined();
      expect(mongoPreset!.theme.primaryColor).toBe('#00ED64');
    });

    it('should have both light and dark themes', () => {
      const lightThemes = themePresets.filter(p => p.theme.mode === 'light');
      const darkThemes = themePresets.filter(p => p.theme.mode === 'dark');
      expect(lightThemes.length).toBeGreaterThan(0);
      expect(darkThemes.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // getThemePreset
  // ============================================
  describe('getThemePreset', () => {
    it('should return preset by id', () => {
      const preset = getThemePreset('mongodb-green');
      expect(preset).toBeDefined();
      expect(preset!.id).toBe('mongodb-green');
      expect(preset!.name).toBe('MongoDB Green');
    });

    it('should return undefined for unknown id', () => {
      expect(getThemePreset('nonexistent')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getThemePreset('')).toBeUndefined();
    });

    it('should find all known presets', () => {
      themePresets.forEach(preset => {
        expect(getThemePreset(preset.id)).toBeDefined();
      });
    });
  });

  // ============================================
  // getThemesByCategory
  // ============================================
  describe('getThemesByCategory', () => {
    it('should return professional themes', () => {
      const themes = getThemesByCategory('professional');
      expect(themes.length).toBeGreaterThan(0);
      themes.forEach(t => expect(t.category).toBe('professional'));
    });

    it('should return minimal themes', () => {
      const themes = getThemesByCategory('minimal');
      expect(themes.length).toBeGreaterThan(0);
      themes.forEach(t => expect(t.category).toBe('minimal'));
    });

    it('should return tech themes', () => {
      const themes = getThemesByCategory('tech');
      expect(themes.length).toBeGreaterThan(0);
      themes.forEach(t => expect(t.category).toBe('tech'));
    });

    it('should return bold themes', () => {
      const themes = getThemesByCategory('bold');
      expect(themes.length).toBeGreaterThan(0);
    });

    it('should return nature themes', () => {
      const themes = getThemesByCategory('nature');
      expect(themes.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown category', () => {
      const themes = getThemesByCategory('nonexistent' as any);
      expect(themes).toEqual([]);
    });

    it('total of all categories should equal total presets', () => {
      const categories = ['professional', 'minimal', 'bold', 'creative', 'nature', 'tech'] as const;
      const total = categories.reduce((sum, cat) => sum + getThemesByCategory(cat).length, 0);
      expect(total).toBe(themePresets.length);
    });
  });

  // ============================================
  // getResolvedTheme
  // ============================================
  describe('getResolvedTheme', () => {
    it('should return default theme (mongodb-green) when no theme provided', () => {
      const resolved = getResolvedTheme();
      expect(resolved.primaryColor).toBe('#00ED64');
    });

    it('should return default theme for undefined', () => {
      const resolved = getResolvedTheme(undefined);
      expect(resolved.primaryColor).toBe('#00ED64');
    });

    it('should return the theme as-is when no preset specified', () => {
      const customTheme = {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
      } as any;
      const resolved = getResolvedTheme(customTheme);
      expect(resolved.primaryColor).toBe('#FF0000');
    });

    it('should merge preset with overrides when preset is specified', () => {
      const theme = {
        preset: 'corporate-blue',
        primaryColor: '#FF0000', // Override
      } as any;
      const resolved = getResolvedTheme(theme);
      // primaryColor should be the override
      expect(resolved.primaryColor).toBe('#FF0000');
      // secondaryColor should come from the preset
      expect(resolved.secondaryColor).toBe('#0D47A1');
    });

    it('should fall back to theme when preset not found', () => {
      const theme = {
        preset: 'nonexistent-preset',
        primaryColor: '#AABBCC',
      } as any;
      const resolved = getResolvedTheme(theme);
      expect(resolved.primaryColor).toBe('#AABBCC');
    });
  });

  // ============================================
  // generateCSSVariables
  // ============================================
  describe('generateCSSVariables', () => {
    it('should generate all expected CSS variables', () => {
      const vars = generateCSSVariables({} as any);
      const expectedVars = [
        '--form-primary', '--form-secondary', '--form-background',
        '--form-surface', '--form-text', '--form-text-secondary',
        '--form-error', '--form-success', '--form-font-family',
        '--form-border-radius', '--form-input-radius',
        '--form-button-radius', '--form-spacing', '--form-max-width',
      ];
      expectedVars.forEach(v => {
        expect(vars).toHaveProperty(v);
      });
    });

    it('should use defaults when theme has no values', () => {
      const vars = generateCSSVariables({} as any);
      expect(vars['--form-primary']).toBe('#00ED64');
      expect(vars['--form-border-radius']).toBe('8px');
      expect(vars['--form-max-width']).toBe('600px');
    });

    it('should use theme values when provided', () => {
      const vars = generateCSSVariables({
        primaryColor: '#FF0000',
        borderRadius: 16,
        maxWidth: 800,
      } as any);
      expect(vars['--form-primary']).toBe('#FF0000');
      expect(vars['--form-border-radius']).toBe('16px');
      expect(vars['--form-max-width']).toBe('800px');
    });

    it('should map spacing values correctly', () => {
      expect(generateCSSVariables({ spacing: 'compact' } as any)['--form-spacing']).toBe('12px');
      expect(generateCSSVariables({ spacing: 'comfortable' } as any)['--form-spacing']).toBe('16px');
      expect(generateCSSVariables({ spacing: 'spacious' } as any)['--form-spacing']).toBe('24px');
    });

    it('should use page background when provided', () => {
      const vars = generateCSSVariables({
        pageBackgroundGradient: 'linear-gradient(red, blue)',
      } as any);
      expect(vars['--form-page-background']).toBe('linear-gradient(red, blue)');
    });

    it('should fall back to page background color', () => {
      const vars = generateCSSVariables({
        pageBackgroundColor: '#EEEEEE',
      } as any);
      expect(vars['--form-page-background']).toBe('#EEEEEE');
    });

    it('should use heading font family when provided', () => {
      const vars = generateCSSVariables({
        headingFontFamily: '"Georgia", serif',
        fontFamily: '"Arial", sans-serif',
      } as any);
      expect(vars['--form-heading-font']).toBe('"Georgia", serif');
    });

    it('should fall back to regular font for headings', () => {
      const vars = generateCSSVariables({
        fontFamily: '"Arial", sans-serif',
      } as any);
      expect(vars['--form-heading-font']).toBe('"Arial", sans-serif');
    });
  });

  // ============================================
  // categoryInfo
  // ============================================
  describe('categoryInfo', () => {
    it('should have entries for all categories', () => {
      const expectedCategories = ['professional', 'creative', 'minimal', 'bold', 'nature', 'tech'];
      expectedCategories.forEach(cat => {
        expect(categoryInfo).toHaveProperty(cat);
        expect(categoryInfo[cat as keyof typeof categoryInfo].label).toBeTruthy();
        expect(categoryInfo[cat as keyof typeof categoryInfo].icon).toBeTruthy();
      });
    });
  });
});
