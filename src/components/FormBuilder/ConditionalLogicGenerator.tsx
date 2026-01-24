'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Alert,
  alpha,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  AutoAwesome,
  CheckCircle,
  ContentCopy,
} from '@mui/icons-material';
import { FieldConfig, ConditionalLogic } from '@/types/form';
import { useAIConditionalLogic } from '@/hooks/useAI';

interface ConditionalLogicGeneratorProps {
  availableFields: FieldConfig[];
  onLogicGenerated: (logic: ConditionalLogic) => void;
  defaultAction?: 'show' | 'hide';
}

export function ConditionalLogicGenerator({
  availableFields,
  onLogicGenerated,
  defaultAction = 'show',
}: ConditionalLogicGeneratorProps) {
  const [description, setDescription] = useState('');
  const [action, setAction] = useState<'show' | 'hide'>(defaultAction);

  const {
    data: aiLogic,
    loading,
    error,
    generateConditionalLogic,
    reset,
  } = useAIConditionalLogic();

  const handleGenerate = async () => {
    if (!description.trim()) return;
    await generateConditionalLogic(
      description,
      availableFields.map((f) => ({
        path: f.path,
        label: f.label || f.path,
        type: f.type,
      })),
      action
    );
  };

  const handleApply = () => {
    if (aiLogic?.success && aiLogic.conditionalLogic) {
      onLogicGenerated(aiLogic.conditionalLogic);
      setDescription('');
      reset();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: alpha('#00ED64', 0.03),
        mt: 1,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
        Generate with AI
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        Describe when this field should be {action === 'show' ? 'shown' : 'hidden'}
      </Typography>
      <TextField
        size="small"
        fullWidth
        multiline
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g., Show this field when account type is 'business' and subscription is 'premium'"
        sx={{ mb: 1 }}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="contained"
          startIcon={loading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <AutoAwesome />}
          onClick={handleGenerate}
          disabled={!description.trim() || loading}
          sx={{
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
            },
          }}
        >
          Generate
        </Button>
        <Button
          size="small"
          variant={action === 'show' ? 'contained' : 'outlined'}
          onClick={() => setAction('show')}
          sx={{ fontSize: '0.7rem' }}
        >
          Show
        </Button>
        <Button
          size="small"
          variant={action === 'hide' ? 'contained' : 'outlined'}
          onClick={() => setAction('hide')}
          sx={{ fontSize: '0.7rem' }}
        >
          Hide
        </Button>
        {aiLogic?.success && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CheckCircle />}
            onClick={handleApply}
            sx={{ borderColor: '#00ED64', color: '#00ED64' }}
          >
            Apply
          </Button>
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {aiLogic?.success && aiLogic.conditionalLogic && (
        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: alpha('#00ED64', 0.1), borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Generated Logic:
            </Typography>
            <Chip
              label={`${aiLogic.conditionalLogic.action} when ${aiLogic.conditionalLogic.logicType === 'all' ? 'all' : 'any'} conditions met`}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          </Box>
          {aiLogic.conditionalLogic.conditions.map((condition, idx) => (
            <Box key={idx} sx={{ mb: 0.5 }}>
              <Chip
                label={`${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  height: 20,
                  bgcolor: 'background.paper',
                }}
              />
            </Box>
          ))}
          {aiLogic.explanation && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {aiLogic.explanation}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}

