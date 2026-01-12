/**
 * Document Attachment Panel
 *
 * Component for managing RAG documents in the form builder.
 * Allows uploading, listing, selecting, and deleting documents.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tooltip,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Upload,
  Delete,
  Description,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
  Close,
  CloudUpload,
} from '@mui/icons-material';
import { RAGDocument, RAGDocumentSourceType, RAGDocumentStatus } from '@/types/rag';
import { MAX_DOCUMENT_SIZE, SUPPORTED_MIME_TYPES } from '@/types/rag';
import { FeatureGate } from '@/components/common/FeatureGate';

/**
 * Props for DocumentAttachmentPanel
 */
export interface DocumentAttachmentPanelProps {
  /** Form ID */
  formId: string;
  /** Organization ID */
  organizationId: string;
  /** Currently selected document IDs */
  selectedDocuments: string[];
  /** Callback when selected documents change */
  onDocumentsChange: (documentIds: string[]) => void;
  /** Whether RAG is enabled for this form */
  ragEnabled: boolean;
}

/**
 * Document Attachment Panel Component
 *
 * Manages RAG documents for a conversational form:
 * - Lists all documents for the form
 * - Upload new documents (PDF, DOCX, TXT)
 * - Delete documents
 * - Select/deselect documents for RAG
 * - Shows document status and metadata
 */
