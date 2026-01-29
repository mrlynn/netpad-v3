/**
 * RAG Usage Dashboard Component
 *
 * Displays current usage, limits, and upgrade prompts
 */

'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Description as DocumentIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { RAGStorageConfig } from '@/types/rag-storage';

interface UsageData {
  documentsUploaded: number;
  totalStorageBytes: number;
  queriesToday: number;
  queriesThisMonth: number;
}

interface UsageDashboardProps {
  config: RAGStorageConfig;
  usage: UsageData;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
}

export default function UsageDashboard({ config, usage, tier }: UsageDashboardProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getUsagePercentage = (current: number, max: number): number => {
    if (max === -1) return 0; // Unlimited
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage < 70) return 'success';
    if (percentage < 90) return 'warning';
    return 'error';
  };

  const isUnlimited = (limit: number): boolean => limit === -1;

  const documentUsagePercent = getUsagePercentage(
    usage.documentsUploaded,
    config.limits.maxDocuments
  );
  const storageUsagePercent = getUsagePercentage(
    usage.totalStorageBytes,
    config.limits.maxStorageBytes
  );
  const dailyQueryPercent = getUsagePercentage(
    usage.queriesToday,
    config.limits.maxQueriesPerDay
  );
  const monthlyQueryPercent = getUsagePercentage(
    usage.queriesThisMonth,
    config.limits.maxQueriesPerMonth
  );

  const needsUpgrade =
    documentUsagePercent > 80 ||
    storageUsagePercent > 80 ||
    dailyQueryPercent > 80 ||
    monthlyQueryPercent > 80;

  return (
    <Box>
      {needsUpgrade && tier === 'free' && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" href="/pricing">
              Upgrade
            </Button>
          }
        >
          You're approaching your {tier} tier limits. Upgrade to Pro for higher limits and
          unlimited queries.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Documents Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <DocumentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Documents</Typography>
                {isUnlimited(config.limits.maxDocuments) && (
                  <Chip label="Unlimited" size="small" color="success" sx={{ ml: 'auto' }} />
                )}
              </Box>

              {!isUnlimited(config.limits.maxDocuments) ? (
                <>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      {usage.documentsUploaded} / {config.limits.maxDocuments} documents
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {documentUsagePercent.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={documentUsagePercent}
                    color={getUsageColor(documentUsagePercent)}
                  />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {usage.documentsUploaded} documents uploaded
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Storage</Typography>
                {isUnlimited(config.limits.maxStorageBytes) && (
                  <Chip label="Unlimited" size="small" color="success" sx={{ ml: 'auto' }} />
                )}
              </Box>

              {!isUnlimited(config.limits.maxStorageBytes) ? (
                <>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      {formatBytes(usage.totalStorageBytes)} /{' '}
                      {formatBytes(config.limits.maxStorageBytes)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {storageUsagePercent.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={storageUsagePercent}
                    color={getUsageColor(storageUsagePercent)}
                  />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {formatBytes(usage.totalStorageBytes)} used
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Queries */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SearchIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Queries Today</Typography>
                {isUnlimited(config.limits.maxQueriesPerDay) && (
                  <Chip label="Unlimited" size="small" color="success" sx={{ ml: 'auto' }} />
                )}
              </Box>

              {!isUnlimited(config.limits.maxQueriesPerDay) ? (
                <>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      {usage.queriesToday} / {config.limits.maxQueriesPerDay} queries
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {dailyQueryPercent.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={dailyQueryPercent}
                    color={getUsageColor(dailyQueryPercent)}
                  />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {usage.queriesToday} queries today
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Queries */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Queries This Month</Typography>
                {isUnlimited(config.limits.maxQueriesPerMonth) && (
                  <Chip label="Unlimited" size="small" color="success" sx={{ ml: 'auto' }} />
                )}
              </Box>

              {!isUnlimited(config.limits.maxQueriesPerMonth) ? (
                <>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      {usage.queriesThisMonth} / {config.limits.maxQueriesPerMonth} queries
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {monthlyQueryPercent.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={monthlyQueryPercent}
                    color={getUsageColor(monthlyQueryPercent)}
                  />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {usage.queriesThisMonth} queries this month
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Storage Mode Info */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Storage Mode
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              label={config.mode === 'platform' ? 'Platform Storage' : 'User Cluster'}
              color={config.mode === 'platform' ? 'primary' : 'secondary'}
            />
            {config.mode === 'platform' && config.platform?.region && (
              <Typography variant="body2" color="text.secondary">
                Region: {config.platform.region}
              </Typography>
            )}
            {config.mode === 'user-cluster' && config.userCluster?.connectionId && (
              <Typography variant="body2" color="text.secondary">
                Using your MongoDB cluster
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
