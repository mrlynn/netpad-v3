'use client';

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
  Card,
  CardContent,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Rocket,
  Refresh,
  Code,
  Person,
  Schedule,
  Memory,
  Storage,
  CloudDone,
  GitHub,
  Link as LinkIcon,
} from '@mui/icons-material';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DeploymentInfo {
  commitSha: string;
  commitShortSha: string;
  commitMessage?: string;
  commitAuthor?: string;
  commitRef?: string;
  environment: 'production' | 'preview' | 'development';
  environmentInfo: {
    label: string;
    color: string;
    description: string;
  };
  deploymentUrl?: string;
  vercelUrl?: string;
  deployedAt: string;
  gitProvider?: string;
  repoOwner?: string;
  repoName?: string;
  pullRequestId?: string;
}

interface BuildInfo {
  nodeVersion: string;
  nextVersion?: string;
  platform: string;
  timezone: string;
  uptime: number;
  uptimeFormatted: string;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface DeploymentResponse {
  success: boolean;
  deployment: DeploymentInfo;
  build: BuildInfo;
}

export function DeploymentHistory() {
  const { data, error, isLoading, mutate } = useSWR<DeploymentResponse>(
    '/api/admin/deployments',
    fetcher,
    { refreshInterval: 60000 }
  );

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
        <Typography color="error">Failed to load deployment info</Typography>
      </Paper>
    );
  }

  const deployment = data?.deployment;
  const build = data?.build;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha('#607D8B', 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Rocket sx={{ fontSize: 32, color: '#607D8B' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Deployment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Current deployment and build information
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => mutate()}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Current Deployment Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <CloudDone sx={{ color: deployment?.environmentInfo?.color || 'text.secondary' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Current Deployment
              </Typography>
              {deployment && (
                <Chip
                  label={deployment.environmentInfo.label}
                  size="small"
                  sx={{
                    ml: 'auto',
                    bgcolor: alpha(deployment.environmentInfo.color, 0.15),
                    color: deployment.environmentInfo.color,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>

            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={24} />
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Commit SHA */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Code fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Commit
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={deployment?.commitShortSha || 'unknown'}
                      size="small"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: 'action.hover',
                      }}
                    />
                    {deployment?.repoOwner && deployment?.repoName && (
                      <Tooltip title="View on GitHub">
                        <IconButton
                          size="small"
                          href={`https://github.com/${deployment.repoOwner}/${deployment.repoName}/commit/${deployment.commitSha}`}
                          target="_blank"
                        >
                          <GitHub fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Commit Message */}
                {deployment?.commitMessage && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Message
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        p: 1.5,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        wordBreak: 'break-word',
                      }}
                    >
                      {deployment.commitMessage}
                    </Typography>
                  </Box>
                )}

                {/* Author */}
                {deployment?.commitAuthor && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Author
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {deployment.commitAuthor}
                    </Typography>
                  </Box>
                )}

                {/* Branch */}
                {deployment?.commitRef && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Branch
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={deployment.commitRef}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace' }}
                      />
                      {deployment.pullRequestId && (
                        <Chip
                          label={`PR #${deployment.pullRequestId}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                )}

                {/* Deployment URL */}
                {deployment?.deploymentUrl && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Deployment URL
                      </Typography>
                    </Box>
                    <Typography
                      component="a"
                      href={deployment.deploymentUrl}
                      target="_blank"
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        display: 'block',
                        color: 'primary.main',
                        textDecoration: 'none',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {deployment.deploymentUrl}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Build Info Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Storage sx={{ color: 'text.secondary' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Build Information
              </Typography>
            </Box>

            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={24} />
                ))}
              </Box>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card
                    elevation={0}
                    sx={{ bgcolor: 'action.hover', borderRadius: 1 }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Node.js
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {build?.nodeVersion || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card
                    elevation={0}
                    sx={{ bgcolor: 'action.hover', borderRadius: 1 }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Platform
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {build?.platform || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card
                    elevation={0}
                    sx={{ bgcolor: 'action.hover', borderRadius: 1 }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Schedule fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          Uptime
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {build?.uptimeFormatted || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card
                    elevation={0}
                    sx={{ bgcolor: 'action.hover', borderRadius: 1 }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Timezone
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {build?.timezone || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Memory Usage */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Memory fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Memory Usage
                    </Typography>
                    <Typography variant="caption" sx={{ ml: 'auto' }}>
                      {build?.memoryUsage.used}MB / {build?.memoryUsage.total}MB
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={build?.memoryUsage.percentage || 0}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: alpha('#00ED64', 0.2),
                      '& .MuiLinearProgress-bar': {
                        bgcolor:
                          (build?.memoryUsage.percentage || 0) > 80
                            ? '#f44336'
                            : (build?.memoryUsage.percentage || 0) > 60
                              ? '#FF9800'
                              : '#00ED64',
                        borderRadius: 1,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
                  >
                    {build?.memoryUsage.percentage || 0}% used
                  </Typography>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
