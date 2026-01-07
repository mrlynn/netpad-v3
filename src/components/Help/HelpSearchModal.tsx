'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
  alpha,
  Divider,
  Paper,
} from '@mui/material';
import {
  Search,
  Help,
  Description,
  Widgets,
  Storage,
  KeyboardReturn,
  KeyboardCommandKey,
  PlayCircleOutline,
} from '@mui/icons-material';
import { HelpTopic, HelpTopicId } from '@/types/help';
import { helpTopics } from '@/lib/helpContent';

interface HelpSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTopic: (topicId: HelpTopicId) => void;
  onStartTour?: () => void;
}

// Category icons and labels
const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  'form': { icon: <Description fontSize="small" />, label: 'Form Builder', color: '#00ED64' },
  'pipeline': { icon: <Widgets fontSize="small" />, label: 'Pipeline', color: '#2196f3' },
  'mongodb': { icon: <Storage fontSize="small" />, label: 'MongoDB', color: '#13AA52' },
  'aggregation': { icon: <Widgets fontSize="small" />, label: 'Pipeline', color: '#2196f3' },
  'conversational': { icon: <Description fontSize="small" />, label: 'Conversational', color: '#9c27b0' },
  'template': { icon: <Description fontSize="small" />, label: 'Templates', color: '#ff9800' },
  'project': { icon: <Widgets fontSize="small" />, label: 'Projects', color: '#673ab7' },
  'deploy': { icon: <PlayCircleOutline fontSize="small" />, label: 'Deployment', color: '#e91e63' },
  'organization': { icon: <Storage fontSize="small" />, label: 'Organizations', color: '#00bcd4' },
  'connection': { icon: <Storage fontSize="small" />, label: 'Connections', color: '#795548' },
  'vault': { icon: <Storage fontSize="small" />, label: 'Connections', color: '#795548' },
};

function getTopicCategory(topicId: string): { icon: React.ReactNode; label: string; color: string } {
  for (const [key, config] of Object.entries(categoryConfig)) {
    if (topicId.includes(key)) {
      return config;
    }
  }
  return { icon: <Help fontSize="small" />, label: 'General', color: '#9e9e9e' };
}

function searchTopics(query: string): HelpTopic[] {
  if (!query.trim()) {
    // Return all topics when no search query
    return Object.values(helpTopics);
  }

  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(/\s+/);

  const results = Object.values(helpTopics).map((topic) => {
    let score = 0;
    const searchableText = [
      topic.title.toLowerCase(),
      topic.description.toLowerCase(),
      ...(topic.keywords || []).map((k) => k.toLowerCase()),
      topic.id.toLowerCase().replace(/-/g, ' '),
    ].join(' ');

    // Exact title match (highest priority)
    if (topic.title.toLowerCase() === lowerQuery) {
      score += 100;
    }
    // Title starts with query
    else if (topic.title.toLowerCase().startsWith(lowerQuery)) {
      score += 50;
    }
    // Title contains query
    else if (topic.title.toLowerCase().includes(lowerQuery)) {
      score += 30;
    }

    // Keyword exact match
    if (topic.keywords?.some((k) => k.toLowerCase() === lowerQuery)) {
      score += 40;
    }

    // Word matches
    for (const word of words) {
      if (word.length < 2) continue;

      if (searchableText.includes(word)) {
        score += 10;
      }

      // Partial word matches
      if (topic.title.toLowerCase().includes(word)) {
        score += 5;
      }

      if (topic.keywords?.some((k) => k.toLowerCase().includes(word))) {
        score += 3;
      }
    }

    return { topic, score };
  });

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.topic);
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <Box
        component="span"
        sx={{
          bgcolor: alpha('#00ED64', 0.3),
          borderRadius: 0.5,
          px: 0.25,
        }}
      >
        {text.slice(index, index + query.length)}
      </Box>
      {text.slice(index + query.length)}
    </>
  );
}

