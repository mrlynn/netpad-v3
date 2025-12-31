'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  PlayArrow,
  ContentCopy,
  Clear,
  Key,
  Code,
  History,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';

interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

interface RequestHistory {
  id: string;
  method: string;
  endpoint: string;
  status: number;
  timestamp: Date;
}

const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/forms', description: 'List all forms', requiresAuth: true },
  { method: 'GET', path: '/api/v1/forms/:formId', description: 'Get form by ID or slug', requiresAuth: true },
  { method: 'POST', path: '/api/v1/forms', description: 'Create a new form', requiresAuth: true },
  { method: 'PATCH', path: '/api/v1/forms/:formId', description: 'Update a form', requiresAuth: true },
  { method: 'DELETE', path: '/api/v1/forms/:formId', description: 'Delete a form', requiresAuth: true },
  { method: 'GET', path: '/api/v1/forms/:formId/submissions', description: 'List form submissions', requiresAuth: true },
  { method: 'POST', path: '/api/v1/forms/:formId/submissions', description: 'Create a submission', requiresAuth: true },
  { method: 'GET', path: '/api/v1/forms/:formId/submissions/:submissionId', description: 'Get submission', requiresAuth: true },
  { method: 'DELETE', path: '/api/v1/forms/:formId/submissions/:submissionId', description: 'Delete submission', requiresAuth: true },
  { method: 'GET', path: '/api/v1/openapi.json', description: 'Get OpenAPI specification', requiresAuth: false },
];

const SAMPLE_BODIES: Record<string, object> = {
  'POST /api/v1/forms': {
    name: 'Test Form',
    description: 'A form created via API',
    fields: [
      {
        path: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
      },
      {
        path: 'email',
        label: 'Email',
        type: 'email',
        required: true,
      },
    ],
  },
  'PATCH /api/v1/forms/:formId': {
    name: 'Updated Form Name',
    description: 'Updated description',
  },
  'POST /api/v1/forms/:formId/submissions': {
    data: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  },
};

