'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
} from '@mui/icons-material';

interface StandaloneChatInputProps {
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
  placeholder?: string;
}

export function StandaloneChatInput({ 
  onSend, 
  isLoading, 
  placeholder = "Ask me anything about NetPad..." 
}: StandaloneChatInputProps) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await onSend(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      }}
    >
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
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
              '& fieldset': {
                borderColor: theme.palette.divider,
                borderWidth: 1,
              },
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
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
    </Box>
  );
}