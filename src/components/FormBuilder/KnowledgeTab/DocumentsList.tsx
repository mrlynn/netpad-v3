/**
 * Documents List Component
 *
 * Displays and manages RAG documents for a form.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  Chip,
  Tooltip,
  Alert,
  Typography,
  alpha,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  Delete,
  Description,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
} from '@mui/icons-material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { RAGDocument, RAGDocumentStatus } from '@/types/rag';
import { formatBytes, formatDate } from '@/lib/utils';

export interface DocumentsListProps {
  formId: string;
  organizationId: string;
  selectedDocuments: string[];
  onDocumentsChange: (documentIds: string[]) => void;
  onDocumentDeleted?: () => void;
}

const STATUS_CONFIG: Record<RAGDocumentStatus, {
  icon: React.ReactNode;
  color: 'success' | 'error' | 'warning' | 'default';
  label: string;
}> = {
  ready: {
    icon: <CheckCircle fontSize="small" />,
    color: 'success',
    label: 'Ready',
  },
  error: {
    icon: <ErrorIcon fontSize="small" />,
    color: 'error',
    label: 'Error',
  },
  processing: {
    icon: <HourglassEmpty fontSize="small" />,
    color: 'warning',
    label: 'Processing',
  },
  pending: {
    icon: <HourglassEmpty fontSize="small" />,
    color: 'default',
    label: 'Pending',
  },
};

export function DocumentsList({
  formId,
  organizationId,
  selectedDocuments,
  onDocumentsChange,
  onDocumentDeleted,
}: DocumentsListProps) {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [formId, organizationId]);

  // Auto-refresh while documents are processing
  useEffect(() => {
    const hasProcessingDocs = documents.some(
      (doc) => doc.status === 'processing' || doc.status === 'pending'
    );

    if (!hasProcessingDocs) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/rag/documents?formId=${formId}&organizationId=${organizationId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('[Documents] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDocument = (documentId: string) => {
    if (selectedDocuments.includes(documentId)) {
      onDocumentsChange(selectedDocuments.filter((id) => id !== documentId));
    } else {
      onDocumentsChange([...selectedDocuments, documentId]);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/rag/documents/${documentId}?organizationId=${organizationId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Remove from selected if selected
      onDocumentsChange(selectedDocuments.filter((id) => id !== documentId));

      // Reload documents
      await loadDocuments();

      // Notify parent
      onDocumentDeleted?.();
    } catch (err) {
      console.error('[Documents] Delete error:', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  if (loading && documents.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <NetPadLoader />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (documents.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Description sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Documents Yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload PDFs, DOCX, TXT, or Markdown files to provide knowledge for AI conversations.
        </Typography>
      </Box>
    );
  }

  const completedCount = documents.filter((d) => d.status === 'ready').length;
  const processingCount = documents.filter((d) =>
    d.status === 'processing' || d.status === 'pending'
  ).length;

  return (
    <Box>
      {/* Status summary */}
      {processingCount > 0 && (
        <Alert severity="info" sx={{ m: 2 }}>
          {processingCount} document{processingCount > 1 ? 's' : ''} processing...
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      )}

      {/* Documents list */}
      <List sx={{ px: 2 }}>
        {documents.map((doc) => {
          const statusConfig = STATUS_CONFIG[doc.status];
          const isSelected = selectedDocuments.includes(doc.documentId);
          const canSelect = doc.status === 'ready';

          return (
            <Paper
              key={doc.documentId}
              elevation={0}
              sx={{
                mb: 1,
                border: 1,
                borderColor: isSelected ? 'primary.main' : 'divider',
                backgroundColor: isSelected
                  ? (theme) => alpha(theme.palette.primary.main, 0.05)
                  : 'background.paper',
                '&:hover': {
                  borderColor: canSelect ? 'primary.main' : 'divider',
                  backgroundColor: canSelect
                    ? (theme) => alpha(theme.palette.primary.main, 0.08)
                    : 'background.paper',
                },
              }}
            >
              <ListItem>
                {canSelect && (
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    onChange={() => handleToggleDocument(doc.documentId)}
                    sx={{ mr: 1 }}
                  />
                )}

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description fontSize="small" color="action" />
                      <Typography variant="body1" fontWeight={500}>
                        {doc.title || doc.fileName}
                      </Typography>
                      <Chip
                        icon={statusConfig.icon as React.ReactElement}
                        label={statusConfig.label}
                        size="small"
                        color={statusConfig.color}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      {doc.description && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {doc.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(doc.fileSize)}
                        </Typography>
                        {doc.chunkCount > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {doc.chunkCount} chunks
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(doc.uploadedAt)}
                        </Typography>
                      </Box>
                      {doc.status === 'error' && doc.errorMessage && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {doc.errorMessage}
                        </Alert>
                      )}
                    </Box>
                  }
                />

                <ListItemSecondaryAction>
                  <Tooltip title="Delete document">
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete(doc.documentId)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          );
        })}
      </List>

      {/* Selection summary */}
      <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <Typography variant="body2" color="text.secondary">
          {selectedDocuments.length} of {completedCount} documents selected for RAG
        </Typography>
      </Box>
    </Box>
  );
}