export function HelpSearchModal({ open, onClose, onSelectTopic, onStartTour }: HelpSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => searchTopics(query), [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, results.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            onSelectTopic(results[selectedIndex].id as HelpTopicId);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onSelectTopic, onClose]
  );

  const handleSelectTopic = (topicId: HelpTopicId) => {
    onSelectTopic(topicId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '70vh',
          bgcolor: 'background.paper',
        },
      }}
      // Prevent focus trap issues
      disableAutoFocus={false}
      disableEnforceFocus={false}
      disableRestoreFocus={false}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Search help topics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              bgcolor: alpha('#000', 0.03),
              '& fieldset': { border: 'none' },
              '&:hover': {
                bgcolor: alpha('#000', 0.05),
              },
              '&.Mui-focused': {
                bgcolor: alpha('#00ED64', 0.05),
              },
            },
          }}
        />

        {/* Keyboard hints */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 1,
            px: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <KeyboardReturn sx={{ fontSize: 14 }} /> to select
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <kbd style={{
              padding: '2px 6px',
              background: alpha('#000', 0.05),
              borderRadius: 4,
              fontSize: 11,
            }}>
              ↑↓
            </kbd>{' '}
            to navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <kbd style={{
              padding: '2px 6px',
              background: alpha('#000', 0.05),
              borderRadius: 4,
              fontSize: 11,
            }}>
              esc
            </kbd>{' '}
            to close
          </Typography>
        </Box>
      </Box>

      <Divider />

      <DialogContent sx={{ p: 0, overflow: 'auto' }}>
        {results.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Help sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">
              No help topics found for &quot;{query}&quot;
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Try different keywords or browse all topics
            </Typography>
          </Box>
        ) : (
          <List ref={listRef} sx={{ py: 1 }}>
            {results.map((topic, index) => {
              const category = getTopicCategory(topic.id);
              const isSelected = index === selectedIndex;

              return (
                <ListItem key={topic.id} disablePadding>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleSelectTopic(topic.id as HelpTopicId)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      '&.Mui-selected': {
                        bgcolor: alpha('#00ED64', 0.1),
                        '&:hover': {
                          bgcolor: alpha('#00ED64', 0.15),
                        },
                      },
                      '&:hover': {
                        bgcolor: alpha('#000', 0.04),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(category.color, 0.1),
                          color: category.color,
                        }}
                      >
                        {category.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {highlightMatch(topic.title, query)}
                          </Typography>
                          <Chip
                            label={category.label}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: alpha(category.color, 0.1),
                              color: category.color,
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {highlightMatch(topic.description, query)}
                        </Typography>
                      }
                    />
                    {isSelected && (
                      <KeyboardReturn
                        sx={{ color: 'text.disabled', fontSize: 18, ml: 1 }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      {/* Footer with shortcut hint */}
      <Divider />
      <Box
        sx={{
          py: 1.5,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha('#000', 0.02),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {results.length} help topic{results.length !== 1 ? 's' : ''} available
          </Typography>
          {onStartTour && (
            <Chip
              icon={<PlayCircleOutline sx={{ fontSize: 16 }} />}
              label="Start Tour"
              size="small"
              onClick={() => {
                onClose();
                onStartTour();
              }}
              sx={{
                height: 24,
                fontSize: '0.75rem',
                cursor: 'pointer',
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
                '&:hover': {
                  bgcolor: alpha('#00ED64', 0.2),
                },
              }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          Press{' '}
          <Box
            component="kbd"
            sx={{
              px: 0.75,
              py: 0.25,
              bgcolor: alpha('#000', 0.05),
              borderRadius: 0.5,
              fontSize: '0.7rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.25,
            }}
          >
            <KeyboardCommandKey sx={{ fontSize: 12 }} />
            /
          </Box>{' '}
          to open anytime
        </Typography>
      </Box>
    </Dialog>
  );
}
