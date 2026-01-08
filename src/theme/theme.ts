import { ThemeOptions, createTheme } from '@mui/material/styles';

type ThemeMode = 'light' | 'dark';

// NetPad Signature Colors
const netpadColors = {
  // Primary MongoDB green (bright - for dark mode)
  primary: '#00ED64',
  primaryLight: '#4DFF9F',
  primaryDark: '#00B84A',
  // Signature cyan-green (differentiates from pure MongoDB)
  accent: '#00D4AA',
  // Secondary dark green (for light mode primary)
  secondary: '#00684A',
  secondaryLight: '#00966B',
  secondaryDark: '#004A33',
  // Signature gradients
  gradient: 'linear-gradient(135deg, #00ED64 0%, #00D4AA 100%)',
  gradientReverse: 'linear-gradient(135deg, #00D4AA 0%, #00ED64 100%)',
  gradientLight: 'linear-gradient(135deg, #00684A 0%, #00966B 100%)',
  // Glow effects (dark mode)
  glowPrimary: '0 4px 16px rgba(0, 237, 100, 0.3)',
  glowPrimaryHover: '0 6px 24px rgba(0, 237, 100, 0.4)',
  glowSubtle: '0 0 30px rgba(0, 237, 100, 0.1)',
  // Shadow effects (light mode - softer, professional)
  shadowPrimary: '0 4px 16px rgba(0, 104, 74, 0.15)',
  shadowPrimaryHover: '0 6px 24px rgba(0, 104, 74, 0.22)',
  shadowSubtle: '0 2px 12px rgba(0, 104, 74, 0.08)',
  // Grid pattern for NetPad identity
  gridPatternDark: `radial-gradient(circle at 1px 1px, rgba(0, 237, 100, 0.03) 1px, transparent 0)`,
  gridPatternLight: `radial-gradient(circle at 1px 1px, rgba(0, 104, 74, 0.06) 1px, transparent 0)`,
  gridSize: '24px 24px',
};

// Shared design elements
const sharedTypography = {
  fontFamily: '"Inter", -apple-system, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
  h1: {
    fontWeight: 700,
    letterSpacing: '-0.02em'
  },
  h2: {
    fontWeight: 700,
    letterSpacing: '-0.01em'
  },
  h3: {
    fontWeight: 600,
    letterSpacing: '-0.01em'
  },
  h4: {
    fontWeight: 600
  },
  h5: {
    fontWeight: 600
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem'
  },
  body1: {
    fontSize: '0.9375rem',
    lineHeight: 1.6
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5
  },
  button: {
    textTransform: 'none' as const,
    fontWeight: 500
  }
};

const sharedShape = {
  borderRadius: 8
};

// Dark theme palette
const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: netpadColors.primary, // MongoDB green
    light: netpadColors.primaryLight,
    dark: netpadColors.primaryDark,
    contrastText: '#000'
  },
  secondary: {
    main: netpadColors.accent, // NetPad cyan-green accent
    light: '#4DFFE0',
    dark: netpadColors.secondary
  },
  background: {
    default: '#0a0e14',
    paper: '#141920'
  },
  text: {
    primary: '#e6edf3',
    secondary: '#8b949e'
  },
  divider: 'rgba(110, 118, 129, 0.2)',
  error: {
    main: '#f85149',
    light: '#ff6b6b',
    dark: '#d32f2f'
  },
  success: {
    main: '#00ED64',
    light: '#4DFF9F',
    dark: '#00B84A'
  },
  warning: {
    main: '#d29922',
    light: '#f1a43c',
    dark: '#b08800'
  },
  info: {
    main: '#58a6ff',
    light: '#79c0ff',
    dark: '#388bfd'
  }
};

// Light theme palette
const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: netpadColors.secondary, // MongoDB dark green for light mode
    light: netpadColors.secondaryLight,
    dark: netpadColors.secondaryDark,
    contrastText: '#fff'
  },
  secondary: {
    main: netpadColors.accent, // NetPad cyan-green accent
    light: netpadColors.primaryLight,
    dark: netpadColors.primaryDark
  },
  background: {
    default: '#F8FAF9', // Warmer, subtle green tint
    paper: '#ffffff'
  },
  text: {
    primary: '#1a1a2e',
    secondary: '#5c6370'
  },
  divider: 'rgba(0, 0, 0, 0.08)',
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828'
  },
  success: {
    main: '#00684A',
    light: '#00966B',
    dark: '#004A33'
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100'
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b'
  }
};

