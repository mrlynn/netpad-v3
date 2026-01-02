'use client';

import { ReactNode, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { BrandingProvider, useBranding } from '@/contexts/OnboardingBrandingContext';

// ============================================
// Theme Creation
// ============================================

function createOnboardingTheme(primaryColor: string, secondaryColor?: string) {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: primaryColor,
        contrastText: '#001E2B',
      },
      secondary: {
        main: secondaryColor || '#001E2B',
      },
      background: {
        default: '#f8f9fa',
        paper: '#ffffff',
      },
      text: {
        primary: '#001E2B',
        secondary: '#5C6C75',
      },
      success: {
        main: '#00ED64',
        light: '#e8f5e9',
      },
      error: {
        main: '#d32f2f',
        light: '#ffebee',
      },
      warning: {
        main: '#f57c00',
        light: '#fff3e0',
      },
      info: {
        main: '#1976d2',
        light: '#e3f2fd',
      },
    },
    typography: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.1rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 600,
            padding: '10px 24px',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 8,
          },
        },
      },
    },
  });
}

// ============================================
// Inner Layout with Theme
// ============================================

function OnboardingLayoutInner({ children }: { children: ReactNode }) {
  const { branding } = useBranding();

  // Create theme based on branding colors
  const theme = useMemo(
    () => createOnboardingTheme(branding.primaryColor, branding.secondaryColor),
    [branding.primaryColor, branding.secondaryColor]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}

// ============================================
// Layout Component
// ============================================

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <BrandingProvider>
      <OnboardingLayoutInner>{children}</OnboardingLayoutInner>
    </BrandingProvider>
  );
}
