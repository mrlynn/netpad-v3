/**
 * Document Upload Dialog
 *
 * Dialog for uploading new RAG documents.
 */

'use client';

import { useState } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  CheckCircle,
} from '@mui/icons-material';
import { RAGDocumentSourceType, MAX_DOCUMENT_SIZE, SUPPORTED_MIME_TYPES } from '@/types/rag';

export interface DocumentUploadDialogProps {
  open: boolean;
  onClose: () => void;
  formId: string;
  organizationId: string;
  onUploaded: () => void;
}

export function DocumentUploadDialog({
  open,
  onClose,
  formId,
  organizationId,
  onUploaded,
}: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<RAGDocumentSourceType>('guide');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        // Auto-fill title from filename
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Validate file size
      if (file.size > MAX_DOCUMENT_SIZE) {
        const maxMB = MAX_DOCUMENT_SIZE / 1024 / 1024;
        throw new Error(`File too large. Maximum size is ${maxMB}MB`);
      }

      // Validate MIME type
      const isMarkdown = file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown');
      const isSupportedMimeType = SUPPORTED_MIME_TYPES.includes(file.type as any);

      if (!isSupportedMimeType && !isMarkdown) {
        throw new Error(
          `Unsupported file type: ${file.type}. Supported: PDF, DOCX, TXT, Markdown`
        );
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('formId', formId);
      formData.append('organizationId', organizationId);
      formData.append('sourceType', sourceType);
      if (title) {
        formData.append('title', title);
      }
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch('/api/rag/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Success
      onUploaded();
      handleClose();
    } catch (err) {
      console.error('[Upload] Error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setTitle('');
      setDescription('');
      setSourceType('guide');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Document</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {uploading ? (
          <Box sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
              Uploading and processing document...
            </Typography>
            <LinearProgress sx={{ mt: 2 }} />
            <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 2 }}>
              This may take a minute for large documents
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* File upload */}
            <Box>
              <input
                accept=".pdf,.docx,.txt,.md,.markdown"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Choose File
                </Button>
              </label>
              {file && (
                <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </Typography>
                </Alert>
              )}
            </Box>

            {/* Title */}
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              helperText="Descriptive title for this document"
            />

            {/* Description */}
            <TextField
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              helperText="What does this document contain?"
            />

            {/* Source Type */}
            <FormControl fullWidth>
              <InputLabel>Source Type</InputLabel>
              <Select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as RAGDocumentSourceType)}
                label="Source Type"
              >
                <MenuItem value="policy">Policy</MenuItem>
                <MenuItem value="guide">Guide</MenuItem>
                <MenuItem value="template">Template</MenuItem>
                <MenuItem value="faq">FAQ Document</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="specification">Specification</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            {/* Supported formats */}
            <Alert severity="info" variant="outlined">
              <Typography variant="caption" component="div" gutterBottom>
                <strong>Supported formats:</strong>
              </Typography>
              <List dense disablePadding>
                <ListItem dense disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Description fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="caption">PDF, DOCX, TXT, Markdown</Typography>}
                  />
                </ListItem>
                <ListItem dense disableGutters>
                  <ListItemText
                    primary={<Typography variant="caption">Max file size: {MAX_DOCUMENT_SIZE / 1024 / 1024}MB</Typography>}
                    sx={{ ml: 4 }}
                  />
                </ListItem>
              </List>
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || uploading}
          startIcon={<CloudUpload />}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}
