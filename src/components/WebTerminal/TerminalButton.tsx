'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Fab, Tooltip, Zoom, Backdrop, CircularProgress, Box } from '@mui/material';
import { Terminal as TerminalIcon } from '@mui/icons-material';

// Dynamically import WebTerminal to avoid SSR issues with xterm
const WebTerminal = dynamic(
  () => import('./Terminal').then((mod) => mod.WebTerminal),
  { 
    ssr: false,
    loading: () => (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '100%',
        maxWidth: 900,
        height: 500,
        bgcolor: '#0A0F1C',
        borderRadius: 2,
      }}>
        <CircularProgress sx={{ color: '#00ED64' }} />
      </Box>
    ),
  }
);

interface TerminalButtonProps {
  currentProject?: string;
  currentOrg?: string;
}

/**
 * Floating button that opens the web terminal
 * Also handles Ctrl+` keyboard shortcut
 */
export function TerminalButton({ currentProject, currentOrg }: TerminalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Only render on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle keyboard shortcut (Ctrl+` or Cmd+`)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === '`') {
      event.preventDefault();
      setIsOpen(prev => !prev);
    }
    
    // Escape to close
    if (event.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Don't render anything on server
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <Tooltip 
        title="Open Terminal (Ctrl+`)" 
        placement="left"
        TransitionComponent={Zoom}
      >
        <Fab
          color="primary"
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            bgcolor: '#00ED64',
            color: '#0A0F1C',
            '&:hover': {
              bgcolor: '#00C853',
            },
            display: isOpen ? 'none' : 'flex',
          }}
        >
          <TerminalIcon />
        </Fab>
      </Tooltip>

      {/* Terminal Overlay */}
      <Backdrop
        open={isOpen}
        sx={{ 
          zIndex: 1200,
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          alignItems: 'flex-end',
          p: 3,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsOpen(false);
          }
        }}
      >
        {isOpen && (
          <WebTerminal
            onClose={() => setIsOpen(false)}
            currentProject={currentProject}
            currentOrg={currentOrg}
          />
        )}
      </Backdrop>
    </>
  );
}

export default TerminalButton;