// Dark shadows
const darkShadows: ThemeOptions['shadows'] = [
  'none',
  '0 1px 3px rgba(0, 0, 0, 0.3)',
  '0 2px 6px rgba(0, 0, 0, 0.3)',
  '0 4px 12px rgba(0, 0, 0, 0.4)',
  '0 8px 24px rgba(0, 0, 0, 0.4)',
  '0 12px 32px rgba(0, 0, 0, 0.5)',
  '0 16px 48px rgba(0, 0, 0, 0.5)',
  '0 20px 64px rgba(0, 0, 0, 0.6)',
  '0 24px 80px rgba(0, 0, 0, 0.6)',
  '0 28px 96px rgba(0, 0, 0, 0.7)',
  '0 32px 112px rgba(0, 0, 0, 0.7)',
  '0 36px 128px rgba(0, 0, 0, 0.8)',
  '0 40px 144px rgba(0, 0, 0, 0.8)',
  '0 44px 160px rgba(0, 0, 0, 0.9)',
  '0 48px 176px rgba(0, 0, 0, 0.9)',
  '0 52px 192px rgba(0, 0, 0, 1)',
  '0 56px 208px rgba(0, 0, 0, 1)',
  '0 60px 224px rgba(0, 0, 0, 1)',
  '0 64px 240px rgba(0, 0, 0, 1)',
  '0 68px 256px rgba(0, 0, 0, 1)',
  '0 72px 272px rgba(0, 0, 0, 1)',
  '0 76px 288px rgba(0, 0, 0, 1)',
  '0 80px 304px rgba(0, 0, 0, 1)',
  '0 84px 320px rgba(0, 0, 0, 1)',
  '0 88px 336px rgba(0, 0, 0, 1)'
];

// Light shadows
const lightShadows: ThemeOptions['shadows'] = [
  'none',
  '0 1px 3px rgba(0, 0, 0, 0.08)',
  '0 2px 6px rgba(0, 0, 0, 0.08)',
  '0 4px 12px rgba(0, 0, 0, 0.1)',
  '0 8px 24px rgba(0, 0, 0, 0.1)',
  '0 12px 32px rgba(0, 0, 0, 0.12)',
  '0 16px 48px rgba(0, 0, 0, 0.12)',
  '0 20px 64px rgba(0, 0, 0, 0.14)',
  '0 24px 80px rgba(0, 0, 0, 0.14)',
  '0 28px 96px rgba(0, 0, 0, 0.16)',
  '0 32px 112px rgba(0, 0, 0, 0.16)',
  '0 36px 128px rgba(0, 0, 0, 0.18)',
  '0 40px 144px rgba(0, 0, 0, 0.18)',
  '0 44px 160px rgba(0, 0, 0, 0.2)',
  '0 48px 176px rgba(0, 0, 0, 0.2)',
  '0 52px 192px rgba(0, 0, 0, 0.22)',
  '0 56px 208px rgba(0, 0, 0, 0.22)',
  '0 60px 224px rgba(0, 0, 0, 0.24)',
  '0 64px 240px rgba(0, 0, 0, 0.24)',
  '0 68px 256px rgba(0, 0, 0, 0.26)',
  '0 72px 272px rgba(0, 0, 0, 0.26)',
  '0 76px 288px rgba(0, 0, 0, 0.28)',
  '0 80px 304px rgba(0, 0, 0, 0.28)',
  '0 84px 320px rgba(0, 0, 0, 0.3)',
  '0 88px 336px rgba(0, 0, 0, 0.3)'
];

// Shared component overrides for calm UI
const sharedComponents: ThemeOptions['components'] = {
  MuiButton: {
    defaultProps: {
      disableElevation: true, // Flatter buttons for calm UI
    },
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 16px',
        fontWeight: 500,
        transition: 'all 0.15s ease',
      },
      sizeSmall: {
        padding: '6px 12px',
        fontSize: '0.8125rem',
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        transition: 'all 0.15s ease',
      },
      sizeSmall: {
        padding: 6,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        borderRadius: 6,
      },
      sizeSmall: {
        height: 22,
        fontSize: '0.75rem',
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      arrow: true,
      enterDelay: 400,
      leaveDelay: 100,
    },
    styleOverrides: {
      tooltip: {
        fontSize: '0.75rem',
        fontWeight: 500,
        borderRadius: 6,
        padding: '6px 10px',
      },
    },
  },
  MuiAccordion: {
    defaultProps: {
      disableGutters: true,
      elevation: 0,
    },
    styleOverrides: {
      root: {
        '&:before': { display: 'none' },
        backgroundColor: 'transparent',
      },
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: {
        minHeight: 44,
        '&.Mui-expanded': {
          minHeight: 44,
        },
      },
      content: {
        margin: '10px 0',
        '&.Mui-expanded': {
          margin: '10px 0',
        },
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: 0,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: 8,
        marginTop: 4,
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        margin: '2px 6px',
        padding: '8px 12px',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        minHeight: 44,
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: 44,
      },
    },
  },
  MuiFab: {
    defaultProps: {
      disableRipple: false,
    },
    styleOverrides: {
      root: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
        },
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        margin: '2px 0',
        '&.Mui-selected': {
          backgroundColor: 'rgba(0, 237, 100, 0.08)',
        },
      },
    },
  },
};

