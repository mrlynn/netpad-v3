'use client';

import { useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { ChatMessage, ChatAction } from '@/types/chat';
import { useChat } from '@/contexts/ChatContext';
import ReactMarkdown from 'react-markdown';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        bgcolor: alpha(theme.palette.background.default, 0.5),
      }}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            Thinking...
          </Typography>
        </Box>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const theme = useTheme();
  const { executeAction } = useChat();
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 0.5,
      }}
    >
      {/* Avatar and label */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.5,
        }}
      >
        {!isUser && (
          <AIIcon
            sx={{
              fontSize: 14,
              color: theme.palette.primary.main,
            }}
          />
        )}
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
          }}
        >
          {isUser ? 'You' : 'Assistant'}
        </Typography>
      </Box>

      {/* Message bubble */}
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.5,
          maxWidth: '90%',
          borderRadius: 2,
          bgcolor: isUser
            ? theme.palette.primary.main
            : alpha(theme.palette.action.hover, 0.5),
          color: isUser ? 'white' : 'inherit',
          border: isUser ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        {isStreaming && !message.content ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={14} color={isUser ? 'inherit' : 'primary'} />
            <Typography variant="body2">Thinking...</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
              '& ul, & ol': { m: 0, pl: 2.5, mb: 1 },
              '& li': { mb: 0.5 },
              '& code': {
                bgcolor: alpha(theme.palette.common.black, isUser ? 0.2 : 0.08),
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                fontSize: '0.85em',
                fontFamily: 'monospace',
              },
              '& strong': { fontWeight: 600 },
            }}
          >
            <Typography
              variant="body2"
              component="div"
              sx={{ lineHeight: 1.6 }}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Action button if available */}
      {message.action && !message.actionExecuted && (
        <ActionButton
          action={message.action}
          onExecute={() => executeAction(message.id, message.action!)}
        />
      )}

      {/* Action executed indicator */}
      {message.actionExecuted && (
        <Chip
          icon={<CheckIcon sx={{ fontSize: 14 }} />}
          label="Action applied"
          size="small"
          color="success"
          variant="outlined"
          sx={{ mt: 0.5 }}
        />
      )}
    </Box>
  );
}

interface ActionButtonProps {
  action: ChatAction;
  onExecute: () => void;
}

function ActionButton({ action, onExecute }: ActionButtonProps) {
  const theme = useTheme();

  const getActionLabel = () => {
    switch (action.type) {
      case 'add_field':
        return `Add "${action.payload.field.label}" field`;
      case 'update_field':
        return `Update field`;
      case 'delete_field':
        return `Delete field`;
      case 'suggest_fields':
        return `Add ${action.payload.fields.length} suggested fields`;
      case 'update_settings':
        return 'Apply settings';
      default:
        return 'Apply';
    }
  };

  // Don't show button for explain actions
  if (action.type === 'explain') {
    return null;
  }

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<AddIcon />}
      onClick={onExecute}
      sx={{
        mt: 1,
        borderRadius: 2,
        textTransform: 'none',
        borderColor: theme.palette.primary.main,
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.1),
        },
      }}
    >
      {getActionLabel()}
    </Button>
  );
}
