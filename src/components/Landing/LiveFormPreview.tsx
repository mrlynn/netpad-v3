/**
 * Live Form Preview Component
 *
 * Shows a real-time preview of the form as it's being generated.
 * Includes both chat mode preview and field list.
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  alpha,
  IconButton,
  Tooltip,
  Button,
  TextField,
  Fade,
  Grow,
  LinearProgress,
  Collapse,
  Modal,
  Paper,
} from '@mui/material';
import {
  AutoAwesome,
  CheckCircle,
  RadioButtonUnchecked,
  ChatBubble,
  Description,
  Send,
  TaskAlt,
  DataObject,
  Celebration,
  OpenInFull,
  Close,
} from '@mui/icons-material';
import { FieldConfig } from '@/types/form';
import { ConversationalFormConfig } from '@/types/conversational';

interface LiveFormPreviewProps {
  fields: FieldConfig[];
  conversationalConfig?: ConversationalFormConfig;
  isGenerating: boolean;
  isComplete: boolean;
  onSignUp?: () => void;
}

/**
 * Field badge that appears with animation
 */
function FieldBadge({
  field,
  index,
  isGenerating,
}: {
  field: FieldConfig;
  index: number;
  isGenerating: boolean;
}) {
  const isNew = isGenerating && index === 0; // Simplified - in real use would track actual new fields

  return (
    <Grow in timeout={300 + index * 100}>
      <Chip
        icon={
          field.required ? (
            <CheckCircle sx={{ fontSize: 14 }} />
          ) : (
            <RadioButtonUnchecked sx={{ fontSize: 14 }} />
          )
        }
        label={field.label}
        size="small"
        sx={{
          bgcolor: field.required ? alpha('#00ED64', 0.15) : alpha('#fff', 0.08),
          color: field.required ? '#00ED64' : 'text.secondary',
          border: '1px solid',
          borderColor: field.required ? alpha('#00ED64', 0.3) : alpha('#fff', 0.1),
          '& .MuiChip-icon': {
            color: field.required ? '#00ED64' : 'text.disabled',
          },
          animation: isNew ? 'pulse 1s ease-in-out' : 'none',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.6 },
          },
        }}
      />
    </Grow>
  );
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Extracted Data Display - Shows captured form data with edit capability
 */
