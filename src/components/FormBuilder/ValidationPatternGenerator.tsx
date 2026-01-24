'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Menu,
  MenuItem,
  Chip,
  Typography,
  Paper,
  Alert,
  alpha,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  AutoAwesome,
  CheckCircle,
  ExpandMore,
  ContentCopy,
} from '@mui/icons-material';
import { FieldConfig } from '@/types/form';
import { useAIValidation } from '@/hooks/useAI';
import { COMMON_PATTERNS } from '@/lib/ai/validationGenerator';

interface ValidationPatternGeneratorProps {
  field: FieldConfig;
  onPatternGenerated: (pattern: string) => void;
}

export function ValidationPatternGenerator({
  field,
  onPatternGenerated,
}: ValidationPatternGeneratorProps) {
  const [patternMenuOpen, setPatternMenuOpen] = useState(false);
  const [patternMenuAnchor, setPatternMenuAnchor] = useState<null | HTMLElement>(null);
  const [aiDescription, setAiDescription] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [commonPatterns, setCommonPatterns] = useState<typeof COMMON_PATTERNS | null>(null);

  const {
    data: aiValidation,
    loading: aiLoading,
    error: aiError,
    generateValidation,
    reset: resetAI,
  } = useAIValidation();

  // Fetch common patterns on mount
  useEffect(() => {
    fetch('/api/ai/generate-validation')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.patterns) {
          setCommonPatterns(data.patterns);
        }
      })
      .catch(console.error);
  }, []);

  const handleCommonPatternSelect = (patternKey: string) => {
    if (commonPatterns && patternKey in commonPatterns) {
      const pattern = commonPatterns[patternKey as keyof typeof COMMON_PATTERNS];
      onPatternGenerated(pattern.pattern);
      setPatternMenuOpen(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) return;
    await generateValidation(
      {
        path: field.path,
        label: field.label || field.path,
        type: field.type,
      },
      aiDescription
    );
  };

  const handleApplyAIPattern = () => {
    if (aiValidation?.success && aiValidation.pattern) {
      onPatternGenerated(aiValidation.pattern);
      setAiDescription('');
      setShowAIGenerator(false);
      resetAI();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ExpandMore />}
          onClick={(e) => {
            setPatternMenuAnchor(e.currentTarget);
            setPatternMenuOpen(true);
          }}
          sx={{ fontSize: '0.75rem' }}
        >
          Common Patterns
        </Button>
        <Button
          size="small"
          variant={showAIGenerator ? 'contained' : 'outlined'}
          startIcon={<AutoAwesome />}
          onClick={() => {
            setShowAIGenerator(!showAIGenerator);
            if (showAIGenerator) {
              resetAI();
              setAiDescription('');
            }
          }}
          sx={{
            fontSize: '0.75rem',
            ...(showAIGenerator && {
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
            }),
          }}
        >
          AI Generate
        </Button>
      </Box>

      {/* Common Patterns Menu */}
      <Menu
        anchorEl={patternMenuAnchor}
        open={patternMenuOpen}
        onClose={() => setPatternMenuOpen(false)}
        PaperProps={{
          sx: { maxHeight: 400, width: 350, maxWidth: '90vw' },
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
            Select a Pattern
          </Typography>
        </Box>
        <Divider />
        {commonPatterns ? (
          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {Object.entries(commonPatterns).map(([key, pattern]) => (
              <ListItem
                key={key}
                button
                onClick={() => handleCommonPatternSelect(key)}
                sx={{
                  '&:hover': {
                    bgcolor: alpha('#00ED64', 0.1),
                  },
                }}
              >
                <ListItemText
                  primary={pattern.description}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={pattern.pattern}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontFamily: 'monospace',
                          bgcolor: alpha('#00ED64', 0.1),
                        }}
                      />
                      {pattern.example && (
                        <Typography variant="caption" color="text.secondary">
                          e.g., {pattern.example}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <NetPadLoader size="small" variant="svg" showPhrases={false} />
          </Box>
        )}
      </Menu>

      {/* AI Generator */}
      {showAIGenerator && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: alpha('#00ED64', 0.03),
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
            Describe the validation rule
          </Typography>
          <TextField
            size="small"
            fullWidth
            multiline
            rows={2}
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            placeholder="e.g., US phone number with area code, or email address format"
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              variant="contained"
              startIcon={aiLoading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <AutoAwesome />}
              onClick={handleAIGenerate}
              disabled={!aiDescription.trim() || aiLoading}
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                },
              }}
            >
              Generate
            </Button>
            {aiValidation?.success && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<CheckCircle />}
                onClick={handleApplyAIPattern}
                sx={{ borderColor: '#00ED64', color: '#00ED64' }}
              >
                Apply Pattern
              </Button>
            )}
          </Box>
          {aiError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {aiError}
            </Alert>
          )}
          {aiValidation?.success && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: alpha('#00ED64', 0.1), borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Generated Pattern:
                </Typography>
                <Tooltip title="Copy pattern">
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(aiValidation.pattern || '');
                    }}
                  >
                    <ContentCopy sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Chip
                label={aiValidation.pattern}
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  height: 24,
                  bgcolor: 'background.paper',
                }}
              />
              {aiValidation.errorMessage && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Error message: {aiValidation.errorMessage}
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}

