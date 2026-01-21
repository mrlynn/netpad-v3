'use client';

import {
  Box,
  Paper,
  Typography,
  alpha,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  SmartToy,
  Person,
  ExpandMore,
  ExpandLess,
  Chat,
  CheckCircle,
  Timer,
  Topic,
} from '@mui/icons-material';
import { useState } from 'react';
import { format } from 'date-fns';
import { ConversationalSubmissionData } from '@/types/platform';

interface ConversationTranscriptViewerProps {
  conversationalData: ConversationalSubmissionData;
  /** Whether to show the transcript expanded by default */
  defaultExpanded?: boolean;
}

/**
 * Component to display conversation transcript from a conversational form submission
 */
export function ConversationTranscriptViewer({
  conversationalData,
  defaultExpanded = false,
}: ConversationTranscriptViewerProps) {
  const [transcriptExpanded, setTranscriptExpanded] = useState(defaultExpanded);
  const [topicsExpanded, setTopicsExpanded] = useState(false);

  const {
    conversationId,
    transcript,
    topicsCovered,
    overallConfidence,
    turnCount,
    durationSeconds,
    startedAt,
    completedAt,
  } = conversationalData;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: alpha('#9C27B0', 0.05),
        border: '1px solid',
        borderColor: alpha('#9C27B0', 0.2),
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Chat sx={{ color: '#9C27B0', fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Conversational Submission
        </Typography>
        <Chip
          label="AI Chat"
          size="small"
          sx={{
            bgcolor: alpha('#9C27B0', 0.15),
            color: '#9C27B0',
            fontWeight: 500,
          }}
        />
      </Box>

      {/* Conversation Stats */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
          '& > *': {
            minWidth: 120,
          },
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            Turns
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            {turnCount}
          </Typography>
        </Box>

        {durationSeconds !== undefined && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatDuration(durationSeconds)}
            </Typography>
          </Box>
        )}

        <Box>
          <Typography variant="caption" color="text.secondary">
            Confidence
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={overallConfidence * 100}
              sx={{
                width: 60,
                height: 6,
                borderRadius: 3,
                bgcolor: alpha('#9C27B0', 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#9C27B0',
                  borderRadius: 3,
                },
              }}
            />
            <Typography variant="body2" fontWeight={500}>
              {Math.round(overallConfidence * 100)}%
            </Typography>
          </Box>
        </Box>

        {startedAt && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Started
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {format(new Date(startedAt), 'HH:mm:ss')}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Topics Coverage */}
      {topicsCovered && topicsCovered.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box
            onClick={() => setTopicsExpanded(!topicsExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              py: 1,
              '&:hover': {
                bgcolor: alpha('#9C27B0', 0.05),
              },
              borderRadius: 1,
            }}
          >
            <Topic sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              Topics Covered ({topicsCovered.filter(t => t.covered).length}/{topicsCovered.length})
            </Typography>
            <IconButton size="small">
              {topicsExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={topicsExpanded}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, ml: 3 }}>
              {topicsCovered.map((topic) => (
                <Tooltip
                  key={topic.topicId}
                  title={`Depth: ${Math.round(topic.depth * 100)}%`}
                >
                  <Chip
                    size="small"
                    icon={topic.covered ? <CheckCircle sx={{ fontSize: 14 }} /> : undefined}
                    label={topic.name}
                    sx={{
                      bgcolor: topic.covered
                        ? alpha('#4CAF50', 0.15)
                        : alpha('#9E9E9E', 0.15),
                      color: topic.covered ? '#4CAF50' : '#9E9E9E',
                      '& .MuiChip-icon': {
                        color: '#4CAF50',
                      },
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Transcript */}
      {transcript && transcript.length > 0 && (
        <Box>
          <Box
            onClick={() => setTranscriptExpanded(!transcriptExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              py: 1,
              '&:hover': {
                bgcolor: alpha('#9C27B0', 0.05),
              },
              borderRadius: 1,
            }}
          >
            <Chat sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              Conversation Transcript ({transcript.length} messages)
            </Typography>
            <IconButton size="small">
              {transcriptExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={transcriptExpanded}>
            <Box
              sx={{
                mt: 1,
                maxHeight: 400,
                overflowY: 'auto',
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {transcript.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    p: 1.5,
                    borderBottom: index < transcript.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    bgcolor:
                      message.role === 'assistant'
                        ? alpha('#9C27B0', 0.03)
                        : message.role === 'system'
                        ? alpha('#FF9800', 0.03)
                        : 'transparent',
                  }}
                >
                  {/* Avatar */}
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      bgcolor:
                        message.role === 'assistant'
                          ? alpha('#9C27B0', 0.15)
                          : message.role === 'system'
                          ? alpha('#FF9800', 0.15)
                          : alpha('#2196F3', 0.15),
                    }}
                  >
                    {message.role === 'assistant' ? (
                      <SmartToy sx={{ fontSize: 16, color: '#9C27B0' }} />
                    ) : message.role === 'system' ? (
                      <Timer sx={{ fontSize: 16, color: '#FF9800' }} />
                    ) : (
                      <Person sx={{ fontSize: 16, color: '#2196F3' }} />
                    )}
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{
                          color:
                            message.role === 'assistant'
                              ? '#9C27B0'
                              : message.role === 'system'
                              ? '#FF9800'
                              : '#2196F3',
                        }}
                      >
                        {message.role === 'assistant'
                          ? 'Assistant'
                          : message.role === 'system'
                          ? 'System'
                          : 'User'}
                      </Typography>
                      {message.timestamp && (
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(message.timestamp), 'HH:mm:ss')}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.content}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Conversation ID (for debugging/reference) */}
      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Conversation ID: {conversationId}
        </Typography>
      </Box>
    </Paper>
  );
}

export default ConversationTranscriptViewer;
