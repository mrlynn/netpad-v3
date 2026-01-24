'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  Divider,
  Alert,
  Chip,
  Stack,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
  Code as CodeIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface DownloadAppDialogProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  applicationName: string;
  orgId: string;
  formCount: number;
  workflowCount: number;
}

type DeployTarget = 'vercel' | 'docker' | 'generic';

interface DownloadOptions {
  appName: string;
  description: string;
  includeAdmin: boolean;
  includeWorkflows: boolean;
  deployTarget: DeployTarget;
  includeSampleData: boolean;
  removeBranding: boolean;
}

const DEPLOY_TARGETS: { value: DeployTarget; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'vercel',
    label: 'Vercel',
    description: 'Optimized for Vercel deployment with serverless functions',
    icon: <CloudIcon />,
  },
  {
    value: 'docker',
    label: 'Docker',
    description: 'Includes Dockerfile and docker-compose.yml for container deployment',
    icon: <StorageIcon />,
  },
  {
    value: 'generic',
    label: 'Generic',
    description: 'Standard Next.js app that can be deployed anywhere',
    icon: <CodeIcon />,
  },
];

export function DownloadAppDialog({
  open,
  onClose,
  applicationId,
  applicationName,
  orgId,
  formCount,
  workflowCount,
}: DownloadAppDialogProps) {
  const [options, setOptions] = useState<DownloadOptions>({
    appName: applicationName,
    description: '',
    includeAdmin: true,
    includeWorkflows: workflowCount > 0,
    deployTarget: 'vercel',
    includeSampleData: false,
    removeBranding: false, // Paid feature - TODO: check subscription status
  });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset options when application changes
  useEffect(() => {
    setOptions((prev) => ({
      ...prev,
      appName: applicationName,
      includeWorkflows: workflowCount > 0,
    }));
  }, [applicationName, workflowCount]);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/applications/${applicationId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...options,
          orgId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Download failed');
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${options.appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-app.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const safeName = options.appName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'my-app';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DownloadIcon sx={{ color: '#00ED64' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Download Standalone App
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Project Summary */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'rgba(0, 237, 100, 0.05)',
            borderColor: 'rgba(0, 237, 100, 0.2)',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            What you're downloading:
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              icon={<FolderIcon sx={{ fontSize: 16 }} />}
              label={`${formCount} form${formCount !== 1 ? 's' : ''}`}
              size="small"
            />
            {workflowCount > 0 && (
              <Chip
                icon={<CodeIcon sx={{ fontSize: 16 }} />}
                label={`${workflowCount} workflow${workflowCount !== 1 ? 's' : ''}`}
                size="small"
              />
            )}
          </Stack>
        </Paper>

        {/* App Name */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="App Name"
            value={options.appName}
            onChange={(e) => setOptions({ ...options, appName: e.target.value })}
            helperText={`Package name: ${safeName}`}
            required
          />
        </Box>

        {/* Description */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Description (optional)"
            value={options.description}
            onChange={(e) => setOptions({ ...options, description: e.target.value })}
            placeholder="A brief description of your application"
            multiline
            rows={2}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Deploy Target */}
        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 1.5, fontWeight: 600 }}>
            Deployment Target
          </FormLabel>
          <RadioGroup
            value={options.deployTarget}
            onChange={(e) => setOptions({ ...options, deployTarget: e.target.value as DeployTarget })}
          >
            {DEPLOY_TARGETS.map((target) => (
              <Paper
                key={target.value}
                variant="outlined"
                sx={{
                  mb: 1,
                  p: 1.5,
                  cursor: 'pointer',
                  borderColor: options.deployTarget === target.value ? '#00ED64' : 'divider',
                  bgcolor: options.deployTarget === target.value ? 'rgba(0, 237, 100, 0.05)' : 'transparent',
                  '&:hover': {
                    borderColor: options.deployTarget === target.value ? '#00ED64' : 'text.secondary',
                  },
                }}
                onClick={() => setOptions({ ...options, deployTarget: target.value })}
              >
                <FormControlLabel
                  value={target.value}
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {target.icon}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                          {target.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {target.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>
            ))}
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* Options */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Include in Bundle
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeAdmin}
                onChange={(e) => setOptions({ ...options, includeAdmin: e.target.checked })}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Admin Panel</Typography>
                <Typography variant="caption" color="text.secondary">
                  View and manage form submissions
                </Typography>
              </Box>
            }
          />

          {workflowCount > 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeWorkflows}
                  onChange={(e) => setOptions({ ...options, includeWorkflows: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Workflows</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Include workflow definitions and execution engine
                  </Typography>
                </Box>
              }
            />
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeSampleData}
                onChange={(e) => setOptions({ ...options, includeSampleData: e.target.checked })}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Sample Data</Typography>
                <Typography variant="caption" color="text.secondary">
                  Seed the database with example submissions
                </Typography>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Branding Options */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Branding
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={options.removeBranding}
                onChange={(e) => setOptions({ ...options, removeBranding: e.target.checked })}
                disabled={false} // TODO: Enable only for paid subscribers
              />
            }
            label={
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">Remove "Made with NetPad" badge</Typography>
                  <Chip
                    label="Pro"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: 'rgba(0, 237, 100, 0.1)',
                      color: '#00CC55',
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Remove the branding badge from your standalone app
                </Typography>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* What's Included */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Your download includes:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[
            'Complete Next.js 14 application',
            'Form rendering with @netpad/forms',
            'MongoDB integration',
            'API routes for form submission',
            'Environment variable template',
            'README with setup instructions',
            options.deployTarget === 'vercel' && 'Vercel configuration',
            options.deployTarget === 'docker' && 'Dockerfile & docker-compose.yml',
            options.includeAdmin && 'Admin panel for submissions',
            options.includeWorkflows && 'Workflow execution engine',
          ]
            .filter(Boolean)
            .map((item, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon sx={{ fontSize: 16, color: '#00ED64' }} />
                <Typography variant="body2" color="text.secondary">
                  {item}
                </Typography>
              </Box>
            ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={downloading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleDownload}
          disabled={downloading || !options.appName.trim()}
          startIcon={downloading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <DownloadIcon />}
          sx={{
            bgcolor: '#00ED64',
            color: 'white',
            '&:hover': { bgcolor: '#00CC55' },
          }}
        >
          {downloading ? 'Generating...' : 'Download ZIP'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
