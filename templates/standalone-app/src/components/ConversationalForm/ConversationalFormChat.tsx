'use client';

/**
 * Conversational Form Chat Component (Standalone Version)
 *
 * A simplified chat-based interface for conversational form submissions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  LinearProgress,
  Chip,
  Alert,
  Button,
  alpha,
  Collapse,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Send,
  AutoAwesome,
  CheckCircle,
  RadioButtonUnchecked,
  Refresh,
  ExpandMore,
  ExpandLess,
  DataObject,
  Warning,
  Edit,
  CheckCircleOutline,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversationalFormConfig,
  ConversationState,
  TopicCoverage,
} from '@/types/conversational';
import { Message } from '@/lib/ai/providers/base';

/**
 * Extended message type for UI
 */
interface ConversationalMessage extends Message {
  id: string;
  timestamp: Date;
  isStreaming?: boolean;
}

/**
 * Props for ConversationalFormChat
 */
interface ConversationalFormChatProps {
  formSlug: string;
  config: ConversationalFormConfig;
  onComplete?: (data: Record<string, any>, conversationState: ConversationState) => void;
  sx?: object;
}

/**
 * Single message bubble
 */
function MessageBubble({ message }: { message: ConversationalMessage }) {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: '80%',
          p: 2,
          borderRadius: 2,
          bgcolor: isUser ? 'primary.main' : alpha('#000', 0.05),
          color: isUser ? 'white' : 'text.primary',
          position: 'relative',
        }}
      >
        {!isUser && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 0.5,
            }}
          >
            <AutoAwesome sx={{ fontSize: 14, color: '#00ED64' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#00ED64' }}>
              Assistant
            </Typography>
          </Box>
        )}
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
          {message.isStreaming && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 8,
                height: 16,
                bgcolor: isUser ? 'white' : 'text.primary',
                ml: 0.5,
                animation: 'blink 1s step-end infinite',
                '@keyframes blink': {
                  '50%': { opacity: 0 },
                },
              }}
            />
          )}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            opacity: 0.7,
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Topic coverage indicator
 */
