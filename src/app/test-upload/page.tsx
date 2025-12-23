'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Stack,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Image as ImageIcon,
  Description,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useFileUpload } from '@/hooks/useFileUpload';

export default function TestUploadPage() {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizations, setOrganizations] = useState<Array<{ orgId: string; name: string }>>([]);
  const [fileType, setFileType] = useState<'image' | 'document' | 'any'>('any');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    files,
    progress,
    isUploading,
    error,
    quota,
    limits,
    upload,
    deleteFile,
    clearError,
    fetchLimits,
  } = useFileUpload({
    organizationId,
    fileType,
    onUploadComplete: (uploaded) => {
      console.log('Upload complete:', uploaded);
    },
    onUploadError: (err) => {
      console.error('Upload error:', err);
    },
  });

  // Fetch user's organizations
  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data.organizations || []);
          if (data.organizations?.length > 0) {
            setOrganizationId(data.organizations[0].orgId);
          }
        }
      } catch (err) {
        console.error('Failed to load organizations:', err);
      }
    }
    loadOrgs();
  }, []);

  // Fetch limits when org changes
  useEffect(() => {
    if (organizationId) {
      fetchLimits();
    }
  }, [organizationId, fetchLimits]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await upload(Array.from(selectedFiles));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (url: string) => {
    await deleteFile(url);
  };

  const getAcceptTypes = () => {
    switch (fileType) {
      case 'image':
        return 'image/*';
      case 'document':
        return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
      default:
        return '*/*';
    }
  };

  if (!organizationId && organizations.length === 0) {
    return (
      <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="warning">
          No organizations found. Please create an organization first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        File Upload Test
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Test the Vercel Blob storage integration with quota enforcement.
      </Typography>

      {/* Organization Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Organization</InputLabel>
              <Select
                value={organizationId}
                label="Organization"
                onChange={(e) => setOrganizationId(e.target.value)}
              >
                {organizations.map((org) => (
                  <MenuItem key={org.orgId} value={org.orgId}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>File Type</InputLabel>
              <Select
                value={fileType}
                label="File Type"
                onChange={(e) => setFileType(e.target.value as typeof fileType)}
              >
                <MenuItem value="any">All Files</MenuItem>
                <MenuItem value="image">Images Only</MenuItem>
                <MenuItem value="document">Documents Only</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Storage Quota */}
      {quota && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Storage Usage
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(quota.percentUsed, 100)}
                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                color={quota.percentUsed > 90 ? 'error' : quota.percentUsed > 70 ? 'warning' : 'primary'}
              />
              <Typography variant="body2" color="text.secondary">
                {quota.percentUsed.toFixed(1)}%
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {quota.usedFormatted} / {quota.limitFormatted} used
              {quota.remainingFormatted && ` (${quota.remainingFormatted} remaining)`}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Upload Limits Info */}
      {limits && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Upload Limits
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`Max file: ${limits.maxFileSizeFormatted}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Total storage: ${limits.maxTotalStorageFormatted}`}
                variant="outlined"
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Upload Area */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: 'background.default',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getAcceptTypes()}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isUploading ? 'Uploading...' : 'Click to upload files'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {fileType === 'image' && 'Supported: JPEG, PNG, GIF, WebP, SVG'}
              {fileType === 'document' && 'Supported: PDF, Word, Excel, PowerPoint, TXT, CSV'}
              {fileType === 'any' && 'Supported: Images and documents'}
            </Typography>
          </Box>

          {isUploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {Object.keys(progress).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Upload Progress
            </Typography>
            <List dense>
              {Object.values(progress).map((p) => (
                <ListItem key={p.fileName}>
                  <ListItemText
                    primary={p.fileName}
                    secondary={
                      <LinearProgress
                        variant="determinate"
                        value={p.progress}
                        color={p.status === 'error' ? 'error' : p.status === 'success' ? 'success' : 'primary'}
                        sx={{ mt: 0.5 }}
                      />
                    }
                  />
                  {p.status === 'success' && <CheckCircle color="success" sx={{ ml: 1 }} />}
                  {p.status === 'error' && <ErrorIcon color="error" sx={{ ml: 1 }} />}
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {files.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Uploaded Files ({files.length})
            </Typography>
            <List>
              {files.map((file, index) => (
                <Box key={file.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    {file.mimeType.startsWith('image/') ? (
                      <ImageIcon sx={{ mr: 2, color: 'primary.main' }} />
                    ) : (
                      <Description sx={{ mr: 2, color: 'text.secondary' }} />
                    )}
                    <ListItemText
                      primary={file.originalName}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {formatBytes(file.size)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {file.mimeType}
                          </Typography>
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </Button>
                        <IconButton
                          edge="end"
                          onClick={() => handleDelete(file.url)}
                          size="small"
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {/* Image Preview */}
                  {file.mimeType.startsWith('image/') && (
                    <Box sx={{ px: 2, pb: 2 }}>
                      <img
                        src={file.url}
                        alt={file.originalName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 200,
                          borderRadius: 8,
                          objectFit: 'contain',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
