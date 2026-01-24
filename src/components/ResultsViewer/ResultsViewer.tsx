'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Alert,
  Collapse,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  ExpandMore,
  ExpandLess,
  Code,
  TableChart,
  ViewList,
  Visibility,
  ChevronLeft,
  ChevronRight,
  Close,
  ContentCopy,
  Check
} from '@mui/icons-material';
import { Document } from 'mongodb';
import { Pagination } from '@mui/material';
import { HelpButton } from '@/components/Help/HelpButton';

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
      id={`results-tabpanel-${index}`}
      aria-labelledby={`results-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%', overflow: 'auto' }}>{children}</Box>}
    </div>
  );
}

interface ResultsViewerProps {
  documents: Document[];
  isLoading?: boolean;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number | null;
  hasMore?: boolean;
  onPageChange?: (page: number) => void;
  connectionString?: string | null;
  databaseName?: string | null;
  collection?: string | null;
  onDocumentUpdated?: () => void;
}

export function ResultsViewer({ 
  documents, 
  isLoading,
  currentPage = 1,
  pageSize = 100,
  totalCount = null,
  hasMore = false,
  onPageChange,
  connectionString,
  databaseName,
  collection,
  onDocumentUpdated
}: ResultsViewerProps) {
  const [tabValue, setTabValue] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [jsonEditorDoc, setJsonEditorDoc] = useState<Document | null>(null);
  const [jsonEditorText, setJsonEditorText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const totalPages = totalCount !== null ? Math.ceil(totalCount / pageSize) : null;

  // Get all unique keys from all documents (for table view)
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    documents.forEach((doc) => {
      Object.keys(doc).forEach((key) => keys.add(key));
    });
    return Array.from(keys).slice(0, 15); // Limit to 15 columns for readability
  }, [documents]);

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleRowDoubleClick = (doc: Document) => {
    setJsonEditorDoc(doc);
    setJsonEditorText(JSON.stringify(doc, null, 2));
    setJsonError(null);
    setCopied(false);
    setJsonEditorOpen(true);
  };

  const handleJsonEditorClose = () => {
    setJsonEditorOpen(false);
    setJsonEditorDoc(null);
    setJsonEditorText('');
    setJsonError(null);
    setCopied(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleJsonEditorChange = (value: string) => {
    setJsonEditorText(value);
    setJsonError(null);
    try {
      JSON.parse(value);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonEditorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDocument = async () => {
    if (!connectionString || !databaseName || !collection || !jsonEditorDoc) {
      setSaveError('Missing connection information');
      return;
    }

    // Validate JSON
    let parsedDoc: any;
    try {
      parsedDoc = JSON.parse(jsonEditorText);
    } catch (e: any) {
      setJsonError(e.message);
      setSaveError('Invalid JSON - please fix syntax errors before saving');
      return;
    }

    // Extract document ID (must preserve _id)
    const documentId = jsonEditorDoc._id;
    if (!documentId) {
      setSaveError('Document must have an _id field');
      return;
    }

    // Remove _id from update (we use it in the query, not in $set)
    const { _id, ...updateFields } = parsedDoc;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/mongodb/update-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName,
          collection,
          documentId,
          updatedDocument: updateFields
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        // Update the local document in the results
        const updatedDoc = { ...parsedDoc };
        const docIndex = documents.findIndex((d) => 
          d._id?.toString() === documentId.toString()
        );
        if (docIndex !== -1 && onDocumentUpdated) {
          // Trigger refresh callback
          setTimeout(() => {
            onDocumentUpdated();
            setSaveSuccess(false);
          }, 1500);
        }
      } else {
        setSaveError(data.error || 'Failed to update document');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update document');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          bgcolor: 'background.default'
        }}
      >
        <NetPadLoader size="large" variant="ascii" message="Loading results..." />
      </Box>
    );
  }

  if (documents.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          bgcolor: 'background.default'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Run a pipeline to view results
        </Typography>
      </Box>
    );
  }

  const renderTableView = () => {
    return (
      <TableContainer sx={{ maxHeight: '100%', height: '100%' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', width: 50 }}>
                #
              </TableCell>
              {allKeys.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                  {col}
                </TableCell>
              ))}
              {allKeys.length >= 15 && (
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', width: 80 }}>
                  ...
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', width: 80 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.slice(0, 1000).map((doc, idx) => {
              const isExpanded = expandedRows.has(idx);
              return (
                <>
                  <TableRow 
                    key={idx} 
                    hover 
                    sx={{ cursor: 'pointer' }}
                    onDoubleClick={() => handleRowDoubleClick(doc)}
                  >
                    <TableCell>{idx + 1}</TableCell>
                    {allKeys.map((col) => (
                      <TableCell key={col}>
                        {doc[col] !== null && doc[col] !== undefined ? (
                          typeof doc[col] === 'object' ? (
                            <Tooltip title={JSON.stringify(doc[col])}>
                              <Chip
                                label="Object"
                                size="small"
                                sx={{
                                  bgcolor: alpha('#00ED64', 0.1),
                                  color: '#00ED64',
                                  fontSize: '0.7rem',
                                  height: 20
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {String(doc[col])}
                            </Typography>
                          )
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                    {allKeys.length >= 15 && <TableCell>...</TableCell>}
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRowExpansion(idx)}
                        sx={{ p: 0.5 }}
                      >
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={allKeys.length + 3}
                    >
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: alpha('#000', 0.02) }}>
                          <pre
                            style={{
                              margin: 0,
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: 400,
                              overflow: 'auto'
                            }}
                          >
                            {JSON.stringify(doc, null, 2)}
                          </pre>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              );
            })}
            {totalCount !== null && totalCount > documents.length && (
              <TableRow>
                <TableCell colSpan={allKeys.length + 3} align="center">
                  <Typography variant="caption" color="text.secondary">
                    Showing page {currentPage} of {totalPages} ({documents.length} documents)
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderListView = () => {
    return (
      <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
        {documents.slice(0, 500).map((doc, idx) => {
          const isExpanded = expandedRows.has(idx);
          const previewKeys = Object.keys(doc).slice(0, 5);

          return (
            <Paper
              key={idx}
              elevation={1}
              sx={{
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: alpha('#00ED64', 0.5),
                  boxShadow: 2
                }
              }}
              onDoubleClick={() => handleRowDoubleClick(doc)}
            >
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: alpha('#00ED64', 0.05),
                  cursor: 'pointer'
                }}
                onClick={() => toggleRowExpansion(idx)}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Document #{idx + 1}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {previewKeys.map((key) => (
                      <Box key={key} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: 'text.secondary'
                          }}
                        >
                          {key}:
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            color: 'text.primary',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {typeof doc[key] === 'object'
                            ? JSON.stringify(doc[key]).slice(0, 50) + '...'
                            : String(doc[key]).slice(0, 50)}
                        </Typography>
                      </Box>
                    ))}
                    {Object.keys(doc).length > 5 && (
                      <Typography variant="caption" color="text.secondary">
                        +{Object.keys(doc).length - 5} more fields
                      </Typography>
                    )}
                  </Box>
                </Box>
                <IconButton size="small">
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={isExpanded}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: alpha('#000', 0.02),
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                </Box>
              </Collapse>
            </Paper>
          );
        })}
        {totalCount !== null && totalCount > documents.length && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Showing page {currentPage} of {totalPages} ({documents.length} documents)
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderJsonView = () => {
    return (
      <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
        <pre
          style={{
            margin: 0,
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.6
          }}
        >
          {JSON.stringify(documents, null, 2)}
        </pre>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            flex: 1,
            minHeight: 48
          }}
        >
          <Tab
            icon={<TableChart sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Table"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<ViewList sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="List"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<Code sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="JSON"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
        <Box sx={{ pr: 2 }}>
          <HelpButton topicId="results-viewer" tooltip="Results Viewer Help" />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <TabPanel value={tabValue} index={0}>
            {renderTableView()}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderListView()}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderJsonView()}
          </TabPanel>
        </Box>

        {/* Pagination Controls */}
        {(totalPages !== null || hasMore) && onPageChange && (
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {totalCount !== null
                ? `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount.toLocaleString()} documents`
                : `Page ${currentPage} • ${documents.length} documents`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                startIcon={<ChevronLeft />}
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
              >
                Previous
              </Button>
              {totalPages !== null ? (
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, page) => onPageChange(page)}
                  size="small"
                  color="primary"
                  disabled={isLoading}
                  sx={{ '& .MuiPaginationItem-root': { fontSize: '0.875rem' } }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                  Page {currentPage}
                </Typography>
              )}
              <Button
                size="small"
                endIcon={<ChevronRight />}
                onClick={() => onPageChange(currentPage + 1)}
                disabled={(totalPages !== null && currentPage >= totalPages) || (!hasMore && totalPages === null) || isLoading}
              >
                Next
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* JSON Editor Modal */}
      <Dialog
        open={jsonEditorOpen}
        onClose={handleJsonEditorClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            pb: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Code sx={{ fontSize: 20, color: '#00ED64' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Document JSON Editor
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              startIcon={copied ? <Check /> : <ContentCopy />}
              onClick={handleCopyJson}
              variant="outlined"
              disabled={isSaving}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            {connectionString && databaseName && collection && (
              <Button
                size="small"
                variant="contained"
                onClick={handleSaveDocument}
                disabled={isSaving || !!jsonError || !jsonEditorDoc?._id}
                sx={{
                  bgcolor: '#00ED64',
                  '&:hover': { bgcolor: '#00D95A' }
                }}
              >
                {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
              </Button>
            )}
            <IconButton size="small" onClick={handleJsonEditorClose} disabled={isSaving}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {saveSuccess && (
            <Alert severity="success" sx={{ m: 2, mb: 0 }}>
              Document updated successfully!
            </Alert>
          )}
          {saveError && (
            <Alert severity="error" sx={{ m: 2, mb: 0 }}>
              {saveError}
            </Alert>
          )}
          {jsonError && !saveError && (
            <Alert severity="error" sx={{ m: 2, mb: 0 }}>
              Invalid JSON: {jsonError}
            </Alert>
          )}
          <TextField
            multiline
            fullWidth
            value={jsonEditorText}
            onChange={(e) => handleJsonEditorChange(e.target.value)}
            variant="outlined"
            sx={{
              flex: 1,
              '& .MuiInputBase-root': {
                height: '100%',
                fontFamily: 'monospace',
                fontSize: '13px',
                alignItems: 'flex-start',
                '& textarea': {
                  height: '100% !important',
                  overflow: 'auto !important',
                  resize: 'none'
                }
              },
              '& .MuiInputBase-input': {
                height: '100%',
                overflow: 'auto'
              }
            }}
            InputProps={{
              sx: {
                height: '100%',
                alignItems: 'flex-start',
                bgcolor: alpha('#000', 0.02)
              }
            }}
            error={!!jsonError}
            helperText={
              jsonError 
                ? 'Invalid JSON syntax' 
                : connectionString && databaseName && collection
                ? 'Edit the JSON document and click "Save Changes" to update the database.'
                : 'Edit the JSON document. Changes are not saved to the database.'
            }
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
          <Button onClick={handleJsonEditorClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
