/**
 * Theme Presets
 *
 * Industry-specific theme configurations for templates.
 */

import type { FormTheme, FormTemplateCategory } from '../types';

// ============================================
// Industry Theme Presets
// ============================================

export const THEME_PRESETS: Record<string, FormTheme> = {
  // Professional blue - Business, Finance, Legal
  professional: {
    preset: 'professional',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    backgroundColor: '#ffffff',
    surfaceColor: '#f8fafc',
    textColor: '#1e293b',
    textSecondaryColor: '#64748b',
    pageBackgroundColor: '#f1f5f9',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 8,
    spacing: 'comfortable',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // Healthcare teal - Medical, Wellness
  healthcare: {
    preset: 'healthcare',
    primaryColor: '#0d9488',
    secondaryColor: '#0f766e',
    backgroundColor: '#ffffff',
    surfaceColor: '#f0fdfa',
    textColor: '#134e4a',
    textSecondaryColor: '#5eead4',
    pageBackgroundColor: '#f0fdfa',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 12,
    spacing: 'spacious',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 1,
    mode: 'light',
  },

  // Education indigo - Schools, Training
  education: {
    preset: 'education',
    primaryColor: '#4f46e5',
    secondaryColor: '#4338ca',
    backgroundColor: '#ffffff',
    surfaceColor: '#eef2ff',
    textColor: '#312e81',
    textSecondaryColor: '#6366f1',
    pageBackgroundColor: '#eef2ff',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 8,
    spacing: 'comfortable',
    inputStyle: 'filled',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // Creative pink/purple - Marketing, Events
  creative: {
    preset: 'creative',
    primaryColor: '#ec4899',
    secondaryColor: '#db2777',
    backgroundColor: '#ffffff',
    surfaceColor: '#fdf2f8',
    textColor: '#831843',
    textSecondaryColor: '#f472b6',
    pageBackgroundColor: '#fdf2f8',
    pageBackgroundGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 16,
    spacing: 'spacious',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 3,
    mode: 'light',
  },

  // Tech cyan - IT, Software
  tech: {
    preset: 'tech',
    primaryColor: '#0891b2',
    secondaryColor: '#0e7490',
    backgroundColor: '#ffffff',
    surfaceColor: '#ecfeff',
    textColor: '#164e63',
    textSecondaryColor: '#22d3ee',
    pageBackgroundColor: '#ecfeff',
    fontFamily: "'JetBrains Mono', monospace",
    borderRadius: 6,
    spacing: 'compact',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 1,
    mode: 'light',
  },

  // Nonprofit green - Community, Charity
  nonprofit: {
    preset: 'nonprofit',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    backgroundColor: '#ffffff',
    surfaceColor: '#ecfdf5',
    textColor: '#064e3b',
    textSecondaryColor: '#34d399',
    pageBackgroundColor: '#ecfdf5',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 12,
    spacing: 'spacious',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // Real Estate amber - Property, Housing
  realEstate: {
    preset: 'realEstate',
    primaryColor: '#d97706',
    secondaryColor: '#b45309',
    backgroundColor: '#ffffff',
    surfaceColor: '#fffbeb',
    textColor: '#78350f',
    textSecondaryColor: '#fbbf24',
    pageBackgroundColor: '#fffbeb',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 8,
    spacing: 'comfortable',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // Government slate - Public Sector
  government: {
    preset: 'government',
    primaryColor: '#475569',
    secondaryColor: '#334155',
    backgroundColor: '#ffffff',
    surfaceColor: '#f8fafc',
    textColor: '#1e293b',
    textSecondaryColor: '#94a3b8',
    pageBackgroundColor: '#f1f5f9',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 4,
    spacing: 'comfortable',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 1,
    mode: 'light',
  },

  // Travel sky - Tourism, Travel
  travel: {
    preset: 'travel',
    primaryColor: '#0284c7',
    secondaryColor: '#0369a1',
    backgroundColor: '#ffffff',
    surfaceColor: '#f0f9ff',
    textColor: '#0c4a6e',
    textSecondaryColor: '#38bdf8',
    pageBackgroundColor: '#f0f9ff',
    pageBackgroundGradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 12,
    spacing: 'spacious',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // Sports lime - Fitness, Athletics
  sports: {
    preset: 'sports',
    primaryColor: '#65a30d',
    secondaryColor: '#4d7c0f',
    backgroundColor: '#ffffff',
    surfaceColor: '#f7fee7',
    textColor: '#365314',
    textSecondaryColor: '#a3e635',
    pageBackgroundColor: '#f7fee7',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 8,
    spacing: 'comfortable',
    inputStyle: 'filled',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // HR purple - Recruitment
  hr: {
    preset: 'hr',
    primaryColor: '#7c3aed',
    secondaryColor: '#6d28d9',
    backgroundColor: '#ffffff',
    surfaceColor: '#f5f3ff',
    textColor: '#4c1d95',
    textSecondaryColor: '#a78bfa',
    pageBackgroundColor: '#f5f3ff',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 10,
    spacing: 'comfortable',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // Support green - Customer Service
  support: {
    preset: 'support',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    backgroundColor: '#ffffff',
    surfaceColor: '#ecfdf5',
    textColor: '#065f46',
    textSecondaryColor: '#34d399',
    pageBackgroundColor: '#ecfdf5',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 8,
    spacing: 'comfortable',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // Events orange - Hospitality
  events: {
    preset: 'events',
    primaryColor: '#ea580c',
    secondaryColor: '#c2410c',
    backgroundColor: '#ffffff',
    surfaceColor: '#fff7ed',
    textColor: '#7c2d12',
    textSecondaryColor: '#fb923c',
    pageBackgroundColor: '#fff7ed',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 12,
    spacing: 'spacious',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 2,
    mode: 'light',
  },

  // Finance emerald - Accounting
  finance: {
    preset: 'finance',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    backgroundColor: '#ffffff',
    surfaceColor: '#ecfdf5',
    textColor: '#064e3b',
    textSecondaryColor: '#34d399',
    pageBackgroundColor: '#f0fdf4',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 6,
    spacing: 'comfortable',
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    elevation: 1,
    mode: 'light',
  },
};

/**
 * Category to theme preset mapping
 */
const categoryThemeMap: Record<FormTemplateCategory, string> = {
  'business-sales': 'professional',
  'hr-recruitment': 'hr',
  'customer-service': 'support',
  'marketing-research': 'creative',
  'education-training': 'education',
  'healthcare-wellness': 'healthcare',
  'real-estate': 'realEstate',
  'legal-compliance': 'professional',
  'nonprofit-community': 'nonprofit',
  'events-hospitality': 'events',
  'technology-it': 'tech',
  'finance-accounting': 'finance',
  'sports-fitness': 'sports',
  'travel-tourism': 'travel',
  'government-public': 'government',
};

/**
 * Get theme preset by category
 */
export function getThemeForCategory(category: FormTemplateCategory): FormTheme {
  return THEME_PRESETS[categoryThemeMap[category]] || THEME_PRESETS.professional;
}
