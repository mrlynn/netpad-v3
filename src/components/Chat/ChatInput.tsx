'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  KeyboardVoice as VoiceIcon,
} from '@mui/icons-material';
import { useChat } from '@/contexts/ChatContext';

// Quick suggestion chips
const QUICK_SUGGESTIONS = [
  'Add a rating field',
  'Make all fields required',
  'Suggest more fields',
  'How do I add validation?',
];

export function ChatInput() {
  const theme = useTheme();
  const { sendMessage, isLoading, isOpen, formContext, activeContextType, messages } = useChat();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickSuggestion = async (suggestion: string) => {
    if (isLoading) return;
    setInput('');
    await sendMessage(suggestion);
  };

  // Show field count context
  const fieldCount = formContext.fields.length;
  
  // Only show suggestion pills when in form context and no user messages yet
  const userMessages = messages.filter(m => m.role === 'user');
  const shouldShowSuggestions = activeContextType === 'form' && userMessages.length === 0;

  return (
    <Box
      sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      }}
    >
      {/* Context indicator */}
      {fieldCount > 0 && activeContextType === 'form' && (
        <Box
          sx={{
            px: 2,
            py: 0.75,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Working with {fieldCount} field{fieldCount !== 1 ? 's' : ''}
            {formContext.formName && ` in "${formContext.formName}"`}
          </Typography>
        </Box>
      )}

      {/* Quick suggestions - show only in form context when no messages have been sent */}
      {shouldShowSuggestions && (
        <Box
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {QUICK_SUGGESTIONS.slice(0, 2).map((suggestion) => (
            <Box
              key={suggestion}
              onClick={() => handleQuickSuggestion(suggestion)}
              sx={{
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
                transition: 'background-color 0.2s',
              }}
            >
              {suggestion}
            </Box>
          ))}
        </Box>
      )}

      {/* Input area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          p: 1.5,
        }}
      >
        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={3}
          placeholder={
            activeContextType === 'form'
              ? "Ask me anything about your form..."
              : activeContextType === 'workflow'
              ? "Ask me anything about your workflow..."
              : "Ask me anything about NetPad..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: alpha(theme.palette.action.hover, 0.5),
              '& fieldset': {
                borderColor: 'transparent',
              },
              '&:hover fieldset': {
                borderColor: theme.palette.divider,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 1,
              },
            },
            '& .MuiInputBase-input': {
              fontSize: '0.875rem',
            },
          }}
          InputProps={{
            inputRef: inputRef,
          }}
        />
        <Tooltip title="Send message (Enter)">
          <span>
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              sx={{
                bgcolor: input.trim()
                  ? theme.palette.primary.main
                  : alpha(theme.palette.action.disabled, 0.3),
                color: input.trim() ? 'white' : theme.palette.action.disabled,
                '&:hover': {
                  bgcolor: input.trim()
                    ? theme.palette.primary.dark
                    : alpha(theme.palette.action.disabled, 0.3),
                },
                '&.Mui-disabled': {
                  bgcolor: alpha(theme.palette.action.disabled, 0.3),
                  color: theme.palette.action.disabled,
                },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Keyboard hint */}
      <Box
        sx={{
          px: 2,
          pb: 1,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ fontSize: '0.65rem' }}
        >
          Press Enter to send · Esc to close
        </Typography>
      </Box>
    </Box>
  );
}