// Component overrides for dark mode
const darkComponents: ThemeOptions['components'] = {
  ...sharedComponents,
  MuiAppBar: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        // Structural navigation bar - should be square (no rounded corners)
        borderRadius: 0,
      },
    },
  },
  MuiPaper: {
    defaultProps: {
      elevation: 0, // Prefer borders over shadows for calm UI
    },
    styleOverrides: {
      root: {
        backgroundImage: netpadColors.gridPatternDark,
        backgroundSize: netpadColors.gridSize,
        border: '1px solid rgba(110, 118, 129, 0.12)',
        borderRadius: 12,
        // Structural containers (navbars, palettes, full-bleed bars) use the "square" prop
        // so they sit flush against viewport edges without rounded corners.
        '&.MuiPaper-square': {
          borderRadius: 0,
        },
        // Subtle inner highlight at top - signature NetPad styling
        boxShadow: 'inset 0 1px 0 rgba(0, 237, 100, 0.05)',
      },
      elevation1: {
        boxShadow: `inset 0 1px 0 rgba(0, 237, 100, 0.05), 0 2px 8px rgba(0, 0, 0, 0.2)`,
      },
      elevation2: {
        boxShadow: `inset 0 1px 0 rgba(0, 237, 100, 0.05), 0 4px 12px rgba(0, 0, 0, 0.25)`,
      },
      elevation3: {
        boxShadow: `inset 0 1px 0 rgba(0, 237, 100, 0.05), 0 8px 24px rgba(0, 0, 0, 0.3)`,
      },
    },
  },
  MuiButton: {
    ...sharedComponents.MuiButton,
    styleOverrides: {
      ...sharedComponents.MuiButton?.styleOverrides,
      contained: {
        // Signature NetPad gradient for primary buttons
        background: netpadColors.gradient,
        boxShadow: netpadColors.glowPrimary,
        '&:hover': {
          background: netpadColors.gradient,
          boxShadow: netpadColors.glowPrimaryHover,
          transform: 'translateY(-2px)',
        },
      },
      outlined: {
        borderColor: 'rgba(110, 118, 129, 0.3)',
        '&:hover': {
          borderColor: 'rgba(0, 237, 100, 0.5)',
          backgroundColor: 'rgba(0, 237, 100, 0.04)',
          transform: 'translateY(-1px)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        border: '1px solid rgba(110, 118, 129, 0.12)',
        transition: 'all 0.2s ease',
        // Subtle grid pattern background - NetPad identity
        backgroundImage: netpadColors.gridPatternDark,
        backgroundSize: netpadColors.gridSize,
        '&:hover': {
          borderColor: 'rgba(0, 237, 100, 0.3)',
          // Signature glow on hover
          boxShadow: `inset 0 1px 0 rgba(0, 237, 100, 0.1), ${netpadColors.glowSubtle}`,
        },
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          transition: 'all 0.2s ease',
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 237, 100, 0.4)',
            },
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              // Gradient border effect on focus
              borderColor: netpadColors.accent,
              borderWidth: 2,
            },
            // Subtle glow on focus
            boxShadow: '0 0 0 3px rgba(0, 212, 170, 0.1)',
          },
        },
      },
    },
  },
  MuiSelect: {
    defaultProps: {
      size: 'small',
    },
    styleOverrides: {
      root: {
        borderRadius: 8,
        transition: 'all 0.2s ease',
        '&.Mui-focused': {
          boxShadow: '0 0 0 3px rgba(0, 212, 170, 0.1)',
        },
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        padding: 8,
      },
      track: {
        borderRadius: 10,
        opacity: 0.3,
      },
      thumb: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
    },
  },
};

