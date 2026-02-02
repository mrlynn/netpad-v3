import { ThemeOptions, createTheme, alpha } from '@mui/material/styles';

type ThemeMode = 'light' | 'dark';

/**
 * NetPad Design Tokens
 * 
 * Calm, low-contrast aesthetic with MongoDB green identity.
 * No harsh contrasts, no neon glows. Visual weight feels balanced and quiet.
 */

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════

const tokens = {
  // Brand colors (MongoDB green family)
  brand: {
    primary: '#00ED64',         // MongoDB signature green
    primaryMuted: '#00C853',    // Slightly softer
    secondary: '#00A86B',       // Darker green for light mode
    accent: '#00D4AA',          // Cyan-green accent
  },
  
  // Dark mode tokens
  dark: {
    bg: {
      primary: '#0d1210',       // Warm charcoal with green undertone
      secondary: '#131917',     // Sidebar, panels
      surface: '#171f1c',       // Cards, modals
      elevated: '#1c2622',      // Dropdowns, popovers
    },
    border: {
      subtle: '#232e29',        // Dividers, card borders
      default: '#2d3b35',       // Input borders
      strong: '#3a4a43',        // Focus borders
    },
    text: {
      primary: '#e4ebe8',       // Headings, body
      secondary: '#94a39c',     // Labels, helper text
      muted: '#5f7269',         // Disabled, placeholders
    },
    interactive: {
      hover: 'rgba(255, 255, 255, 0.04)',
      active: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(0, 237, 100, 0.08)',
    },
  },
  
  // Light mode tokens
  light: {
    bg: {
      primary: '#f4f7f5',       // Warm off-white with green tint
      secondary: '#e8eeeb',     // Sidebar, panels
      surface: '#ffffff',       // Cards, modals
      elevated: '#ffffff',      // Dropdowns
    },
    border: {
      subtle: '#dce4e0',        // Dividers
      default: '#c5d1cb',       // Input borders
      strong: '#adbeb5',        // Focus borders
    },
    text: {
      primary: '#1a2420',       // Headings, body
      secondary: '#4a5c54',     // Labels, helper text
      muted: '#7a8c84',         // Disabled, placeholders
    },
    interactive: {
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(0, 0, 0, 0.08)',
      selected: 'rgba(0, 168, 107, 0.08)',
    },
  },
  
  // Status colors
  status: {
    success: { main: '#00A86B', bg: 'rgba(0, 168, 107, 0.12)' },
    error: { main: '#D95555', bg: 'rgba(217, 85, 85, 0.12)' },
    warning: { main: '#D4A03D', bg: 'rgba(212, 160, 61, 0.12)' },
    info: { main: '#5588BB', bg: 'rgba(85, 136, 187, 0.12)' },
  },
  
  // Shadows
  shadow: {
    dark: {
      level1: '0 4px 12px rgba(0, 0, 0, 0.4)',
      level2: '0 8px 24px rgba(0, 0, 0, 0.5)',
      level3: '0 16px 48px rgba(0, 0, 0, 0.6)',
    },
    light: {
      level1: '0 4px 12px rgba(0, 0, 0, 0.06)',
      level2: '0 8px 24px rgba(0, 0, 0, 0.1)',
      level3: '0 16px 48px rgba(0, 0, 0, 0.14)',
    },
  },
  
  // Radius
  radius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
  },
  
  // Typography
  typography: {
    fontFamily: '"Inter", -apple-system, "Segoe UI", "Roboto", sans-serif',
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  // Transitions
  transition: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// THEME FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function getDesignTokens(mode: ThemeMode): ThemeOptions {
  const t = mode === 'dark' ? tokens.dark : tokens.light;
  const shadows = mode === 'dark' ? tokens.shadow.dark : tokens.shadow.light;

  return {
    palette: {
      mode,
      
      primary: {
        main: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
        light: tokens.brand.primary,
        dark: tokens.brand.secondary,
        contrastText: mode === 'dark' ? '#000000' : '#ffffff',
      },
      
      secondary: {
        main: tokens.brand.accent,
        light: '#4DFFE0',
        dark: '#00A088',
      },
      
      background: {
        default: t.bg.primary,
        paper: t.bg.surface,
      },
      
      text: {
        primary: t.text.primary,
        secondary: t.text.secondary,
        disabled: t.text.muted,
      },
      
      divider: t.border.subtle,
      
      error: {
        main: tokens.status.error.main,
        light: alpha(tokens.status.error.main, 0.8),
        dark: tokens.status.error.main,
      },
      success: {
        main: tokens.status.success.main,
        light: alpha(tokens.status.success.main, 0.8),
        dark: tokens.status.success.main,
      },
      warning: {
        main: tokens.status.warning.main,
        light: alpha(tokens.status.warning.main, 0.8),
        dark: tokens.status.warning.main,
      },
      info: {
        main: tokens.status.info.main,
        light: alpha(tokens.status.info.main, 0.8),
        dark: tokens.status.info.main,
      },
      
      action: {
        hover: t.interactive.hover,
        selected: t.interactive.selected,
        active: t.interactive.active,
        disabled: t.text.muted,
        disabledBackground: alpha(t.text.muted, 0.12),
      },
    },

    typography: {
      fontFamily: tokens.typography.fontFamily,
      h1: { fontWeight: tokens.typography.fontWeight.bold, letterSpacing: '-0.02em' },
      h2: { fontWeight: tokens.typography.fontWeight.bold, letterSpacing: '-0.01em' },
      h3: { fontWeight: tokens.typography.fontWeight.semibold, letterSpacing: '-0.01em' },
      h4: { fontWeight: tokens.typography.fontWeight.semibold },
      h5: { fontWeight: tokens.typography.fontWeight.semibold },
      h6: { fontWeight: tokens.typography.fontWeight.semibold, fontSize: '1rem' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: tokens.typography.fontWeight.medium },
    },

    shape: {
      borderRadius: tokens.radius.md,
    },

    shadows: [
      'none',
      shadows.level1,
      shadows.level1,
      shadows.level1,
      shadows.level2,
      shadows.level2,
      shadows.level2,
      shadows.level2,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
    ] as ThemeOptions['shadows'],

    components: {
      // ═══════════════════════════════════════════════════════════════════
      // GLOBAL
      // ═══════════════════════════════════════════════════════════════════
      
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.bg.primary,
            scrollbarColor: `${t.border.default} ${t.bg.secondary}`,
            '&::-webkit-scrollbar': { width: 8, height: 8 },
            '&::-webkit-scrollbar-track': { background: t.bg.secondary },
            '&::-webkit-scrollbar-thumb': {
              background: t.border.default,
              borderRadius: 4,
              '&:hover': { background: t.border.strong },
            },
          },
          '::selection': {
            backgroundColor: alpha(tokens.brand.primary, 0.2),
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // SURFACES
      // ═══════════════════════════════════════════════════════════════════
      
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: t.bg.surface,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: tokens.radius.lg,
            transition: `border-color ${tokens.transition.fast}`,
          },
          outlined: {
            borderColor: t.border.subtle,
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: t.bg.surface,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: tokens.radius.lg,
            boxShadow: shadows.level1,
            transition: `all ${tokens.transition.normal}`,
            '&:hover': {
              borderColor: t.border.default,
            },
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.bg.surface,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: tokens.radius.xl,
            boxShadow: shadows.level3,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.bg.secondary,
            borderColor: t.border.subtle,
          },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: t.bg.secondary,
            borderBottom: `1px solid ${t.border.subtle}`,
            boxShadow: 'none',
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.bg.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: tokens.radius.md,
            boxShadow: shadows.level2,
          },
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.bg.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: tokens.radius.md,
            boxShadow: shadows.level1,
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // BUTTONS
      // ═══════════════════════════════════════════════════════════════════
      
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            padding: '8px 16px',
            fontWeight: tokens.typography.fontWeight.medium,
            transition: `all ${tokens.transition.fast}`,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
              transform: 'translateY(-1px)',
            },
          },
          containedPrimary: {
            backgroundColor: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
            color: mode === 'dark' ? '#000000' : '#ffffff',
            '&:hover': {
              backgroundColor: mode === 'dark' ? tokens.brand.primaryMuted : '#008855',
            },
          },
          outlined: {
            borderColor: t.border.default,
            '&:hover': {
              borderColor: t.border.strong,
              backgroundColor: t.interactive.hover,
            },
          },
          outlinedPrimary: {
            borderColor: alpha(mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary, 0.5),
            '&:hover': {
              borderColor: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
              backgroundColor: alpha(mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary, 0.08),
            },
          },
          text: {
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
          },
          sizeSmall: {
            padding: '6px 12px',
            fontSize: '0.8125rem',
          },
          sizeLarge: {
            padding: '12px 24px',
            fontSize: '1rem',
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            transition: `all ${tokens.transition.fast}`,
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
          },
        },
      },

      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: shadows.level1,
            '&:hover': {
              boxShadow: shadows.level2,
            },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // INPUTS
      // ═══════════════════════════════════════════════════════════════════
      
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: tokens.radius.md,
              backgroundColor: mode === 'dark' ? alpha(t.bg.primary, 0.5) : t.bg.surface,
              transition: `all ${tokens.transition.fast}`,
              '& fieldset': {
                borderColor: t.border.default,
                transition: `border-color ${tokens.transition.fast}`,
              },
              '&:hover fieldset': {
                borderColor: t.border.strong,
              },
              '&.Mui-focused': {
                '& fieldset': {
                  borderColor: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
                  borderWidth: 2,
                },
                boxShadow: `0 0 0 3px ${alpha(mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary, 0.1)}`,
              },
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            '& fieldset': {
              borderColor: t.border.default,
            },
            '&:hover fieldset': {
              borderColor: t.border.strong,
            },
            '&.Mui-focused fieldset': {
              borderColor: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
              borderWidth: 2,
            },
          },
        },
      },

      MuiSelect: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
          },
        },
      },

      MuiSwitch: {
        styleOverrides: {
          root: { padding: 8 },
          switchBase: {
            '&.Mui-checked': {
              color: '#ffffff',
              '& + .MuiSwitch-track': {
                backgroundColor: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
                opacity: 1,
              },
            },
          },
          track: {
            backgroundColor: t.border.strong,
            opacity: 1,
            borderRadius: 10,
          },
          thumb: {
            boxShadow: shadows.level1,
          },
        },
      },

      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: t.border.strong,
            '&.Mui-checked': {
              color: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
            },
          },
        },
      },

      MuiRadio: {
        styleOverrides: {
          root: {
            color: t.border.strong,
            '&.Mui-checked': {
              color: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
            },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // DATA DISPLAY
      // ═══════════════════════════════════════════════════════════════════
      
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
            fontWeight: tokens.typography.fontWeight.medium,
          },
          filled: {
            backgroundColor: t.interactive.selected,
          },
          outlined: {
            borderColor: t.border.default,
          },
          colorPrimary: {
            backgroundColor: alpha(mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary, 0.12),
            color: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
          },
          colorSuccess: {
            backgroundColor: tokens.status.success.bg,
            color: tokens.status.success.main,
          },
          colorError: {
            backgroundColor: tokens.status.error.bg,
            color: tokens.status.error.main,
          },
          colorWarning: {
            backgroundColor: tokens.status.warning.bg,
            color: tokens.status.warning.main,
          },
          colorInfo: {
            backgroundColor: tokens.status.info.bg,
            color: tokens.status.info.main,
          },
        },
      },

      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.secondary,
            color: t.text.secondary,
          },
        },
      },

      MuiTooltip: {
        defaultProps: { arrow: true, enterDelay: 400 },
        styleOverrides: {
          tooltip: {
            backgroundColor: t.bg.elevated,
            color: t.text.primary,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: tokens.radius.sm,
            boxShadow: shadows.level1,
            fontSize: '0.75rem',
            fontWeight: tokens.typography.fontWeight.medium,
            padding: '6px 10px',
          },
          arrow: {
            color: t.bg.elevated,
            '&::before': {
              border: `1px solid ${t.border.subtle}`,
            },
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            border: '1px solid',
          },
          standardSuccess: {
            backgroundColor: tokens.status.success.bg,
            borderColor: alpha(tokens.status.success.main, 0.3),
            color: t.text.primary,
            '& .MuiAlert-icon': { color: tokens.status.success.main },
          },
          standardError: {
            backgroundColor: tokens.status.error.bg,
            borderColor: alpha(tokens.status.error.main, 0.3),
            color: t.text.primary,
            '& .MuiAlert-icon': { color: tokens.status.error.main },
          },
          standardWarning: {
            backgroundColor: tokens.status.warning.bg,
            borderColor: alpha(tokens.status.warning.main, 0.3),
            color: t.text.primary,
            '& .MuiAlert-icon': { color: tokens.status.warning.main },
          },
          standardInfo: {
            backgroundColor: tokens.status.info.bg,
            borderColor: alpha(tokens.status.info.main, 0.3),
            color: t.text.primary,
            '& .MuiAlert-icon': { color: tokens.status.info.main },
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
            backgroundColor: t.border.subtle,
          },
          bar: {
            borderRadius: tokens.radius.sm,
          },
        },
      },

      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: t.border.subtle,
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // NAVIGATION
      // ═══════════════════════════════════════════════════════════════════
      
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44 },
          indicator: {
            backgroundColor: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
            height: 2,
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: tokens.typography.fontWeight.medium,
            minHeight: 44,
            color: t.text.secondary,
            '&.Mui-selected': {
              color: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
            },
            '&:hover': {
              color: t.text.primary,
              backgroundColor: t.interactive.hover,
            },
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.xs,
            margin: '2px 6px',
            padding: '8px 12px',
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
            '&.Mui-selected': {
              backgroundColor: t.interactive.selected,
              '&:hover': {
                backgroundColor: t.interactive.selected,
              },
            },
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
            margin: '2px 0',
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
            '&.Mui-selected': {
              backgroundColor: t.interactive.selected,
              '&:hover': {
                backgroundColor: t.interactive.selected,
              },
            },
          },
        },
      },

      MuiLink: {
        styleOverrides: {
          root: {
            color: mode === 'dark' ? tokens.brand.primary : tokens.brand.secondary,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          },
        },
      },

      MuiBreadcrumbs: {
        styleOverrides: {
          root: { color: t.text.secondary },
          separator: { color: t.text.muted },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // TABLES
      // ═══════════════════════════════════════════════════════════════════
      
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            border: `1px solid ${t.border.subtle}`,
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.secondary,
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: t.border.subtle,
            padding: '12px 16px',
          },
          head: {
            fontWeight: tokens.typography.fontWeight.semibold,
            color: t.text.secondary,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
            '&.Mui-selected': {
              backgroundColor: t.interactive.selected,
            },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // MISC
      // ═══════════════════════════════════════════════════════════════════
      
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: t.border.subtle,
          },
        },
      },

      MuiAccordion: {
        defaultProps: { disableGutters: true, elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { margin: 0 },
          },
        },
      },

      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 44,
            '&.Mui-expanded': { minHeight: 44 },
            '&:hover': { backgroundColor: t.interactive.hover },
          },
          content: {
            margin: '10px 0',
            '&.Mui-expanded': { margin: '10px 0' },
          },
        },
      },

      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              backgroundColor: t.bg.elevated,
              color: t.text.primary,
            },
          },
        },
      },

      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.elevated,
            color: t.text.primary,
            boxShadow: shadows.level2,
          },
        },
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Default theme (dark mode) for backward compatibility
export const theme = createTheme(getDesignTokens('dark'));

