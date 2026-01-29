/**
 * FAQs List Component
 *
 * Displays and manages FAQs for a form with hybrid search capabilities.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Alert,
  Typography,
  alpha,
  Paper,
  Menu,
  MenuItem,
  Divider,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Delete,
  Edit,
  QuestionAnswer,
  MoreVert,
  Visibility,
  ThumbUp,
  ThumbDown,
  Search,
  FilterList,
} from '@mui/icons-material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { RAGFAQ, FAQStatus, FAQCategory } from '@/types/rag-faq';
import { formatDate } from '@/lib/utils';

export interface FAQsListProps {
  formId?: string;
  organizationId: string;
  onFAQDeleted?: () => void;
  onFAQEdit?: (faqId: string) => void;
  onFAQUpdated?: () => void;
  refreshTrigger?: number;
}

const STATUS_CONFIG: Record<FAQStatus, {
  color: 'success' | 'warning' | 'default';
  label: string;
}> = {
  published: {
    color: 'success',
    label: 'Published',
  },
  draft: {
    color: 'warning',
    label: 'Draft',
  },
  archived: {
    color: 'default',
    label: 'Archived',
  },
};

const CATEGORY_COLORS: Record<FAQCategory, string> = {
  general: '#1976d2',
  'getting-started': '#0288d1',
  technical: '#9c27b0',
  billing: '#2e7d32',
  support: '#f57c00',
  troubleshooting: '#d32f2f',
  features: '#ed6c02',
  integration: '#5e35b1',
  security: '#c62828',
  compliance: '#6a1b9a',
  other: '#616161',
};

export function FAQsList({
  formId,
  organizationId,
  onFAQDeleted,
  onFAQEdit,
  onFAQUpdated,
  refreshTrigger,
}: FAQsListProps) {
  const [faqs, setFaqs] = useState<RAGFAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | 'all'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFaq, setSelectedFaq] = useState<string | null>(null);

  useEffect(() => {
    loadFAQs();
  }, [formId, organizationId, refreshTrigger]);

  const loadFAQs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        organizationId,
        limit: '100',
        offset: '0',
      });

      if (formId) {
        params.append('formId', formId);
      }

      const response = await fetch(`/api/rag/faqs?${params}`);

      if (!response.ok) {
        throw new Error('Failed to load FAQs');
      }

      const data = await response.json();
      setFaqs(data.faqs || []);
    } catch (err) {
      console.error('[FAQs] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (faqId: string) => {
    if (!confirm('Delete this FAQ? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/rag/faqs/${faqId}?organizationId=${organizationId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      await loadFAQs();
      onFAQDeleted?.();
      handleCloseMenu();
    } catch (err) {
      console.error('[FAQs] Delete error:', err);
      alert('Failed to delete FAQ. Please try again.');
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, faqId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedFaq(faqId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedFaq(null);
  };

  const handleEdit = () => {
    if (selectedFaq) {
      onFAQEdit?.(selectedFaq);
    }
    handleCloseMenu();
  };

  // Filter FAQs
  const filteredFaqs = faqs.filter((faq) => {
    // Category filter
    if (selectedCategory !== 'all' && faq.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.keywords.some((k) => k.toLowerCase().includes(query))
      );
    }

    return true;
  });

  if (loading && faqs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <NetPadLoader />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const publishedCount = faqs.filter((f) => f.status === 'published').length;
  const draftCount = faqs.filter((f) => f.status === 'draft').length;

  return (
    <Box>
      {/* Search and filters */}
      <Box sx={{ px: 2, py: 2, display: 'flex', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search FAQs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as FAQCategory | 'all')}
          sx={{ minWidth: 150 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterList />
              </InputAdornment>
            ),
          }}
        >
          <MenuItem value="all">All Categories</MenuItem>
          <MenuItem value="general">General</MenuItem>
          <MenuItem value="technical">Technical</MenuItem>
          <MenuItem value="billing">Billing</MenuItem>
          <MenuItem value="features">Features</MenuItem>
          <MenuItem value="troubleshooting">Troubleshooting</MenuItem>
        </TextField>
      </Box>

      {faqs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <QuestionAnswer sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No FAQs Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create structured question-answer pairs for quick AI retrieval and user reference.
          </Typography>
        </Box>
      ) : filteredFaqs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No FAQs match your filters.
          </Typography>
        </Box>
      ) : (
        <List sx={{ px: 2 }}>
          {filteredFaqs.map((faq) => {
            const statusConfig = STATUS_CONFIG[faq.status];

            return (
              <Paper
                key={faq.faqId}
                elevation={0}
                sx={{
                  mb: 1,
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.02),
                  },
                }}
              >
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <QuestionAnswer fontSize="small" color="action" sx={{ mt: 0.5 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight={500}>
                            {faq.question}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={faq.category}
                              size="small"
                              sx={{
                                backgroundColor: CATEGORY_COLORS[faq.category],
                                color: 'white',
                                fontSize: '0.7rem',
                              }}
                            />
                            <Chip
                              label={statusConfig.label}
                              size="small"
                              color={statusConfig.color}
                              variant="outlined"
                            />
                            {faq.priority > 0 && (
                              <Chip
                                label={`Priority: ${faq.priority}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {faq.answer}
                        </Typography>
                        {faq.keywords.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                            {faq.keywords.slice(0, 5).map((keyword, idx) => (
                              <Chip
                                key={idx}
                                label={keyword}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            ))}
                            {faq.keywords.length > 5 && (
                              <Typography variant="caption" color="text.disabled" sx={{ alignSelf: 'center' }}>
                                +{faq.keywords.length - 5} more
                              </Typography>
                            )}
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Tooltip title="Views">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Visibility fontSize="small" sx={{ fontSize: 14 }} />
                              <Typography variant="caption" color="text.secondary">
                                {faq.viewCount || 0}
                              </Typography>
                            </Box>
                          </Tooltip>
                          <Tooltip title="Helpful">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ThumbUp fontSize="small" sx={{ fontSize: 14 }} />
                              <Typography variant="caption" color="text.secondary">
                                {faq.helpfulCount || 0}
                              </Typography>
                            </Box>
                          </Tooltip>
                          <Tooltip title="Not Helpful">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ThumbDown fontSize="small" sx={{ fontSize: 14 }} />
                              <Typography variant="caption" color="text.secondary">
                                {faq.notHelpfulCount || 0}
                              </Typography>
                            </Box>
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary">
                            Updated {formatDate(faq.updatedAt)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => handleOpenMenu(e, faq.faqId)}
                      size="small"
                    >
                      <MoreVert />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            );
          })}
        </List>
      )}

      {/* Stats footer */}
      <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <Typography variant="body2" color="text.secondary">
          {publishedCount} published, {draftCount} drafts • Showing {filteredFaqs.length} of {faqs.length}
        </Typography>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit FAQ
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => selectedFaq && handleDelete(selectedFaq)} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete FAQ
        </MenuItem>
      </Menu>
    </Box>
  );
}
