/**
 * Knowledge Base Configuration Modal
 *
 * Enterprise-grade interface for managing RAG documents and retrieval settings.
 * Replaces the inline sidebar implementation with a dedicated, spacious modal.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  LinearProgress,
  Tooltip,
  alpha,
  Divider,
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Description,
  Delete,
  Settings as SettingsIcon,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
  Tune,
  UploadFile,
} from '@mui/icons-material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { RAGDocument, RAGDocumentSourceType, RAGDocumentStatus } from '@/types/rag';
import { MAX_DOCUMENT_SIZE, SUPPORTED_MIME_TYPES } from '@/types/rag';

/**
 * Props for KnowledgeBaseModal
 */
export interface KnowledgeBaseModalProps {
  open: boolean;
  onClose: () => void;
  formId: string;
  organizationId: string;
  selectedDocuments: string[];
  onDocumentsChange: (documentIds: string[]) => void;
  retrievalConfig?: {
    maxChunks?: number;
    minScore?: number;
    retrievalThreshold?: number;
  };
  onRetrievalConfigChange?: (config: {
    maxChunks: number;
    minScore: number;
    retrievalThreshold: number;
  }) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`kb-tabpanel-${index}`}
      aria-labelledby={`kb-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Knowledge Base Configuration Modal
 *
 * Provides a comprehensive interface for:
 * - Document upload and management
 * - Document selection for RAG
 * - Retrieval configuration (max chunks, min score, threshold)
 * - Visual status indicators and metadata
 */
export function KnowledgeBaseModal({
  open,
  onClose,
  formId,
  organizationId,
  selectedDocuments,
  onDocumentsChange,
  retrievalConfig,
  onRetrievalConfigChange,
}: KnowledgeBaseModalProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Retrieval settings state
  const [maxChunks, setMaxChunks] = useState(retrievalConfig?.maxChunks ?? 5);
  const [minScore, setMinScore] = useState(retrievalConfig?.minScore ?? 0.7);
  const [retrievalThreshold, setRetrievalThreshold] = useState(
    retrievalConfig?.retrievalThreshold ?? 0.5
  );

  // Load documents when modal opens
  useEffect(() => {
    if (open && formId && organizationId) {
      loadDocuments();
    }
  }, [open, formId, organizationId]);

  // Auto-refresh while documents are processing
  useEffect(() => {
    if (!open) return;

    const hasProcessingDocs = documents.some(
      (doc) => doc.status === 'processing' || doc.status === 'pending'
    );

    if (!hasProcessingDocs) return;

    // Poll every 3 seconds while processing
    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [open, documents]);

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

  const handleSelectAll = () => {
    const readyDocs = documents.filter((doc) => doc.status === 'ready').map((doc) => doc.documentId);
    onDocumentsChange(readyDocs);
  };

  const handleDeselectAll = () => {
    onDocumentsChange([]);
  };

  const handleSaveRetrievalConfig = () => {
    if (onRetrievalConfigChange) {
      onRetrievalConfigChange({
        maxChunks,
        minScore,
        retrievalThreshold,
      });
    }
  };

  const getStatusIcon = (status: RAGDocumentStatus) => {
    switch (status) {
      case 'ready':
        return <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 20, color: 'error.main' }} />;
      case 'processing':
        return <NetPadLoader size="small" variant="svg" showPhrases={false} />;
      default:
        return <HourglassEmpty sx={{ fontSize: 20, color: 'text.disabled' }} />;
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

  const readyDocCount = documents.filter((doc) => doc.status === 'ready').length;
  const selectedCount = selectedDocuments.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '70vh',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Knowledge Base Configuration
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
          Manage documents and retrieval settings for AI-powered responses
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <UploadFile sx={{ fontSize: 18 }} />
                Documents
                <Chip
                  label={`${selectedCount}/${readyDocCount}`}
                  size="small"
                  color={selectedCount > 0 ? 'primary' : 'default'}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tune sx={{ fontSize: 18 }} />
                Retrieval Settings
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ px: 3 }}>
          <TabPanel value={currentTab} index={0}>
            {/* Documents Tab */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Knowledge Documents
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Upload and select documents to provide context for AI responses
                </Typography>
              </Box>
              <Button
                startIcon={<CloudUpload />}
                variant="contained"
                onClick={() => setUploadDialogOpen(true)}
                size="medium"
              >
                Upload Document
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <NetPadLoader size="large" variant="ascii" message="Loading documents..." />
              </Box>
            ) : documents.length === 0 ? (
              <Paper
                sx={{
                  p: 6,
                  textAlign: 'center',
                  bgcolor: alpha('#2196f3', 0.03),
                  border: '2px dashed',
                  borderColor: 'divider',
                }}
              >
                <CloudUpload sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Documents Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Upload documents to provide knowledge context for AI responses
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  Upload Your First Document
                </Button>
              </Paper>
            ) : (
              <>
                {/* Bulk Actions */}
                <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Bulk actions:
                  </Typography>
                  <Button size="small" onClick={handleSelectAll} disabled={readyDocCount === 0}>
                    Select All Ready
                  </Button>
                  <Button size="small" onClick={handleDeselectAll} disabled={selectedCount === 0}>
                    Deselect All
                  </Button>
                </Box>

                {/* Document List */}
                <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  {documents.map((doc) => {
                    const isSelected = selectedDocuments.includes(doc.documentId);
                    const isReady = doc.status === 'ready';

                    return (
                      <ListItem
                        key={doc.documentId}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          bgcolor: isSelected ? alpha('#2196f3', 0.05) : 'transparent',
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                          '&:hover': {
                            bgcolor: isSelected ? alpha('#2196f3', 0.08) : alpha('#000', 0.02),
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, minWidth: 40 }}>
                          {getStatusIcon(doc.status)}
                        </Box>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body1" sx={{ fontWeight: isSelected ? 600 : 500 }}>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip
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
                                  <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
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
                              sx={{ minWidth: 90 }}
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

                {/* Info Alert */}
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Supported formats:</strong> PDF, DOCX, TXT, MD (max 5MB per file)
                    <br />
                    <strong>Selected documents:</strong> {selectedCount} of {readyDocCount} ready documents will be used for AI responses
                  </Typography>
                </Alert>
              </>
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {/* Retrieval Settings Tab */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Retrieval Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Fine-tune how the AI retrieves and uses knowledge from your documents
              </Typography>

              <Paper sx={{ p: 3, bgcolor: alpha('#2196f3', 0.03), border: 1, borderColor: 'divider' }}>
                {/* Max Chunks */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Maximum Chunks per Query
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Number of document chunks to retrieve for each question. More chunks provide more context but may include less relevant information.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Slider
                      value={maxChunks}
                      onChange={(_, value) => setMaxChunks(value as number)}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      value={maxChunks}
                      onChange={(e) => setMaxChunks(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
                      type="number"
                      size="small"
                      sx={{ width: 80 }}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Min Score */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Minimum Relevance Score
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Minimum similarity score (0.0 - 1.0) for a chunk to be included. Higher values ensure more relevant results but may miss useful context.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Slider
                      value={minScore}
                      onChange={(_, value) => setMinScore(value as number)}
                      min={0}
                      max={1}
                      step={0.05}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => value.toFixed(2)}
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      value={minScore.toFixed(2)}
                      onChange={(e) => setMinScore(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.7)))}
                      type="number"
                      size="small"
                      sx={{ width: 80 }}
                      inputProps={{ min: 0, max: 1, step: 0.05 }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Retrieval Threshold */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Retrieval Trigger Threshold
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Confidence threshold (0.0 - 1.0) to trigger knowledge retrieval. Lower values retrieve more often, higher values only when very confident.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Slider
                      value={retrievalThreshold}
                      onChange={(_, value) => setRetrievalThreshold(value as number)}
                      min={0}
                      max={1}
                      step={0.05}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => value.toFixed(2)}
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      value={retrievalThreshold.toFixed(2)}
                      onChange={(e) => setRetrievalThreshold(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5)))}
                      type="number"
                      size="small"
                      sx={{ width: 80 }}
                      inputProps={{ min: 0, max: 1, step: 0.05 }}
                    />
                  </Box>
                </Box>
              </Paper>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Recommended settings:</strong>
                  <br />
                  • General knowledge: Max Chunks = 5, Min Score = 0.7, Threshold = 0.5
                  <br />
                  • Precise answers: Max Chunks = 3, Min Score = 0.8, Threshold = 0.7
                  <br />
                  • Broad context: Max Chunks = 8, Min Score = 0.6, Threshold = 0.3
                </Typography>
              </Alert>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  onClick={handleSaveRetrievalConfig}
                >
                  Apply Settings
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {selectedCount} document{selectedCount !== 1 ? 's' : ''} selected
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        formId={formId}
        organizationId={organizationId}
        onUploadComplete={loadDocuments}
      />
    </Dialog>
  );
}

/**
 * Upload Dialog Component
 */
interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  formId: string;
  organizationId: string;
  onUploadComplete: () => void;
}

function UploadDialog({ open, onClose, formId, organizationId, onUploadComplete }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<RAGDocumentSourceType>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      // Auto-fill title from filename if not set
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Validate file size
      if (file.size > MAX_DOCUMENT_SIZE) {
        const maxMB = MAX_DOCUMENT_SIZE / 1024 / 1024;
        throw new Error(`File too large. Maximum size is ${maxMB}MB`);
      }

      // Validate MIME type with markdown fallback
      const isMarkdown = file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown');
      const isSupportedMimeType = SUPPORTED_MIME_TYPES.includes(file.type as any);

      if (!isSupportedMimeType && !isMarkdown) {
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

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setSourceType('other');

      // Notify parent to refresh document list
      await onUploadComplete();

      // Wait a moment to ensure the document appears in the list
      await new Promise(resolve => setTimeout(resolve, 500));

      // Close dialog
      onClose();
    } catch (error) {
      console.error('[RAG] Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setTitle('');
      setDescription('');
      setSourceType('other');
      setError(null);
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
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFile />}
              fullWidth
              sx={{ py: 1.5 }}
              disabled={uploading}
            >
              {file ? file.name : 'Choose File'}
              <input
                type="file"
                hidden
                accept=".pdf,.docx,.doc,.txt,.md,.markdown"
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
          onClick={handleUpload}
          variant="contained"
          disabled={!file || uploading}
          startIcon={uploading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <CloudUpload />}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default KnowledgeBaseModal;
