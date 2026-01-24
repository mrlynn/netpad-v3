'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Button,
  TextField,
  InputAdornment,
  alpha,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  FormControl,
  Select,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  CardActions,
  Grid,
  Collapse,
  Drawer,
  Snackbar,
} from '@mui/material';
import {
  Refresh,
  Search,
  Download,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  ContentCopy,
  Storage,
  ArrowUpward,
  ArrowDownward,
  Add,
  TableChart,
  ViewModule,
  Code,
  ExpandMore,
  ExpandLess,
  Close,
  Check,
  Upload,
  ViewList,
  Settings,
  Create,
} from '@mui/icons-material';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { usePipeline } from '@/contexts/PipelineContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ConnectionPanel } from '@/components/ConnectionPanel/ConnectionPanel';
import { ExportDialog } from '@/components/DataExport';
import { SchemaAwareDocumentEditor } from './SchemaAwareDocumentEditor';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { DataViewRowDetailDrawer } from './DataViewRowDetailDrawer';
import { DataViewEditorDialog } from './DataViewEditorDialog';
import { DataView } from '@/types/platform';
import { parseOrgProjectFromPath } from '@/lib/routing';

interface Document {
  _id: string;
  [key: string]: any;
}

type ViewMode = 'table' | 'cards' | 'json';

// JSON Syntax Highlighter Component
function JsonSyntaxHighlight({ data, compact = false }: { data: any; compact?: boolean }) {
  const jsonString = JSON.stringify(data, null, compact ? 0 : 2);

  // Simple syntax highlighting
  const highlighted = jsonString
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>');

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: compact ? 0.5 : 2,
        fontSize: compact ? 11 : 12,
        fontFamily: 'Monaco, Consolas, monospace',
        bgcolor: alpha('#000', 0.03),
        borderRadius: 1,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        '& .json-key': { color: '#0550ae' },
        '& .json-string': { color: '#0a3069' },
        '& .json-number': { color: '#0550ae' },
        '& .json-boolean': { color: '#cf222e' },
        '& .json-null': { color: '#8250df' },
      }}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

