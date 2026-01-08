'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ContentCopy,
  OpenInNew,
  Code,
  Javascript,
  Link as LinkIcon,
  DataObject,
} from '@mui/icons-material';

interface EmbedCodeGeneratorProps {
  workflowId: string;
  workflowSlug: string;
  workflowName: string;
  executionToken?: string;
}

type EmbedType = 'sdk' | 'link' | 'execution-ui';

interface EmbedSettings {
  theme: 'light' | 'dark' | 'auto';
  hideHeader: boolean;
  hideBranding: boolean;
  height: string;
  width: string;
  includeToken: boolean;
}

export function WorkflowEmbedCodeGenerator({
  workflowId,
  workflowSlug,
  workflowName,
  executionToken,
}: EmbedCodeGeneratorProps) {
  const [embedType, setEmbedType] = useState<EmbedType>('sdk');
  const [settings, setSettings] = useState<EmbedSettings>({
    theme: 'auto',
    hideHeader: false,
    hideBranding: false,
    height: '600',
    width: '100%',
    includeToken: !!executionToken,
  });
  const [copied, setCopied] = useState(false);

  // Get the base URL (works in browser)
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const buildEmbedParams = () => {
    const params = new URLSearchParams();
    if (settings.theme !== 'light') params.append('theme', settings.theme);
    if (settings.hideHeader) params.append('hideHeader', 'true');
    if (settings.hideBranding) params.append('hideBranding', 'true');
    return params.toString() ? `?${params.toString()}` : '';
  };

  const getEmbedCode = () => {
    const baseUrl = getBaseUrl();

    switch (embedType) {
      case 'sdk':
        // JavaScript SDK embed
        const tokenParam = settings.includeToken && executionToken
          ? `\n    token: '${executionToken}',`
          : '';

        return `<!-- NetPad Workflow Embed -->
<script src="${baseUrl}/workflow-embed.js"></script>
<script>
  // Execute workflow
  NetPad.executeWorkflow('${workflowSlug}', {${tokenParam}
    payload: {
      // Your workflow input data here
      data: 'value'
    }
  })
    .then(result => {
      console.log('Execution ID:', result.executionId);
      
      // Poll for status updates
      NetPad.pollExecutionStatus(result.executionId, {
        interval: 1000,
        onStatusChange: (status, execution) => {
          console.log('Status:', status);
        },
        onComplete: (execution) => {
          console.log('Completed:', execution.result);
        },
        onError: (error) => {
          console.error('Error:', error);
        }
      });
    });
</script>`;

      case 'link':
        const executeUrl = `${baseUrl}/api/workflows/public/${workflowSlug}/execute`;
        return `<a href="${executeUrl}" target="_blank" rel="noopener noreferrer">
  Execute ${workflowName}
</a>`;

      case 'execution-ui':
        // Embed execution UI (requires executionId)
        return `<!-- NetPad Workflow Execution UI Embed -->
<script src="${baseUrl}/workflow-embed.js"></script>
<div id="workflow-execution-container"></div>
<script>
  // First execute the workflow
  NetPad.executeWorkflow('${workflowSlug}', {${tokenParam}
    payload: { data: 'value' }
  })
    .then(result => {
      // Then embed the execution UI
      NetPad.embedExecution('workflow-execution-container', result.executionId, {
        theme: '${settings.theme}',
        hideHeader: ${settings.hideHeader},
        hideBranding: ${settings.hideBranding},
        height: '${settings.height}px',
        onStatusChange: (status) => {
          console.log('Status:', status);
        },
        onComplete: (execution) => {
          console.log('Completed:', execution);
        }
      });
    });
</script>`;

      default:
        return '';
    }
  };

  const getJsApiExample = () => {
    const baseUrl = getBaseUrl();
    const tokenParam = settings.includeToken && executionToken
      ? `\n    token: '${executionToken}',`
      : '';

    return `// Include the SDK script first
<script src="${baseUrl}/workflow-embed.js"></script>

// Then use the JavaScript API
<script>
  // Execute workflow
  const result = await NetPad.executeWorkflow('${workflowSlug}', {${tokenParam}
    payload: {
      // Your workflow input data
      email: 'user@example.com',
      name: 'John Doe'
    }
  });

  console.log('Execution ID:', result.executionId);

  // Get execution status
  const status = await NetPad.getExecutionStatus(result.executionId, {
    includeLogs: true
  });
  console.log('Status:', status.execution.status);

  // Poll for status updates
  NetPad.pollExecutionStatus(result.executionId, {
    interval: 1000,
    maxAttempts: 300,
    onStatusChange: (status, execution) => {
      console.log('Status changed:', status);
    },
    onComplete: (execution) => {
      console.log('Execution completed:', execution.result);
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  // Or embed execution UI
  NetPad.embedExecution('container-id', result.executionId, {
    theme: '${settings.theme}',
    hideHeader: ${settings.hideHeader},
    hideBranding: ${settings.hideBranding}
  });
</script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
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
        Share & Embed Workflow
      </Typography>

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
          value="sdk"
          label="JavaScript SDK"
          icon={<Javascript fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="execution-ui"
          label="Execution UI"
          icon={<Code fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="link"
          label="Link"
          icon={<LinkIcon fontSize="small" />}
          iconPosition="start"
        />
      </Tabs>

      {/* Settings */}
      {(embedType === 'sdk' || embedType === 'execution-ui') && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              size="small"
              label="Height (px)"
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
            {executionToken && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.includeToken}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, includeToken: e.target.checked }))
                    }
                  />
                }
                label="Include Token"
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
            The SDK automatically handles workflow execution, status polling, and execution UI embedding.
          </Typography>
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
