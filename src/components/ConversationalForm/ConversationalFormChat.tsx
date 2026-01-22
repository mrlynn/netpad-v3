/**
 * Conversational Form Chat Component
 *
 * A chat-based interface for conversational form submissions.
 * Displays messages, handles input, and shows progress.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  AttachFile,
  Close,
  InsertDriveFile,
  Image as ImageIcon,
  Description,
} from '@mui/icons-material';
import { useConversationalForm, ConversationalMessage } from '@/hooks/useConversationalForm';
import { useFileUpload, UploadedFile } from '@/hooks/useFileUpload';
import { TopicCoverage, ConversationalFormConfig, ConversationState, FileAttachment } from '@/types/conversational';
import { SourceCitation } from './SourceCitation';
import { ALL_ALLOWED_MIME_TYPES } from '@/lib/storage/mimeTypes';

/**
 * Props for ConversationalFormChat
 */
interface ConversationalFormChatProps {
  /** Form ID */
  formId: string;
  /** Form configuration */
  config: ConversationalFormConfig;
  /** Callback when conversation completes - receives full conversation state */
  onComplete?: (conversationState: ConversationState) => void;
  /** Custom styles */
  sx?: object;
  /** API endpoint to use (defaults to authenticated endpoint, use demo for public previews) */
  endpoint?: '/api/conversational/stream' | '/api/demo/conversational-stream';
}

/**
 * Single message bubble
 */
function MessageBubble({
  message,
}: {
  message: ConversationalMessage;
}) {
  const isUser = message.role === 'user';
  const hasSources = !isUser && message.ragSources && message.ragSources.length > 0;
  const hasAttachments = message.attachments && message.attachments.length > 0;

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
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: '#00ED64' }}
            >
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

        {/* File Attachments */}
        {hasAttachments && (
          <Box sx={{ mt: 1 }}>
            {message.attachments!.map((attachment) => (
              <MessageAttachment key={attachment.id} attachment={attachment} />
            ))}
          </Box>
        )}

        {/* RAG Source Citations */}
        {hasSources && !message.isStreaming && (
          <SourceCitation
            sources={message.ragSources!}
            sx={{ mt: 1 }}
          />
        )}

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
    requiredTopics.length > 0
      ? (coveredRequired / requiredTopics.length) * 100
      : 0;

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
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
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
                bgcolor: topic.covered
                  ? alpha('#00ED64', 0.2)
                  : alpha('#000', 0.05),
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
 * Get file icon based on MIME type
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <ImageIcon sx={{ fontSize: 16 }} />;
  }
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) {
    return <Description sx={{ fontSize: 16 }} />;
  }
  return <InsertDriveFile sx={{ fontSize: 16 }} />;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Attachment preview for pending files
 */