function TopicProgress({
  topics,
  expanded,
  onToggle,
}: {
  topics: TopicCoverage[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const requiredTopics = topics.filter((t) => t.priority === 'required');
  const coveredRequired = requiredTopics.filter((t) => t.covered).length;
  const progress =
    requiredTopics.length > 0 ? (coveredRequired / requiredTopics.length) * 100 : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: alpha('#00ED64', 0.05),
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha('#00ED64', 0.2),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Progress: {coveredRequired}/{requiredTopics.length} topics covered
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: alpha('#00ED64', 0.2),
              '& .MuiLinearProgress-bar': {
                bgcolor: '#00ED64',
                borderRadius: 3,
              },
            }}
          />
        </Box>
        <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {topics.map((topic) => (
            <Chip
              key={topic.topicId}
              icon={
                topic.covered ? (
                  <CheckCircle sx={{ fontSize: 16 }} />
                ) : (
                  <RadioButtonUnchecked sx={{ fontSize: 16 }} />
                )
              }
              label={topic.name}
              size="small"
              sx={{
                bgcolor: topic.covered ? alpha('#00ED64', 0.2) : alpha('#000', 0.05),
                color: topic.covered ? '#00AA44' : 'text.secondary',
                '& .MuiChip-icon': {
                  color: topic.covered ? '#00AA44' : 'text.disabled',
                },
              }}
            />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

/**
 * Extracted data summary display
 */
function ExtractedDataSummary({
  data,
  schema,
  confidence,
  expanded,
  onToggle,
}: {
  data: Record<string, any>;
  schema: ConversationalFormConfig['extractionSchema'];
  confidence: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const filledFields = schema.filter(
    (s) => data[s.field] !== undefined && data[s.field] !== null && data[s.field] !== ''
  );
  const missingRequired = schema.filter(
    (s) =>
      s.required &&
      (data[s.field] === undefined || data[s.field] === null || data[s.field] === '')
  );

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.join(', ') || '—';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: alpha('#2196f3', 0.05),
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha('#2196f3', 0.2),
        mt: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DataObject sx={{ color: '#2196f3' }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Collected Data
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {filledFields.length} of {schema.length} fields •{' '}
              {Math.round(confidence * 100)}% confidence
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {missingRequired.length > 0 && (
            <Tooltip title={`${missingRequired.length} required field(s) missing`}>
              <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
            </Tooltip>
          )}
          <IconButton size="small">{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {schema.map((field) => {
            const value = data[field.field];
            const hasValue = value !== undefined && value !== null && value !== '';
            const isMissing = field.required && !hasValue;

            return (
              <Box
                key={field.field}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: isMissing ? 'warning.main' : 'text.primary',
                      }}
                    >
                      {field.description || field.field}
                    </Typography>
                    {field.required && (
                      <Typography variant="caption" color="error.main">
                        *
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: hasValue ? 'text.secondary' : 'text.disabled',
                      fontStyle: hasValue ? 'normal' : 'italic',
                      mt: 0.25,
                    }}
                  >
                    {hasValue ? formatValue(value) : 'Not provided'}
                  </Typography>
                </Box>
                {hasValue ? (
                  <CheckCircleOutline sx={{ color: '#00ED64', fontSize: 18, mt: 0.5 }} />
                ) : isMissing ? (
                  <Warning sx={{ color: 'warning.main', fontSize: 18, mt: 0.5 }} />
                ) : (
                  <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 18, mt: 0.5 }} />
                )}
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Paper>
  );
}

/**
 * Completion confirmation
 */
function CompletionPrompt({
  extractedData,
  schema,
  confidence,
  onConfirm,
  onDismiss,
}: {
  extractedData: Record<string, any>;
  schema: ConversationalFormConfig['extractionSchema'];
  confidence: number;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const [dataExpanded, setDataExpanded] = useState(true);
  const missingRequired = schema.filter(
    (s) =>
      s.required &&
      (extractedData[s.field] === undefined ||
        extractedData[s.field] === null ||
        extractedData[s.field] === '')
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Alert
        severity={missingRequired.length > 0 ? 'warning' : 'success'}
        sx={{
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          {missingRequired.length > 0 ? 'Almost ready to submit' : 'Ready to submit?'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {missingRequired.length > 0
            ? `${missingRequired.length} required field(s) still need information.`
            : "It looks like we've covered all the important topics."}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onConfirm}
            sx={{
              bgcolor: '#00ED64',
              '&:hover': { bgcolor: '#00CC55' },
            }}
          >
            Submit
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={onDismiss}
            startIcon={<Edit sx={{ fontSize: 16 }} />}
            sx={{
              borderColor: 'divider',
              color: 'text.secondary',
            }}
          >
            Continue Chatting
          </Button>
        </Box>
      </Alert>

      <ExtractedDataSummary
        data={extractedData}
        schema={schema}
        confidence={confidence}
        expanded={dataExpanded}
        onToggle={() => setDataExpanded(!dataExpanded)}
      />
    </Box>
  );
}

/**
 * Main ConversationalFormChat component
 */
export function ConversationalFormChat({
  formSlug,
  config,
  onComplete,
  sx,
}: ConversationalFormChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ConversationalMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start conversation
  const startConversation = useCallback(async () => {
    setMessages([]);
    setError(null);
    setIsComplete(false);
    setShowCompletion(false);
    setConversationState(null);

    // Send initial message to get greeting
    await sendMessageToAPI('Hello, I would like to get started.');
  }, [formSlug]);

  // Start on mount
  useEffect(() => {
    startConversation();
  }, [startConversation]);

  // Send message to API
  const sendMessageToAPI = async (content: string) => {
    setIsStreaming(true);
    setError(null);

    // Add user message
    const userMessage: ConversationalMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for assistant message
    const assistantMessageId = uuidv4();
    const assistantMessage: ConversationalMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/conversational/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug,
          message: content,
          conversationState,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'chunk') {
                fullContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, content: fullContent } : m
                  )
                );
              } else if (parsed.type === 'state') {
                setConversationState(parsed.conversationState);
                if (parsed.isComplete) {
                  setIsComplete(true);
                  setShowCompletion(true);
                }
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Mark message as done streaming
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      // Remove the placeholder assistant message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    } finally {
      setIsStreaming(false);
    }
  };

  // Handle send
  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput('');
    await sendMessageToAPI(message);
    inputRef.current?.focus();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle completion confirmation
  const handleConfirmCompletion = () => {
    if (conversationState && onComplete) {
      onComplete(conversationState.partialExtractions, conversationState);
    }
  };

  // Handle dismissing completion
  const handleDismissCompletion = () => {
    setShowCompletion(false);
  };

  // Reset conversation
  const handleReset = () => {
    startConversation();
  };

  const topics = conversationState?.topics || [];
  const confidence = conversationState?.confidence || 0;
  const turnCount = conversationState?.turnCount || 0;
  const extractedData = conversationState?.partialExtractions || {};

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 500,
        maxHeight: 700,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha('#00ED64', 0.05),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome sx={{ color: '#00ED64' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {config.objective.length > 50
              ? config.objective.substring(0, 50) + '...'
              : config.objective}
          </Typography>
        </Box>
        <Tooltip title="Start over">
          <IconButton size="small" onClick={handleReset}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Topic Progress */}
      {topics.length > 0 && (
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TopicProgress
            topics={topics}
            expanded={topicsExpanded}
            onToggle={() => setTopicsExpanded(!topicsExpanded)}
          />
        </Box>
      )}

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: 'background.default',
        }}
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Completion prompt */}
        {showCompletion && (
          <CompletionPrompt
            extractedData={extractedData}
            schema={config.extractionSchema}
            confidence={confidence}
            onConfirm={handleConfirmCompletion}
            onDismiss={handleDismissCompletion}
          />
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            size="small"
            InputProps={{
              sx: {
                borderRadius: 2,
                bgcolor: alpha('#000', 0.02),
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            sx={{
              bgcolor: '#00ED64',
              color: 'white',
              '&:hover': { bgcolor: '#00CC55' },
              '&.Mui-disabled': { bgcolor: alpha('#00ED64', 0.3) },
            }}
          >
            {isStreaming ? (
              <CircularProgress size={20} sx={{ color: 'white' }} />
            ) : (
              <Send />
            )}
          </IconButton>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1, textAlign: 'center' }}
        >
          Turn {turnCount} • Confidence {Math.round(confidence * 100)}%
        </Typography>
      </Box>
    </Paper>
  );
}

export default ConversationalFormChat;
