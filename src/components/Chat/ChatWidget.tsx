'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Fab,
  Slide,
  Tooltip,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Remove as MinimizeIcon,
  DeleteOutline as ClearIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { useChat } from '@/contexts/ChatContext';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

// Routes where the chat widget should NOT appear (public/embedded contexts)
const HIDDEN_ROUTES = [
  '/forms/', // Published form pages
  '/auth/',  // Auth pages
];

export function ChatWidget() {
  const pathname = usePathname();
  const theme = useTheme();

  // Hide on public form pages and auth pages
  const shouldHide = HIDDEN_ROUTES.some(route => pathname?.startsWith(route));

  if (shouldHide) {
    return null;
  }
  const {
    isOpen,
    openChat,
    closeChat,
    messages,
    isLoading,
    clearMessages,
  } = useChat();

  const [isMinimized, setIsMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Count unread messages (messages since last close)
  const [lastSeenCount, setLastSeenCount] = useState(messages.length);
  const unreadCount = isOpen ? 0 : Math.max(0, messages.length - lastSeenCount);

  useEffect(() => {
    if (isOpen) {
      setLastSeenCount(messages.length);
    }
  }, [isOpen, messages.length]);

  // Handle clicking outside to minimize (optional)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Optional: minimize on outside click
        // setIsMinimized(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) {
    // Floating action button when closed
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <Tooltip title="AI Form Assistant (⌘⇧A)" placement="left">
          <Badge
            badgeContent={unreadCount}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                right: 8,
                top: 8,
              },
            }}
          >
            <Fab
              color="primary"
              onClick={openChat}
              sx={{
                width: 56,
                height: 56,
                boxShadow: theme.shadows[8],
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                },
              }}
            >
              <AIIcon />
            </Fab>
          </Badge>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
      <Paper
        ref={containerRef}
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: isMinimized ? 300 : 380,
          height: isMinimized ? 56 : 520,
          maxHeight: 'calc(100vh - 100px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          overflow: 'hidden',
          zIndex: 1000,
          transition: 'all 0.2s ease-in-out',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            cursor: 'pointer',
          }}
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AIIcon sx={{ fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Form Assistant
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Clear chat">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  clearMessages();
                }}
                sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={isMinimized ? 'Expand' : 'Minimize'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}
              >
                <MinimizeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close (Esc)">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  closeChat();
                }}
                sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Body - only show when not minimized */}
        {!isMinimized && (
          <>
            {/* Messages */}
            <ChatMessages messages={messages} isLoading={isLoading} />

            {/* Input */}
            <ChatInput />
          </>
        )}
      </Paper>
    </Slide>
  );
}
