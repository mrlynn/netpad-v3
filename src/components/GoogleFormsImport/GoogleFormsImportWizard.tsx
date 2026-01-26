'use client';

/**
 * Google Forms Import Wizard
 *
 * Step-by-step wizard for importing Google Forms into NetPad.
 * Supports two import methods:
 * 1. OAuth: Connect Google account to browse and select forms
 * 2. URL: Paste a public Google Form URL to import directly
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  InputAdornment,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Collapse,
  Skeleton,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Google as GoogleIcon,
  Description as FormIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  Link as LinkIcon,
  CloudDownload as ImportIcon,
} from '@mui/icons-material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  GoogleFormListItem,
  GoogleFormsPreviewResponse,
  GoogleFormsExecuteResponse,
} from '@/types/googleFormsImport';

// ============================================
// Types
// ============================================

export interface GoogleFormsImportWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (formId: string, formName: string) => void;
  organizationId: string;
  projectId: string;
  applicationId?: string;
}

interface GoogleFormsCredential {
  credentialId: string;
  name: string;
  status: string;
  connectedEmail?: string;
  lastUsedAt?: string;
}

type ImportMethod = 'oauth' | 'url';
type WizardStep = 'method' | 'connect' | 'select' | 'preview' | 'importing' | 'complete';

// URL-based import types
interface UrlParseResponse {
  success: boolean;
  form?: {
    formId: string;
    title: string;
    description?: string;
    fieldCount: number;
    pageCount: number;
    sourceUrl: string;
  };
  preview?: {
    fields: Array<{
      path: string;
      label: string;
      type: string;
      required: boolean;
      hasOptions: boolean;
    }>;
    warnings: string[];
    statistics: {
      totalFields: number;
      mappedFields: number;
      unmappedFields: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

interface UrlImportResponse {
  success: boolean;
  form?: {
    id: string;
    name: string;
    slug: string;
    fieldCount: number;
  };
  importReport?: {
    duration: number;
    statistics: {
      totalFields: number;
      mappedFields: number;
      unmappedFields: number;
    };
    warnings: string[];
    viewUrl: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// Method Selection Step
// ============================================

interface MethodStepProps {
  onSelectMethod: (method: ImportMethod) => void;
  urlInput: string;
  onUrlChange: (url: string) => void;
  onUrlSubmit: () => void;
  urlLoading: boolean;
  urlError: string | null;
}

function MethodStep({
  onSelectMethod,
  urlInput,
  onUrlChange,
  onUrlSubmit,
  urlLoading,
  urlError,
}: MethodStepProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
        Choose how you want to import your Google Form
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        centered
        sx={{ mb: 3 }}
      >
        <Tab icon={<LinkIcon />} label="Paste URL" iconPosition="start" />
        <Tab icon={<GoogleIcon />} label="Connect Account" iconPosition="start" />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ py: 2 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Import from URL
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Paste a link to any publicly accessible Google Form. No Google account connection required.
            </Typography>

            <TextField
              fullWidth
              placeholder="https://docs.google.com/forms/d/..."
              value={urlInput}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onUrlSubmit()}
              disabled={urlLoading}
              error={!!urlError}
              helperText={urlError || 'Paste your Google Forms URL here'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: urlLoading ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ) : null,
              }}
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              startIcon={<ImportIcon />}
              onClick={onUrlSubmit}
              disabled={!urlInput.trim() || urlLoading}
            >
              {urlLoading ? 'Analyzing Form...' : 'Import from URL'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                The form must be publicly accessible (anyone with the link can view).
                We extract the form structure directly from the public page.
              </Typography>
            </Alert>
          </Paper>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ py: 2 }}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <GoogleIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Connect Google Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Connect your Google account to browse all your forms, including private ones.
              We only request read-only access to your forms.
            </Typography>

            <Button
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={() => onSelectMethod('oauth')}
            >
              Connect with Google
            </Button>

            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="caption" color="text.secondary" component="div">
                Benefits of connecting:
              </Typography>
              <List dense disablePadding>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Import private forms"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Browse all your forms in one place"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Better field type detection"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

// ============================================
// URL Preview Step
// ============================================

interface UrlPreviewStepProps {
  parseResult: UrlParseResponse | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onImport: () => void;
}

function UrlPreviewStep({
  parseResult,
  loading,
  error,
  onBack,
  onImport,
}: UrlPreviewStepProps) {
  const [showWarnings, setShowWarnings] = useState(false);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <NetPadLoader message="Analyzing form structure..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!parseResult || !parseResult.form || !parseResult.preview) {
    return null;
  }

  const { form, preview } = parseResult;

  return (
    <Box sx={{ p: 2 }}>
      {/* Form Info */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {form.title}
        </Typography>
        {form.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {form.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`${form.fieldCount} fields`}
            color="primary"
            variant="outlined"
          />
          <Chip
            size="small"
            icon={<CheckIcon />}
            label={`${preview.statistics.mappedFields} mapped`}
            color="success"
            variant="outlined"
          />
          {preview.statistics.unmappedFields > 0 && (
            <Chip
              size="small"
              icon={<WarningIcon />}
              label={`${preview.statistics.unmappedFields} need review`}
              color="warning"
              variant="outlined"
            />
          )}
          {form.pageCount > 1 && (
            <Chip
              size="small"
              label={`${form.pageCount} pages`}
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Field Mapping Table */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Field Mapping Preview
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Field</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="center">Required</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {preview.fields.map((field) => (
              <TableRow key={field.path}>
                <TableCell>{field.label}</TableCell>
                <TableCell>
                  <Chip size="small" label={field.type} />
                </TableCell>
                <TableCell align="center">
                  {field.required ? (
                    <CheckIcon color="primary" fontSize="small" />
                  ) : (
                    <Typography color="text.disabled">—</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            startIcon={showWarnings ? <CollapseIcon /> : <ExpandIcon />}
            onClick={() => setShowWarnings(!showWarnings)}
            color="warning"
          >
            {preview.warnings.length} Warning{preview.warnings.length !== 1 ? 's' : ''}
          </Button>
          <Collapse in={showWarnings}>
            <Paper variant="outlined" sx={{ mt: 1, p: 1 }}>
              <List dense disablePadding>
                {preview.warnings.map((warning, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={warning}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Collapse>
        </Box>
      )}

      <Alert severity="info" icon={<LinkIcon />}>
        <Typography variant="body2">
          Importing from: <strong>{form.sourceUrl}</strong>
        </Typography>
      </Alert>
    </Box>
  );
}

// ============================================
// OAuth Connect Step
// ============================================

interface ConnectStepProps {
  organizationId: string;
  credentials: GoogleFormsCredential[];
  loading: boolean;
  onSelectCredential: (credentialId: string) => void;
  onConnectNew: () => void;
  onBack: () => void;
}

function ConnectStep({
  organizationId,
  credentials,
  loading,
  onSelectCredential,
  onConnectNew,
  onBack,
}: ConnectStepProps) {
  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <NetPadLoader message="Loading connections..." />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {credentials.length > 0 ? (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Select a Google account to import forms from:
          </Typography>
          <List>
            {credentials.map((cred) => (
              <ListItem key={cred.credentialId} disablePadding>
                <ListItemButton onClick={() => onSelectCredential(cred.credentialId)}>
                  <ListItemIcon>
                    <GoogleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={cred.connectedEmail || cred.name}
                    secondary={cred.status === 'active' ? 'Connected' : 'Reconnect required'}
                  />
                  <ArrowIcon color="action" />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
        </>
      ) : null}

      <Box sx={{ textAlign: 'center', py: 3 }}>
        <GoogleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body1" sx={{ mb: 2 }}>
          {credentials.length > 0
            ? 'Or connect a different Google account'
            : 'Connect your Google account to import forms'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We only request read-only access to your forms.
          <br />
          We never access your responses or other data.
        </Typography>
        <Button
          variant="contained"
          startIcon={<GoogleIcon />}
          onClick={onConnectNew}
        >
          Connect Google Account
        </Button>
      </Box>
    </Box>
  );
}

// ============================================
// OAuth Select Form Step
// ============================================

interface SelectFormStepProps {
  organizationId: string;
  credentialId: string;
  onSelectForm: (formId: string) => void;
  onBack: () => void;
}

function SelectFormStep({
  organizationId,
  credentialId,
  onSelectForm,
  onBack,
}: SelectFormStepProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<GoogleFormListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  const loadForms = useCallback(async (query?: string, pageToken?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        orgId: organizationId,
        credentialId,
        pageSize: '20',
      });
      if (query) params.set('q', query);
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(`/api/integrations/google-forms?${params}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to load forms');
      }

      const data = await response.json();
      setForms(pageToken ? [...forms, ...data.forms] : data.forms);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, [organizationId, credentialId, forms]);

  useEffect(() => {
    loadForms();
  }, []);

  const handleSearch = useCallback(() => {
    loadForms(searchQuery);
  }, [loadForms, searchQuery]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search forms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <IconButton onClick={() => loadForms(searchQuery)}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && forms.length === 0 ? (
        <Box sx={{ p: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      ) : forms.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <FormIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            No Google Forms found in your account
          </Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {forms.map((form) => (
            <ListItem key={form.id} disablePadding>
              <ListItemButton onClick={() => onSelectForm(form.id)}>
                <ListItemIcon>
                  <FormIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={form.name}
                  secondary={
                    form.modifiedTime
                      ? `Modified ${new Date(form.modifiedTime).toLocaleDateString()}`
                      : undefined
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (form.webViewLink) {
                        window.open(form.webViewLink, '_blank');
                      }
                    }}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItemButton>
            </ListItem>
          ))}
          {nextPageToken && (
            <ListItem>
              <Button
                fullWidth
                onClick={() => loadForms(searchQuery, nextPageToken)}
                disabled={loading}
              >
                Load More
              </Button>
            </ListItem>
          )}
        </List>
      )}
    </Box>
  );
}

// ============================================
// OAuth Preview Step
// ============================================

interface OAuthPreviewStepProps {
  previewData: GoogleFormsPreviewResponse | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onImport: () => void;
}

function OAuthPreviewStep({
  previewData,
  loading,
  error,
  onBack,
  onImport,
}: OAuthPreviewStepProps) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [showUnsupported, setShowUnsupported] = useState(false);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <NetPadLoader message="Analyzing form structure..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!previewData) {
    return null;
  }

  const { sourceForm, mappingResult, previewConfig } = previewData;
  const { statistics, warnings, unsupportedItems } = mappingResult;

  return (
    <Box sx={{ p: 2 }}>
      {/* Form Info */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {sourceForm.title}
        </Typography>
        {sourceForm.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {sourceForm.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`${sourceForm.itemCount} items`}
            color="primary"
            variant="outlined"
          />
          <Chip
            size="small"
            icon={<CheckIcon />}
            label={`${statistics.mappedFields} mapped`}
            color="success"
            variant="outlined"
          />
          {statistics.approximateMappings > 0 && (
            <Chip
              size="small"
              icon={<WarningIcon />}
              label={`${statistics.approximateMappings} approximate`}
              color="warning"
              variant="outlined"
            />
          )}
          {statistics.unsupportedCount > 0 && (
            <Chip
              size="small"
              icon={<ErrorIcon />}
              label={`${statistics.unsupportedCount} unsupported`}
              color="error"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Field Mapping Table */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Field Mapping Preview
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Google Forms Field</TableCell>
              <TableCell>NetPad Type</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {previewConfig.fieldConfigs.map((field) => (
              <TableRow key={field.path}>
                <TableCell>{field.label}</TableCell>
                <TableCell>
                  <Chip size="small" label={field.type} />
                </TableCell>
                <TableCell align="center">
                  {field._importSource?.mappingConfidence === 'exact' ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : (
                    <WarningIcon color="warning" fontSize="small" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            startIcon={showWarnings ? <CollapseIcon /> : <ExpandIcon />}
            onClick={() => setShowWarnings(!showWarnings)}
            color="warning"
          >
            {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
          </Button>
          <Collapse in={showWarnings}>
            <Paper variant="outlined" sx={{ mt: 1, p: 1 }}>
              <List dense disablePadding>
                {warnings.map((warning, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={warning.message}
                      secondary={warning.suggestion}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Collapse>
        </Box>
      )}

      {/* Unsupported Items */}
      {unsupportedItems.length > 0 && (
        <Box>
          <Button
            size="small"
            startIcon={showUnsupported ? <CollapseIcon /> : <ExpandIcon />}
            onClick={() => setShowUnsupported(!showUnsupported)}
            color="error"
          >
            {unsupportedItems.length} Unsupported Item{unsupportedItems.length !== 1 ? 's' : ''}
          </Button>
          <Collapse in={showUnsupported}>
            <Paper variant="outlined" sx={{ mt: 1, p: 1 }}>
              <List dense disablePadding>
                {unsupportedItems.map((item, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ErrorIcon color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.itemTitle || item.itemId}
                      secondary={item.reason}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

// ============================================
// Complete Step
// ============================================

interface CompleteStepProps {
  result: GoogleFormsExecuteResponse | UrlImportResponse | null;
  importMethod: ImportMethod;
  onClose: () => void;
  onOpenForm: () => void;
}

function CompleteStep({ result, importMethod, onClose, onOpenForm }: CompleteStepProps) {
  if (!result?.success) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Import Failed
        </Typography>
        <Typography color="text.secondary">
          {result?.error?.message || 'An unknown error occurred'}
        </Typography>
      </Box>
    );
  }

  const form = result.form;
  const report = importMethod === 'oauth'
    ? (result as GoogleFormsExecuteResponse).importReport
    : (result as UrlImportResponse).importReport;

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Import Complete!
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        "{form?.name}" has been imported to NetPad.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, textAlign: 'left' }}>
        <Typography variant="subtitle2" gutterBottom>
          Summary
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Fields imported:
          </Typography>
          <Typography variant="body2">
            {form?.fieldCount || 0}
          </Typography>
          {report && 'statistics' in report && (
            <>
              <Typography variant="body2" color="text.secondary">
                Successfully mapped:
              </Typography>
              <Typography variant="body2">{report.statistics.mappedFields}</Typography>
            </>
          )}
          {report && 'mappingStatistics' in report && (
            <>
              <Typography variant="body2" color="text.secondary">
                Exact mappings:
              </Typography>
              <Typography variant="body2">{report.mappingStatistics.exactMappings}</Typography>
            </>
          )}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="outlined" onClick={onClose}>
          Done
        </Button>
        <Button variant="contained" onClick={onOpenForm}>
          Open in Editor
        </Button>
      </Box>
    </Box>
  );
}

// ============================================
// Main Wizard Component
// ============================================

export function GoogleFormsImportWizard({
  open,
  onClose,
  onComplete,
  organizationId,
  projectId,
  applicationId,
}: GoogleFormsImportWizardProps) {
  const [activeStep, setActiveStep] = useState<WizardStep>('method');
  const [importMethod, setImportMethod] = useState<ImportMethod>('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL import state
  const [urlInput, setUrlInput] = useState('');
  const [urlParseResult, setUrlParseResult] = useState<UrlParseResponse | null>(null);
  const [urlImportResult, setUrlImportResult] = useState<UrlImportResponse | null>(null);

  // OAuth import state
  const [credentials, setCredentials] = useState<GoogleFormsCredential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<GoogleFormsPreviewResponse | null>(null);
  const [oauthImportResult, setOauthImportResult] = useState<GoogleFormsExecuteResponse | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Reset to initial state
      setActiveStep('method');
      setImportMethod('url');
      setUrlInput('');
      setUrlParseResult(null);
      setUrlImportResult(null);
      setSelectedCredentialId(null);
      setSelectedFormId(null);
      setPreviewData(null);
      setOauthImportResult(null);
      setError(null);
    }
  }, [open]);

  // Load OAuth credentials when switching to OAuth method
  const loadCredentials = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/integrations/google-forms?orgId=${organizationId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle URL parsing
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/google-forms/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data: UrlParseResponse = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to parse form');
        return;
      }

      setUrlParseResult(data);
      setActiveStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse form');
    } finally {
      setLoading(false);
    }
  };

  // Handle URL import
  const handleUrlImport = async () => {
    if (!urlParseResult?.form) return;

    setActiveStep('importing');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/google-forms/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          orgId: organizationId,
          projectId,
          applicationId,
        }),
      });

      const data: UrlImportResponse = await response.json();
      setUrlImportResult(data);
      setActiveStep('complete');

      if (data.success && data.form && onComplete) {
        onComplete(data.form.id, data.form.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setUrlImportResult({
        success: false,
        error: { code: 'IMPORT_FAILED', message: 'Import failed' },
      });
      setActiveStep('complete');
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth method selection
  const handleSelectMethod = async (method: ImportMethod) => {
    setImportMethod(method);
    if (method === 'oauth') {
      setActiveStep('connect');
      await loadCredentials();
    }
  };

  const handleConnectNew = () => {
    const authUrl = `/api/auth/google?provider=google_forms&orgId=${organizationId}&name=Google%20Forms%20Import`;
    window.location.href = authUrl;
  };

  const handleSelectCredential = (credentialId: string) => {
    setSelectedCredentialId(credentialId);
    setActiveStep('select');
  };

  const handleSelectForm = async (formId: string) => {
    setSelectedFormId(formId);
    setActiveStep('preview');
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        orgId: organizationId,
        credentialId: selectedCredentialId!,
        formId,
      });

      const response = await fetch(`/api/integrations/google-forms/preview?${params}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to preview form');
      }

      const data = await response.json();
      setPreviewData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview form');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthImport = async () => {
    if (!selectedCredentialId || !selectedFormId) return;

    setActiveStep('importing');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/google-forms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organizationId,
          credentialId: selectedCredentialId,
          formId: selectedFormId,
          projectId,
          applicationId,
        }),
      });

      const data = await response.json();
      setOauthImportResult(data);
      setActiveStep('complete');

      if (data.success && onComplete) {
        onComplete(data.form.id, data.form.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setOauthImportResult({
        success: false,
        error: { code: 'IMPORT_FAILED', message: 'Import failed' },
        importReport: {
          duration: 0,
          mappingStatistics: { totalItems: 0, mappedFields: 0, exactMappings: 0, approximateMappings: 0, unsupportedCount: 0, pageCount: 0 },
          warnings: [],
          viewUrl: '',
        },
      });
      setActiveStep('complete');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    const viewUrl = importMethod === 'oauth'
      ? oauthImportResult?.importReport?.viewUrl
      : urlImportResult?.importReport?.viewUrl;
    if (viewUrl) {
      window.location.href = viewUrl;
    }
  };

  const handleBack = () => {
    setError(null);
    if (activeStep === 'preview') {
      if (importMethod === 'url') {
        setActiveStep('method');
        setUrlParseResult(null);
      } else {
        setActiveStep('select');
        setPreviewData(null);
      }
    } else if (activeStep === 'select') {
      setActiveStep('connect');
    } else if (activeStep === 'connect') {
      setActiveStep('method');
    }
  };

  // Calculate stepper index
  const getStepIndex = (): number => {
    if (importMethod === 'url') {
      switch (activeStep) {
        case 'method': return 0;
        case 'preview': return 1;
        case 'importing': return 2;
        case 'complete': return 3;
        default: return 0;
      }
    } else {
      switch (activeStep) {
        case 'method':
        case 'connect': return 0;
        case 'select': return 1;
        case 'preview':
        case 'importing': return 2;
        case 'complete': return 3;
        default: return 0;
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: 500 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Import from Google Forms</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Stepper activeStep={getStepIndex()} sx={{ px: 3 }}>
        <Step>
          <StepLabel>{importMethod === 'oauth' ? 'Connect' : 'Source'}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{importMethod === 'oauth' ? 'Select Form' : 'Preview'}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{importMethod === 'oauth' ? 'Preview & Import' : 'Import'}</StepLabel>
        </Step>
        <Step>
          <StepLabel>Complete</StepLabel>
        </Step>
      </Stepper>

      <DialogContent sx={{ p: 0 }}>
        {error && activeStep !== 'complete' && (
          <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Method Selection */}
        {activeStep === 'method' && (
          <MethodStep
            onSelectMethod={handleSelectMethod}
            urlInput={urlInput}
            onUrlChange={setUrlInput}
            onUrlSubmit={handleUrlSubmit}
            urlLoading={loading}
            urlError={error}
          />
        )}

        {/* URL Preview */}
        {activeStep === 'preview' && importMethod === 'url' && (
          <UrlPreviewStep
            parseResult={urlParseResult}
            loading={loading}
            error={error}
            onBack={handleBack}
            onImport={handleUrlImport}
          />
        )}

        {/* OAuth Connect */}
        {activeStep === 'connect' && (
          <ConnectStep
            organizationId={organizationId}
            credentials={credentials}
            loading={loading}
            onSelectCredential={handleSelectCredential}
            onConnectNew={handleConnectNew}
            onBack={handleBack}
          />
        )}

        {/* OAuth Select Form */}
        {activeStep === 'select' && selectedCredentialId && (
          <SelectFormStep
            organizationId={organizationId}
            credentialId={selectedCredentialId}
            onSelectForm={handleSelectForm}
            onBack={handleBack}
          />
        )}

        {/* OAuth Preview */}
        {activeStep === 'preview' && importMethod === 'oauth' && (
          <OAuthPreviewStep
            previewData={previewData}
            loading={loading}
            error={error}
            onBack={handleBack}
            onImport={handleOAuthImport}
          />
        )}

        {/* Importing */}
        {activeStep === 'importing' && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NetPadLoader message="Importing form..." />
          </Box>
        )}

        {/* Complete */}
        {activeStep === 'complete' && (
          <CompleteStep
            result={importMethod === 'oauth' ? oauthImportResult : urlImportResult}
            importMethod={importMethod}
            onClose={onClose}
            onOpenForm={handleOpenForm}
          />
        )}
      </DialogContent>

      {/* Action buttons */}
      {activeStep !== 'importing' && activeStep !== 'complete' && activeStep !== 'method' && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
          {activeStep === 'preview' && (
            <Button
              variant="contained"
              onClick={importMethod === 'url' ? handleUrlImport : handleOAuthImport}
              disabled={loading || (importMethod === 'url' ? !urlParseResult?.success : !previewData?.mappingResult.success)}
            >
              Import Form
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}
