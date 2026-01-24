/**
 * Admin Extensions Console
 *
 * Platform admins can view and toggle extensions.
 * Changes require application restart to take effect.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  Card,
  CardContent,
  Chip,
  Switch,
  Breadcrumbs,
  Link as MuiLink,
  alpha,
  Tooltip,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import Link from 'next/link';
import {
  Extension,
  Check,
  Close,
  Warning,
  NavigateNext,
  ExpandMore,
  ExpandLess,
  Refresh,
  Lock,
  AccountTree,
} from '@mui/icons-material';
import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { NetPadLoader } from '@/components/common/NetPadLoader';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ExtensionInfo {
  id: string;
  name: string;
  description: string;
  version: string | null;
  status: 'loaded' | 'disabled' | 'not_installed' | 'error';
  features: string[];
  workflowNodeCount: number;
  workflowNodes: Array<{
    type: string;
    label: string;
    category: string;
  }>;
  systemControlled: boolean;
  controlledBy?: string;
  dbEnabled: boolean | null;
  dbUpdatedAt: string | null;
  dbUpdatedBy: string | null;
  canToggle: boolean;
}

interface ExtensionsResponse {
  extensions: ExtensionInfo[];
  stats: {
    totalKnown: number;
    loaded: number;
    disabled: number;
    notInstalled: number;
    dbSettingsCount: number;
  };
  registryStatus: {
    initialized: boolean;
    deploymentMode: string;
    enabledFeatures: string[];
  };
  envExtensions: string[];
}

export default function AdminExtensionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [expandedExt, setExpandedExt] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = user?.platformRole === 'admin';

  const { data, error, isLoading, mutate } = useSWR<ExtensionsResponse>(
    isAdmin ? '/api/admin/extensions' : null,
    fetcher
  );

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  const handleToggle = async (extensionId: string, currentEnabled: boolean) => {
    setToggling(extensionId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/extensions/${encodeURIComponent(extensionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to toggle extension');
      }

      setMessage({
        type: 'success',
        text: result.message || `Extension ${!currentEnabled ? 'enabled' : 'disabled'}. Restart required.`,
      });

      // Refresh data
      mutate();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to toggle extension',
      });
    } finally {
      setToggling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loaded':
        return 'success';
      case 'disabled':
        return 'warning';
      case 'not_installed':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loaded':
        return <Check fontSize="small" />;
      case 'disabled':
        return <Close fontSize="small" />;
      case 'not_installed':
        return <Warning fontSize="small" />;
      case 'error':
        return <Close fontSize="small" />;
      default:
        return null;
    }
  };

  if (authLoading || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <NetPadLoader size="large" variant="ascii" message="Loading extensions..." />
      </Box>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 3 }}>
        <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
          Admin
        </MuiLink>
        <Typography color="text.primary">Extensions</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Extensions
          </Typography>
          <Typography color="text.secondary">
            Manage platform extensions and features
          </Typography>
        </Box>
        <IconButton onClick={() => mutate()} disabled={isLoading}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Warning Banner */}
      <Alert
        severity="warning"
        icon={<Warning />}
        sx={{ mb: 3 }}
      >
        <Typography variant="body2">
          <strong>Changes require application restart to take effect.</strong> After toggling an extension,
          you must restart the NetPad application for the changes to be applied.
        </Typography>
      </Alert>

      {/* Messages */}
      {message && (
        <Alert
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ mb: 3 }}
        >
          {message.text}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load extensions: {error.message || 'Unknown error'}
        </Alert>
      )}

      {/* Stats */}
      {data?.stats && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? alpha('#fff', 0.03) : alpha('#000', 0.02),
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Extension Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {data.stats.loaded}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Loaded
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {data.stats.disabled}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Disabled
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {data.stats.notInstalled}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Not Installed
              </Typography>
            </Box>
          </Box>
          {data.registryStatus && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Deployment Mode: <strong>{data.registryStatus.deploymentMode}</strong>
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Extension Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data?.extensions.map((ext) => {
          const isExpanded = expandedExt === ext.id;
          const isToggling = toggling === ext.id;
          const effectiveEnabled = ext.status === 'loaded' || ext.dbEnabled === true;

          return (
            <Card
              key={ext.id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: ext.status === 'loaded' ? alpha('#00ED64', 0.3) : 'divider',
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Extension sx={{ color: ext.status === 'loaded' ? 'success.main' : 'text.secondary' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {ext.name}
                      </Typography>
                      {ext.version && (
                        <Typography variant="caption" color="text.secondary">
                          v{ext.version}
                        </Typography>
                      )}
                      <Chip
                        icon={getStatusIcon(ext.status) || undefined}
                        label={ext.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(ext.status) as any}
                        sx={{ ml: 1 }}
                      />
                      {ext.systemControlled && (
                        <Tooltip title={ext.controlledBy || 'System controlled'}>
                          <Chip
                            icon={<Lock fontSize="small" />}
                            label="System"
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {ext.id}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {ext.description}
                    </Typography>

                    {/* Features and Nodes chips */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {ext.features.map((feature) => (
                        <Chip
                          key={feature}
                          label={feature}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {ext.workflowNodeCount > 0 && (
                        <Chip
                          icon={<AccountTree fontSize="small" />}
                          label={`${ext.workflowNodeCount} workflow node${ext.workflowNodeCount > 1 ? 's' : ''}`}
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Toggle */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    {ext.canToggle ? (
                      <Tooltip
                        title={
                          ext.status === 'not_installed'
                            ? 'Extension not installed - add to NETPAD_EXTENSIONS to enable'
                            : effectiveEnabled
                            ? 'Click to disable'
                            : 'Click to enable'
                        }
                      >
                        <span>
                          <Switch
                            checked={effectiveEnabled}
                            onChange={() => handleToggle(ext.id, effectiveEnabled)}
                            disabled={isToggling || ext.status === 'not_installed'}
                          />
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title={ext.controlledBy || 'Cannot be toggled'}>
                        <span>
                          <Switch checked={ext.status === 'loaded'} disabled />
                        </span>
                      </Tooltip>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => setExpandedExt(isExpanded ? null : ext.id)}
                    >
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                </Box>

                {/* Expanded details */}
                <Collapse in={isExpanded}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Workflow Nodes */}
                    {ext.workflowNodes.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Workflow Nodes
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {ext.workflowNodes.map((node) => (
                            <Chip
                              key={node.type}
                              label={`${node.label} (${node.category})`}
                              size="small"
                              icon={<AccountTree fontSize="small" />}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Database Setting Info */}
                    {ext.dbEnabled !== null && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Database Setting
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {ext.dbEnabled ? 'Enabled' : 'Disabled'} via admin settings
                          {ext.dbUpdatedAt && ` (updated ${new Date(ext.dbUpdatedAt).toLocaleString()})`}
                        </Typography>
                      </Box>
                    )}

                    {/* System Controlled Info */}
                    {ext.systemControlled && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        This extension is controlled by the {ext.controlledBy || 'system'}.
                        It cannot be toggled via the admin UI.
                      </Alert>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Environment Extensions */}
      {data?.envExtensions && data.envExtensions.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mt: 4,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? alpha('#2196F3', 0.1) : alpha('#2196F3', 0.05),
            border: '1px solid',
            borderColor: alpha('#2196F3', 0.2),
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            NETPAD_EXTENSIONS Environment Variable
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Extensions configured via the environment variable:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {data.envExtensions.map((ext) => (
              <Chip key={ext} label={ext} size="small" />
            ))}
          </Box>
        </Paper>
      )}
    </Container>
  );
}
