import { ThemePreset, FormTheme } from '@/types/form';

// ============================================
// Preset Themes
// ============================================

export const themePresets: ThemePreset[] = [
  // Professional Themes
  {
    id: 'mongodb-green',
    name: 'MongoDB Green',
    description: 'Official MongoDB brand colors',
    category: 'professional',
    theme: {
      primaryColor: '#00ED64',
      secondaryColor: '#001E2B',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F9FBFA',
      textColor: '#001E2B',
      textSecondaryColor: '#5C6C75',
      errorColor: '#CF4747',
      successColor: '#00ED64',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      fontSize: 'medium',
      borderRadius: 8,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 8,
      buttonStyle: 'contained',
      buttonBorderRadius: 8,
      elevation: 1,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #00ED64 0%, #00A651 100%)',
      accent: '#00ED64',
    },
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional blue theme for business forms',
    category: 'professional',
    theme: {
      primaryColor: '#1976D2',
      secondaryColor: '#0D47A1',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F5F7FA',
      textColor: '#1A1A1A',
      textSecondaryColor: '#666666',
      errorColor: '#D32F2F',
      successColor: '#388E3C',
      fontFamily: '"Roboto", "Helvetica Neue", sans-serif',
      fontSize: 'medium',
      borderRadius: 4,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 4,
      buttonStyle: 'contained',
      buttonBorderRadius: 4,
      elevation: 2,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #1976D2 0%, #0D47A1 100%)',
      accent: '#1976D2',
    },
  },
  {
    id: 'elegant-purple',
    name: 'Elegant Purple',
    description: 'Sophisticated purple for premium experiences',
    category: 'professional',
    theme: {
      primaryColor: '#7C3AED',
      secondaryColor: '#5B21B6',
      backgroundColor: '#FAFAFA',
      surfaceColor: '#FFFFFF',
      textColor: '#1F2937',
      textSecondaryColor: '#6B7280',
      errorColor: '#EF4444',
      successColor: '#10B981',
      fontFamily: '"Poppins", sans-serif',
      fontSize: 'medium',
      borderRadius: 12,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 12,
      buttonStyle: 'contained',
      buttonBorderRadius: 24,
      elevation: 1,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
      accent: '#7C3AED',
    },
  },

  // Minimal Themes
  {
    id: 'clean-minimal',
    name: 'Clean Minimal',
    description: 'Simple, distraction-free design',
    category: 'minimal',
    theme: {
      primaryColor: '#000000',
      secondaryColor: '#333333',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#FFFFFF',
      textColor: '#000000',
      textSecondaryColor: '#666666',
      errorColor: '#E53935',
      successColor: '#43A047',
      fontFamily: '"Inter", -apple-system, sans-serif',
      fontSize: 'medium',
      borderRadius: 0,
      spacing: 'spacious',
      inputStyle: 'standard',
      inputBorderRadius: 0,
      buttonStyle: 'outlined',
      buttonBorderRadius: 0,
      elevation: 0,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
      accent: '#000000',
    },
  },
  {
    id: 'soft-gray',
    name: 'Soft Gray',
    description: 'Gentle gray tones for a calm experience',
    category: 'minimal',
    theme: {
      primaryColor: '#6B7280',
      secondaryColor: '#4B5563',
      backgroundColor: '#F9FAFB',
      surfaceColor: '#FFFFFF',
      textColor: '#111827',
      textSecondaryColor: '#6B7280',
      errorColor: '#DC2626',
      successColor: '#059669',
      fontFamily: '"Source Sans Pro", sans-serif',
      fontSize: 'medium',
      borderRadius: 6,
      spacing: 'comfortable',
      inputStyle: 'filled',
      inputBorderRadius: 6,
      buttonStyle: 'contained',
      buttonBorderRadius: 6,
      elevation: 0,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
      accent: '#6B7280',
    },
  },

  // Bold & Creative Themes
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Warm, energetic orange gradient theme',
    category: 'bold',
    theme: {
      primaryColor: '#F97316',
      secondaryColor: '#EA580C',
      backgroundColor: '#FFFBEB',
      surfaceColor: '#FFFFFF',
      textColor: '#1C1917',
      textSecondaryColor: '#78716C',
      errorColor: '#DC2626',
      successColor: '#16A34A',
      fontFamily: '"Nunito", sans-serif',
      fontSize: 'medium',
      borderRadius: 16,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 16,
      buttonStyle: 'contained',
      buttonBorderRadius: 32,
      elevation: 2,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #F97316 0%, #DC2626 100%)',
      accent: '#F97316',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Deep blue inspired by the ocean',
    category: 'bold',
    theme: {
      primaryColor: '#0EA5E9',
      secondaryColor: '#0284C7',
      backgroundColor: '#F0F9FF',
      surfaceColor: '#FFFFFF',
      textColor: '#0C4A6E',
      textSecondaryColor: '#64748B',
      errorColor: '#E11D48',
      successColor: '#22C55E',
      fontFamily: '"Quicksand", sans-serif',
      fontSize: 'medium',
      borderRadius: 12,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 12,
      buttonStyle: 'contained',
      buttonBorderRadius: 24,
      elevation: 1,
      glassmorphism: true,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
      accent: '#0EA5E9',
    },
  },
  {
    id: 'neon-pink',
    name: 'Neon Pink',
    description: 'Bold, vibrant pink for creative projects',
    category: 'creative',
    theme: {
      primaryColor: '#EC4899',
      secondaryColor: '#DB2777',
      backgroundColor: '#FDF2F8',
      surfaceColor: '#FFFFFF',
      textColor: '#1F2937',
      textSecondaryColor: '#6B7280',
      errorColor: '#EF4444',
      successColor: '#10B981',
      fontFamily: '"Outfit", sans-serif',
      fontSize: 'medium',
      borderRadius: 20,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 20,
      buttonStyle: 'contained',
      buttonBorderRadius: 40,
      elevation: 3,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
      accent: '#EC4899',
    },
  },

  // Nature Themes
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural, earthy green tones',
    category: 'nature',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      backgroundColor: '#F0FDF4',
      surfaceColor: '#FFFFFF',
      textColor: '#14532D',
      textSecondaryColor: '#4B5563',
      errorColor: '#DC2626',
      successColor: '#16A34A',
      fontFamily: '"Lato", sans-serif',
      fontSize: 'medium',
      borderRadius: 8,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 8,
      buttonStyle: 'contained',
      buttonBorderRadius: 8,
      elevation: 1,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #059669 0%, #065F46 100%)',
      accent: '#059669',
    },
  },
  {
    id: 'earthy-brown',
    name: 'Earthy Brown',
    description: 'Warm, organic brown palette',
    category: 'nature',
    theme: {
      primaryColor: '#92400E',
      secondaryColor: '#78350F',
      backgroundColor: '#FFFBEB',
      surfaceColor: '#FEF3C7',
      textColor: '#451A03',
      textSecondaryColor: '#78350F',
      errorColor: '#B91C1C',
      successColor: '#15803D',
      fontFamily: '"Merriweather", serif',
      fontSize: 'medium',
      borderRadius: 4,
      spacing: 'spacious',
      inputStyle: 'filled',
      inputBorderRadius: 4,
      buttonStyle: 'contained',
      buttonBorderRadius: 4,
      elevation: 0,
      mode: 'light',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
      accent: '#92400E',
    },
  },

  // Tech Themes
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Modern dark theme for reduced eye strain',
    category: 'tech',
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1D4ED8',
      backgroundColor: '#0F172A',
      surfaceColor: '#1E293B',
      textColor: '#F8FAFC',
      textSecondaryColor: '#94A3B8',
      errorColor: '#F87171',
      successColor: '#4ADE80',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 'medium',
      borderRadius: 8,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 8,
      buttonStyle: 'contained',
      buttonBorderRadius: 8,
      elevation: 2,
      mode: 'dark',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
      accent: '#3B82F6',
    },
  },
  {
    id: 'cyber-purple',
    name: 'Cyber Purple',
    description: 'Futuristic dark purple theme',
    category: 'tech',
    theme: {
      primaryColor: '#A855F7',
      secondaryColor: '#7C3AED',
      backgroundColor: '#0C0A1D',
      surfaceColor: '#1A1333',
      textColor: '#F5F3FF',
      textSecondaryColor: '#A78BFA',
      errorColor: '#F87171',
      successColor: '#34D399',
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: 'medium',
      borderRadius: 12,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      inputBorderRadius: 12,
      buttonStyle: 'contained',
      buttonBorderRadius: 24,
      elevation: 3,
      glassmorphism: true,
      mode: 'dark',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
      accent: '#A855F7',
    },
  },
  {
    id: 'terminal-green',
    name: 'Terminal Green',
    description: 'Retro terminal-inspired theme',
    category: 'tech',
    theme: {
      primaryColor: '#22C55E',
      secondaryColor: '#16A34A',
      backgroundColor: '#000000',
      surfaceColor: '#0A0A0A',
      textColor: '#22C55E',
      textSecondaryColor: '#4ADE80',
      errorColor: '#EF4444',
      successColor: '#22C55E',
      fontFamily: '"Fira Code", "Consolas", monospace',
      fontSize: 'medium',
      borderRadius: 0,
      spacing: 'compact',
      inputStyle: 'outlined',
      inputBorderRadius: 0,
      buttonStyle: 'outlined',
      buttonBorderRadius: 0,
      elevation: 0,
      mode: 'dark',
    },
    preview: {
      gradient: 'linear-gradient(135deg, #000000 0%, #0A1A0A 100%)',
      accent: '#22C55E',
    },
  },
];

