/**
 * JSON preview component for showing generated MongoDB query
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

interface JsonPreviewProps {
  json: string;
  title?: string;
  defaultCollapsed?: boolean;
}

export function JsonPreview({
  json,
  title = 'Generated Query',
  defaultCollapsed = false,
}: JsonPreviewProps) {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);

  // Pretty-print the JSON
  const formattedJson = useMemo(() => {
    try {
      const parsed = JSON.parse(json);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return json;
    }
  }, [json]);

  // Check if JSON is empty or just {}
  const isEmpty = useMemo(() => {
    try {
      const parsed = JSON.parse(json);
      return Object.keys(parsed).length === 0;
    } catch {
      return json.trim() === '' || json.trim() === '{}';
    }
  }, [json]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            sx={{ p: 0.25 }}
          >
            {collapsed ? (
              <ExpandIcon fontSize="small" />
            ) : (
              <CollapseIcon fontSize="small" />
            )}
          </IconButton>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
          {isEmpty && (
            <Typography
              variant="caption"
              sx={{ color: 'warning.main', fontStyle: 'italic', ml: 1 }}
            >
              (empty query - returns all documents)
            </Typography>
          )}
        </Box>
        <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
          <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
            {copied ? (
              <CheckIcon fontSize="small" sx={{ color: 'success.main' }} />
            ) : (
              <CopyIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* JSON content */}
      <Collapse in={!collapsed}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            bgcolor: alpha(
              theme.palette.grey[900],
              theme.palette.mode === 'dark' ? 0.3 : 0.05
            ),
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            overflowX: 'auto',
            whiteSpace: 'pre',
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {formattedJson}
        </Paper>
      </Collapse>
    </Box>
  );
}

export default JsonPreview;