function ExtractedDataDisplay({
  extractedData,
  fields,
  onEdit,
}: {
  extractedData: Record<string, any>;
  fields: FieldConfig[];
  onEdit?: (key: string, currentValue: string) => void;
}) {
  const entries = Object.entries(extractedData).filter(([, value]) => value);

  if (entries.length === 0) return null;

  // Map extracted data to field labels
  const getFieldLabel = (key: string) => {
    const field = fields.find(f => f.path === key || f.path.includes(key) || key.includes(f.path));
    return field?.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  };

  return (
    <Grow in>
      <Box
        sx={{
          bgcolor: alpha('#00ED64', 0.1),
          border: '1px solid',
          borderColor: alpha('#00ED64', 0.3),
          borderRadius: 2,
          p: 1.5,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DataObject sx={{ fontSize: 14, color: '#00ED64' }} />
            <Typography variant="caption" sx={{ color: '#00ED64', fontWeight: 600 }}>
              Data Captured
            </Typography>
          </Box>
          {onEdit && (
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), fontSize: '0.6rem' }}>
              Click to edit
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {entries.map(([key, value]) => (
            <Box
              key={key}
              onClick={() => onEdit?.(key, String(value))}
              sx={{
                display: 'flex',
                gap: 1,
                cursor: onEdit ? 'pointer' : 'default',
                p: 0.5,
                mx: -0.5,
                borderRadius: 1,
                transition: 'background-color 0.15s',
                '&:hover': onEdit ? {
                  bgcolor: alpha('#fff', 0.05),
                } : {},
              }}
            >
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), minWidth: 60 }}>
                {getFieldLabel(key)}:
              </Typography>
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 500, flex: 1 }}>
                {String(value)}
              </Typography>
              {onEdit && (
                <Typography variant="caption" sx={{ color: alpha('#00ED64', 0.6), fontSize: '0.6rem' }}>
                  edit
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Grow>
  );
}

/**
 * Completion Summary - Shows when all required fields are captured
 */
function CompletionSummary({
  extractedData,
  fields,
  onReset,
}: {
  extractedData: Record<string, any>;
  fields: FieldConfig[];
  onReset: () => void;
}) {
  const entries = Object.entries(extractedData).filter(([, value]) => value);

  const getFieldLabel = (key: string) => {
    const field = fields.find(f => f.path === key || f.path.includes(key) || key.includes(f.path));
    return field?.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  };

  return (
    <Box
      sx={{
        bgcolor: alpha('#000', 0.3),
        borderRadius: 2,
        p: 2,
        height: 320,
        minHeight: 320,
        maxHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Success header */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: alpha('#00ED64', 0.2),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1,
          }}
        >
          <Celebration sx={{ fontSize: 24, color: '#00ED64' }} />
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff' }}>
          Form Submission Complete!
        </Typography>
        <Typography variant="caption" sx={{ color: alpha('#fff', 0.6) }}>
          Here&apos;s what was captured from the conversation
        </Typography>
      </Box>

      {/* Captured data */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          bgcolor: alpha('#001E2B', 0.5),
          borderRadius: 2,
          p: 1.5,
          mb: 2,
          border: '1px solid',
          borderColor: alpha('#00ED64', 0.2),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1, borderBottom: '1px solid', borderColor: alpha('#fff', 0.1) }}>
          <TaskAlt sx={{ fontSize: 16, color: '#00ED64' }} />
          <Typography variant="caption" sx={{ color: '#00ED64', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Extracted Data
          </Typography>
        </Box>
        {entries.map(([key, value]) => (
          <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: alpha('#fff', 0.05) }}>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.6) }}>
              {getFieldLabel(key)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
              {String(value)}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Workflow simulation note */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ flex: 1, height: 1, bgcolor: alpha('#fff', 0.1) }} />
        <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), fontSize: '0.7rem' }}>
          WORKFLOW TRIGGERED
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: alpha('#fff', 0.1) }} />
      </Box>

      <Button
        size="small"
        onClick={onReset}
        sx={{
          color: alpha('#fff', 0.7),
          textTransform: 'none',
          fontSize: '0.75rem',
          '&:hover': { bgcolor: alpha('#fff', 0.05) },
        }}
      >
        Try another conversation
      </Button>
    </Box>
  );
}

/**
 * Shared conversation state interface
 */
interface ConversationState {
  messages: ChatMessage[];
  extractedData: Record<string, any>;
  isConversationComplete: boolean;
  showDataPanel: boolean;
  isLoading: boolean;
  input: string;
}

/**
 * Interactive chat preview with real AI responses and extraction tracking
 */