// Document Card Component
function DocumentCard({
  doc,
  onView,
  onCopy,
  onEdit,
  onDelete
}: {
  doc: Document;
  onView: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Get preview fields (first 4 non-_id fields)
  const previewFields = Object.entries(doc)
    .filter(([key]) => key !== '_id')
    .slice(0, 4);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '{...}';
    if (typeof value === 'string' && value.length > 50) return value.slice(0, 50) + '...';
    return String(value);
  };

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: alpha('#00ED64', 0.5),
          boxShadow: `0 4px 12px ${alpha('#00ED64', 0.1)}`,
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Document ID Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Chip
            label={`_id: ${String(doc._id).slice(-12)}`}
            size="small"
            sx={{
              fontFamily: 'monospace',
              fontSize: 10,
              height: 20,
              bgcolor: alpha('#00ED64', 0.1),
              color: '#00ED64',
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Copy JSON">
              <IconButton size="small" onClick={onCopy}>
                <ContentCopy sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Details">
              <IconButton size="small" onClick={onView}>
                <Visibility sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Preview Fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {previewFields.map(([key, value]) => (
            <Box key={key} sx={{ display: 'flex', gap: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: 'text.secondary',
                  minWidth: 80,
                  flexShrink: 0,
                }}
              >
                {key}:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatValue(value)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Expand Button */}
        {Object.keys(doc).length > 5 && (
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            startIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            sx={{
              mt: 1,
              p: 0,
              minWidth: 'auto',
              fontSize: 11,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'transparent', color: '#00ED64' },
            }}
          >
            {expanded ? 'Show less' : `+${Object.keys(doc).length - 5} more fields`}
          </Button>
        )}

        {/* Expanded JSON View */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 1.5 }}>
            <JsonSyntaxHighlight data={doc} />
          </Box>
        </Collapse>
      </CardContent>

      <CardActions sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button size="small" startIcon={<Edit sx={{ fontSize: 14 }} />} onClick={onEdit}>
          Edit
        </Button>
        <Button size="small" color="error" startIcon={<Delete sx={{ fontSize: 14 }} />} onClick={onDelete}>
          Delete
        </Button>
      </CardActions>
    </Card>
  );
}

// Document Detail Drawer
function DocumentDetailDrawer({
  open,
  document,
  onClose,
  onCopy,
  onEdit,
  onDelete,
}: {
  open: boolean;
  document: Document | null;
  onClose: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!document) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 500 },
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Document Details
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {String(document._id)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Copy JSON">
              <IconButton size="small" onClick={onCopy}>
                <ContentCopy sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <JsonSyntaxHighlight data={document} />
        </Box>

        {/* Actions */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            gap: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Button variant="outlined" startIcon={<Edit />} fullWidth onClick={onEdit}>
            Edit Document
          </Button>
          <Button variant="outlined" color="error" startIcon={<Delete />} fullWidth onClick={onDelete}>
            Delete
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

// Document Edit Drawer
function DocumentEditDrawer({
  open,
  document,
  onClose,
  onSave,
  saving,
  error,
}: {
  open: boolean;
  document: Document | null;
  onClose: () => void;
  onSave: (updatedDoc: Record<string, unknown>) => void;
  saving: boolean;
  error: string | null;
}) {
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Initialize JSON text when document changes
  useEffect(() => {
    if (document) {
      // Create a copy without _id for editing (can't change _id)
      const { _id, ...editableFields } = document;
      setJsonText(JSON.stringify(editableFields, null, 2));
      setParseError(null);
    }
  }, [document]);

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    setParseError(null);
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setParseError('Document must be a JSON object');
        return;
      }
      // Add back the _id
      onSave({ _id: document?._id, ...parsed });
    } catch (e) {
      setParseError('Invalid JSON: ' + (e instanceof Error ? e.message : 'Parse error'));
    }
  };

  if (!document) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 600 },
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Edit Document
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {String(document._id)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} disabled={saving}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Editor */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            Edit the document JSON below. The _id field cannot be changed.
          </Typography>
          <TextField
            multiline
            fullWidth
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            disabled={saving}
            sx={{
              flex: 1,
              '& .MuiInputBase-root': {
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: 12,
                height: '100%',
                alignItems: 'flex-start',
              },
              '& .MuiInputBase-input': {
                height: '100% !important',
                overflow: 'auto !important',
              },
            }}
            InputProps={{
              sx: { height: '100%' }
            }}
          />
          {(parseError || error) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {parseError || error}
            </Alert>
          )}
        </Box>

        {/* Actions */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            gap: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Button variant="outlined" onClick={onClose} disabled={saving} sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !!parseError}
            startIcon={saving ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Check />}
            sx={{
              flex: 1,
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

interface DataBrowserProps {
  showConnectionPanel?: boolean;
  onNeedConnection?: () => void;
  // Optional overrides for when navigating from Data Explorer
  initialDatabase?: string;
  initialCollection?: string;
  initialVaultId?: string;
  // Optional projectId for data views support
  projectId?: string;
}

export function DataBrowser({
  showConnectionPanel: showSidebar = true,
  onNeedConnection,
  initialDatabase,
  initialCollection,
  initialVaultId,
  projectId,
}: DataBrowserProps) {
  const {
    connectionString: ctxConnectionString,
    databaseName: ctxDatabaseName,
    collection: ctxCollection,
    activeVaultId: ctxVaultId,
  } = usePipeline();

  // Use props if provided, otherwise fall back to context
  const databaseName = initialDatabase || ctxDatabaseName;
  const collection = initialCollection || ctxCollection;
  const activeVaultId = initialVaultId || ctxVaultId;

  // For connection string, we need to fetch from vault if using initialVaultId
  const [fetchedConnectionString, setFetchedConnectionString] = useState<string | null>(null);
  const [fetchingConnectionString, setFetchingConnectionString] = useState(false);
  const connectionString = fetchedConnectionString || ctxConnectionString;
  const { currentOrgId } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortField, setSortField] = useState<string>('_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [showConnectionPanel, setShowConnectionPanel] = useState(true); // Always show by default
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailDocument, setDetailDocument] = useState<Document | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Edit state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<Document | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Data view state
  const { projectId: urlProjectId } = parseOrgProjectFromPath(pathname || '');
  const effectiveProjectId = projectId || urlProjectId || undefined;
  const [dataViews, setDataViews] = useState<DataView[]>([]);
  const [selectedDataView, setSelectedDataView] = useState<DataView | null>(null);
  const [dataViewCapabilities, setDataViewCapabilities] = useState<{
    canEdit: boolean;
    canJsonEdit: boolean;
    writablePaths: string[];
    maskedColumns?: string[];
  } | null>(null);
  const [loadingDataViews, setLoadingDataViews] = useState(false);
  const [dataViewEditorOpen, setDataViewEditorOpen] = useState(false);
  const [editingDataView, setEditingDataView] = useState<DataView | null>(null);
  const [availableVaults, setAvailableVaults] = useState<Array<{ vaultId: string; name: string; database: string }>>([]);

  // Load data views for project
  useEffect(() => {
    if (effectiveProjectId && currentOrgId) {
      loadDataViews();
      loadAvailableVaults();
    }
  }, [effectiveProjectId, currentOrgId]);

  const loadAvailableVaults = async () => {
    if (!currentOrgId) return;
    try {
      const response = await fetch(`/api/organizations/${currentOrgId}/vault`);
      if (response.ok) {
        const data = await response.json();
        setAvailableVaults(
          (data.connections || [])
            .filter((v: any) => v.status === 'active') // Only show active connections
            .map((v: any) => ({
              vaultId: v.vaultId,
              name: v.name,
              database: v.database,
            }))
        );
      } else {
        console.error('Failed to load vaults:', await response.text());
      }
    } catch (err) {
      console.error('Failed to load vaults:', err);
      // Don't show error to user - just log it
    }
  };

  const loadDataViews = async (): Promise<DataView[]> => {
    if (!effectiveProjectId) return [];
    setLoadingDataViews(true);
    try {
      const response = await fetch(`/api/projects/${effectiveProjectId}/data-views`);
      if (response.ok) {
        const data = await response.json();
        const views = data.views || [];
        setDataViews(views);
        return views;
      }
      return [];
    } catch (err) {
      console.error('Failed to load data views:', err);
      return [];
    } finally {
      setLoadingDataViews(false);
    }
  };

  // Fetch connection string from vault when using initialVaultId
  useEffect(() => {
    if (initialVaultId && currentOrgId && !ctxConnectionString) {
      setFetchingConnectionString(true);
      const fetchConnectionString = async () => {
        try {
          const response = await fetch(
            `/api/organizations/${currentOrgId}/vault/${initialVaultId}/decrypt`
          );
          if (response.ok) {
            const data = await response.json();
            setFetchedConnectionString(data.connectionString);
          }
        } catch (err) {
          console.error('Failed to fetch connection string:', err);
        } finally {
          setFetchingConnectionString(false);
        }
      };
      fetchConnectionString();
    }
  }, [initialVaultId, currentOrgId, ctxConnectionString]);

  const hasConnection = Boolean(connectionString && databaseName && collection);
  // Can export if we have a connection (either vault or direct)
  const canExport = hasConnection;

  // Auto-hide connection panel when connected with a collection selected
  useEffect(() => {
    if (hasConnection) {
      setShowConnectionPanel(false);
    }
  }, [hasConnection]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    // If using data view, use data view query endpoint
    if (selectedDataView && effectiveProjectId) {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${effectiveProjectId}/data-views/${selectedDataView.slug}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: {},
            sort: [{ path: sortField, dir: sortDirection }],
            page: { limit: rowsPerPage, cursor: String(page * rowsPerPage) },
            includeMeta: true,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setDocuments(data.documents);
          setTotalCount(data.totalCount);

          // Use columns from data view
          const visibleColumns = selectedDataView.columns
            .filter(col => col.visible)
            .map(col => col.path);
          setColumns(visibleColumns);
        } else {
          setError(data.error || 'Failed to fetch documents');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch documents');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fallback to direct MongoDB query
    if (!hasConnection) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mongodb/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName,
          collection,
          query: {},
          sort: { [sortField]: sortDirection === 'asc' ? 1 : -1 },
          limit: rowsPerPage,
          skip: page * rowsPerPage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents);
        setTotalCount(data.totalCount);

        // Determine visible columns from first few documents
        if (data.documents.length > 0) {
          const allKeys = new Set<string>();
          data.documents.slice(0, 10).forEach((doc: Document) => {
            Object.keys(doc).forEach(key => allKeys.add(key));
          });
          // Prioritize common fields, then alphabetize the rest
          const priorityFields = ['_id', 'name', 'title', 'email', 'createdAt', 'updatedAt'];
          const sortedKeys = Array.from(allKeys).sort((a, b) => {
            const aIndex = priorityFields.indexOf(a);
            const bIndex = priorityFields.indexOf(b);
            if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
            if (aIndex >= 0) return -1;
            if (bIndex >= 0) return 1;
            return a.localeCompare(b);
          });
          setColumns(sortedKeys.slice(0, 8)); // Limit to 8 columns
        }
      } else {
        setError(data.error || 'Failed to fetch documents');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [hasConnection, connectionString, databaseName, collection, page, rowsPerPage, sortField, sortDirection, selectedDataView, effectiveProjectId]);

  // Load data view capabilities when view is selected
  useEffect(() => {
    if (selectedDataView && effectiveProjectId) {
      loadDataViewCapabilities();
    } else {
      setDataViewCapabilities(null);
    }
  }, [selectedDataView, effectiveProjectId]);

  const loadDataViewCapabilities = async () => {
    if (!selectedDataView || !effectiveProjectId) return;
    try {
      const response = await fetch(`/api/projects/${effectiveProjectId}/data-views/${selectedDataView.slug}`);
      if (response.ok) {
        const data = await response.json();
        setDataViewCapabilities(data.capabilities);
      }
    } catch (err) {
      console.error('Failed to load data view capabilities:', err);
    }
  };

  // Fetch on connection or pagination change
  useEffect(() => {
    if (hasConnection || selectedDataView) {
      fetchDocuments();
    }
  }, [hasConnection, selectedDataView, fetchDocuments]);

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0);
  };

  // Format cell value for display
  const formatCellValue = (value: any, key: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <Typography color="text.disabled" sx={{ fontSize: 12 }}>null</Typography>;
    }

    if (key === '_id') {
      const idStr = String(value);
      return (
        <Typography sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          {idStr.length > 12 ? `...${idStr.slice(-8)}` : idStr}
        </Typography>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <Chip
          label={value ? 'true' : 'false'}
          size="small"
          sx={{
            height: 18,
            fontSize: 10,
            bgcolor: value ? alpha('#00ED64', 0.1) : alpha('#f44336', 0.1),
            color: value ? '#00ED64' : '#f44336',
          }}
        />
      );
    }

    if (Array.isArray(value)) {
      return (
        <Chip
          label={`[${value.length} items]`}
          size="small"
          variant="outlined"
          sx={{ height: 18, fontSize: 10 }}
        />
      );
    }

    if (typeof value === 'object') {
      return (
        <Chip
          label="{...}"
          size="small"
          variant="outlined"
          sx={{ height: 18, fontSize: 10, fontFamily: 'monospace' }}
        />
      );
    }

    if (typeof value === 'string' && value.length > 40) {
      return (
        <Tooltip title={value}>
          <Typography sx={{ fontSize: 12 }}>{value.slice(0, 40)}...</Typography>
        </Tooltip>
      );
    }

    // Check for date strings
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        const date = new Date(value);
        return (
          <Typography sx={{ fontSize: 12 }}>
            {date.toLocaleDateString()}
          </Typography>
        );
      } catch {
        // Fall through to default
      }
    }

    return <Typography sx={{ fontSize: 12 }}>{String(value)}</Typography>;
  };

  // Handle document actions
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, doc: Document) => {
    setSelectedDoc(doc);
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDoc(null);
  };

  const handleCopyDocument = (doc?: Document) => {
    const docToCopy = doc || selectedDoc;
    if (docToCopy) {
      navigator.clipboard.writeText(JSON.stringify(docToCopy, null, 2));
      setSnackbarMessage('Document copied to clipboard');
      setSnackbarOpen(true);
    }
    handleMenuClose();
  };

  const handleViewDocument = (doc: Document) => {
    // If using data view, open edit drawer directly (it has view + edit)
    if (selectedDataView) {
      setEditDocument(doc);
      setEditDrawerOpen(true);
      setSaveError(null);
    } else {
      setDetailDocument(doc);
      setDetailDrawerOpen(true);
    }
    handleMenuClose();
  };

  const handleEditDocument = (doc: Document) => {
    setEditDocument(doc);
    setEditDrawerOpen(true);
    setSaveError(null);
    setDetailDrawerOpen(false);  // Close detail drawer if open
    handleMenuClose();
  };

  const handleSaveDocument = async (updatedDoc: Record<string, unknown>, encryptedFieldPaths?: string[]) => {
    // If using data view, use data view mutation endpoint
    if (selectedDataView && effectiveProjectId && editDocument) {
      setSaving(true);
      setSaveError(null);

      try {
        // Compute ops from changes
        const ops: Array<{ op: 'set' | 'unset'; path: string; value?: any }> = [];
        
        for (const col of selectedDataView.columns) {
          if (!col.visible) continue;
          const currentValue = editDocument[col.path];
          const newValue = updatedDoc[col.path];
          
          if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
            if (newValue === null || newValue === undefined || newValue === '') {
              ops.push({ op: 'unset', path: col.path });
            } else {
              ops.push({ op: 'set', path: col.path, value: newValue });
            }
          }
        }

        if (ops.length === 0) {
          setSaving(false);
          return;
        }

        const response = await fetch(
          `/api/projects/${effectiveProjectId}/data-views/${selectedDataView.slug}/rows/${editDocument._id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ops,
              context: { source: 'rowDetail' },
            }),
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setEditDrawerOpen(false);
          setEditDocument(null);
          setSnackbarMessage('Document updated successfully');
          setSnackbarOpen(true);
          fetchDocuments();
        } else {
          setSaveError(data.error || 'Failed to update document');
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to update document');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Fallback to direct MongoDB update
    if (!connectionString || !databaseName || !collection) return;

    setSaving(true);
    setSaveError(null);

    try {
      // Build request body with optional encryption info
      const requestBody: Record<string, unknown> = {
        connectionString,
        databaseName,
        collection,
        documentId: String(updatedDoc._id),
        document: updatedDoc,
      };

      // If there are encrypted fields, include encryption metadata for re-encryption
      if (encryptedFieldPaths && encryptedFieldPaths.length > 0 && currentOrgId) {
        // We'll need to get the form schema to get encryption config for each field
        // For now, we'll pass minimal info - the API will handle re-encryption
        requestBody.organizationId = currentOrgId;
        // Note: formId would need to be passed from the editor
        // For now, re-encryption requires the schema lookup to be done server-side
      }

      const response = await fetch('/api/mongodb/document', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEditDrawerOpen(false);
        setEditDocument(null);
        setSnackbarMessage('Document updated successfully');
        setSnackbarOpen(true);
        // Refresh the documents list
        fetchDocuments();
      } else {
        setSaveError(data.error || 'Failed to update document');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  // Handle save from data view drawer (patch operations)
  const handleSaveDataView = async (ops: Array<{ op: 'set' | 'unset'; path: string; value?: any }>) => {
    if (!selectedDataView || !effectiveProjectId || !editDocument) return;

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(
        `/api/projects/${effectiveProjectId}/data-views/${selectedDataView.slug}/rows/${editDocument._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ops,
            context: { source: 'rowDetail' },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setEditDrawerOpen(false);
        setEditDocument(null);
        setSnackbarMessage('Document updated successfully');
        setSnackbarOpen(true);
        fetchDocuments();
      } else {
        setSaveError(data.error || 'Failed to update document');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (doc?: Document) => {
    const docToDelete = doc || selectedDoc || detailDocument;
    if (!docToDelete || !connectionString || !databaseName || !collection) return;

    if (!confirm(`Are you sure you want to delete this document?\n\nID: ${docToDelete._id}`)) {
      return;
    }

    try {
      const response = await fetch('/api/mongodb/document', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName,
          collection,
          documentId: String(docToDelete._id),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDetailDrawerOpen(false);
        setDetailDocument(null);
        handleMenuClose();
        setSnackbarMessage('Document deleted successfully');
        setSnackbarOpen(true);
        // Refresh the documents list
        fetchDocuments();
      } else {
        setError(data.error || 'Failed to delete document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  // If not connected, show connection panel in sidebar with empty main content
  if (!hasConnection) {
    // If sidebar is disabled, show centered empty state with button to go to connections
    if (!showSidebar) {
      // Show loading state if we're fetching the connection string
      if (fetchingConnectionString) {
        return (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              bgcolor: 'background.default',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4 },
                maxWidth: 450,
                width: '100%',
                textAlign: 'center',
                border: '2px dashed',
                borderColor: alpha('#00ED64', 0.3),
                borderRadius: 3,
                bgcolor: alpha('#00ED64', 0.02),
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <NetPadLoader size="large" variant="ascii" message="Connecting..." showPhrases={false} />
            </Paper>
          </Box>
        );
      }

      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            bgcolor: 'background.default',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              maxWidth: 450,
              width: '100%',
              textAlign: 'center',
              border: '2px dashed',
              borderColor: alpha('#00ED64', 0.3),
              borderRadius: 3,
              bgcolor: alpha('#00ED64', 0.02),
              mx: 'auto',
            }}
          >
            <Storage sx={{ fontSize: { xs: 48, sm: 56 }, color: '#00ED64', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
              No Connection Selected
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                mb: 3,
                px: { xs: 1, sm: 0 },
                wordBreak: 'break-word',
              }}
            >
              Connect to a MongoDB database to browse and manage your data.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={onNeedConnection}
              fullWidth
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                color: '#001E2B',
                fontWeight: 600,
                px: 4,
                '&:hover': {
                  background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                },
              }}
            >
              Go to Connections
            </Button>
          </Paper>
        </Box>
      );
    }

    // Original sidebar view
    return (
      <Box sx={{ height: '100%', display: 'flex' }}>
        {/* Connection Panel Sidebar - Always visible when not connected */}
        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            overflow: 'auto',
          }}
        >
          <ConnectionPanel />
        </Box>

        {/* Main Content - Prompt to connect */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            bgcolor: 'background.default',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              maxWidth: 400,
              width: '100%',
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <Storage sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Select a Connection
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose a connection from the panel on the left, then select a database and collection to browse your data.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Your saved connections from the organization vault will appear as Quick Connect options.
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  // Render Table View
  const renderTableView = () => (
    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
      {loading && documents.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <NetPadLoader size="medium" showPhrases={false} />
        </Box>
      ) : documents.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <Typography color="text.secondary">No documents found</Typography>
          <Button variant="outlined" startIcon={<Add />} size="small">
            Insert Document
          </Button>
        </Box>
      ) : (
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column}
                  onClick={() => handleSort(column)}
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    bgcolor: 'background.paper',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      bgcolor: alpha('#00ED64', 0.05),
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {column}
                    {sortField === column && (
                      sortDirection === 'asc'
                        ? <ArrowUpward sx={{ fontSize: 14 }} />
                        : <ArrowDownward sx={{ fontSize: 14 }} />
                    )}
                  </Box>
                </TableCell>
              ))}
              <TableCell sx={{ width: 60, bgcolor: 'background.paper' }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow
                key={doc._id}
                hover
                onClick={() => handleViewDocument(doc)}
                sx={{ cursor: 'pointer' }}
              >
                {columns.map((column) => (
                  <TableCell key={column} sx={{ maxWidth: 200 }}>
                    {formatCellValue(doc[column], column)}
                  </TableCell>
                ))}
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, doc)}
                  >
                    <MoreVert sx={{ fontSize: 16 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );

  // Render Cards View
  const renderCardsView = () => (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
      {loading && documents.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <NetPadLoader size="medium" showPhrases={false} />
        </Box>
      ) : documents.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <Typography color="text.secondary">No documents found</Typography>
          <Button variant="outlined" startIcon={<Add />} size="small">
            Insert Document
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc._id}>
              <DocumentCard
                doc={doc}
                onView={() => handleViewDocument(doc)}
                onCopy={() => handleCopyDocument(doc)}
                onEdit={() => handleEditDocument(doc)}
                onDelete={() => handleDeleteDocument(doc)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  // Render JSON View
  const renderJsonView = () => (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
      {loading && documents.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <NetPadLoader size="medium" showPhrases={false} />
        </Box>
      ) : documents.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <Typography color="text.secondary">No documents found</Typography>
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: alpha('#000', 0.02),
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Showing {documents.length} of {totalCount} documents
            </Typography>
            <Button
              size="small"
              startIcon={<ContentCopy sx={{ fontSize: 14 }} />}
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(documents, null, 2));
                setSnackbarMessage('All documents copied to clipboard');
                setSnackbarOpen(true);
              }}
            >
              Copy All
            </Button>
          </Box>
          <Box sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
            <JsonSyntaxHighlight data={documents} />
          </Box>
        </Paper>
      )}
    </Box>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableChart sx={{ fontSize: 20, color: '#00ED64' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Data Browser
            </Typography>
          </Box>
          {effectiveProjectId && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={selectedDataView?.slug || ''}
                onChange={(e) => {
                  const view = dataViews.find(v => v.slug === e.target.value);
                  setSelectedDataView(view || null);
                  setPage(0);
                }}
                displayEmpty
                sx={{ fontSize: 12 }}
              >
                <MenuItem value="">
                  <em>Direct Collection Access</em>
                </MenuItem>
                {dataViews.map((view) => (
                  <MenuItem key={view.slug} value={view.slug}>
                    {view.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {effectiveProjectId && (
            <>
              <Tooltip title="Create New Data View">
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingDataView(null);
                    setDataViewEditorOpen(true);
                  }}
                >
                  <Create sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Manage Data Views">
                <IconButton
                  size="small"
                  onClick={() => {
                    // Could open a management dialog here
                    setEditingDataView(null);
                    setDataViewEditorOpen(true);
                  }}
                >
                  <Settings sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
          {effectiveProjectId && selectedDataView && (
            <Tooltip title="Edit Data View">
              <IconButton
                size="small"
                onClick={() => {
                  setEditingDataView(selectedDataView);
                  setDataViewEditorOpen(true);
                }}
              >
                <Edit sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          {!selectedDataView && (
            <Chip
              label={`${databaseName}.${collection}`}
              size="small"
              sx={{
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
                fontWeight: 500,
              }}
            />
          )}
          {selectedDataView && (
            <Chip
              icon={<ViewList sx={{ fontSize: 14 }} />}
              label={selectedDataView.name}
              size="small"
              sx={{
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
                fontWeight: 500,
              }}
            />
          )}
          <Chip
            label={loading ? '...' : `${totalCount.toLocaleString()} documents`}
            size="small"
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 1.5,
                py: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                '&.Mui-selected': {
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                  borderColor: alpha('#00ED64', 0.3),
                  '&:hover': {
                    bgcolor: alpha('#00ED64', 0.15),
                  },
                },
              },
            }}
          >
            <ToggleButton value="table">
              <Tooltip title="Table View">
                <TableChart sx={{ fontSize: 18 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="cards">
              <Tooltip title="Card View">
                <ViewModule sx={{ fontSize: 18 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="json">
              <Tooltip title="JSON View">
                <Code sx={{ fontSize: 18 }} />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <TextField
            placeholder="Search..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 180,
              '& .MuiOutlinedInput-root': {
                height: 32,
                fontSize: 13,
              },
            }}
          />
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchDocuments} disabled={loading}>
              <Refresh sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={canExport ? "Export Data" : "Connect to export"}>
            <span>
              <IconButton
                size="small"
                disabled={!canExport}
                onClick={() => setExportDialogOpen(true)}
              >
                <Download sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Button
            size="small"
            variant="contained"
            startIcon={<Upload sx={{ fontSize: 16 }} />}
            onClick={() => {
              const params = new URLSearchParams();
              if (databaseName) params.set('database', databaseName);
              if (collection) params.set('collection', collection);
              router.push(`/data/import?${params.toString()}`);
            }}
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              color: '#001E2B',
              fontWeight: 600,
              fontSize: 12,
              px: 1.5,
              py: 0.5,
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
            }}
          >
            Import Data
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Content based on view mode */}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'cards' && renderCardsView()}
      {viewMode === 'json' && renderJsonView()}

      {/* Pagination */}
      {documents.length > 0 && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        />
      )}

      {/* Document Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedDoc && handleViewDocument(selectedDoc)}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedDoc && handleEditDocument(selectedDoc)}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleCopyDocument()}>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText>Copy JSON</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleDeleteDocument()} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Data View Row Detail Drawer or Document Detail Drawer */}
      {selectedDataView && dataViewCapabilities ? (
        <DataViewRowDetailDrawer
          open={editDrawerOpen}
          document={editDocument}
          dataView={selectedDataView}
          capabilities={dataViewCapabilities}
          onClose={() => {
            setEditDrawerOpen(false);
            setEditDocument(null);
            setSaveError(null);
          }}
          onSave={handleSaveDataView}
          onDelete={async () => {
            if (!editDocument || !selectedDataView || !effectiveProjectId) return;
            if (!confirm(`Are you sure you want to delete this document?\n\nID: ${editDocument._id}`)) {
              return;
            }
            try {
              const response = await fetch(
                `/api/projects/${effectiveProjectId}/data-views/${selectedDataView.slug}/rows/${editDocument._id}`,
                { method: 'DELETE' }
              );
              if (response.ok) {
                setEditDrawerOpen(false);
                setEditDocument(null);
                setSnackbarMessage('Document deleted successfully');
                setSnackbarOpen(true);
                fetchDocuments();
              } else {
                setSaveError('Failed to delete document');
              }
            } catch (err) {
              setSaveError(err instanceof Error ? err.message : 'Failed to delete document');
            }
          }}
          saving={saving}
          error={saveError}
        />
      ) : (
        <>
          {/* Document Detail Drawer */}
          <DocumentDetailDrawer
            open={detailDrawerOpen}
            document={detailDocument}
            onClose={() => setDetailDrawerOpen(false)}
            onCopy={() => handleCopyDocument(detailDocument || undefined)}
            onEdit={() => detailDocument && handleEditDocument(detailDocument)}
            onDelete={() => handleDeleteDocument()}
          />

          {/* Schema-Aware Document Editor */}
          <SchemaAwareDocumentEditor
            open={editDrawerOpen}
            document={editDocument}
            database={databaseName || ''}
            collection={collection || ''}
            connectionString={connectionString || ''}
            organizationId={currentOrgId || undefined}
            vaultId={activeVaultId || undefined}
            onClose={() => {
              setEditDrawerOpen(false);
              setEditDocument(null);
              setSaveError(null);
            }}
            onSave={handleSaveDocument}
            saving={saving}
            error={saveError}
          />
        </>
      )}

      {/* Copy Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          sx: {
            bgcolor: '#00ED64',
            color: '#001E2B',
            fontWeight: 500,
          },
        }}
      />

      {/* Export Dialog */}
      {canExport && (
        <ExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          organizationId={currentOrgId || undefined}
          vaultId={activeVaultId || undefined}
          connectionString={!activeVaultId ? connectionString || undefined : undefined}
          database={databaseName!}
          collection={collection!}
        />
      )}

      {/* Data View Editor Dialog */}
      {effectiveProjectId && (
        <DataViewEditorDialog
          open={dataViewEditorOpen}
          onClose={() => {
            setDataViewEditorOpen(false);
            setEditingDataView(null);
          }}
          onSave={async (viewData) => {
            try {
              const url = editingDataView
                ? `/api/projects/${effectiveProjectId}/data-views/${editingDataView.slug}`
                : `/api/projects/${effectiveProjectId}/data-views`;
              
              const method = editingDataView ? 'PATCH' : 'POST';
              
              const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(viewData),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save data view');
              }

              // Reload data views
              const updatedViews = await loadDataViews();
              
              // If this was a new view, select it
              if (!editingDataView) {
                const data = await response.json();
                if (data.view) {
                  const newView = updatedViews.find(v => v.slug === data.view.slug) || data.view;
                  if (newView) {
                    setSelectedDataView(newView);
                  }
                }
              } else {
                // If editing, update selected view if it was the one being edited
                if (selectedDataView?._id === editingDataView._id) {
                  const updatedView = updatedViews.find(v => v._id === editingDataView._id);
                  if (updatedView) {
                    setSelectedDataView(updatedView);
                  }
                }
              }
            } catch (err) {
              throw err;
            }
          }}
          existingView={editingDataView}
          projectId={effectiveProjectId}
          availableVaults={availableVaults}
        />
      )}
    </Box>
  );
}
