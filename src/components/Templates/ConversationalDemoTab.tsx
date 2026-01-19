/**
 * Conversational Demo Tab Component
 *
 * Demonstrates NetPad's AI-powered conversational form capabilities
 * within the template preview dialog. Converts the template's field
 * configuration into a conversational experience.
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  Button,
  alpha,
  useTheme,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  AutoAwesome,
  ExpandMore,
  ExpandLess,
  Refresh,
  Psychology,
  Chat,
  DataObject,
} from '@mui/icons-material';
import { FormTemplate } from '@/types/formTemplate';
import { ConversationalFormChat } from '@/components/ConversationalForm/ConversationalFormChat';
import { templateToDemoConversationalConfig } from '@/lib/templates/templateToConversationalConfig';
import { ConversationState } from '@/types/conversational';

interface ConversationalDemoTabProps {
  template: FormTemplate;
}

/**
 * Conversational Demo Tab
 *
 * Shows an interactive AI chat interface that collects form data
 * through natural conversation instead of traditional form fields.
 */
export function ConversationalDemoTab({ template }: ConversationalDemoTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [key, setKey] = useState(0); // Used to reset conversation
  const [showExtracted, setShowExtracted] = useState(false);
  const [completedState, setCompletedState] = useState<ConversationState | null>(null);

  // Generate conversational config from template
  const conversationalConfig = useMemo(
    () => templateToDemoConversationalConfig(template),
    [template]
  );

  // Handle conversation completion
  const handleComplete = (state: ConversationState) => {
    setCompletedState(state);
    setShowExtracted(true);
  };

  // Reset conversation
  const handleReset = () => {
    setKey((prev) => prev + 1);
    setCompletedState(null);
    setShowExtracted(false);
  };

  // Count fields for display
  const fieldCount = template.fieldConfigs.filter(
    (f) =>
      f.included &&
      !['sectionHeader', 'section-header', 'divider', 'spacer', 'description'].includes(
        f.type
      )
  ).length;

  const requiredCount = template.fieldConfigs.filter(
    (f) => f.included && f.required
  ).length;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: '1px solid',
          borderColor: isDark ? 'rgba(0, 237, 100, 0.3)' : 'rgba(0, 237, 100, 0.2)',
          borderRadius: 2,
          bgcolor: isDark ? 'rgba(0, 30, 43, 0.6)' : 'rgba(0, 237, 100, 0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: alpha('#00ED64', 0.1),
              color: '#00ED64',
            }}
          >
            <AutoAwesome />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              AI Conversational Mode
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Experience how NetPad transforms traditional forms into natural conversations.
              The AI will guide you through collecting all {fieldCount} fields
              ({requiredCount} required) via chat.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<Psychology sx={{ fontSize: 16 }} />}
                label="AI-Powered"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiChip-icon': { color: theme.palette.primary.main },
                }}
              />
              <Chip
                icon={<Chat sx={{ fontSize: 16 }} />}
                label="Natural Language"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  '& .MuiChip-icon': { color: theme.palette.info.main },
                }}
              />
              <Chip
                icon={<DataObject sx={{ fontSize: 16 }} />}
                label="Auto-Extract Data"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  '& .MuiChip-icon': { color: theme.palette.success.main },
                }}
              />
            </Box>
          </Box>
          <Button
            startIcon={<Refresh />}
            onClick={handleReset}
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
              },
            }}
          >
            Restart
          </Button>
        </Box>
      </Paper>

      {/* Demo Notice */}
      <Alert
        severity="info"
        sx={{
          mb: 2,
          '& .MuiAlert-icon': { color: '#00ED64' },
          bgcolor: isDark ? 'rgba(0, 237, 100, 0.05)' : 'rgba(0, 237, 100, 0.08)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(0, 237, 100, 0.2)' : 'rgba(0, 237, 100, 0.15)',
        }}
      >
        <Typography variant="body2">
          <strong>Demo Mode:</strong> This is a live preview of conversational form filling.
          Chat naturally with the AI to provide your information - it will extract and
          structure data automatically. No data is saved.
        </Typography>
      </Alert>

      {/* Extracted Data (shown after completion) */}
      {completedState && (
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            border: '1px solid',
            borderColor: 'success.main',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: alpha(theme.palette.success.main, 0.05),
              cursor: 'pointer',
            }}
            onClick={() => setShowExtracted(!showExtracted)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DataObject sx={{ color: 'success.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Extracted Data
              </Typography>
              <Chip
                label={`${Math.round(completedState.confidence * 100)}% confidence`}
                size="small"
                color="success"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            <IconButton size="small">
              {showExtracted ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          <Collapse in={showExtracted}>
            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(completedState.partialExtractions, null, 2)}
              </pre>
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Chat Interface */}
      <Box
        sx={{
          flex: 1,
          minHeight: 400,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ConversationalFormChat
          key={key}
          formId={`demo-${template.id}`}
          config={conversationalConfig}
          onComplete={handleComplete}
          endpoint="/api/demo/conversational-stream"
          sx={{
            flex: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        />
      </Box>

      {/* Footer note */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'block',
          mt: 2,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Conversational forms use AI to extract structured data from natural language.
        Perfect for complex forms, user interviews, and guided data collection.
      </Typography>
    </Box>
  );
}

export default ConversationalDemoTab;
