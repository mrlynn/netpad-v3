'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  alpha,
  Skeleton,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  NotificationsActive,
  Add,
  Edit,
  Delete,
  PlayArrow,
  Refresh,
  CheckCircle,
  Cancel,
  Email,
  Webhook,
} from '@mui/icons-material';
import useSWR from 'swr';
import { AlertMetric, AlertOperator, AlertChannel, AlertCondition, EmailAlertConfig, WebhookAlertConfig } from '@/types/observability';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AlertRule {
  _id: string;
  ruleId: string;
  name: string;
  description?: string;
  metric: AlertMetric;
  condition: AlertCondition;
  evaluationIntervalMinutes: number;
  cooldownMinutes: number;
  channels: AlertChannel[];
  enabled: boolean;
  lastEvaluatedAt?: string;
  lastAlertedAt?: string;
  createdBy: string;
  createdAt: string;
}

interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  alertsByRule: Array<{ ruleId: string; ruleName: string; count: number }>;
  alertsByDay: Array<{ date: string; count: number }>;
}

interface RulesResponse {
  success: boolean;
  rules: AlertRule[];
  stats?: AlertStats;
}

const METRICS: { value: AlertMetric; label: string; unit: string }[] = [
  { value: 'error_count_5m', label: 'Error Count (5 min)', unit: '' },
  { value: 'error_count_1h', label: 'Error Count (1 hour)', unit: '' },
  { value: 'error_rate', label: 'Error Rate', unit: '%' },
  { value: 'api_latency_avg', label: 'API Latency (Avg)', unit: 'ms' },
  { value: 'api_latency_p95', label: 'API Latency (P95)', unit: 'ms' },
  { value: 'api_latency_p99', label: 'API Latency (P99)', unit: 'ms' },
  { value: 'database_latency', label: 'Database Latency', unit: 'ms' },
  { value: 'ai_latency_avg', label: 'AI Latency', unit: 'ms' },
  { value: 'ai_error_rate', label: 'AI Error Rate', unit: '' },
  { value: 'ai_cost_daily', label: 'Daily AI Cost', unit: '$' },
  { value: 'failed_logins_5m', label: 'Failed Logins (5 min)', unit: '' },
  { value: 'failed_logins_1h', label: 'Failed Logins (1 hour)', unit: '' },
  { value: 'workflow_failure_rate', label: 'Workflow Failure Rate', unit: '%' },
];

const OPERATORS: { value: AlertOperator; label: string }[] = [
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater than or equal (>=)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (<=)' },
  { value: 'eq', label: 'Equal to (=)' },
  { value: 'ne', label: 'Not equal to (!=)' },
];

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface RuleDialogProps {
  open: boolean;
  rule?: AlertRule | null;
  onClose: () => void;
  onSave: (rule: Partial<AlertRule>) => void;
}

