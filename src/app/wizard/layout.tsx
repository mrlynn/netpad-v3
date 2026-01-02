'use client';

import { ReactNode } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';

// Clean light theme for public wizards
const wizardTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00ED64',
    },
    secondary: {
      main: '#001E2B',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#001E2B',
      secondary: '#5C6C75',
    },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={wizardTheme}>
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
