/**
 * RAG Settings Page
 *
 * Manage RAG configuration, view usage, and test document uploads
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { Settings as SettingsIcon, Upload as UploadIcon, Dashboard as DashboardIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import UsageDashboard from '@/components/RAG/UsageDashboard';
import StorageModeSettings from '@/components/RAG/StorageModeSettings';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplication } from '@/contexts/ApplicationContext';

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
      id={`rag-tabpanel-${index}`}
      aria-labelledby={`rag-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function RAGSettingsPage() {
  const params = useParams();
  const appSlug = params?.appSlug as string;
  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Get organization ID from application context (application's org, not global org context)
  const organizationId = currentApplication?.organizationId || currentOrgId || '';

  useEffect(() => {
    // Wait for application context to load before fetching RAG config
    if (!isAppLoading && organizationId) {
      console.log('[RAG Settings] Application loaded, organizationId:', organizationId);
      console.log('[RAG Settings] currentApplication:', currentApplication);
      console.log('[RAG Settings] currentOrgId:', currentOrgId);
      loadRAGConfig();
    } else if (!isAppLoading && !organizationId) {
      console.error('[RAG Settings] Application loaded but no organizationId available');
    }
  }, [isAppLoading, organizationId]);

  const loadRAGConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[RAG Settings] Loading config for organizationId:', organizationId);
      console.log('[RAG Settings] currentApplication:', currentApplication);

      // Load config and usage
      const configResponse = await fetch(`/api/rag/config?organizationId=${organizationId}`);
      const configData = await configResponse.json();
      console.log('[RAG Settings] Config response:', configData);

      if (!configData.success) {
        throw new Error(configData.error || 'Failed to load RAG configuration');
      }

      setConfig(configData.config);
      setUsage(configData.usage);

      // Load all documents for the organization
      console.log('[RAG Settings] Fetching documents for organizationId:', organizationId);
      const docsResponse = await fetch(`/api/rag/documents?organizationId=${organizationId}`);
      const docsData = await docsResponse.json();
      console.log('[RAG Settings] Documents response:', docsData);

      if (docsData.success) {
        console.log('[RAG Settings] Setting documents:', docsData.documents?.length || 0, 'documents');
        setDocuments(docsData.documents || []);
      } else {
        console.error('[RAG Settings] Failed to load documents:', docsData.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', organizationId);
      // Use special formId for organization-wide documents
      formData.append('formId', '_organization');
      formData.append('sourceType', 'other');

      const response = await fetch('/api/rag/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        // Show detailed error information
        let errorMsg = data.error || 'Upload failed';
        if (data.requiredTier) {
          errorMsg += ` (Required tier: ${data.requiredTier})`;
        }
        if (data.requiredClusterTier) {
          errorMsg += ` (Required cluster tier: ${data.requiredClusterTier}, current: ${data.currentClusterTier})`;
        }
        throw new Error(errorMsg);
      }

      setSnackbar({
        open: true,
        message: `Document "${file.name}" uploaded successfully! Refreshing...`,
        severity: 'success',
      });

      // Reload usage data after a delay to allow processing
      setTimeout(() => {
        loadRAGConfig();
        setSnackbar({
          open: true,
          message: `Document count updated! Check the Usage Dashboard tab.`,
          severity: 'success',
        });
      }, 2000);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Upload failed',
        severity: 'error',
      });
    }
  };

  // Show loading while waiting for application context to load
  if (isAppLoading || !organizationId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadRAGConfig}>Retry</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h4" gutterBottom>
            RAG Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage knowledge base storage, usage limits, and document uploads
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadRAGConfig}
          disabled={loading}
          sx={{ mt: 1 }}
        >
          Refresh
        </Button>
      </Box>

      <Paper>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="RAG settings tabs">
          <Tab icon={<DashboardIcon />} label="Usage Dashboard" />
          <Tab icon={<UploadIcon />} label="Test Upload" />
          <Tab icon={<SettingsIcon />} label="Configuration" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Usage Dashboard Tab */}
          <TabPanel value={currentTab} index={0}>
            {config && usage && (
              <UsageDashboard
                config={config}
                usage={{
                  documentsUploaded: usage.documents?.current || 0,
                  totalStorageBytes: usage.storage?.currentBytes || 0,
                  queriesToday: usage.queries?.today || 0,
                  queriesThisMonth: usage.queries?.month || 0,
                }}
                tier={config.mode === 'platform' ? 'free' : 'team'}
              />
            )}
          </TabPanel>

          {/* Test Upload Tab */}
          <TabPanel value={currentTab} index={1}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Upload Test Document
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload a document to test RAG functionality. Supported formats: PDF, DOCX, TXT, MD
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Current Usage:</strong>
                <br />
                Documents: <strong>{usage?.documents?.current || 0}</strong> /{' '}
                {config?.limits.maxDocuments === -1 ? '∞' : config?.limits.maxDocuments}
                <br />
                Storage:{' '}
                <strong>{((usage?.storage?.currentBytes || 0) / (1024 * 1024)).toFixed(2)} MB</strong> /{' '}
                {config?.limits.maxStorageBytes === -1
                  ? '∞'
                  : (config?.limits.maxStorageBytes / (1024 * 1024)).toFixed(0) + ' MB'}
              </Alert>

              <Alert severity="success" sx={{ mb: 3 }}>
                After uploading, click the <strong>Refresh</strong> button above or switch to the{' '}
                <strong>Usage Dashboard</strong> tab to see updated document count.
              </Alert>

              <Button variant="contained" component="label" startIcon={<UploadIcon />}>
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={handleFileUpload}
                />
              </Button>

              <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
                Maximum file size: 50 MB
              </Typography>

              {/* Document List */}
              {documents.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    All Documents ({documents.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {documents.map((doc) => (
                      <Alert key={doc.documentId} severity={doc.status === 'ready' ? 'success' : doc.status === 'error' ? 'error' : 'info'} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {doc.fileName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {doc.formId === '_organization' ? 'Organization-wide' : `Form: ${doc.formId}`} • {(doc.fileSize / 1024).toFixed(1)} KB • {doc.status}
                            {doc.chunkCount && ` • ${doc.chunkCount} chunks`}
                          </Typography>
                        </Box>
                      </Alert>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Configuration Tab */}
          <TabPanel value={currentTab} index={2}>
            <StorageModeSettings
              organizationId={organizationId}
              onConfigUpdate={loadRAGConfig}
            />
          </TabPanel>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Container>
  );
}