function RuleDialog({ open, rule, onClose, onSave }: RuleDialogProps) {
  const emailChannel = rule?.channels?.find((c) => c.type === 'email');
  const webhookChannel = rule?.channels?.find((c) => c.type === 'webhook');
  const emailConfig = emailChannel?.config as EmailAlertConfig | undefined;
  const webhookConfig = webhookChannel?.config as WebhookAlertConfig | undefined;

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    metric: AlertMetric;
    operator: AlertOperator;
    threshold: number;
    evaluationIntervalMinutes: number;
    cooldownMinutes: number;
    enabled: boolean;
    emailRecipients: string;
    webhookUrl: string;
  }>({
    name: rule?.name || '',
    description: rule?.description || '',
    metric: rule?.metric || 'error_count_5m',
    operator: rule?.condition?.operator || 'gt',
    threshold: rule?.condition?.value || 10,
    evaluationIntervalMinutes: rule?.evaluationIntervalMinutes || 5,
    cooldownMinutes: rule?.cooldownMinutes || 30,
    enabled: rule?.enabled !== false,
    emailRecipients: emailConfig?.recipients?.join(', ') || '',
    webhookUrl: webhookConfig?.url || '',
  });

  const handleSave = () => {
    const channels: AlertChannel[] = [];

    if (formData.emailRecipients) {
      channels.push({
        type: 'email',
        config: {
          recipients: formData.emailRecipients.split(',').map((e) => e.trim()).filter(Boolean),
        },
      });
    }

    if (formData.webhookUrl) {
      channels.push({
        type: 'webhook',
        config: { url: formData.webhookUrl },
      });
    }

    onSave({
      name: formData.name,
      description: formData.description,
      metric: formData.metric,
      condition: { operator: formData.operator, value: formData.threshold },
      evaluationIntervalMinutes: formData.evaluationIntervalMinutes,
      cooldownMinutes: formData.cooldownMinutes,
      enabled: formData.enabled,
      channels,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{rule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Rule Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider>Condition</Divider>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Metric</InputLabel>
              <Select
                value={formData.metric}
                label="Metric"
                onChange={(e) => setFormData({ ...formData, metric: e.target.value as AlertMetric })}
              >
                {METRICS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Operator</InputLabel>
              <Select
                value={formData.operator}
                label="Operator"
                onChange={(e) => setFormData({ ...formData, operator: e.target.value as AlertOperator })}
              >
                {OPERATORS.map((op) => (
                  <MenuItem key={op.value} value={op.value}>
                    {op.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Threshold"
              type="number"
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
              InputProps={{
                endAdornment: (
                  <Typography variant="caption" color="text.secondary">
                    {METRICS.find((m) => m.value === formData.metric)?.unit}
                  </Typography>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider>Timing</Divider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Evaluation Interval"
              type="number"
              value={formData.evaluationIntervalMinutes}
              onChange={(e) => setFormData({ ...formData, evaluationIntervalMinutes: parseInt(e.target.value) })}
              InputProps={{
                endAdornment: <Typography variant="caption">minutes</Typography>,
              }}
              helperText="How often to check this rule"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Cooldown Period"
              type="number"
              value={formData.cooldownMinutes}
              onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) })}
              InputProps={{
                endAdornment: <Typography variant="caption">minutes</Typography>,
              }}
              helperText="Wait time between alerts"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider>Notification Channels</Divider>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Recipients"
              value={formData.emailRecipients}
              onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })}
              placeholder="admin@example.com, ops@example.com"
              helperText="Comma-separated email addresses"
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Webhook URL"
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/..."
              helperText="Receives POST requests with alert data"
              InputProps={{
                startAdornment: <Webhook sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
              }
              label="Rule Enabled"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!formData.name || !formData.metric}
        >
          {rule ? 'Save Changes' : 'Create Rule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AlertRulesManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [testResult, setTestResult] = useState<{
    ruleId: string;
    triggered: boolean;
    metricValue: number;
  } | null>(null);

  const { data, error, isLoading, mutate } = useSWR<RulesResponse>(
    '/api/admin/alerts/rules?includeStats=true',
    fetcher
  );

  const handleCreateRule = async (ruleData: Partial<AlertRule>) => {
    try {
      const response = await fetch('/api/admin/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        mutate();
        setDialogOpen(false);
      }
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const handleUpdateRule = async (ruleData: Partial<AlertRule>) => {
    if (!editingRule) return;

    try {
      const response = await fetch(`/api/admin/alerts/rules/${editingRule.ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        mutate();
        setEditingRule(null);
      }
    } catch (err) {
      console.error('Failed to update rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/admin/alerts/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      const response = await fetch(`/api/admin/alerts/rules/${rule.ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleTestRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/admin/alerts/rules/${ruleId}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result.test);
      }
    } catch (err) {
      console.error('Failed to test rule:', err);
    }
  };

  const handleEvaluateAll = async () => {
    try {
      const response = await fetch('/api/admin/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'evaluate' }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Evaluated ${result.evaluated} rules. ${result.triggered} triggered.`);
        mutate();
      }
    } catch (err) {
      console.error('Failed to evaluate rules:', err);
    }
  };

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          bgcolor: alpha('#f44336', 0.1),
          border: '1px solid',
          borderColor: alpha('#f44336', 0.3),
          borderRadius: 2,
        }}
      >
        <Typography color="error">Failed to load alert rules</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha('#FF9800', 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NotificationsActive sx={{ fontSize: 32, color: '#FF9800' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Alert Rules
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure thresholds and notification channels
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => mutate()}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<PlayArrow />} onClick={handleEvaluateAll}>
            Evaluate All
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            Create Rule
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {data?.stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Alerts (7d)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {data.stats.totalAlerts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                  {data.stats.activeAlerts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Acknowledged
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9800' }}>
                  {data.stats.acknowledgedAlerts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Resolved
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ED64' }}>
                  {data.stats.resolvedAlerts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Test Result Alert */}
      {testResult && (
        <Alert
          severity={testResult.triggered ? 'warning' : 'success'}
          onClose={() => setTestResult(null)}
          sx={{ mb: 3 }}
          icon={testResult.triggered ? <NotificationsActive /> : <CheckCircle />}
        >
          <strong>Test Result:</strong> Current value is {testResult.metricValue}.{' '}
          {testResult.triggered
            ? 'This rule WOULD trigger an alert.'
            : 'This rule would NOT trigger.'}
        </Alert>
      )}

      {/* Rules Table */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell>Status</TableCell>
                <TableCell>Rule</TableCell>
                <TableCell>Condition</TableCell>
                <TableCell>Channels</TableCell>
                <TableCell>Last Evaluated</TableCell>
                <TableCell>Last Alert</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton variant="rounded" height={40} />
                      </TableCell>
                    </TableRow>
                  ))
                : data?.rules.map((rule) => (
                    <TableRow key={rule._id} hover>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {rule.name}
                        </Typography>
                        {rule.description && (
                          <Typography variant="caption" color="text.secondary">
                            {rule.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${rule.metric} ${rule.condition.operator} ${rule.condition.value}`}
                          size="small"
                          sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {rule.channels.map((channel, i) => (
                            <Tooltip key={i} title={channel.type}>
                              {channel.type === 'email' ? (
                                <Email fontSize="small" color="action" />
                              ) : (
                                <Webhook fontSize="small" color="action" />
                              )}
                            </Tooltip>
                          ))}
                          {rule.channels.length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                              None
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatRelativeTime(rule.lastEvaluatedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={rule.lastAlertedAt ? 'warning.main' : 'text.secondary'}
                        >
                          {formatRelativeTime(rule.lastAlertedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Test Rule">
                            <IconButton
                              size="small"
                              onClick={() => handleTestRule(rule.ruleId)}
                            >
                              <PlayArrow fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => setEditingRule(rule)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRule(rule.ruleId)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && data?.rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <NotificationsActive sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">No alert rules configured</Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      sx={{ mt: 2 }}
                      onClick={() => setDialogOpen(true)}
                    >
                      Create Your First Rule
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Dialog */}
      <RuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreateRule}
      />

      {/* Edit Dialog */}
      <RuleDialog
        open={!!editingRule}
        rule={editingRule}
        onClose={() => setEditingRule(null)}
        onSave={handleUpdateRule}
      />
    </Box>
  );
}
