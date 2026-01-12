/**
 * Source Citation Component
 *
 * Displays source citations for RAG-powered conversational forms.
 * Supports two modes: inline citation links and expandable references section.
 */

'use client';

import { useState } from 'react';
import {
  Box,
  Link,
  Typography,
  Collapse,
  Paper,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Description,
  OpenInNew,
} from '@mui/icons-material';
import { RetrievedChunk } from '@/types/rag';

/**
 * Props for SourceCitation component
 */
export interface SourceCitationProps {
  /** Retrieved chunks with source information */
  sources: RetrievedChunk[];
  /** Display mode: inline links or expandable section */
  inline?: boolean;
  /** Callback when a citation is clicked */
  onSourceClick?: (source: RetrievedChunk) => void;
  /** Custom styles */
  sx?: object;
}

/**
 * Source Citation Component
 *
 * Displays source citations in two modes:
 * - Inline: Clickable citation links [1] [2] within text
 * - Expandable: Collapsible references section with full details
 */
export function SourceCitation({
  sources,
  inline = false,
  onSourceClick,
  sx,
}: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);

  // Handle empty sources
  if (!sources || sources.length === 0) {
    return null;
  }

  // Inline citation links mode
  if (inline) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          gap: 0.5,
          ml: 0.5,
          alignItems: 'center',
          ...sx,
        }}
      >
        {sources.map((source, index) => (
          <Tooltip
            key={source.chunkId}
            title={
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                  {source.document?.title || source.document?.fileName || 'Untitled'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Relevance: {(source.score * 100).toFixed(0)}%
                </Typography>
                {source.metadata?.pageNumber && (
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    Page {source.metadata.pageNumber}
                  </Typography>
                )}
              </Box>
            }
            arrow
          >
            <Link
              component="button"
              variant="caption"
              onClick={(e) => {
                e.preventDefault();
                if (onSourceClick) {
                  onSourceClick(source);
                } else {
                  // Default: toggle expandable section
                  setExpanded(!expanded);
                }
              }}
              sx={{
                textDecoration: 'none',
                color: 'primary.main',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                  color: 'primary.dark',
                },
                minWidth: 'auto',
                px: 0.25,
              }}
            >
              [{index + 1}]
            </Link>
          </Tooltip>
        ))}
      </Box>
    );
  }

  // Expandable references section mode
  return (
    <Box sx={{ mt: 1.5, ...sx }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          color: 'text.secondary',
          '&:hover': {
            color: 'text.primary',
          },
          transition: 'color 0.2s',
        }}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Hide' : 'Show'} sources (${sources.length})`}
      >
        <Description sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Sources ({sources.length})
        </Typography>
        <IconButton
          size="small"
          sx={{
            ml: 'auto',
            p: 0.5,
          }}
          aria-label={expanded ? 'Collapse sources' : 'Expand sources'}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            mt: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {sources.map((source, index) => (
            <Paper
              key={source.chunkId}
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: alpha('#000', 0.02),
                borderColor: alpha('#000', 0.1),
                '&:hover': {
                  bgcolor: alpha('#000', 0.04),
                  borderColor: 'primary.main',
                },
                transition: 'all 0.2s',
                cursor: onSourceClick ? 'pointer' : 'default',
              }}
              onClick={() => onSourceClick?.(source)}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: 'primary.main',
                        fontSize: '0.75rem',
                      }}
                    >
                      [{index + 1}]
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                      }}
                    >
                      {source.document?.title || source.document?.fileName || 'Untitled Document'}
                    </Typography>
                  </Box>
                  {source.document?.sourceType && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: 'text.secondary',
                        mb: 0.5,
                      }}
                    >
                      {source.document.sourceType.charAt(0).toUpperCase() +
                        source.document.sourceType.slice(1)}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    ml: 1,
                  }}
                >
                  <Tooltip title={`Relevance score: ${(source.score * 100).toFixed(1)}%`}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: source.score >= 0.8 ? 'success.main' : source.score >= 0.6 ? 'warning.main' : 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    >
                      {(source.score * 100).toFixed(0)}%
                    </Typography>
                  </Tooltip>
                </Box>
              </Box>

              {source.metadata?.pageNumber && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: 'text.secondary',
                    mb: 1,
                    fontSize: '0.7rem',
                  }}
                >
                  Page {source.metadata.pageNumber}
                  {source.metadata.section && ` • ${source.metadata.section}`}
                </Typography>
              )}

              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {source.text}
              </Typography>

              {onSourceClick && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: 1,
                    pt: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <OpenInNew sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'primary.main',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    View full source
                  </Typography>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export default SourceCitation;
