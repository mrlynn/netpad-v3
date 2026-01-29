/**
 * Knowledge Tab Component
 *
 * Unified interface for managing both Documents (unstructured) and FAQs (structured)
 * knowledge for conversational forms with RAG.
 *
 * Phase 1: Knowledge Foundation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  Alert,
  Chip,
  alpha,
} from '@mui/material';
import {
  Description,
  QuestionAnswer,
  Add,
  CloudUpload,
} from '@mui/icons-material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { FeatureGate } from '@/components/common/FeatureGate';

// Sub-components (to be created)
import { DocumentsList } from './KnowledgeTab/DocumentsList';
import { FAQsList } from './KnowledgeTab/FAQsList';
import { DocumentUploadDialog } from './KnowledgeTab/DocumentUploadDialog';
import { FAQEditorDialog } from './KnowledgeTab/FAQEditorDialog';

/**
 * Props for KnowledgeTab
 */
export interface KnowledgeTabProps {
  /** Form ID */
  formId: string;
  /** Organization ID */
  organizationId: string;
  /** Whether RAG is enabled for this form */
  ragEnabled: boolean;
  /** Currently selected document IDs */
  selectedDocuments: string[];
  /** Callback when selected documents change */
  onDocumentsChange: (documentIds: string[]) => void;
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
      id={`knowledge-tabpanel-${index}`}
      aria-labelledby={`knowledge-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

/**
 * Knowledge Tab Component
 *
 * Provides unified interface for:
 * - Document Knowledge (PDFs, DOCX, TXT, MD)
 * - FAQ Knowledge (structured Q&A pairs)
 * - Upload and manage both knowledge types
 * - Select documents for RAG retrieval
 */
export function KnowledgeTab({
  formId,
  organizationId,
  ragEnabled,
  selectedDocuments,
  onDocumentsChange,
}: KnowledgeTabProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const [faqEditorOpen, setFaqEditorOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | undefined>(undefined);
  const [faqRefreshTrigger, setFaqRefreshTrigger] = useState(0);

  // Document stats
  const [documentCount, setDocumentCount] = useState(0);
  const [faqCount, setFaqCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load stats when component mounts
  useEffect(() => {
    if (ragEnabled && formId && organizationId) {
      loadStats();
    }
  }, [formId, organizationId, ragEnabled]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load document count
      const docResponse = await fetch(
        `/api/rag/documents?formId=${formId}&organizationId=${organizationId}`
      );
      if (docResponse.ok) {
        const docData = await docResponse.json();
        setDocumentCount(docData.documents?.length || 0);
      }

      // Load FAQ count
      const faqResponse = await fetch(
        `/api/rag/faqs?formId=${formId}&organizationId=${organizationId}`
      );
      if (faqResponse.ok) {
        const faqData = await faqResponse.json();
        setFaqCount(faqData.faqs?.length || 0);
      }
    } catch (error) {
      console.error('[Knowledge] Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleDocumentUploaded = useCallback(() => {
    loadStats();
    setDocumentUploadOpen(false);
  }, []);

  const handleFAQSaved = useCallback(() => {
    loadStats();
    setFaqEditorOpen(false);
    setEditingFaqId(undefined);
    setFaqRefreshTrigger(prev => prev + 1); // Trigger FAQ list refresh
  }, []);

  // Feature gate wrapper
  if (!ragEnabled) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          RAG Knowledge features are not enabled for this form.
          Enable conversational mode with RAG in the Form Settings to use this tab.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Knowledge Base
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage documents and FAQs for AI-powered conversations
            </Typography>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {currentTab === 0 && (
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={() => setDocumentUploadOpen(true)}
                size="small"
              >
                Upload Document
              </Button>
            )}
            {currentTab === 1 && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setEditingFaqId(undefined);
                  setFaqEditorOpen(true);
                }}
                size="small"
              >
                New FAQ
              </Button>
            )}
          </Box>
        </Box>

        {/* Stats chips */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={<Description />}
            label={`${documentCount} Documents`}
            size="small"
            color={currentTab === 0 ? 'primary' : 'default'}
            variant={currentTab === 0 ? 'filled' : 'outlined'}
          />
          <Chip
            icon={<QuestionAnswer />}
            label={`${faqCount} FAQs`}
            size="small"
            color={currentTab === 1 ? 'primary' : 'default'}
            variant={currentTab === 1 ? 'filled' : 'outlined'}
          />
        </Box>
      </Paper>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        aria-label="knowledge base tabs"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Tab
          icon={<Description />}
          iconPosition="start"
          label="Documents"
          id="knowledge-tab-0"
          aria-controls="knowledge-tabpanel-0"
        />
        <Tab
          icon={<QuestionAnswer />}
          iconPosition="start"
          label="FAQs"
          id="knowledge-tab-1"
          aria-controls="knowledge-tabpanel-1"
        />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={currentTab} index={0}>
          <DocumentsList
            formId={formId}
            organizationId={organizationId}
            selectedDocuments={selectedDocuments}
            onDocumentsChange={onDocumentsChange}
            onDocumentDeleted={loadStats}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <FAQsList
            formId={formId}
            organizationId={organizationId}
            onFAQDeleted={loadStats}
            onFAQUpdated={loadStats}
            refreshTrigger={faqRefreshTrigger}
            onFAQEdit={(faqId) => {
              setEditingFaqId(faqId);
              setFaqEditorOpen(true);
            }}
          />
        </TabPanel>
      </Box>

      {/* Dialogs */}
      {documentUploadOpen && (
        <DocumentUploadDialog
          open={documentUploadOpen}
          onClose={() => setDocumentUploadOpen(false)}
          formId={formId}
          organizationId={organizationId}
          onUploaded={handleDocumentUploaded}
        />
      )}

      {faqEditorOpen && (
        <FAQEditorDialog
          open={faqEditorOpen}
          onClose={() => {
            setFaqEditorOpen(false);
            setEditingFaqId(undefined);
          }}
          formId={formId}
          organizationId={organizationId}
          faqId={editingFaqId}
          onSaved={handleFAQSaved}
        />
      )}
    </Box>
  );
}