function PendingFilePreview({
  file,
  onRemove,
  isUploading,
}: {
  file: UploadedFile;
  onRemove: () => void;
  isUploading: boolean;
}) {
  const isImage = file.mimeType.startsWith('image/');

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        bgcolor: alpha('#000', 0.05),
        borderRadius: 1,
        position: 'relative',
      }}
    >
      {isImage && file.url ? (
        <Box
          component="img"
          src={file.url}
          alt={file.originalName}
          sx={{
            width: 32,
            height: 32,
            objectFit: 'cover',
            borderRadius: 0.5,
          }}
        />
      ) : (
        <Box
          sx={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha('#2196f3', 0.1),
            borderRadius: 0.5,
          }}
        >
          {getFileIcon(file.mimeType)}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {file.originalName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatFileSize(file.size)}
        </Typography>
      </Box>
      {isUploading ? (
        <CircularProgress size={16} />
      ) : (
        <IconButton size="small" onClick={onRemove} sx={{ p: 0.25 }}>
          <Close sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  );
}

/**
 * Attachment display in message bubble
 */
function MessageAttachment({
  attachment,
}: {
  attachment: FileAttachment;
}) {
  const isImage = attachment.mimeType.startsWith('image/');
  const hasExtraction = attachment.extractionStatus === 'completed' && attachment.extractedData;
  const isProcessing = attachment.extractionStatus === 'processing' || attachment.extractionStatus === 'pending';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        mt: 1,
        bgcolor: alpha('#000', 0.1),
        borderRadius: 1,
      }}
    >
      {isImage && attachment.url ? (
        <Box
          component="img"
          src={attachment.url}
          alt={attachment.originalName}
          sx={{
            width: 48,
            height: 48,
            objectFit: 'cover',
            borderRadius: 0.5,
            cursor: 'pointer',
          }}
          onClick={() => window.open(attachment.url, '_blank')}
        />
      ) : (
        <Box
          sx={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha('#fff', 0.2),
            borderRadius: 0.5,
          }}
        >
          {getFileIcon(attachment.mimeType)}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {attachment.originalName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {formatFileSize(attachment.size)}
          </Typography>
          {isProcessing && (
            <>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>•</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={10} sx={{ color: 'inherit' }} />
                Analyzing...
              </Typography>
            </>
          )}
          {hasExtraction && (
            <>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>•</Typography>
              <Tooltip title={`${Object.keys(attachment.extractedData || {}).length} fields extracted`}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <CheckCircle sx={{ fontSize: 12, color: '#00ED64' }} />
                  <Typography variant="caption" sx={{ color: '#00ED64' }}>
                    {Math.round((attachment.extractionConfidence || 0) * 100)}%
                  </Typography>
                </Box>
              </Tooltip>
            </>
          )}
          {attachment.extractionStatus === 'error' && (
            <>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>•</Typography>
              <Tooltip title={attachment.extractionError || 'Extraction failed'}>
                <Warning sx={{ fontSize: 12, color: 'warning.main' }} />
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
    </Box>
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
  const filledFields = schema.filter((s) => data[s.field] !== undefined && data[s.field] !== null && data[s.field] !== '');
  const missingRequired = schema.filter((s) => s.required && (data[s.field] === undefined || data[s.field] === null || data[s.field] === ''));

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
              {filledFields.length} of {schema.length} fields • {Math.round(confidence * 100)}% confidence
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {missingRequired.length > 0 && (
            <Tooltip title={`${missingRequired.length} required field(s) missing`}>
              <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
            </Tooltip>
          )}
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
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
 * Completion confirmation dialog
 */
function CompletionPrompt({
  reason,
  extractedData,
  schema,
  confidence,
  onConfirm,
  onDismiss,
}: {
  reason?: string;
  extractedData: Record<string, any>;
  schema: ConversationalFormConfig['extractionSchema'];
  confidence: number;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const [dataExpanded, setDataExpanded] = useState(true);
  const missingRequired = schema.filter(
    (s) => s.required && (extractedData[s.field] === undefined || extractedData[s.field] === null || extractedData[s.field] === '')
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
            ? `${missingRequired.length} required field(s) still need information. You can continue chatting or submit anyway.`
            : reason || "It looks like we've covered all the important topics."}
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
  formId,
  config,
  onComplete,
  sx,
  endpoint,
}: ConversationalFormChatProps) {
  const [input, setInput] = useState('');
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isStreaming,
    error,
    isComplete,
    completionReason,
    topics,
    confidence,
    turnCount,
    extractedData,
    sendMessage,
    startConversation,
    reset,
    confirmCompletion,
    dismissCompletion,
  } = useConversationalForm({
    formId,
    config,
    onComplete: (state) => {
      // Pass full conversation state for submission with metadata
      onComplete?.(state);
    },
    endpoint,
  });

  // File upload hook - using a placeholder orgId for demo (should come from context in production)
  const {
    upload,
    isUploading,
    error: uploadError,
    validateFile,
  } = useFileUpload({
    organizationId: 'demo', // In production, get from context
    formId,
    fileType: 'any',
    onUploadComplete: (files) => {
      setPendingFiles((prev) => [...prev, ...files]);
    },
    onUploadError: (error) => {
      console.error('[ConversationalFormChat] Upload error:', error);
    },
  });

  // Start conversation on mount
  useEffect(() => {
    startConversation();
  }, [startConversation]);

  // Scroll to bottom on new messages - use scrollTop instead of scrollIntoView
  // to avoid scrolling the entire page
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate files
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        console.warn('[ConversationalFormChat] File validation failed:', validation.error);
      }
    }

    if (validFiles.length > 0) {
      await upload(validFiles);
    }

    // Reset input
    e.target.value = '';
  };

  // Remove pending file
  const handleRemoveFile = (fileId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Handle send
  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isStreaming || isUploading) return;

    const message = input.trim() || (pendingFiles.length > 0 ? '[Attached files]' : '');
    const filesToSend = [...pendingFiles];

    setInput('');
    setPendingFiles([]);

    await sendMessage(message, filesToSend.length > 0 ? filesToSend : undefined);

    // Focus input after sending
    inputRef.current?.focus();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
          <IconButton size="small" onClick={reset}>
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
        ref={messagesContainerRef}
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
        {isComplete && (
          <CompletionPrompt
            reason={completionReason}
            extractedData={extractedData}
            schema={config.extractionSchema}
            confidence={confidence}
            onConfirm={confirmCompletion}
            onDismiss={dismissCompletion}
          />
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
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
        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {pendingFiles.map((file) => (
              <PendingFilePreview
                key={file.id}
                file={file}
                onRemove={() => handleRemoveFile(file.id)}
                isUploading={isUploading}
              />
            ))}
          </Box>
        )}

        {/* Upload error */}
        {uploadError && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => {}}>
            {uploadError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALL_ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Attach file button */}
          <Tooltip title="Attach files (images, PDFs, documents)">
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || isUploading}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {isUploading ? (
                <CircularProgress size={20} />
              ) : (
                <AttachFile />
              )}
            </IconButton>
          </Tooltip>

          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder={pendingFiles.length > 0 ? 'Add a message or send files...' : 'Type your message...'}
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
            disabled={(!input.trim() && pendingFiles.length === 0) || isStreaming || isUploading}
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