function ChatPreview({
  conversationalConfig,
  isComplete,
  fields,
  expanded = false,
  onExpand,
  onClose,
  // Lifted state props
  conversationState,
  onConversationStateChange,
}: {
  conversationalConfig?: ConversationalFormConfig;
  isComplete: boolean;
  fields: FieldConfig[];
  expanded?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
  // Lifted state
  conversationState: ConversationState;
  onConversationStateChange: (updates: Partial<ConversationState>) => void;
}) {
  const { messages, extractedData, isConversationComplete, showDataPanel, isLoading, input } = conversationState;
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const greeting = conversationalConfig?.objective || "Hi! I'll help collect your information.";

  // Focus input when expanded
  React.useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Calculate progress
  const requiredFields = fields.filter(f => f.required);
  const capturedRequiredCount = requiredFields.filter(f => {
    const key = f.path;
    return extractedData[key] || extractedData[key.split('.').pop() || ''] ||
           Object.keys(extractedData).some(k => k.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(k.toLowerCase()));
  }).length;
  const progress = requiredFields.length > 0 ? (capturedRequiredCount / requiredFields.length) * 100 : 0;

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, extractedData]);

  // Reset conversation
  const handleReset = () => {
    onConversationStateChange({
      messages: [],
      extractedData: {},
      isConversationComplete: false,
      showDataPanel: false,
      input: '',
    });
  };

  // Handle edit request - pre-fill input with correction prompt
  const handleEditField = (key: string, currentValue: string) => {
    const fieldLabel = fields.find(f =>
      f.path === key || f.path.includes(key) || key.includes(f.path)
    )?.label || key;
    onConversationStateChange({ input: `Actually, my ${fieldLabel.toLowerCase()} is ` });
  };

  // Helper to update input
  const setInput = (value: string) => {
    onConversationStateChange({ input: value });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isComplete) return;

    const userMessage = input.trim();
    // Update state: clear input, add user message, set loading
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    onConversationStateChange({
      input: '',
      messages: newMessages,
      isLoading: true,
    });

    try {
      // Build config for the demo stream API
      const demoConfig = {
        objective: conversationalConfig?.objective || 'Collect information through conversation',
        extractionSchema: fields.map((f) => ({
          field: f.path,
          type: 'string',
          required: f.required || false,
          description: f.label,
        })),
        topics: fields.slice(0, 8).map((f) => ({
          id: f.path,
          name: f.label,
          description: `Collect ${f.label.toLowerCase()}`,
          priority: f.required ? 'required' : 'optional',
          extractionField: f.path,
        })),
      };

      const response = await fetch('/api/demo/conversational-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          state: {
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: new Date().toISOString(),
            })),
            turnCount: messages.length,
            partialExtractions: extractedData,
          },
          config: demoConfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let assistantMessage = '';
      let currentMessages = [...newMessages, { role: 'assistant' as const, content: '' }];
      let currentExtractedData = { ...extractedData };

      // Add empty assistant message
      onConversationStateChange({ messages: currentMessages });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case 'chunk':
                assistantMessage += event.content;
                currentMessages = [...currentMessages];
                currentMessages[currentMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage,
                };
                onConversationStateChange({ messages: currentMessages });
                break;

              case 'extraction_update':
                if (event.data) {
                  currentExtractedData = { ...currentExtractedData, ...event.data };
                  onConversationStateChange({
                    extractedData: currentExtractedData,
                    showDataPanel: true,
                  });
                }
                break;

              case 'completion_check':
                if (event.shouldComplete) {
                  // Delay showing completion to let user see final message
                  setTimeout(() => {
                    onConversationStateChange({ isConversationComplete: true });
                  }, 1500);
                }
                break;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('[ChatPreview] Error:', error);
      onConversationStateChange({
        messages: [...messages, { role: 'user', content: input.trim() }, { role: 'assistant', content: "I'm having trouble responding right now. Please try again!" }],
      });
    } finally {
      onConversationStateChange({ isLoading: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show completion summary when done
  if (isConversationComplete && Object.keys(extractedData).length > 0) {
    return <CompletionSummary extractedData={extractedData} fields={fields} onReset={handleReset} />;
  }

  return (
    <Box
      sx={{
        bgcolor: alpha('#000', 0.3),
        borderRadius: 2,
        p: 2,
        height: expanded ? '100%' : 320,
        minHeight: expanded ? 400 : 320,
        maxHeight: expanded ? '100%' : 320,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Chat header with progress */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: alpha('#E91E63', 0.2),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesome sx={{ fontSize: 14, color: '#E91E63' }} />
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#fff' }}>
            AI Assistant
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {messages.length > 0 && (
            <Tooltip title={`${capturedRequiredCount}/${requiredFields.length} required fields captured`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontSize: '0.65rem' }}>
                  {Math.round(progress)}%
                </Typography>
                <Box sx={{ width: 40, height: 4, bgcolor: alpha('#fff', 0.1), borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ width: `${progress}%`, height: '100%', bgcolor: '#00ED64', transition: 'width 0.3s ease' }} />
                </Box>
              </Box>
            </Tooltip>
          )}
          {expanded ? (
            <Tooltip title="Close">
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  color: alpha('#fff', 0.6),
                  '&:hover': { color: '#fff', bgcolor: alpha('#fff', 0.1) },
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : onExpand && (
            <Tooltip title="Expand">
              <IconButton
                size="small"
                onClick={onExpand}
                sx={{
                  color: alpha('#fff', 0.6),
                  '&:hover': { color: '#fff', bgcolor: alpha('#fff', 0.1) },
                }}
              >
                <OpenInFull sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Progress bar for field collection */}
      {messages.length > 0 && progress > 0 && progress < 100 && (
        <Collapse in>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              mb: 1,
              height: 2,
              borderRadius: 1,
              bgcolor: alpha('#fff', 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: '#00ED64',
              },
            }}
          />
        </Collapse>
      )}

      {/* Messages area */}
      <Box ref={messagesContainerRef} sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', mb: 1.5, minHeight: 0 }}>
        {/* AI greeting */}
        <Fade in timeout={500}>
          <Box
            sx={{
              bgcolor: alpha('#fff', 0.08),
              borderRadius: 2,
              p: 1.5,
              maxWidth: '90%',
              mb: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.9), lineHeight: 1.5, fontSize: '0.8rem' }}>
              {greeting}
            </Typography>
          </Box>
        </Fade>

        {/* Conversation messages */}
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              mb: 1,
            }}
          >
            <Box
              sx={{
                bgcolor: msg.role === 'user' ? '#00ED64' : alpha('#fff', 0.08),
                color: msg.role === 'user' ? '#001E2B' : alpha('#fff', 0.9),
                borderRadius: 2,
                p: 1.5,
                maxWidth: '85%',
              }}
            >
              <Typography variant="body2" sx={{ lineHeight: 1.4, fontSize: '0.8rem' }}>
                {msg.content || (isLoading && idx === messages.length - 1 ? '...' : '')}
              </Typography>
            </Box>
          </Box>
        ))}

        {/* Show extracted data inline */}
        {showDataPanel && Object.keys(extractedData).length > 0 && (
          <ExtractedDataDisplay extractedData={extractedData} fields={fields} onEdit={handleEditField} />
        )}
      </Box>

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          placeholder={isComplete ? 'Type a message...' : 'Generating...'}
          disabled={!isComplete || isLoading}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: alpha('#fff', 0.05),
              borderRadius: 2,
              '& fieldset': {
                borderColor: alpha('#fff', 0.1),
              },
              '&:hover fieldset': {
                borderColor: alpha('#00ED64', 0.3),
              },
              '&.Mui-focused fieldset': {
                borderColor: '#00ED64',
              },
            },
            '& .MuiInputBase-input': {
              color: '#fff',
              fontSize: '0.8rem',
              py: 1,
              '&::placeholder': {
                color: alpha('#fff', 0.4),
                opacity: 1,
              },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!isComplete || isLoading || !input.trim()}
          sx={{
            bgcolor: isComplete && !isLoading ? '#00ED64' : alpha('#00ED64', 0.3),
            color: '#001E2B',
            '&:hover': { bgcolor: '#00CC55' },
            '&.Mui-disabled': {
              bgcolor: alpha('#00ED64', 0.2),
              color: alpha('#001E2B', 0.5),
            },
          }}
        >
          <Send sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