export default function APIPlaygroundPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [apiKey, setApiKey] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [customPath, setCustomPath] = useState(ENDPOINTS[0].path);
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  const handleEndpointChange = useCallback((index: number) => {
    const endpoint = ENDPOINTS[index];
    setSelectedEndpoint(endpoint);
    setCustomPath(endpoint.path);

    // Set sample body if available
    const sampleKey = `${endpoint.method} ${endpoint.path}`;
    if (SAMPLE_BODIES[sampleKey]) {
      setRequestBody(JSON.stringify(SAMPLE_BODIES[sampleKey], null, 2));
    } else {
      setRequestBody('');
    }
  }, []);

  const executeRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey && selectedEndpoint.requiresAuth) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const fetchOptions: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };

      if (['POST', 'PATCH', 'PUT'].includes(selectedEndpoint.method) && requestBody) {
        fetchOptions.body = requestBody;
      }

      const res = await fetch(customPath, fetchOptions);
      const endTime = performance.now();

      // Extract headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let body: unknown;
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      const apiResponse: APIResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body,
        duration: Math.round(endTime - startTime),
      };

      setResponse(apiResponse);

      // Add to history
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          method: selectedEndpoint.method,
          endpoint: customPath,
          status: res.status,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9), // Keep last 10
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [apiKey, selectedEndpoint, customPath, requestBody]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return '#00ED64';
    if (status >= 400 && status < 500) return '#ff9800';
    if (status >= 500) return '#f44336';
    return '#2196f3';
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return '#00ED64';
      case 'POST': return '#2196f3';
      case 'PATCH': return '#ff9800';
      case 'PUT': return '#9c27b0';
      case 'DELETE': return '#f44336';
      default: return '#757575';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
            API Playground
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Test the NetPad API directly in your browser. Enter your API key and start making requests.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Left Panel - Request Builder */}
          <Paper sx={{ flex: 1, p: 3, borderRadius: 2 }}>
            {/* API Key Input */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Key fontSize="small" sx={{ color: '#00ED64' }} />
                API Key
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="password"
                placeholder="np_live_... or np_test_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                InputProps={{
                  sx: { fontFamily: 'monospace' },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Get an API key from{' '}
                <a href="/settings?tab=api-keys" style={{ color: '#00ED64' }}>
                  Settings &gt; API Keys
                </a>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Endpoint Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Endpoint
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={ENDPOINTS.indexOf(selectedEndpoint)}
                  onChange={(e) => handleEndpointChange(e.target.value as number)}
                >
                  {ENDPOINTS.map((endpoint, index) => (
                    <MenuItem key={index} value={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Chip
                          label={endpoint.method}
                          size="small"
                          sx={{
                            bgcolor: alpha(getMethodColor(endpoint.method), 0.15),
                            color: getMethodColor(endpoint.method),
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 22,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                          {endpoint.path}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {selectedEndpoint.description}
              </Typography>
            </Box>

            {/* Custom Path */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Request URL
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={selectedEndpoint.method}
                  sx={{
                    bgcolor: alpha(getMethodColor(selectedEndpoint.method), 0.15),
                    color: getMethodColor(selectedEndpoint.method),
                    fontWeight: 600,
                  }}
                />
                <TextField
                  fullWidth
                  size="small"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="/api/v1/..."
                  InputProps={{
                    sx: { fontFamily: 'monospace' },
                  }}
                />
              </Box>
              {customPath.includes(':') && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Replace path parameters (e.g., :formId) with actual values
                </Alert>
              )}
            </Box>

            {/* Request Body */}
            {['POST', 'PATCH', 'PUT'].includes(selectedEndpoint.method) && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Code fontSize="small" />
                  Request Body (JSON)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder="{}"
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                  }}
                />
              </Box>
            )}

            {/* Execute Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={executeRequest}
              disabled={loading || (selectedEndpoint.requiresAuth && !apiKey)}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
              sx={{
                bgcolor: '#00ED64',
                color: '#001E2B',
                fontWeight: 600,
                py: 1.5,
                '&:hover': { bgcolor: '#00c853' },
                '&:disabled': { bgcolor: alpha('#00ED64', 0.3) },
              }}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </Button>

            {selectedEndpoint.requiresAuth && !apiKey && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This endpoint requires authentication. Please enter an API key above.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>

          {/* Right Panel - Response */}
          <Paper sx={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
                '& .Mui-selected': { color: '#00ED64' },
                '& .MuiTabs-indicator': { bgcolor: '#00ED64' },
              }}
            >
              <Tab label="Response" />
              <Tab label="Headers" />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History fontSize="small" />
                    History ({history.length})
                  </Box>
                }
              />
            </Tabs>

            <Box sx={{ p: 3, minHeight: 400, maxHeight: 600, overflow: 'auto' }}>
              {activeTab === 0 && (
                <>
                  {response ? (
                    <Box>
                      {/* Status */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {response.status >= 200 && response.status < 300 ? (
                          <CheckCircle sx={{ color: '#00ED64' }} />
                        ) : (
                          <ErrorIcon sx={{ color: getStatusColor(response.status) }} />
                        )}
                        <Chip
                          label={`${response.status} ${response.statusText}`}
                          sx={{
                            bgcolor: alpha(getStatusColor(response.status), 0.15),
                            color: getStatusColor(response.status),
                            fontWeight: 600,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {response.duration}ms
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Copy response">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(JSON.stringify(response.body, null, 2))}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* Body */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: '#001E2B',
                          borderRadius: 1,
                          overflow: 'auto',
                        }}
                      >
                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            color: '#00ED64',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {typeof response.body === 'string'
                            ? response.body
                            : JSON.stringify(response.body, null, 2)}
                        </Box>
                      </Paper>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 300,
                        color: 'text.secondary',
                      }}
                    >
                      <Code sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                      <Typography>Send a request to see the response</Typography>
                    </Box>
                  )}
                </>
              )}

              {activeTab === 1 && response && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                    Response Headers
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: isDark ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.03),
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {Object.entries(response.headers).map(([key, value]) => (
                      <Box
                        key={key}
                        sx={{
                          display: 'flex',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <Box
                          sx={{
                            px: 2,
                            py: 1,
                            bgcolor: isDark ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.06),
                            width: 200,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'text.primary',
                          }}
                        >
                          {key}
                        </Box>
                        <Box
                          sx={{
                            px: 2,
                            py: 1,
                            flex: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            wordBreak: 'break-all',
                            color: 'text.secondary',
                          }}
                        >
                          {value}
                        </Box>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              )}

              {activeTab === 2 && (
                <Box>
                  {history.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 200,
                        color: 'text.secondary',
                      }}
                    >
                      <History sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                      <Typography>No requests yet</Typography>
                    </Box>
                  ) : (
                    history.map((item) => (
                      <Paper
                        key={item.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          mb: 1,
                          bgcolor: isDark ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.03),
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Chip
                          label={item.method}
                          size="small"
                          sx={{
                            bgcolor: alpha(getMethodColor(item.method), 0.15),
                            color: getMethodColor(item.method),
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', flex: 1, color: 'text.primary' }}
                        >
                          {item.endpoint}
                        </Typography>
                        <Chip
                          label={item.status}
                          size="small"
                          sx={{
                            bgcolor: alpha(getStatusColor(item.status), 0.15),
                            color: getStatusColor(item.status),
                            fontWeight: 600,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {item.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Paper>
                    ))
                  )}
                  {history.length > 0 && (
                    <Button
                      size="small"
                      startIcon={<Clear />}
                      onClick={() => setHistory([])}
                      sx={{ mt: 1 }}
                    >
                      Clear History
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Quick Examples */}
        <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Quick Examples
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                handleEndpointChange(0);
                setCustomPath('/api/v1/forms?status=published');
              }}
              sx={{ textTransform: 'none' }}
            >
              List Published Forms
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                handleEndpointChange(9);
                setCustomPath('/api/v1/openapi.json');
              }}
              sx={{ textTransform: 'none' }}
            >
              Get OpenAPI Spec
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                handleEndpointChange(2);
              }}
              sx={{ textTransform: 'none' }}
            >
              Create Form Template
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
