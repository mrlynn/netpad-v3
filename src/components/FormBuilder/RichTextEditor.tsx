'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  Link as LinkIcon,
  FormatListNumbered,
  FormatListBulleted,
  FormatClear,
} from '@mui/icons-material';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  variant?: 'title' | 'description';
  autoFocus?: boolean;
  onBlur?: () => void;
}

interface ToolbarButton {
  icon: React.ElementType;
  command: string;
  tooltip: string;
  shortcut?: string;
  requiresValue?: boolean;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { icon: FormatBold, command: 'bold', tooltip: 'Bold', shortcut: 'Ctrl+B' },
  { icon: FormatItalic, command: 'italic', tooltip: 'Italic', shortcut: 'Ctrl+I' },
  { icon: FormatUnderlined, command: 'underline', tooltip: 'Underline', shortcut: 'Ctrl+U' },
  { icon: LinkIcon, command: 'createLink', tooltip: 'Add link', shortcut: 'Ctrl+K', requiresValue: true },
  { icon: FormatListNumbered, command: 'insertOrderedList', tooltip: 'Numbered list' },
  { icon: FormatListBulleted, command: 'insertUnorderedList', tooltip: 'Bulleted list' },
  { icon: FormatClear, command: 'removeFormat', tooltip: 'Clear formatting' },
];

// Allowed HTML tags and attributes for sanitization
const ALLOWED_TAGS = ['b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br', 'p', 'div', 'span'];
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
};

/**
 * Sanitize HTML to only allow safe tags and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');

  function sanitizeNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.includes(tagName)) {
      // Replace disallowed tag with its children
      const fragment = document.createDocumentFragment();
      Array.from(element.childNodes).forEach(child => {
        const sanitized = sanitizeNode(child);
        if (sanitized) fragment.appendChild(sanitized);
      });
      return fragment;
    }

    // Create new element with only allowed attributes
    const newElement = document.createElement(tagName);
    const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || [];

    allowedAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        // Special handling for href to prevent javascript: URLs
        if (attr === 'href' && value.toLowerCase().startsWith('javascript:')) {
          return;
        }
        newElement.setAttribute(attr, value);
      }
    });

    // Add security attributes to links
    if (tagName === 'a') {
      newElement.setAttribute('target', '_blank');
      newElement.setAttribute('rel', 'noopener noreferrer');
    }

    // Recursively sanitize children
    Array.from(element.childNodes).forEach(child => {
      const sanitized = sanitizeNode(child);
      if (sanitized) newElement.appendChild(sanitized);
    });

    return newElement;
  }

  const sanitizedFragment = document.createDocumentFragment();
  Array.from(doc.body.childNodes).forEach(node => {
    const sanitized = sanitizeNode(node);
    if (sanitized) sanitizedFragment.appendChild(sanitized);
  });

  const container = document.createElement('div');
  container.appendChild(sanitizedFragment);
  return container.innerHTML;
}

/**
 * Inline rich text editor similar to Google Forms
 * Uses contentEditable with execCommand for formatting
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  minHeight = 40,
  variant = 'description',
  autoFocus = false,
  onBlur,
}: RichTextEditorProps) {
  const theme = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);

  const primaryColor = theme.palette.primary.main;
  const textColor = theme.palette.text.primary;
  const borderColor = theme.palette.divider;

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [autoFocus]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Don't update if it's just the placeholder
      if (html !== '<br>' && html !== '') {
        onChange(sanitizeHtml(html));
      } else {
        onChange('');
      }
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    if (modKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'k':
          e.preventDefault();
          handleLinkClick();
          break;
      }
    }
  }, [execCommand]);

  const handleLinkClick = useCallback(() => {
    // Save current selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0).cloneRange());
    }
    setLinkUrl('');
    setLinkDialogOpen(true);
  }, []);

  const handleLinkConfirm = useCallback(() => {
    if (linkUrl && savedSelection) {
      // Restore selection
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelection);

      // Create link
      execCommand('createLink', linkUrl);
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
    setSavedSelection(null);
  }, [linkUrl, savedSelection, execCommand]);

  const handleToolbarClick = useCallback((button: ToolbarButton) => {
    if (button.requiresValue && button.command === 'createLink') {
      handleLinkClick();
    } else {
      execCommand(button.command);
    }
  }, [execCommand, handleLinkClick]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Small delay to allow toolbar clicks
    setTimeout(() => {
      if (!linkDialogOpen) {
        setIsFocused(false);
        onBlur?.();
      }
    }, 150);
  }, [linkDialogOpen, onBlur]);

  const isTitle = variant === 'title';

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Editor */}
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-placeholder={placeholder}
        sx={{
          minHeight,
          p: 1,
          outline: 'none',
          cursor: 'text',
          color: textColor,
          fontSize: isTitle ? '1.25rem' : '0.875rem',
          fontWeight: isTitle ? 600 : 400,
          lineHeight: 1.6,
          borderRadius: 1,
          border: '1px solid',
          borderColor: isFocused ? primaryColor : 'transparent',
          transition: 'border-color 0.2s',
          '&:empty::before': {
            content: 'attr(data-placeholder)',
            color: theme.palette.text.disabled,
            pointerEvents: 'none',
          },
          '& a': {
            color: primaryColor,
            textDecoration: 'underline',
          },
          '& ul, & ol': {
            pl: 3,
            my: 0.5,
          },
          '& li': {
            mb: 0.25,
          },
        }}
      />

      {/* Toolbar - shown when focused */}
      {isFocused && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            mt: 1,
            p: 0.5,
            borderTop: '1px solid',
            borderColor,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur on toolbar click
        >
          {TOOLBAR_BUTTONS.map((button, index) => (
            <React.Fragment key={button.command}>
              {index === 3 && <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />}
              {index === 5 && <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />}
              <Tooltip
                title={button.shortcut ? `${button.tooltip} (${button.shortcut})` : button.tooltip}
                placement="top"
              >
                <IconButton
                  size="small"
                  onClick={() => handleToolbarClick(button)}
                  sx={{
                    p: 0.75,
                    borderRadius: 0.5,
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      bgcolor: alpha(primaryColor, 0.1),
                      color: primaryColor,
                    },
                  }}
                >
                  <button.icon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Link</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="URL"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLinkConfirm();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleLinkConfirm} variant="contained" disabled={!linkUrl}>
            Add Link
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RichTextEditor;
