'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, useTheme, alpha } from '@mui/material';
import { Visibility as ViewIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Banner displayed when an admin is impersonating another user.
 * Shows at the top of the page with options to end impersonation.
 */
export function ImpersonationBanner() {
  const theme = useTheme();
  const { impersonation, endImpersonation } = useAuth();
  const [isEnding, setIsEnding] = useState(false);

  if (!impersonation?.isImpersonating) {
    return null;
  }

  const handleEndImpersonation = async () => {
    setIsEnding(true);
    try {
      const result = await endImpersonation();
      if (result.success) {
        // Redirect to admin users page to ensure clean state
        // Using href instead of reload to clear any user-specific cached state
        window.location.href = '/admin/users';
      }
    } finally {
      setIsEnding(false);
    }
  };

  const duration = Math.floor((Date.now() - impersonation.startedAt) / 60000);
  const durationText = duration < 1 ? 'just now' : `${duration} min`;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
        color: theme.palette.warning.contrastText,
        py: 1,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        boxShadow: `0 2px 8px ${alpha(theme.palette.warning.main, 0.4)}`,
      }}
    >
      <ViewIcon sx={{ fontSize: 20 }} />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        Viewing as <strong>{impersonation.targetEmail}</strong>
        <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.9 }}>
          (Started {durationText})
        </Typography>
      </Typography>
      <Button
        variant="contained"
        size="small"
        onClick={handleEndImpersonation}
        disabled={isEnding}
        startIcon={isEnding ? <CircularProgress size={14} color="inherit" /> : <CloseIcon />}
        sx={{
          ml: 2,
          bgcolor: alpha(theme.palette.common.black, 0.2),
          color: 'inherit',
          '&:hover': {
            bgcolor: alpha(theme.palette.common.black, 0.3),
          },
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        {isEnding ? 'Ending...' : 'End Impersonation'}
      </Button>
    </Box>
  );
}

export default ImpersonationBanner;
