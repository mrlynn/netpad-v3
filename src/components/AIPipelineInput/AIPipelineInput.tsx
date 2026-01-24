'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  alpha,
  Fade,
  Chip
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Send, AutoAwesome, X } from '@mui/icons-material';
import { usePipeline } from '@/contexts/PipelineContext';
import { SerializedStage } from '@/lib/pipelineSerializer';
import { AIPipelinePreview } from '@/components/AIPipelinePreview/AIPipelinePreview';
import { HelpButton } from '@/components/Help/HelpButton';

interface AIPipelineInputProps {
  onPipelineGenerated?: (stages: SerializedStage[], explanation?: string) => void;
}

export function AIPipelineInput({ onPipelineGenerated }: AIPipelineInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewStages, setPreviewStages] = useState<SerializedStage[] | null>(null);
  const [previewExplanation, setPreviewExplanation] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const { collection } = usePipeline();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          collectionName: collection || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate pipeline');
      }

      const data = await response.json();
      
      if (data.stages && Array.isArray(data.stages)) {
        // Show preview instead of immediately applying
        setPreviewStages(data.stages);
        setPreviewExplanation(data.explanation);
        setQuery('');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate pipeline');
      console.error('Error generating pipeline:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <>
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            pointerEvents: 'auto',
            maxWidth: 'fit-content'
          }}
        >
          <Paper
            elevation={8}
            sx={{
              px: 2,
              py: 1.5,
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${alpha('#00ED64', 0.15)} 0%, ${alpha('#4DFF9F', 0.1)} 100%)`,
              border: `1px solid ${alpha('#00ED64', 0.3)}`,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: `linear-gradient(135deg, ${alpha('#00ED64', 0.25)} 0%, ${alpha('#4DFF9F', 0.15)} 100%)`,
                borderColor: alpha('#00ED64', 0.5),
                transform: 'translateX(-50%) translateY(-2px)',
                boxShadow: `0 8px 24px ${alpha('#00ED64', 0.3)}`
              }
            }}
            onClick={() => setIsOpen(true)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesome sx={{ color: '#00ED64', fontSize: 20 }} />
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Build pipeline with AI
              </Typography>
            </Box>
          </Paper>
        </Box>
        <AIPipelinePreview
          open={!!previewStages}
          stages={previewStages || []}
          explanation={previewExplanation}
          onApprove={() => {
            if (previewStages && onPipelineGenerated) {
              onPipelineGenerated(previewStages, previewExplanation);
            }
            setPreviewStages(null);
            setPreviewExplanation(undefined);
            setIsOpen(false);
          }}
          onCancel={() => {
            setPreviewStages(null);
            setPreviewExplanation(undefined);
          }}
        />
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          width: '90%',
          maxWidth: 600,
          pointerEvents: 'auto'
        }}
      >
        <Paper
          elevation={12}
          sx={{
            p: 2,
            background: `linear-gradient(135deg, ${alpha('#141920', 0.95)} 0%, ${alpha('#0a0e14', 0.98)} 100%)`,
            border: `1px solid ${alpha('#00ED64', 0.3)}`,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 12px 48px ${alpha('#000', 0.5)}, 0 0 0 1px ${alpha('#00ED64', 0.1)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoAwesome sx={{ color: '#00ED64', fontSize: 24 }} />
            <Typography
              variant="h6"
              sx={{
                flex: 1,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              AI Pipeline Builder
            </Typography>
            <HelpButton topicId="ai-pipeline-generation" tooltip="AI Pipeline Generation Help" />
            <IconButton
              size="small"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
                setError(null);
              }}
              sx={{ color: 'text.secondary' }}
            >
              <X />
            </IconButton>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe the aggregation pipeline you want to build...&#10;Example: 'Group orders by status and count them, then sort by count descending'"
              disabled={isGenerating}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: alpha('#141920', 0.5),
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha('#00ED64', 0.5)
                    }
                  },
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#00ED64',
                      borderWidth: 2
                    }
                  }
                }
              }}
            />

            {error && (
              <Chip
                label={error}
                color="error"
                size="small"
                sx={{ mb: 2, width: '100%', justifyContent: 'flex-start' }}
              />
            )}

            {collection && (
              <Chip
                label={`Collection: ${collection}`}
                size="small"
                sx={{ mb: 2, mr: 1 }}
              />
            )}

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <IconButton
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                  setError(null);
                }}
                disabled={isGenerating}
                sx={{ color: 'text.secondary' }}
              >
                <X />
              </IconButton>
              <IconButton
                type="submit"
                disabled={!query.trim() || isGenerating}
                sx={{
                  bgcolor: alpha('#00ED64', 0.15),
                  color: '#00ED64',
                  '&:hover': {
                    bgcolor: alpha('#00ED64', 0.25)
                  },
                  '&:disabled': {
                    bgcolor: alpha('#00ED64', 0.05),
                    color: alpha('#00ED64', 0.3)
                  }
                }}
              >
                {isGenerating ? (
                  <NetPadLoader size="small" variant="svg" showPhrases={false} />
                ) : (
                  <Send />
                )}
              </IconButton>
            </Box>
          </form>
        </Paper>
      </Box>

      <AIPipelinePreview
        open={!!previewStages}
        stages={previewStages || []}
        explanation={previewExplanation}
        onApprove={() => {
          if (previewStages && onPipelineGenerated) {
            onPipelineGenerated(previewStages, previewExplanation);
          }
          setPreviewStages(null);
          setPreviewExplanation(undefined);
          setIsOpen(false);
        }}
        onCancel={() => {
          setPreviewStages(null);
          setPreviewExplanation(undefined);
        }}
      />
    </>
  );
}