// Named theme exports
export const darkTheme = createTheme(getDesignTokens('dark'));
export const lightTheme = createTheme(getDesignTokens('light'));

// Export tokens for direct use
export { tokens as netpadTokens };

// Legacy export for compatibility
export const netpadColors = {
  // Brand colors
  primary: tokens.brand.primary,
  primaryLight: tokens.brand.primaryMuted,
  primaryDark: tokens.brand.secondary,
  accent: tokens.brand.accent,
  secondary: tokens.brand.secondary,
  secondaryLight: '#00C066',
  secondaryDark: '#007744',
  
  // Gradients
  gradient: `linear-gradient(135deg, ${tokens.brand.primary} 0%, ${tokens.brand.accent} 100%)`,
  gradientReverse: `linear-gradient(135deg, ${tokens.brand.accent} 0%, ${tokens.brand.primary} 100%)`,
  gradientLight: `linear-gradient(135deg, ${tokens.brand.secondary} 0%, #00C066 100%)`,
  
  // Glow effects (dark mode)
  glowPrimary: '0 4px 16px rgba(0, 237, 100, 0.2)',
  glowPrimaryHover: '0 6px 24px rgba(0, 237, 100, 0.25)',
  glowSubtle: '0 0 30px rgba(0, 237, 100, 0.08)',
  
  // Shadow effects (light mode)
  shadowPrimary: '0 4px 16px rgba(0, 104, 74, 0.12)',
  shadowPrimaryHover: '0 6px 24px rgba(0, 104, 74, 0.18)',
  shadowSubtle: '0 2px 12px rgba(0, 104, 74, 0.06)',
  
  // Grid patterns (subtle, calm)
  gridPatternDark: `radial-gradient(circle at 1px 1px, rgba(0, 237, 100, 0.02) 1px, transparent 0)`,
  gridPatternLight: `radial-gradient(circle at 1px 1px, rgba(0, 104, 74, 0.04) 1px, transparent 0)`,
  gridSize: '24px 24px',
};
