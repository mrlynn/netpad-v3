'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  alpha,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import {
  ContentCopy,
  OpenInNew,
  Code,
  Link as LinkIcon,
  Javascript,
  DataObject,
} from '@mui/icons-material';

interface EmbedCodeGeneratorProps {
  formId: string;
  formSlug: string;
  formName: string;
}

type EmbedType = 'iframe' | 'sdk' | 'link' | 'popup';

interface EmbedSettings {
  width: string;
  height: string;
  theme: 'light' | 'dark' | 'auto';
  hideHeader: boolean;
  hideBranding: boolean;
  autoResize: boolean;
}

export function EmbedCodeGenerator({
  formId,
  formSlug,
  formName,
}: EmbedCodeGeneratorProps) {
  const [embedType, setEmbedType] = useState<EmbedType>('iframe');
  const [settings, setSettings] = useState<EmbedSettings>({
    width: '100%',
    height: '600',
    theme: 'auto',
    hideHeader: false,
    hideBranding: false,
    autoResize: true,
  });
  const [copied, setCopied] = useState(false);

  // Get the base URL (works in browser)
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const formUrl = `${getBaseUrl()}/forms/${formSlug}`;

  const buildEmbedParams = () => {
    const params = new URLSearchParams();
    if (settings.theme !== 'light') params.append('theme', settings.theme);
    if (settings.hideHeader) params.append('hideHeader', 'true');
    if (settings.hideBranding) params.append('hideBranding', 'true');
    return params.toString() ? `?${params.toString()}` : '';
  };

  const getEmbedCode = () => {
    const embedUrl = formUrl + buildEmbedParams();
    const baseUrl = getBaseUrl();

    switch (embedType) {
      case 'iframe':
        return `<iframe
  src="${embedUrl}"
  width="${settings.width}"
  height="${settings.height}px"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="${formName}"
></iframe>`;

      case 'sdk':
        // JavaScript SDK embed
        const dataAttrs = [];
        if (settings.theme !== 'light') dataAttrs.push(`data-theme="${settings.theme}"`);
        if (settings.hideHeader) dataAttrs.push('data-hide-header="true"');
        if (settings.hideBranding) dataAttrs.push('data-hide-branding="true"');
        if (settings.height !== '600') dataAttrs.push(`data-min-height="${settings.height}px"`);
        if (!settings.autoResize) dataAttrs.push('data-auto-resize="false"');

        const dataAttrsStr = dataAttrs.length > 0 ? '\n  ' + dataAttrs.join('\n  ') : '';

        return `<!-- NetPad Form Embed -->
<script src="${baseUrl}/embed.js"></script>
<div
  data-netpad-form="${formSlug}"${dataAttrsStr}
></div>`;

      case 'link':
        return `<a href="${embedUrl}" target="_blank" rel="noopener noreferrer">
  ${formName}
</a>`;

      case 'popup':
        return `<script>
  function openForm${formId.substring(0, 8)}() {
    window.open(
      '${embedUrl}',
      '${formName.replace(/'/g, "\\'")}',
      'width=600,height=${settings.height},scrollbars=yes'
    );
  }
</script>
<button onclick="openForm${formId.substring(0, 8)}()">
  Open ${formName}
</button>`;

      default:
        return '';
    }
  };

  const getJsApiExample = () => {
    const baseUrl = getBaseUrl();
    return `// Include the SDK script first
<script src="${baseUrl}/embed.js"></script>

// Then use the JavaScript API
<script>
  // Embed form into a container
  const form = NetPad.embed('container-id', '${formSlug}', {
    theme: '${settings.theme}',
    hideHeader: ${settings.hideHeader},
    hideBranding: ${settings.hideBranding},
    height: '${settings.height}px',

    // Event callbacks
    onLoad: function() {
      console.log('Form loaded');
    },
    onSubmit: function(data) {
      console.log('Form submitted:', data);
    },
    onError: function(error) {
      console.error('Form error:', error);
    }
  });

  // Or open as a popup
  // NetPad.popup('${formSlug}', { width: 600, height: 700 });
</script>

<div id="container-id"></div>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyJsApiExample = async () => {
    try {
      await navigator.clipboard.writeText(getJsApiExample());
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        Share & Embed
      </Typography>

      {/* Direct Link */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Direct Link
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            value={formUrl}
            fullWidth
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
            }}
          />
          <Tooltip title="Copy URL">
            <IconButton onClick={copyUrlToClipboard}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open in new tab">
            <IconButton
              onClick={() => window.open(formUrl, '_blank')}
            >
              <OpenInNew fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Embed Type Tabs */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Embed Options
      </Typography>
      <Tabs
        value={embedType}
        onChange={(_, v) => setEmbedType(v)}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab
          value="iframe"
          label="iFrame"
          icon={<Code fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="sdk"
          label="JavaScript SDK"
          icon={<Javascript fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="link"
          label="Link"
          icon={<LinkIcon fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="popup"
          label="Popup"
          icon={<OpenInNew fontSize="small" />}
          iconPosition="start"
        />
      </Tabs>

      {/* Settings for iFrame and SDK */}
      {(embedType === 'iframe' || embedType === 'sdk') && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            {embedType === 'iframe' && (
              <TextField
                size="small"
                label="Width"
                value={settings.width}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, width: e.target.value }))
                }
                sx={{ width: 120 }}
              />
            )}
            <TextField
              size="small"
              label={embedType === 'sdk' ? 'Min Height (px)' : 'Height (px)'}
              type="number"
              value={settings.height}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, height: e.target.value }))
              }
              sx={{ width: 140 }}
            />
            <FormControl size="small" sx={{ width: 120 }}>
              <InputLabel>Theme</InputLabel>
              <Select
                value={settings.theme}
                label="Theme"
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    theme: e.target.value as any,
                  }))
                }
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Auto</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.hideHeader}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, hideHeader: e.target.checked }))
                  }
                />
              }
              label="Hide Header"
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.hideBranding}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, hideBranding: e.target.checked }))
                  }
                />
              }
              label="Hide Branding"
            />
            {embedType === 'sdk' && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.autoResize}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, autoResize: e.target.checked }))
                    }
                  />
                }
                label="Auto Resize"
              />
            )}
          </Box>
        </Box>
      )}

      {/* Code Preview */}
      <Box
        sx={{
          p: 2,
          bgcolor: '#001E2B',
          borderRadius: 1,
          position: 'relative',
        }}
      >
        <Box
          component="pre"
          sx={{
            m: 0,
            color: '#00ED64',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: 200,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {getEmbedCode()}
        </Box>
        <Tooltip title="Copy code">
          <IconButton
            size="small"
            onClick={copyToClipboard}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              bgcolor: alpha('#fff', 0.1),
              '&:hover': { bgcolor: alpha('#fff', 0.2) },
            }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* JavaScript API Example (only for SDK) */}
      {embedType === 'sdk' && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DataObject fontSize="small" />
              JavaScript API Example
            </Typography>
            <Tooltip title="Copy API example">
              <IconButton size="small" onClick={copyJsApiExample}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              p: 2,
              bgcolor: '#001E2B',
              borderRadius: 1,
            }}
          >
            <Box
              component="pre"
              sx={{
                m: 0,
                color: '#9CA3AF',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                overflow: 'auto',
                maxHeight: 250,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {getJsApiExample()}
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            The SDK automatically handles form loading, submission events, and iframe resizing.
          </Typography>
        </Box>
      )}

      {/* Preview */}
      {embedType === 'iframe' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Preview
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: alpha('#000', 0.02),
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              height: Math.min(parseInt(settings.height) || 400, 400),
              overflow: 'hidden',
            }}
          >
            <iframe
              src={formUrl + buildEmbedParams()}
              width={settings.width}
              height="100%"
              style={{ border: 'none', borderRadius: 8 }}
              title={formName}
            />
          </Box>
        </Box>
      )}

      {/* Copy success snackbar */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </Paper>
  );
}
