'use client';

import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Professional blue for IT support
    },
    secondary: {
      main: '#00ED64', // MongoDB green accent
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