// ============================================
// Helper Functions
// ============================================

export function getThemePreset(id: string): ThemePreset | undefined {
  return themePresets.find((p) => p.id === id);
}

export function getThemesByCategory(category: ThemePreset['category']): ThemePreset[] {
  return themePresets.filter((p) => p.category === category);
}

export function getResolvedTheme(theme?: FormTheme): FormTheme {
  if (!theme) {
    return themePresets[0].theme; // Default to MongoDB Green
  }

  // If preset is specified, merge preset with overrides
  if (theme.preset) {
    const preset = getThemePreset(theme.preset);
    if (preset) {
      return { ...preset.theme, ...theme };
    }
  }

  return theme;
}

export function generateCSSVariables(theme: FormTheme): Record<string, string> {
  const resolved = getResolvedTheme(theme);

  return {
    // Page background
    '--form-page-background': resolved.pageBackgroundGradient || resolved.pageBackgroundColor || '#F5F5F5',
    // Form card colors
    '--form-primary': resolved.primaryColor || '#00ED64',
    '--form-secondary': resolved.secondaryColor || '#001E2B',
    '--form-background': resolved.backgroundColor || '#FFFFFF',
    '--form-surface': resolved.surfaceColor || '#F9FBFA',
    '--form-text': resolved.textColor || '#001E2B',
    '--form-text-secondary': resolved.textSecondaryColor || '#5C6C75',
    '--form-error': resolved.errorColor || '#CF4747',
    '--form-success': resolved.successColor || '#00ED64',
    '--form-font-family': resolved.fontFamily || 'Inter, sans-serif',
    '--form-heading-font': resolved.headingFontFamily || resolved.fontFamily || 'Inter, sans-serif',
    '--form-border-radius': `${resolved.borderRadius || 8}px`,
    '--form-input-radius': `${resolved.inputBorderRadius || resolved.borderRadius || 8}px`,
    '--form-button-radius': `${resolved.buttonBorderRadius || resolved.borderRadius || 8}px`,
    '--form-spacing': resolved.spacing === 'compact' ? '12px' : resolved.spacing === 'spacious' ? '24px' : '16px',
    '--form-max-width': `${resolved.maxWidth || 600}px`,
  };
}

// Get category display info
export const categoryInfo: Record<ThemePreset['category'], { label: string; icon: string }> = {
  professional: { label: 'Professional', icon: 'Business' },
  creative: { label: 'Creative', icon: 'Palette' },
  minimal: { label: 'Minimal', icon: 'FilterNone' },
  bold: { label: 'Bold', icon: 'Whatshot' },
  nature: { label: 'Nature', icon: 'Park' },
  tech: { label: 'Tech', icon: 'Code' },
};
