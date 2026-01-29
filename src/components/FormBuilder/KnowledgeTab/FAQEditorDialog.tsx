/**
 * FAQ Editor Dialog
 *
 * Dialog for creating and editing FAQs with hybrid search support.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Typography,
  LinearProgress,
  Chip,
  Autocomplete,
  Slider,
  FormLabel,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import {
  Save,
  Close,
} from '@mui/icons-material';
import { FAQCategory, FAQStatus, RAGFAQ } from '@/types/rag-faq';

export interface FAQEditorDialogProps {
  open: boolean;
  onClose: () => void;
  formId?: string;
  organizationId: string;
  faqId?: string; // If editing existing FAQ
  onSaved: () => void;
}

export function FAQEditorDialog({
  open,
  onClose,
  formId,
  organizationId,
  faqId,
  onSaved,
}: FAQEditorDialogProps) {
  // Form state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [category, setCategory] = useState<FAQCategory>('general');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<FAQStatus>('draft');
  const [priority, setPriority] = useState(0);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing FAQ if editing
  useEffect(() => {
    if (open && faqId) {
      loadFAQ();
    } else if (open && !faqId) {
      // Reset form for new FAQ
      resetForm();
    }
  }, [open, faqId]);

  const loadFAQ = async () => {
    if (!faqId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/rag/faqs/${faqId}?organizationId=${organizationId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load FAQ');
      }

      const data = await response.json();
      const faq: RAGFAQ = data.faq;

      setQuestion(faq.question);
      setAnswer(faq.answer);
      setKeywords(faq.keywords || []);
      setCategory(faq.category);
      setTags(faq.tags || []);
      setStatus(faq.status);
      setPriority(faq.priority || 0);
    } catch (err) {
      console.error('[FAQ] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load FAQ');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setKeywords([]);
    setCategory('general');
    setTags([]);
    setStatus('draft');
    setPriority(0);
    setError(null);
  };

  const handleSave = async () => {
    // Validation
    if (!question.trim()) {
      setError('Question is required');
      return;
    }
    if (!answer.trim()) {
      setError('Answer is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        organizationId,
        formId,
        question: question.trim(),
        answer: answer.trim(),
        keywords,
        category,
        tags,
        status,
        priority,
      };

      const url = faqId
        ? `/api/rag/faqs/${faqId}`
        : '/api/rag/faqs';

      const method = faqId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save FAQ');
      }

      // Success
      onSaved();
      handleClose();
    } catch (err) {
      console.error('[FAQ] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save FAQ. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{faqId ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
              Loading FAQ...
            </Typography>
            <LinearProgress sx={{ mt: 2 }} />
          </Box>
        ) : saving ? (
          <Box sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
              Saving FAQ and generating embeddings...
            </Typography>
            <LinearProgress sx={{ mt: 2 }} />
            <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 2 }}>
              This will appear in AI Dashboard at /admin/api-metrics
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {/* Question */}
            <TextField
              label="Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              fullWidth
              required
              multiline
              rows={2}
              helperText="The question users might ask (will be embedded for vector search)"
              autoFocus
            />

            {/* Answer */}
            <TextField
              label="Answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              fullWidth
              required
              multiline
              rows={4}
              helperText="The answer to provide (supports markdown)"
            />

            {/* Keywords */}
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={keywords}
              onChange={(_, newValue) => setKeywords(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Keywords"
                  helperText="Keywords for better keyword matching (press Enter to add)"
                />
              )}
            />

            {/* Category and Status */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FAQCategory)}
                  label="Category"
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="technical">Technical</MenuItem>
                  <MenuItem value="billing">Billing</MenuItem>
                  <MenuItem value="features">Features</MenuItem>
                  <MenuItem value="troubleshooting">Troubleshooting</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FAQStatus)}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Tags */}
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={tags}
              onChange={(_, newValue) => setTags(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    size="small"
                    variant="outlined"
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags (Optional)"
                  helperText="Organizational tags (press Enter to add)"
                />
              )}
            />

            {/* Priority */}
            <Box>
              <FormLabel component="legend">Priority</FormLabel>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Higher priority FAQs appear first when scores are equal
              </Typography>
              <Slider
                value={priority}
                onChange={(_, value) => setPriority(value as number)}
                min={0}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                sx={{ mt: 1 }}
              />
            </Box>

            {/* Scope */}
            <Box>
              <FormLabel component="legend">Scope</FormLabel>
              <RadioGroup
                value={formId ? 'form' : 'org'}
                onChange={(e) => {
                  // Note: This is informational only - formId comes from props
                }}
              >
                <FormControlLabel
                  value="org"
                  control={<Radio />}
                  label="Organization-wide (available to all forms)"
                  disabled={Boolean(formId)}
                />
                <FormControlLabel
                  value="form"
                  control={<Radio />}
                  label={formId ? `Form-specific (this form only)` : 'Form-specific'}
                  disabled={!formId}
                />
              </RadioGroup>
              {!formId && (
                <Typography variant="caption" color="text.secondary">
                  This FAQ will be available organization-wide
                </Typography>
              )}
            </Box>

            {/* Info */}
            <Alert severity="info" variant="outlined">
              <Typography variant="caption" component="div">
                <strong>Hybrid Search:</strong> FAQs use both vector similarity (70%) and keyword matching (30%) for optimal retrieval.
              </Typography>
              <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                <strong>Analytics:</strong> Question embeddings are tracked in AI Dashboard for cost monitoring.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving || loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || loading || !question.trim() || !answer.trim()}
          startIcon={<Save />}
        >
          {faqId ? 'Update' : 'Create'} FAQ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
