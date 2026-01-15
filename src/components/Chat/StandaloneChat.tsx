'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  DeleteOutline as ClearIcon,
  Cloud as CloudIcon,
  Memory as MemoryIcon,
} from '@mui/icons-material';
import { ChatMessage, ChatAction } from '@/types/chat';
import { ChatMessages } from './ChatMessages';
import { StandaloneChatInput } from './StandaloneChatInput';

interface StandaloneChatProps {
  initialMessage?: string;
  title?: string;
  onClose?: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm the NetPad AI Assistant. How can I help you today?",
  timestamp: new Date(),
};

export function StandaloneChat({ 
  initialMessage, 
  title = 'NetPad Assistant',
  onClose 
}: StandaloneChatProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [providerInfo, setProviderInfo] = useState<{ name: string; type: string; model?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch provider info
  useEffect(() => {
    fetch('/api/ai/provider-info')
      .then(res => res.json())
      .then(data => {
        if (data.configured && data.provider) {
          setProviderInfo({
            name: data.provider.name,
            type: data.provider.type,
            model: data.provider.model,
          });
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle initial message from query params
  useEffect(() => {
    if (initialMessage && initialMessage.trim()) {
      // Wait a bit for welcome message to show first
      setTimeout(() => {
        handleSendMessage(initialMessage.trim());
      }, 500);
    }
  }, [initialMessage]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      // Build conversation history
      const conversationHistory = messages
        .filter(m => m.role !== 'system' && m.id !== 'welcome')
        .slice(-10)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          conversationHistory,
          context: { fields: [], currentView: 'other' },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? {
                ...msg,
                content: data.message || '',
                action: data.action,
                isStreaming: false,
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? {
                ...msg,
                content: error instanceof Error ? error.message : 'Sorry, something went wrong.',
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = (messageId: string, action: ChatAction) => {
    // In standalone mode, we don't execute form/workflow actions
    // Just mark as executed for UI purposes
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, actionExecuted: true } : msg
      )
    );
  };

  const clearMessages = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          borderRadius: 0,
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: theme.palette.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AIIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {title}
                </Typography>
                {providerInfo && (
                  <Tooltip
                    title={`Powered by ${providerInfo.name}${providerInfo.model ? ` (${providerInfo.model})` : ''}`}
                    arrow
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 0.25,
                      }}
                    >
                      {providerInfo.type === 'ollama' && (
                        <MemoryIcon sx={{ fontSize: 12 }} />
                      )}
                      {providerInfo.type === 'openai' && (
                        <CloudIcon sx={{ fontSize: 12 }} />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 500,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'text.secondary',
                        }}
                      >
                        {providerInfo.name}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Clear chat">
                <IconButton
                  size="small"
                  onClick={clearMessages}
                  disabled={messages.length <= 1}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {onClose && (
                <Tooltip title="Close">
                  <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Messages */}
      <Container maxWidth="md" sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            mb: 2,
            minHeight: 0,
          }}
        >
          <ChatMessages 
            messages={messages} 
            isLoading={isLoading}
            onExecuteAction={handleExecuteAction}
          />
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Paper
          elevation={2}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <StandaloneChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask me anything about NetPad..."
          />
        </Paper>
      </Container>
    </Box>
  );
}