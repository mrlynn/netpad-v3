/**
 * Form Theme Types
 *
 * Styling and visual configuration for forms.
 */

// ============================================
// Form Header
// ============================================

export interface FormHeader {
  type: 'none' | 'color' | 'gradient' | 'image';
  color?: string;
  gradientEndColor?: string;
  gradientDirection?: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-bottom-left';
  imageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'fill';
  imagePosition?: 'center' | 'top' | 'bottom';
  height?: number;
  borderRadius?: number;
  overlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  showTitle?: boolean;
  showDescription?: boolean;
  titleColor?: string;
  descriptionColor?: string;
}

// ============================================
// Form Theme
// ============================================

export interface FormTheme {
  // Preset theme ID
  preset?: string;
  // Header configuration
  header?: FormHeader;
  // Page background
  pageBackgroundColor?: string;
  pageBackgroundGradient?: string;
  pageBackgroundImage?: string;
  pageBackgroundSize?: 'cover' | 'contain' | 'auto';
  pageBackgroundPosition?: string;
  // Colors
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  textSecondaryColor?: string;
  errorColor?: string;
  successColor?: string;
  // Typography
  fontFamily?: string;
  headingFontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  // Layout
  borderRadius?: number;
  spacing?: 'compact' | 'comfortable' | 'spacious';
  maxWidth?: number;
  // Input styling
  inputStyle?: 'outlined' | 'filled' | 'standard';
  inputBorderRadius?: number;
  // Buttons
  buttonStyle?: 'contained' | 'outlined' | 'text';
  buttonBorderRadius?: number;
  // Effects
  elevation?: 0 | 1 | 2 | 3 | 4;
  glassmorphism?: boolean;
  // Dark mode
  mode?: 'light' | 'dark' | 'auto';
}

// ============================================
// Theme Preset
// ============================================

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'minimal' | 'bold' | 'nature' | 'tech';
  theme: FormTheme;
  preview?: {
    gradient?: string;
    accent?: string;
  };
}