export function DocumentAttachmentPanel({
  formId,
  organizationId,
  selectedDocuments,
  onDocumentsChange,
  ragEnabled,
}: DocumentAttachmentPanelProps) {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load documents when component mounts or form changes
  useEffect(() => {
    if (ragEnabled && formId && organizationId) {
      loadDocuments();
    }
  }, [formId, organizationId, ragEnabled]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/rag/documents?formId=${formId}&organizationId=${organizationId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('[RAG] Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (
    file: File,
    sourceType: RAGDocumentSourceType,
    title?: string,
    description?: string
  ) => {
    setUploading(true);
    setUploadError(null);

    try {
      // Validate file size
      if (file.size > MAX_DOCUMENT_SIZE) {
        const maxMB = MAX_DOCUMENT_SIZE / 1024 / 1024;
        throw new Error(`File too large. Maximum size is ${maxMB}MB`);
      }

      // Validate MIME type
      if (!SUPPORTED_MIME_TYPES.includes(file.type as any)) {
        throw new Error(
          `Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`
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

      // Reload documents
      await loadDocuments();
      setUploadDialogOpen(false);
    } catch (error) {
      console.error('[RAG] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/rag/documents/${documentId}?organizationId=${organizationId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Remove from selected if selected
      onDocumentsChange(selectedDocuments.filter((id) => id !== documentId));

      // Reload documents
      await loadDocuments();
    } catch (error) {
      console.error('[RAG] Delete error:', error);
      alert('Delete failed. Please try again.');
    }
  };

  const handleToggleSelection = (documentId: string) => {
    if (selectedDocuments.includes(documentId)) {
      onDocumentsChange(selectedDocuments.filter((id) => id !== documentId));
    } else {
      onDocumentsChange([...selectedDocuments, documentId]);
    }
  };

  const getStatusIcon = (status: RAGDocumentStatus) => {
    switch (status) {
      case 'ready':
        return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'processing':
        return <CircularProgress size={16} />;
      default:
        return <HourglassEmpty sx={{ fontSize: 16, color: 'text.disabled' }} />;
    }
  };

  const getStatusColor = (status: RAGDocumentStatus): 'success' | 'error' | 'default' | 'warning' => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Show feature gate if RAG not enabled
  if (!ragEnabled) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="info">
          Enable RAG in the conversation configuration to attach documents.
        </Alert>
      </Paper>
    );
  }

  return (
    <FeatureGate
      feature="rag_conversational_forms"
      orgId={organizationId}
      fallback="upgrade-prompt"
      upgradeMessage="Knowledge-Guided Conversational Forms requires Team plan and M10+ Atlas cluster"
    >
      <Paper sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Knowledge Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Attach documents to help the AI answer questions. Supported: PDF, DOCX, TXT (max 5MB)
            </Typography>
          </Box>
          <Button
            startIcon={<Upload />}
            variant="contained"
            onClick={() => setUploadDialogOpen(true)}
            size="small"
          >
            Upload Document
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading documents...
            </Typography>
          </Box>
        ) : documents.length === 0 ? (
          <Alert severity="info">
            No documents uploaded yet. Click "Upload Document" to add knowledge sources.
          </Alert>
        ) : (
          <List>
            {documents.map((doc) => {
              const isSelected = selectedDocuments.includes(doc.documentId);
              const isReady = doc.status === 'ready';

              return (
                <ListItem
                  key={doc.documentId}
                  sx={{
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: isSelected ? alpha('#2196f3', 0.05) : 'transparent',
                    '&:hover': {
                      bgcolor: alpha('#000', 0.02),
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    <Description sx={{ color: 'text.secondary', mr: 1 }} />
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {doc.title || doc.fileName}
                        </Typography>
                        <Chip
                          label={doc.sourceType}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            textTransform: 'capitalize',
                          }}
                        />
                        {isSelected && (
                          <Chip
                            label="Selected"
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          icon={getStatusIcon(doc.status)}
                          label={doc.status}
                          size="small"
                          color={getStatusColor(doc.status)}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        {doc.status === 'ready' && doc.chunkCount > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {doc.chunkCount} chunks
                          </Typography>
                        )}
                        {doc.fileSize && (
                          <Typography variant="caption" color="text.secondary">
                            {(doc.fileSize / 1024).toFixed(0)} KB
                          </Typography>
                        )}
                        {doc.status === 'error' && doc.errorMessage && (
                          <Tooltip title={doc.errorMessage}>
                            <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />
                          </Tooltip>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small"
                        variant={isSelected ? 'outlined' : 'contained'}
                        onClick={() => handleToggleSelection(doc.documentId)}
                        disabled={!isReady}
                        sx={{ minWidth: 80 }}
                      >
                        {isSelected ? 'Deselect' : 'Select'}
                      </Button>
                      <Tooltip title="Delete document">
                        <IconButton
                          edge="end"
                          onClick={() => handleDelete(doc.documentId)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}

        {/* Upload Dialog */}
        <UploadDialog
          open={uploadDialogOpen}
          onClose={() => {
            setUploadDialogOpen(false);
            setUploadError(null);
          }}
          onUpload={handleUpload}
          uploading={uploading}
          error={uploadError}
        />
      </Paper>
    </FeatureGate>
  );
}

/**
 * Upload Dialog Component
 */
interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, sourceType: RAGDocumentSourceType, title?: string, description?: string) => void;
  uploading: boolean;
  error: string | null;
}

function UploadDialog({ open, onClose, onUpload, uploading, error }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<RAGDocumentSourceType>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill title from filename if not set
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = () => {
    if (!file) return;
    onUpload(file, sourceType, title || undefined, description || undefined);
    // Reset form
    setFile(null);
    setTitle('');
    setDescription('');
    setSourceType('other');
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setTitle('');
      setDescription('');
      setSourceType('other');
      onClose();
    }
  };

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : '0';
  const maxSizeMB = (MAX_DOCUMENT_SIZE / 1024 / 1024).toFixed(0);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUpload />
            <Typography variant="h6">Upload Document</Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={uploading} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => {}}>
              {error}
            </Alert>
          )}

          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload />}
              fullWidth
              sx={{ py: 1.5 }}
              disabled={uploading}
            >
              {file ? file.name : 'Choose File'}
              <input
                type="file"
                hidden
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </Button>
            {file && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {fileSizeMB} MB / {maxSizeMB} MB max
              </Typography>
            )}
          </Box>

          <FormControl fullWidth>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as RAGDocumentSourceType)}
              label="Document Type"
              disabled={uploading}
            >
              <MenuItem value="policy">Policy</MenuItem>
              <MenuItem value="contract">Contract</MenuItem>
              <MenuItem value="guide">Guide</MenuItem>
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="faq">FAQ</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            fullWidth
            disabled={uploading}
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the document"
            fullWidth
            multiline
            rows={2}
            disabled={uploading}
          />

          {uploading && (
            <Box>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Uploading and processing document...
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!file || uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : <Upload />}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DocumentAttachmentPanel;
