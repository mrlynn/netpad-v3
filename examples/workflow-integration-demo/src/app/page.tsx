'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  CheckCircle,
  Error,
  Schedule,
  Code,
  Send,
  Storage,
  AccountTree,
  Timeline,
} from '@mui/icons-material';
import {
  createNetPadWorkflowClient,
  NetPadWorkflowClient,
  NetPadWorkflowError,
  WorkflowDocument,
  WorkflowExecution,
  ExecutionStatus,
  GetExecutionResponse,
} from '@netpad/workflows';

// Demo configuration
const DEMO_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_NETPAD_URL || 'http://localhost:3000',
  apiKey: process.env.NEXT_PUBLIC_NETPAD_API_KEY || 'demo_api_key',
  organizationId: process.env.NEXT_PUBLIC_NETPAD_ORG_ID || 'demo_org',
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ py: 3 }}>
      {value === index && children}
    </Box>
  );
}

function StatusChip({ status }: { status: ExecutionStatus | string }) {
  const statusConfig: Record<string, { color: 'success' | 'error' | 'warning' | 'info' | 'default'; icon: React.ReactNode }> = {
    completed: { color: 'success', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    failed: { color: 'error', icon: <Error sx={{ fontSize: 16 }} /> },
    running: { color: 'info', icon: <CircularProgress size={14} /> },
    pending: { color: 'warning', icon: <Schedule sx={{ fontSize: 16 }} /> },
    cancelled: { color: 'default', icon: <Error sx={{ fontSize: 16 }} /> },
  };

  const config = statusConfig[status] || { color: 'default', icon: null };

  return (
    <Chip
      label={status}
      color={config.color}
      icon={config.icon as React.ReactElement}
      size="small"
      sx={{ textTransform: 'capitalize' }}
    />
  );
}

export default function WorkflowDemoPage() {
  const [tabValue, setTabValue] = useState(0);
  const [client, setClient] = useState<NetPadWorkflowClient | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowDocument[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [baseUrl, setBaseUrl] = useState(DEMO_CONFIG.baseUrl);
  const [apiKey, setApiKey] = useState(DEMO_CONFIG.apiKey);
  const [orgId, setOrgId] = useState(DEMO_CONFIG.organizationId);
  const [isConnected, setIsConnected] = useState(false);

  // Execution form
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [executionPayload, setExecutionPayload] = useState('{\n  "userId": "user_123",\n  "action": "process"\n}');
  const [currentExecution, setCurrentExecution] = useState<GetExecutionResponse | null>(null);

  const handleConnect = () => {
    try {
      const newClient = createNetPadWorkflowClient({
        baseUrl,
        apiKey,
        organizationId: orgId,
      });
      setClient(newClient);
      setIsConnected(true);
      setSuccess('Connected to NetPad successfully!');
      setError(null);
    } catch {
      setError('Failed to create client');
      setIsConnected(false);
    }
  };

  const handleDisconnect = () => {
    setClient(null);
    setIsConnected(false);
    setWorkflows([]);
    setExecutions([]);
    setSuccess(null);
  };

  const fetchWorkflows = async () => {
    if (!client) return;
    setLoading(true);
    setError(null);

    try {
      const response = await client.listWorkflows({ pageSize: 20 });
      setWorkflows(response.workflows);
      setSuccess(`Loaded ${response.workflows.length} workflows`);
    } catch (error: unknown) {
      if (error instanceof NetPadWorkflowError) {
        setError(`API Error: ${error.message} (${error.statusCode})`);
      } else {
        setError('Failed to fetch workflows');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    if (!client || !selectedWorkflowId) {
      setError('Please select a workflow first');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await client.listExecutions(selectedWorkflowId, { limit: 20 });
      setExecutions(response.executions);
      setSuccess(`Loaded ${response.executions.length} executions`);
    } catch (error: unknown) {
      if (error instanceof NetPadWorkflowError) {
        setError(`API Error: ${error.message}`);
      } else {
        setError('Failed to fetch executions');
      }
    } finally {
      setLoading(false);
    }
  };

  const executeWorkflow = async () => {
    if (!client || !selectedWorkflowId) return;
    setLoading(true);
    setError(null);
    setCurrentExecution(null);

    try {
      let payload = {};
      try {
        payload = JSON.parse(executionPayload);
      } catch {
        setError('Invalid JSON payload');
        setLoading(false);
        return;
      }

      // Execute the workflow
      const response = await client.executeWorkflow(selectedWorkflowId, { payload });
      setSuccess(`Workflow execution started: ${response.executionId}`);

      // Wait for completion (with timeout)
      const executionResponse = await client.waitForExecution(response.executionId, {
        timeoutMs: 30000,
        intervalMs: 1000,
      });

      setCurrentExecution(executionResponse);
      setSuccess(`Execution ${executionResponse.execution.status}: ${executionResponse.execution.workflowId}`);

      // Refresh executions list
      fetchExecutions();
    } catch (error: unknown) {
      if (error instanceof NetPadWorkflowError) {
        setError(`Execution Error: ${error.message}`);
      } else {
        setError('Failed to execute workflow');
      }
    } finally {
      setLoading(false);
    }
  };

  const retryExecution = async (workflowId: string, executionId: string) => {
    if (!client) return;
    setLoading(true);

    try {
      await client.retryExecution(workflowId, executionId);
      setSuccess(`Retry initiated for execution`);
      fetchExecutions();
    } catch {
      setError('Failed to retry execution');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AccountTree sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h3" fontWeight={700} color="white">
              Workflow Integration Demo
            </Typography>
          </Box>
          <Typography variant="h6" color="text.secondary">
            Demonstrating @netpad/workflows API client for programmatic workflow management
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Connection Card */}
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            1. Connect to NetPad
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="NetPad URL"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={isConnected}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isConnected}
                size="small"
                type="password"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Organization ID"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                disabled={isConnected}
                size="small"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            {!isConnected ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleConnect}
                startIcon={<Send />}
              >
                Connect
              </Button>
            ) : (
              <>
                <Chip
                  label="Connected"
                  color="success"
                  icon={<CheckCircle />}
                />
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </>
            )}
          </Box>
        </Paper>

        {/* Main Content */}
        {isConnected && (
          <Paper sx={{ bgcolor: 'background.paper' }}>
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label="Workflows" icon={<AccountTree />} iconPosition="start" />
              <Tab label="Execute" icon={<PlayArrow />} iconPosition="start" />
              <Tab label="Executions" icon={<Timeline />} iconPosition="start" />
              <Tab label="Code Examples" icon={<Code />} iconPosition="start" />
            </Tabs>

            {/* Workflows Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ px: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Available Workflows</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchWorkflows}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </Button>
                </Box>

                {workflows.length === 0 ? (
                  <Alert severity="info">
                    No workflows found. Click Refresh to load workflows from your NetPad instance.
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {workflows.map((workflow) => (
                      <Grid item xs={12} md={6} key={workflow.id}>
                        <Card sx={{ bgcolor: alpha('#00ED64', 0.05), border: '1px solid', borderColor: 'divider' }}>
                          <CardContent>
                            <Typography variant="h6" fontWeight={600}>
                              {workflow.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {workflow.description || 'No description'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Chip label={workflow.status} size="small" />
                              <Chip
                                label={`v${workflow.version}`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </CardContent>
                          <CardActions>
                            <Button
                              size="small"
                              startIcon={<PlayArrow />}
                              onClick={() => {
                                setSelectedWorkflowId(workflow.id);
                                setTabValue(1);
                              }}
                            >
                              Execute
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </TabPanel>

            {/* Execute Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ px: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Execute Workflow
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Workflow ID"
                      value={selectedWorkflowId}
                      onChange={(e) => setSelectedWorkflowId(e.target.value)}
                      placeholder="Enter workflow ID or select from Workflows tab"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Payload (JSON)"
                      value={executionPayload}
                      onChange={(e) => setExecutionPayload(e.target.value)}
                      multiline
                      rows={8}
                      sx={{ fontFamily: 'monospace' }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
                      onClick={executeWorkflow}
                      disabled={loading || !selectedWorkflowId}
                      sx={{ mt: 2 }}
                      fullWidth
                    >
                      {loading ? 'Executing...' : 'Execute Workflow'}
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Execution Result
                    </Typography>
                    {currentExecution ? (
                      <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="body2" fontWeight={600}>
                            Execution Status
                          </Typography>
                          <StatusChip status={currentExecution.execution.status} />
                        </Box>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                          Workflow: {currentExecution.execution.workflowId}
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Output
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            p: 2,
                            bgcolor: '#0a1929',
                            borderRadius: 1,
                            overflow: 'auto',
                            fontSize: '0.85rem',
                            maxHeight: 200,
                          }}
                        >
                          {JSON.stringify(currentExecution.execution.result?.output || {}, null, 2)}
                        </Box>
                      </Paper>
                    ) : (
                      <Alert severity="info">
                        Execute a workflow to see results here
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            {/* Executions Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ px: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Execution History</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      size="small"
                      label="Workflow ID"
                      value={selectedWorkflowId}
                      onChange={(e) => setSelectedWorkflowId(e.target.value)}
                      placeholder="Required"
                    />
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={fetchExecutions}
                      disabled={loading || !selectedWorkflowId}
                    >
                      {loading ? 'Loading...' : 'Refresh'}
                    </Button>
                  </Box>
                </Box>

                {executions.length === 0 ? (
                  <Alert severity="info">
                    Enter a Workflow ID and click Refresh to load execution history.
                  </Alert>
                ) : (
                  <List>
                    {executions.map((execution) => (
                      <ListItem
                        key={execution.workflowId + execution.startedAt}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'background.default',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {execution.workflowId}
                              </Typography>
                              <StatusChip status={execution.status} />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              Started: {new Date(execution.startedAt).toLocaleString()}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          {execution.status === 'failed' && (
                            <Tooltip title="Retry">
                              <IconButton
                                edge="end"
                                onClick={() => retryExecution(execution.workflowId, execution.workflowId)}
                              >
                                <Refresh />
                              </IconButton>
                            </Tooltip>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </TabPanel>

            {/* Code Examples Tab */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ px: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Code Examples
                </Typography>

                <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Initialize Client
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: '#0a1929',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.85rem',
                    }}
                  >
{`import { createNetPadWorkflowClient } from '@netpad/workflows';

const client = createNetPadWorkflowClient({
  baseUrl: '${baseUrl}',
  apiKey: 'your-api-key',
  organizationId: '${orgId}',
});`}
                  </Box>
                </Paper>

                <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Execute Workflow & Wait for Result
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: '#0a1929',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.85rem',
                    }}
                  >
{`// Trigger workflow execution
const { executionId } = await client.executeWorkflow('workflow-123', {
  payload: { userId: 'user_456', action: 'process' },
});

// Wait for completion (polls automatically)
const result = await client.waitForExecution(executionId, {
  timeoutMs: 60000,     // 1 minute timeout
  intervalMs: 2000,     // Poll every 2 seconds
});

console.log('Status:', result.execution.status);
console.log('Output:', result.execution.result?.output);`}
                  </Box>
                </Paper>

                <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    List & Manage Workflows
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: '#0a1929',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.85rem',
                    }}
                  >
{`// List all workflows
const { workflows } = await client.listWorkflows({
  status: 'active',
  pageSize: 50,
});

// Get specific workflow
const workflow = await client.getWorkflow('workflow-123');

// Activate/Pause workflows
await client.activateWorkflow('workflow-123');
await client.pauseWorkflow('workflow-123');`}
                  </Box>
                </Paper>

                <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Error Handling
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: '#0a1929',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.85rem',
                    }}
                  >
{`import { NetPadWorkflowError } from '@netpad/workflows';

try {
  await client.executeWorkflow('workflow-123', { payload: {} });
} catch (error) {
  if (error instanceof NetPadWorkflowError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.statusCode);
    console.error('Code:', error.code);
  }
}`}
                  </Box>
                </Paper>
              </Box>
            </TabPanel>
          </Paper>
        )}

        {/* Features Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
            @netpad/workflows Features
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                icon: <AccountTree />,
                title: 'Workflow Management',
                description: 'Create, update, delete, and manage workflow lifecycle programmatically',
              },
              {
                icon: <PlayArrow />,
                title: 'Execution Control',
                description: 'Trigger executions, pass payloads, and handle async completion',
              },
              {
                icon: <Timeline />,
                title: 'Status Monitoring',
                description: 'Poll execution status, wait for completion, and track progress',
              },
              {
                icon: <Code />,
                title: 'Type Safety',
                description: 'Full TypeScript support with exported types for all API operations',
              },
              {
                icon: <Refresh />,
                title: 'Retry Logic',
                description: 'Retry failed executions and handle errors gracefully',
              },
              {
                icon: <Storage />,
                title: 'Execution History',
                description: 'Query execution logs, filter by status, and analyze results',
              },
            ].map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ height: '100%', bgcolor: alpha('#00ED64', 0.05) }}>
                  <CardContent>
                    <Box sx={{ color: 'primary.main', mb: 2 }}>{feature.icon}</Box>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
