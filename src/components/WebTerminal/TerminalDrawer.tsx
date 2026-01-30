'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Box, 
  Drawer, 
  IconButton, 
  Typography, 
  CircularProgress,
  Tooltip,
  Collapse,
} from '@mui/material';
import { 
  Terminal as TerminalIcon, 
  KeyboardArrowUp, 
  KeyboardArrowDown,
  Close,
} from '@mui/icons-material';

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
        height: 400,
        bgcolor: '#0A0F1C',
      }}>
        <CircularProgress sx={{ color: '#00ED64' }} />
      </Box>
    ),
  }
);

interface TerminalDrawerProps {
  currentProject?: string;
  currentOrg?: string;
}

/**
 * Bottom drawer terminal - sits at the bottom of the screen
 * with a tab to expand/collapse
 */
export function TerminalDrawer({ currentProject, currentOrg }: TerminalDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Only render on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle keyboard shortcut (Ctrl+` or Cmd+`)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === '`') {
      event.preventDefault();
      if (isOpen && !isMinimized) {
        // If open and not minimized, close it
        setIsOpen(false);
      } else if (isOpen && isMinimized) {
        // If minimized, expand it
        setIsMinimized(false);
      } else {
        // If closed, open it
        setIsOpen(true);
        setIsMinimized(false);
      }
    }
    
    // Escape to minimize (not close completely)
    if (event.key === 'Escape' && isOpen && !isMinimized) {
      setIsMinimized(true);
    }
  }, [isOpen, isMinimized]);

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
      {/* Bottom Tab - Always visible when terminal has been opened */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1199,
          display: isOpen ? 'none' : 'flex',
        }}
      >
        <Tooltip title="Open Terminal (Ctrl+`)" placement="top">
          <Box
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 0.75,
              bgcolor: '#0A0F1C',
              color: '#00ED64',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              borderBottom: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#141B2D',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <TerminalIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
              Terminal
            </Typography>
            <KeyboardArrowUp fontSize="small" />
          </Box>
        </Tooltip>
      </Box>

      {/* Terminal Drawer */}
      <Drawer
        anchor="bottom"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        hideBackdrop={isMinimized}
        ModalProps={{
          keepMounted: true, // Better performance on mobile
        }}
        PaperProps={{
          sx: {
            height: isMinimized ? 'auto' : '50vh',
            maxHeight: isMinimized ? 'auto' : '70vh',
            minHeight: isMinimized ? 'auto' : 300,
            bgcolor: 'transparent',
            boxShadow: isMinimized ? 'none' : undefined,
          },
        }}
        sx={{
          '& .MuiBackdrop-root': {
            bgcolor: isMinimized ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        {/* Minimized bar */}
        <Collapse in={isMinimized}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              bgcolor: '#0A0F1C',
              borderTop: '1px solid rgba(0, 237, 100, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TerminalIcon sx={{ color: '#00ED64', fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: '#E4E4E7', fontFamily: 'monospace' }}>
                NetPad Terminal {currentProject && `• ${currentProject}`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton 
                size="small" 
                onClick={() => setIsMinimized(false)}
                sx={{ color: 'rgba(255,255,255,0.6)' }}
              >
                <KeyboardArrowUp fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => setIsOpen(false)}
                sx={{ color: 'rgba(255,255,255,0.6)' }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Collapse>

        {/* Full terminal - conditionally rendered instead of Collapse for better flex behavior */}
        {!isMinimized && (
          <Box
            sx={{
              height: 'calc(50vh - 40px)', // Account for header
              maxHeight: 'calc(70vh - 40px)',
              minHeight: 260,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#0A0F1C',
              borderTop: '2px solid #00ED64',
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 0.5,
                bgcolor: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                flexShrink: 0,
                height: 40,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#EF4444' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FBBF24' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00ED64' }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', ml: 1 }}>
                  NetPad Terminal
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', mr: 1 }}>
                  Ctrl+` to toggle
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setIsMinimized(true)}
                  sx={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <KeyboardArrowDown fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => setIsOpen(false)}
                  sx={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Terminal Content */}
            <Box 
              sx={{ 
                flex: 1, 
                overflow: 'hidden', 
                position: 'relative',
                minHeight: 0, // Important for flex child to shrink
              }}
            >
              <WebTerminal
                currentProject={currentProject}
                currentOrg={currentOrg}
                embedded
              />
            </Box>
          </Box>
        )}
      </Drawer>
    </>
  );
}

export default TerminalDrawer;