/**
 * Main LiveFormPreview component
 */
export function LiveFormPreview({
  fields,
  conversationalConfig,
  isGenerating,
  isComplete,
  onSignUp,
}: LiveFormPreviewProps) {
  const [viewMode, setViewMode] = useState<'chat' | 'form'>('chat');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lifted conversation state - shared between inline and modal ChatPreview
  const [conversationState, setConversationState] = useState<ConversationState>({
    messages: [],
    extractedData: {},
    isConversationComplete: false,
    showDataPanel: false,
    isLoading: false,
    input: '',
  });

  // Handler for updating conversation state
  const handleConversationStateChange = (updates: Partial<ConversationState>) => {
    setConversationState(prev => ({ ...prev, ...updates }));
  };

  const requiredFields = fields.filter((f) => f.required);
  const optionalFields = fields.filter((f) => !f.required);

  const handleExpand = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Expanded Modal */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        aria-labelledby="chat-preview-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            width: '90%',
            maxWidth: 600,
            height: '80vh',
            maxHeight: 700,
            bgcolor: '#001E2B',
            borderRadius: 3,
            border: '1px solid',
            borderColor: alpha('#00ED64', 0.3),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            outline: 'none',
          }}
        >
          <ChatPreview
            conversationalConfig={conversationalConfig}
            isComplete={isComplete}
            fields={fields}
            expanded={true}
            onClose={handleCloseModal}
            conversationState={conversationState}
            onConversationStateChange={handleConversationStateChange}
          />
        </Paper>
      </Modal>

      {/* Main Preview Card */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: alpha('#00ED64', 0.3),
          borderRadius: 3,
          bgcolor: alpha('#000', 0.2),
          overflow: 'hidden',
          height: 480,
          minHeight: 480,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
      {/* Header with mode toggle */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: alpha('#fff', 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff' }}>
          Live Preview
        </Typography>

        {/* Mode toggle */}
        <Box
          sx={{
            display: 'flex',
            bgcolor: alpha('#fff', 0.05),
            borderRadius: 1,
            p: 0.5,
          }}
        >
          <Tooltip title="Chat Mode">
            <IconButton
              size="small"
              onClick={() => setViewMode('chat')}
              sx={{
                bgcolor: viewMode === 'chat' ? alpha('#E91E63', 0.2) : 'transparent',
                color: viewMode === 'chat' ? '#E91E63' : 'text.secondary',
                borderRadius: 1,
                '&:hover': { bgcolor: alpha('#E91E63', 0.1) },
              }}
            >
              <ChatBubble sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Form Fields">
            <IconButton
              size="small"
              onClick={() => setViewMode('form')}
              sx={{
                bgcolor: viewMode === 'form' ? alpha('#00ED64', 0.2) : 'transparent',
                color: viewMode === 'form' ? '#00ED64' : 'text.secondary',
                borderRadius: 1,
                '&:hover': { bgcolor: alpha('#00ED64', 0.1) },
              }}
            >
              <Description sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Content area */}
      <Box sx={{ flex: 1, p: 2, overflow: 'hidden', minHeight: 0 }}>
        {viewMode === 'chat' ? (
          <ChatPreview
            conversationalConfig={conversationalConfig}
            isComplete={isComplete}
            fields={fields}
            onExpand={handleExpand}
            conversationState={conversationState}
            onConversationStateChange={handleConversationStateChange}
          />
        ) : (
          <Box>
            {/* Required fields */}
            {requiredFields.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ color: '#00ED64', fontWeight: 600, mb: 1, display: 'block' }}
                >
                  Required
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {requiredFields.map((field, i) => (
                    <FieldBadge
                      key={field.path}
                      field={field}
                      index={i}
                      isGenerating={isGenerating}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Optional fields */}
            {optionalFields.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}
                >
                  Optional
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {optionalFields.map((field, i) => (
                    <FieldBadge
                      key={field.path}
                      field={field}
                      index={i + requiredFields.length}
                      isGenerating={isGenerating}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Empty state */}
            {fields.length === 0 && !isGenerating && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                  color: 'text.secondary',
                }}
              >
                <Description sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                <Typography variant="body2">Fields will appear here</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Footer with CTA */}
      {isComplete && onSignUp && (
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: alpha('#fff', 0.1),
            bgcolor: alpha('#00ED64', 0.05),
          }}
        >
          <Button
            fullWidth
            variant="contained"
            onClick={onSignUp}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: '#00CC55' },
            }}
          >
            Sign up to save this form
          </Button>
        </Box>
      )}

      {/* Generating indicator */}
      {isGenerating && fields.length > 0 && (
        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid',
            borderColor: alpha('#fff', 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#00ED64',
              animation: 'blink 1s ease-in-out infinite',
              '@keyframes blink': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.3 },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {fields.length} field{fields.length !== 1 ? 's' : ''} generated...
          </Typography>
        </Box>
      )}
      </Box>
    </>
  );
}

export default LiveFormPreview;