// Component overrides for light mode
const lightComponents: ThemeOptions['components'] = {
  ...sharedComponents,
  MuiAppBar: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        // Structural navigation bar - should be square (no rounded corners)
        borderRadius: 0,
      },
    },
  },
  MuiPaper: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        backgroundImage: netpadColors.gridPatternLight,
        backgroundSize: netpadColors.gridSize,
        border: '1px solid rgba(0, 104, 74, 0.1)',
        borderRadius: 12,
        // Structural containers (navbars, palettes, full-bleed bars) use the "square" prop
        // so they sit flush against viewport edges without rounded corners.
        '&.MuiPaper-square': {
          borderRadius: 0,
        },
        // Subtle top highlight for depth
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      },
      elevation1: {
        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.8), ${netpadColors.shadowSubtle}`,
      },
      elevation2: {
        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.8), ${netpadColors.shadowPrimary}`,
      },
      elevation3: {
        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.8), ${netpadColors.shadowPrimaryHover}`,
      },
    },
  },
  MuiButton: {
    ...sharedComponents.MuiButton,
    styleOverrides: {
      ...sharedComponents.MuiButton?.styleOverrides,
      contained: {
        // Refined gradient for light mode
        background: netpadColors.gradientLight,
        boxShadow: netpadColors.shadowPrimary,
        '&:hover': {
          background: netpadColors.gradientLight,
          boxShadow: netpadColors.shadowPrimaryHover,
          transform: 'translateY(-2px)',
        },
      },
      outlined: {
        borderColor: 'rgba(0, 104, 74, 0.25)',
        color: netpadColors.secondary,
        '&:hover': {
          borderColor: netpadColors.secondary,
          backgroundColor: 'rgba(0, 104, 74, 0.04)',
          transform: 'translateY(-1px)',
        },
      },
      text: {
        color: netpadColors.secondary,
        '&:hover': {
          backgroundColor: 'rgba(0, 104, 74, 0.06)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        border: '1px solid rgba(0, 104, 74, 0.1)',
        transition: 'all 0.2s ease',
        // Subtle grid pattern background - NetPad identity (light mode)
        backgroundImage: netpadColors.gridPatternLight,
        backgroundSize: netpadColors.gridSize,
        // Inner highlight for depth
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        '&:hover': {
          borderColor: 'rgba(0, 104, 74, 0.25)',
          // Refined shadow on hover
          boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.9), ${netpadColors.shadowSubtle}`,
        },
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          transition: 'all 0.2s ease',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 104, 74, 0.4)',
            },
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: netpadColors.secondaryLight,
              borderWidth: 2,
            },
            // Subtle focus ring
            boxShadow: '0 0 0 3px rgba(0, 150, 107, 0.1)',
          },
        },
      },
    },
  },
  MuiSelect: {
    defaultProps: {
      size: 'small',
    },
    styleOverrides: {
      root: {
        borderRadius: 8,
        transition: 'all 0.2s ease',
        '&.Mui-focused': {
          boxShadow: '0 0 0 3px rgba(0, 150, 107, 0.1)',
        },
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        padding: 8,
      },
      track: {
        borderRadius: 10,
        opacity: 0.4,
        backgroundColor: 'rgba(0, 104, 74, 0.3)',
      },
      thumb: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12)',
      },
      switchBase: {
        '&.Mui-checked': {
          '& + .MuiSwitch-track': {
            backgroundColor: netpadColors.secondaryLight,
            opacity: 1,
          },
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        borderRadius: 6,
      },
      filled: {
        backgroundColor: 'rgba(0, 104, 74, 0.08)',
        '&:hover': {
          backgroundColor: 'rgba(0, 104, 74, 0.12)',
        },
      },
      outlined: {
        borderColor: 'rgba(0, 104, 74, 0.25)',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        margin: '2px 0',
        '&:hover': {
          backgroundColor: 'rgba(0, 104, 74, 0.04)',
        },
        '&.Mui-selected': {
          backgroundColor: 'rgba(0, 150, 107, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(0, 150, 107, 0.14)',
          },
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: netpadColors.secondary,
        color: '#ffffff',
        fontSize: '0.75rem',
        fontWeight: 500,
        borderRadius: 6,
        padding: '6px 10px',
        boxShadow: netpadColors.shadowPrimary,
      },
      arrow: {
        color: netpadColors.secondary,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
      standardSuccess: {
        backgroundColor: 'rgba(0, 150, 107, 0.1)',
        borderLeft: `4px solid ${netpadColors.secondaryLight}`,
      },
      standardInfo: {
        borderLeft: '4px solid #0288d1',
      },
      standardWarning: {
        borderLeft: '4px solid #ed6c02',
      },
      standardError: {
        borderLeft: '4px solid #d32f2f',
      },
    },
  },
};

// Get design tokens based on mode
export function getDesignTokens(mode: ThemeMode): ThemeOptions {
  return {
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography: sharedTypography,
    shape: sharedShape,
    shadows: mode === 'dark' ? darkShadows : lightShadows,
    components: mode === 'dark' ? darkComponents : lightComponents
  };
}

// Default theme export (dark mode) for backward compatibility
export const theme = createTheme(getDesignTokens('dark'));

// Named theme exports
export const darkTheme = createTheme(getDesignTokens('dark'));
export const lightTheme = createTheme(getDesignTokens('light'));

// Export NetPad signature colors for use in components
export { netpadColors };
